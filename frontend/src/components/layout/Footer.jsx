export default function Footer() {
  return (
    <footer id="contato" className="parish-footer">
      <div className="footer-columns">
        <div className="footer-brand">
          <img src="/assets/logo-footer.png" alt="Paroquia Sao Rafael" />
          <p>Celebrando a fe e preservando com cuidado as memorias da nossa comunidade.</p>
        </div>
        <div>
          <h2>Contato rapido</h2>
          <p>Acailandia - Maranhao</p>
          <a href="https://wa.me/559982061089">(99) 9 8206-1089</a>
          <a href="mailto:paroquiasaorafael@hotmail.com">paroquiasaorafael@hotmail.com</a>
        </div>
        <div>
          <h2>Fotografias</h2>
          <p>Previews protegidas com marca d&apos;agua. Arquivos finais sao liberados somente apos confirmacao do pagamento.</p>
        </div>
      </div>
      <div className="footer-legal">&copy; {new Date().getFullYear()} Paroquia Sao Rafael - Acailandia/MA</div>
      <div className="footer-motto" aria-hidden="true">
        <img src="/assets/footer-motto.svg" alt="" draggable="false" />
      </div>
    </footer>
  );
}
