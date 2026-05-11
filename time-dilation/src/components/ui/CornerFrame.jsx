export default function CornerFrame({ children, className = '' }) {
  return (
    <div className={`relative ${className}`}>
      {/* Top-left corner */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-gold pointer-events-none" />

      {/* Top-right corner */}
      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-gold pointer-events-none" />

      {/* Bottom-left corner */}
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-gold pointer-events-none" />

      {/* Bottom-right corner */}
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-gold pointer-events-none" />

      {/* Content with padding for corners */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
