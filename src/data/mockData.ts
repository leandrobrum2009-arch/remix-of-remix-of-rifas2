export interface Campaign {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  code: string;
  status: "active" | "completed" | "upcoming";
  drawDate: string;
  drawTime: string;
  ticketPrice: number;
  totalTickets: number;
  soldTickets: number;
  urgencyTag?: string;
}

export interface Winner {
  id: string;
  name: string;
  campaignTitle: string;
  prize: string;
  luckyNumber: string;
  drawDate: string;
  phone: string;
  videoUrl?: string;
}

export const mockCampaigns: Campaign[] = [
  {
    id: "1",
    title: "SORTEIO DIA 21/02 - 8ª EDIÇÃO",
    subtitle: "Lancha Levefort + Vmax 115hp + Carreta Premium Personalizada",
    image: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80",
    code: "LTP-PRC-2025/02500",
    status: "active",
    drawDate: "21/02/2026",
    drawTime: "18:00",
    ticketPrice: 0.99,
    totalTickets: 250000,
    soldTickets: 187500,
    urgencyTag: "🚨 VAI ESGOTAR HOJE ❌",
  },
  {
    id: "2",
    title: "SORTEIO 17/12 - 7ª EDIÇÃO",
    subtitle: "Ação 100% Legalizada!",
    image: "https://images.unsplash.com/photo-1605281317010-fe5ffe798166?w=800&q=80",
    code: "LTP-PRC-2025/01713",
    status: "completed",
    drawDate: "17/12/2025",
    drawTime: "18:00",
    ticketPrice: 0.79,
    totalTickets: 200000,
    soldTickets: 200000,
  },
  {
    id: "3",
    title: "SORTEIO 22/10 - 6ª EDIÇÃO",
    subtitle: "Lancha Levefort + Carreta Premium",
    image: "https://images.unsplash.com/photo-1569263979104-865ab7cd8d13?w=800&q=80",
    code: "LTP-PRC-2025/01411",
    status: "completed",
    drawDate: "22/10/2025",
    drawTime: "18:00",
    ticketPrice: 0.79,
    totalTickets: 180000,
    soldTickets: 180000,
  },
  {
    id: "4",
    title: "EDIÇÃO 5 - LEVEFORT EM DOBRO",
    subtitle: "Participe e concorra!",
    image: "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=800&q=80",
    code: "LTP-PRC-2025/01200",
    status: "completed",
    drawDate: "20/08/2025",
    drawTime: "18:00",
    ticketPrice: 0.69,
    totalTickets: 150000,
    soldTickets: 150000,
  },
  {
    id: "5",
    title: "EDIÇÃO 4 - Lancha Levefort + Ranger",
    subtitle: "Participe e concorra!",
    image: "https://images.unsplash.com/photo-1559827291-bab97d1cf2c3?w=800&q=80",
    code: "LTP-PRC-2025/01000",
    status: "completed",
    drawDate: "18/06/2025",
    drawTime: "18:00",
    ticketPrice: 0.59,
    totalTickets: 120000,
    soldTickets: 120000,
  },
];

export const mockWinners: Winner[] = [
  {
    id: "1",
    name: "Thiago Rafael Lemes",
    campaignTitle: "SORTEIO 17/12 - 7ª EDIÇÃO",
    prize: "Lancha Levefort Apolus 600 S + Yamaha 90HP + Carreta Premium Kit Completo 0KM!",
    luckyNumber: "0157945",
    drawDate: "17/12/2025",
    phone: "(42) ****-****",
    videoUrl: "#",
  },
  {
    id: "2",
    name: "Marcos Antônio Candido Bento",
    campaignTitle: "SORTEIO 22/10 - 6ª EDIÇÃO",
    prize: "Lancha Levefort Apolus TR CLX + Carreta Rodoviária Premium com Roda Liga Leve! Kit 0KM",
    luckyNumber: "2992710",
    drawDate: "22/10/2025",
    phone: "(62) ****-****",
    videoUrl: "#",
  },
  {
    id: "3",
    name: "Jose Victor da Silva",
    campaignTitle: "EDIÇÃO 5 - LEVEFORT EM DOBRO",
    prize: "Lancha Levefort Apolus TR CLX + Motor 40HP",
    luckyNumber: "0238171",
    drawDate: "20/08/2025",
    phone: "(65) ****-****",
    videoUrl: "#",
  },
  {
    id: "4",
    name: "Anderson Wagner Wildner",
    campaignTitle: "EDIÇÃO 4 - Lancha Levefort + Ranger",
    prize: "Lancha Levefort + Ranger",
    luckyNumber: "6819554",
    drawDate: "18/06/2025",
    phone: "(46) ****-****",
    videoUrl: "#",
  },
];
