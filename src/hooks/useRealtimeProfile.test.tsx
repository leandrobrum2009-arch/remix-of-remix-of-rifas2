import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

let capturedHandler: ((payload: any) => void) | null = null;
const removeChannel = vi.fn();
const subscribe = vi.fn(() => ({}));
const on = vi.fn((_evt: string, _cfg: any, cb: any) => {
  capturedHandler = cb;
  return { subscribe };
});
const channel: (name: string) => any = vi.fn(() => ({ on }));
const maybeSingle = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    channel: (name: string) => channel(name),
    removeChannel: (ch: unknown) => removeChannel(ch),
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }),
  },
}));

import { useRealtimeProfile } from "./useRealtimeProfile";

describe("useRealtimeProfile (e2e saldo)", () => {
  beforeEach(() => {
    capturedHandler = null;
    maybeSingle.mockReset();
    removeChannel.mockReset();
  });

  it("carrega saldo inicial e atualiza automaticamente via realtime", async () => {
    maybeSingle.mockResolvedValueOnce({ data: { user_id: "u1", balance: 100 }, error: null });
    const { result } = renderHook(() => useRealtimeProfile("u1"));

    await waitFor(() => expect(result.current.profile?.balance).toBe(100));
    expect(capturedHandler).toBeTruthy();

    // Simula webhook postgres_changes após compra por saldo (100 -> 70)
    act(() => capturedHandler!({ new: { user_id: "u1", balance: 70 } }));

    await waitFor(() => expect(result.current.profile?.balance).toBe(70));
  });

  it("não subscreve sem usuário", () => {
    renderHook(() => useRealtimeProfile(undefined));
    expect(channel).not.toHaveBeenCalledWith(expect.stringContaining("profile-undefined"));
  });

  it("remove o canal ao desmontar", async () => {
    maybeSingle.mockResolvedValueOnce({ data: { balance: 50 }, error: null });
    const { unmount } = renderHook(() => useRealtimeProfile("u2"));
    await waitFor(() => expect(subscribe).toHaveBeenCalled());
    unmount();
    expect(removeChannel).toHaveBeenCalled();
  });
});
