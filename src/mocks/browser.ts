import { setupWorker } from 'msw/browser'
import { createErrorOnce, handlers, listErrorOnce } from './handlers'

const worker = setupWorker(...handlers)

export async function startMocking() {
  // `?mock=list-error` or `?mock=create-error` makes the first such request fail.
  const scenario = new URLSearchParams(location.search).get('mock')
  if (scenario === 'list-error') worker.use(listErrorOnce)
  if (scenario === 'create-error') worker.use(createErrorOnce)

  await worker.start({ onUnhandledFrame: 'bypass' })
}
