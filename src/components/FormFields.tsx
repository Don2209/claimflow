import { ui } from '@/content/site';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { forwardRef, useId, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

const control =
  'block w-full rounded-md border bg-surface px-3 py-2.5 text-body text-fg transition-colors placeholder:text-muted hover:border-fg/60';

function Label({
  htmlFor,
  required,
  children,
}: {
  htmlFor: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-small font-medium">
      {children}
      {!required && <span className="font-normal text-muted"> {ui.optional}</span>}
    </label>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 flex items-start gap-1.5 text-small text-danger">
      <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      {message}
    </p>
  );
}

interface FieldProps {
  label: string;
  error?: string;
  required?: boolean;
  className?: string;
}

function describe(hasError: boolean, errorId: string) {
  return {
    'aria-invalid': hasError || undefined,
    'aria-describedby': hasError ? errorId : undefined,
  };
}

export const TextField = forwardRef<
  HTMLInputElement,
  FieldProps & Omit<ComponentPropsWithoutRef<'input'>, 'className' | 'required'>
>(function TextField({ label, error, required, className, ...props }, ref) {
  const id = useId();
  return (
    <div className={className}>
      <Label htmlFor={id} required={required}>
        {label}
      </Label>
      <input
        {...props}
        ref={ref}
        id={id}
        aria-required={required || undefined}
        {...describe(!!error, `${id}-error`)}
        className={cn(control, error ? 'border-danger' : 'border-line-strong')}
      />
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
});

export const TextAreaField = forwardRef<
  HTMLTextAreaElement,
  FieldProps & Omit<ComponentPropsWithoutRef<'textarea'>, 'className' | 'required'>
>(function TextAreaField({ label, error, required, className, ...props }, ref) {
  const id = useId();
  return (
    <div className={className}>
      <Label htmlFor={id} required={required}>
        {label}
      </Label>
      <textarea
        rows={4}
        {...props}
        ref={ref}
        id={id}
        aria-required={required || undefined}
        {...describe(!!error, `${id}-error`)}
        className={cn(control, error ? 'border-danger' : 'border-line-strong')}
      />
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
});

export const SelectField = forwardRef<
  HTMLSelectElement,
  FieldProps & { options: readonly string[] } & Omit<
      ComponentPropsWithoutRef<'select'>,
      'className' | 'required'
    >
>(function SelectField({ label, error, required, className, options, ...props }, ref) {
  const id = useId();
  return (
    <div className={className}>
      <Label htmlFor={id} required={required}>
        {label}
      </Label>
      <select
        defaultValue=""
        {...props}
        ref={ref}
        id={id}
        aria-required={required || undefined}
        {...describe(!!error, `${id}-error`)}
        className={cn(control, error ? 'border-danger' : 'border-line-strong')}
      >
        <option value="" disabled={required}>
          Select
        </option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
});

export const CheckboxField = forwardRef<
  HTMLInputElement,
  Omit<FieldProps, 'label'> & { label: ReactNode } & Omit<
      ComponentPropsWithoutRef<'input'>,
      'className' | 'required' | 'type'
    >
>(function CheckboxField({ label, error, required, className, ...props }, ref) {
  const id = useId();
  return (
    <div className={className}>
      <div className="flex items-start gap-3">
        <input
          {...props}
          ref={ref}
          id={id}
          type="checkbox"
          aria-required={required || undefined}
          {...describe(!!error, `${id}-error`)}
          className="mt-1 size-5 shrink-0 accent-[rgb(var(--primary))]"
        />
        <label htmlFor={id} className="text-small text-muted">
          {label}
        </label>
      </div>
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
});

/** Success or failure message after a submit. Announced to screen readers when it appears. */
export function FormNotice({
  tone,
  title,
  children,
}: {
  tone: 'ok' | 'danger';
  title: string;
  children: ReactNode;
}) {
  const Icon = tone === 'ok' ? CheckCircle2 : AlertCircle;
  return (
    <div
      role={tone === 'ok' ? 'status' : 'alert'}
      className={cn(
        'flex gap-3 rounded-lg p-4 text-small',
        tone === 'ok' ? 'bg-ok-soft' : 'bg-danger-soft',
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn('mt-0.5 size-5 shrink-0', tone === 'ok' ? 'text-ok' : 'text-danger')}
      />
      <div>
        <p className="font-semibold text-fg">{title}</p>
        <div className="mt-1 text-fg">{children}</div>
      </div>
    </div>
  );
}
