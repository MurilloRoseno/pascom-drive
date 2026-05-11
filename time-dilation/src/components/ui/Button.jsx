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
        'font-medium transition-all rounded-lg disabled:opacity-50 disabled:cursor-not-allowed',
        {
          'px-4 py-2 text-sm': size === 'sm',
          'px-6 py-3 text-base': size === 'md',
          'px-8 py-4 text-lg': size === 'lg',
        },
        {
          'bg-accent-cyan text-black hover:bg-accent-cyan/90': variant === 'primary',
          'bg-accent-amber text-black hover:bg-accent-amber/90': variant === 'secondary',
          'bg-transparent border border-white/20 text-white hover:border-white/40': variant === 'outline',
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
