export default function SectionLabel({ text }) {
  return (
    <div className="text-xs font-mono text-gold uppercase tracking-widest mb-4">
      [{' '}
      <span className="font-semibold">{text}</span>
      {' '}]
    </div>
  );
}
