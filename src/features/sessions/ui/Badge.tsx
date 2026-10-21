import type { SessionStatus } from '../types'
import './Badge.css'

type BadgeProps = {
  status: SessionStatus
}

export function Badge({ status }: BadgeProps) {
  return <span className={`badge badge--${status}`}>{status}</span>
}
