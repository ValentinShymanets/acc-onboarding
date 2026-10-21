import { http, HttpResponse } from 'msw'
import type { NewSessionInput, Session } from '../features/sessions/types'

// Provisional mock of an unconfirmed API contract. See sessionsClient.ts.

const SESSIONS_PATH = '/api/sessions'

const seed: Session[] = [
  {
    id: 'seed-1',
    title: 'React fundamentals',
    status: 'scheduled',
    startsAt: '2099-03-02T09:00:00.000Z',
  },
  {
    id: 'seed-2',
    title: 'TypeScript deep dive',
    status: 'scheduled',
    startsAt: '2099-03-09T13:30:00.000Z',
  },
  {
    id: 'seed-3',
    title: 'Accessibility basics',
    status: 'completed',
    startsAt: '2026-01-15T10:00:00.000Z',
  },
  {
    id: 'seed-4',
    title: 'Testing with Vitest',
    status: 'completed',
    startsAt: '2026-02-20T14:00:00.000Z',
  },
  {
    id: 'seed-5',
    title: 'Performance workshop',
    status: 'cancelled',
    startsAt: '2026-04-05T11:00:00.000Z',
  },
]

let sessions: Session[] = [...seed]

export function resetSessions() {
  sessions = [...seed]
}

export const handlers = [
  http.get(SESSIONS_PATH, () => HttpResponse.json(sessions)),
  http.post(SESSIONS_PATH, async ({ request }) => {
    const { title, startsAt } = (await request.json()) as NewSessionInput
    const session: Session = {
      id: crypto.randomUUID(),
      title,
      startsAt,
      status: 'scheduled',
    }
    sessions = [...sessions, session]
    return HttpResponse.json(session, { status: 201 })
  }),
]

export const listErrorOnce = http.get(
  SESSIONS_PATH,
  () =>
    HttpResponse.json({ message: 'Failed to load sessions' }, { status: 500 }),
  { once: true },
)

export const createErrorOnce = http.post(
  SESSIONS_PATH,
  () =>
    HttpResponse.json({ message: 'Failed to create session' }, { status: 500 }),
  { once: true },
)
