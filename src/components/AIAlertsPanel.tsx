import { AlertTriangle, Bell, Calendar, Check, Mail, ListTodo, FolderOpen, X, Sparkles } from 'lucide-react'
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
  compact?: boolean
}

export function AIAlertsPanel({ compact = false }: Props) {
  const alerts = useAIAlerts()
  const markAlertRead = useEtherMailStore((s) => s.markAlertRead)
  const dismissAlert = useEtherMailStore((s) => s.dismissAlert)
  const markAllAlertsRead = useEtherMailStore((s) => s.markAllAlertsRead)
  const setView = useEtherMailStore((s) => s.setView)
  const selectEmail = useEtherMailStore((s) => s.selectEmail)
  const selectNote = useEtherMailStore((s) => s.selectNote)

  const unreadCount = alerts.filter((a) => !a.read).length

  if (alerts.length === 0) {
    return (
      <div className={`rounded-xl glass p-4 text-center ${compact ? '' : 'mb-4'}`}>
        <Sparkles size={20} className="mx-auto text-accent mb-2 opacity-70" />
        <p className="text-sm text-theme-muted">No alerts right now — you're all caught up.</p>
      </div>
    )
  }

  const openAlert = (alert: AIAlert) => {
    markAlertRead(alert.id)
    if (!alert.actionView) return
    setView(alert.actionView)
    if (alert.actionView === 'email' && alert.sourceId) selectEmail(alert.sourceId)
    if (alert.actionView === 'notes' && alert.sourceId) selectNote(alert.sourceId, { view: 'notes' })
  }

  return (
    <div className={compact ? '' : 'mb-4'}>
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
          <button
            type="button"
            onClick={markAllAlertsRead}
            className="text-[10px] text-accent hover:underline"
          >
            Mark all read
          </button>
        )}
      </div>

      <div className={`space-y-2 ${compact ? 'max-h-48 overflow-y-auto' : ''}`}>
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
                    {!alert.read && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-theme-secondary leading-relaxed">{alert.message}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {alert.actionView && (
                      <button
                        type="button"
                        onClick={() => openAlert(alert)}
                        className="text-[10px] px-2 py-1 rounded-full btn-accent"
                      >
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
