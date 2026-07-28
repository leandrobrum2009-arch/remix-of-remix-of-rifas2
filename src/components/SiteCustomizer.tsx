import { useEffect } from "react";
import { useSiteSettings } from "@/hooks/useData";

export const SiteCustomizer = () => {
  const { data: settings } = useSiteSettings();

  useEffect(() => {
    if (!settings) return;

    // Update Title
    const siteTitle = settings.site_title || settings.site_name || "Plataforma de Ações";
    if (document.title !== siteTitle) {
      document.title = siteTitle;
    }

    // Update Favicon
    if (settings.site_favicon_url) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = settings.site_favicon_url;
    }
  }, [settings]);

  return null;
};
