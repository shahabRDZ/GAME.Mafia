/* ── SVG Character Data ── */
const MAFIA_CHARS = [
// M0 — Il Capo (Fedora boss)
`<svg viewBox="0 0 80 100" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="40" cy="24" rx="34" ry="7" fill="#0d0d0d"/>
  <rect x="16" y="8" width="48" height="18" rx="6" fill="#141414"/>
  <rect x="16" y="20" width="48" height="5" fill="#7a0000"/>
  <ellipse cx="40" cy="50" rx="19" ry="21" fill="#1e0808"/>
  <path d="M24 44 Q32 40 36 44" stroke="#5a0000" stroke-width="2" fill="none"/>
  <path d="M44 44 Q48 40 56 44" stroke="#5a0000" stroke-width="2" fill="none"/>
  <ellipse cx="33" cy="48" rx="5" ry="5" fill="#220000"/>
  <ellipse cx="33" cy="48" rx="3" ry="3" fill="#cc0000" class="eg"/>
  <circle cx="33" cy="48" r="1.4" fill="#ff5555"/>
  <ellipse cx="47" cy="48" rx="5" ry="5" fill="#220000"/>
  <ellipse cx="47" cy="48" rx="3" ry="3" fill="#cc0000" class="eg"/>
  <circle cx="47" cy="48" r="1.4" fill="#ff5555"/>
  <path d="M44 42 L49 50" stroke="#5a0000" stroke-width="1.5" stroke-linecap="round"/>
  <path d="M34 62 Q40 58 46 62" stroke="#6a0000" stroke-width="2" fill="none" stroke-linecap="round"/>
  <rect x="38" y="61" width="4" height="4" rx="1" fill="#ccc" opacity=".5"/>
  <path d="M21 72 Q40 67 59 72 L63 100 L17 100Z" fill="#0d0d0d"/>
  <path d="M21 72 L35 68 L30 90Z" fill="#181818"/>
  <path d="M59 72 L45 68 L50 90Z" fill="#181818"/>
  <path d="M37 68 L43 68 L46 80 L40 98 L34 80Z" fill="#7a0000"/>
</svg>`,

// M1 — La Fantasma (Hooded ghost)
`<svg viewBox="0 0 80 100" xmlns="http://www.w3.org/2000/svg">
  <path d="M10 32 Q10 6 40 4 Q70 6 70 32 L68 75 Q54 84 40 85 Q26 84 12 75Z" fill="#150a28"/>
  <ellipse cx="40" cy="44" rx="15" ry="18" fill="#08030f"/>
  <ellipse cx="33" cy="41" rx="5" ry="4.5" fill="#2d006b"/>
  <ellipse cx="33" cy="41" rx="3" ry="3" fill="#9400d3" class="eg"/>
  <circle cx="33" cy="41" r="1.5" fill="#da70d6"/>
  <ellipse cx="47" cy="41" rx="5" ry="4.5" fill="#2d006b"/>
  <ellipse cx="47" cy="41" rx="3" ry="3" fill="#9400d3" class="eg"/>
  <circle cx="47" cy="41" r="1.5" fill="#da70d6"/>
  <path d="M32 56 Q40 62 48 56" stroke="#5a007a" stroke-width="1.8" fill="none" stroke-linecap="round"/>
  <line x1="34" y1="56" x2="33.5" y2="60" stroke="#5a007a" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="37" y1="57" x2="37" y2="61" stroke="#5a007a" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="40" y1="58" x2="40" y2="62" stroke="#5a007a" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="43" y1="57" x2="43" y2="61" stroke="#5a007a" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="46" y1="56" x2="46.5" y2="60" stroke="#5a007a" stroke-width="1.5" stroke-linecap="round"/>
  <path d="M10 75 Q15 100 22 100 L58 100 Q65 100 70 75 Q54 84 40 85 Q26 84 10 75Z" fill="#0e061e"/>
  <ellipse cx="40" cy="50" rx="30" ry="34" fill="none" stroke="#5a007a" stroke-width=".6" opacity=".4"/>
</svg>`,

// M2 — Il Diavolo (Devil)
`<svg viewBox="0 0 80 100" xmlns="http://www.w3.org/2000/svg">
  <polygon points="27,15 21,1 35,11" fill="#7a0000"/>
  <polygon points="53,15 59,1 45,11" fill="#7a0000"/>
  <circle cx="21" cy="1" r="2.5" fill="#ff4500" class="eg"/>
  <circle cx="59" cy="1" r="2.5" fill="#ff4500" class="eg"/>
  <ellipse cx="40" cy="49" rx="20" ry="22" fill="#270400"/>
  <path d="M27 41 Q33 37 39 41" stroke="#7a0000" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <path d="M41 41 Q47 37 53 41" stroke="#7a0000" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <ellipse cx="34" cy="47" rx="5" ry="5" fill="#3d0000"/>
  <ellipse cx="34" cy="47" rx="3.2" ry="3.5" fill="#ff4500" class="eg"/>
  <ellipse cx="34" cy="47" rx="1.5" ry="2" fill="#ffaa00"/>
  <ellipse cx="46" cy="47" rx="5" ry="5" fill="#3d0000"/>
  <ellipse cx="46" cy="47" rx="3.2" ry="3.5" fill="#ff4500" class="eg"/>
  <ellipse cx="46" cy="47" rx="1.5" ry="2" fill="#ffaa00"/>
  <path d="M29 62 Q40 70 51 62" stroke="#5a0000" stroke-width="1.5" fill="#180000"/>
  <polygon points="34,62 36.5,62 35.2,68" fill="#ddd" opacity=".8"/>
  <polygon points="39,63 41.5,63 40.2,69" fill="#ddd" opacity=".8"/>
  <polygon points="44,62 46.5,62 45.2,68" fill="#ddd" opacity=".8"/>
  <path d="M20 72 Q40 66 60 72 L65 100 L15 100Z" fill="#180000"/>
  <polygon points="40,74 44,82 40,90 36,82" fill="#7a0000" opacity=".8"/>
  <polygon points="40,74 44,82 40,90 36,82" fill="none" stroke="#ff4500" stroke-width=".6"/>
</svg>`,

// M3 — Lo Scorpione (Tactical assassin)
`<svg viewBox="0 0 80 100" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="40" cy="34" rx="22" ry="24" fill="#0e0e0e"/>
  <path d="M19 44 Q40 50 61 44 L61 62 Q40 68 19 62Z" fill="#1a1a1a"/>
  <path d="M19 44 Q40 42 61 44" stroke="#2a2a2a" stroke-width="1.2" fill="none"/>
  <ellipse cx="31" cy="40" rx="6" ry="4" fill="#001a1a"/>
  <ellipse cx="31" cy="40" rx="4" ry="2.5" fill="#00cccc" class="eg" opacity=".9"/>
  <ellipse cx="49" cy="40" rx="6" ry="4" fill="#001a1a"/>
  <ellipse cx="49" cy="40" rx="4" ry="2.5" fill="#00cccc" class="eg" opacity=".9"/>
  <line x1="23" y1="52" x2="36" y2="52" stroke="#2a2a2a" stroke-width=".9"/>
  <line x1="23" y1="55" x2="36" y2="55" stroke="#2a2a2a" stroke-width=".9"/>
  <line x1="44" y1="52" x2="57" y2="52" stroke="#2a2a2a" stroke-width=".9"/>
  <line x1="44" y1="55" x2="57" y2="55" stroke="#2a2a2a" stroke-width=".9"/>
  <path d="M17 68 Q40 62 63 68 L65 100 L15 100Z" fill="#111"/>
  <rect x="29" y="72" width="22" height="15" rx="3" fill="#1a1a1a"/>
  <rect x="33" y="74" width="14" height="11" rx="2" fill="#0d0d0d"/>
  <line x1="33" y1="76" x2="47" y2="76" stroke="#222" stroke-width="1"/>
  <line x1="33" y1="79" x2="47" y2="79" stroke="#222" stroke-width="1"/>
  <ellipse cx="19" cy="70" rx="7" ry="4.5" fill="#1a1a1a"/>
  <ellipse cx="61" cy="70" rx="7" ry="4.5" fill="#1a1a1a"/>
  <text x="40" y="92" text-anchor="middle" font-size="8" fill="#00cccc" opacity=".5">✦</text>
</svg>`
];

const CITIZEN_CHARS = [
// C0 — Il Dottore (Doctor)
`<svg viewBox="0 0 80 100" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="40" cy="20" rx="18" ry="11" fill="#3d2b0a"/>
  <ellipse cx="23" cy="40" rx="4" ry="5" fill="#eab080"/>
  <ellipse cx="57" cy="40" rx="4" ry="5" fill="#eab080"/>
  <ellipse cx="40" cy="40" rx="17" ry="19" fill="#f5c090"/>
  <circle cx="33" cy="37" r="5.5" fill="white"/>
  <circle cx="47" cy="37" r="5.5" fill="white"/>
  <circle cx="33" cy="37" r="3.2" fill="#2d7dd2"/>
  <circle cx="47" cy="37" r="3.2" fill="#2d7dd2"/>
  <circle cx="34" cy="36" r="1.3" fill="#000"/>
  <circle cx="48" cy="36" r="1.3" fill="#000"/>
  <circle cx="35.2" cy="35" r=".9" fill="white"/>
  <circle cx="49.2" cy="35" r=".9" fill="white"/>
  <path d="M33 50 Q40 56 47 50" stroke="#c07040" stroke-width="2" fill="none" stroke-linecap="round"/>
  <path d="M20 58 Q40 53 60 58 L64 100 L16 100Z" fill="#f5f5f5"/>
  <path d="M20 58 L34 54 L32 74Z" fill="#e8e8e8"/>
  <path d="M60 58 L46 54 L48 74Z" fill="#e8e8e8"/>
  <path d="M34 54 L40 56 L46 54 L44 74 L36 74Z" fill="#4da8d8"/>
  <rect x="35.5" y="77" width="9" height="2.5" rx="1.2" fill="#e63946"/>
  <rect x="38.5" y="74" width="2.5" height="8.5" rx="1.2" fill="#e63946"/>
  <path d="M26 60 Q22 67 26 73" stroke="#888" stroke-width="1.5" fill="none" stroke-linecap="round"/>
</svg>`,

// C1 — Il Poliziotto (Police officer)
`<svg viewBox="0 0 80 100" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="40" cy="21" rx="26" ry="5.5" fill="#162040"/>
  <path d="M16 21 Q16 5 40 3 Q64 5 64 21Z" fill="#1e3a6a"/>
  <polygon points="40,7 42.5,13 48,13 44,16 45.5,22 40,19 34.5,22 36,16 32,13 37.5,13" fill="#ffd700" opacity=".9"/>
  <ellipse cx="23" cy="44" rx="4" ry="5.5" fill="#c28860"/>
  <ellipse cx="57" cy="44" rx="4" ry="5.5" fill="#c28860"/>
  <ellipse cx="40" cy="44" rx="17" ry="19" fill="#d4a070"/>
  <circle cx="33" cy="41" r="5.5" fill="white"/>
  <circle cx="47" cy="41" r="5.5" fill="white"/>
  <circle cx="33" cy="41" r="3.2" fill="#3a2a18"/>
  <circle cx="47" cy="41" r="3.2" fill="#3a2a18"/>
  <circle cx="34" cy="40" r="1.3" fill="#000"/>
  <circle cx="48" cy="40" r="1.3" fill="#000"/>
  <circle cx="35.2" cy="39" r=".8" fill="white"/>
  <circle cx="49.2" cy="39" r=".8" fill="white"/>
  <path d="M34 54 Q40 57 46 54" stroke="#9a6840" stroke-width="2" fill="none" stroke-linecap="round"/>
  <path d="M20 62 Q40 57 60 62 L64 100 L16 100Z" fill="#1e3a6a"/>
  <polygon points="36,66 38.5,71 43,71 39.5,74 41,79 36,76.5 35,79 36,74 32,71 37,71" fill="#ffd700"/>
  <rect x="16" y="62" width="13" height="4" rx="2" fill="#ffd700" opacity=".55"/>
  <rect x="51" y="62" width="13" height="4" rx="2" fill="#ffd700" opacity=".55"/>
  <rect x="30" y="82" width="20" height="3" rx="1.5" fill="#0d1f3a"/>
</svg>`,

// C2 — L'Investigatore (Detective with magnifier)
`<svg viewBox="0 0 80 100" xmlns="http://www.w3.org/2000/svg">
  <rect x="17" y="9" width="46" height="15" rx="4" fill="#5c4830"/>
  <ellipse cx="40" cy="24" rx="27" ry="5.5" fill="#473828"/>
  <rect x="17" y="17" width="46" height="3.5" fill="#3d2e1c"/>
  <ellipse cx="23" cy="46" rx="4" ry="5.5" fill="#d8a870"/>
  <ellipse cx="57" cy="46" rx="4" ry="5.5" fill="#d8a870"/>
  <ellipse cx="40" cy="46" rx="17" ry="19" fill="#e8c498"/>
  <path d="M27 42 Q33 38 39 42" stroke="#444" stroke-width="1.8" fill="none" stroke-linecap="round"/>
  <path d="M41 42 Q47 38 53 42" stroke="#444" stroke-width="1.8" fill="none" stroke-linecap="round"/>
  <circle cx="33" cy="44" r="4.5" fill="white"/>
  <circle cx="47" cy="44" r="4.5" fill="white"/>
  <circle cx="33" cy="44" r="2.8" fill="#3d7a3d"/>
  <circle cx="47" cy="44" r="2.8" fill="#3d7a3d"/>
  <circle cx="33.8" cy="43.2" r="1.2" fill="#000"/>
  <circle cx="47.8" cy="43.2" r="1.2" fill="#000"/>
  <circle cx="35" cy="42.4" r=".7" fill="white"/>
  <circle cx="49" cy="42.4" r=".7" fill="white"/>
  <path d="M34 56 Q40 59 46 56" stroke="#9a7040" stroke-width="2" fill="none" stroke-linecap="round"/>
  <path d="M17 64 Q40 59 63 64 L67 100 L13 100Z" fill="#7a6040"/>
  <path d="M17 64 L32 60 L30 82Z" fill="#6a5030"/>
  <path d="M63 64 L48 60 L50 82Z" fill="#6a5030"/>
  <rect x="25" y="80" width="30" height="5" rx="2" fill="#5a4028"/>
  <rect x="37" y="79" width="6" height="7" rx="1.5" fill="#c8a040"/>
  <circle cx="63" cy="74" r="7.5" fill="none" stroke="#c8a040" stroke-width="2.2"/>
  <circle cx="63" cy="74" r="4.5" fill="rgba(180,220,255,.12)"/>
  <line x1="57.5" y1="79.5" x2="52" y2="85.5" stroke="#c8a040" stroke-width="2.5" stroke-linecap="round"/>
</svg>`,

// C3 — Il Guerriero (Warrior / Hero)
`<svg viewBox="0 0 80 100" xmlns="http://www.w3.org/2000/svg">
  <path d="M18 30 Q18 6 40 4 Q62 6 62 30 L60 38 Q40 43 20 38Z" fill="#3a3a5e"/>
  <path d="M20 38 Q40 43 60 38" stroke="#5a5a9a" stroke-width="2" fill="none"/>
  <ellipse cx="16" cy="28" rx="7" ry="9" fill="#3a3a5e"/>
  <ellipse cx="64" cy="28" rx="7" ry="9" fill="#3a3a5e"/>
  <polygon points="40,11 42.5,17 48.5,17 43.8,20.5 45.5,26.5 40,23 34.5,26.5 36.2,20.5 31.5,17 37.5,17" fill="#ffd700" opacity=".95"/>
  <ellipse cx="40" cy="49" rx="17" ry="17" fill="#c89868"/>
  <circle cx="33" cy="46" r="5.5" fill="white"/>
  <circle cx="47" cy="46" r="5.5" fill="white"/>
  <circle cx="33" cy="46" r="3.2" fill="#1a5c1a"/>
  <circle cx="47" cy="46" r="3.2" fill="#1a5c1a"/>
  <circle cx="34" cy="45" r="1.3" fill="#000"/>
  <circle cx="48" cy="45" r="1.3" fill="#000"/>
  <circle cx="35.2" cy="44" r=".8" fill="white"/>
  <circle cx="49.2" cy="44" r=".8" fill="white"/>
  <path d="M33 56 Q40 61 47 56" stroke="#9a7040" stroke-width="2" fill="none" stroke-linecap="round"/>
  <path d="M19 64 Q40 59 61 64 L63 100 L17 100Z" fill="#3a3a5e"/>
  <path d="M27 66 Q40 62 53 66 L53 87 Q40 91 27 87Z" fill="#4a4a7e"/>
  <line x1="29" y1="68" x2="35" y2="84" stroke="#5a5a9e" stroke-width="1.2" opacity=".5"/>
  <polygon points="40,69 43.5,76 40,83 36.5,76" fill="#ffd700" opacity=".85"/>
  <ellipse cx="19" cy="66" rx="7.5" ry="5" fill="#4a4a7e"/>
  <ellipse cx="61" cy="66" rx="7.5" ry="5" fill="#4a4a7e"/>
</svg>`
];

const ROLE_CHARS = {
"رئیس مافیا":`<svg viewBox="0 0 80 100" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="40" cy="24" rx="34" ry="7" fill="#0d0d0d"/>
  <rect x="16" y="8" width="48" height="18" rx="6" fill="#141414"/>
  <rect x="16" y="20" width="48" height="5" fill="#7a0000"/>
  <ellipse cx="40" cy="50" rx="19" ry="21" fill="#1e0808"/>
  <ellipse cx="33" cy="48" rx="3" ry="3" fill="#cc0000" class="eg"/>
  <ellipse cx="47" cy="48" rx="3" ry="3" fill="#cc0000" class="eg"/>
  <path d="M34 62 Q40 58 46 62" stroke="#6a0000" stroke-width="2" fill="none"/>
  <path d="M21 72 Q40 67 59 72 L63 100 L17 100Z" fill="#0d0d0d"/>
  <path d="M37 68 L43 68 L46 80 L40 98 L34 80Z" fill="#7a0000"/>
  <circle cx="57" cy="56" r="5" fill="#cc0000" opacity=".65"/>
  <path d="M57 51 L62 48" stroke="#aaa" stroke-width="1.5" stroke-linecap="round"/>
</svg>`,
"ناتو":`<svg viewBox="0 0 80 100" xmlns="http://www.w3.org/2000/svg">
  <path d="M12 26 Q12 8 40 6 Q68 8 68 26 Q55 32 40 32 Q25 32 12 26Z" fill="#2d4a1e"/>
  <ellipse cx="40" cy="27" rx="32" ry="6" fill="#3a5c28"/>
  <ellipse cx="57" cy="22" rx="6" ry="4" fill="#2d4a1e"/>
  <ellipse cx="22" cy="46" rx="4" ry="5" fill="#c28860"/>
  <ellipse cx="58" cy="46" rx="4" ry="5" fill="#c28860"/>
  <ellipse cx="40" cy="46" rx="17" ry="19" fill="#d4a070"/>
  <circle cx="33" cy="43" r="4" fill="#1a1a1a" opacity=".8"/>
  <circle cx="47" cy="43" r="4" fill="#1a1a1a" opacity=".8"/>
  <circle cx="33" cy="43" r="2.2" fill="#555" class="eg"/>
  <circle cx="47" cy="43" r="2.2" fill="#555" class="eg"/>
  <path d="M34 55 Q40 58 46 55" stroke="#9a6840" stroke-width="1.8" fill="none"/>
  <path d="M20 63 Q40 58 60 63 L64 100 L16 100Z" fill="#2d4a1e"/>
  <rect x="32" y="65" width="16" height="10" rx="2" fill="#1e3318"/>
  <rect x="17" y="63" width="10" height="3" rx="1.5" fill="#c8a040" opacity=".6"/>
  <rect x="53" y="63" width="10" height="3" rx="1.5" fill="#c8a040" opacity=".6"/>
  <line x1="26" y1="63" x2="26" y2="100" stroke="#1a3010" stroke-width="3"/>
  <line x1="54" y1="63" x2="54" y2="100" stroke="#1a3010" stroke-width="3"/>
</svg>`,
"شیاد":`<svg viewBox="0 0 80 100" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="40" cy="22" rx="18" ry="10" fill="#2c1810"/>
  <ellipse cx="40" cy="44" rx="17" ry="19" fill="#e8c090"/>
  <circle cx="33" cy="41" r="5" fill="white"/>
  <circle cx="47" cy="41" r="5" fill="white"/>
  <circle cx="33" cy="41" r="3" fill="#8b0000" class="eg"/>
  <circle cx="47" cy="41" r="3" fill="#8b0000" class="eg"/>
  <circle cx="34" cy="40" r="1.2" fill="#000"/>
  <circle cx="48" cy="40" r="1.2" fill="#000"/>
  <path d="M35 52 Q40 56 45 52" stroke="#c07040" stroke-width="2" fill="none"/>
  <path d="M30 33 Q33 29 36 33" stroke="#555" stroke-width="1.5" fill="none"/>
  <path d="M44 33 Q47 29 50 33" stroke="#555" stroke-width="1.5" fill="none"/>
  <path d="M20 62 Q40 57 60 62 L64 100 L16 100Z" fill="#1a0a0a"/>
  <rect x="55" y="54" width="16" height="22" rx="3" fill="white" stroke="#ccc" stroke-width="1"/>
  <text x="63" y="62" text-anchor="middle" font-size="7" fill="#cc0000">♠</text>
  <text x="63" y="72" text-anchor="middle" font-size="9" fill="#cc0000" font-weight="bold">A</text>
</svg>`,
"گروگان‌گیر":`<svg viewBox="0 0 80 100" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="40" cy="42" rx="20" ry="22" fill="#1a1a1a"/>
  <ellipse cx="40" cy="30" rx="18" ry="16" fill="#111"/>
  <ellipse cx="33" cy="39" rx="6" ry="5" fill="#0d0d0d"/>
  <ellipse cx="33" cy="39" rx="4" ry="3.5" fill="#cc3300" class="eg"/>
  <ellipse cx="33" cy="39" rx="2" ry="1.8" fill="#ff5500"/>
  <ellipse cx="47" cy="39" rx="6" ry="5" fill="#0d0d0d"/>
  <ellipse cx="47" cy="39" rx="4" ry="3.5" fill="#cc3300" class="eg"/>
  <ellipse cx="47" cy="39" rx="2" ry="1.8" fill="#ff5500"/>
  <ellipse cx="40" cy="53" rx="8" ry="6" fill="#1a1a1a"/>
  <ellipse cx="40" cy="53" rx="5" ry="4" fill="#0d0d0d"/>
  <path d="M20 63 Q40 58 60 63 L64 100 L16 100Z" fill="#0d0d0d"/>
  <path d="M14 72 Q18 68 22 72 Q26 76 30 72 Q34 68 38 72" stroke="#c8a040" stroke-width="2" fill="none" stroke-linecap="round"/>
  <line x1="40" y1="22" x2="38" y2="14" stroke="#111" stroke-width="4" stroke-linecap="round"/>
  <line x1="40" y1="22" x2="42" y2="14" stroke="#111" stroke-width="4" stroke-linecap="round"/>
</svg>`,
"هکر":`<svg viewBox="0 0 80 100" xmlns="http://www.w3.org/2000/svg">
  <path d="M12 28 Q12 4 40 2 Q68 4 68 28 L65 38 Q40 44 15 38Z" fill="#111"/>
  <ellipse cx="40" cy="46" rx="17" ry="19" fill="#0a1a0a"/>
  <ellipse cx="33" cy="44" rx="5" ry="4.5" fill="#001a00"/>
  <ellipse cx="33" cy="44" rx="3.5" ry="3" fill="#00cc44" class="eg"/>
  <ellipse cx="47" cy="44" rx="5" ry="4.5" fill="#001a00"/>
  <ellipse cx="47" cy="44" rx="3.5" ry="3" fill="#00cc44" class="eg"/>
  <rect x="26" y="40" width="12" height="9" rx="3" fill="none" stroke="#00cc44" stroke-width="1.2" opacity=".8"/>
  <rect x="42" y="40" width="12" height="9" rx="3" fill="none" stroke="#00cc44" stroke-width="1.2" opacity=".8"/>
  <line x1="38" y1="44" x2="42" y2="44" stroke="#00cc44" stroke-width="1" opacity=".6"/>
  <path d="M35 55 Q40 58 45 55" stroke="#004400" stroke-width="1.8" fill="none"/>
  <path d="M18 65 Q40 60 62 65 L64 100 L16 100Z" fill="#0d0d0d"/>
  <rect x="22" y="80" width="36" height="18" rx="3" fill="#1a1a1a"/>
  <rect x="24" y="82" width="32" height="13" rx="2" fill="#0d1a0d"/>
  <text x="40" y="91" text-anchor="middle" font-size="7" fill="#00cc44">&gt;_ </text>
  <rect x="18" y="97" width="44" height="3" rx="1.5" fill="#111"/>
</svg>`,
"یاغی":`<svg viewBox="0 0 80 100" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="40" cy="22" rx="16" ry="10" fill="#3a1a00"/>
  <path d="M24 22 Q24 8 40 6 Q56 8 56 22Z" fill="#4a2800"/>
  <ellipse cx="40" cy="43" rx="18" ry="20" fill="#d4956a"/>
  <path d="M22 50 Q40 44 58 50 L57 60 Q40 55 23 60Z" fill="#8b0000"/>
  <line x1="26" y1="52" x2="54" y2="52" stroke="#6a0000" stroke-width=".8"/>
  <circle cx="33" cy="43" r="5" fill="white"/>
  <circle cx="47" cy="43" r="5" fill="white"/>
  <circle cx="33" cy="43" r="3" fill="#3a1a00"/>
  <circle cx="47" cy="43" r="3" fill="#3a1a00"/>
  <circle cx="34" cy="42" r="1.2" fill="#000"/>
  <circle cx="48" cy="42" r="1.2" fill="#000"/>
  <path d="M36 38 L39 45" stroke="#8b4513" stroke-width="1.5" stroke-linecap="round" opacity=".7"/>
  <path d="M21 63 Q40 58 59 63 L63 100 L17 100Z" fill="#2a1400"/>
  <path d="M54 68 L62 60" stroke="#aaa" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M62 60 L65 57" stroke="#888" stroke-width="1.5" stroke-linecap="round"/>
</svg>`,
"مافیا ساده":`<svg viewBox="0 0 80 100" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="40" cy="42" rx="18" ry="20" fill="#1e0808"/>
  <circle cx="33" cy="39" r="5" fill="#220000"/>
  <circle cx="33" cy="39" r="3" fill="#cc0000" class="eg"/>
  <circle cx="47" cy="39" r="5" fill="#220000"/>
  <circle cx="47" cy="39" r="3" fill="#cc0000" class="eg"/>
  <path d="M34 52 Q40 56 46 52" stroke="#6a0000" stroke-width="2" fill="none"/>
  <path d="M20 62 Q40 57 60 62 L63 100 L17 100Z" fill="#111"/>
  <path d="M20 62 L32 58 L30 78Z" fill="#0a0a0a"/>
  <path d="M60 62 L48 58 L50 78Z" fill="#0a0a0a"/>
  <path d="M35 58 L40 60 L45 58 L43 78 L37 78Z" fill="#2a0000"/>
  <circle cx="40" cy="68" r="3" fill="#cc0000" opacity=".6"/>
</svg>`,
"شهروند ساده":`<svg viewBox="0 0 80 100" xmlns="http://www.w3.org/2000/svg">
  <path d="M23 30 Q25 18 40 16 Q55 18 57 30 Q50 20 40 20 Q30 20 23 30Z" fill="#3a2010"/>
  <ellipse cx="40" cy="41" rx="17" ry="19" fill="#f5c090"/>
  <ellipse cx="23" cy="43" rx="4" ry="5" fill="#eab080"/>
  <ellipse cx="57" cy="43" rx="4" ry="5" fill="#eab080"/>
  <circle cx="33" cy="38" r="4.5" fill="white"/>
  <circle cx="47" cy="38" r="4.5" fill="white"/>
  <circle cx="33" cy="38" r="2.5" fill="#5a3a1a"/>
  <circle cx="47" cy="38" r="2.5" fill="#5a3a1a"/>
  <circle cx="33.8" cy="37.2" r="1" fill="#000"/>
  <circle cx="47.8" cy="37.2" r="1" fill="#000"/>
  <path d="M34 51 Q40 55 46 51" stroke="#c07040" stroke-width="2" fill="none"/>
  <path d="M21 62 Q40 57 59 62 L63 100 L17 100Z" fill="#3a6aaa"/>
  <path d="M24 65 Q40 61 56 65" stroke="#2a5a9a" stroke-width="1" opacity=".5"/>
  <path d="M25 70 Q40 66 55 70" stroke="#2a5a9a" stroke-width="1" opacity=".5"/>
</svg>`,
"بازپرس":`<svg viewBox="0 0 80 100" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="40" cy="22" rx="16" ry="10" fill="#1a1a3a"/>
  <path d="M24 22 Q24 8 40 6 Q56 8 56 22Z" fill="#2a2a5a"/>
  <ellipse cx="40" cy="42" rx="17" ry="19" fill="#e8c498"/>
  <ellipse cx="23" cy="44" rx="4" ry="5" fill="#d8b488"/>
  <ellipse cx="57" cy="44" rx="4" ry="5" fill="#d8b488"/>
  <path d="M27 34 Q33 31 37 34" stroke="#333" stroke-width="1.8" fill="none"/>
  <path d="M43 34 Q47 31 53 34" stroke="#333" stroke-width="1.8" fill="none"/>
  <circle cx="33" cy="39" r="4.5" fill="white"/>
  <circle cx="47" cy="39" r="4.5" fill="white"/>
  <circle cx="33" cy="39" r="2.8" fill="#1a3a6a"/>
  <circle cx="47" cy="39" r="2.8" fill="#1a3a6a"/>
  <circle cx="33.8" cy="38.2" r="1.2" fill="#000"/>
  <circle cx="47.8" cy="38.2" r="1.2" fill="#000"/>
  <path d="M34 52 Q40 56 46 52" stroke="#9a7040" stroke-width="1.8" fill="none"/>
  <path d="M20 62 Q40 57 60 62 L64 100 L16 100Z" fill="#1a1a3a"/>
  <rect x="52" y="60" width="14" height="20" rx="2" fill="#f5f0e0"/>
  <rect x="52" y="60" width="4" height="20" rx="2" fill="#c0b090"/>
  <line x1="58" y1="65" x2="65" y2="65" stroke="#888" stroke-width="1"/>
  <line x1="58" y1="68" x2="65" y2="68" stroke="#888" stroke-width="1"/>
  <line x1="58" y1="71" x2="65" y2="71" stroke="#888" stroke-width="1"/>
  <line x1="67" y1="58" x2="64" y2="78" stroke="#3a3a8a" stroke-width="1.5" stroke-linecap="round"/>
</svg>`,
"کارآگاه":`<svg viewBox="0 0 80 100" xmlns="http://www.w3.org/2000/svg">
  <rect x="17" y="9" width="46" height="15" rx="4" fill="#5c4830"/>
  <ellipse cx="40" cy="24" rx="27" ry="5.5" fill="#473828"/>
  <ellipse cx="23" cy="46" rx="4" ry="5.5" fill="#d8a870"/>
  <ellipse cx="57" cy="46" rx="4" ry="5.5" fill="#d8a870"/>
  <ellipse cx="40" cy="46" rx="17" ry="19" fill="#e8c498"/>
  <path d="M27 42 Q33 38 39 42" stroke="#444" stroke-width="1.8" fill="none"/>
  <path d="M41 42 Q47 38 53 42" stroke="#444" stroke-width="1.8" fill="none"/>
  <circle cx="33" cy="44" r="4.5" fill="white"/>
  <circle cx="47" cy="44" r="4.5" fill="white"/>
  <circle cx="33" cy="44" r="2.8" fill="#3d7a3d"/>
  <circle cx="47" cy="44" r="2.8" fill="#3d7a3d"/>
  <circle cx="33.8" cy="43.2" r="1.2" fill="#000"/>
  <circle cx="47.8" cy="43.2" r="1.2" fill="#000"/>
  <path d="M34 56 Q40 59 46 56" stroke="#9a7040" stroke-width="2" fill="none"/>
  <path d="M17 64 Q40 59 63 64 L67 100 L13 100Z" fill="#7a6040"/>
  <circle cx="63" cy="74" r="7.5" fill="none" stroke="#c8a040" stroke-width="2.2"/>
  <circle cx="63" cy="74" r="4.5" fill="rgba(180,220,255,.12)"/>
  <line x1="57.5" y1="79.5" x2="52" y2="85.5" stroke="#c8a040" stroke-width="2.5" stroke-linecap="round"/>
</svg>`,
"هانتر":`<svg viewBox="0 0 80 100" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="40" cy="22" rx="16" ry="10" fill="#4a3010"/>
  <path d="M24 22 Q24 8 40 6 Q56 8 56 22Z" fill="#5a3c18"/>
  <ellipse cx="40" cy="43" rx="17" ry="19" fill="#d4a870"/>
  <ellipse cx="23" cy="44" rx="4" ry="5" fill="#c49860"/>
  <ellipse cx="57" cy="44" rx="4" ry="5" fill="#c49860"/>
  <circle cx="33" cy="40" r="4.5" fill="white"/>
  <circle cx="47" cy="40" r="4.5" fill="white"/>
  <circle cx="33" cy="40" r="2.8" fill="#2d6a2d"/>
  <circle cx="47" cy="40" r="2.8" fill="#2d6a2d"/>
  <circle cx="33.8" cy="39.2" r="1.2" fill="#000"/>
  <circle cx="47.8" cy="39.2" r="1.2" fill="#000"/>
  <path d="M33 52 Q40 56 47 52" stroke="#9a7040" stroke-width="2" fill="none"/>
  <path d="M20 62 Q40 57 60 62 L64 100 L16 100Z" fill="#3a5a28"/>
  <path d="M64 40 Q72 56 64 72" stroke="#8b6914" stroke-width="3" fill="none" stroke-linecap="round"/>
  <line x1="64" y1="40" x2="64" y2="72" stroke="#c8a040" stroke-width="1.2"/>
  <line x1="64" y1="56" x2="18" y2="56" stroke="#c8a040" stroke-width="1.5"/>
  <polygon points="18,56 24,53 24,59" fill="#c8a040"/>
  <line x1="60" y1="56" x2="64" y2="52" stroke="#8b0000" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="60" y1="56" x2="64" y2="60" stroke="#8b0000" stroke-width="1.5" stroke-linecap="round"/>
</svg>`,
"دکتر":`<svg viewBox="0 0 80 100" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="40" cy="20" rx="18" ry="11" fill="#3d2b0a"/>
  <ellipse cx="23" cy="40" rx="4" ry="5" fill="#eab080"/>
  <ellipse cx="57" cy="40" rx="4" ry="5" fill="#eab080"/>
  <ellipse cx="40" cy="40" rx="17" ry="19" fill="#f5c090"/>
  <circle cx="33" cy="37" r="5.5" fill="white"/>
  <circle cx="47" cy="37" r="5.5" fill="white"/>
  <circle cx="33" cy="37" r="3.2" fill="#2d7dd2"/>
  <circle cx="47" cy="37" r="3.2" fill="#2d7dd2"/>
  <circle cx="34" cy="36" r="1.3" fill="#000"/>
  <circle cx="48" cy="36" r="1.3" fill="#000"/>
  <circle cx="35.2" cy="35" r=".9" fill="white"/>
  <circle cx="49.2" cy="35" r=".9" fill="white"/>
  <path d="M33 50 Q40 56 47 50" stroke="#c07040" stroke-width="2" fill="none"/>
  <path d="M20 58 Q40 53 60 58 L64 100 L16 100Z" fill="#f5f5f5"/>
  <path d="M34 54 L40 56 L46 54 L44 74 L36 74Z" fill="#4da8d8"/>
  <rect x="35.5" y="77" width="9" height="2.5" rx="1.2" fill="#e63946"/>
  <rect x="38.5" y="74" width="2.5" height="8.5" rx="1.2" fill="#e63946"/>
  <path d="M26 60 Q22 67 26 73" stroke="#888" stroke-width="1.5" fill="none"/>
  <circle cx="26" cy="73" r="3" fill="none" stroke="#888" stroke-width="1.5"/>
</svg>`,
"رویین‌تن":`<svg viewBox="0 0 80 100" xmlns="http://www.w3.org/2000/svg">
  <path d="M18 30 Q18 6 40 4 Q62 6 62 30 L60 38 Q40 43 20 38Z" fill="#4a4a7e"/>
  <path d="M20 38 Q40 43 60 38" stroke="#7a7ac0" stroke-width="2" fill="none"/>
  <ellipse cx="16" cy="28" rx="7" ry="9" fill="#4a4a7e"/>
  <ellipse cx="64" cy="28" rx="7" ry="9" fill="#4a4a7e"/>
  <polygon points="40,11 42.5,17 48.5,17 43.8,20.5 45.5,26.5 40,23 34.5,26.5 36.2,20.5 31.5,17 37.5,17" fill="#ffd700"/>
  <ellipse cx="40" cy="49" rx="17" ry="17" fill="#c89868"/>
  <circle cx="33" cy="46" r="5.5" fill="white"/>
  <circle cx="47" cy="46" r="5.5" fill="white"/>
  <circle cx="33" cy="46" r="3.2" fill="#1a5c1a"/>
  <circle cx="47" cy="46" r="3.2" fill="#1a5c1a"/>
  <circle cx="34" cy="45" r="1.3" fill="#000"/>
  <circle cx="48" cy="45" r="1.3" fill="#000"/>
  <path d="M33 56 Q40 61 47 56" stroke="#9a7040" stroke-width="2" fill="none"/>
  <path d="M19 64 Q40 59 61 64 L63 100 L17 100Z" fill="#3a3a6a"/>
  <path d="M8 60 L8 80 Q8 92 18 92 L18 60Z" fill="#5a5a9a"/>
  <path d="M8 60 L18 60 L18 92 Q8 92 8 80Z" fill="#4a4a8a"/>
  <polygon points="13,68 15.5,75 13,82 10.5,75" fill="#ffd700" opacity=".85"/>
</svg>`,
"راهنما":`<svg viewBox="0 0 80 100" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="40" cy="24" rx="32" ry="7" fill="#6b4a1e"/>
  <rect x="16" y="10" width="48" height="17" rx="5" fill="#8b6228"/>
  <rect x="16" y="22" width="48" height="4" fill="#5a3818"/>
  <ellipse cx="40" cy="43" rx="17" ry="19" fill="#e8c498"/>
  <ellipse cx="23" cy="44" rx="4" ry="5" fill="#d8b488"/>
  <ellipse cx="57" cy="44" rx="4" ry="5" fill="#d8b488"/>
  <circle cx="33" cy="40" r="4.5" fill="white"/>
  <circle cx="47" cy="40" r="4.5" fill="white"/>
  <circle cx="33" cy="40" r="2.8" fill="#5a3a1a"/>
  <circle cx="47" cy="40" r="2.8" fill="#5a3a1a"/>
  <circle cx="33.8" cy="39.2" r="1.2" fill="#000"/>
  <circle cx="47.8" cy="39.2" r="1.2" fill="#000"/>
  <path d="M34 52 Q40 55 46 52" stroke="#9a7040" stroke-width="2" fill="none"/>
  <path d="M20 62 Q40 57 60 62 L64 100 L16 100Z" fill="#5a7a3a"/>
  <circle cx="58" cy="72" r="9" fill="#f5f0e0" stroke="#c8a040" stroke-width="1.5"/>
  <circle cx="58" cy="72" r="6" fill="none" stroke="#888" stroke-width=".8"/>
  <polygon points="58,65 59.5,72 58,79 56.5,72" fill="#e63946" opacity=".85"/>
  <polygon points="51,72 58,70.5 65,72 58,73.5" fill="#333"/>
  <circle cx="58" cy="72" r="1.5" fill="#222"/>
</svg>`,
"مین‌گذار":`<svg viewBox="0 0 80 100" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="40" cy="30" rx="24" ry="20" fill="#2a3a2a"/>
  <rect x="18" y="36" width="44" height="10" rx="2" fill="#1a2a1a"/>
  <rect x="22" y="32" width="36" height="18" rx="4" fill="#c8e840" opacity=".3"/>
  <rect x="22" y="32" width="36" height="18" rx="4" fill="none" stroke="#8ab800" stroke-width="1.5"/>
  <ellipse cx="40" cy="52" rx="17" ry="18" fill="#c49868"/>
  <ellipse cx="23" cy="53" rx="4" ry="5" fill="#b48858"/>
  <ellipse cx="57" cy="53" rx="4" ry="5" fill="#b48858"/>
  <circle cx="33" cy="49" r="4" fill="white" opacity=".8"/>
  <circle cx="47" cy="49" r="4" fill="white" opacity=".8"/>
  <circle cx="33" cy="49" r="2.5" fill="#1a5a1a"/>
  <circle cx="47" cy="49" r="2.5" fill="#1a5a1a"/>
  <path d="M33 60 Q40 64 47 60" stroke="#9a7040" stroke-width="1.8" fill="none"/>
  <path d="M20 70 Q40 65 60 70 L63 100 L17 100Z" fill="#2a3a2a"/>
  <circle cx="18" cy="80" r="8" fill="#333"/>
  <line x1="18" y1="72" x2="18" y2="70" stroke="#c8a040" stroke-width="2" stroke-linecap="round"/>
  <text x="18" y="83" text-anchor="middle" font-size="8" fill="#e63946" font-weight="bold">!</text>
  <line x1="12" y1="78" x2="24" y2="78" stroke="#e63946" stroke-width="1" opacity=".6"/>
</svg>`,
"وکیل":`<svg viewBox="0 0 80 100" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="40" cy="20" rx="14" ry="9" fill="#2a2a2a"/>
  <path d="M26 20 Q26 7 40 5 Q54 7 54 20Z" fill="#1a1a1a"/>
  <ellipse cx="40" cy="43" rx="17" ry="19" fill="#e8c090"/>
  <ellipse cx="23" cy="44" rx="4" ry="5" fill="#d8b080"/>
  <ellipse cx="57" cy="44" rx="4" ry="5" fill="#d8b080"/>
  <circle cx="33" cy="40" r="4.5" fill="white"/>
  <circle cx="47" cy="40" r="4.5" fill="white"/>
  <circle cx="33" cy="40" r="2.8" fill="#2a2a5a"/>
  <circle cx="47" cy="40" r="2.8" fill="#2a2a5a"/>
  <circle cx="33.8" cy="39.2" r="1.2" fill="#000"/>
  <circle cx="47.8" cy="39.2" r="1.2" fill="#000"/>
  <path d="M34 52 Q40 55 46 52" stroke="#c07040" stroke-width="2" fill="none"/>
  <path d="M20 62 Q40 57 60 62 L64 100 L16 100Z" fill="#1a1a1a"/>
  <line x1="58" y1="58" x2="58" y2="82" stroke="#c8a040" stroke-width="1.5"/>
  <line x1="50" y1="62" x2="66" y2="62" stroke="#c8a040" stroke-width="1.5"/>
  <line x1="50" y1="62" x2="53" y2="72" stroke="#c8a040" stroke-width="1"/>
  <line x1="66" y1="62" x2="63" y2="72" stroke="#c8a040" stroke-width="1"/>
  <ellipse cx="53" cy="72" rx="4" ry="2" fill="#c8a040" opacity=".7"/>
  <ellipse cx="63" cy="72" rx="4" ry="2" fill="#c8a040" opacity=".7"/>
  <line x1="54" y1="80" x2="62" y2="80" stroke="#c8a040" stroke-width="2.5" stroke-linecap="round"/>
</svg>`,
"محافظ":`<svg viewBox="0 0 80 100" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="40" cy="22" rx="15" ry="10" fill="#1a1a1a"/>
  <path d="M25 22 Q25 8 40 6 Q55 8 55 22Z" fill="#111"/>
  <ellipse cx="40" cy="44" rx="17" ry="19" fill="#c89060"/>
  <ellipse cx="23" cy="45" rx="4" ry="5" fill="#b88050"/>
  <ellipse cx="57" cy="45" rx="4" ry="5" fill="#b88050"/>
  <rect x="25" y="39" width="13" height="9" rx="4" fill="#111"/>
  <rect x="42" y="39" width="13" height="9" rx="4" fill="#111"/>
  <line x1="38" y1="43" x2="42" y2="43" stroke="#333" stroke-width="1.5"/>
  <line x1="22" y1="43" x2="25" y2="43" stroke="#333" stroke-width="1"/>
  <line x1="55" y1="43" x2="58" y2="43" stroke="#333" stroke-width="1"/>
  <circle cx="23" cy="49" r="2.5" fill="#1a1a1a"/>
  <path d="M23 51 Q21 56 23 60" stroke="#aaa" stroke-width="1" fill="none"/>
  <path d="M34 54 Q40 57 46 54" stroke="#9a7040" stroke-width="2" fill="none"/>
  <path d="M18 64 Q40 59 62 64 L65 100 L15 100Z" fill="#111"/>
  <path d="M38 64 L42 64 L41 82 L40 87 L39 82Z" fill="#8b0000"/>
  <rect x="27" y="64" width="11" height="3" rx="1.5" fill="#333"/>
  <rect x="42" y="64" width="11" height="3" rx="1.5" fill="#333"/>
</svg>`,
"تفنگدار":`<svg viewBox="0 0 80 100" xmlns="http://www.w3.org/2000/svg">
  <path d="M16 28 Q16 6 40 4 Q64 6 64 28 L62 36 Q40 42 18 36Z" fill="#3a4a28"/>
  <ellipse cx="40" cy="47" rx="17" ry="18" fill="#d4a070"/>
  <ellipse cx="23" cy="48" rx="4" ry="5" fill="#c49060"/>
  <ellipse cx="57" cy="48" rx="4" ry="5" fill="#c49060"/>
  <circle cx="33" cy="44" r="4.5" fill="white"/>
  <circle cx="47" cy="44" r="4.5" fill="white"/>
  <circle cx="33" cy="44" r="2.8" fill="#3a2a18"/>
  <circle cx="47" cy="44" r="2.8" fill="#3a2a18"/>
  <circle cx="33.8" cy="43.2" r="1.2" fill="#000"/>
  <circle cx="47.8" cy="43.2" r="1.2" fill="#000"/>
  <path d="M34 56 Q40 59 46 56" stroke="#9a6840" stroke-width="2" fill="none"/>
  <path d="M20 64 Q40 59 60 64 L64 100 L16 100Z" fill="#3a4a28"/>
  <rect x="4" y="68" width="54" height="5" rx="2" fill="#4a3018"/>
  <rect x="4" y="69" width="36" height="3" rx="1.5" fill="#3a2010"/>
  <rect x="30" y="65" width="9" height="10" rx="1.5" fill="#2a1808"/>
  <rect x="40" y="66" width="18" height="7" rx="1" fill="#555" opacity=".5"/>
</svg>`,
"نگهبان":`<svg viewBox="0 0 80 100" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="40" cy="22" rx="20" ry="8" fill="#1e3040"/>
  <path d="M20 22 Q20 6 40 4 Q60 6 60 22Z" fill="#2a4060"/>
  <polygon points="40,7 42,13 47,13 43.5,16 45,22 40,19 35,22 36.5,16 33,13 38,13" fill="#ffd700" opacity=".8"/>
  <ellipse cx="40" cy="44" rx="17" ry="19" fill="#d4a870"/>
  <ellipse cx="23" cy="45" rx="4" ry="5" fill="#c49860"/>
  <ellipse cx="57" cy="45" rx="4" ry="5" fill="#c49860"/>
  <circle cx="33" cy="41" r="4.5" fill="white"/>
  <circle cx="47" cy="41" r="4.5" fill="white"/>
  <circle cx="33" cy="41" r="2.8" fill="#2a3a5a"/>
  <circle cx="47" cy="41" r="2.8" fill="#2a3a5a"/>
  <circle cx="33.8" cy="40.2" r="1.2" fill="#000"/>
  <circle cx="47.8" cy="40.2" r="1.2" fill="#000"/>
  <path d="M33 53 Q40 57 47 53" stroke="#9a6840" stroke-width="2" fill="none"/>
  <path d="M20 63 Q40 58 60 63 L64 100 L16 100Z" fill="#2a4060"/>
  <rect x="58" y="57" width="14" height="20" rx="4" fill="#c8a040" opacity=".25"/>
  <rect x="60" y="59" width="10" height="16" rx="3" fill="#ffd700" opacity=".2"/>
  <rect x="59" y="56" width="12" height="3" rx="1.5" fill="#888"/>
  <rect x="59" y="76" width="12" height="3" rx="1.5" fill="#888"/>
  <line x1="65" y1="53" x2="65" y2="56" stroke="#888" stroke-width="2" stroke-linecap="round"/>
  <ellipse cx="65" cy="67" rx="10" ry="8" fill="#ffd700" opacity=".07"/>
</svg>`,
"تک‌تیرانداز":`<svg viewBox="0 0 80 100" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="40" cy="42" rx="19" ry="20" fill="#1a2a1a"/>
  <path d="M22 36 Q40 30 58 36" stroke="#2a3a2a" stroke-width="8" fill="none" stroke-linecap="round"/>
  <ellipse cx="30" cy="28" rx="8" ry="5" fill="#2a4a1a" opacity=".7"/>
  <ellipse cx="50" cy="28" rx="8" ry="5" fill="#2a4a1a" opacity=".7"/>
  <ellipse cx="40" cy="24" rx="10" ry="6" fill="#3a5a28" opacity=".6"/>
  <ellipse cx="33" cy="40" rx="6" ry="4" fill="#001a00"/>
  <ellipse cx="33" cy="40" rx="4" ry="2.5" fill="#00aa44" class="eg" opacity=".9"/>
  <ellipse cx="47" cy="40" rx="6" ry="4" fill="#001a00"/>
  <ellipse cx="47" cy="40" rx="4" ry="2.5" fill="#00aa44" class="eg" opacity=".9"/>
  <path d="M33 52 Q40 56 47 52" stroke="#2a4a1a" stroke-width="1.8" fill="none"/>
  <path d="M20 62 Q40 57 60 62 L63 100 L17 100Z" fill="#1a2a1a"/>
  <rect x="3" y="70" width="60" height="4" rx="2" fill="#2a1a0a"/>
  <rect x="3" y="71" width="38" height="2" rx="1" fill="#1a0a00"/>
  <rect x="30" y="68" width="10" height="8" rx="1.5" fill="#1a0a00"/>
  <rect x="20" y="66" width="22" height="5" rx="2.5" fill="#333"/>
  <circle cx="20" cy="68.5" r="3.5" fill="none" stroke="#555" stroke-width="1"/>
  <line x1="20" y1="66" x2="20" y2="71" stroke="#444" stroke-width=".8"/>
  <line x1="17" y1="68.5" x2="23" y2="68.5" stroke="#444" stroke-width=".8"/>
  <circle cx="3" cy="72" r="1.5" fill="#e63946" class="eg"/>
</svg>`,
"سرباز":`<svg viewBox="0 0 80 100" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="40" cy="42" rx="19" ry="20" fill="#2a3a20"/>
  <path d="M20 34 Q40 18 60 34" fill="#3a4a28" stroke="#2a3a18" stroke-width="1"/>
  <rect x="22" y="30" width="36" height="6" rx="1" fill="#3a4a28"/>
  <rect x="30" y="26" width="20" height="4" rx="1" fill="#4a5a38"/>
  <ellipse cx="33" cy="42" rx="5" ry="3.5" fill="#0a1a00"/>
  <ellipse cx="33" cy="42" rx="3.5" ry="2.2" fill="#33aa55" class="eg" opacity=".9"/>
  <ellipse cx="47" cy="42" rx="5" ry="3.5" fill="#0a1a00"/>
  <ellipse cx="47" cy="42" rx="3.5" ry="2.2" fill="#33aa55" class="eg" opacity=".9"/>
  <path d="M35 52 Q40 55 45 52" stroke="#3a4a28" stroke-width="1.5" fill="none"/>
  <path d="M20 62 Q40 57 60 62 L62 100 L18 100Z" fill="#2a3a20"/>
  <rect x="36" y="64" width="8" height="12" rx="1" fill="#4a5a38"/>
  <rect x="37" y="66" width="6" height="3" rx=".5" fill="#2a3a18"/>
  <path d="M28 70 L24 80 L20 78" stroke="#4a5a38" stroke-width="3" fill="none" stroke-linecap="round"/>
  <circle cx="40" cy="28" r="2" fill="#c0a030" opacity=".7"/>
</svg>`
};

ROLE_CHARS["تکاور"] = ROLE_CHARS["تک‌تیرانداز"];

function getCharSVG(roleName, role, variant) {
  if(ROLE_CHARS[roleName]) return ROLE_CHARS[roleName];
  const arr = role === "mafia" ? MAFIA_CHARS : CITIZEN_CHARS;
  return arr[variant % arr.length];
}
