import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CampaignPricing from "@/components/CampaignPricing";
import { Campaign } from "@/hooks/useData";

const mockCampaign: Campaign = {
  id: "test-campaign-id",
  title: "Test Campaign",
  ticket_price: 1.5,
  total_tickets: 1000,
  sold_tickets: 0,
  status: "active",
  price_bundles: [
    { quantity: 10, price: 12.0 }, // 1.2 per ticket
    { quantity: 50, price: 50.0 }, // 1.0 per ticket
  ],
  slug: "test-campaign",
} as any;

describe("CampaignPricing Component", () => {
  it("calculates total correctly without bundle", async () => {
    const onBuy = vi.fn();
    render(<CampaignPricing campaign={mockCampaign} onBuy={onBuy} />);
    
    const input = screen.getByPlaceholderText("Ex: 50");
    fireEvent.change(input, { target: { value: "5" } });
    
    // 5 * 1.5 = 7.5
    const totals = screen.getAllByText(/R\$ 7,50/);
    expect(totals.length).toBeGreaterThan(0);
  });

  it("applies bundle price correctly", async () => {
    const onBuy = vi.fn();
    render(<CampaignPricing campaign={mockCampaign} onBuy={onBuy} />);
    
    // Click on the bundle for 10 tickets
    const bundleButton = screen.getByText("+10");
    fireEvent.click(bundleButton);
    
    // Should show bundle price 12,00
    const prices = screen.getAllByText(/R\$ 12,00/);
    expect(prices.length).toBeGreaterThan(0);
    expect(screen.getByText(/Selecionadas/i).parentElement?.textContent).toContain("10");
  });

  it("calls onBuy with correct quantity", async () => {
    const onBuy = vi.fn();
    render(<CampaignPricing campaign={mockCampaign} onBuy={onBuy} />);
    
    const input = screen.getByPlaceholderText("Ex: 50");
    fireEvent.change(input, { target: { value: "20" } });
    
    const buyButton = screen.getByText(/QUERO PARTICIPAR/);
    fireEvent.click(buyButton);
    
    expect(onBuy).toHaveBeenCalledWith(20);
  });
});
