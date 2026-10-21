import type { ComponentPropsWithRef } from 'react'
import './Button.css'

type ButtonProps = Omit<ComponentPropsWithRef<'button'>, 'type'> & {
  type: 'button' | 'submit'
  variant?: 'primary' | 'secondary'
  /** Disables the button and shows `pendingLabel` instead of the children. */
  pending?: boolean
  pendingLabel?: string
}

export function Button({
  type,
  variant = 'primary',
  pending = false,
  pendingLabel,
  disabled,
  className,
  children,
  ...rest
}: ButtonProps) {
  const classes = ['btn', `btn--${variant}`, className].filter(Boolean).join(' ')

  return (
    <button
      {...rest}
      type={type}
      className={classes}
      disabled={disabled || pending}
    >
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  )
}
