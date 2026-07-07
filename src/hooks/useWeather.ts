import { useEffect, useState } from 'react'
import { useEtherMailStore } from '../store/useStore'
import { loadWeather, type WeatherSnapshot } from '../lib/weather'

export function useWeather() {
  const weatherSettings = useEtherMailStore((s) => s.weatherSettings)
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    // Loading/error flags must flip as soon as a new fetch starts (matches the
    // data-fetching pattern at https://react.dev/reference/react/useEffect#fetching-data-with-effects).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    setError(false)

    loadWeather({
      useGeolocation: weatherSettings.useGeolocation,
      fallbackCity: weatherSettings.fallbackCity,
    })
      .then((data) => {
        if (!cancelled) {
          setWeather(data)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setWeather(null)
          setError(true)
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [weatherSettings.useGeolocation, weatherSettings.fallbackCity])

  return { weather, loading, error }
}
