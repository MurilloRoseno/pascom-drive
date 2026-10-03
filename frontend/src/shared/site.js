import { useEffect, useState } from 'react';
import { obterSite } from '../lib/api.js';

/**
 * Conteúdo editável do site (nome, contato, redes, versículo, missão, página inicial, módulos no ar e
 * preço), vindo de /api/site. Carregado uma vez por visita e compartilhado pelo desktop e pelo
 * mobile. Se a API falhar, o site continua exatamente como era: SITE_PADRAO tem os mesmos textos
 * que o servidor usa quando nada foi configurado.
 */
export const WHATSAPP_PADRAO = '5599991646063';

const BLOCOS_PADRAO = [
  { id: 'categorias', titulo: 'Sacramentos e celebrações' },
  { id: 'eventos', titulo: 'Eventos recentes' },
  { id: 'missao', titulo: 'Nossa missão' },
  { id: 'agenda', titulo: 'Próximas atividades' },
  { id: 'contato', titulo: 'Estamos aqui para acolher sua família.' },
];

export const SITE_PADRAO = {
  nome: 'Paróquia São Rafael',
  cidade: 'Açailândia – MA',
  lema: '',
  email: 'paroquiasaorafael@hotmail.com',
  whatsapp: WHATSAPP_PADRAO,
  endereco: 'Av. Contorno, Qd 59 Lt 09, Jardim de Alah, Açailândia - MA, CEP 65930-000',
  horario: 'Terça a sexta: 8h30 às 11h',
  instagram: 'https://www.instagram.com/paroquia.sao.rafael/',
  facebook: 'https://www.facebook.com/paroquiasaorafaelacai',
  youtube: '',
  versiculo: 'Tudo posso naquele que me fortalece.',
  referencia: 'Filipenses 4:13',
  missao: null,
  numeros: [],
  depoimentos: [],
  assistenteAtivo: false,
  home: { blocos: BLOCOS_PADRAO, destaque: null },
  modulos: {},
  precos: { foto: 5, taxaServico: 2, taxaComodidade: 1 },
};

let promessa = null;
let atual = null;

/** Mescla a resposta com o padrão: campo que a API não mandou continua como era. */
const mesclar = (dados) => ({
  ...SITE_PADRAO,
  ...dados,
  home: { ...SITE_PADRAO.home, ...(dados.home || {}) },
  modulos: dados.modulos || {},
  precos: { ...SITE_PADRAO.precos, ...(dados.precos || {}) },
});

export function carregarSite() {
  if (!promessa) {
    promessa = obterSite()
      .then((dados) => { atual = mesclar(dados); return atual; })
      .catch(() => {
        promessa = null; // tenta de novo na próxima tela
        return SITE_PADRAO;
      });
  }
  return promessa;
}

/** Só para testes. */
export function reiniciarSite() {
  promessa = null;
  atual = null;
}

/** @returns {typeof SITE_PADRAO} */
export function useSite() {
  const [site, setSite] = useState(atual || SITE_PADRAO);
  useEffect(() => {
    let ativo = true;
    carregarSite().then((s) => ativo && setSite(s));
    return () => { ativo = false; };
  }, []);
  return site;
}

/** Módulo sem informação (site ainda carregando ou servidor fora) conta como ligado. */
export const moduloLigado = (site, chave) => !site.modulos || site.modulos[chave]?.ligado !== false;

/** De que módulo cada bloco da Home depende (o servidor já tira o bloco; isto cobre uma resposta antiga em cache). */
const MODULO_DO_BLOCO = { categorias: 'busca', destaque: 'busca', eventos: 'busca', agenda: 'agenda' };

/** Blocos da Home que o visitante deve ver, na ordem do painel. */
export const blocosVisiveis = (site) => site.home.blocos.filter((b) => !MODULO_DO_BLOCO[b.id] || moduloLigado(site, MODULO_DO_BLOCO[b.id]));

export const linkWhatsapp = (numero) => `https://wa.me/${numero}`;

/** 5599991646063 -> (99) 99164-6063. Número fora do padrão brasileiro volta como veio. */
export function formatarTelefone(numero) {
  const m = /^55(\d{2})(\d{4,5})(\d{4})$/.exec(String(numero));
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : String(numero);
}

export const brl = (v = 0) => `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`;
