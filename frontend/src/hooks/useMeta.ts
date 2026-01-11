import { useEffect, useMemo, useState } from 'react'
import { api } from '../api'

export type ModelInfo = {
  id: string
  powerFactor: string
  provider: string
}

export type RegionsResponse = {
  regions: string[]
  intensitiesGPerKwh: Record<string, string>
}

type MetaState = {
  models: ModelInfo[]
  regions: string[]
  intensitiesGPerKwh: Record<string, number>
  loading: boolean
  error: string | null
}

export function useMeta(): MetaState {
  const [models, setModels] = useState<ModelInfo[]>([])
  const [regionsResp, setRegionsResp] = useState<RegionsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        const [m, r] = await Promise.all([api.get<ModelInfo[]>('/meta/models'), api.get<RegionsResponse>('/meta/regions')])
        if (!active) return
        setModels(m.data)
        setRegionsResp(r.data)
      } catch (e: any) {
        if (!active) return
        setError(e?.response?.data?.message ?? 'Failed to load metadata')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  const intensitiesGPerKwh = useMemo(() => {
    const obj: Record<string, number> = {}
    for (const [k, v] of Object.entries(regionsResp?.intensitiesGPerKwh ?? {})) {
      obj[k] = Number(v)
    }
    return obj
  }, [regionsResp])

  return {
    models,
    regions: regionsResp?.regions ?? [],
    intensitiesGPerKwh,
    loading,
    error
  }
}
