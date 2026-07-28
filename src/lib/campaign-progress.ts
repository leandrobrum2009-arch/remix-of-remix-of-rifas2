import type { Campaign } from "@/hooks/useData";

export const getCampaignDisplaySales = (campaign: Pick<Campaign, "sold_tickets" | "total_tickets" | "fake_progress_enabled" | "fake_progress_percentage" | "progress_text" | "sales_goal" | "ticket_price">) => {
  const totalTickets = Math.max(1, Number(campaign.total_tickets || 0));
  const realSold = Math.max(0, Number(campaign.sold_tickets || 0));
  const fakeEnabled = campaign.fake_progress_enabled === true && campaign.fake_progress_percentage !== undefined && campaign.fake_progress_percentage !== null;
  const fakePercent = fakeEnabled ? Math.max(0, Number(campaign.fake_progress_percentage || 0)) : 0;
  const fakeSold = fakeEnabled ? Math.round((totalTickets * fakePercent) / 100) : 0;
  const displaySoldTickets = Math.min(totalTickets, fakeEnabled ? fakeSold + realSold : realSold);

  let rawProgress = 0;
  if (campaign.sales_goal && Number(campaign.sales_goal) > 0 && !fakeEnabled) {
    rawProgress = (realSold * Number(campaign.ticket_price || 0) / Number(campaign.sales_goal)) * 100;
  } else {
    rawProgress = (displaySoldTickets / totalTickets) * 100;
  }

  const clampedProgress = Math.min(100, Math.max(0, rawProgress));
  const roundedProgress = Math.round(clampedProgress);
  const progressText = campaign.progress_text || (clampedProgress > 0 && clampedProgress < 1 ? clampedProgress.toFixed(2) : String(roundedProgress));
  const progressBar = Math.min(100, Math.max(clampedProgress, clampedProgress > 0 ? 0.5 : 0));

  return {
    displaySoldTickets,
    rawProgress: clampedProgress,
    roundedProgress,
    progressText,
    progressBar,
  };
};