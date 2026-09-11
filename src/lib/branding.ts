import raylaLogo from "@/assets/raylla-logo.png.asset.json";

/**
 * Marca do site definida diretamente no código.
 * Enquanto FORCE_CODE_BRANDING for true, o nome e o logo abaixo têm
 * prioridade sobre qualquer valor salvo nas configurações do banco.
 */
export const DEFAULT_SITE_NAME = "Raylla Premiações";
export const DEFAULT_SITE_LOGO_URL = raylaLogo.url;

export const FORCE_CODE_BRANDING = true;

export const resolveSiteName = (value?: string | null) => {
  if (FORCE_CODE_BRANDING) return DEFAULT_SITE_NAME;
  return value && value.trim() !== "" ? value : DEFAULT_SITE_NAME;
};

export const resolveSiteLogo = (value?: string | null) => {
  if (FORCE_CODE_BRANDING) return DEFAULT_SITE_LOGO_URL;
  return value && value.trim() !== "" ? value : DEFAULT_SITE_LOGO_URL;
};
