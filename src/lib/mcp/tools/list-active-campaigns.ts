import { createClient } from "@supabase/supabase-js";
import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

function sb() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export default defineTool({
  name: "list_active_campaigns",
  title: "List active campaigns",
  description: "List currently active raffle campaigns with title, price and progress.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).optional().describe("Max results (default 10)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }) => {
    const { data, error } = await sb()
      .from("campaigns")
      .select("id,title,description,ticket_price,total_tickets,sold_tickets,status,draw_date,image_url")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(limit ?? 10);
    if (error)
      return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { campaigns: data ?? [] },
    };
  },
});