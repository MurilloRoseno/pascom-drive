import { Aviso, Cartao, Pilula } from '../ui.jsx';

/**
 * A tarja nas prévias é regra do processo: está em todas as fotos de amostra e não
 * pode ser retirada pelo painel. A tela só informa isso, sem nenhum controle.
 */
export default function Seguranca() {
  return (
    <div className="space-y-6">
      <Cartao
        titulo="Tarja nas prévias"
        descricao="A tarja é a marca d'água sobre a foto de amostra. Quem paga recebe a foto sem ela."
      >
        <div className="flex flex-wrap items-center gap-3">
          <Pilula tom="verde">Sempre ativa</Pilula>
          <span className="font-semibold">Todas as prévias saem com marca d’água</span>
        </div>
        <div className="mt-4">
          <Aviso tom="info">
            Esta proteção faz parte do processo de venda e não pode ser desligada pelo painel.
          </Aviso>
        </div>
      </Cartao>
    </div>
  );
}
