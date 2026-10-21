export const SESSION_STATUSES = ['scheduled', 'completed', 'cancelled'] as const

export type SessionStatus = (typeof SESSION_STATUSES)[number]

export type Session = {
  id: string
  title: string
  status: SessionStatus
  /** ISO 8601 */
  startsAt: string
}

export type NewSessionInput = {
  title: string
  /** ISO 8601 UTC */
  startsAt: string
}
