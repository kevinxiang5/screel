import type { FontTheme } from '../types';

const FONT_STYLES: Partial<Record<FontTheme, string>> = {
  editorial:
    'https://fonts.googleapis.com/css2?family=Lora:wght@400;600;700&family=Playfair+Display:wght@600;700;800&display=swap',
  soft: 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Nunito:wght@400;600;700;800&display=swap',
  clean:
    'https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,600;0,9..40,700;1,9..40,400&display=swap',
};

/** Load optional theme fonts on demand so first paint only needs Syne + Outfit. */
export function ensureFontTheme(theme: FontTheme) {
  const href = FONT_STYLES[theme];
  if (!href) return;
  const id = `font-theme-${theme}`;
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}
