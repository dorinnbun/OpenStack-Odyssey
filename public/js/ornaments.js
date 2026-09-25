// The coin gradients (#coin-bronze, #coin-worn) are defined once in index.html.
// Black-figure ornaments: coins, a trireme, and small votive glyphs drawn as
// inline SVG so they inherit the theme's colours (currentColor / CSS vars).

// Homer's books are numbered with the Greek alphabet: Α = 1, Β = 2, …
export const GREEK = 'ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ';
export const greek = (n) => GREEK[n - 1] || String(n);

/** An ancient coin (drachma) stamped with a letter; bronze when earned, worn stone when not. */
export function coin(letter, earned = true, size = 56, title = '') {
  const beads = Array.from({ length: 28 }, (_, i) => {
    const a = (i / 28) * Math.PI * 2;
    return `<circle cx="${(32 + Math.cos(a) * 27.5).toFixed(2)}" cy="${(32 + Math.sin(a) * 27.5).toFixed(2)}" r="1.25"/>`;
  }).join('');
  const face = earned ? 'url(#coin-bronze)' : 'url(#coin-worn)';
  return `<svg class="coin${earned ? ' earned' : ''}" viewBox="0 0 64 64" width="${size}" height="${size}" role="img" aria-label="${title || `Coin ${letter}`}">
    <circle cx="32" cy="32" r="30.5" fill="${face}" stroke="#3a2614" stroke-width="1.5"/>
    <g fill="#3a2614" opacity=".55">${beads}</g>
    <circle cx="32" cy="32" r="23" fill="none" stroke="#3a2614" stroke-width="1" opacity=".6"/>
    <text x="32" y="41.5" text-anchor="middle" font-family="Cinzel, 'Times New Roman', serif" font-weight="700" font-size="26" fill="#2b1a0c">${letter}</text>
  </svg>`;
}

/** Trireme silhouette in black-figure style (faces right). */
export function trireme(w = 120, extraAttrs = '') {
  const oars = Array.from({ length: 11 }, (_, i) => `<line x1="${24 + i * 7.5}" y1="45" x2="${17 + i * 7.5}" y2="58"/>`).join('');
  return `<svg class="trireme" viewBox="0 0 124 62" width="${w}" height="${Math.round(w / 2)}" ${extraAttrs} aria-hidden="true">
    <g stroke="currentColor" stroke-width="1.6" stroke-linecap="round">${oars}</g>
    <path fill="currentColor" d="M3 40 Q22 50 62 50 Q98 50 112 38 Q121 26 112 12 Q117 26 104 34 Q88 42 62 42 Q30 42 12 35 L2 39 Z M3 40 L-2 44 L10 45 Z"/>
    <rect x="60" y="6" width="2.6" height="36" fill="currentColor"/>
    <path d="M40 9 H84 Q81 22 84 31 H40 Q43 20 40 9 Z" fill="var(--terracotta)" stroke="currentColor" stroke-width="1.6"/>
    <path d="M44 14 H80 M44 20 H80 M44 26 H80" stroke="currentColor" stroke-width=".8" opacity=".6"/>
    <circle cx="16" cy="39" r="1.8" fill="var(--papyrus, #ecdcb6)"/>
  </svg>`;
}

const G = {
  owl: `<ellipse cx="24" cy="29" rx="13" ry="15"/><path d="M11 18 L14 8 L20 14 Z M37 18 L34 8 L28 14 Z"/>
    <circle cx="18.5" cy="21" r="5.2" fill="var(--papyrus,#ecdcb6)"/><circle cx="29.5" cy="21" r="5.2" fill="var(--papyrus,#ecdcb6)"/>
    <circle cx="18.5" cy="21" r="2.2"/><circle cx="29.5" cy="21" r="2.2"/><path d="M24 24 L22 28 H26 Z" fill="var(--terracotta)"/>
    <path d="M17 33 Q24 38 31 33 M17 38 Q24 43 31 38" stroke="var(--papyrus,#ecdcb6)" stroke-width="1.2" fill="none"/>`,
  amphora: `<path d="M18 3 H30 V7 Q27.5 9 27.5 13 Q38 18 38 30 Q38 40 28.5 44 L27 47 H21 L19.5 44 Q10 40 10 30 Q10 18 20.5 13 Q20.5 9 18 7 Z"/>
    <path d="M20 11 Q11 11 13 23 M28 11 Q37 11 35 23" fill="none" stroke="currentColor" stroke-width="2.2"/>
    <path d="M12 27 H36 M12.5 33 H35.5" stroke="var(--papyrus,#ecdcb6)" stroke-width="1.3"/>`,
  column: `<rect x="7" y="5" width="34" height="3.5"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/>
    <circle cx="36" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><rect x="14" y="9" width="20" height="5"/>
    <rect x="15" y="14" width="18" height="26"/><path d="M19 15 V39 M22.7 15 V39 M26.3 15 V39 M29.5 15 V39" stroke="var(--papyrus,#ecdcb6)" stroke-width="1"/>
    <rect x="12" y="40" width="24" height="3"/><rect x="9" y="43" width="30" height="3.5"/>`,
  helmet: `<path d="M10 31 Q7 10 24 6 Q41 10 38 31 L35 43 H28.5 L27.5 30 Q24 26.5 20.5 30 L19.5 43 H13 Z"/>
    <path d="M13.5 22 Q18 19 22 22 L21 26 Q17 24.5 14 26 Z M34.5 22 Q30 19 26 22 L27 26 Q31 24.5 34 26 Z" fill="var(--papyrus,#ecdcb6)"/>
    <path d="M9 13 Q24 -3 40 12" fill="none" stroke="var(--terracotta)" stroke-width="5" stroke-linecap="round"/>`,
  lyre: `<path d="M15 40 Q5 22 14 5 M33 40 Q43 22 34 5" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/>
    <path d="M11 10 H37" stroke="currentColor" stroke-width="2.6"/><ellipse cx="24" cy="40" rx="12.5" ry="5.5"/>
    <path d="M19 10 V38 M22.3 10 V38 M25.7 10 V38 M29 10 V38" stroke="currentColor" stroke-width=".9"/>`,
  scroll: `<rect x="10" y="12" width="28" height="24" fill="var(--papyrus,#ecdcb6)" stroke="currentColor" stroke-width="2"/>
    <rect x="5" y="9" width="7" height="30" rx="3.5"/><rect x="36" y="9" width="7" height="30" rx="3.5"/>
    <path d="M15 18 H33 M15 22.5 H33 M15 27 H30 M15 31.5 H27" stroke="currentColor" stroke-width="1.3"/>`,
  lamp: `<ellipse cx="21" cy="31" rx="14" ry="7"/><path d="M33 28 L44 25.5 L42.5 32.5 L33 33 Z"/>
    <circle cx="7" cy="27" r="4" fill="none" stroke="currentColor" stroke-width="2.4"/><ellipse cx="21" cy="26.5" rx="5" ry="1.8" fill="var(--papyrus,#ecdcb6)"/>
    <path d="M43 25 Q39 17 43.5 9 Q48 17 43 25 Z" fill="var(--terracotta)"/><rect x="11" y="37" width="20" height="3"/>`,
  laurel: (() => {
    let s = '';
    for (let k = 0; k < 9; k++) {
      const th = (252 - k * 17) * Math.PI / 180; // left branch, from the bottom up to the top
      const x = 24 + Math.cos(th) * 16; const y = 25 - Math.sin(th) * 16;
      const deg = Math.atan2(-Math.cos(th), -Math.sin(th)) * 180 / Math.PI;
      const leaf = (cx, d) => `<ellipse cx="${cx.toFixed(1)}" cy="${y.toFixed(1)}" rx="5" ry="2.3" transform="rotate(${d.toFixed(0)} ${cx.toFixed(1)} ${y.toFixed(1)})"/>`;
      s += leaf(x, deg + 25) + leaf(48 - x, 180 - deg - 25);
    }
    return `${s}<path d="M19 43 Q24 38 29 43" fill="none" stroke="var(--terracotta)" stroke-width="2.4"/>`;
  })(),
  trident: `<path d="M24 4 V46" stroke="currentColor" stroke-width="3"/><path d="M12 6 V17 Q12 23 24 23 Q36 23 36 17 V6" fill="none" stroke="currentColor" stroke-width="3"/>
    <path d="M12 3 L9 9 H15 Z M24 1 L21 7 H27 Z M36 3 L33 9 H39 Z"/>`,
};

/** A small black-figure glyph (owl, amphora, column, helmet, lyre, scroll, lamp, laurel, trident). */
export const glyph = (name, size = 40) =>
  `<svg class="glyph" viewBox="0 0 48 48" width="${size}" height="${size}" fill="currentColor" aria-hidden="true">${G[name] || ''}</svg>`;
