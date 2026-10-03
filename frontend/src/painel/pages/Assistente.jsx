import { useCallback, useEffect, useState } from 'react';
import { usePainel } from '../PainelContext.jsx';
import {
  Aviso, Botao, Campo, CLASSE_INPUT, Cartao, Interruptor, useToast,
} from '../ui.jsx';
import AssistenteChat from '../../components/AssistenteChat.jsx';

const FONTES = [
  { chave: 'assistenteFonteFaq', rotulo: 'Central de ajuda', detalhe: 'Perguntas e respostas publicadas.' },
  { chave: 'assistenteFonteAgenda', rotulo: 'Agenda paroquial', detalhe: 'Próximos compromissos.' },
  { chave: 'assistenteFonteEventos', rotulo: 'Eventos publicados', detalhe: 'Só os nomes das galerias no ar, nunca as fotos.' },
];

const TRAVAS = [
  'Responde só com as fontes ligadas acima.',
  'Nunca pede nem aceita cartão, CPF ou senha: se o visitante digitar, avisa e não guarda a mensagem.',
  'Não consulta pedidos nem dados de clientes.',
  'Ignora pedidos para mudar de papel, mostrar instruções ou entregar segredos.',
  'Limite de 20 mensagens por visitante por hora, sem histórico entre visitas.',
  'Cada resposta mostra a fonte usada. Sem resposta, encaminha para a secretaria.',
];

export default function Assistente() {
  const { chamar, membro } = usePainel();
  const avisar = useToast();
  const [estado, setEstado] = useState({ fase: 'carregando' });
  const [textoFora, setTextoFora] = useState('');
  const [erro, setErro] = useState('');
  const podeEditar = membro.permissoes.includes('ajuda.editar');

  const carregar = useCallback(async () => {
    try {
      const config = await chamar('/api/pascom/configuracoes');
      setEstado({ fase: 'ok', config });
      setTextoFora(config.assistenteForaDoEscopo);
    } catch (e) {
      setEstado({ fase: 'erro', mensagem: e.message });
    }
  }, [chamar]);

  useEffect(() => { carregar(); }, [carregar]);

  if (estado.fase === 'carregando') return <p role="status" className="text-painel-texto2">Carregando…</p>;
  if (estado.fase === 'erro') {
    return (
      <div role="alert" className="rounded-[14px] border border-painel-perigo bg-white p-5">
        <p className="font-semibold text-painel-perigo">Não foi possível carregar o assistente.</p>
        <p className="mt-1 text-body-sm text-painel-texto2">{estado.mensagem}</p>
        <Botao className="mt-4" onClick={carregar}>Tentar de novo</Botao>
      </div>
    );
  }

  const { config } = estado;

  async function salvar(chave, valor, mensagem) {
    try {
      await chamar('/api/pascom/configuracoes', { method: 'PUT', body: { chave, valor } });
      setEstado((s) => ({ ...s, config: { ...s.config, [chave]: valor } }));
      setErro('');
      avisar(mensagem);
    } catch (e) {
      avisar(e.message);
      if (chave === 'assistenteForaDoEscopo') setErro(e.message);
    }
  }

  return (
    <div className="space-y-6">
      <Cartao titulo="Assistente no site" descricao="Responde dúvidas dentro da Central de Ajuda. Não usa IA generativa: procura a resposta no que a paróquia escreveu.">
        <div className="flex items-center gap-3">
          <Interruptor
            rotulo="Assistente no site"
            ligado={config.assistenteAtivo}
            desabilitado={!podeEditar}
            onChange={(v) => salvar('assistenteAtivo', v, v ? 'Assistente ligado.' : 'Assistente desligado.')}
          />
          <span className="font-semibold">{config.assistenteAtivo ? 'Ligado' : 'Desligado'}</span>
        </div>

        <h3 className="mt-6 font-semibold">Só pode consultar</h3>
        <ul className="mt-2 divide-y divide-painel-divisor">
          {FONTES.map((f) => (
            <li key={f.chave} className="flex items-center gap-3 py-2">
              <Interruptor
                rotulo={f.rotulo}
                ligado={config[f.chave]}
                desabilitado={!podeEditar}
                onChange={(v) => salvar(f.chave, v, `${f.rotulo}: ${v ? 'ligada' : 'desligada'} como fonte.`)}
              />
              <div>
                <p className="font-semibold">{f.rotulo}</p>
                <p className="text-body-sm text-painel-texto2">{f.detalhe}</p>
              </div>
            </li>
          ))}
        </ul>
      </Cartao>

      <Cartao titulo="Resposta para assuntos fora do site">
        <Campo rotulo="Texto mostrado quando o assistente não tem como ajudar" htmlFor="texto-fora" erro={erro}>
          <textarea id="texto-fora" className={`${CLASSE_INPUT} min-h-[96px] py-2`} maxLength={300} value={textoFora} disabled={!podeEditar} onChange={(e) => { setTextoFora(e.target.value); setErro(''); }} />
        </Campo>
        {podeEditar && (
          <Botao
            className="mt-3"
            variante="secundario"
            disabled={textoFora.trim() === config.assistenteForaDoEscopo}
            onClick={() => salvar('assistenteForaDoEscopo', textoFora, 'Texto salvo.')}
          >
            Salvar texto
          </Botao>
        )}
      </Cartao>

      <Cartao titulo="Travas de segurança">
        <ul className="space-y-1 text-body-sm">
          {TRAVAS.map((t) => <li key={t}>✓ {t}</li>)}
        </ul>
      </Cartao>

      <div>
        <h2 className="mb-2 font-display text-h3 font-semibold text-photo-primary-dark">Teste o assistente</h2>
        <Aviso tom="info">Funciona como para um visitante e usa o que já está salvo. Perguntas sem resposta entram na lista da Central de Ajuda.</Aviso>
        <div className="mt-3"><AssistenteChat /></div>
      </div>
    </div>
  );
}
