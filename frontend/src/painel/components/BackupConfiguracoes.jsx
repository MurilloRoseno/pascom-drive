import { useState } from 'react';
import { usePainel } from '../PainelContext.jsx';
import { Botao, Cartao, useToast } from '../ui.jsx';

/** Baixa um JSON com as configurações do site (preços, categorias, FAQ, agenda, módulos, acessos, equipe). */
export default function BackupConfiguracoes() {
  const { chamar } = usePainel();
  const avisar = useToast();
  const [baixando, setBaixando] = useState(false);

  async function baixar() {
    setBaixando(true);
    try {
      const dados = await chamar('/api/pascom/backup');
      const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pascom-backup-${String(dados.geradoEm).slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      avisar('Backup baixado.');
    } catch (e) {
      avisar(e.message);
    } finally {
      setBaixando(false);
    }
  }

  return (
    <Cartao titulo="Backup das configurações" descricao="Um arquivo com preços, categorias, FAQ, agenda, módulos, acessos e equipe. Não inclui pedidos, fotos nem chaves. Guarde em lugar seguro: ele tem os e-mails da equipe.">
      <Botao variante="secundario" disabled={baixando} onClick={baixar}>{baixando ? 'Gerando…' : 'Baixar backup'}</Botao>
    </Cartao>
  );
}
