/* eslint-disable react/prop-types */
import { useState } from 'react';
import { I } from './referenceIcons.jsx';
import { brl, CornerOrnament, CoverPhoto, DevtoolsGalleryNotice, getCoverPhoto, PRECO_FOTO, Photo, categoryLabel } from './referenceUtils.jsx';
import { feeHints } from '../lib/fee-hints.js';
import { checkoutSchema } from '../lib/validation.js';

export function GaleriaFotosScreen({ ev, photos, loading, locked, accessCode, setAccessCode, accessError, unlock, go, cart, addToCart, removeFromCart, gridCols, setGridCols, offers = { coupons: [], packages: [] }, selectPackage, shareEvent, isDevtoolsOpen = false }) {
  if (!ev) return null;
  const cover = getCoverPhoto(ev);
  return (
    <div className="scroll mobile-event-detail-scroll" style={{ paddingBottom: cart.length > 0 ? 80 : 0 }}>
      <section className="mobile-event-detail-hero mobile-gallery-hero-full">
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
      <section className="mobile-protected-section"><FlowProtectedPreviewCard /></section>
      {locked ? <AccessCard code={accessCode} setCode={setAccessCode} error={accessError} unlock={unlock} /> : <PhotoGrid ev={ev} photos={photos} loading={loading} go={go} cart={cart} addToCart={addToCart} removeFromCart={removeFromCart} gridCols={gridCols} setGridCols={setGridCols} offers={offers} selectPackage={selectPackage} isDevtoolsOpen={isDevtoolsOpen} />}
    </div>
  );
}

function PhotoGrid({ ev, photos, loading, go, cart, addToCart, removeFromCart, gridCols, setGridCols, sticky = true, offers = { coupons: [], packages: [] }, selectPackage, isDevtoolsOpen = false }) {
  const selectedIds = new Set(cart.map((item) => item.photoId));
  return (
    <section className="section mobile-gallery-section" style={{ paddingTop: 12, paddingBottom: sticky && cart.length > 0 ? 92 : undefined }}>
      <div className="mobile-gallery-strip-head">
        <strong>{photos.length || ev.totalFotos} fotos</strong>
        <DensityToggle value={gridCols} onChange={setGridCols} />
      </div>
      {(offers.packages?.length > 0 || offers.coupons?.length > 0) && <div className="mobile-offers-card card" style={{ padding: 12, marginTop: 10 }}><div className="eyebrow">Compra pastoral</div><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>{offers.packages?.map((pkg) => <button key={pkg.id} className="tag tag-yellow" onClick={() => selectPackage?.(pkg)}>{pkg.description || 'Aplicar pacote'}</button>)}{offers.coupons?.map((coupon) => <span key={coupon.code} className="tag">Cupom {coupon.code}</span>)}</div></div>}
      {isDevtoolsOpen && <DevtoolsGalleryNotice />}
      {loading ? <div className="card" style={{ height: 220, background: 'var(--surface-2)' }} /> : <div className="mobile-gallery-grid" style={{ gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}>{photos.map((photo, index) => {
        const selected = selectedIds.has(photo.photoId);
        return <Photo key={photo.photoId} photo={photo} aspect="1/1" selected={selected} onClick={() => go({ name: 'foto', eventoId: ev.id, photoIdx: index })}><button className="photo-add" onClick={(event) => { event.stopPropagation(); selected ? removeFromCart(photo.photoId) : addToCart(photo); }}>{selected ? <I.Check className="icon icon-sm" /> : <I.Plus className="icon icon-sm" />}</button></Photo>;
      })}</div>}
      <FlowPriceHelpCard />
    </section>
  );
}

export function FotoLightboxScreen({ ev, photos, idx, go, cart, addToCart, removeFromCart, isDevtoolsOpen = false }) {
  const index = Math.max(0, Math.min(Number(idx || 0), photos.length - 1));
  const photo = photos[index];
  if (!photo) return null;
  const selected = cart.some((item) => item.photoId === photo.photoId);
  const toggle = () => selected ? removeFromCart(photo.photoId) : addToCart(photo);
  return (
    <div className="mobile-lightbox-screen">
      <div className="mobile-lightbox-top"><button className="mobile-lightbox-close" onClick={() => go({ name: 'galeria', eventoId: ev.id })}><I.X className="icon" /></button><div className="mobile-lightbox-counter"><span>Foto</span><strong>{String(index + 1).padStart(2, '0')} / {photos.length}</strong></div><span aria-hidden="true" /></div>
      <div className="mobile-lightbox-frame" onContextMenu={(event) => event.preventDefault()}>
        <Photo photo={{ ...photo, src: photo.fullSrc || photo.src }} aspect="1/1" showBadge ornaments selected={selected} />
        <button className="mobile-lightbox-nav prev" onClick={() => go({ name: 'foto', eventoId: ev.id, photoIdx: Math.max(0, index - 1) })}><I.ChevronLeft className="icon" /></button>
        <button className="mobile-lightbox-nav next" onClick={() => go({ name: 'foto', eventoId: ev.id, photoIdx: Math.min(photos.length - 1, index + 1) })}><I.ChevronRight className="icon" /></button>
      </div>
      {isDevtoolsOpen && <div style={{ padding: '0 18px' }}><DevtoolsGalleryNotice /></div>}
      <div className="mobile-lightbox-info"><div className="eyebrow">{categoryLabel(ev.sacramento)}</div><h2>{photo.caption}</h2><span className="pill mobile-lightbox-protected"><I.Lock className="icon icon-sm" /> Prévia protegida</span><p>A foto adquirida será entregue em alta resolução, <strong>sem marca d&apos;água</strong>, por e-mail e WhatsApp.</p><button className="btn btn-primary btn-block" onClick={toggle}>{selected ? <><I.Check className="icon" /> Foto selecionada · {brl(photo.price)}</> : <><I.Plus className="icon" /> Selecionar por {brl(photo.price)}</>}</button></div>
    </div>
  );
}

export function CarrinhoScreen({ cart, removeFromCart, go, close }) {
  const subtotal = cart.reduce((sum, item) => sum + Number(item.price || PRECO_FOTO), 0);
  return <div className="sheet-overlay" onClick={close}><div className="sheet" onClick={(event) => event.stopPropagation()}><div className="sheet-handle" /><div style={{ padding: '0 18px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div><div className="eyebrow">Sua seleção</div><h2 className="h2" style={{ marginTop: 4 }}>{cart.length} {cart.length === 1 ? 'foto' : 'fotos'}</h2></div><button onClick={close} className="appbar-icon-btn"><I.X className="icon" /></button></div>{cart.length === 0 ? <div style={{ padding: '30px 18px 40px', textAlign: 'center' }}><I.Bag className="icon icon-xl" style={{ margin: '0 auto', color: 'var(--ink-4)' }} /><p className="body" style={{ marginTop: 12 }}>Nenhuma foto selecionada ainda.</p><button className="btn btn-secondary" style={{ marginTop: 14 }} onClick={close}>Continuar vendo galerias</button></div> : <><div style={{ maxHeight: 260, overflow: 'auto', padding: '0 18px' }}>{cart.map((item) => <div key={item.photoId} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--line)' }}><div style={{ width: 54, height: 54, flexShrink: 0 }}><Photo photo={item} aspect="1/1" showBadge={false} ornaments={false} /></div><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.caption}</div><div className="caption" style={{ marginTop: 2 }}>{item.eventoTitulo}</div><div className="caption" style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', color: 'var(--accent-d)', textTransform: 'uppercase' }}>{brl(item.price)}</div></div><button className="appbar-icon-btn" onClick={() => removeFromCart(item.photoId)}><I.Trash className="icon icon-sm" /></button></div>)}</div><div style={{ padding: 18 }}><div className="card" style={{ padding: 14 }}><div className="eyebrow">Resumo</div><Row k={<strong style={{ color: 'var(--brand)' }}>Subtotal</strong>} v={<strong style={{ color: 'var(--brand)', fontFamily: 'var(--font-display)', fontSize: 18 }}>{brl(subtotal)}</strong>} /><p className="caption" style={{ marginTop: 10 }}>As taxas de serviço e de comodidade são o custo do Stripe e entram no pagamento, conforme Pix ou cartão.</p></div><p className="caption" style={{ marginTop: 10, display: 'flex', gap: 6 }}><I.Lock className="icon icon-sm" /> Pagamento processado no ambiente seguro do Stripe. LGPD.</p><button className="btn btn-primary btn-block" style={{ marginTop: 14 }} onClick={() => { close(); go({ name: 'checkout' }); }}>Finalizar compra</button></div></>}</div></div>;
}

export function CartBar({ cart, onClick }) {
  const subtotal = cart.reduce((sum, item) => sum + Number(item.price || PRECO_FOTO), 0);
  return <button className="cart-bar" onClick={onClick} style={{ width: '100%', cursor: 'pointer', textAlign: 'left' }}><div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, flex: 1 }}><span className="cart-bar-icon" style={{ width: 42, height: 42, borderRadius: 10, background: 'var(--brand)', color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}><I.Bag className="icon" /><span className="mobile-count-badge" style={{ position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, padding: '0 4px', borderRadius: 999, background: 'var(--accent)', color: 'var(--brand-d)', fontSize: 10, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--surface)' }}>{cart.length}</span></span><div className="cart-bar-info"><div className="count">{cart.length} {cart.length === 1 ? 'foto' : 'fotos'}</div><div className="sub">Subtotal {brl(subtotal)}</div></div></div><span className="btn btn-primary btn-sm" style={{ minHeight: 36 }}>Finalizar <I.ChevronRight className="icon icon-sm" /></span></button>;
}

export function CheckoutScreen({ cart, pricing, buyer, setBuyer, method, setMethod, couponCode = '', setCouponCode, error, loading, removeFromCart, go, pay }) {
  const [step, setStep] = useState(1);
  const [resumoOpen, setResumoOpen] = useState(false);
  const subtotal = cart.reduce((sum, item) => sum + Number(item.price || PRECO_FOTO), 0);
  const total = pricing?.total ?? subtotal;
  const canAdvance = checkoutSchema.safeParse(buyer).success;
  return (
    <div className="scroll" style={{ paddingBottom: 100 }}>
      <section style={{ background: 'linear-gradient(160deg, var(--brand-d) 0%, var(--brand) 100%)', color: '#fff', padding: '58px 18px 22px', position: 'relative', overflow: 'hidden' }}>
        <button onClick={() => go({ name: 'galerias' })} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: 600, marginBottom: 10 }}><I.ChevronLeft className="icon icon-sm" /> Voltar</button>
        <div className="eyebrow eyebrow-light">Compra segura</div>
        <h1 className="h1" style={{ color: '#fff', marginTop: 6 }}>Finalizar compra</h1>
        <p className="body" style={{ color: 'rgba(255,255,255,0.75)', marginTop: 4, fontSize: 13 }}>Pagamento processado no ambiente do Stripe.</p>
        <div style={{ display: 'flex', gap: 6, marginTop: 16, alignItems: 'center' }}><Step n={1} label="Identifica??o" active={step === 1} done={step > 1} /><span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.20)' }} /><Step n={2} label="Pagamento" active={step === 2} done={step > 2} /></div>
      </section>
      <button onClick={() => setResumoOpen(!resumoOpen)} style={{ width: '100%', padding: '14px 18px', background: 'var(--surface-2)', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left' }}>
        <div><div className="eyebrow">Resumo</div><div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--brand)', marginTop: 2 }}>{cart.length} {cart.length === 1 ? 'foto' : 'fotos'} ? {brl(total)}</div></div>
        <I.ChevronDown className="icon" style={{ transition: 'transform 200ms', transform: resumoOpen ? 'rotate(180deg)' : 'rotate(0)', color: 'var(--brand)' }} />
      </button>
      {resumoOpen && <CartSummary cart={cart} subtotal={subtotal} total={total} pricing={pricing} removeFromCart={removeFromCart} />}
      {step === 1 ? (
        <section className="section">
          <h2 className="h3">1. Identifica??o e entrega</h2>
          <p className="body-sm" style={{ marginTop: 6 }}>As fotos em alta resolu??o ser?o enviadas pelos canais abaixo.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16 }}>
            <Field label="Nome completo" value={buyer.name} onChange={(value) => setBuyer({ ...buyer, name: value })} placeholder="Ex.: Maria Aparecida Souza" />
            <Field label="E-mail" value={buyer.email} onChange={(value) => setBuyer({ ...buyer, email: value })} placeholder="seu@email.com" type="email" hint="O e-mail recebe os links automaticamente." />
            <Field label="WhatsApp" value={buyer.whatsapp} onChange={(value) => setBuyer({ ...buyer, whatsapp: value.replace(/\D/g, '') })} placeholder="(99) 99982-0610" hint="Usado pela secretaria para envio assistido, se necess?rio." />
          </div>
          <div className="checkout-privacy-note" style={{ marginTop: 16, padding: 12, background: 'rgba(109,32,119,0.06)', border: '1px solid var(--line)', borderRadius: 10, display: 'flex', gap: 8, alignItems: 'flex-start' }}><I.Lock className="icon icon-sm" style={{ color: 'var(--brand)', flexShrink: 0, marginTop: 2 }} /><p className="caption" style={{ color: 'var(--ink-2)' }}>Seus dados s?o protegidos conforme a <strong>LGPD</strong> e usados apenas para entrega das fotos.</p></div>
          {error && <p className="caption" style={{ color: 'var(--danger)', marginTop: 10 }}>{error}</p>}
          <button className="btn btn-primary btn-block" style={{ marginTop: 18 }} disabled={!canAdvance} onClick={() => canAdvance && setStep(2)}>Continuar para pagamento <I.ChevronRight className="icon" /></button>
        </section>
      ) : (
        <section className="section">
          <h2 className="h3">2. Forma de pagamento</h2>
          <p className="body-sm" style={{ marginTop: 6 }}>Pague de forma segura. Ap?s confirma??o, a fila de processamento entrega suas fotos.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
            <PayOption id="pix" value={method} onChange={setMethod} icon={I.Pix} title="Pix" hint="Confirmação rápida · menor taxa" tag="Recomendado" />
            <PayOption id="caixa" value={method} onChange={() => {}} icon={I.Bank} title="D?bito virtual CAIXA" hint="Visual do prot?tipo ? funcionalidade futura" disabled />
            <PayOption id="credit_card" value={method} onChange={setMethod} icon={I.CreditCard} title="Cart?o de cr?dito" hint="Crédito em 1x · Stripe" />
          </div>
          {setCouponCode && <Field label="Cupom pastoral" value={couponCode} onChange={(value) => setCouponCode(value.toUpperCase())} placeholder="PASTORAL10" hint="Validado pela par?quia antes do pagamento." />}
          <div style={{ marginTop: 16, padding: 12, background: 'var(--surface-2)', borderRadius: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><span style={{ color: 'var(--ink-3)' }}>Total a pagar</span><strong style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--brand)' }}>{brl(total)}</strong></div>
            {pricing?.discountTotal > 0 && <div className="caption" style={{ marginTop: 6, color: 'var(--parish-green)' }}>Desconto aplicado: {brl(pricing.discountTotal)}</div>}
          </div>
          {error && <p className="caption" style={{ color: 'var(--danger)', marginTop: 10 }}>{error}</p>}
          <button className="btn btn-primary btn-block" style={{ marginTop: 18 }} disabled={loading || !pricing} onClick={pay}>{loading ? 'Abrindo Stripe...' : 'Pagar no Stripe'}</button>
          <button className="btn btn-ghost btn-block btn-sm" style={{ marginTop: 8 }} onClick={() => setStep(1)}>Voltar ? identifica??o</button>
        </section>
      )}
    </div>
  );
}

export function PaymentReturnScreen({ approved, order, go }) {
  const status = order?.status || 'processando retorno do pagamento';
  return (
    <div className="scroll">
      <section style={{ background: 'linear-gradient(160deg, var(--brand-d) 0%, var(--brand) 60%, var(--brand-d) 100%)', color: '#fff', padding: '40px 18px 56px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <CornerOrnament at="tl" /><CornerOrnament at="tr" /><CornerOrnament at="bl" /><CornerOrnament at="br" />
        <div style={{ width: 84, height: 84, margin: '0 auto', borderRadius: 999, background: approved ? 'var(--parish-yellow)' : 'rgba(247,200,72,0.24)', color: approved ? 'var(--parish-purple-dark)' : 'var(--parish-yellow)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 8px rgba(247,200,72,0.18)' }}>{approved ? <I.Check className="icon" style={{ width: 38, height: 38, strokeWidth: 3 }} /> : <I.Clock className="icon" style={{ width: 38, height: 38 }} />}</div>
        <div className="eyebrow eyebrow-light" style={{ marginTop: 18 }}>{approved ? 'Pagamento confirmado' : 'Pagamento em acompanhamento'}</div><h1 className="h1" style={{ color: '#fff', marginTop: 6 }}>{approved ? 'Suas fotos estão a caminho.' : 'Estamos aguardando a confirmação.'}</h1><p className="body" style={{ color: 'rgba(255,255,255,0.80)', marginTop: 8 }}>{approved ? 'Suas fotos em alta resolução serão enviadas em instantes.' : 'Assim que o Stripe confirmar, a entrega será liberada.'}</p>
      </section>
      <section className="section" style={{ marginTop: -32, position: 'relative' }}><div className="card card-shadow" style={{ padding: 16 }}><div className="eyebrow">Pedido</div><h3 className="h3" style={{ marginTop: 4 }}>{order?.pedidoId || 'Consulta em tempo real'}</h3><div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}><DeliveryRow icon="Mail" k="Status" v={status} /><DeliveryRow icon="Camera" k="Entrega" v={approved ? 'links seguros serão enviados' : 'aguardando confirmação'} /></div></div><div style={{ marginTop: 14, padding: 14, background: 'rgba(60,122,90,0.08)', border: '1px solid rgba(60,122,90,0.20)', borderRadius: 10, display: 'flex', gap: 10, alignItems: 'flex-start' }}><I.Sparkle className="icon" style={{ color: 'var(--parish-green)', flexShrink: 0, marginTop: 2 }} /><div><div style={{ fontSize: 13, fontWeight: 700, color: 'var(--parish-green)' }}>Como funciona a entrega</div><p className="caption" style={{ marginTop: 4 }}>Assim que o pagamento for confirmado, nosso sistema libera os links de download e envia o acesso automaticamente.</p></div></div><button className="btn btn-secondary btn-block" style={{ marginTop: 18 }} onClick={() => go({ name: 'home' })}>Voltar ao início</button><button className="btn btn-ghost btn-block btn-sm" style={{ marginTop: 8 }} onClick={() => go({ name: 'galerias' })}>Explorar mais galerias</button><div className="caption" style={{ textAlign: 'center', marginTop: 18 }}>Dúvidas? Fale com a secretaria pelo WhatsApp (99) 99164-6063.</div></section>
    </div>
  );
}

function CartSummary({ cart, subtotal, total, pricing, removeFromCart }) { const hints = feeHints(pricing); return <div style={{ padding: '14px 18px', background: 'var(--surface-2)', borderBottom: '1px solid var(--line)' }}><div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>{cart.map((item) => <div key={item.photoId} style={{ display: 'flex', gap: 10, alignItems: 'center' }}><div style={{ width: 44, height: 44, flexShrink: 0 }}><Photo photo={item} aspect="1/1" showBadge={false} /></div><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.caption}</div><div className="caption">{item.eventoTitulo}</div></div><span style={{ fontSize: 13, fontWeight: 700, color: 'var(--brand)' }}>{brl(item.price || PRECO_FOTO)}</span><button className="appbar-icon-btn" onClick={() => removeFromCart(item.photoId)}><I.Trash className="icon icon-sm" /></button></div>)}</div><div style={{ display: 'flex', flexDirection: 'column', gap: 5, paddingTop: 10, borderTop: '1px solid var(--line)' }}><Row k="Subtotal" v={brl(subtotal)} /><Row k="Taxa de serviço" v={pricing ? brl(pricing.serviceFee) : '--'} />{hints.service && <p className="caption">{hints.service}</p>}<Row k="Taxa de comodidade" v={pricing ? brl(pricing.convenienceFee) : '--'} />{hints.convenience && <p className="caption">{hints.convenience}</p>}<Row k={<strong>Total</strong>} v={<strong>{brl(total)}</strong>} /></div></div>; }
function AccessCard({ code, setCode, error, unlock }) { return <section className="section"><form className="card" style={{ padding: 18, textAlign: 'center' }} onSubmit={unlock}><I.Lock className="icon icon-xl" style={{ margin: '0 auto', color: 'var(--brand)' }} /><h2 className="h3" style={{ marginTop: 10 }}>Galeria protegida</h2><p className="body-sm" style={{ marginTop: 6 }}>Informe o código compartilhado pela secretaria.</p><input className="input" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="Código do evento" style={{ marginTop: 14 }} />{error && <p className="caption" style={{ color: 'var(--danger)', marginTop: 8 }}>{error}</p>}<button className="btn btn-primary btn-block" style={{ marginTop: 12 }}>Acessar galeria</button></form></section>; }
function MetaItem({ icon, children }) { const Icon = I[icon]; return <span className="mobile-event-meta-item"><span><Icon className="icon icon-sm" /></span>{children}</span>; }
function FlowProtectedPreviewCard() { return <div className="mobile-protected-card"><I.Lock className="icon" /><div><div className="mobile-protected-title">Prévia protegida</div><p>As prévias têm marca d&apos;água. A foto adquirida é entregue em alta resolução, sem marca, por e-mail e WhatsApp.</p></div></div>; }
function FlowPriceHelpCard() { return <div className="mobile-price-help-card"><div><div className="caption">Cada foto custa</div><strong>{brl(PRECO_FOTO)}</strong></div><a className="btn btn-outline btn-sm" href="https://wa.me/5599991646063" target="_blank" rel="noopener noreferrer"><I.Whatsapp className="icon icon-sm" /> Tirar dúvidas</a></div>; }
function DensityToggle({ value, onChange }) { return <div style={{ display: 'inline-flex', background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 10, padding: 2 }}>{[2, 3, 4].map((item) => <button key={item} className={item === value ? 'tag tag-yellow' : 'tag'} style={{ fontSize: 10 }} onClick={() => onChange(item)}>{item}×</button>)}</div>; }
function Row({ k, v }) { return <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, paddingTop: 10, marginTop: 10, borderTop: '1px solid var(--line)', fontSize: 13 }}><span style={{ color: 'var(--ink-3)' }}>{k}</span><span style={{ color: 'var(--ink)', fontWeight: 700 }}>{v}</span></div>; }
function Step({ n, label, active, done }) { return <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><span style={{ width: 26, height: 26, borderRadius: 999, background: done ? 'var(--parish-yellow)' : active ? '#fff' : 'rgba(255,255,255,0.15)', color: (done || active) ? 'var(--parish-purple)' : 'rgba(255,255,255,0.5)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>{done ? <I.Check className="icon icon-sm" /> : n}</span><span style={{ fontSize: 12, fontWeight: 600, color: (done || active) ? '#fff' : 'rgba(255,255,255,0.55)' }}>{label}</span></div>; }
function Field({ label, value, onChange, placeholder, type = 'text', hint }) { return <label className="field"><span>{label}</span><input className="input" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} type={type} />{hint && <p className="caption">{hint}</p>}</label>; }
function PayOption({ id, value, onChange, icon: Icon, title, hint, tag, disabled }) { const active = id === value; return <button onClick={() => !disabled && onChange(id)} disabled={disabled} style={{ textAlign: 'left', background: active ? 'rgba(247,200,72,0.10)' : 'var(--surface)', border: '1.5px solid ' + (active ? 'var(--accent-d)' : 'var(--line)'), borderRadius: 12, padding: 14, display: 'flex', alignItems: 'center', gap: 12, position: 'relative', opacity: disabled ? 0.58 : 1 }} title={disabled ? 'Funcionalidade futura' : undefined}><span style={{ width: 44, height: 44, borderRadius: 10, background: active ? 'var(--brand)' : 'var(--surface-2)', color: active ? 'var(--accent)' : 'var(--brand)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon className="icon" /></span><div style={{ flex: 1, minWidth: 0 }}><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ fontSize: 14, fontWeight: 700, color: 'var(--brand)' }}>{title}</span>{tag && <span className="tag tag-yellow" style={{ fontSize: 9 }}>{tag}</span>}</div><div className="caption" style={{ marginTop: 2 }}>{hint}</div></div><span style={{ width: 22, height: 22, borderRadius: 999, border: '2px solid ' + (active ? 'var(--accent-d)' : 'var(--ink-4)'), background: active ? 'var(--accent-d)' : 'transparent', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{active && <I.Check className="icon icon-sm" style={{ color: '#fff', strokeWidth: 3, width: 12, height: 12 }} />}</span></button>; }
function DeliveryRow({ icon, k, v }) { const Icon = I[icon] || I.Sparkle; return <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px dashed var(--line)' }}><span style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(247,200,72,0.18)', color: 'var(--accent-d)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Icon className="icon icon-sm" /></span><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.12em', color: 'var(--ink-3)', textTransform: 'uppercase' }}>{k}</div><div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v}</div></div></div>; }
