import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { resetSessions } from '../mocks/handlers'
import { server } from '../mocks/server'

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))

afterEach(() => {
  // Vitest globals are off, so Testing Library does not auto-clean.
  cleanup()
  server.resetHandlers()
  resetSessions()
})

afterAll(() => server.close())
