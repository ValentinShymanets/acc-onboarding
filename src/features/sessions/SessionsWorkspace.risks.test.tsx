import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { createErrorOnce } from '../../mocks/handlers'
import { server } from '../../mocks/server'
import { SessionsWorkspace } from './SessionsWorkspace'
import type { NewSessionInput, Session } from './types'

const TITLE_ERROR = 'Title must be 3–80 characters.'
const DATE_ERROR = 'Choose a future date and time.'
const FUTURE = '2099-01-01T10:00'

type User = ReturnType<typeof userEvent.setup>

/** Records every create request body and answers like the default mock. */
function recordCreates(options: { delayMs?: number } = {}) {
  const bodies: NewSessionInput[] = []
  server.use(
    http.post('/api/sessions', async ({ request }) => {
      const body = (await request.json()) as NewSessionInput
      bodies.push(body)
      if (options.delayMs) await delay(options.delayMs)
      const session: Session = {
        id: `created-${bodies.length}`,
        title: body.title,
        startsAt: body.startsAt,
        status: 'scheduled',
      }
      return HttpResponse.json(session, { status: 201 })
    }),
  )
  return bodies
}

function toLocalInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  )
}

async function openForm(user: User) {
  render(<SessionsWorkspace />)
  await screen.findByText('React fundamentals')
  await user.click(screen.getByRole('button', { name: 'New session' }))
}

function setStartsAt(value: string) {
  fireEvent.change(screen.getByLabelText('Start date and time'), {
    target: { value },
  })
}

function fieldError(label: string) {
  const id = screen.getByLabelText(label).getAttribute('aria-describedby')
  return id ? document.getElementById(id)?.textContent : undefined
}

function listedTitles() {
  return screen
    .queryAllByRole('listitem')
    .map((item) => item.querySelector('.session-row__title')?.textContent)
}

describe('status filter', () => {
  it('offers exactly All plus each status, starting on All', async () => {
    render(<SessionsWorkspace />)
    await screen.findByText('React fundamentals')

    const select = screen.getByLabelText('Status') as HTMLSelectElement
    expect(
      within(select)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['All', 'scheduled', 'completed', 'cancelled'])
    expect(select.multiple).toBe(false)
    expect(select.value).toBe('all')
    expect(listedTitles()).toHaveLength(5)
  })

  it.each([
    ['scheduled', ['React fundamentals', 'TypeScript deep dive']],
    ['completed', ['Accessibility basics', 'Testing with Vitest']],
    ['cancelled', ['Performance workshop']],
  ])('shows only %s sessions', async (status, titles) => {
    const user = userEvent.setup()
    render(<SessionsWorkspace />)
    await screen.findByText('React fundamentals')

    await user.selectOptions(screen.getByLabelText('Status'), status)

    expect(listedTitles()).toEqual(titles)
    for (const item of screen.getAllByRole('listitem')) {
      expect(within(item).getByText(status)).toBeTruthy()
    }
  })

  it('shows No sessions when a status matches nothing, and All restores the list', async () => {
    server.use(
      http.get('/api/sessions', () =>
        HttpResponse.json([
          {
            id: 'only-1',
            title: 'Only scheduled',
            status: 'scheduled',
            startsAt: '2099-03-02T09:00:00.000Z',
          },
        ] satisfies Session[]),
      ),
    )
    const user = userEvent.setup()
    render(<SessionsWorkspace />)
    await screen.findByText('Only scheduled')

    await user.selectOptions(screen.getByLabelText('Status'), 'cancelled')
    expect(screen.getByText('No sessions')).toBeTruthy()
    expect(screen.queryAllByRole('listitem')).toHaveLength(0)

    await user.selectOptions(screen.getByLabelText('Status'), 'All')
    expect(screen.queryByText('No sessions')).toBeNull()
    expect(listedTitles()).toEqual(['Only scheduled'])
  })
})

describe('create form title validation', () => {
  it.each([
    ['2 chars', 'ab'],
    ['81 chars', 'a'.repeat(81)],
    ['2 chars padded with spaces', '   ab   '],
  ])('rejects a %s title without sending a request', async (_case, title) => {
    const bodies = recordCreates()
    const user = userEvent.setup()
    await openForm(user)

    await user.type(screen.getByLabelText('Title'), title)
    setStartsAt(FUTURE)
    await user.click(screen.getByRole('button', { name: 'Create session' }))

    expect(fieldError('Title')).toBe(TITLE_ERROR)
    expect(fieldError('Start date and time')).toBeUndefined()
    expect(bodies).toHaveLength(0)
    expect(screen.getByRole('button', { name: 'Create session' })).toBeTruthy()
  })

  it.each([
    ['3 chars', 'abc', 'abc'],
    ['80 chars', 'a'.repeat(80), 'a'.repeat(80)],
    ['80 chars padded with spaces', `  ${'b'.repeat(80)}  `, 'b'.repeat(80)],
  ])('accepts a %s title and sends it trimmed', async (_case, typed, sent) => {
    const bodies = recordCreates()
    const user = userEvent.setup()
    await openForm(user)

    await user.type(screen.getByLabelText('Title'), typed)
    setStartsAt(FUTURE)
    await user.click(screen.getByRole('button', { name: 'Create session' }))

    await screen.findByText(sent)
    expect(bodies).toHaveLength(1)
    expect(bodies[0].title).toBe(sent)
    expect(screen.queryByText(TITLE_ERROR)).toBeNull()
  })
})

describe('create form date validation', () => {
  it('rejects a past date and time without sending a request', async () => {
    const bodies = recordCreates()
    const user = userEvent.setup()
    await openForm(user)

    await user.type(screen.getByLabelText('Title'), 'Yesterday session')
    setStartsAt(toLocalInputValue(new Date(Date.now() - 60 * 60 * 1000)))
    await user.click(screen.getByRole('button', { name: 'Create session' }))

    expect(fieldError('Start date and time')).toBe(DATE_ERROR)
    expect(fieldError('Title')).toBeUndefined()
    expect(document.activeElement).toBe(
      screen.getByLabelText('Start date and time'),
    )
    expect(bodies).toHaveLength(0)
    expect(screen.queryByText('Yesterday session')).toBeNull()
  })

  it('sends the local date and time as an ISO instant', async () => {
    const bodies = recordCreates()
    const user = userEvent.setup()
    await openForm(user)

    await user.type(screen.getByLabelText('Title'), 'ISO check')
    setStartsAt(FUTURE)
    await user.click(screen.getByRole('button', { name: 'Create session' }))

    const titleNode = await screen.findByText('ISO check')
    expect(bodies[0].startsAt).toBe(new Date(FUTURE).toISOString())
    expect(
      within(titleNode.closest('li')!).getByText(
        new Date(FUTURE).toLocaleString(),
      ),
    ).toBeTruthy()
  })
})

describe('errors and retry', () => {
  it('stays recoverable when a list retry fails again', async () => {
    let calls = 0
    server.use(
      http.get('/api/sessions', () => {
        calls += 1
        if (calls <= 2) return HttpResponse.json({}, { status: 503 })
        return HttpResponse.json([
          {
            id: 'after-retry',
            title: 'Loaded on third try',
            status: 'completed',
            startsAt: '2026-01-15T10:00:00.000Z',
          },
        ] satisfies Session[])
      }),
    )
    const user = userEvent.setup()
    render(<SessionsWorkspace />)

    let alert = await screen.findByRole('alert')
    await user.click(within(alert).getByRole('button', { name: 'Retry' }))

    alert = await screen.findByRole('alert')
    expect(within(alert).getByText("Couldn't load sessions.")).toBeTruthy()
    expect(screen.queryByLabelText('Status')).toBeNull()

    await user.click(within(alert).getByRole('button', { name: 'Retry' }))
    await screen.findByText('Loaded on third try')
    expect(screen.queryByRole('alert')).toBeNull()
    expect(listedTitles()).toEqual(['Loaded on third try'])
    expect(calls).toBe(3)
  })

  it('creates the session on resubmit after a failed create', async () => {
    let creates = 0
    server.events.on('request:start', ({ request }) => {
      if (request.method === 'POST') creates += 1
    })
    server.use(createErrorOnce)
    const user = userEvent.setup()
    await openForm(user)

    await user.type(screen.getByLabelText('Title'), 'Second attempt')
    setStartsAt(FUTURE)
    await user.click(screen.getByRole('button', { name: 'Create session' }))
    await screen.findByRole('alert')
    expect(screen.getAllByRole('listitem')).toHaveLength(5)

    await user.click(screen.getByRole('button', { name: 'Create session' }))

    const titleNode = await screen.findByText('Second attempt')
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Create session' })).toBeNull()
    expect(within(titleNode.closest('li')!).getByText('scheduled')).toBeTruthy()
    expect(screen.getAllByText('Second attempt')).toHaveLength(1)
    expect(creates).toBe(2)
    server.events.removeAllListeners()
  })
})

describe('duplicate-submit guard', () => {
  it('ignores clicks and Enter while a create is pending', async () => {
    const bodies = recordCreates({ delayMs: 100 })
    const user = userEvent.setup()
    await openForm(user)

    await user.type(screen.getByLabelText('Title'), 'Only once')
    setStartsAt(FUTURE)
    const submit = screen.getByRole('button', { name: 'Create session' })
    await user.click(submit)

    expect((submit as HTMLButtonElement).disabled).toBe(true)
    await user.click(submit)
    await user.type(screen.getByLabelText('Title'), '{Enter}')
    fireEvent.submit(submit.closest('form')!)

    await screen.findByText('Only once')
    expect(bodies).toHaveLength(1)
    expect(screen.getAllByText('Only once')).toHaveLength(1)
  })

  it('releases the guard after a failed create so a resubmit is sent', async () => {
    let attempts = 0
    server.use(
      http.post('/api/sessions', async () => {
        attempts += 1
        await delay(50)
        return HttpResponse.json({}, { status: 500 })
      }),
    )
    const user = userEvent.setup()
    await openForm(user)

    await user.type(screen.getByLabelText('Title'), 'Retry guard')
    setStartsAt(FUTURE)
    const form = screen
      .getByRole('button', { name: 'Create session' })
      .closest('form')!
    fireEvent.submit(form)
    fireEvent.submit(form)
    await screen.findByRole('alert')
    expect(attempts).toBe(1)

    fireEvent.submit(form)
    expect(
      screen.getByRole('button', { name: 'Creating…' }).hasAttribute('disabled'),
    ).toBe(true)
    await screen.findByRole('button', { name: 'Create session' })
    expect(attempts).toBe(2)
  })
})
