/** Points awarded to the FFF winner scaled by how fast they answered. */
export function calcFFScore(timeLimitSeconds: number, responseMs: number): number {
  const MAX = 1000
  const MIN = 100
  const ratio = Math.max(0, 1 - responseMs / (timeLimitSeconds * 1000))
  return Math.round(MIN + (MAX - MIN) * ratio)
}

/** Points for T&R — linear decay over the question's time window. */
export function calcTRScore(timeLimitSeconds: number, responseMs: number): number {
  const MAX = 1000
  const MIN = 50
  const ratio = Math.max(0, 1 - responseMs / (timeLimitSeconds * 1000))
  return Math.round(MIN + (MAX - MIN) * ratio)
}
