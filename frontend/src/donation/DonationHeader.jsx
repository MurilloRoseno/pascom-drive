import PropTypes from 'prop-types';

export default function DonationHeader({ onPaper = false }) {
  return (
    <header className={`doar-header${onPaper ? ' on-paper' : ''}`}>
      <a className="doar-brand" href="/doar">
        <img src={onPaper ? '/assets/logo-full.png' : '/assets/logo-white.png'} alt="" width="44" height="44" />
        <span>
          <strong>Paróquia São Rafael</strong>
          <small>Ofertas e doações</small>
        </span>
      </a>
      <a className="doar-header-link" href="/">Site da paróquia</a>
    </header>
  );
}

DonationHeader.propTypes = { onPaper: PropTypes.bool };
