import type { ModelInfo } from '../hooks/useMeta'

export function pickGreenestModel(models: ModelInfo[]): ModelInfo | null {
  if (!models.length) return null
  let best = models[0]
  for (const m of models) {
    if (Number(m.powerFactor) < Number(best.powerFactor)) best = m
  }
  return best
}

export function pickGreenestRegion(intensitiesGPerKwh: Record<string, number>, fallback = 'europe-north1'): string {
  const entries = Object.entries(intensitiesGPerKwh)
  if (!entries.length) return fallback
  let best = entries[0]
  for (const e of entries) {
    if (e[1] < best[1]) best = e
  }
  return best[0]
}
