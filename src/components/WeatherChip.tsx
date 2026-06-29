import { Cloud, CloudLightning, CloudRain, Snowflake, Sun } from 'lucide-react'
import { useWeather } from '../hooks/useWeather'
import type { WeatherCondition } from '../lib/weather'

const CONDITION_ICONS: Record<WeatherCondition, typeof Sun> = {
  sunny: Sun,
  cloudy: Cloud,
  raining: CloudRain,
  snow: Snowflake,
  storming: CloudLightning,
}

const CONDITION_COLORS: Record<WeatherCondition, string> = {
  sunny: 'text-amber-400',
  cloudy: 'text-slate-400',
  raining: 'text-sky-400',
  snow: 'text-cyan-200',
  storming: 'text-violet-400',
}

interface Props {
  showLabel?: boolean
  compact?: boolean
}

export function WeatherChip({ showLabel = true, compact = false }: Props) {
  const { weather, loading, error } = useWeather()

  if (loading) {
    return (
      <div className="shrink-0 animate-pulse">
        <p className="text-sm font-semibold text-theme-muted leading-tight">--°</p>
        {showLabel && <p className="text-[10px] text-theme-muted leading-tight">Loading</p>}
      </div>
    )
  }

  if (error || !weather) {
    return (
      <div className="shrink-0" title="Weather unavailable">
        <p className="text-sm font-semibold text-theme-muted leading-tight">--°</p>
        {showLabel && <p className="text-[10px] text-theme-muted leading-tight">Weather</p>}
      </div>
    )
  }

  const Icon = CONDITION_ICONS[weather.condition]
  const color = CONDITION_COLORS[weather.condition]

  if (compact) {
    return (
      <div className="shrink-0 flex items-center gap-1" title={`${weather.temperatureF}° ${weather.label}`}>
        <Icon size={12} className={color} />
        <span className="text-[10px] text-theme-secondary font-medium">{weather.temperatureF}°</span>
        {showLabel && <span className="text-[10px] text-theme-muted truncate max-w-[52px]">{weather.label}</span>}
      </div>
    )
  }

  return (
    <div className="shrink-0">
      <div className="flex items-center gap-1.5">
        <Icon size={14} className={color} />
        <p className="text-sm font-semibold text-theme leading-tight">{weather.temperatureF}°</p>
      </div>
      {showLabel && (
        <p className="text-[10px] text-theme-muted leading-tight truncate max-w-[72px]">{weather.label}</p>
      )}
    </div>
  )
}
