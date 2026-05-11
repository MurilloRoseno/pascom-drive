import { useState } from 'react';
import Panel from './Panel';

export default function Accordion({ items, allowMultiple = false }) {
  const [openId, setOpenId] = useState(null);

  const toggle = (id) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const isOpen = openId === item.id;
        return (
          <Panel key={item.id} className="overflow-hidden">
            <button
              onClick={() => toggle(item.id)}
              className="w-full flex items-center justify-between py-4 px-0 hover:text-gold-light transition-colors"
            >
              <span className="text-base font-serif font-semibold text-left">
                {item.title || item.q}
              </span>
              <span className="text-2xl text-gold flex-shrink-0 ml-4">
                {isOpen ? '×' : '+'}
              </span>
            </button>

            <div
              className="overflow-hidden transition-all duration-300 ease-out"
              style={{
                maxHeight: isOpen ? '1000px' : '0px',
                opacity: isOpen ? 1 : 0,
              }}
              aria-hidden={!isOpen}
            >
              <div className="pb-4 border-t border-white/10 pt-4 text-sm leading-relaxed text-text-dim">
                {item.body || item.a}
              </div>
            </div>
          </Panel>
        );
      })}
    </div>
  );
}
