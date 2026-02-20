import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOpenAIClient } from "@/lib/openai";
import { NextResponse } from "next/server";
import { z } from "zod";

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
        const { projectId } = body;

        if (!projectId) {
            return NextResponse.json(
                { error: "projectId is required" },
                { status: 400 }
            );
        }

        // ── Rate limit: max 5 offer requests per hour ──
        const oneHourAgoOffer = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const { count: recentOfferCount } = await supabase
            .from("offers")
            .select("*", { count: "exact", head: true })
            .eq("project_id", projectId)
            .eq("user_id", user.id)
            .gte("created_at", oneHourAgoOffer);

        if ((recentOfferCount || 0) >= 5) {
            return NextResponse.json(
                {
                    error: "Rate limit exceeded. You can request up to 5 offers per hour. Please try again later.",
                },
                { status: 429 }
            );
        }

        // Load project
        const { data: project } = await supabase
            .from("projects")
            .select("*")
            .eq("id", projectId)
            .eq("owner_id", user.id)
            .single();

        if (!project) {
            return NextResponse.json(
                { error: "Project not found" },
                { status: 404 }
            );
        }

        // Load activity events
        const { data: events } = await supabase
            .from("activity_events")
            .select("*")
            .eq("project_id", projectId)
            .order("created_at", { ascending: true });

        // Load message count
        const { count: messageCount } = await supabase
            .from("messages")
            .select("*", { count: "exact", head: true })
            .eq("project_id", projectId);

        // Count traction signals
        const { count: tractionCount } = await supabase
            .from("activity_events")
            .select("*", { count: "exact", head: true })
            .eq("project_id", projectId)
            .in("event_type", [
                "feature_shipped",
                "customer_added",
                "revenue_logged",
            ]);

        // Count linked assets
        const { count: linksCount } = await supabase
            .from("activity_events")
            .select("*", { count: "exact", head: true })
            .eq("project_id", projectId)
            .in("event_type", ["link_linkedin", "link_github", "link_website"]);

        // Default offer
        let offer = {
            offer_low: Math.max(500, (project.progress_score || 0) * 50),
            offer_high: Math.max(1000, (project.progress_score || 0) * 150),
            reasoning:
                "Based on your logged activity and progress score, this is an estimated range.",
            signals_used: [] as string[],
        };

        // Call OpenAI for valuation
        const openai = getOpenAIClient();
        if (openai) {
            try {
                const projectSummary = {
                    name: project.name,
                    description: project.description,
                    why_built: project.why_built,
                    progress_score: project.progress_score,
                    current_valuation: `$${project.valuation_low} - $${project.valuation_high}`,
                    total_prompts: messageCount || 0,
                    traction_signals: tractionCount || 0,
                    linked_assets: linksCount || 0,
                    activity_count: events?.length || 0,
                    recent_events: (events || []).slice(-10).map((e) => ({
                        type: e.event_type,
                        description: e.description,
                        date: e.created_at,
                    })),
                };

                const completion = await openai.chat.completions.create({
                    model: "gpt-5-nano-2025-08-07",
                    temperature: 0.3,
                    max_tokens: 500,
                    response_format: { type: "json_object" },
                    messages: [
                        {
                            role: "system",
                            content: `You are a startup valuation engine. Based on the following project data and activity, provide a non-binding offer range and explanation.

Rules:
- Be realistic. Early-stage projects with minimal activity should have low valuations ($100-$1000).
- Projects with significant traction (many prompts, features shipped, customers, revenue) deserve higher valuations.
- Always explain your reasoning.
- If insufficient data, say so.
- Return ONLY valid JSON:
{
  "offer_low": number,
  "offer_high": number,
  "reasoning": "string explaining the offer",
  "signals_used": ["list", "of", "signals"]
}`,
                        },
                        {
                            role: "user",
                            content: JSON.stringify(projectSummary),
                        },
                    ],
                });

                const offerSchema = z.object({
                    offer_low: z.number(),
                    offer_high: z.number(),
                    reasoning: z.string(),
                    signals_used: z.array(z.string())
                });

                const rawContent = completion.choices[0]?.message?.content || "";
                try {
                    const jsonStr = rawContent.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
                    const rawOffer = JSON.parse(jsonStr);
                    offer = offerSchema.parse(rawOffer);
                } catch {
                    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        try {
                            const rawOffer = JSON.parse(jsonMatch[0]);
                            offer = offerSchema.parse(rawOffer);
                        } catch {
                            // Keep default offer
                        }
                    }
                }
            } catch (error) {
                console.error("OpenAI offer error:", error);
            }
        }

        // Expire old active offers
        await supabase
            .from("offers")
            .update({ status: "expired" })
            .eq("project_id", projectId)
            .eq("user_id", user.id)
            .eq("status", "active");

        // Insert new offer
        const { data: newOffer, error: offerError } = await supabase
            .from("offers")
            .insert({
                project_id: projectId,
                user_id: user.id,
                offer_low: offer.offer_low,
                offer_high: offer.offer_high,
                reasoning: offer.reasoning,
                signals: { signals_used: offer.signals_used },
                status: "active",
                expires_at: new Date(
                    Date.now() + 7 * 24 * 60 * 60 * 1000
                ).toISOString(),
            })
            .select()
            .single();

        if (offerError) {
            return NextResponse.json(
                { error: offerError.message },
                { status: 500 }
            );
        }

        // Log activity event
        await supabase.from("activity_events").insert({
            project_id: projectId,
            user_id: user.id,
            event_type: "offer_received",
            description: `Received offer: $${offer.offer_low} - $${offer.offer_high}`,
            metadata: { offerId: newOffer.id },
        });

        return NextResponse.json({
            offer: newOffer,
            reasoning: offer.reasoning,
            signals_used: offer.signals_used,
        });
    } catch (error) {
        console.error("Offer API error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
