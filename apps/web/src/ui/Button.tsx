import type { ButtonHTMLAttributes } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-strong dark:text-surface',
  secondary: 'border border-line bg-panel text-ink hover:bg-surface',
  ghost: 'text-ink hover:bg-surface',
  danger: 'bg-danger text-white hover:opacity-90 dark:text-surface',
};

/** Shared focus ring and sizing, also used by links styled as buttons. */
export function buttonClasses(variant: ButtonVariant = 'primary', size: 'md' | 'lg' = 'md'): string {
  const sizing = size === 'lg' ? 'min-h-12 px-5 text-base' : 'min-h-10 px-4 text-sm';
  return `inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50 ${sizing} ${VARIANTS[variant]}`;
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'md' | 'lg';
}

export function Button({ variant = 'primary', size = 'md', className = '', type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={`${buttonClasses(variant, size)} ${className}`} {...props} />;
}
