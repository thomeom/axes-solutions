
window.renderHeader = function () {
  return `
  <header class="site-header">
    <div class="container nav">
      <a href="index.html" class="brand" data-testid="brand-link">
      <img src="../img/logo.png" class="brand-logo" alt="" data-i18n-alt="brand.logoAlt">
        <span>Axes Solutions</span>
      </a>

      <nav id="nav-links" class="nav-links" data-testid="nav-links">
        <a href="index.html" data-i18n="nav.home" data-testid="nav-home"></a>
        <a href="services.html" data-i18n="nav.services" data-testid="nav-services"></a>
        <a href="about.html" data-i18n="nav.about" data-testid="nav-about"></a>
        <a href="requests.html" data-i18n="nav.requests" data-testid="nav-requests"></a>
        <a href="project-tracker.html" data-i18n="nav.tracker" data-testid="nav-tracker"></a>
        <a href="reviews.html" data-i18n="nav.reviews" data-testid="nav-reviews"></a>
        <a href="contacts.html" data-i18n="nav.contacts" data-testid="nav-contacts"></a>
        <a href="account.html" data-i18n="nav.account" data-testid="nav-account"></a>
      </nav>

      <div class="nav-actions">
        <select id="lang-select" class="lang-select" data-testid="lang-select">
          <option value="ru">RU</option>
          <option value="kz">KZ</option>
          <option value="en">EN</option>
        </select>

        <button id="theme-toggle" class="icon-btn" data-testid="theme-toggle" data-i18n-aria="a11y.theme" aria-label=""></button>

        <button id="menu-toggle" class="icon-btn menu-toggle" data-testid="menu-toggle" data-i18n-aria="a11y.menu" aria-label="">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round">
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
      </div>
    </div>
  </header>`;
};

window.renderFooter = function () {
  return `
  <footer class="site-footer">
    <div class="container">
      <div class="footer-grid">

        <div>
          <div class="brand" style="margin-bottom:14px;">
          <img src="../img/logo.png" class="brand-logo" alt="" data-i18n-alt="brand.logoAlt">
            <span>Axes Solutions</span>
          </div>
          <p data-i18n="footer.tagline"></p>
        </div>

        <div>
          <h5 data-i18n="footer.nav"></h5>
          <a href="services.html" data-i18n="nav.services"></a>
          <a href="about.html" data-i18n="nav.about"></a>
          <a href="requests.html" data-i18n="nav.requests"></a>
          <a href="project-tracker.html" data-i18n="nav.tracker"></a>
          <a href="account.html" data-i18n="nav.account"></a>
          <a href="reviews.html" data-i18n="nav.reviews"></a>
        </div>

        <div>
          <h5 data-i18n="footer.contact"></h5>
          <p>+7 (727) 000-00-00</p>
          <p>hello@axessolution.com</p>
          <p data-i18n="contacts.location.value"></p>
        </div>

      </div>

      <div class="footer-bottom" data-i18n="footer.copyright"></div>
    </div>
  </footer>`;
};

window.mountLayout = function () {
  const headerSlot = document.getElementById("header-slot");
  const footerSlot = document.getElementById("footer-slot");

  if (headerSlot) headerSlot.outerHTML = window.renderHeader();
  if (footerSlot) footerSlot.outerHTML = window.renderFooter();
};
