/** Pointy-top odd-r offset layout (col, row). `size` is center-to-vertex distance (circumradius). */

export function hexCenterPx(col: number, row: number, size: number): { x: number; y: number } {
  const x = size * Math.sqrt(3) * (col + 0.5 * (row & 1))
  const y = size * (3 / 2) * row
  return { x, y }
}

export function hexPolygonPoints(cx: number, cy: number, size: number): string {
  const parts: string[] = []
  for (let i = 0; i < 6; i += 1) {
    const angleDeg = -90 + 60 * i
    const rad = (angleDeg * Math.PI) / 180
    const x = cx + size * Math.cos(rad)
    const y = cy + size * Math.sin(rad)
    parts.push(`${x},${y}`)
  }
  return parts.join(' ')
}

export function hexLayoutBounds(
  cols: number,
  rows: number,
  size: number,
  pad: number,
): { minX: number; minY: number; width: number; height: number } {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const { x, y } = hexCenterPx(col, row, size)
      minX = Math.min(minX, x - size)
      maxX = Math.max(maxX, x + size)
      minY = Math.min(minY, y - size)
      maxY = Math.max(maxY, y + size)
    }
  }
  return {
    minX: minX - pad,
    minY: minY - pad,
    width: maxX - minX + 2 * pad,
    height: maxY - minY + 2 * pad,
  }
}
