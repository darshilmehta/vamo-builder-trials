import { POST } from "./route";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Mock Supabase
jest.mock("@/lib/supabase/server", () => ({
    createSupabaseServerClient: jest.fn(),
}));

describe("Redeem API", () => {
    let mockSupabase: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockSupabase = {
            auth: {
                getUser: jest.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }),
            },
            from: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnThis(),
            insert: jest.fn().mockImplementation(() => {
                return {
                     select: jest.fn().mockImplementation(() => {
                          return {
                               single: jest.fn().mockResolvedValue({ data: { id: "redemption-1" }, error: null })
                          }
                     }),
                     error: null
                }
            }),
        };

        (createSupabaseServerClient as jest.Mock).mockReturnValue(mockSupabase);
    });

    const createRequest = (body: any) => {
        return new Request("http://localhost/api/redeem", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
    };

    it("should return 401 if user is unauthorized", async () => {
        mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } });
        const request = createRequest({ amount: 100 });
        const response = await POST(request);
        expect(response.status).toBe(401);
    });

    it("should return 400 if amount is less than minimum", async () => {
        const request = createRequest({ amount: 5 }); // Less than minimum
        const response = await POST(request);
        const data = await response.json();
        expect(response.status).toBe(400);
        expect(data.error).toContain("Minimum redemption amount");
    });

    it("should return error if wallet integrity check fails", async () => {
        let callCount = 0;
        mockSupabase.eq.mockImplementation(() => {
            callCount++;
            if (callCount === 1) { // 1st call: profile "single"
                return { single: jest.fn().mockResolvedValue({ data: { pineapple_balance: 1000 } }) }
            } else if (callCount === 2) { // 2nd call: ledger returns directly
                return Promise.resolve({ data: [] })
            }
            return { data: null };
        });
        
        const request = createRequest({ amount: 100 });
        const response = await POST(request);
        const data = await response.json();
        expect(response.status).toBe(403);
        expect(data.error).toContain("detected an inconsistency");
    });

    it("should successfully process redemption if balance covers it and integrity passes", async () => {
        let callCount = 0;
        mockSupabase.eq.mockImplementation(() => {
            callCount++;
            if (callCount === 1) { // 1st call: profile "single"
                return { single: jest.fn().mockResolvedValue({ data: { pineapple_balance: 100 } }) }
            } else if (callCount === 2) { // 2nd call: ledger returns directly
                return Promise.resolve({ data: [{ reward_amount: 100 }] })
            } else if (callCount === 3) { // 3rd call: deduction update
                return Promise.resolve({ data: null, error: null })
            }
            return Promise.resolve({ data: null });
        });

        const request = createRequest({ amount: 100 });
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.newBalance).toBe(0);
        expect(mockSupabase.from).toHaveBeenCalledWith("redemptions");
        expect(mockSupabase.from).toHaveBeenCalledWith("reward_ledger");
        expect(mockSupabase.from).toHaveBeenCalledWith("activity_events");
    });
});
