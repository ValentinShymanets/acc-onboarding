import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { createErrorOnce, listErrorOnce } from '../../mocks/handlers'
import { server } from '../../mocks/server'
import { SessionsWorkspace } from './SessionsWorkspace'
import type { NewSessionInput, Session } from './types'

const SEEDED_TITLES = [
  'React fundamentals',
  'TypeScript deep dive',
  'Accessibility basics',
  'Testing with Vitest',
  'Performance workshop',
]
const COMPLETED_TITLES = ['Accessibility basics', 'Testing with Vitest']

async function fillValidForm(
  user: ReturnType<typeof userEvent.setup>,
  title: string,
) {
  await user.type(screen.getByLabelText('Title'), title)
  fireEvent.change(screen.getByLabelText('Start date and time'), {
    target: { value: '2099-01-01T10:00' },
  })
}

describe('SessionsWorkspace', () => {
  it('filters sessions by status', async () => {
    const user = userEvent.setup()
    render(<SessionsWorkspace />)

    await screen.findByText('React fundamentals')
    for (const title of SEEDED_TITLES) {
      expect(screen.getByText(title)).toBeTruthy()
    }

    await user.selectOptions(screen.getByLabelText('Status'), 'completed')
    expect(screen.getAllByRole('listitem')).toHaveLength(COMPLETED_TITLES.length)
    for (const title of COMPLETED_TITLES) {
      expect(screen.getByText(title)).toBeTruthy()
    }
    expect(screen.queryByText('React fundamentals')).toBeNull()

    await user.selectOptions(screen.getByLabelText('Status'), 'All')
    for (const title of SEEDED_TITLES) {
      expect(screen.getByText(title)).toBeTruthy()
    }
  })

  it('shows each status as a badge without separators', async () => {
    render(<SessionsWorkspace />)

    const titleNode = await screen.findByText('Performance workshop')
    const item = titleNode.closest('li')!
    expect(within(item).getByText('cancelled')).toBeTruthy()
    expect(item.textContent).not.toContain('·')
  })

  it('creates a session and shows it as scheduled under All', async () => {
    const user = userEvent.setup()
    render(<SessionsWorkspace />)
    await screen.findByText('React fundamentals')

    await user.selectOptions(screen.getByLabelText('Status'), 'completed')
    await user.click(screen.getByRole('button', { name: 'New session' }))
    await fillValidForm(user, 'Hooks clinic')
    await user.click(screen.getByRole('button', { name: 'Create session' }))

    const titleNode = await screen.findByText('Hooks clinic')
    expect(screen.queryByRole('button', { name: 'Create session' })).toBeNull()
    expect(
      (screen.getByLabelText('Status') as HTMLSelectElement).value,
    ).toBe('all')
    const item = titleNode.closest('li')!
    expect(within(item).getByText('scheduled')).toBeTruthy()
  })

  it('sends only one create request while one is pending', async () => {
    let calls = 0
    server.use(
      http.post('/api/sessions', async ({ request }) => {
        calls += 1
        const { title, startsAt } = (await request.json()) as NewSessionInput
        await delay(100)
        const session: Session = {
          id: 'created-1',
          title,
          startsAt,
          status: 'scheduled',
        }
        return HttpResponse.json(session, { status: 201 })
      }),
    )
    const user = userEvent.setup()
    render(<SessionsWorkspace />)
    await screen.findByText('React fundamentals')

    await user.click(screen.getByRole('button', { name: 'New session' }))
    await fillValidForm(user, 'Pending guard')
    const submit = screen.getByRole('button', { name: 'Create session' })
    const form = submit.closest('form')!
    fireEvent.submit(form)
    fireEvent.submit(form)

    expect((submit as HTMLButtonElement).disabled).toBe(true)
    expect(submit.textContent).toBe('Creating…')
    await screen.findByText('Pending guard')
    expect(calls).toBe(1)
    expect(screen.getAllByText('Pending guard')).toHaveLength(1)
  })

  it('shows only the header and a loading status while loading', async () => {
    render(<SessionsWorkspace />)

    expect(screen.getByRole('status').textContent).toBe('Loading sessions…')
    expect(screen.queryByLabelText('Status')).toBeNull()
    expect(screen.queryByRole('button', { name: 'New session' })).toBeNull()
    expect(
      screen.getByRole('heading', { level: 1, name: 'Training sessions' }),
    ).toBeTruthy()
    await screen.findByText('React fundamentals')
  })

  it('recovers from a list error and moves focus to Status', async () => {
    server.use(listErrorOnce)
    const user = userEvent.setup()
    render(<SessionsWorkspace />)

    const alert = await screen.findByRole('alert')
    expect(within(alert).getByText("Couldn't load sessions.")).toBeTruthy()
    expect(screen.queryByLabelText('Status')).toBeNull()
    expect(screen.queryByRole('button', { name: 'New session' })).toBeNull()

    await user.click(within(alert).getByRole('button', { name: 'Retry' }))
    await screen.findByText('React fundamentals')
    expect(screen.queryByRole('alert')).toBeNull()
    expect(document.activeElement).toBe(screen.getByLabelText('Status'))
  })

  it('hides New session while the form is open', async () => {
    const user = userEvent.setup()
    render(<SessionsWorkspace />)
    await screen.findByText('React fundamentals')

    await user.click(screen.getByRole('button', { name: 'New session' }))
    expect(screen.queryByRole('button', { name: 'New session' })).toBeNull()
    expect(
      screen.getByRole('heading', { level: 2, name: 'New session' }),
    ).toBeTruthy()
  })

  it('returns focus to New session and announces a created session', async () => {
    const user = userEvent.setup()
    render(<SessionsWorkspace />)
    await screen.findByText('React fundamentals')

    await user.click(screen.getByRole('button', { name: 'New session' }))
    await fillValidForm(user, 'Focus return')
    await user.click(screen.getByRole('button', { name: 'Create session' }))

    await screen.findByText('Focus return')
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'New session' }),
    )
    expect(screen.getByRole('status').textContent).toBe('Session created')
  })

  it('shows No sessions with the filter still available for an empty list', async () => {
    server.use(http.get('/api/sessions', () => HttpResponse.json([])))
    render(<SessionsWorkspace />)

    expect(await screen.findByText('No sessions')).toBeTruthy()
    expect(screen.getByLabelText('Status')).toBeTruthy()
  })

  it('renders exactly one h1 when ready', async () => {
    render(<SessionsWorkspace />)
    await screen.findByText('React fundamentals')

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })

  it('moves focus to Title when the form opens', async () => {
    const user = userEvent.setup()
    render(<SessionsWorkspace />)
    await screen.findByText('React fundamentals')

    await user.click(screen.getByRole('button', { name: 'New session' }))
    expect(document.activeElement).toBe(screen.getByLabelText('Title'))
  })

  it('shows linked field errors and focuses the first invalid field', async () => {
    let calls = 0
    server.use(
      http.post('/api/sessions', () => {
        calls += 1
        return HttpResponse.json({}, { status: 500 })
      }),
    )
    const user = userEvent.setup()
    render(<SessionsWorkspace />)
    await screen.findByText('React fundamentals')

    await user.click(screen.getByRole('button', { name: 'New session' }))
    await user.type(screen.getByLabelText('Title'), '   ')
    await user.click(screen.getByRole('button', { name: 'Create session' }))

    const title = screen.getByLabelText('Title')
    const startsAt = screen.getByLabelText('Start date and time')
    expect(title.getAttribute('aria-invalid')).toBe('true')
    expect(startsAt.getAttribute('aria-invalid')).toBe('true')
    expect(
      document.getElementById(title.getAttribute('aria-describedby')!)
        ?.textContent,
    ).toBe('Title must be 3–80 characters.')
    expect(
      document.getElementById(startsAt.getAttribute('aria-describedby')!)
        ?.textContent,
    ).toBe('Choose a future date and time.')
    expect(document.activeElement).toBe(title)
    expect(calls).toBe(0)

    await user.clear(title)
    await user.type(title, 'Valid title')
    await user.click(screen.getByRole('button', { name: 'Create session' }))

    expect(screen.queryByText('Title must be 3–80 characters.')).toBeNull()
    expect(screen.getByText('Choose a future date and time.')).toBeTruthy()
    expect(document.activeElement).toBe(startsAt)
    expect(calls).toBe(0)
  })

  it('keeps values and focuses submit when create fails', async () => {
    server.use(createErrorOnce)
    const user = userEvent.setup()
    render(<SessionsWorkspace />)
    await screen.findByText('React fundamentals')

    await user.click(screen.getByRole('button', { name: 'New session' }))
    await fillValidForm(user, 'Will fail')
    // Submit with Enter from Title, so focus only reaches submit if it is moved.
    await user.type(screen.getByLabelText('Title'), '{Enter}')

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toBe("Couldn't create the session. Try again.")
    expect((screen.getByLabelText('Title') as HTMLInputElement).value).toBe(
      'Will fail',
    )
    expect(
      (screen.getByLabelText('Start date and time') as HTMLInputElement).value,
    ).toBe('2099-01-01T10:00')
    expect(screen.getAllByRole('listitem')).toHaveLength(SEEDED_TITLES.length)
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Create session' }),
    )
  })
})
