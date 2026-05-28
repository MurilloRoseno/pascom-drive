/* eslint-disable react/prop-types */
import { I } from './referenceIcons.jsx';

export const SACRAMENTOS = [
  { id: 'todos', label: 'Todos', iconKey: 'Grid' },
  { id: 'batismo', label: 'Batismo', iconKey: 'Droplet' },
  { id: 'eucaristia', label: 'Eucaristia', iconKey: 'Wheat' },
  { id: 'crisma', label: 'Crisma', iconKey: 'Flame' },
  { id: 'casamento', label: 'Casamento', iconKey: 'Rings' },
  { id: 'uncao', label: 'Unção', iconKey: 'Dove' },
  { id: 'ordem', label: 'Ordem', iconKey: 'Cross' },
  { id: 'missa', label: 'Missa', iconKey: 'Cup' },
];

export const PROXIMAS = [
  { id: 'a1', dia: '01', mes: 'Jun', titulo: 'Festa de Corpus Christi', local: 'Paróquia São Rafael', hora: '17h00' },
  { id: 'a2', dia: '07', mes: 'Jun', titulo: 'Crisma · Turma B', local: 'Paróquia São Rafael', hora: '19h00' },
  { id: 'a3', dia: '15', mes: 'Jun', titulo: 'Batismo Coletivo · Junho', local: 'Capela do Sagrado Coração', hora: '10h00' },
  { id: 'a4', dia: '24', mes: 'Jun', titulo: 'São João — Quermesse paroquial', local: 'Praça São Rafael', hora: '18h00' },
];

export const PRECO_FOTO = 10;
export const TAXA_SERVICO = 2;
export const TAXA_COMODIDADE = 1;

export function brl(value = 0) {
  return `R$ ${Number(value || 0).toFixed(2).replace('.', ',')}`;
}

export function shadeColor(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  const f = (color) => Math.min(255, Math.max(0, Math.round(color + color * percent / 100)));
  return `#${[f(r), f(g), f(b)].map((color) => color.toString(16).padStart(2, '0')).join('')}`;
}

export function toReferenceEvent(event = {}) {
  const category = event.category || 'missa';
  return {
    ...event,
    id: event.eventoId || event.id,
    eventoId: event.eventoId || event.id,
    titulo: event.title || event.titulo || 'Evento paroquial',
    sacramento: category,
    data: event.date || '',
    dataLabel: event.dateLabel || event.date || '',
    hora: event.time || event.hora || '',
    local: event.location || event.local || 'Paróquia São Rafael',
    fotografo: event.fotografo || 'Equipe Pascom',
    coverUrl: event.coverThumbnail || event.cover || '/assets/church-background.png',
    cover: event.coverThumbnail || event.cover ? 'remote' : 'church-bg',
    totalFotos: Number(event.totalFotos || event.fotosProcessadas || 0),
    descricao: event.description || event.descricao || 'Galeria institucional da comunidade paroquial, organizada pela Pascom São Rafael.',
    visibility: event.visibility || 'protegida',
    salesAuthorized: event.salesAuthorized !== false,
    photos: event.photos || makePlaceholderPhotos(event.eventoId || event.id, event.totalFotos || 6),
  };
}

export function toReferencePhoto(photo = {}, event = {}, index = 0) {
  const price = Number(photo.price || PRECO_FOTO);
  return {
    ...photo,
    id: photo.id,
    photoId: photo.id,
    eventoId: event.eventoId || event.id,
    eventoTitulo: event.titulo || event.title,
    caption: photo.caption || `Foto ${String(index + 1).padStart(2, '0')}`,
    src: photo.thumbnailUrl || photo.previewUrl || photo.url || null,
    fullSrc: photo.previewUrl || photo.thumbnailUrl || photo.url || null,
    hue: 28 + (index % 6) * 34,
    price,
    availableForSale: photo.availableForSale !== false,
  };
}

export function makePlaceholderPhotos(eventId = 'evento', total = 6) {
  const count = Math.max(3, Math.min(Number(total || 6), 9));
  return Array.from({ length: count }, (_, index) => ({
    id: `${eventId}-placeholder-${index + 1}`,
    photoId: `${eventId}-placeholder-${index + 1}`,
    caption: `Registro ${index + 1}`,
    hue: 28 + (index % 6) * 36,
    src: index === 0 ? '/assets/igreja.jpg' : null,
    price: PRECO_FOTO,
  }));
}

export function getCoverPhoto(event = {}) {
  if (event.coverUrl) return { src: event.coverUrl, hue: 30, caption: event.titulo };
  const map = {
    'church-bg': { src: '/assets/church-background.png', hue: 30, caption: '' },
    'church-front': { src: '/assets/igreja.jpg', hue: 36, caption: '' },
    igreja: { src: '/assets/igreja.jpg', hue: 28, caption: '' },
    padre: { src: '/assets/padre.png', hue: 35, caption: '' },
    'padre-cross': { src: '/assets/padre.png', hue: 35, caption: '' },
  };
  return map[event.cover] || { src: '/assets/church-background.png', hue: 286, caption: event.titulo };
}

export function resolveEventPhotos(event = {}) {
  return (event.photos?.length ? event.photos : makePlaceholderPhotos(event.id, event.totalFotos)).map((photo, index) => ({
    ...photo,
    src: photo.src || (index === 0 ? '/assets/igreja.jpg' : null),
  }));
}

export function categoryLabel(category) {
  return SACRAMENTOS.find((item) => item.id === category)?.label || 'Celebração';
}

export function Photo({ photo, aspect = '1/1', selected = false, showBadge = true, onClick, children, ornaments = true }) {
  const bg = photo.src ? null : `linear-gradient(135deg, oklch(0.46 0.13 ${photo.hue || 30}) 0%, oklch(0.32 0.10 ${(photo.hue || 30) + 18}) 60%, oklch(0.22 0.06 ${(photo.hue || 30) + 30}) 100%)`;
  const interactiveProps = onClick ? { role: 'button', tabIndex: 0, onClick, onKeyDown: (event) => (event.key === 'Enter' || event.key === ' ') && onClick(event) } : {};
  return (
    <div className={`wm${selected ? ' selected' : ''}`} style={{ aspectRatio: aspect, background: bg || undefined, cursor: onClick ? 'pointer' : 'default', border: 0, padding: 0, width: '100%', display: 'block' }} {...interactiveProps}>
      {photo.src && <img src={photo.src} alt={photo.caption || ''} loading="lazy" />}
      {!photo.src && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end', padding: 12, fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 13, color: 'rgba(255,255,255,0.85)', textAlign: 'left', textShadow: '0 1px 3px rgba(0,0,0,0.4)', zIndex: 0 }}>{photo.caption}</div>}
      {ornaments && <div className="wm-pattern" />}
      {showBadge && <div className="wm-badges"><span className="pill">Prévia</span></div>}
      {selected && <div className="wm-badges-right"><span className="pill pill-yellow"><I.Check className="icon icon-sm" /> Selecionada</span></div>}
      {children}
    </div>
  );
}

export function CoverPhoto({ photo, aspect = '4/3', children }) {
  const bg = photo.src ? null : `linear-gradient(135deg, oklch(0.50 0.12 ${photo.hue || 30}) 0%, oklch(0.30 0.08 ${(photo.hue || 30) + 20}) 100%)`;
  return <div style={{ position: 'relative', width: '100%', aspectRatio: aspect, borderRadius: 14, overflow: 'hidden', background: bg || undefined }}>{photo.src && <img src={photo.src} alt={photo.caption || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}{children}</div>;
}

export function CornerOrnament({ at }) {
  return <svg className={`corner-ornament ${at}`} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M2 2C2 28 28 28 28 28C28 28 28 54 2 54M2 2C28 2 28 28 28 28C28 28 54 28 54 2"/><path d="M14 14C14 14 20 16 20 20C20 24 14 26 14 26M14 14C14 14 16 20 20 20C24 20 26 14 26 14"/></svg>;
}

export function SacramentoChips({ value, onChange }) {
  return <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '4px 18px 6px', scrollbarWidth: 'none' }}>{SACRAMENTOS.map((item) => { const Icon = I[item.iconKey] || I.Sparkle; const active = value === item.id; return <button key={item.id} onClick={() => onChange(item.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 999, background: active ? 'var(--brand)' : 'var(--surface-2)', color: active ? '#fff' : 'var(--ink-2)', border: `1px solid ${active ? 'var(--brand)' : 'var(--line)'}`, fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', transition: 'background 200ms, color 200ms' }}><Icon className="icon icon-sm" /> {item.label}</button>; })}<div style={{ flex: '0 0 8px' }} /></div>;
}

