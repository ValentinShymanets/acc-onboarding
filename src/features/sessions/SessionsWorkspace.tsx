import { useEffect, useRef, useState } from 'react'
import { CreateSessionForm } from './CreateSessionForm'
import { SessionList } from './SessionList'
import { listSessions } from './sessionsClient'
import { SESSION_STATUSES, type Session, type SessionStatus } from './types'
import { Button } from './ui/Button'
import { Card } from './ui/Card'
import { FormField } from './ui/FormField'
import './SessionsWorkspace.css'

type LoadState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; sessions: Session[] }

type Filter = 'all' | SessionStatus

export function SessionsWorkspace() {
  const [load, setLoad] = useState<LoadState>({ status: 'loading' })
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [filter, setFilter] = useState<Filter>('all')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const newSessionRef = useRef<HTMLButtonElement>(null)
  const statusRef = useRef<HTMLSelectElement>(null)
  // Flags, not state: the focus effects below only read refs and never set state.
  const focusNewSessionOnClose = useRef(false)
  const focusStatusOnReady = useRef(false)

  useEffect(() => {
    const controller = new AbortController()
    listSessions(controller.signal).then(
      (sessions) => setLoad({ status: 'ready', sessions }),
      (error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }
        setLoad({ status: 'error' })
      },
    )
    return () => controller.abort()
  }, [loadAttempt])

  useEffect(() => {
    if (load.status !== 'ready' || !focusStatusOnReady.current) return
    focusStatusOnReady.current = false
    statusRef.current?.focus()
  }, [load.status])

  useEffect(() => {
    if (isFormOpen || !focusNewSessionOnClose.current) return
    focusNewSessionOnClose.current = false
    newSessionRef.current?.focus()
  }, [isFormOpen])

  function openForm() {
    setAnnouncement('')
    setIsFormOpen(true)
  }

  function handleRetry() {
    focusStatusOnReady.current = true
    setLoad({ status: 'loading' })
    setLoadAttempt((attempt) => attempt + 1)
  }

  function handleCreated(session: Session) {
    setLoad((current) =>
      current.status === 'ready'
        ? { status: 'ready', sessions: [...current.sessions, session] }
        : current,
    )
    setFilter('all')
    focusNewSessionOnClose.current = true
    setAnnouncement('Session created')
    setIsFormOpen(false)
  }

  const header = (
    <header className="sessions-header">
      <h1>Training sessions</h1>
      {load.status === 'ready' && !isFormOpen ? (
        <Button
          ref={newSessionRef}
          type="button"
          className="sessions-header__action"
          onClick={openForm}
        >
          New session
        </Button>
      ) : null}
    </header>
  )

  if (load.status === 'loading') {
    return (
      <div className="sessions">
        {header}
        <Card padded={false}>
          <p role="status" className="sessions-message">
            Loading sessions…
          </p>
        </Card>
      </div>
    )
  }

  if (load.status === 'error') {
    return (
      <div className="sessions">
        {header}
        <Card padded={false}>
          <div role="alert" className="sessions-band">
            <p className="sessions-band__text">Couldn't load sessions.</p>
            <Button variant="secondary" type="button" onClick={handleRetry}>
              Retry
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  const filtered =
    filter === 'all'
      ? load.sessions
      : load.sessions.filter((session) => session.status === filter)

  return (
    <div className="sessions">
      {header}
      <div className="sessions-toolbar">
        <FormField label="Status">
          {(control) => (
            <select
              {...control}
              ref={statusRef}
              value={filter}
              onChange={(event) => setFilter(event.target.value as Filter)}
            >
              <option value="all">All</option>
              {SESSION_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          )}
        </FormField>
      </div>
      {isFormOpen ? <CreateSessionForm onCreated={handleCreated} /> : null}
      <Card padded={false}>
        <SessionList sessions={filtered} />
      </Card>
      <p role="status" className="visually-hidden">
        {announcement}
      </p>
    </div>
  )
}
