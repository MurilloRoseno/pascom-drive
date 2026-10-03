import { useState } from 'react';
import PropTypes from 'prop-types';
import { usePainel } from '../PainelContext.jsx';
import {
  Aviso, Botao, Campo, CLASSE_INPUT, Cartao, useToast,
} from '../ui.jsx';

const doItem = (f) => ({
  tema: f.tema,
  pergunta: f.pergunta,
  resposta: f.resposta,
  passos: f.passos.join('\n'),
  imagem: f.imagem,
  imagemLegenda: f.imagemLegenda,
  video: f.video,
  videoTitulo: f.videoTitulo,
});

/** Corpo para a API: passos em lista, um por linha. */
const paraCorpo = (form) => ({
  ...form,
  passos: form.passos.split('\n').map((p) => p.trim()).filter(Boolean),
});

/**
 * Editor de uma pergunta da Central de Ajuda. Use `key={faq.id}` para reiniciar
 * ao trocar de pergunta. Publicar exige resposta escrita (o servidor confere).
 */
export default function EditorFaq({ faq, temas, perm, onSalvo, onExcluida }) {
  const { chamar } = usePainel();
  const avisar = useToast();
  const [form, setForm] = useState(() => doItem(faq));
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  const mudar = (campo) => (e) => { setForm((f) => ({ ...f, [campo]: e.target.value })); setErro(''); };
  const desabilitado = !perm.editar || ocupado;

  async function chamarApi(metodo, corpo, mensagemOk) {
    setOcupado(true);
    setErro('');
    try {
      const r = await chamar(`/api/pascom/faq/${faq.id}`, { method: metodo, body: corpo });
      if (mensagemOk) avisar(mensagemOk);
      return r;
    } catch (e) {
      setErro(e.message);
      return null;
    } finally {
      setOcupado(false);
    }
  }

  async function salvar() {
    const r = await chamarApi('PATCH', paraCorpo(form), 'Pergunta salva.');
    if (r) onSalvo(r);
  }

  async function alternarPublicacao() {
    // Salva o texto junto: o servidor só publica se a resposta já estiver escrita.
    const r = await chamarApi('PATCH', { ...paraCorpo(form), publicada: !faq.publicada }, faq.publicada ? 'Voltou a rascunho.' : 'Publicada na Central de Ajuda.');
    if (r) onSalvo(r);
  }

  async function excluir() {
    if (!confirmando) { setConfirmando(true); return; }
    const r = await chamarApi('DELETE', undefined, 'Pergunta excluída.');
    if (r) onExcluida(faq.id);
  }

  return (
    <Cartao titulo={faq.pergunta} destaque>
      <div className="space-y-4">
        <Campo rotulo="Tema" htmlFor="faq-tema">
          <select id="faq-tema" className={CLASSE_INPUT} value={form.tema} disabled={desabilitado} onChange={mudar('tema')}>
            {temas.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
        </Campo>
        <Campo rotulo="Pergunta" htmlFor="faq-pergunta">
          <input id="faq-pergunta" className={CLASSE_INPUT} maxLength={200} value={form.pergunta} disabled={desabilitado} onChange={mudar('pergunta')} />
        </Campo>
        <Campo rotulo="Resposta" htmlFor="faq-resposta" ajuda="Use {preco} e {prazo} para o valor e os dias atuais entrarem sozinhos.">
          <textarea id="faq-resposta" className={`${CLASSE_INPUT} min-h-[120px] py-2`} maxLength={4000} value={form.resposta} disabled={desabilitado} onChange={mudar('resposta')} />
        </Campo>
        <Campo rotulo="Passo a passo (um passo por linha)" htmlFor="faq-passos">
          <textarea id="faq-passos" className={`${CLASSE_INPUT} min-h-[96px] py-2`} value={form.passos} disabled={desabilitado} onChange={mudar('passos')} />
        </Campo>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="Imagem (endereço https)" htmlFor="faq-imagem">
            <input id="faq-imagem" className={CLASSE_INPUT} inputMode="url" placeholder="https://" value={form.imagem} disabled={desabilitado} onChange={mudar('imagem')} />
          </Campo>
          <Campo rotulo="Legenda da imagem" htmlFor="faq-legenda">
            <input id="faq-legenda" className={CLASSE_INPUT} maxLength={150} value={form.imagemLegenda} disabled={desabilitado} onChange={mudar('imagemLegenda')} />
          </Campo>
          <Campo rotulo="Vídeo (endereço https)" htmlFor="faq-video">
            <input id="faq-video" className={CLASSE_INPUT} inputMode="url" placeholder="https://" value={form.video} disabled={desabilitado} onChange={mudar('video')} />
          </Campo>
          <Campo rotulo="Título do vídeo" htmlFor="faq-video-titulo">
            <input id="faq-video-titulo" className={CLASSE_INPUT} maxLength={150} value={form.videoTitulo} disabled={desabilitado} onChange={mudar('videoTitulo')} />
          </Campo>
        </div>

        {!faq.publicada && <Aviso tom="info">Rascunho: só a equipe vê. Escreva a resposta e publique para aparecer no site e no assistente.</Aviso>}
        {erro && <p role="alert" className="text-body-sm font-semibold text-painel-perigo">{erro}</p>}

        <div className="flex flex-wrap gap-3">
          {perm.editar && <Botao variante="secundario" disabled={ocupado} onClick={salvar}>Salvar</Botao>}
          {perm.editar && (
            <Botao variante="dourado" disabled={ocupado} onClick={alternarPublicacao}>
              {faq.publicada ? 'Despublicar' : 'Publicar no site'}
            </Botao>
          )}
          {perm.excluir && (
            <Botao variante="perigo" disabled={ocupado} onClick={excluir}>
              {confirmando ? 'Confirmar exclusão' : 'Excluir'}
            </Botao>
          )}
        </div>
      </div>
    </Cartao>
  );
}

EditorFaq.propTypes = {
  faq: PropTypes.shape({
    id: PropTypes.string.isRequired,
    tema: PropTypes.string,
    pergunta: PropTypes.string,
    resposta: PropTypes.string,
    passos: PropTypes.arrayOf(PropTypes.string),
    publicada: PropTypes.bool,
  }).isRequired,
  temas: PropTypes.arrayOf(PropTypes.shape({ id: PropTypes.string, nome: PropTypes.string })).isRequired,
  perm: PropTypes.shape({ editar: PropTypes.bool, excluir: PropTypes.bool }).isRequired,
  onSalvo: PropTypes.func.isRequired,
  onExcluida: PropTypes.func.isRequired,
};
