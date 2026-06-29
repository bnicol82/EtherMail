import { AlertTriangle, Bell, Calendar, Check, ChevronDown, ChevronUp, Mail, ListTodo, FolderOpen, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useEtherMailStore, useAIAlerts } from '../store/useStore'
import type { AIAlert, AIAlertCategory } from '../types'

const CATEGORY_ICONS: Record<AIAlertCategory, typeof Mail> = {
  email: Mail,
  calendar: Calendar,
  todo: ListTodo,
  vault: FolderOpen,
  account: Bell,
}

function severityStyles(severity: AIAlert['severity']) {
  switch (severity) {
    case 'urgent':
      return 'border-red-400/40 bg-red-500/10'
    case 'warning':
      return 'border-amber-400/40 bg-amber-500/10'
    default:
      return 'border-[var(--glass-border)] glass'
  }
}

interface Props {
  /** Pinned above chat input in AI view */
  variant?: 'inline' | 'dock'
}

export function AIAlertsPanel({ variant = 'inline' }: Props) {
  const alerts = useAIAlerts()
  const markAlertRead = useEtherMailStore((s) => s.markAlertRead)
  const dismissAlert = useEtherMailStore((s) => s.dismissAlert)
  const markAllAlertsRead = useEtherMailStore((s) => s.markAllAlertsRead)
  const setView = useEtherMailStore((s) => s.setView)
  const selectEmail = useEtherMailStore((s) => s.selectEmail)
  const selectNote = useEtherMailStore((s) => s.selectNote)

  const unreadCount = alerts.filter((a) => !a.read).length
  const [expanded, setExpanded] = useState(true)

  useEffect(() => {
    if (unreadCount > 0) setExpanded(true)
  }, [unreadCount])

  if (alerts.length === 0) {
    if (variant === 'dock') return null
    return null
  }

  const openAlert = (alert: AIAlert) => {
    markAlertRead(alert.id)
    if (!alert.actionView) return
    setView(alert.actionView)
    if (alert.actionView === 'email' && alert.sourceId) selectEmail(alert.sourceId)
    if (alert.actionView === 'notes' && alert.sourceId) selectNote(alert.sourceId, { view: 'notes' })
  }

  if (variant === 'dock') {
    return (
      <div className="shrink-0 border-t border-[var(--glass-border)] bg-[var(--glass-bg)]/80 backdrop-blur-sm">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="w-full flex items-center justify-between gap-2 px-4 py-2 text-left hover-theme"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Bell size={14} className="text-accent shrink-0" />
            <span className="text-xs font-semibold text-theme">AI Alerts</span>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-500/25 text-amber-400 text-[10px] font-medium">
                {unreadCount} new
              </span>
            )}
            <span className="text-[10px] text-theme-muted truncate hidden sm:inline">
              — latest from your vault
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {unreadCount > 0 && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation()
                  markAllAlertsRead()
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.stopPropagation()
                    markAllAlertsRead()
                  }
                }}
                className="text-[10px] text-accent hover:underline"
              >
                Mark all read
              </span>
            )}
            {expanded ? <ChevronUp size={14} className="text-theme-muted" /> : <ChevronDown size={14} className="text-theme-muted" />}
          </div>
        </button>

        {expanded && (
          <div className="px-3 pb-3 max-h-[min(40vh,280px)] overflow-y-auto overscroll-contain space-y-2">
            {alerts.map((alert) => {
              const Icon = CATEGORY_ICONS[alert.category]
              return (
                <div
                  key={alert.id}
                  className={`rounded-lg border p-2.5 transition-colors ${severityStyles(alert.severity)} ${
                    alert.read ? 'opacity-80' : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5 shrink-0">
                      {alert.severity === 'urgent' ? (
                        <AlertTriangle size={13} className="text-red-400" />
                      ) : (
                        <Icon size={13} className="text-accent" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <p className="text-xs font-medium text-theme truncate">{alert.title}</p>
                        {!alert.read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-theme-secondary leading-snug line-clamp-2">{alert.message}</p>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {alert.actionView && (
                          <button
                            type="button"
                            onClick={() => openAlert(alert)}
                            className="text-[10px] px-2 py-0.5 rounded-full btn-accent"
                          >
                            View
                          </button>
                        )}
                        {!alert.read && (
                          <button
                            type="button"
                            onClick={() => markAlertRead(alert.id)}
                            className="text-[10px] px-2 py-0.5 rounded-full glass hover-theme text-theme-muted"
                          >
                            Read
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => dismissAlert(alert.id)}
                          className="text-[10px] px-2 py-0.5 rounded-full glass hover-theme text-theme-muted"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2 px-0.5">
        <div className="flex items-center gap-2">
          <Bell size={16} className="text-accent" />
          <h2 className="text-sm font-semibold text-theme">AI Alerts</h2>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-[var(--accent)] text-white text-[10px] font-medium">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button type="button" onClick={markAllAlertsRead} className="text-[10px] text-accent hover:underline">
            Mark all read
          </button>
        )}
      </div>

      <div className="space-y-2">
        {alerts.map((alert) => {
          const Icon = CATEGORY_ICONS[alert.category]
          return (
            <div
              key={alert.id}
              className={`rounded-xl border p-3 transition-colors ${severityStyles(alert.severity)} ${
                alert.read ? 'opacity-75' : ''
              }`}
            >
              <div className="flex items-start gap-2">
                <div className="mt-0.5 shrink-0">
                  {alert.severity === 'urgent' ? (
                    <AlertTriangle size={14} className="text-red-400" />
                  ) : (
                    <Icon size={14} className="text-accent" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-medium text-theme">{alert.title}</p>
                    {!alert.read && <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0" />}
                  </div>
                  <p className="text-xs text-theme-secondary leading-relaxed">{alert.message}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {alert.actionView && (
                      <button type="button" onClick={() => openAlert(alert)} className="text-[10px] px-2 py-1 rounded-full btn-accent">
                        View
                      </button>
                    )}
                    {!alert.read && (
                      <button
                        type="button"
                        onClick={() => markAlertRead(alert.id)}
                        className="text-[10px] px-2 py-1 rounded-full glass hover-theme text-theme-muted flex items-center gap-1"
                      >
                        <Check size={10} />
                        Mark read
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => dismissAlert(alert.id)}
                      className="text-[10px] px-2 py-1 rounded-full glass hover-theme text-theme-muted flex items-center gap-1"
                    >
                      <X size={10} />
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
