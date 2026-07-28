
/**
 * Automated Contrast Audit Utility
 * This utility runs in the browser and highlights elements with low contrast ratios.
 */

export const runContrastAudit = (visual = false) => {
  if (process.env.NODE_ENV !== 'development') return;

  function getLuminance(r: number, g: number, b: number) {
    const a = [r, g, b].map(v => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  }

  function getContrastRatio(rgb1: number[], rgb2: number[]) {
    const l1 = getLuminance(rgb1[0], rgb1[1], rgb1[2]);
    const l2 = getLuminance(rgb2[0], rgb2[1], rgb2[2]);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  }

  function parseRGB(color: string) {
    const matches = color.match(/\d+/g);
    return matches ? matches.map(Number).slice(0, 3) : [0, 0, 0];
  }

  function getEffectiveBackgroundColor(el: HTMLElement | null): string {
    while (el) {
      const bg = window.getComputedStyle(el).backgroundColor;
      if (bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return bg;
      el = el.parentElement;
    }
    return 'rgb(255, 255, 255)';
  }

  console.group('🔍 Contrast Audit');
  let issuesCount = 0;
  
  // Remove existing highlights
  document.querySelectorAll('.contrast-audit-highlight').forEach(el => el.remove());

  document.querySelectorAll('*').forEach(el => {
    const htmlEl = el as HTMLElement;
    if (htmlEl.children.length > 0) {
      const hasDirectText = Array.from(htmlEl.childNodes).some(node => node.nodeType === 3 && node.textContent?.trim());
      if (!hasDirectText) return;
    }
    
    const text = htmlEl.innerText?.trim();
    if (!text || text.length < 2) return;

    const style = window.getComputedStyle(htmlEl);
    if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) === 0) return;

    const fg = style.color;
    const bg = getEffectiveBackgroundColor(htmlEl);
    
    const ratio = getContrastRatio(parseRGB(fg), parseRGB(bg));
    const fontSize = parseFloat(style.fontSize);
    const fontWeight = style.fontWeight;
    const isLarge = fontSize >= 24 || (fontSize >= 18.66 && parseInt(fontWeight) >= 700);
    const threshold = isLarge ? 3 : 4.5;

    if (ratio < threshold) {
      issuesCount++;
      console.warn(
        `Low contrast (${ratio.toFixed(2)}:1, threshold ${threshold}:1):`,
        {
          text: text.substring(0, 50),
          element: htmlEl,
          fg,
          bg,
          ratio: ratio.toFixed(2)
        }
      );

      if (visual) {
        const rect = htmlEl.getBoundingClientRect();
        const highlight = document.createElement('div');
        highlight.className = 'contrast-audit-highlight';
        Object.assign(highlight.style, {
          position: 'absolute',
          top: `${rect.top + window.scrollY}px`,
          left: `${rect.left + window.scrollX}px`,
          width: `${rect.width}px`,
          height: `${rect.height}px`,
          border: '2px dashed red',
          backgroundColor: 'rgba(255, 0, 0, 0.1)',
          pointerEvents: 'none',
          zIndex: '9999',
          title: `Contrast: ${ratio.toFixed(2)}:1`
        });
        document.body.appendChild(highlight);
      }
    }
  });

  if (issuesCount === 0) {
    console.log('✅ No contrast issues found on this page!');
  } else {
    console.log(`⚠️ Found ${issuesCount} contrast issues.`);
    if (!visual) console.log('Tip: Call runContrastAudit(true) for visual highlights.');
  }
  console.groupEnd();
};

export const initContrastShortcut = () => {
  if (process.env.NODE_ENV !== 'development') return;

  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.altKey && e.key === 'a') {
      runContrastAudit(true);
    }
  });
};
