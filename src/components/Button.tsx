import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ForwardedRef,
  type ReactNode,
} from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 rounded-md font-medium whitespace-nowrap transition-[color,background-color,border-color,transform] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60 aria-disabled:cursor-not-allowed aria-disabled:opacity-60';

const variants: Record<Variant, string> = {
  primary: 'bg-primary text-on-primary hover:bg-primary-hover',
  secondary: 'border border-line-strong bg-transparent text-fg hover:border-fg hover:bg-fg/5',
  ghost: 'text-fg hover:bg-fg/5',
};

const sizes: Record<Size, string> = {
  md: 'min-h-10 px-4 text-small',
  lg: 'min-h-12 px-5 text-body',
};

interface StyleProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}

type ButtonProps = StyleProps &
  (
    | ({ to: string; href?: never } & Omit<
        ComponentPropsWithoutRef<typeof Link>,
        'to' | 'className'
      >)
    | ({ href: string; to?: never } & Omit<ComponentPropsWithoutRef<'a'>, 'href' | 'className'>)
    | ({ to?: never; href?: never } & Omit<ComponentPropsWithoutRef<'button'>, 'className'>)
  );

export const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', className, ...props }: ButtonProps,
  ref: ForwardedRef<HTMLButtonElement>,
) {
  const classes = cn(base, variants[variant], sizes[size], className);

  if (props.to !== undefined) {
    return <Link {...props} className={classes} />;
  }
  if (props.href !== undefined) {
    // eslint-disable-next-line jsx-a11y/anchor-has-content -- children arrive through props
    return <a {...props} className={classes} />;
  }
  const { type = 'button', ...rest } = props;
  return <button ref={ref} type={type} {...rest} className={classes} />;
});
