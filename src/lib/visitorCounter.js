import { cloudEnabled, getSupabase } from './supabase'

const SESSION_KEY = 'portfolio-visit-counted-v1'
const LOCAL_COUNT_KEY = 'portfolio-local-visit-count-v1'

function localVisitCount() {
  const previous = Number(window.localStorage.getItem(LOCAL_COUNT_KEY) || 0)
  const counted = window.sessionStorage.getItem(SESSION_KEY) === 'true'
  const next = counted ? Math.max(1, previous) : previous + 1
  window.localStorage.setItem(LOCAL_COUNT_KEY, String(next))
  window.sessionStorage.setItem(SESSION_KEY, 'true')
  return next
}

export async function recordSiteVisit() {
  const cached = Number(window.sessionStorage.getItem(`${SESSION_KEY}-total`) || 0)
  if (cached > 0) return cached

  if (cloudEnabled) {
    const { data, error } = await getSupabase().rpc('increment_site_visit')
    if (!error && data !== null && Number.isFinite(Number(data))) {
      const total = Number(data)
      window.sessionStorage.setItem(SESSION_KEY, 'true')
      window.sessionStorage.setItem(`${SESSION_KEY}-total`, String(total))
      return total
    }
  }

  return localVisitCount()
}
