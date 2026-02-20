/* eslint-disable @typescript-eslint/no-explicit-any */
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOpenAIClient } from "@/lib/openai";
import { NextResponse } from "next/server";


export async function DELETE(
    request: Request,
    { params }: { params: { messageId: string } }
) {
    try {
        const supabase = createSupabaseServerClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const messageId = params.messageId;

        // 1. Fetch user message
        const { data: userMsg } = await supabase
            .from("messages")
            .select("*")
            .eq("id", messageId)
            .eq("user_id", user.id)
            .single();

        if (!userMsg || userMsg.role !== "user") {
            return NextResponse.json({ error: "Message not found or not owned by user" }, { status: 404 });
        }

        const projectId = userMsg.project_id;

        // Rollback effects and delete events/ledgers 
        await rollbackPromptEffects(supabase, user, projectId, messageId);

        // 8. Delete the messages
        const idsToDelete = [messageId];
        const assistantMsgId = await getAssistantMsgIdFromRollback(supabase, projectId, user.id, messageId, userMsg.created_at);
        if (assistantMsgId) {
            idsToDelete.push(assistantMsgId);
        }

        const { error: err3 } = await supabase.from("messages").delete().in("id", idsToDelete);
        if (err3) throw err3;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Delete prompt error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}

async function getAssistantMsgIdFromRollback(supabase: any, projectId: string, userId: string, messageId: string, fallbackCreationTime: string) {
    const { data: activityEvents } = await supabase
        .from("activity_events")
        .select("*")
        .eq("project_id", projectId)
        .eq("user_id", userId);

    const targetEvents = activityEvents?.filter(
        (e: any) => e.metadata?.rollback?.user_message_id === messageId
    ) || [];

    const promptEvent = targetEvents.find((e: any) => e.event_type === "prompt");
    if (promptEvent && promptEvent.metadata?.rollback?.assistant_message_id) {
        return promptEvent.metadata.rollback.assistant_message_id;
    }

    const { data: nextMsg } = await supabase
        .from("messages")
        .select("id")
        .eq("project_id", projectId)
        .eq("user_id", userId)
        .eq("role", "assistant")
        .gt("created_at", fallbackCreationTime)
        .order("created_at", { ascending: true })
        .limit(1)
        .single();

    return nextMsg?.id || null;
}

async function rollbackPromptEffects(supabase: any, user: any, projectId: string, messageId: string, isEdit: boolean = false) {
    const { data: activityEvents } = await supabase
        .from("activity_events")
        .select("*")
        .eq("project_id", projectId)
        .eq("user_id", user.id);

    const targetEvents = activityEvents?.filter(
        (e: any) => e.metadata?.rollback?.user_message_id === messageId
    ) || [];

    const promptEvent = targetEvents.find((e: any) => e.event_type === "prompt");

    let progressDelta = 0;
    let valLowDelta = 0;
    let valHighDelta = 0;
    let assistantMsgId = null;

    if (promptEvent) {
        const rb = promptEvent.metadata?.rollback;
        progressDelta = rb?.progress_delta || 0;
        valLowDelta = rb?.valuation_low_delta || 0;
        valHighDelta = rb?.valuation_high_delta || 0;
        assistantMsgId = rb?.assistant_message_id;
    }

    if (!isEdit) {
        let pineapplesToDeduct = 0;
        if (assistantMsgId) {
            const { data: astMsg } = await supabase.from("messages").select("pineapples_earned").eq("id", assistantMsgId).single();
            if (astMsg) pineapplesToDeduct = astMsg.pineapples_earned || 0;
        }

        if (pineapplesToDeduct > 0) {
            const { data: profile } = await supabase.from("profiles").select("pineapple_balance").eq("id", user.id).single();
            if (profile) {
                const newBalance = Math.max(0, (profile.pineapple_balance || 0) - pineapplesToDeduct);
                await supabase.from("profiles").update({ pineapple_balance: newBalance }).eq("id", user.id);
            }
        }
    }

    if (progressDelta > 0 || valLowDelta > 0 || valHighDelta > 0) {
        const { data: project } = await supabase.from("projects").select("progress_score, valuation_low, valuation_high").eq("id", projectId).single();
        if (project) {
            await supabase.from("projects").update({
                progress_score: Math.max(0, (project.progress_score || 0) - progressDelta),
                valuation_low: Math.max(0, (project.valuation_low || 0) - valLowDelta),
                valuation_high: Math.max(0, (project.valuation_high || 0) - valHighDelta),
            }).eq("id", projectId);
        }
    }

    if (!isEdit) {
        const { error: err1 } = await supabase.from("reward_ledger").delete().like("idempotency_key", `${messageId}-%`);
        if (err1) throw err1;
    }

    if (targetEvents.length > 0) {
        const { error: err2 } = await supabase.from("activity_events").delete().in("id", targetEvents.map((e: any) => e.id));
        if (err2) throw err2;
    }
}

export async function PUT(
    request: Request,
    { params }: { params: { messageId: string } }
) {
    try {
        const supabase = createSupabaseServerClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const messageId = params.messageId;
        const body = await request.json();
        const { message, tag } = body;

        if (!message) return NextResponse.json({ error: "Message is required" }, { status: 400 });

        const { data: userMsg } = await supabase.from("messages").select("*").eq("id", messageId).eq("user_id", user.id).single();
        if (!userMsg || userMsg.role !== "user") return NextResponse.json({ error: "Message not found or not owned by user" }, { status: 404 });

        const projectId = userMsg.project_id;

        // 1. Rollback previous effects completely
        await rollbackPromptEffects(supabase, user, projectId, messageId, true);

        // 2. Fetch assistant message id so we can update it
        const assistantMsgId = await getAssistantMsgIdFromRollback(supabase, projectId, user.id, messageId, userMsg.created_at);

        // 3. Update the user message text in DB
        await supabase.from("messages").update({ content: message, tag: tag || null }).eq("id", messageId);

        // 4. Fetch context up to the edited message
        const { data: project } = await supabase.from("projects").select("*").eq("id", projectId).single();
        const { data: recentMessages } = await supabase
            .from("messages")
            .select("role, content, tag")
            .eq("project_id", projectId)
            .lte("created_at", userMsg.created_at)
            .order("created_at", { ascending: false })
            .limit(20);

        // 5. Build openAI
        let aiResponse = {
            reply: "Changes saved and noted!",
            intent: "general",
            business_update: { progress_delta: 0, traction_signal: null as string | null, valuation_adjustment: "none" },
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
                    temperature: 0.1,
                    response_format: { type: "json_object" },
                    messages: chatMessages,
                });

                const rawContent = completion.choices[0]?.message?.content || "";
                try {
                    const jsonStr = rawContent.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
                    aiResponse = JSON.parse(jsonStr);
                } catch {
                    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        try { aiResponse = JSON.parse(jsonMatch[0]); } catch { aiResponse.reply = rawContent || aiResponse.reply; }
                    } else {
                        aiResponse.reply = rawContent || aiResponse.reply;
                    }
                }
            } catch (error) {
                console.error("OpenAI error:", error);
            }
        }

        // 6. Update assistant message
        if (assistantMsgId) {
            await supabase.from("messages").update({
                content: aiResponse.reply,
                extracted_intent: aiResponse.intent,
                tag: tag || aiResponse.intent || null
            }).eq("id", assistantMsgId);
        }

        // 7. Re-apply progress score and activity events (identical logic to POST)
        let actualProgressDelta = 0;
        let actualValLowDelta = 0;
        let actualValHighDelta = 0;

        const progressDelta = Math.min(aiResponse.business_update?.progress_delta || 0, 5);
        if (progressDelta > 0 && project) {
            const newScore = Math.min((project.progress_score || 0) + progressDelta, 100);
            actualProgressDelta = newScore - (project.progress_score || 0);

            let newLow = project.valuation_low || 0;
            let newHigh = project.valuation_high || 0;

            if (aiResponse.business_update?.valuation_adjustment === "up") {
                newLow = Math.max(project.valuation_low || 0, newScore * 50);
                newHigh = Math.max(project.valuation_high || 0, newScore * 100);
                actualValLowDelta = newLow - (project.valuation_low || 0);
                actualValHighDelta = newHigh - (project.valuation_high || 0);
            }

            await supabase.from("projects").update({
                progress_score: newScore,
                valuation_low: newLow,
                valuation_high: newHigh,
                updated_at: new Date().toISOString(),
            }).eq("id", projectId);
        }

        // 8. Re-insert prompt event
        await supabase.from("activity_events").insert({
            project_id: projectId,
            user_id: user.id,
            event_type: "prompt",
            description: message.substring(0, 200),
            metadata: {
                intent: aiResponse.intent,
                rollback: {
                    user_message_id: messageId,
                    assistant_message_id: assistantMsgId,
                    progress_delta: actualProgressDelta,
                    valuation_low_delta: actualValLowDelta,
                    valuation_high_delta: actualValHighDelta
                }
            },
        });

        if (aiResponse.business_update?.traction_signal) {
            const eventType = aiResponse.intent === "feature" ? "feature_shipped" : aiResponse.intent === "customer" ? "customer_added" : aiResponse.intent === "revenue" ? "revenue_logged" : "update";
            await supabase.from("activity_events").insert({
                project_id: projectId,
                user_id: user.id,
                event_type: eventType,
                description: aiResponse.business_update.traction_signal,
                metadata: { rollback: { user_message_id: messageId } }
            });
        }

        // 9. Re-award pineapples (Skipped during edits to prevent farming)

        return NextResponse.json({ success: true, message: { id: messageId, content: message, tag }, pineapplesEarned: 0 });
    } catch (error: any) {
        console.error("PUT prompt error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
