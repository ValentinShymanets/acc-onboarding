import type { NewSessionInput, Session } from './types'

// Provisional contract (mock only, unconfirmed by a backend):
//   GET  /api/sessions -> 200 Session[]
//   POST /api/sessions { title, startsAt } -> 201 Session
// Any non-2xx response is a failure.

export class SessionsRequestError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'SessionsRequestError'
    this.status = status
  }
}

function sessionsUrl(): URL {
  // Absolute URL: Node's fetch (used under jsdom) rejects relative URLs.
  return new URL('/api/sessions', window.location.origin)
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new SessionsRequestError(
      response.status,
      `Sessions request failed with status ${response.status}`,
    )
  }
  return (await response.json()) as T
}

export async function listSessions(signal?: AbortSignal): Promise<Session[]> {
  const response = await fetch(sessionsUrl(), { signal })
  return parseResponse<Session[]>(response)
}

export async function createSession(input: NewSessionInput): Promise<Session> {
  const response = await fetch(sessionsUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return parseResponse<Session>(response)
}
