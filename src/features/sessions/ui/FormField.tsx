import { useId, type ReactNode } from 'react'
import './FormField.css'

type FieldControlProps = {
  id: string
  className: 'field__control'
  'aria-invalid'?: true
  'aria-describedby'?: string
}

type FormFieldProps = {
  label: string
  error?: string
  className?: string
  /** Spread `control` onto the input or select so label and error stay wired. */
  children: (control: FieldControlProps) => ReactNode
}

export function FormField({ label, error, className, children }: FormFieldProps) {
  const id = useId()
  const errorId = `${id}-error`
  const control: FieldControlProps = {
    id,
    className: 'field__control',
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? errorId : undefined,
  }

  return (
    <div className={className ? `field ${className}` : 'field'}>
      <label htmlFor={id} className="field__label">
        {label}
      </label>
      {children(control)}
      {error && (
        <p id={errorId} className="field__error">
          {error}
        </p>
      )}
    </div>
  )
}
