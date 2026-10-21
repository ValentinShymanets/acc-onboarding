export type SessionFormValues = {
  title: string
  /** Raw `datetime-local` value, parsed as local time. */
  startsAt: string
}

export type SessionFormErrors = {
  title?: string
  startsAt?: string
}

export function validateSessionForm(
  { title, startsAt }: SessionFormValues,
  now: number = Date.now(),
): SessionFormErrors {
  const errors: SessionFormErrors = {}

  const titleLength = title.trim().length
  if (titleLength < 3 || titleLength > 80) {
    errors.title = 'Title must be 3–80 characters.'
  }

  const startsAtTime = startsAt === '' ? NaN : new Date(startsAt).getTime()
  if (Number.isNaN(startsAtTime) || startsAtTime <= now) {
    errors.startsAt = 'Choose a future date and time.'
  }

  return errors
}
