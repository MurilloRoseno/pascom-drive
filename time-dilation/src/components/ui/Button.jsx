import clsx from 'clsx';

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  disabled,
  ...props
}) {
  return (
    <button
      className={clsx(
        'font-semibold transition-all duration-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        {
          'px-4 py-2 text-xs tracking-wide': size === 'sm',
          'px-6 py-3 text-sm tracking-wide': size === 'md',
          'px-8 py-4 text-base tracking-wide': size === 'lg',
        },
        {
          'bg-gold text-deep hover:bg-gold-light shadow-lg shadow-gold/30 hover:shadow-xl hover:shadow-gold/40 focus:ring-gold/50 focus:ring-offset-deep': variant === 'primary',
          'bg-transparent border-2 border-gold text-gold hover:bg-gold/10 hover:border-gold-light focus:ring-gold/50 focus:ring-offset-deep': variant === 'secondary',
          'bg-transparent border border-gold/30 text-text hover:border-gold/70 hover:bg-gold/5 focus:ring-gold/30 focus:ring-offset-deep': variant === 'outline',
        },
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
