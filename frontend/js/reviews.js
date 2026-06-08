function renderStars(n) {
  return "★".repeat(n) + "☆".repeat(5 - n);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));
}

async function loadReviews() {
  const grid = document.getElementById("reviews-grid");
  if (!grid) return;

  try {
    const list = await window.AX.api("/reviews");

    if (!Array.isArray(list) || list.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" data-testid="reviews-empty">
          ${window.I18N.t("reviews.empty")}
        </div>`;
      return;
    }

    grid.innerHTML = list.map(r => `
      <article class="review-card fade-in" data-testid="review-card">
        <div class="review-stars">${renderStars(r.rating || 0)}</div>
        <p class="review-text">${escapeHtml(r.text || "")}</p>

        <div class="review-author">
          <strong>${escapeHtml(r.name || "")}</strong>
          ${r.company ? `<span>${escapeHtml(r.company)}</span>` : ""}
        </div>
      </article>
    `).join("");

  } catch (e) {
    grid.innerHTML = `<div class="empty-state">⚠️ ${e.message}</div>`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadReviews();

  const form = document.getElementById("review-form");
  const success = document.getElementById("rv-success");

  if (!form) return;

  const showError = (id, key) => {
    const e = form.querySelector(`.form-error[data-for="${id}"]`);
    if (e) {
      e.textContent = window.I18N?.t(key) || key;
      e.classList.add("visible");
    }
  };

  const clearErrors = () => {
    form.querySelectorAll(".form-error")
      .forEach(x => x.classList.remove("visible"));
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    clearErrors();
    if (success) success.classList.remove("visible");

    const name = form.querySelector("#rv-name")?.value.trim() || "";
    const company = form.querySelector("#rv-company")?.value.trim() || "";
    const rating = Number(form.querySelector("#rv-rating")?.value || 5);
    const text = form.querySelector("#rv-text")?.value.trim() || "";

    let valid = true;

    if (name.length < 2) {
      showError("rv-name", "common.too_short");
      valid = false;
    }

    if (text.length < 5) {
      showError("rv-text", "common.too_short");
      valid = false;
    }

    if (!valid) return;

    try {
      await window.AX.api("/reviews", {
        method: "POST",
        body: JSON.stringify({ name, company, rating, text })
      });

      if (success) success.classList.add("visible");
      form.reset();

      window.AX.toast(window.I18N.t("reviews.success"), "success");

      loadReviews();

    } catch (err) {
      window.AX.toast(err.message || "Error", "error");
    }
  });
});