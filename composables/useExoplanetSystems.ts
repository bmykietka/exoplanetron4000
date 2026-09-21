import type { SystemDetail, SystemPosition, SystemSummary } from '~~/shared/types/exoplanet'

/**
 * Loads (and caches for the app's lifetime) the full list of known host
 * star systems, for use in the search/autocomplete UI.
 */
export function useSystemList() {
  const systems = useState<SystemSummary[]>('exoplanet-system-list', () => [])
  const pending = useState<boolean>('exoplanet-system-list-pending', () => false)
  const error = useState<string | null>('exoplanet-system-list-error', () => null)

  async function ensureLoaded() {
    if (systems.value.length > 0 || pending.value) return
    pending.value = true
    error.value = null
    try {
      systems.value = await $fetch<SystemSummary[]>('/api/systems/list')
    } catch (err: any) {
      error.value = err?.data?.statusMessage || err?.message || 'Failed to load system list'
    } finally {
      pending.value = false
    }
  }

  return { systems, pending, error, ensureLoaded }
}

/**
 * Loads full details (star + planets + habitable zone) for a single system,
 * caching per-hostname so switching back and forth is instant.
 */
export function useSystemDetail(hostname: Ref<string | null>) {
  const cache = useState<Record<string, SystemDetail>>('exoplanet-system-detail-cache', () => ({}))
  const detail = ref<SystemDetail | null>(null)
  const pending = ref(false)
  const error = ref<string | null>(null)

  async function load(name: string) {
    if (cache.value[name]) {
      detail.value = cache.value[name]
      return
    }
    pending.value = true
    error.value = null
    detail.value = null
    try {
      const data = await $fetch<SystemDetail>(`/api/systems/${encodeURIComponent(name)}`)
      cache.value[name] = data
      detail.value = data
    } catch (err: any) {
      error.value = err?.data?.statusMessage || err?.message || `Failed to load system "${name}"`
    } finally {
      pending.value = false
    }
  }

  watch(
    hostname,
    (name) => {
      if (name) load(name)
      else detail.value = null
    },
    { immediate: true }
  )

  return { detail, pending, error }
}

/**
 * Loads (and caches for the app's lifetime) every known host star's sky
 * position and distance, for the galaxy map view.
 */
export function useSystemPositions() {
  const positions = useState<SystemPosition[]>('exoplanet-system-positions', () => [])
  const pending = useState<boolean>('exoplanet-system-positions-pending', () => false)
  const error = useState<string | null>('exoplanet-system-positions-error', () => null)

  async function ensureLoaded() {
    if (positions.value.length > 0 || pending.value) return
    pending.value = true
    error.value = null
    try {
      positions.value = await $fetch<SystemPosition[]>('/api/systems/positions')
    } catch (err: any) {
      error.value = err?.data?.statusMessage || err?.message || 'Failed to load system positions'
    } finally {
      pending.value = false
    }
  }

  return { positions, pending, error, ensureLoaded }
}
