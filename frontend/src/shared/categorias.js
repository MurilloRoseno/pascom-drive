import { useEffect, useState } from 'react';
import { listarCategorias } from '../lib/api.js';

// Lista de reserva: vale enquanto /api/categorias não responde (ou se falhar), para o site
// nunca ficar sem filtro. A lista de verdade fica na aba Categorias, editada no painel.
export const CATEGORIAS_PADRAO = [
  { id: 'celebracoes', label: 'Celebrações' },
  { id: 'batismo', label: 'Batismo' },
  { id: 'eucaristia', label: 'Eucaristia' },
  { id: 'crisma', label: 'Crisma' },
  { id: 'casamento', label: 'Casamento' },
  { id: 'uncao-dos-enfermos', label: 'Unção dos Enfermos' },
  { id: 'ordem', label: 'Ordem' },
];

let atuais = CATEGORIAS_PADRAO;
let carregando = null;
const ouvintes = new Set();

/** Busca a lista no servidor uma vez; falha silenciosa (fica a lista de reserva) e tenta de novo na próxima tela. */
export function carregarCategorias() {
  if (!carregando) {
    carregando = Promise.resolve()
      .then(() => listarCategorias())
      .then((lista) => {
        if (!Array.isArray(lista) || lista.length === 0) return;
        atuais = lista.map(({ id, nome, tipo }) => ({ id, label: nome, tipo }));
        ouvintes.forEach((avisar) => avisar());
      })
      .catch(() => { carregando = null; });
  }
  return carregando;
}

/** @returns {{id: string, label: string, tipo?: string}[]} categorias ativas, na ordem do painel */
export function useCategorias() {
  const [lista, setLista] = useState(atuais);
  useEffect(() => {
    const avisar = () => setLista(atuais);
    ouvintes.add(avisar);
    avisar();
    carregarCategorias();
    return () => ouvintes.delete(avisar);
  }, []);
  return lista;
}

const humanizar = (id) => String(id).replace(/-/g, ' ').replace(/^./, (letra) => letra.toUpperCase());

/** Nome da categoria. Categoria ocultada no painel (mas ainda usada por eventos antigos) mostra o id legível. */
export function categoryLabel(id) {
  const achada = atuais.find((c) => c.id === id) || CATEGORIAS_PADRAO.find((c) => c.id === id);
  if (achada) return achada.label;
  return id ? humanizar(id) : 'Celebrações';
}

/** Só para os testes: volta ao estado inicial. */
export function reiniciarCategorias() {
  atuais = CATEGORIAS_PADRAO;
  carregando = null;
}
