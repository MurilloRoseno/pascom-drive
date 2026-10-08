import PropTypes from 'prop-types';

// Conjunto unico de icones da pagina: traco fino, viewBox 24, sem preenchimento.
const PATHS = {
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  lock: <><rect x="5" y="10.5" width="14" height="9.5" rx="2" /><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" /></>,
  mail: <><rect x="3.5" y="5.5" width="17" height="13" rx="2" /><path d="m4 7 8 6 8-6" /></>,
  compass: <><circle cx="12" cy="12" r="8.5" /><path d="m15 9-1.8 4.2L9 15l1.8-4.2L15 9Z" /></>,
  chevron: <path d="m6 9 6 6 6-6" />,
  envelope: <><path d="M4 8.5 12 4l8 4.5V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8.5Z" /><path d="m4 9 8 5 8-5" /></>,
  basket: <><path d="M4 10h16l-1.6 8.2a1 1 0 0 1-1 .8H6.6a1 1 0 0 1-1-.8L4 10Z" /><path d="m8 10 3-5.5M16 10l-3-5.5" /></>,
  hands: <><path d="M12 20s-6.5-3.7-6.5-8.6A3.4 3.4 0 0 1 12 9.6a3.4 3.4 0 0 1 6.5 1.8C18.5 16.3 12 20 12 20Z" /></>,
  whatsapp: <><path d="M4.5 19.5 5.7 16A7.5 7.5 0 1 1 8 18.3l-3.5 1.2Z" /><path d="M9.3 9.2c.3 2.3 2.2 4.3 4.7 4.7" /></>,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
};

export default function Icon({ name, size = 20 }) {
  return (
    <svg
      className="doar-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}

Icon.propTypes = { name: PropTypes.oneOf(Object.keys(PATHS)).isRequired, size: PropTypes.number };
