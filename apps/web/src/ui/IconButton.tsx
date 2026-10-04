import type { LucideIcon } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-label'> {
  /** Accessible name. */
  label: string;
  icon: LucideIcon;
}

/** A 44 px round button with only an icon. */
export function IconButton({ label, icon: Icon, className = '', type = 'button', ...props }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      className={`inline-flex size-11 min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full text-ink hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-50 ${className}`}
      {...props}
    >
      <Icon aria-hidden="true" size={22} />
    </button>
  );
}
