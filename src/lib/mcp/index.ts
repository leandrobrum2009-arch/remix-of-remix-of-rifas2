import { defineMcp } from "@lovable.dev/mcp-js";
import listActiveCampaigns from "./tools/list-active-campaigns";
import listWinners from "./tools/list-winners";

export default defineMcp({
  name: "rifas-mcp",
  title: "Rifas Online MCP",
  version: "0.1.0",
  instructions:
    "Tools to browse this raffle platform. Use `list_active_campaigns` to see open raffles and `list_winners` to see recent winners.",
  tools: [listActiveCampaigns, listWinners],
});