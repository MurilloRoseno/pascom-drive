import clsx from 'clsx';

export default function Panel({ children, className, interactive = false }) {
  return (
    <div
      className={clsx(
        'rounded-lg border border-white/8 bg-black/40 backdrop-blur-sm p-6',
        interactive && 'hover:bg-black/50 transition-colors',
        className
      )}
    >
      {children}
    </div>
  );
}
