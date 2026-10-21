import { useEffect, useRef, useState, type FormEvent } from 'react'
import { createSession } from './sessionsClient'
import type { Session } from './types'
import { Button } from './ui/Button'
import { Card } from './ui/Card'
import { FormField } from './ui/FormField'
import {
  validateSessionForm,
  type SessionFormErrors,
} from './validateSessionForm'
import './CreateSessionForm.css'

type CreateSessionFormProps = {
  onCreated: (session: Session) => void
}

export function CreateSessionForm({ onCreated }: CreateSessionFormProps) {
  const [title, setTitle] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [errors, setErrors] = useState<SessionFormErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  // A ref, not state, so two submits in the same tick are also blocked.
  const inFlight = useRef(false)
  const titleRef = useRef<HTMLInputElement>(null)
  const startsAtRef = useRef<HTMLInputElement>(null)
  const submitRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    titleRef.current?.focus()
  }, [])

  // The submit button is disabled while pending, so focus it only once it is
  // enabled again.
  useEffect(() => {
    if (formError && !isPending) submitRef.current?.focus()
  }, [formError, isPending])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (inFlight.current) return

    const nextErrors = validateSessionForm({ title, startsAt })
    setErrors(nextErrors)
    setFormError(null)
    if (nextErrors.title || nextErrors.startsAt) {
      if (nextErrors.title) titleRef.current?.focus()
      else startsAtRef.current?.focus()
      return
    }

    inFlight.current = true
    setIsPending(true)
    try {
      const session = await createSession({
        title: title.trim(),
        startsAt: new Date(startsAt).toISOString(),
      })
      onCreated(session)
    } catch {
      setFormError("Couldn't create the session. Try again.")
    } finally {
      inFlight.current = false
      setIsPending(false)
    }
  }

  return (
    <Card className="session-form-card">
      <h2>New session</h2>
      <form className="session-form" onSubmit={handleSubmit} noValidate>
        <FormField label="Title" error={errors.title}>
          {(control) => (
            <input
              {...control}
              ref={titleRef}
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          )}
        </FormField>
        <FormField label="Start date and time" error={errors.startsAt}>
          {(control) => (
            <input
              {...control}
              ref={startsAtRef}
              type="datetime-local"
              value={startsAt}
              onChange={(event) => setStartsAt(event.target.value)}
            />
          )}
        </FormField>
        {formError ? (
          <p role="alert" className="session-form__band">
            {formError}
          </p>
        ) : null}
        <div className="session-form__actions">
          <Button
            ref={submitRef}
            type="submit"
            pending={isPending}
            pendingLabel="Creating…"
            className="session-form__submit"
          >
            Create session
          </Button>
        </div>
      </form>
    </Card>
  )
}
