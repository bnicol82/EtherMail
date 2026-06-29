import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useEtherMailStore } from '../store/useStore'
import type { CalendarEvent } from '../types'

export function EventEditModal() {
  const editingEventId = useEtherMailStore((s) => s.editingEventId)
  const calendarEvents = useEtherMailStore((s) => s.calendarEvents)
  const setEditingEventId = useEtherMailStore((s) => s.setEditingEventId)
  const updateCalendarEvent = useEtherMailStore((s) => s.updateCalendarEvent)

  const event = calendarEvents.find((e) => e.id === editingEventId) ?? null

  const [title, setTitle] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [location, setLocation] = useState('')
  const [room, setRoom] = useState('')
  const [attendees, setAttendees] = useState('')

  useEffect(() => {
    if (!event) return
    setTitle(event.title)
    setStart(event.start.slice(0, 16))
    setEnd(event.end.slice(0, 16))
    setLocation(event.location ?? '')
    setRoom(event.room ?? '')
    setAttendees(event.attendees?.join(', ') ?? '')
  }, [event])

  if (!event) return null

  const save = () => {
    const updates: Partial<CalendarEvent> = {
      title: title.trim() || event.title,
      start: new Date(start).toISOString(),
      end: new Date(end).toISOString(),
      location: location.trim() || undefined,
      room: room.trim() || undefined,
      attendees: attendees
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    }
    updateCalendarEvent(event.id, updates)
    setEditingEventId(null)
  }

  return (
    <div
      className="fixed inset-0 z-[65] flex items-center justify-center p-4 pb-28 sm:pb-4 bg-black/40 backdrop-blur-sm"
      onClick={() => setEditingEventId(null)}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="glass-frost rounded-xl w-full max-w-md max-h-[min(90vh,32rem)] shadow-2xl border border-[var(--glass-border)] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--glass-border)]">
          <h2 className="text-base font-semibold text-theme">Edit event</h2>
          <button type="button" onClick={() => setEditingEventId(null)} className="p-1.5 rounded-lg hover-theme text-theme-muted">
            <X size={18} />
          </button>
        </div>
        <div className="p-4 space-y-3 overflow-y-auto">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-theme-muted font-medium">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-lg input-theme text-sm outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-theme-muted font-medium">Start</label>
              <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} className="mt-1 w-full px-2 py-2 rounded-lg input-theme text-xs outline-none" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-theme-muted font-medium">End</label>
              <input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} className="mt-1 w-full px-2 py-2 rounded-lg input-theme text-xs outline-none" />
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-theme-muted font-medium">Location</label>
            <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Building or address" className="mt-1 w-full px-3 py-2 rounded-lg input-theme text-sm outline-none" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-theme-muted font-medium">Room</label>
            <input value={room} onChange={(e) => setRoom(e.target.value)} placeholder="e.g. 4B, Conference Room A" className="mt-1 w-full px-3 py-2 rounded-lg input-theme text-sm outline-none" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-theme-muted font-medium">Attendees</label>
            <input value={attendees} onChange={(e) => setAttendees(e.target.value)} placeholder="Comma-separated names" className="mt-1 w-full px-3 py-2 rounded-lg input-theme text-sm outline-none" />
          </div>
        </div>
        <div className="flex gap-2 p-3 border-t border-[var(--glass-border)]">
          <button type="button" onClick={() => setEditingEventId(null)} className="flex-1 py-2 rounded-xl glass text-sm text-theme-muted">
            Cancel
          </button>
          <button type="button" onClick={save} className="flex-1 py-2 rounded-xl btn-accent text-sm font-medium">
            Save changes
          </button>
        </div>
      </div>
    </div>
  )
}
