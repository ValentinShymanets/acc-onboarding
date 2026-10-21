import { describe, expect, it } from 'vitest'
import { validateSessionForm } from './validateSessionForm'

const TITLE_ERROR = 'Title must be 3–80 characters.'
const DATE_ERROR = 'Choose a future date and time.'

// Fixed clock so "future" is deterministic. Values are local `datetime-local`.
const NOW = new Date('2030-06-15T12:00').getTime()
const FUTURE = '2030-06-15T12:01'

function titleError(title: string) {
  return validateSessionForm({ title, startsAt: FUTURE }, NOW).title
}

function dateError(startsAt: string) {
  return validateSessionForm({ title: 'Valid title', startsAt }, NOW).startsAt
}

describe('validateSessionForm title', () => {
  it.each([
    ['2 chars', 'ab', TITLE_ERROR],
    ['3 chars', 'abc', undefined],
    ['80 chars', 'a'.repeat(80), undefined],
    ['81 chars', 'a'.repeat(81), TITLE_ERROR],
    ['empty', '', TITLE_ERROR],
    ['whitespace only', '     ', TITLE_ERROR],
    ['tabs and newlines only', '\t\n \t', TITLE_ERROR],
    ['2 chars padded to 6', '  ab  ', TITLE_ERROR],
    ['3 chars padded', '  abc  ', undefined],
    ['80 chars padded', `   ${'a'.repeat(80)}   `, undefined],
    ['81 chars padded', ` ${'a'.repeat(81)} `, TITLE_ERROR],
    ['inner spaces count', 'a b', undefined],
  ])('%s', (_case, title, expected) => {
    expect(titleError(title)).toBe(expected)
  })
})

describe('validateSessionForm start date and time', () => {
  it.each([
    ['one minute in the future', FUTURE, undefined],
    ['exactly now', '2030-06-15T12:00', DATE_ERROR],
    ['one minute in the past', '2030-06-15T11:59', DATE_ERROR],
    ['a past day', '2020-01-01T09:00', DATE_ERROR],
    ['missing', '', DATE_ERROR],
    ['unparseable', 'not-a-date', DATE_ERROR],
  ])('%s', (_case, startsAt, expected) => {
    expect(dateError(startsAt)).toBe(expected)
  })

  it('reports title and date errors together', () => {
    expect(validateSessionForm({ title: ' ', startsAt: '' }, NOW)).toEqual({
      title: TITLE_ERROR,
      startsAt: DATE_ERROR,
    })
  })
})
