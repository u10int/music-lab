function decayPath(f: number, k: number, x0 = 4, x1 = 116, mid = 20, amp = 15) { let p = ""; for (let x = x0; x <= x1; x += 1) { const t = x - x0; p += (x === x0 ? "M" : " L") + x + " " + (mid - amp * Math.exp(-t / k) * Math.sin(t / f)).toFixed(1); } return p; }
function sinePath(x0: number, x1: number, mid: number, amp: number, cycles: number) { let p = ""; for (let x = x0; x <= x1; x++) { p += (x === x0 ? "M" : " L") + x + " " + (mid - amp * Math.sin((x - x0) / (x1 - x0) * cycles * 2 * Math.PI)).toFixed(1); } return p; }
/** SVG markup (viewBox 0 0 120 40) sketching each instrument. Static, generated here. */
export const VIZ: Record<string, () => string> = {
  drift: () => `<path class="z1" d="M4 32 L32 8 L32 32 L60 8 L60 32 L88 8 L88 32 L116 8"/>`,
  wavetable: () => `<path class="z2" d="${sinePath(4, 36, 20, 12, 1)}"/><path class="z1" d="M44 20 L52 8 L68 32 L76 20"/><path class="z1" d="M84 20 V8 H100 V32 H116 V20"/>`,
  meld: () => `<path class="z2" d="${sinePath(4, 116, 20, 13, 3)}"/><path class="z1" d="M4 20 L14 9 L22 27 L30 12 L44 30 L52 14 L64 26 L74 8 L84 29 L96 13 L106 24 L116 18"/>`,
  operator: () => [6, 34, 62, 90].map((x, i) => `<rect class="z1" x="${x}" y="13" width="22" height="14" rx="3"/>${i < 3 ? `<path class="z2" d="M${x + 22} 20 H${x + 28}"/>` : ""}`).join(""),
  analog: () => `<path class="z1" d="M4 20 V10 Q4 8 6 8 H28 Q30 8 30 10 V30 Q30 32 32 32 H56 Q58 32 58 30 V10 Q58 8 60 8 H84 Q86 8 86 10 V30 Q86 32 88 32 H112 Q114 32 114 30 V20"/>`,
  tension: () => `<path class="z2" d="M4 20 H116"/><path class="z1" d="M4 20 Q40 6 46 8 Q52 10 116 20"/><circle class="z1" cx="4" cy="20" r="2"/><circle class="z1" cx="116" cy="20" r="2"/>`,
  collision: () => `<path class="z1" d="${decayPath(2.2, 30)}"/>`,
  electric: () => `<path class="z2" d="${decayPath(1.3, 60, 4, 116, 20, 6)}"/><path class="z1" d="${decayPath(4.5, 70)}"/>`,
  simpler: () => `${Array.from({ length: 28 }, (_, i) => { const x = 8 + i * 4, h = 3 + 12 * Math.exp(-((i % 9)) / 3) * (0.6 + 0.4 * Math.abs(Math.sin(i * 7.1))); return `<path class="z2" d="M${x} ${20 - h} V${20 + h}"/>`; }).join("")}<path class="z1" d="M22 4 V36 M94 4 V36"/>`,
  sampler: () => `${Array.from({ length: 14 }, (_, i) => `<rect class="z2" x="${4 + i * 8}" y="18" width="7" height="18" rx="1"/>`).join("")}<path class="z1" d="M4 10 H38 M44 10 H78 M84 10 H115"/><path class="z1" d="M4 7 V13 M38 7 V13 M44 7 V13 M78 7 V13 M84 7 V13 M115 7 V13"/>`,
  drumrack: () => Array.from({ length: 8 }, (_, i) => `<rect class="${[0, 2, 5].includes(i) ? "zf" : "z1"}" x="${8 + (i % 4) * 27}" y="${i < 4 ? 4 : 22}" width="22" height="14" rx="3"/>`).join(""),
  drumsampler: () => { let p = "M4 20 L14 20"; for (let x = 14; x <= 116; x++) { const e = Math.exp(-(x - 14) / 14) * 16; p += ` L${x} ${(20 + (x % 2 ? e : -e) * (0.55 + 0.45 * Math.abs(Math.sin(x * 3.7)))).toFixed(1)}`; } return `<path class="z1" d="${p}"/>`; },
  impulse: () => Array.from({ length: 8 }, (_, i) => `<rect class="${i === 0 ? "zf" : "z1"}" x="${5 + i * 14}" y="12" width="11" height="16" rx="2"/>`).join(""),
  granulator: () => Array.from({ length: 26 }, (_, i) => { const x = 6 + ((i * 37) % 108), y = 8 + ((i * 53) % 25), r = 1 + ((i * 7) % 4) * 0.8; return `<circle class="${i % 3 ? "zd2" : "zd1"}" cx="${x}" cy="${y}" r="${r.toFixed(1)}"/>`; }).join(""),
  rack: () => [8, 18, 28].map(y => `<path class="z1" d="M4 ${y} H84"/><circle class="zf" cx="${30 + (y * 3) % 40}" cy="${y}" r="3"/>`).join("") + Array.from({ length: 8 }, (_, i) => `<circle class="z1" cx="${94 + (i % 4) * 7}" cy="${i < 4 ? 13 : 25}" r="2.5"/>`).join("")
};
