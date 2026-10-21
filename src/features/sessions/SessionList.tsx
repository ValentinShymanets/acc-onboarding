import type { Session } from './types'
import { Badge } from './ui/Badge'
import './SessionList.css'

type SessionListProps = {
  sessions: Session[]
}

export function SessionList({ sessions }: SessionListProps) {
  if (sessions.length === 0) {
    return (
      <p className="sessions-message sessions-message--center">No sessions</p>
    )
  }

  return (
    <ul className="session-list">
      {sessions.map((session) => (
        <li key={session.id} className="session-row">
          <span className="session-row__title">{session.title}</span>
          <Badge status={session.status} />
          <span className="session-row__start">
            {new Date(session.startsAt).toLocaleString()}
          </span>
        </li>
      ))}
    </ul>
  )
}
