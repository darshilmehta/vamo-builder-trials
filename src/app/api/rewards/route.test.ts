import { POST } from "./route";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Mock Supabase
jest.mock("@/lib/supabase/server", () => ({
    createSupabaseServerClient: jest.fn(),
}));

describe("Rewards API", () => {
    let mockSupabase: any;
    let mockResponseCache: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockResponseCache = {};

        mockSupabase = {
            auth: {
                getUser: jest.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }),
            },
            from: jest.fn((table: string) => {
                const chain = {
                    select: jest.fn().mockReturnThis(),
                    eq: jest.fn().mockReturnThis(),
                    gte: jest.fn().mockReturnThis(),
                    single: jest.fn().mockImplementation(() => {
                        return mockResponseCache[table]?.single || { data: null, error: null };
                    }),
                    insert: jest.fn().mockResolvedValue({ error: null }),
                    update: jest.fn().mockReturnThis(),
                };
                return chain;
            }),
        };

        (createSupabaseServerClient as jest.Mock).mockReturnValue(mockSupabase);
    });

    const createRequest = (body: any) => {
        return new Request("http://localhost/api/rewards", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
    };

    it("should return error if missing eventType or idempotencyKey", async () => {
        const response = await POST(createRequest({}));
        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toBe("eventType and idempotencyKey are required");
    });

    it("should reject unauthorized requests", async () => {
        mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } });
        const response = await POST(createRequest({ eventType: "prompt", idempotencyKey: "123" }));
        expect(response.status).toBe(401);
    });

    it("should return early if idempotencyKey already exists", async () => {
        mockResponseCache["reward_ledger"] = {
            single: Promise.resolve({ data: { reward_amount: 5, balance_after: 50 }, error: null })
        };

        const response = await POST(createRequest({ eventType: "prompt", idempotencyKey: "existing-123" }));
        const data = await response.json();
        expect(response.status).toBe(200);
        expect(data.rewarded).toBe(false);
        expect(data.message).toBe("Reward already claimed");
    });

});
