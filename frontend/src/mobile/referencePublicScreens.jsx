/* eslint-disable react/prop-types */
import { useMemo, useState } from 'react';
import { I } from './referenceIcons.jsx';
import { brl, categoryLabel, CornerOrnament, CoverPhoto, DevtoolsGalleryNotice, getCoverPhoto, Photo, PRECO_FOTO, PROXIMAS, resolveEventPhotos, SacramentoChips, SACRAMENTOS } from './referenceUtils.jsx';

export function HomeScreen({ go, eventos, loading, tweaks }) {
  const recentes = eventos.slice(0, 4);
  const totalFotos = eventos.reduce((sum, ev) => sum + Number(ev.totalFotos || 0), 0);

  return (
    <div className="scroll">
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
    <div className="scroll">
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

export function EventoScreen({ ev, go, tweaks, cart = [], addToCart, removeFromCart, isDevtoolsOpen = false }) {
  if (!ev) return <EmptyCard text="Evento não encontrado." />;
  const cover = getCoverPhoto(ev);
  const photos = resolveEventPhotos(ev).slice(0, 6);
  const selectedIds = new Set(cart.map((item) => item.photoId));
  return (
    <div className="scroll">
      <section style={{ background: 'linear-gradient(140deg, var(--brand-d), var(--brand))', color: '#fff', padding: '12px 18px 26px', position: 'relative' }}>
        <button onClick={() => go({ name: 'galerias' })} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'rgba(255,255,255,0.8)', fontSize: 12, marginBottom: 12 }}><I.ChevronLeft className="icon icon-sm" /> Voltar aos eventos</button>
        <CoverPhoto photo={cover} aspect="4/3"><div style={{ position: 'absolute', left: 12, bottom: 12, display: 'flex', gap: 6 }}><span className="pill pill-yellow">{categoryLabel(ev.sacramento)}</span><span className="pill"><I.Camera className="icon icon-sm" /> {ev.totalFotos} fotos</span></div></CoverPhoto>
        <div className="eyebrow eyebrow-light" style={{ marginTop: 18 }}>{categoryLabel(ev.sacramento)}</div>
        <h1 className="h1" style={{ color: '#fff', marginTop: 6, lineHeight: 1.1 }}>{ev.titulo}</h1>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 14 }}><MetaItem icon="Calendar">{ev.dataLabel || 'Data a confirmar'} · {ev.hora || 'Horário paroquial'}</MetaItem><MetaItem icon="MapPin">{ev.local}</MetaItem><MetaItem icon="Camera">{ev.fotografo}</MetaItem></div>
      </section>
      <section className="section">
        <p className="body">{ev.descricao}</p>
        {ev.visibility === 'protegida' && <div style={{ marginTop: 14, padding: 14, background: 'rgba(247,200,72,0.13)', border: '1px solid rgba(247,200,72,0.25)', borderRadius: 12, display: 'flex', gap: 10 }}><I.Lock className="icon" style={{ color: 'var(--accent-d)', flexShrink: 0, marginTop: 2 }} /><div><div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-d)', fontFamily: 'var(--font-mono)', letterSpacing: '0.10em', textTransform: 'uppercase' }}>Prévia protegida</div><p className="body-sm" style={{ marginTop: 4 }}>Informe o código compartilhado pela secretaria para visualizar todas as fotos.</p></div></div>}
        {tweaks.role === 'pascom' && <div style={{ marginTop: 14 }} className="card"><div style={{ padding: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><div><div className="eyebrow">Status Pascom</div><span className="tag tag-green">Publicado</span></div><PascomStat label="Receita" v={brl((cart.length || 9) * PRECO_FOTO)} /></div></div>}
      </section>
      <section className="section" style={{ paddingTop: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end' }}><div><div className="eyebrow">Fotos do Evento</div><h2 className="h3" style={{ marginTop: 4 }}>Galeria institucional</h2></div><span className="pill pill-mute">{ev.totalFotos} fotos</span></div>
        {isDevtoolsOpen && <div style={{ marginTop: 12 }}><DevtoolsGalleryNotice /></div>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginTop: 12 }}>{photos.map((photo) => {
          const selected = selectedIds.has(photo.photoId);
          return <Photo key={photo.photoId} photo={photo} aspect="1/1" selected={selected} showBadge={false} onClick={() => go({ name: 'galeria', eventoId: ev.id })}>{addToCart && <button className="photo-add" onClick={(event) => { event.stopPropagation(); selected ? removeFromCart(photo.photoId) : addToCart(photo); }}>{selected ? <I.Check className="icon icon-sm" /> : <I.Plus className="icon icon-sm" />}</button>}</Photo>;
        })}</div>
        <button className="btn btn-secondary btn-block" style={{ marginTop: 16 }} onClick={() => go({ name: 'galeria', eventoId: ev.id })}><I.Grid className="icon" /> Ver todas as {ev.totalFotos} fotos</button>
        <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 14, background: 'var(--surface-2)', borderRadius: 12 }}><div><div className="caption">Valor unitário</div><div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: 'var(--brand)' }}>{brl(PRECO_FOTO)}</div></div><a className="btn btn-outline btn-sm" href="https://wa.me/5599991646063" target="_blank" rel="noopener noreferrer"><I.Whatsapp className="icon icon-sm" /> Tirar dúvidas</a></div>
      </section>
    </div>
  );
}

export function CalendarioScreen({ eventos, go }) {
  const monthName = 'Maio 2026';
  const linked = eventos.slice(0, 4).map((ev, index) => ({ day: [5, 12, 18, 25][index] || (index + 1), evId: ev.id, color: index % 2 ? 'green' : 'yellow' }));
  return (
    <div className="scroll">
      <section style={{ background: 'linear-gradient(145deg, var(--brand-d), var(--brand))', color: '#fff', padding: '24px 18px 26px' }}><div className="eyebrow eyebrow-light">Calendário Litúrgico</div><h1 className="h1" style={{ color: '#fff', marginTop: 6 }}>Tempos & celebrações</h1><p className="body" style={{ color: 'rgba(255,255,255,0.76)', marginTop: 8, fontSize: 13 }}>Eventos publicados e atividades da comunidade.</p></section>
      <section className="section">
        <div className="card" style={{ padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><button className="appbar-icon-btn"><I.ChevronLeft className="icon" /></button><h2 className="h3">{monthName}</h2><button className="appbar-icon-btn"><I.ChevronRight className="icon" /></button></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginTop: 12 }}>{['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, i) => <div key={`${day}-${i}`} style={{ textAlign: 'center', fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--ink-3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{day}</div>)}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginTop: 8 }}>{Array.from({ length: 35 }, (_, index) => {
            const day = index - 3;
            const marker = linked.find((item) => item.day === day);
            return <button key={index} onClick={() => marker && go({ name: 'evento', eventoId: marker.evId })} style={{ aspectRatio: '1/1', borderRadius: 10, background: marker ? (marker.color === 'green' ? 'rgba(60,122,90,0.14)' : 'rgba(247,200,72,0.22)') : 'var(--surface-2)', color: day > 0 && day <= 31 ? 'var(--ink)' : 'var(--ink-4)', fontWeight: marker ? 800 : 600, position: 'relative' }}>{day > 0 && day <= 31 ? day : ''}{marker && <span style={{ position: 'absolute', bottom: 4, left: '50%', width: 5, height: 5, borderRadius: 999, transform: 'translateX(-50%)', background: marker.color === 'green' ? 'var(--parish-green)' : 'var(--accent-d)' }} />}</button>;
          })}</div>
          <div style={{ display: 'flex', gap: 12, marginTop: 12 }}><LegendDot color="var(--accent-d)" label="Evento publicado" /><LegendDot color="var(--parish-green)" label="Agenda" /></div>
        </div>
      </section>
      <section className="section" style={{ paddingTop: 0 }}><h3 className="h3">Em destaque neste mês</h3><div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>{eventos.slice(0, 4).map((ev) => <button key={ev.id} onClick={() => go({ name: 'evento', eventoId: ev.id })} className="card" style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}><div style={{ width: 52, height: 52 }}><Photo photo={getCoverPhoto(ev)} aspect="1/1" showBadge={false} ornaments={false} /></div><div style={{ flex: 1 }}><strong style={{ color: 'var(--brand)', fontSize: 14 }}>{ev.titulo}</strong><div className="caption" style={{ marginTop: 2 }}><I.Camera className="icon icon-sm" /> {ev.totalFotos} fotos</div></div><I.ChevronRight className="icon" style={{ color: 'var(--ink-3)' }} /></button>)}</div></section>
    </div>
  );
}

export function PerfilScreen({ setRole, go, role = 'publico', eventos = [] }) {
  if (role === 'pascom') return <PascomScreen go={go} setRole={setRole} eventos={eventos} />;
  return <PublicoScreen go={go} setRole={setRole} />;
}

function PublicoScreen({ go, setRole }) {
  return (
    <div className="scroll">
      <section style={{ background: 'linear-gradient(140deg, var(--brand-d), var(--brand))', color: '#fff', padding: '24px 18px 28px' }}><CornerOrnament at="tr" /><div className="eyebrow eyebrow-light">Bem-vindo(a)</div><h1 className="h1" style={{ color: '#fff', marginTop: 6 }}>Sua área</h1><p className="body" style={{ color: 'rgba(255,255,255,0.78)', marginTop: 6, fontSize: 13 }}>Acompanhe seus pedidos, salve galerias favoritas e fale com a secretaria.</p></section>
      <section className="section">
        <div className="card" style={{ padding: 16, textAlign: 'center' }}><I.User className="icon icon-xl" style={{ margin: '0 auto', color: 'var(--brand)' }} /><h3 className="h3" style={{ marginTop: 10 }}>Acesse seus pedidos</h3><p className="body-sm" style={{ marginTop: 6 }}>Informe o e-mail usado na compra para receber novamente os links das suas fotos.</p><input className="input" placeholder="seu@email.com" style={{ marginTop: 14 }} /><button className="btn btn-primary btn-block" style={{ marginTop: 10 }} disabled title="Funcionalidade futura">Recuperar fotos</button></div>
        <div style={{ marginTop: 14 }} className="card"><MenuRow icon="Heart" label="Galerias favoritas" disabled /><MenuRow icon="Whatsapp" label="Falar com a secretaria" href="https://wa.me/5599991646063" /><MenuRow icon="Mail" label="Contato por e-mail" href="mailto:paroquiasaorafael@hotmail.com" /><MenuRow icon="Lock" label="Política de privacidade (LGPD)" onClick={() => go({ name: 'privacidade' })} last /></div>
        <div style={{ marginTop: 22, padding: 16, background: 'var(--surface-2)', borderRadius: 12, border: '1px solid var(--line)' }}><div className="eyebrow">Você é da Pascom?</div><p className="body-sm" style={{ marginTop: 6 }}>Acesse a área restrita para gerenciar uploads, ver vendas e moderar fotos.</p><button className="btn btn-outline btn-block" style={{ marginTop: 10 }} onClick={() => setRole('pascom')}><I.Lock className="icon" /> Entrar como Pascom</button></div>
      </section>
    </div>
  );
}

function PascomScreen({ go, setRole, eventos }) {
  return (
    <div className="scroll">
      <section style={{ background: 'linear-gradient(140deg, #1a0f1f 0%, var(--brand-d) 100%)', color: '#fff', padding: '20px 18px 24px', position: 'relative', overflow: 'hidden' }}><CornerOrnament at="tr" /><div className="eyebrow eyebrow-light">Painel Pascom</div><h1 className="h1" style={{ color: '#fff', marginTop: 6 }}>Boa tarde, Equipe!</h1><p className="body" style={{ color: 'rgba(255,255,255,0.78)', marginTop: 6, fontSize: 13 }}>Resumo de hoje · Quinta, 28 de maio de 2026.</p></section>
      <section style={{ padding: '14px 18px 0' }}><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}><BigStat label="Vendas hoje" value="--" delta="placeholder" /><BigStat label="Pedidos" value="--" delta="sem API" /><BigStat label="Mês até hoje" value="--" delta="relatório futuro" /><BigStat label="Aguardando" value="--" delta="processando" muted /></div></section>
      <section className="section"><h2 className="h3">Ações rápidas</h2><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}><ActionTile icon="Upload" label="Subir fotos" sub="Novo evento" primary /><ActionTile icon="Camera" label="Marca d'água" sub="Configurar" /><ActionTile icon="DollarSign" label="Vendas" sub="Relatório" /><ActionTile icon="Settings" label="Galerias" sub="Moderar" /></div></section>
      <section className="section"><h2 className="h3">Eventos publicados</h2><div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>{eventos.slice(0, 3).map((ev) => <button key={ev.id} onClick={() => go({ name: 'evento', eventoId: ev.id })} className="card" style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}><div style={{ width: 52, height: 52 }}><Photo photo={getCoverPhoto(ev)} aspect="1/1" showBadge={false} ornaments={false} /></div><div style={{ flex: 1 }}><strong style={{ color: 'var(--brand)', fontSize: 14 }}>{ev.titulo}</strong><div className="caption">{ev.totalFotos} fotos · publicado</div></div><span className="tag tag-green">Ativo</span></button>)}</div><button className="btn btn-ghost btn-block btn-sm" style={{ marginTop: 14 }} onClick={() => setRole('publico')}>Sair do modo Pascom</button></section>
    </div>
  );
}

function SortChip({ value, onChange }) { return <select className="tag" value={value} onChange={(event) => onChange(event.target.value)} style={{ border: 0, outline: 0 }}><option value="recentes">Recentes</option><option value="fotos">Mais fotos</option><option value="nome">A-Z</option></select>; }
function EventCard({ ev, onClick, isPascom }) { const cover = getCoverPhoto(ev); const photos = resolveEventPhotos(ev).slice(0, 3); return <div onClick={onClick} role="button" tabIndex="0" className="card" style={{ overflow: 'hidden', cursor: 'pointer' }}><CoverPhoto photo={cover} aspect="16/9"><div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.56), transparent 52%)' }} /><div style={{ position: 'absolute', left: 12, right: 12, bottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: 10 }}><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}><span className="pill pill-yellow">{categoryLabel(ev.sacramento)}</span><span className="pill"><I.Camera className="icon icon-sm" /> {ev.totalFotos}</span></div>{isPascom && <span className="tag tag-green">Publicado</span>}</div></CoverPhoto><div style={{ padding: 14 }}><h3 className="h3" style={{ lineHeight: 1.18 }}>{ev.titulo}</h3><div className="caption" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 7 }}><span><I.Calendar className="icon icon-sm" /> {ev.dataLabel || 'Data paroquial'}</span><span><I.MapPin className="icon icon-sm" /> {ev.local}</span></div><div style={{ display: 'flex', gap: 4, marginTop: 12 }}>{photos.map((photo) => <div key={photo.id || photo.photoId} style={{ width: 44, height: 44 }}><Photo photo={photo} aspect="1/1" showBadge={false} ornaments={false} /></div>)}<span className="caption" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginLeft: 4 }}><I.Camera className="icon icon-sm" /> {ev.totalFotos} fotos · {brl(PRECO_FOTO)} cada</span></div></div></div>; }
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
