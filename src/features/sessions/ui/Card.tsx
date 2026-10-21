import type { ReactNode } from 'react'
import './Card.css'

type CardProps = {
  children: ReactNode
  /** Defaults to true. The list card is unpadded because rows supply padding. */
  padded?: boolean
  className?: string
}

export function Card({ children, padded = true, className }: CardProps) {
  const classes = ['card', padded && 'card--padded', className]
    .filter(Boolean)
    .join(' ')

  return <div className={classes}>{children}</div>
}
