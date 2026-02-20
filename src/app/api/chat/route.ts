import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOpenAIClient } from "@/lib/openai";
import { NextResponse } from "next/server";
import { REWARD_SCHEDULE, RATE_LIMIT_MAX_PROMPTS_PER_HOUR } from "@/lib/types";

export async function POST(request: Request) {
    try {
        const supabase = createSupabaseServerClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { projectId, message, tag } = body;

        if (!projectId || !message) {
            return NextResponse.json(
                { error: "projectId and message are required" },
                { status: 400 }
            );
        }

        // ── Fire all independent DB operations in parallel to minimise TTFT ──
        const oneHourAgoCheck = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const [
            { count: recentPromptCount },
            { data: userMsg, error: msgError },
            { data: project },
            { data: recentMessages },
        ] = await Promise.all([
            // 1. Rate-limit check
            supabase
                .from("messages")
                .select("*", { count: "exact", head: true })
                .eq("project_id", projectId)
                .eq("user_id", user.id)
                .eq("role", "user")
                .gte("created_at", oneHourAgoCheck),

            // 2. Insert the user's message
            supabase
                .from("messages")
                .insert({
                    project_id: projectId,
                    user_id: user.id,
                    role: "user",
                    content: message,
                    tag: tag || null,
                })
                .select()
                .single(),

            // 3. Load project metadata
            supabase
                .from("projects")
                .select("*")
                .eq("id", projectId)
                .single(),

            // 4. Load the last 20 messages for context
            //    (runs concurrently with the INSERT; the current message is
            //     appended manually below so we don't need to wait for the write)
            supabase
                .from("messages")
                .select("role, content, tag")
                .eq("project_id", projectId)
                .order("created_at", { ascending: false })
                .limit(20),
        ]);

        if ((recentPromptCount || 0) >= RATE_LIMIT_MAX_PROMPTS_PER_HOUR) {
            return NextResponse.json(
                {
                    error: `Rate limit exceeded. You can send up to ${RATE_LIMIT_MAX_PROMPTS_PER_HOUR} messages per hour. Please try again later.`,
                },
                { status: 429 }
            );
        }

        if (msgError) {
            return NextResponse.json({ error: msgError.message }, { status: 500 });
        }

        const openai = getOpenAIClient();
        if (!openai || !project) {
            return NextResponse.json({ error: "AI service or project not found" }, { status: 500 });
        }

        const systemPrompt = `You are Vamo, an AI co-pilot for startup founders. The user is building a project called "${project.name}".
${project.description ? `Description: ${project.description}` : ""}
${project.why_built ? `Why built: ${project.why_built}` : ""}
Current progress score: ${project.progress_score}/100

Your job:
1. Respond helpfully to their update or question (keep it concise, 2-3 sentences max).
2. Extract the intent of their message. Classify as one of: feature, customer, revenue, ask, general.
3. If the update implies progress (shipped something, talked to users, made revenue), generate an updated business analysis.
4. Return your response as JSON:
{
  "reply": "Your response text",
  "intent": "feature|customer|revenue|ask|general",
  "business_update": {
    "progress_delta": 0-5,
    "traction_signal": "string or null",
    "valuation_adjustment": "up|down|none"
  }
}

If insufficient data, say so. Progress delta max is 5 per prompt. Be realistic. Return ONLY valid JSON, no markdown.`;

        // Build context: history (oldest first) + current user message appended
        // We reverse the DESC-ordered history and drop any copy of the current
        // message that may have landed before the INSERT fully committed.
        const historyMessages = (recentMessages || [])
            .reverse()
            .filter((m) => !(m.role === "user" && m.content === message))
            .map((m) => ({
                role: m.role as "user" | "assistant",
                content: m.content,
            }));

        const chatMessages = [
            { role: "system" as const, content: systemPrompt },
            ...historyMessages,
            { role: "user" as const, content: message }, // always append current turn
        ];

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    const completionStream = await openai.chat.completions.create({
                        model: "gpt-4o-mini",
                        temperature: 0.5,
                        response_format: { type: "json_object" },
                        messages: chatMessages,
                        stream: true,
                    });

                    let fullContent = "";
                    for await (const chunk of completionStream) {
                        const content = chunk.choices[0]?.delta?.content || "";
                        if (content) {
                            fullContent += content;
                            controller.enqueue(encoder.encode(content));
                        }
                    }

                    // Process AI response logic after stream completes
                    let aiResponse = {
                        reply: "Thanks for the update! Your progress has been logged.",
                        intent: "general" as string,
                        business_update: {
                            progress_delta: 0,
                            traction_signal: null as string | null,
                            valuation_adjustment: "none" as string,
                        },
                    };

                    try {
                        const jsonStr = fullContent.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
                        aiResponse = JSON.parse(jsonStr);
                    } catch {
                        const jsonMatch = fullContent.match(/\{[\s\S]*\}/);
                        if (jsonMatch) {
                            try {
                                aiResponse = JSON.parse(jsonMatch[0]);
                            } catch {
                                aiResponse.reply = fullContent || aiResponse.reply;
                            }
                        } else {
                            aiResponse.reply = fullContent || aiResponse.reply;
                        }
                    }

                    // Insert assistant message
                    const { data: assistantMsg } = await supabase
                        .from("messages")
                        .insert({
                            project_id: projectId,
                            user_id: user.id,
                            role: "assistant",
                            content: aiResponse.reply,
                            extracted_intent: aiResponse.intent,
                            tag: tag || aiResponse.intent || null,
                        })
                        .select()
                        .single();

        // Insert activity event for the prompt
        await supabase.from("activity_events").insert({
            project_id: projectId,
            user_id: user.id,
            event_type: "prompt",
            description: message.substring(0, 200),
            metadata: { intent: aiResponse.intent },
        });

        // Update progress score if applicable
        const progressDelta = Math.min(
            aiResponse.business_update?.progress_delta || 0,
            5
        );
        if (progressDelta > 0 && project) {
            const newScore = Math.min(
                (project.progress_score || 0) + progressDelta,
                100
            );
            await supabase
                .from("projects")
                .update({
                    progress_score: newScore,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", projectId);

            // Update valuation based on progress
            if (aiResponse.business_update?.valuation_adjustment === "up") {
                const newLow = Math.max(project.valuation_low || 0, newScore * 50);
                const newHigh = Math.max(project.valuation_high || 0, newScore * 100);
                await supabase
                    .from("projects")
                    .update({ valuation_low: newLow, valuation_high: newHigh })
                    .eq("id", projectId);
            }
        }

                    if (aiResponse.business_update?.traction_signal) {
                        const eventType =
                            aiResponse.intent === "feature"
                                ? "feature_shipped"
                                : aiResponse.intent === "customer"
                                    ? "customer_added"
                                    : aiResponse.intent === "revenue"
                                        ? "revenue_logged"
                                        : "update";

            await supabase.from("activity_events").insert({
                project_id: projectId,
                user_id: user.id,
                event_type: eventType,
                description: aiResponse.business_update.traction_signal,
            });
        }

                    // Award pineapples
                    let pineapplesEarned = 0;
                    const idempotencyBase = userMsg.id;

                    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
                    const { count: recentRewards } = await supabase
                        .from("reward_ledger")
                        .select("*", { count: "exact", head: true })
                        .eq("user_id", user.id)
                        .eq("project_id", projectId)
                        .eq("event_type", "prompt")
                        .gte("created_at", oneHourAgo);

                    if ((recentRewards || 0) < RATE_LIMIT_MAX_PROMPTS_PER_HOUR) {
                        const promptReward = REWARD_SCHEDULE.prompt || 1;
                        const { data: profile } = await supabase
                            .from("profiles")
                            .select("pineapple_balance")
                            .eq("id", user.id)
                            .single();

                        const currentBalance = profile?.pineapple_balance || 0;

                        const { error: rewardError } = await supabase
                            .from("reward_ledger")
                            .insert({
                                user_id: user.id,
                                project_id: projectId,
                                event_type: "prompt",
                                reward_amount: promptReward,
                                balance_after: currentBalance + promptReward,
                                idempotency_key: `${idempotencyBase}-prompt`,
                            });

                        if (!rewardError) {
                            pineapplesEarned += promptReward;
                        }

                        if (tag && ["feature", "customer", "revenue"].includes(tag)) {
                            const tagBonus = REWARD_SCHEDULE.tag_bonus || 1;
                            const { error: tagError } = await supabase
                                .from("reward_ledger")
                                .insert({
                                    user_id: user.id,
                                    project_id: projectId,
                                    event_type: "tag_bonus",
                                    reward_amount: tagBonus,
                                    balance_after: currentBalance + promptReward + tagBonus,
                                    idempotency_key: `${idempotencyBase}-tag-bonus`,
                                });

                            if (!tagError) {
                                pineapplesEarned += tagBonus;
                            }
                        }

                        if (pineapplesEarned > 0) {
                            await supabase
                                .from("profiles")
                                .update({
                                    pineapple_balance: currentBalance + pineapplesEarned,
                                    updated_at: new Date().toISOString(),
                                })
                                .eq("id", user.id);

                            await supabase.from("activity_events").insert({
                                project_id: projectId,
                                user_id: user.id,
                                event_type: "reward_earned",
                                description: `Earned ${pineapplesEarned} 🍍`,
                                metadata: { amount: pineapplesEarned },
                            });
                        }
                    }

                    if (assistantMsg && pineapplesEarned > 0) {
                        await supabase
                            .from("messages")
                            .update({ pineapples_earned: pineapplesEarned })
                            .eq("id", assistantMsg.id);
                    }

                    // Enqueue metadata at the end of the stream
                    controller.enqueue(encoder.encode("\n__METADATA__\n" + JSON.stringify({
                        message: {
                            ...assistantMsg,
                            pineapples_earned: pineapplesEarned,
                        },
                        pineapplesEarned,
                        intent: aiResponse.intent,
                        businessUpdate: aiResponse.business_update,
                    })));

                    controller.close();
                } catch (err) {
                    console.error("Stream error:", err);
                    controller.error(err);
                }
            },
        });

        return new Response(stream, {
            headers: {
                "Content-Type": "text/plain; charset=utf-8",
            },
        });
    } catch (error) {
        console.error("Chat API error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
