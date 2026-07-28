import { Helmet } from "react-helmet-async";
import { useSiteSettings } from "@/hooks/useData";

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
}

export const SEO = ({ 
  title, 
  description, 
  keywords, 
  image, 
  url, 
  type = "website" 
}: SEOProps) => {
  const { data: settings } = useSiteSettings();

  const siteName = settings?.site_title || settings?.site_name || "";
  const defaultDescription =
    settings?.description ||
    "Plataforma online de ações com pagamento via PIX, sorteios oficiais pela Loteria Federal e prêmios entregues com segurança.";
  const defaultKeywords = settings?.site_keywords || "ações online, sorteios, prêmios, pix, loteria federal";
  
  const seoTitle = !title || title === siteName ? siteName : `${title} | ${siteName}`;
  const seoDescription = description || defaultDescription;
  const seoKeywords = keywords ? `${keywords}, ${defaultKeywords}` : defaultKeywords;
  const seoImage = image || "https://sistemarifas.lovable.app/placeholder.svg";
  const seoUrl = url || window.location.href;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{seoTitle}</title>
      <meta name="description" content={seoDescription} />
      <meta name="keywords" content={seoKeywords} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={seoTitle} />
      <meta property="og:description" content={seoDescription} />
      <meta property="og:image" content={seoImage} />
      <meta property="og:url" content={seoUrl} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={seoTitle} />
      <meta name="twitter:description" content={seoDescription} />
      <meta name="twitter:image" content={seoImage} />
    </Helmet>
  );
};
