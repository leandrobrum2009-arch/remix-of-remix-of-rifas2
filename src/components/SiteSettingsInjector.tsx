import { useEffect } from "react";
import { useSiteSettings } from "@/hooks/useData";

export const SiteSettingsInjector = () => {
  const { data: settings } = useSiteSettings();

  useEffect(() => {
    if (!settings) return;

    // Toggle global inline-mode class (mobile-locked compact layout for entire site)
    if (settings.layout_mode === "inline") {
      document.documentElement.classList.add("inline-mode");
    } else {
      document.documentElement.classList.remove("inline-mode");
    }

    // Apply global theme (admin-controlled, overrides per-user preference)
    const theme = settings.site_theme || "dark";
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    if (theme === "system") {
      const sys = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      root.classList.add(sys);
    } else {
      root.classList.add(theme);
    }

    // Cache basic settings for early injection on next load — scoped per
    // hostname so multiple tenants sharing a browser don't clobber each
    // other's cached branding.
    const host = typeof window !== "undefined" ? window.location.hostname : "";
    const prefix = host ? `cached::${host}::` : "cached_";
    if (settings.primary_color) localStorage.setItem(`${prefix}primary_color`, settings.primary_color);
    if (settings.site_name) localStorage.setItem(`${prefix}site_name`, settings.site_name);
    if (settings.site_title) localStorage.setItem(`${prefix}site_title`, settings.site_title);
    if (settings.site_logo_url) localStorage.setItem(`${prefix}site_logo`, settings.site_logo_url);

    // Apply Site Name or Site Title to Title
    const siteTitle = settings.site_title || settings.site_name || "Carregando...";
    if (siteTitle) {
      document.title = siteTitle;
      
      // Update Meta Tags
      const metaTitle = document.querySelector('meta[property="og:title"]');
      if (metaTitle) metaTitle.setAttribute('content', siteTitle);
      
      const twitterTitle = document.querySelector('meta[name="twitter:title"]');
      if (twitterTitle) twitterTitle.setAttribute('content', siteTitle);
    }

    // Apply Site Description
    if (settings.site_description) {
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) metaDescription.setAttribute('content', settings.site_description);
      
      const ogDescription = document.querySelector('meta[property="og:description"]');
      if (ogDescription) ogDescription.setAttribute('content', settings.site_description);
    }

    // Apply Site Keywords
    if (settings.site_keywords) {
      const metaKeywords = document.querySelector('meta[name="keywords"]');
      if (metaKeywords) metaKeywords.setAttribute('content', settings.site_keywords);
    }

    // Canonical + og:url point at current origin (per-tenant domain)
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    if (origin) {
      let canonical = document.querySelector("link[rel='canonical']") as HTMLLinkElement | null;
      if (!canonical) {
        canonical = document.createElement("link");
        canonical.rel = "canonical";
        document.head.appendChild(canonical);
      }
      canonical.href = origin + window.location.pathname;
      const ogUrl = document.querySelector('meta[property="og:url"]');
      if (ogUrl) ogUrl.setAttribute("content", origin + window.location.pathname);
    }

    // og:image and twitter:image — clear hardcoded lovable.app placeholder
    // when no tenant image is configured, so hosting can inject the correct one.
    const tenantImage = settings.site_og_image || settings.site_logo_url || "";
    ["og:image", "twitter:image"].forEach((key) => {
      const sel = key.startsWith("og:")
        ? `meta[property='${key}']`
        : `meta[name='${key}']`;
      const el = document.querySelector(sel);
      if (!el) return;
      if (tenantImage) el.setAttribute("content", tenantImage);
      else el.setAttribute("content", "");
    });

    // Dynamic Web App Manifest per tenant
    try {
      const manifest = {
        name: settings.site_title || settings.site_name || "Ações",
        short_name: settings.site_name || settings.site_title || "Ações",
        description:
          settings.site_description ||
          "Sistema de ações online com pagamento via PIX.",
        start_url: "/",
        display: "standalone",
        background_color: "#0f1729",
        theme_color: settings.primary_color || "#0f1729",
        orientation: "portrait",
        icons: settings.site_logo_url
          ? [
              {
                src: settings.site_logo_url,
                sizes: "512x512",
                type: "image/png",
                purpose: "any maskable",
              },
            ]
          : [
              {
                src: "/placeholder.svg",
                sizes: "512x512",
                type: "image/svg+xml",
                purpose: "any maskable",
              },
            ],
      };
      const blob = new Blob([JSON.stringify(manifest)], {
        type: "application/manifest+json",
      });
      const url = URL.createObjectURL(blob);
      let link = document.querySelector("link[rel='manifest']") as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement("link");
        link.rel = "manifest";
        document.head.appendChild(link);
      }
      const prev = link.getAttribute("data-blob");
      if (prev) URL.revokeObjectURL(prev);
      link.href = url;
      link.setAttribute("data-blob", url);
    } catch { /* ignore */ }

    // Apply Primary Color
    if (settings.primary_color) {
      const hex = settings.primary_color;
      const hsl = hexToHsl(hex);
      if (hsl) {
        // Shadcn UI uses HSL values separated by spaces: "H S% L%"
        document.documentElement.style.setProperty('--primary', `${hsl.h} ${hsl.s}% ${hsl.l}%`);
        document.documentElement.style.setProperty('--ring', `${hsl.h} ${hsl.s}% ${hsl.l}%`);
        
        // Add RGB for transparency use
        const rgb = hexToRgb(hex);
        if (rgb) {
          document.documentElement.style.setProperty('--primary-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
        }
      }
      
      // Update favicon if site_favicon_url or site_logo_url is present
      const logoUrl = settings.site_favicon_url || settings.site_logo_url;
      if (logoUrl) {
        
        // Update all icon types
        const iconTypes = ["icon", "shortcut icon", "apple-touch-icon"];
        
        iconTypes.forEach(type => {
          let link = document.querySelector(`link[rel~='${type}']`) as HTMLLinkElement;
          if (link) {
            link.href = logoUrl;
          } else {
            link = document.createElement('link');
            link.rel = type;
            link.href = logoUrl;
            document.head.appendChild(link);
          }
        });
      }
    }
    
    // Apply other visual settings
    if (settings.button_glow_speed) document.documentElement.style.setProperty('--button-glow-speed', `${settings.button_glow_speed}s`);
    if (settings.title_shimmer_speed) document.documentElement.style.setProperty('--title-shimmer-speed', `${settings.title_shimmer_speed}s`);
    if (settings.border_shimmer_opacity) document.documentElement.style.setProperty('--border-shimmer-opacity', settings.border_shimmer_opacity);
    if (settings.animation_easing) document.documentElement.style.setProperty('--animation-easing', settings.animation_easing);
    if (settings.button_glow_intensity) document.documentElement.style.setProperty('--button-glow-intensity', settings.button_glow_intensity);
    if (settings.title_shimmer_primary) document.documentElement.style.setProperty('--title-shimmer-primary', settings.title_shimmer_primary);
    
    // Logo Height
    if (settings.site_logo_height) document.documentElement.style.setProperty('--logo-height-desktop', `${settings.site_logo_height}px`);
    if (settings.site_logo_height_mobile) document.documentElement.style.setProperty('--logo-height-mobile', `${settings.site_logo_height_mobile}px`);
    
    // Inject Custom Scripts
    injectTrackingScripts(settings);

  }, [settings]);

  return null;
};

const injectTrackingScripts = (settings: any) => {
  // Clear existing injected scripts to avoid duplicates on settings change
  document.querySelectorAll('.injected-script').forEach(el => el.remove());

  // Facebook Pixel
  if (settings.facebook_pixel_id) {
    const fbScript = document.createElement('script');
    fbScript.className = 'injected-script';
    fbScript.innerHTML = `
      !function(f,b,e,v,n,t,s)
      {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)}(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', '${settings.facebook_pixel_id}');
      fbq('track', 'PageView');
    `;
    document.head.appendChild(fbScript);
    
    const fbNoscript = document.createElement('noscript');
    fbNoscript.className = 'injected-script';
    fbNoscript.innerHTML = `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${settings.facebook_pixel_id}&ev=PageView&noscript=1" />`;
    document.body.appendChild(fbNoscript);
  }

  // Google Analytics (G-tag)
  if (settings.google_analytics_id) {
    const gaScript = document.createElement('script');
    gaScript.className = 'injected-script';
    gaScript.async = true;
    gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${settings.google_analytics_id}`;
    document.head.appendChild(gaScript);

    const gaConfigScript = document.createElement('script');
    gaConfigScript.className = 'injected-script';
    gaConfigScript.innerHTML = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${settings.google_analytics_id}');
    `;
    document.head.appendChild(gaConfigScript);
  }

  // Google Tag Manager
  if (settings.google_tag_manager_id) {
    const gtmScript = document.createElement('script');
    gtmScript.className = 'injected-script';
    gtmScript.innerHTML = `
      (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
      new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
      j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
      'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
      })(window,document,'script','dataLayer','${settings.google_tag_manager_id}');
    `;
    document.head.appendChild(gtmScript);

    const gtmNoscript = document.createElement('noscript');
    gtmNoscript.className = 'injected-script';
    gtmNoscript.innerHTML = `<iframe src="https://www.googletagmanager.com/ns.html?id=${settings.google_tag_manager_id}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`;
    document.body.appendChild(gtmNoscript);
  }

  // Custom Header Scripts
  if (settings.custom_header_scripts) {
    const container = document.createElement('div');
    container.className = 'injected-script';
    container.innerHTML = settings.custom_header_scripts;
    Array.from(container.children).forEach(node => {
      if (node.tagName === 'SCRIPT') {
        const script = document.createElement('script');
        Array.from(node.attributes).forEach(attr => script.setAttribute(attr.name, attr.value));
        script.innerHTML = node.innerHTML;
        document.head.appendChild(script);
      } else {
        document.head.appendChild(node.cloneNode(true));
      }
    });
  }

  // Custom Body Scripts
  if (settings.custom_body_scripts) {
    const container = document.createElement('div');
    container.className = 'injected-script';
    container.innerHTML = settings.custom_body_scripts;
    Array.from(container.children).forEach(node => {
      if (node.tagName === 'SCRIPT') {
        const script = document.createElement('script');
        Array.from(node.attributes).forEach(attr => script.setAttribute(attr.name, attr.value));
        script.innerHTML = node.innerHTML;
        document.body.appendChild(script);
      } else {
        document.body.appendChild(node.cloneNode(true));
      }
    });
  }
};

function hexToHsl(hex: string) {
  // Remove # if present
  hex = hex.replace(/^#/, '');
  
  // Parse r, g, b
  let r = 0, g = 0, b = 0;
  if (hex.length === 3) {
    r = parseInt(hex[0] + hex[0], 16);
    g = parseInt(hex[1] + hex[1], 16);
    b = parseInt(hex[2] + hex[2], 16);
  } else if (hex.length === 6) {
    r = parseInt(hex.substring(0, 2), 16);
    g = parseInt(hex.substring(2, 4), 16);
    b = parseInt(hex.substring(4, 6), 16);
  } else {
    return null;
  }

  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

function hexToRgb(hex: string) {
  hex = hex.replace(/^#/, '');
  let r = 0, g = 0, b = 0;
  if (hex.length === 3) {
    r = parseInt(hex[0] + hex[0], 16);
    g = parseInt(hex[1] + hex[1], 16);
    b = parseInt(hex[2] + hex[2], 16);
  } else if (hex.length === 6) {
    r = parseInt(hex.substring(0, 2), 16);
    g = parseInt(hex.substring(2, 4), 16);
    b = parseInt(hex.substring(4, 6), 16);
  } else {
    return null;
  }
  return { r, g, b };
}