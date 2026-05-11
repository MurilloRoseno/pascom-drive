import clsx from 'clsx';

export default function Panel({ children, className, interactive = false }) {
  return (
    <div
      className={clsx(
        'rounded-lg border bg-void/50 backdrop-blur-lg p-7 md:p-8 transition-all duration-300',
        'border-gold/20 shadow-lg shadow-gold/5',
        interactive && 'hover:border-gold/40 hover:bg-void/80 hover:shadow-xl hover:shadow-gold/10 cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  );
}
