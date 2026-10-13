import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';

interface Shared {
  label: string;
  hint?: string;
  error?: string;
  /** Marks the field optional. Most fields are required, so only optional ones are marked. */
  optional?: boolean;
}

function Wrapper({ id, label, hint, error, optional, children }: Shared & { id: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
        {optional && <span className="ml-1 font-normal text-fg-muted">(optional)</span>}
      </label>
      {children}
      {hint && !error && <p id={`${id}-hint`} className="hint">{hint}</p>}
      {error && <p id={`${id}-error`} className="field-error">{error}</p>}
    </div>
  );
}

function describedBy(id: string, hint?: string, error?: string) {
  if (error) return `${id}-error`;
  if (hint) return `${id}-hint`;
  return undefined;
}

export function TextField({ label, hint, error, optional, className = '', ...rest }: Shared & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <Wrapper id={id} label={label} hint={hint} error={error} optional={optional}>
      <input
        id={id}
        className={`input ${className}`.trim()}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        {...rest}
      />
    </Wrapper>
  );
}

export function SelectField({
  label, hint, error, optional, className = '', children, ...rest
}: Shared & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <Wrapper id={id} label={label} hint={hint} error={error} optional={optional}>
      <select
        id={id}
        className={`input ${className}`.trim()}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        {...rest}
      >
        {children}
      </select>
    </Wrapper>
  );
}

export function TextAreaField({
  label, hint, error, optional, className = '', ...rest
}: Shared & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <Wrapper id={id} label={label} hint={hint} error={error} optional={optional}>
      <textarea
        id={id}
        className={`input min-h-24 py-2 ${className}`.trim()}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        {...rest}
      />
    </Wrapper>
  );
}
