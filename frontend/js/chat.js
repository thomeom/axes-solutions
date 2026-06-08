(function () {
  const CLIENT_KEY = "ax.chat.clientId";
  const OPEN_KEY = "ax.chat.open";
  const PROFILE_KEY = "ax.chat.profile";
  const POLL_MS = 3500;
  const storage = window.AXStorage || {
    getItem() { return null; },
    setItem() {},
    removeItem() {}
  };

  const state = {
    ready: false,
    open: storage.getItem(OPEN_KEY) === "1",
    messages: [],
    timer: null
  };

  const t = key => window.I18N?.t(key) || key;

  function clientId() {
    let id = storage.getItem(CLIENT_KEY);
    if (!id) {
      id = `client-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      storage.setItem(CLIENT_KEY, id);
    }
    return id;
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[char]));
  }

  function fmtTime(iso) {
    try {
      return new Date(iso).toLocaleTimeString(window.I18N?.locale() || "ru-RU", {
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return "";
    }
  }

  function profile() {
    try {
      return JSON.parse(storage.getItem(PROFILE_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function saveProfile(data) {
    storage.setItem(PROFILE_KEY, JSON.stringify(data));
  }

  function render() {
    if (document.getElementById("ax-chat")) return;

    const saved = profile();
    const root = document.createElement("div");
    root.id = "ax-chat";
    root.className = `chat-widget ${state.open ? "is-open" : ""}`;
    root.innerHTML = `
      <button class="chat-launcher" type="button" aria-label="" data-i18n-aria="chat.open">
        <span class="chat-launcher-dot"></span>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/>
        </svg>
      </button>

      <section class="chat-panel" aria-label="" data-i18n-aria="chat.panel">
        <header class="chat-header">
          <div>
            <strong data-i18n="chat.title"></strong>
            <span data-i18n="chat.subtitle"></span>
          </div>
          <button class="chat-close" type="button" aria-label="" data-i18n-aria="chat.close">×</button>
        </header>

        <div class="chat-profile">
          <input id="chat-name" type="text" placeholder="" data-i18n-ph="chat.name.ph" maxlength="80" value="${escapeHtml(saved.name || "")}">
          <input id="chat-email" type="email" placeholder="" data-i18n-ph="chat.email.ph" maxlength="120" value="${escapeHtml(saved.email || "")}">
        </div>

        <div class="chat-messages" id="chat-messages">
          <div class="chat-empty" data-i18n="chat.empty"></div>
        </div>

        <form class="chat-form" id="chat-form">
          <textarea id="chat-text" rows="2" maxlength="1200" placeholder="" data-i18n-ph="chat.text.ph" required></textarea>
          <button type="submit" aria-label="" data-i18n-aria="chat.send">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m22 2-7 20-4-9-9-4Z"/>
              <path d="M22 2 11 13"/>
            </svg>
          </button>
        </form>
      </section>
    `;

    document.body.appendChild(root);
    window.I18N?.apply();

    root.querySelector(".chat-launcher").addEventListener("click", () => {
      state.open = true;
      storage.setItem(OPEN_KEY, "1");
      root.classList.add("is-open");
      start();
    });

    root.querySelector(".chat-close").addEventListener("click", () => {
      state.open = false;
      storage.setItem(OPEN_KEY, "0");
      root.classList.remove("is-open");
    });

    root.querySelector("#chat-form").addEventListener("submit", send);

    root.querySelectorAll("#chat-name, #chat-email").forEach(input => {
      input.addEventListener("change", () => {
        const next = {
          name: document.getElementById("chat-name").value.trim(),
          email: document.getElementById("chat-email").value.trim()
        };
        saveProfile(next);
        start();
      });
    });

    if (state.open) start();
  }

  function drawMessages() {
    const box = document.getElementById("chat-messages");
    if (!box) return;

    if (!state.messages.length) return;

    box.innerHTML = state.messages.map(item => `
      <div class="chat-message ${item.sender === "client" ? "is-client" : "is-admin"}">
        <div>${escapeHtml(item.text)}</div>
        <time>${item.sender === "client" ? t("chat.you") : t("chat.manager")} · ${fmtTime(item.created_at)}</time>
      </div>
    `).join("");
    box.scrollTop = box.scrollHeight;
  }

  async function start() {
    if (!window.AX) return;

    const data = profile();
    try {
      await window.AX.api("/chat/start", {
        method: "POST",
        body: JSON.stringify({
          client_id: clientId(),
          name: data.name || "",
          email: data.email || null
        })
      });
      state.ready = true;
      await loadMessages();
      if (!state.timer) {
        state.timer = setInterval(loadMessages, POLL_MS);
      }
    } catch (err) {
      window.AX.toast(t("chat.unavailable"), "error");
    }
  }

  async function loadMessages() {
    if (!window.AX) return;

    try {
      const list = await window.AX.api(`/chat/${encodeURIComponent(clientId())}/messages`);
      const changed = list.length !== state.messages.length ||
        list.at(-1)?.id !== state.messages.at(-1)?.id;
      state.messages = list;
      if (changed) drawMessages();
    } catch (_) {}
  }

  async function send(event) {
    event.preventDefault();
    const text = document.getElementById("chat-text");
    const value = text.value.trim();
    if (!value) return;

    await start();
    if (!state.ready) return;

    try {
      await window.AX.api("/chat/message", {
        method: "POST",
        body: JSON.stringify({
          client_id: clientId(),
          text: value
        })
      });
      text.value = "";
      await loadMessages();
    } catch (err) {
      window.AX.toast(t("chat.sendError"), "error");
    }
  }

  window.AXChat = { render, start };

  document.addEventListener("DOMContentLoaded", render);
  window.addEventListener("i18n:change", drawMessages);
})();
