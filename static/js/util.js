// =========================
// Form (calc + copy)
// =========================
(() => {
  const form = document.getElementById("orderForm");
  if (!form) return;

  const estEl = document.getElementById("estAmount");
  const btnCopy = document.getElementById("formCopy");
  const btnReset = document.getElementById("formReset");

  // ---- pricing ----
  const PRICING = {
    base: {
      custom: 250000,
      light: 200000,
      omakase: 180000,
      migrate: 100000,
    },
    add: {
      add_color_preset: 5000,
      add_embargo: 20000,
      add_private_portfolio: 50000,
      add_tip_platform: 10000,
      add_after_revision: 10000,
    },
    multiplier: {
      add_fast_deadline: 1.5,
      add_same_day: 2,
    },
  };

  const fmt = (n) => {
    const v = Number.isFinite(n) ? Math.round(n) : 0;
    return v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const qs = (sel) => form.querySelector(sel);
  const qsa = (sel) => Array.from(form.querySelectorAll(sel));

  function getRadio(name) {
    const el = qs(`input[type="radio"][name="${name}"]:checked`);
    return el ? el.value : "";
  }

  function getCheck(name) {
    const el = qs(`input[type="checkbox"][name="${name}"]`);
    return !!(el && el.checked);
  }

  function getTextValueFallback() {
    const urlInputs = qsa('input[type="url"].fInput, input[type="url"]');
    const streamUrl = urlInputs[0]?.value?.trim() || "";
    const chatPlatform = urlInputs[1]?.value?.trim() || "";
    return { streamUrl, chatPlatform };
  }

  function calcEstimate() {
    const baseOpt = getRadio("base_option") || "custom";
    const base = PRICING.base[baseOpt] ?? 0;

    let addSum = 0;
    Object.entries(PRICING.add).forEach(([k, v]) => {
      if (getCheck(k)) addSum += v;
    });

    let mult = 1;
    const fast = getCheck("add_fast_deadline");
    const sameDay = getCheck("add_same_day");

    if (sameDay) mult = PRICING.multiplier.add_same_day;
    else if (fast) mult = PRICING.multiplier.add_fast_deadline;

    const total = (base + addSum) * mult;

    if (estEl) estEl.textContent = fmt(total);
    return Math.round(total);
  }

  // ---- copy helpers ----
  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand("copy");
        ta.remove();
        return ok;
      } catch {
        return false;
      }
    }
  }

  function buildCopyTemplate() {
    const { streamUrl, chatPlatform } = getTextValueFallback();

    const baseOpt = getRadio("base_option") || "custom";

    const baseLabelMap = {
      custom: "커스텀 채팅 패키지",
      light: "라이트 패키지",
      omakase: "무컨펌 오마카세",
      migrate: "CSS 이식",
    };

    const baseLabel = baseLabelMap[baseOpt] || "커스텀 채팅 패키지";

    const optLabels = [];
    if (getCheck("add_color_preset")) optLabels.push("컬러 프리셋");
    if (getCheck("add_tip_platform")) optLabels.push("후원 플랫폼 추가");
    if (getCheck("add_embargo")) optLabels.push("엠바고");
    if (getCheck("add_private_portfolio")) optLabels.push("포트폴리오 비공개");
    if (getCheck("add_fast_deadline")) optLabels.push("빠른 마감");
    if (getCheck("add_same_day")) optLabels.push("72h 이내 작업");
    if (getCheck("add_after_revision")) optLabels.push("완료 후 추가 수정");

    const showNickname = getRadio("show_nickname") || "yes";
    const showTipNickname = getRadio("show_tip_nickname") || "yes";

    const dueDate = (qs('input[name="due_date"]')?.value || "").trim();
    const sampleOpen = (qs('input[name="sample_open_date"]')?.value || "").trim();
    const refs = (qs('textarea[name="refs"]')?.value || "").trim();

    const est = calcEstimate();

    return [
      "📌 채팅 CSS 신청 양식",
      "",
      `- 방송 플랫폼 주소: ${streamUrl || "-"}`,
      `- 채팅창 플랫폼: ${chatPlatform || "-"}`,
      `- 옵션 선택: ${baseLabel}`,
      `- 추가 옵션: ${optLabels.length ? optLabels.join(", ") : "-"}`,
      `- 닉네임 표시: ${showNickname.toUpperCase()}`,
      `- 후원 테마 닉네임 표시: ${showTipNickname.toUpperCase()}`,
      `- 희망 마감일: ${dueDate || "-"}`,
      `- 샘플 공개 일정: ${sampleOpen || "-"}`,
      `- 스타일/참고 자료:\n${refs || "-"}`,
      "",
      `💰 예상 견적: ₩${fmt(est)}`,
    ].join("\n");
  }

  // ---- events ----
  form.addEventListener("input", () => calcEstimate());
  form.addEventListener("change", () => calcEstimate());
  form.addEventListener("reset", () => {
    setTimeout(() => {
      if (estEl) estEl.textContent = "0";
    }, 0);
  });

  btnCopy?.addEventListener("click", async () => {
    const text = buildCopyTemplate();
    const ok = await copyText(text);

    const old = btnCopy.textContent;
    btnCopy.textContent = ok ? "복사 완료!" : "복사 실패";
    btnCopy.disabled = true;
    setTimeout(() => {
      btnCopy.textContent = old;
      btnCopy.disabled = false;
    }, 900);
  });

  calcEstimate();
})();