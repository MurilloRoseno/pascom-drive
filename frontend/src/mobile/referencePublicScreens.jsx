/* eslint-disable react/prop-types, no-unused-vars */
import { useMemo, useState } from 'react';
import { I } from './referenceIcons.jsx';
import { brl, categoryLabel, CornerOrnament, CoverPhoto, DevtoolsGalleryNotice, formatMobileDisplayDate, getCoverPhoto, Photo, PRECO_FOTO, PROXIMAS, resolveEventPhotos, SacramentoChips, SACRAMENTOS } from './referenceUtils.jsx';

export function HomeScreen({ go, eventos, loading, tweaks }) {
  const recentes = eventos.slice(0, 4);
  const totalFotos = eventos.reduce((sum, ev) => sum + Number(ev.totalFotos || 0), 0);

  return (
    <div className="scroll" role="main">
      <section style={{ background: 'linear-gradient(170deg, rgba(20,5,28,0.88) 0%, rgba(70,19,86,0.82) 45%, rgba(20,5,28,0.95) 100%), url(/assets/church-background.png) center 35%/cover no-repeat', color: '#fff', padding: '28px 18px 32px', position: 'relative', overflow: 'hidden' }}>
        <CornerOrnament at="tr" />
        <div className="eyebrow eyebrow-light" style={{ marginBottom: 12 }}>Açailândia · Maranhão</div>
        <h1 className="display" style={{ color: '#fff' }}>Galerias da comunidade no seu bolso.</h1>
        <p className="scripture" style={{ marginTop: 14, color: 'var(--parish-yellow)' }}>“A serviço da memória, da fé e das famílias.”</p>
        <button className="input-with-icon mobile-search-card" onClick={() => go({ name: 'galerias' })} style={{ width: '100%', marginTop: 22, background: '#fff', borderRadius: 14, padding: '13px 14px', color: 'var(--ink-3)', textAlign: 'left' }}>
          <I.Search className="icon" style={{ color: 'var(--brand)' }} /> Buscar celebração, sacramento...
        </button>
        <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          <span className="pill pill-yellow">Galerias 2026</span>
          <span className="pill" style={{ background: 'rgba(255,255,255,0.16)', color: '#fff', border: '1px solid rgba(255,255,255,0.18)' }}><I.Camera className="icon icon-sm" /> {totalFotos} fotos</span>
        </div>
      </section>

      {tweaks.role === 'pascom' && (
        <section className="section-tight" style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--line)' }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>Painel Pascom · Hoje</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <StatTile label="Eventos" value={eventos.length} delta="publicados" />
            <StatTile label="Fotos" value={totalFotos} delta="no catálogo" />
          </div>
        </section>
      )}

      <section className="section-tight">
        <div className="eyebrow">Explore por sacramento</div>
        <h2 className="h3" style={{ marginTop: 4 }}>O que você procura?</h2>
      </section>
      <SacramentoChips value="todos" onChange={(sacramento) => go({ name: 'galerias', sacramento })} />

      <section className="section">
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
          <div><div className="eyebrow">Galerias da Comunidade</div><h2 className="h2" style={{ marginTop: 4 }}>Eventos recentes</h2></div>
          <button className="link-btn" onClick={() => go({ name: 'galerias' })}>Ver todas <I.ChevronRight className="icon icon-sm" /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}>
          {loading ? <LoadingCards /> : recentes.map((ev) => <EventCard key={ev.id} ev={ev} onClick={() => go({ name: 'evento', eventoId: ev.id })} isPascom={tweaks.role === 'pascom'} />)}
          {!loading && recentes.length === 0 && <EmptyCard text="Nenhuma galeria publicada ainda." />}
        </div>
      </section>

      <section className="section" style={{ background: 'var(--surface-2)' }}>
        <div className="eyebrow">Agenda Paroquial</div><h2 className="h2" style={{ marginTop: 4 }}>Próximas atividades</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>{PROXIMAS.map((agenda) => <AgendaRow key={agenda.id} agenda={agenda} />)}</div>
      </section>

      <section className="section-purple">
        <CornerOrnament at="tr" />
        <div className="eyebrow eyebrow-light">Secretaria Paroquial</div>
        <h2 className="h2" style={{ marginTop: 8, color: '#fff' }}>Estamos aqui para acolher sua família.</h2>
        <p className="body" style={{ color: 'rgba(255,255,255,0.78)', marginTop: 8 }}>Escolha fotos, finalize com segurança e receba os links após a confirmação.</p>
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <a className="btn btn-primary" href="https://wa.me/5599991646063" target="_blank" rel="noopener noreferrer"><I.Whatsapp className="icon" /> WhatsApp</a>
          <a className="btn btn-outline" href="mailto:paroquiasaorafael@hotmail.com" style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.55)' }}><I.Mail className="icon" /> E-mail</a>
        </div>
        <div className="glory-text">AD GLORIAM DEI</div>
      </section>
    </div>
  );
}

export function GaleriasScreen({ go, eventos, loading, initialSacramento = 'todos' }) {
  const [query, setQuery] = useState('');
  const [sacramento, setSacramento] = useState(initialSacramento || 'todos');
  const [sort, setSort] = useState('recentes');
  const filtered = useMemo(() => {
    const list = eventos.filter((ev) => (sacramento === 'todos' || ev.sacramento === sacramento) && (!query || `${ev.titulo} ${categoryLabel(ev.sacramento)} ${ev.dataLabel}`.toLowerCase().includes(query.toLowerCase())));
    return [...list].sort((a, b) => {
      if (sort === 'nome') return a.titulo.localeCompare(b.titulo);
      if (sort === 'fotos') return Number(b.totalFotos || 0) - Number(a.totalFotos || 0);
      return String(b.data || b.dataLabel).localeCompare(String(a.data || a.dataLabel));
    });
  }, [eventos, query, sacramento, sort]);

  return (
    <div className="scroll" role="main">
      <section style={{ background: 'linear-gradient(145deg, var(--brand-d), var(--brand))', color: '#fff', padding: '24px 18px 22px', position: 'relative', overflow: 'hidden' }}>
        <CornerOrnament at="tr" />
        <div className="eyebrow eyebrow-light">Galerias da Comunidade</div>
        <h1 className="h1" style={{ color: '#fff', marginTop: 8, lineHeight: 1.1 }}>Encontre seu evento.</h1>
        <p className="body" style={{ color: 'rgba(255,255,255,0.78)', marginTop: 10, fontSize: 13 }}>Busque por sacramento, data ou nome da celebração.</p>
        <div className="input-with-icon mobile-search-card" style={{ marginTop: 18, background: '#fff', borderRadius: 12, padding: '10px 12px' }}><I.Search className="icon" style={{ color: 'var(--brand)' }} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nome, mês ou sacramento" style={{ border: 0, outline: 0, flex: 1, fontSize: 14 }} /></div>
      </section>
      <SacramentoChips value={sacramento} onChange={setSacramento} />
      <section className="section" style={{ paddingTop: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div className="caption" style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--accent-d)' }}>
            {sacramento === 'todos' ? 'Todas as celebrações' : SACRAMENTOS.find((item) => item.id === sacramento)?.label}
          </div>
          <SortChip value={sort} onChange={setSort} />
        </div>
        {loading && <LoadingCards />}
        {!loading && filtered.length === 0 && <EmptyCard text="Nada encontrado. Tente outra busca ou limpe os filtros." />}
        {!loading && <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{filtered.map((ev) => <EventCard key={ev.id} ev={ev} onClick={() => go({ name: 'evento', eventoId: ev.id })} />)}</div>}
      </section>
    </div>
  );
}

export function EventoScreen({ ev, go, tweaks, cart = [], addToCart, removeFromCart, photos: loadedPhotos = [], loading = false, locked = false, offers = { coupons: [], packages: [] }, selectPackage, shareEvent, isDevtoolsOpen = false }) {
  if (!ev) return <EmptyCard text="Evento não encontrado." />;
  const cover = getCoverPhoto(ev);
  const photos = (loadedPhotos.length ? loadedPhotos : resolveEventPhotos(ev)).slice(0, 9);
  const selectedIds = new Set(cart.map((item) => item.photoId));
  return (
    <div className="scroll mobile-event-detail-scroll">
      <section className="mobile-event-detail-hero">
        <CornerOrnament at="tr" />
        <button className="mobile-event-back" onClick={() => go({ name: 'galerias' })}><I.ChevronLeft className="icon icon-sm" /> Voltar aos eventos</button>
        <div className="mobile-event-hero-cover">
          <CoverPhoto photo={cover} aspect="16/10">
            <span className="pill pill-yellow mobile-event-hero-category">{categoryLabel(ev.sacramento)}</span>
            <span className="pill mobile-event-hero-count"><I.Camera className="icon icon-sm" /> {ev.totalFotos} fotos</span>
          </CoverPhoto>
        </div>
        <div className="eyebrow eyebrow-light mobile-event-hero-eyebrow">{categoryLabel(ev.sacramento)}</div>
        <h1 className="mobile-event-hero-title">{ev.titulo}</h1>
        <div className="mobile-event-meta-grid">
          <MetaItem icon="Calendar">{ev.dataLabel || 'Data a confirmar'}</MetaItem>
          <MetaItem icon="Clock">{ev.hora || 'Horário paroquial'}</MetaItem>
          <MetaItem icon="MapPin">{ev.local}</MetaItem>
        </div>
        <button className="btn btn-secondary btn-sm" style={{ marginTop: 12 }} onClick={() => shareEvent?.()}><I.Share className="icon icon-sm" /> Compartilhar evento</button>
      </section>
      <section className="mobile-protected-section">
        <ProtectedPreviewCard />
        {(offers.packages?.length > 0 || offers.coupons?.length > 0) && <MobileOffers offers={offers} selectPackage={selectPackage} />}
        {tweaks.role === 'pascom' && <div style={{ marginTop: 14 }} className="card"><div style={{ padding: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><div><div className="eyebrow">Status Pascom</div><span className="tag tag-green">Publicado</span></div><PascomStat label="Receita" v={brl((cart.length || 9) * PRECO_FOTO)} /></div></div>}
      </section>
      <section className="mobile-event-preview-section">
        <div className="mobile-gallery-strip-head"><strong>{ev.totalFotos} fotos</strong><button className="tag tag-yellow" onClick={() => go({ name: 'galeria', eventoId: ev.id })}>Ver todas</button></div>
        {isDevtoolsOpen && <div style={{ marginTop: 12 }}><DevtoolsGalleryNotice /></div>}
        {loading ? <div className="card" style={{ height: 220, background: 'var(--surface-2)' }} /> : <div className="mobile-gallery-grid mobile-gallery-grid-preview">{photos.map((photo, index) => {
          const selected = selectedIds.has(photo.photoId);
          const openPhoto = () => locked ? go({ name: 'galeria', eventoId: ev.id }) : go({ name: 'foto', eventoId: ev.id, photoIdx: index });
          return <Photo key={photo.photoId} photo={photo} aspect="1/1" selected={selected} showBadge={false} onClick={openPhoto}>{addToCart && <button className="photo-add" onClick={(event) => { event.stopPropagation(); selected ? removeFromCart(photo.photoId) : addToCart(photo); }}>{selected ? <I.Check className="icon icon-sm" /> : <I.Plus className="icon icon-sm" />}</button>}</Photo>;
        })}</div>}
        <PriceHelpCard />
      </section>
    </div>
  );
}

export function CalendarioScreen({ eventos, go }) {
  const [monthOffset, setMonthOffset] = useState(0);
  const visibleMonth = useMemo(() => new Date(2026, 4 + monthOffset, 1), [monthOffset]);
  const monthName = visibleMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const linked = useMemo(() => buildCalendarEvents(eventos, visibleMonth), [eventos, visibleMonth]);
  const monthDays = useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth]);
  const featured = linked.length ? linked.map((item) => item.event) : eventos.slice(0, 4);
  return (
    <div className="scroll mobile-calendar-scroll">
      <section className="mobile-calendar-hero"><CornerOrnament at="tr" /><div className="eyebrow eyebrow-light">Calendário Litúrgico</div><h1 className="h1" style={{ color: '#fff', marginTop: 6 }}>Tempos & celebrações</h1><p className="body" style={{ color: 'rgba(255,255,255,0.76)', marginTop: 8, fontSize: 13 }}>Eventos publicados e atividades da comunidade.</p></section>
      <section className="section mobile-calendar-section">
        <div className="card mobile-calendar-card">
          <div className="mobile-calendar-head"><button className="appbar-icon-btn" onClick={() => setMonthOffset((value) => value - 1)}><I.ChevronLeft className="icon" /></button><h2 className="h3">{monthName}</h2><button className="appbar-icon-btn" onClick={() => setMonthOffset((value) => value + 1)}><I.ChevronRight className="icon" /></button></div>
          <div className="mobile-calendar-weekdays">{['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, i) => <div key={`${day}-${i}`}>{day}</div>)}</div>
          <div className="mobile-calendar-grid">{monthDays.map((item, index) => {
            const marker = item.current ? linked.find((event) => event.day === item.day) : null;
            return <button key={`${item.day}-${index}`} className={`mobile-calendar-day${item.current ? '' : ' muted'}${marker ? ' marked' : ''}`} onClick={() => marker && go({ name: 'evento', eventoId: marker.event.id })}>{item.current ? item.day : ''}{marker && <span className={`mobile-calendar-dot ${marker.color}`} />}</button>;
          })}</div>
          <div className="mobile-calendar-legend"><LegendDot color="var(--accent-d)" label="Evento publicado" /><LegendDot color="var(--parish-green)" label="Agenda" /></div>
        </div>
      </section>
      <section className="section" style={{ paddingTop: 0 }}><h3 className="h3">Em destaque neste mês</h3><div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>{featured.map((ev) => <button key={ev.id} onClick={() => go({ name: 'evento', eventoId: ev.id })} className="card mobile-calendar-feature"><div style={{ width: 52, height: 52 }}><Photo photo={getCoverPhoto(ev)} aspect="1/1" showBadge={false} ornaments={false} /></div><div style={{ flex: 1 }}><strong>{ev.titulo}</strong><div className="caption" style={{ marginTop: 2 }}><I.Calendar className="icon icon-sm" /> {formatMobileDisplayDate(ev.dataLabel, ev.data)}</div></div><I.ChevronRight className="icon" /></button>)}</div></section>
    </div>
  );
}

function buildCalendarEvents(eventos, visibleMonth) {
  const month = visibleMonth.getMonth();
  const year = visibleMonth.getFullYear();
  const parsed = eventos.map((event, index) => {
    const date = parseEventDate(event.data || event.date || event.dataLabel || event.dateLabel);
    return date ? { day: date.getDate(), month: date.getMonth(), year: date.getFullYear(), event, color: index % 2 ? 'green' : 'yellow' } : null;
  }).filter(Boolean).filter((item) => item.month === month && item.year === year);

  if (parsed.length) return parsed;
  return eventos.slice(0, 4).map((event, index) => ({ day: [5, 12, 18, 25][index] || (index + 1), event, color: index % 2 ? 'green' : 'yellow' }));
}

function buildCalendarDays(visibleMonth) {
  const first = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
  const startOffset = first.getDay();
  const daysInMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate();
  return Array.from({ length: 42 }, (_, index) => {
    const day = index - startOffset + 1;
    return { day, current: day > 0 && day <= daysInMonth };
  });
}

function parseEventDate(value) {
  if (!value) return null;
  const source = String(value).slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(source)) {
    const date = new Date(`${source}T12:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const match = String(value).match(/(\d{1,2})\s+de\s+([a-zç]+)\s+de\s+(\d{4})/i);
  if (!match) return null;
  const months = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  const month = months.indexOf(match[2].toLowerCase());
  if (month < 0) return null;
  return new Date(Number(match[3]), month, Number(match[1]), 12);
}

function ProtectedPreviewCard() {
  return (
    <div className="mobile-protected-card">
      <I.Lock className="icon" />
      <div>
        <div className="mobile-protected-title">Prévia protegida</div>
        <p>As prévias têm marca d&apos;água. A foto adquirida é entregue em alta resolução, sem marca, por e-mail e WhatsApp.</p>
      </div>
    </div>
  );
}

function PriceHelpCard() {
  return (
    <div className="mobile-price-help-card">
      <div>
        <div className="caption">Cada foto custa</div>
        <strong>{brl(PRECO_FOTO)}</strong>
      </div>
      <a className="btn btn-outline btn-sm" href="https://wa.me/5599991646063" target="_blank" rel="noopener noreferrer"><I.Whatsapp className="icon icon-sm" /> Tirar dúvidas</a>
    </div>
  );
}

function MobileOffers({ offers, selectPackage }) {
  return (
    <div className="card mobile-offers-card" style={{ marginTop: 12, padding: 14 }}>
      <div className="eyebrow">Ofertas pastorais</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
        {offers.packages?.map((pkg) => <button key={pkg.id} className="tag tag-yellow" onClick={() => selectPackage?.(pkg)}>{pkg.description || 'Aplicar pacote'}</button>)}
        {offers.coupons?.map((coupon) => <span key={coupon.code} className="tag">Cupom {coupon.code}</span>)}
      </div>
    </div>
  );
}

export function PerfilScreen({ setRole, go, role = 'publico', eventos = [], recuperarPedido }) {
  return <PublicoScreen go={go} setRole={setRole} recuperarPedido={recuperarPedido} />;
}

function PublicoScreen({ go, setRole, recuperarPedido }) {
  const [form, setForm] = useState({ email: '', pedidoId: '' });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const submit = async () => {
    setError('');
    setResult(null);
    try {
      setResult(await recuperarPedido(form));
    } catch (cause) {
      setError(cause.message);
    }
  };
  return (
    <div className="scroll" role="main">
      <section style={{ background: 'linear-gradient(140deg, var(--brand-d), var(--brand))', color: '#fff', padding: '24px 18px 28px' }}><CornerOrnament at="tr" /><div className="eyebrow eyebrow-light">Bem-vindo(a)</div><h1 className="h1" style={{ color: '#fff', marginTop: 6 }}>Sua área</h1><p className="body" style={{ color: 'rgba(255,255,255,0.78)', marginTop: 6, fontSize: 13 }}>Acompanhe seus pedidos e fale com a secretaria.</p></section>
      <section className="section">
        <div className="card" style={{ padding: 16, textAlign: 'center' }}><I.User className="icon icon-xl" style={{ margin: '0 auto', color: 'var(--brand)' }} /><h3 className="h3" style={{ marginTop: 10 }}>Acesse seus pedidos</h3><p className="body-sm" style={{ marginTop: 6 }}>Informe o e-mail usado na compra e o código do pedido.</p><input className="input" placeholder="seu@email.com" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} style={{ marginTop: 14 }} /><input className="input" placeholder="PED_..." value={form.pedidoId} onChange={(event) => setForm({ ...form, pedidoId: event.target.value.toUpperCase() })} style={{ marginTop: 10 }} /><button className="btn btn-primary btn-block" style={{ marginTop: 10 }} onClick={submit}>Recuperar fotos</button>{error && <p className="caption" style={{ color: 'var(--danger)', marginTop: 8 }}>{error}</p>}{result && <div className="caption" style={{ textAlign: 'left', marginTop: 12 }}><strong>{result.status}</strong><br />{result.deliveryReady ? `${result.downloads.length} link(s) liberado(s) por 24h.` : 'Pedido ainda não confirmado.'}{result.downloads?.map((item, index) => <a key={item.url} href={item.url} target="_blank" rel="noreferrer" style={{ display: 'block', marginTop: 6 }}>Baixar foto {index + 1}</a>)}</div>}</div>
        <div style={{ marginTop: 14 }} className="card"><MenuRow icon="Whatsapp" label="Falar com a secretaria" href="https://wa.me/5599991646063" /><MenuRow icon="Mail" label="Contato por e-mail" href="mailto:paroquiasaorafael@hotmail.com" /><MenuRow icon="Lock" label="Política de privacidade (LGPD)" onClick={() => go({ name: 'privacidade' })} last /></div>
      </section>
    </div>
  );
}

function LegacyPascomScreen({ go, setRole, eventos }) {
  return (
    <div className="scroll" role="main">
      <section style={{ background: 'linear-gradient(140deg, #1a0f1f 0%, var(--brand-d) 100%)', color: '#fff', padding: '20px 18px 24px', position: 'relative', overflow: 'hidden' }}><CornerOrnament at="tr" /><div className="eyebrow eyebrow-light">Painel Pascom</div><h1 className="h1" style={{ color: '#fff', marginTop: 6 }}>Boa tarde, Equipe!</h1><p className="body" style={{ color: 'rgba(255,255,255,0.78)', marginTop: 6, fontSize: 13 }}>Resumo de hoje · Quinta, 28 de maio de 2026.</p></section>
      <section style={{ padding: '14px 18px 0' }}><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}><BigStat label="Vendas hoje" value="--" delta="placeholder" /><BigStat label="Pedidos" value="--" delta="sem API" /><BigStat label="Mês até hoje" value="--" delta="relatório futuro" /><BigStat label="Aguardando" value="--" delta="processando" muted /></div></section>
      <section className="section"><h2 className="h3">Ações rápidas</h2><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}><ActionTile icon="Upload" label="Subir fotos" sub="Novo evento" primary /><ActionTile icon="Camera" label="Marca d'água" sub="Configurar" /><ActionTile icon="DollarSign" label="Vendas" sub="Relatório" /><ActionTile icon="Settings" label="Galerias" sub="Moderar" /></div></section>
      <section className="section"><h2 className="h3">Eventos publicados</h2><div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>{eventos.slice(0, 3).map((ev) => <button key={ev.id} onClick={() => go({ name: 'evento', eventoId: ev.id })} className="card" style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}><div style={{ width: 52, height: 52 }}><Photo photo={getCoverPhoto(ev)} aspect="1/1" showBadge={false} ornaments={false} /></div><div style={{ flex: 1 }}><strong style={{ color: 'var(--brand)', fontSize: 14 }}>{ev.titulo}</strong><div className="caption">{ev.totalFotos} fotos · publicado</div></div><span className="tag tag-green">Ativo</span></button>)}</div><button className="btn btn-ghost btn-block btn-sm" style={{ marginTop: 14 }} onClick={() => setRole('publico')}>Sair do modo Pascom</button></section>
    </div>
  );
}

function SortChip({ value, onChange }) { return <select className="tag" value={value} onChange={(event) => onChange(event.target.value)} style={{ border: 0, outline: 0 }}><option value="recentes">Recentes</option><option value="fotos">Mais fotos</option><option value="nome">A-Z</option></select>; }
export function formatMobileCardTitle(title) {
  return String(title || '').replace(/\s+e\s+/gi, ' & ');
}

export function formatMobileCardDate(dateLabel, date) {
  return formatMobileDisplayDate(dateLabel, date);
}

function EventCard({ ev, onClick, isPascom }) {
  const cover = getCoverPhoto(ev);
  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') onClick(event);
  };
  return (
    <div onClick={onClick} onKeyDown={handleKeyDown} role="button" tabIndex="0" className="mobile-event-card">
      <div className="mobile-event-card-cover">
        <CoverPhoto photo={cover} aspect="16/10" />
        <div className="mobile-event-card-badges">
          <span className="pill pill-yellow mobile-event-card-category">{categoryLabel(ev.sacramento)}</span>
          <span className="pill mobile-event-card-count"><I.Camera className="icon icon-sm" /> {ev.totalFotos}</span>
          {isPascom && <span className="tag tag-green">Publicado</span>}
        </div>
      </div>
      <div className="mobile-event-card-content">
        <div className="mobile-event-card-date"><I.Calendar className="icon icon-sm" /> {formatMobileCardDate(ev.dataLabel, ev.data)}</div>
        <h3 className="mobile-event-card-title">{formatMobileCardTitle(ev.titulo)}</h3>
        <div className="mobile-event-card-location"><I.MapPin className="icon icon-sm" /> {ev.local}</div>
        <div className="mobile-event-card-footer">
          <span className="mobile-event-card-link">Ver fotos →</span>
          <span className="mobile-event-card-summary"><I.Camera className="icon icon-sm" /> {ev.totalFotos} fotos · {brl(PRECO_FOTO)} cada</span>
        </div>
      </div>
    </div>
  );
}
function MenuRow({ icon, label, href, onClick, disabled, last }) { const Icon = I[icon] || I.Sparkle; const content = <><span style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--surface-2)', color: 'var(--brand)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Icon className="icon icon-sm" /></span><span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: disabled ? 'var(--ink-3)' : 'var(--ink)' }}>{label}</span><I.ChevronRight className="icon icon-sm" style={{ color: 'var(--ink-3)' }} /></>; const style = { width: '100%', padding: '13px 14px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: last ? 0 : '1px solid var(--line)', textAlign: 'left', cursor: disabled ? 'not-allowed' : 'pointer' }; if (href) return <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" style={style}>{content}</a>; return <button onClick={disabled ? undefined : onClick} style={style} title={disabled ? 'Funcionalidade futura' : undefined}>{content}</button>; }
function AgendaRow({ agenda }) { return <div className="card" style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 12 }}><div className="agenda-date-tile" style={{ width: 52, height: 52, borderRadius: 12, background: 'var(--brand)', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}><strong style={{ fontSize: 20 }}>{agenda.dia}</strong><span style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--accent)' }}>{agenda.mes}</span></div><div style={{ flex: 1 }}><strong style={{ color: 'var(--brand)', fontSize: 14 }}>{agenda.titulo}</strong><div className="caption" style={{ marginTop: 2, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}><span><I.MapPin className="icon icon-sm" /> {agenda.local}</span><span><I.Clock className="icon icon-sm" /> {agenda.hora}</span></div></div><I.ChevronRight className="icon" style={{ color: 'var(--ink-3)' }} /></div>; }
function LegendDot({ color, label }) { return <span className="caption" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: 999, background: color }} />{label}</span>; }
function BigStat({ label, value, delta, muted }) { return <div className="card" style={{ padding: 12 }}><div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.14em', color: 'var(--ink-3)', textTransform: 'uppercase' }}>{label}</div><div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: muted ? 'var(--ink-3)' : 'var(--brand)', marginTop: 6 }}>{value}</div><div style={{ fontSize: 11, fontWeight: 600, color: muted ? 'var(--ink-3)' : 'var(--parish-green)', marginTop: 4 }}>{delta}</div></div>; }
function ActionTile({ icon, label, sub, primary }) { const Icon = I[icon] || I.Sparkle; return <button className={`card pascom-action-tile${primary ? ' primary' : ''}`} style={{ padding: 14, textAlign: 'left', minHeight: 96, background: primary ? 'var(--brand)' : 'var(--surface)', color: primary ? '#fff' : 'var(--ink)' }} title="Funcionalidade futura"><Icon className="icon" style={{ color: primary ? 'var(--accent)' : 'var(--brand)' }} /><div style={{ fontWeight: 800, fontSize: 14, marginTop: 10 }}>{label}</div><div className="caption" style={{ color: primary ? 'rgba(255,255,255,0.72)' : 'var(--ink-3)' }}>{sub}</div></button>; }
function MetaItem({ icon, children }) { const Icon = I[icon]; return <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.82)', fontSize: 13 }}><span style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.12)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Icon className="icon icon-sm" /></span>{children}</span>; }
function StatTile({ label, value, delta }) { return <div className="card" style={{ padding: 12 }}><div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.14em', color: 'var(--ink-3)', textTransform: 'uppercase' }}>{label}</div><div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: 'var(--brand)', marginTop: 6 }}>{value}</div><div style={{ fontSize: 11, fontWeight: 600, color: 'var(--parish-green)', marginTop: 4 }}>{delta}</div></div>; }
function PascomStat({ label, v }) { return <div style={{ textAlign: 'right' }}><div className="caption">{label}</div><strong style={{ color: 'var(--brand)' }}>{v}</strong></div>; }
function LoadingCards() { return <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{[1, 2, 3].map((n) => <div key={n} className="card" style={{ height: 180, background: 'linear-gradient(90deg, var(--surface-2), var(--surface), var(--surface-2))' }} />)}</div>; }
export function EmptyCard({ text }) { return <section className="section"><div className="card" style={{ padding: 24, textAlign: 'center' }}><I.Camera className="icon icon-xl" style={{ color: 'var(--ink-4)', margin: '0 auto' }} /><p className="body-sm" style={{ marginTop: 10 }}>{text}</p></div></section>; }
