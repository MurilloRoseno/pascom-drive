import { useState } from 'react';
import Panel from './Panel';

export default function Accordion({ items, allowMultiple = false }) {
  const [openId, setOpenId] = useState(null);

  const toggle = (id) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <div className="space-y-4 md:space-y-5">
      {items.map((item) => {
        const isOpen = openId === item.id;
        return (
          <Panel key={item.id} className="overflow-hidden" interactive>
            <button
              onClick={() => toggle(item.id)}
              className="w-full flex items-center justify-between py-5 md:py-6 px-0 hover:text-gold-light transition-colors duration-300"
            >
              <span className="text-lg md:text-xl font-serif font-semibold text-left">
                {item.title || item.q}
              </span>
              <span className="text-3xl text-gold flex-shrink-0 ml-6 transition-transform duration-300" style={{ transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)' }}>
                +
              </span>
            </button>

            <div
              className="overflow-hidden transition-all duration-400 ease-out"
              style={{
                maxHeight: isOpen ? '1200px' : '0px',
                opacity: isOpen ? 1 : 0,
              }}
              aria-hidden={!isOpen}
            >
              <div className="pb-6 md:pb-8 border-t border-gold/20 pt-6 md:pt-8 text-base md:text-lg leading-relaxed text-text-dim">
                {item.body || item.a}
              </div>
            </div>
          </Panel>
        );
      })}
    </div>
  );
}
