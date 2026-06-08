document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("request-form");
  const success = document.getElementById("rq-success");

  if (!form) return;

  const showError = (id, key) => {
    const e = form.querySelector(`.form-error[data-for="${id}"]`);
    if (e) {
      e.textContent = window.I18N.t(key);
      e.classList.add("visible");
    }
  };

  const clearErrors = () => {
    form.querySelectorAll(".form-error").forEach(e =>
      e.classList.remove("visible")
    );
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    clearErrors();
    if (success) success.classList.remove("visible");

    const company = form.company?.value?.trim() || "";
    const email = form.email?.value?.trim() || "";
    const service = form.service?.value || "";
    const message = form.message?.value?.trim() || "";

    let valid = true;

    if (company.length < 2) {
      showError("rq-company", "common.too_short");
      valid = false;
    }

    if (!window.AX.validateEmail(email)) {
      showError("rq-email", "common.invalid_email");
      valid = false;
    }

    if (!service) {
      showError("rq-service", "common.required");
      valid = false;
    }

    if (message.length < 5) {
      showError("rq-message", "common.too_short");
      valid = false;
    }

    if (!valid) return;

    try {
      await window.AX.api("/requests", {
        method: "POST",
        body: JSON.stringify({ company, email, service, message })
      });

      if (success) success.classList.add("visible");

      form.reset();

      window.AX.toast(
        window.I18N.t("requests.success"),
        "success"
      );

      window.scrollTo({ top: 0, behavior: "smooth" });

    } catch (err) {
      window.AX.toast(
        window.I18N.t("requests.error") || err.message,
        "error"
      );
    }
  });
});
