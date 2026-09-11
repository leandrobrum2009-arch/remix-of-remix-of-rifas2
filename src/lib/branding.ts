import raylaLogo from "@/assets/raylla-logo.png.asset.json";

/**
 * Marca padrão do site. Usada sempre que as configurações salvas
 * no banco não trouxerem um logo/nome (ex.: backend indisponível).
 */
export const DEFAULT_SITE_NAME = "Raylla Premiações";
export const DEFAULT_SITE_LOGO_URL = raylaLogo.url;

export const resolveSiteName = (value?: string | null) =>
  value && value.trim() !== "" ? value : DEFAULT_SITE_NAME;

export const resolveSiteLogo = (value?: string | null) =>
  value && value.trim() !== "" ? value : DEFAULT_SITE_LOGO_URL;
