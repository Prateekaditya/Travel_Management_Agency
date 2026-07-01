import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Route } from '../types'
import { DEFAULT_TOUR_ID } from '../constants'

function parseRouteFromLocation(): Route {
  const params = new URLSearchParams(window.location.search)
  const view = params.get('view') || 'all'
  const tourId = params.get('tourId') || ''
  if (tourId) return { view: 'details', tourId }
  return {
    view: (['all', 'my', 'login', 'signup', 'forgot-password', 'agent', 'admin', 'feedback', 'profile'] as const).includes(view as 'all' | 'my' | 'login' | 'signup' | 'forgot-password' | 'agent' | 'admin' | 'feedback' | 'profile')
      ? (view as Route['view'])
      : 'all',
    tourId: '',
  }
}

function buildRouteQuery(route: Route): string {
  const params = new URLSearchParams()
  if (['all', 'my', 'login', 'signup', 'forgot-password', 'agent', 'admin', 'feedback', 'profile'].includes(route.view) && route.view !== 'all') params.set('view', route.view)
  if (route.view === 'details' && route.tourId) params.set('tourId', route.tourId)
  const query = params.toString()
  return query ? `?${query}` : window.location.pathname
}

interface RouterContextValue {
  route: Route
  setRoute: (route: Route) => void
}

const RouterContext = createContext<RouterContextValue | null>(null)

export function RouterProvider({ children }: { children: ReactNode }) {
  const [route, setRouteState] = useState<Route>(() => {
    return parseRouteFromLocation()
  })

  useEffect(() => {
    function handlePopState() {
      setRouteState(parseRouteFromLocation())
      window.scrollTo(0, 0)
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  function setRoute(nextRoute: Route) {
    setRouteState(nextRoute)
    window.history.pushState({}, '', buildRouteQuery(nextRoute))
    window.scrollTo(0, 0)
  }

  return (
    <RouterContext.Provider value={{ route, setRoute }}>
      {children}
    </RouterContext.Provider>
  )
}

export function useRouter(): RouterContextValue {
  const ctx = useContext(RouterContext)
  if (!ctx) throw new Error('useRouter must be used inside RouterProvider')
  return ctx
}
