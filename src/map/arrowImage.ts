/** RGBA pixels for a right-pointing chevron, used as the route's direction arrow. No canvas needed. */
export function makeArrowImage(size: number, rgb: [number, number, number]) {
  const data = new Uint8Array(size * size * 4);
  // Chevron: two strokes from (0.3, 0.2) to (0.7, 0.5) and back to (0.3, 0.8), in unit coordinates.
  const segments: [number, number, number, number][] = [
    [0.3, 0.2, 0.7, 0.5],
    [0.7, 0.5, 0.3, 0.8],
  ];
  const half = 0.09; // half stroke width
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = (x + 0.5) / size;
      const py = (y + 0.5) / size;
      const d = Math.min(...segments.map(([x1, y1, x2, y2]) => distToSegment(px, py, x1, y1, x2, y2)));
      // One-pixel soft edge for anti-aliasing.
      const alpha = Math.max(0, Math.min(1, (half - d) * size + 0.5));
      if (alpha <= 0) continue;
      const i = (y * size + x) * 4;
      data[i] = rgb[0];
      data[i + 1] = rgb[1];
      data[i + 2] = rgb[2];
      data[i + 3] = Math.round(alpha * 255);
    }
  }
  return { width: size, height: size, data };
}

function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

/** "#081e3f" -> [8, 30, 63] */
export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "").trim();
  const full = h.length === 3 ? [...h].map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
