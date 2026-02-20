import { POST } from "./route";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOpenAIClient } from "@/lib/openai";

jest.mock("@/lib/supabase/server", () => ({
    createSupabaseServerClient: jest.fn(),
}));

jest.mock("@/lib/openai", () => ({
    getOpenAIClient: jest.fn(),
}));

describe("Offer API", () => {
    let mockSupabase: any;
    let mockOpenAI: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockSupabase = {
            auth: {
                getUser: jest.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }),
            },
            from: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            in: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: { progress_score: 10, valuation_low: 500, valuation_high: 1000 }, error: null }),
            update: jest.fn().mockReturnThis(),
            insert: jest.fn().mockImplementation(() => {
                return {
                     select: jest.fn().mockImplementation(() => {
                          return {
                               single: jest.fn().mockResolvedValue({ data: { id: "offer-1" }, error: null })
                          }
                     }),
                     error: null
                }
            }),
        };

        mockOpenAI = {
            chat: {
                completions: {
                    create: jest.fn().mockResolvedValue({
                        choices: [{
                            message: {
                                content: JSON.stringify({
                                    offer_low: 5000,
                                    offer_high: 10000,
                                    reasoning: "Test reasoning",
                                    signals_used: ["test"]
                                })
                            }
                        }]
                    })
                }
            }
        };

        (createSupabaseServerClient as jest.Mock).mockReturnValue(mockSupabase);
        (getOpenAIClient as jest.Mock).mockReturnValue(mockOpenAI);
    });

    const createRequest = (body: any) => {
        return new Request("http://localhost/api/offer", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
    };

    it("should reject unauthorized requests", async () => {
        mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } });
        const request = createRequest({ projectId: "proj-1" });
        const response = await POST(request);
        expect(response.status).toBe(401);
    });

    it("should return error if projectId is missing", async () => {
        const response = await POST(createRequest({}));
        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toBe("projectId is required");
    });

    it("should reject if rate limit exceeded", async () => {
        // Return 5 offers already
        mockSupabase.gte.mockResolvedValueOnce({ count: 5 });
        const response = await POST(createRequest({ projectId: "proj-1" }));
        expect(response.status).toBe(429);
        const data = await response.json();
        expect(data.error).toContain("Rate limit exceeded");
    });

    it("should successfully generate and return an offer", async () => {
        // Normal mock setup allows it to proceed
        mockSupabase.gte.mockResolvedValueOnce({ count: 2 }); // rate limit checked

        const response = await POST(createRequest({ projectId: "proj-1" }));
        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.offer).toBeDefined();
        expect(data.reasoning).toBe("Test reasoning");
        expect(mockOpenAI.chat.completions.create).toHaveBeenCalled();
        expect(mockSupabase.from).toHaveBeenCalledWith("offers");
    });
});
