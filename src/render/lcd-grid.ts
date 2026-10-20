/** Align texture centres and padding as well as dots, including odd-sized fry. */
export function lcdTextureBounds(length: number, cell: number): { pad: number; width: number; height: number } {
  const pair = cell * 2
  const pad = Math.ceil(18 / cell) * cell
  return {
    pad,
    width: Math.ceil((length + pad * 2) / pair) * pair,
    height: Math.ceil((Math.max(length * 1.65, 76) + pad * 2) / pair) * pair,
  }
}
