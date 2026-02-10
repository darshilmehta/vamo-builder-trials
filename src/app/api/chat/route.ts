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

        // Insert user message
        const { data: userMsg, error: msgError } = await supabase
            .from("messages")
            .insert({
                project_id: projectId,
                user_id: user.id,
                role: "user",
                content: message,
                tag: tag || null,
            })
            .select()
            .single();

        if (msgError) {
            return NextResponse.json({ error: msgError.message }, { status: 500 });
        }

        // Load project data
        const { data: project } = await supabase
            .from("projects")
            .select("*")
            .eq("id", projectId)
            .single();

        // Load last 20 messages for context
        const { data: recentMessages } = await supabase
            .from("messages")
            .select("role, content, tag")
            .eq("project_id", projectId)
            .order("created_at", { ascending: false })
            .limit(20);

        // Call OpenAI
        let aiResponse = {
            reply: "Thanks for the update! Your progress has been logged.",
            intent: "general" as string,
            business_update: {
                progress_delta: 0,
                traction_signal: null as string | null,
                valuation_adjustment: "none" as string,
            },
        };

        const openai = getOpenAIClient();
        if (openai && project) {
            try {
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

                const chatMessages = [
                    { role: "system" as const, content: systemPrompt },
                    ...(recentMessages || []).reverse().map((m) => ({
                        role: m.role as "user" | "assistant",
                        content: m.content,
                    })),
                ];

                const completion = await openai.chat.completions.create({
                    model: "gpt-4o-mini",
                    temperature: 0.5,
                    messages: chatMessages,
                });

                const rawContent = completion.choices[0]?.message?.content || "";
                try {
                    // Try to parse JSON - handle markdown code blocks
                    const jsonStr = rawContent.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
                    aiResponse = JSON.parse(jsonStr);
                } catch {
                    aiResponse.reply = rawContent || aiResponse.reply;
                }
            } catch (error) {
                console.error("OpenAI error:", error);
                aiResponse.reply =
                    "I couldn't process that right now. Your update has been saved.";
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

        // Add traction signal as activity event
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

        // Check rate limit
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const { count: recentRewards } = await supabase
            .from("reward_ledger")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("project_id", projectId)
            .eq("event_type", "prompt")
            .gte("created_at", oneHourAgo);

        const withinRateLimit =
            (recentRewards || 0) < RATE_LIMIT_MAX_PROMPTS_PER_HOUR;

        if (withinRateLimit) {
            // Award base prompt reward
            const promptReward = REWARD_SCHEDULE.prompt || 1;
            const { data: profile } = await supabase
                .from("profiles")
                .select("pineapple_balance")
                .eq("id", user.id)
                .single();

            const currentBalance = profile?.pineapple_balance || 0;

            // Insert prompt reward
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

            // Tag bonus
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

            // Update balance
            if (pineapplesEarned > 0) {
                await supabase
                    .from("profiles")
                    .update({
                        pineapple_balance: currentBalance + pineapplesEarned,
                        updated_at: new Date().toISOString(),
                    })
                    .eq("id", user.id);

                // Log reward event
                await supabase.from("activity_events").insert({
                    project_id: projectId,
                    user_id: user.id,
                    event_type: "reward_earned",
                    description: `Earned ${pineapplesEarned} 🍍`,
                    metadata: { amount: pineapplesEarned },
                });
            }
        }

        // Update the assistant message with pineapples earned
        if (assistantMsg && pineapplesEarned > 0) {
            await supabase
                .from("messages")
                .update({ pineapples_earned: pineapplesEarned })
                .eq("id", assistantMsg.id);
        }

        return NextResponse.json({
            message: assistantMsg,
            pineapplesEarned,
            intent: aiResponse.intent,
            businessUpdate: aiResponse.business_update,
        });
    } catch (error) {
        console.error("Chat API error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
