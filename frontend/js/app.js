const API = "http://127.0.0.1:8000/api";
const AX_STORAGE = window.AXStorage || {
  getItem() { return null; },
  setItem() {},
  removeItem() {}
};

window.AX = {
  API,

  
  initTheme() {
    if (document.body.classList.contains("admin-body") || document.body.classList.contains("admin-auth-body")) {
      document.documentElement.setAttribute("data-theme", "light");
      return;
    }

    const stored = AX_STORAGE.getItem("ax.theme") || "dark";
    document.documentElement.setAttribute("data-theme", stored);

    const btn = document.getElementById("theme-toggle");
    if (!btn) return;

    this.updateThemeIcon(stored);

    btn.addEventListener("click", () => {
      const cur = document.documentElement.getAttribute("data-theme");
      const next = cur === "dark" ? "light" : "dark";

      document.documentElement.setAttribute("data-theme", next);
      AX_STORAGE.setItem("ax.theme", next);

      this.updateThemeIcon(next);
    });
  },

  updateThemeIcon(theme) {
    const btn = document.getElementById("theme-toggle");
    if (!btn) return;

    btn.innerHTML =
      theme === "dark"
        ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="4"/>
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
          </svg>`
        : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>`;
  },

  
  initLang() {
    if (!window.I18N) return;

    const sel = document.getElementById("lang-select");

    if (sel) {
      sel.value = window.I18N.current;

      sel.addEventListener("change", e => {
        window.I18N.set(e.target.value);
      });
    }

    document.documentElement.lang = window.I18N.current === "kz" ? "kk" : window.I18N.current;
    window.I18N.apply();
  },

  
  initMenu() {
    const toggle = document.getElementById("menu-toggle");
    const links = document.getElementById("nav-links");

    if (!toggle || !links) return;

    toggle.addEventListener("click", () => {
      links.classList.toggle("open");
    });
  },

  
  highlightNav() {
    const path =
      window.location.pathname.split("/").pop() || "index.html";

    document.querySelectorAll("#nav-links a").forEach(a => {
      const href = a.getAttribute("href");
      const isServicePage = path.startsWith("service-") && href === "services.html";
      const isAdminPage = path === "admin.html" && href === "login.html";
      const isAccountPage = path === "login.html" && href === "account.html";

      if (href === path || isServicePage || isAdminPage || isAccountPage || (path === "" && href === "index.html")) {
        a.classList.add("active");
      }
    });
  },

  syncAuthNav() {
    const isAuthed = this.isAuthenticated();
    document.querySelectorAll('a[href="project-tracker.html"]').forEach(link => {
      link.hidden = !isAuthed;
      link.setAttribute("aria-hidden", isAuthed ? "false" : "true");
    });
  },

  initSpecialistSliders() {
    document.querySelectorAll(".specialists-grid").forEach(grid => {
      if (grid.closest(".specialists-slider")) return;

      const slider = document.createElement("div");
      slider.className = "specialists-slider";

      const controls = document.createElement("div");
      controls.className = "specialists-controls";

      const prev = document.createElement("button");
      prev.className = "specialists-arrow";
      prev.type = "button";
      prev.dataset.i18nAria = "a11y.slider.prev";
      prev.setAttribute("aria-label", window.I18N?.t("a11y.slider.prev") || "Previous specialists");
      prev.innerHTML = "‹";

      const next = document.createElement("button");
      next.className = "specialists-arrow";
      next.type = "button";
      next.dataset.i18nAria = "a11y.slider.next";
      next.setAttribute("aria-label", window.I18N?.t("a11y.slider.next") || "Next specialists");
      next.innerHTML = "›";

      controls.append(prev, next);
      grid.before(slider);
      slider.append(grid, controls);

      const scrollStep = () => {
        const card = grid.querySelector(".specialist-card");
        if (!card) return 320;

        const gap = parseFloat(getComputedStyle(grid).columnGap) || 22;
        return card.getBoundingClientRect().width + gap;
      };

      const updateButtons = () => {
        const maxScroll = grid.scrollWidth - grid.clientWidth - 2;
        prev.disabled = grid.scrollLeft <= 2;
        next.disabled = grid.scrollLeft >= maxScroll;
        slider.classList.toggle("is-scrollable", grid.scrollWidth > grid.clientWidth + 2);
      };

      prev.addEventListener("click", () => {
        grid.scrollBy({ left: -scrollStep(), behavior: "smooth" });
      });

      next.addEventListener("click", () => {
        grid.scrollBy({ left: scrollStep(), behavior: "smooth" });
      });

      grid.addEventListener("scroll", updateButtons, { passive: true });
      window.addEventListener("resize", updateButtons);
      updateButtons();
    });
  },

  
  toast(msg, type = "success") {
    let box = document.getElementById("toasts");

    if (!box) {
      box = document.createElement("div");
      box.id = "toasts";
      document.body.appendChild(box);
    }

    const el = document.createElement("div");
    el.className = `toast ${type}`;
    el.textContent = msg;

    box.appendChild(el);

    setTimeout(() => el.remove(), 3500);
  },

  
  async api(path, opts = {}) {
    const headers = {
      "Content-Type": "application/json",
      ...(opts.headers || {})
    };

    const token = AX_STORAGE.getItem("ax.token");

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(`${this.API}${path}`, {
      ...opts,
      headers
    });

    let data = null;

    try {
      data = await res.json();
    } catch (_) {}

    if (!res.ok) {
      const err = new Error(data?.detail || `HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }

    return data;
  },

  
  isAdmin() {
    return !!AX_STORAGE.getItem("ax.token") && this.userRole() === "admin";
  },

  isAuthenticated() {
    return !!AX_STORAGE.getItem("ax.token");
  },

  userRole() {
    const role = AX_STORAGE.getItem("ax.role") || "";
    if (role === "client") return "user";
    if (role === "manager" || role === "moderator") return "admin";
    return role;
  },

  canAccess(...roles) {
    const role = this.userRole();
    return roles.includes(role);
  },

  logout() {
    AX_STORAGE.removeItem("ax.token");
    AX_STORAGE.removeItem("ax.email");
    AX_STORAGE.removeItem("ax.role");
    AX_STORAGE.removeItem("ax.name");
    AX_STORAGE.removeItem("ax.company");
    window.location.href = "login.html";
  },

  
  validateEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  },

  
  init() {
    this.initTheme();
    this.initLang();
    this.initMenu();
    this.highlightNav();
    this.syncAuthNav();
    this.initSpecialistSliders();
    this.initChat();
  },

  initChat() {
    if (document.body.classList.contains("admin-body") || document.body.classList.contains("admin-auth-body")) {
      return;
    }

    if (window.AXChat) {
      window.AXChat.render();
      return;
    }

    const script = document.createElement("script");
    script.src = "../js/chat.js?v=backend-tracker";
    script.defer = true;
    script.onload = () => {
      if (window.AXChat) window.AXChat.render();
    };
    document.body.appendChild(script);
  }
};

document.addEventListener("DOMContentLoaded", () => {
  if (window.AX) window.AX.init();
});
