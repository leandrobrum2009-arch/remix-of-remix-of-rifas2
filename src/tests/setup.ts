import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock Supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(),
          in: vi.fn(),
        })),
      })),
    })),
  },
}));

// Mock Auth Context
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(() => ({
    user: { id: "test-user-id" },
  })),
}));

// Mock Data Hooks
vi.mock("@/hooks/useData", () => ({
  useCampaign: vi.fn(),
  useMysteryBoxConfigs: vi.fn(() => ({ data: [] })),
  useRoulettePrizes: vi.fn(() => ({ data: [] })),
  useWinners: vi.fn(() => ({ data: [] })),
  useTickets: vi.fn(() => ({ data: [] })),
  useCampaignRanking: vi.fn(() => ({ data: [] })),
  useCampaignLuckyWinners: vi.fn(() => ({ data: [] })),
  useCampaignTicketStats: vi.fn(() => ({ data: {} })),
  useUserTickets: vi.fn(() => ({ data: [] })),
  useUserCampaignSpins: vi.fn(() => ({ data: [] })),
  useUserCampaignScratches: vi.fn(() => ({ data: [] })),
}));
