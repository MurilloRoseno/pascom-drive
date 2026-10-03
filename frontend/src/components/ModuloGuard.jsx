import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { moduloLigado, useSite } from '../shared/site.js';
import '../shared/ajuda-agenda.css';

export { moduloLigado };

/**
 * Protege uma página: se o módulo foi tirado do ar no painel, mostra o recado de manutenção
 * no lugar. O servidor também barra as rotas (503); isto é só a boa maneira de explicar ao
 * visitante. Usa o estilo próprio de ajuda/agenda, que funciona no desktop e no mobile.
 */
export default function ModuloGuard({ chave, children }) {
  const site = useSite();
  if (moduloLigado(site, chave)) return children;

  return (
    <section className="aa aa-pagina">
      <div className="aa-conteudo">
        <div role="status" className="aa-nao-resolveu" style={{ textAlign: 'center' }}>
          <h1 className="aa-h2">Em manutenção</h1>
          <p style={{ marginTop: '0.5rem' }}>{site.modulos[chave].recado}</p>
          <Link to="/" className="aa-btn aa-btn--primario" style={{ marginTop: '1rem' }}>Voltar à página inicial</Link>
        </div>
      </div>
    </section>
  );
}

ModuloGuard.propTypes = { chave: PropTypes.string.isRequired, children: PropTypes.node.isRequired };
