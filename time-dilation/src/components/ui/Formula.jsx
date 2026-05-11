import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

export function InlineFormula({ math, className = '' }) {
  return <InlineMath math={math} className={className} />;
}

export function BlockFormula({ math, className = '' }) {
  return (
    <div className={`flex justify-center overflow-x-auto py-4 ${className}`}>
      <BlockMath math={math} />
    </div>
  );
}
