export type WeatherCondition = 'sunny' | 'cloudy' | 'raining' | 'snow' | 'storming'

export interface WeatherSnapshot {
  temperatureF: number
  condition: WeatherCondition
  label: string
  locationLabel: string
}

/** WMO weather interpretation codes → short label + category */
export function weatherFromCode(code: number): { condition: WeatherCondition; label: string } {
  if (code === 0) return { condition: 'sunny', label: 'Sunny' }
  if (code <= 3) return { condition: 'cloudy', label: code === 3 ? 'Cloudy' : 'Partly cloudy' }
  if (code <= 48) return { condition: 'cloudy', label: 'Cloudy' }
  if (code <= 57) return { condition: 'raining', label: 'Drizzle' }
  if (code <= 67) return { condition: 'raining', label: 'Raining' }
  if (code <= 77) return { condition: 'snow', label: 'Snow' }
  if (code <= 82) return { condition: 'raining', label: 'Showers' }
  if (code <= 86) return { condition: 'snow', label: 'Snow' }
  if (code <= 99) return { condition: 'storming', label: 'Storming' }
  return { condition: 'cloudy', label: 'Cloudy' }
}

interface GeoResult {
  latitude: number
  longitude: number
  name: string
}

export async function geocodeCity(city: string): Promise<GeoResult | null> {
  const q = city.trim()
  if (!q) return null
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=en&format=json`
  const res = await fetch(url)
  if (!res.ok) return null
  const data = (await res.json()) as { results?: { latitude: number; longitude: number; name: string }[] }
  const hit = data.results?.[0]
  if (!hit) return null
  return { latitude: hit.latitude, longitude: hit.longitude, name: hit.name }
}

export async function fetchWeather(lat: number, lon: number, locationLabel: string): Promise<WeatherSnapshot> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,weather_code&temperature_unit=fahrenheit&timezone=auto`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Weather unavailable')
  const data = (await res.json()) as {
    current?: { temperature_2m?: number; weather_code?: number }
  }
  const temp = Math.round(data.current?.temperature_2m ?? 0)
  const code = data.current?.weather_code ?? 0
  const { condition, label } = weatherFromCode(code)
  return {
    temperatureF: temp,
    condition,
    label,
    locationLabel,
  }
}

export function getDeviceLocation(): Promise<{ lat: number; lon: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation unsupported'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => reject(err),
      { timeout: 8000, maximumAge: 600_000 },
    )
  })
}

const CACHE_MS = 45 * 60 * 1000
let cache: { key: string; at: number; data: WeatherSnapshot } | null = null

export async function loadWeather(opts: {
  useGeolocation: boolean
  fallbackCity: string
}): Promise<WeatherSnapshot> {
  const cacheKey = `${opts.useGeolocation ? 'geo' : 'city'}:${opts.fallbackCity}`
  if (cache && cache.key === cacheKey && Date.now() - cache.at < CACHE_MS) {
    return cache.data
  }

  let lat: number
  let lon: number
  let locationLabel: string

  if (opts.useGeolocation) {
    try {
      const pos = await getDeviceLocation()
      lat = pos.lat
      lon = pos.lon
      locationLabel = 'Nearby'
    } catch {
      const geo = await geocodeCity(opts.fallbackCity)
      if (!geo) throw new Error('Location not found')
      lat = geo.latitude
      lon = geo.longitude
      locationLabel = geo.name
    }
  } else {
    const geo = await geocodeCity(opts.fallbackCity)
    if (!geo) throw new Error('Location not found')
    lat = geo.latitude
    lon = geo.longitude
    locationLabel = geo.name
  }

  const data = await fetchWeather(lat, lon, locationLabel)
  cache = { key: cacheKey, at: Date.now(), data }
  return data
}

export function clearWeatherCache() {
  cache = null
}
