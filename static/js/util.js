(() => {
  const nav = document.getElementById("nav");
  const links = Array.from(document.querySelectorAll(".topnav__links a"));
  const sections = links
    .map((a) => document.querySelector(a.getAttribute("href")))
    .filter(Boolean);

  const onScrollHeader = () => {
    if (!nav) return;
    nav.classList.toggle("is-scrolled", window.scrollY > 8);
  };

  const setActive = (id) => {
    links.forEach((a) => {
      const href = a.getAttribute("href");
      a.classList.toggle("is-active", href === `#${id}`);
    });
  };

  const pickBestSection = (entries) => {
    const headerOffset = 110;
    const candidates = entries
      .filter((e) => e.isIntersecting && e.target?.id)
      .map((e) => ({
        id: e.target.id,
        top: e.boundingClientRect.top,
        ratio: e.intersectionRatio,
      }));

    if (!candidates.length) return null;

    candidates.sort((a, b) => {
      const da = Math.abs(a.top - headerOffset);
      const db = Math.abs(b.top - headerOffset);
      if (da !== db) return da - db;

      return b.ratio - a.ratio;
    });

    return candidates[0]?.id || null;
  };

  const io = new IntersectionObserver(
    (entries) => {
      const id = pickBestSection(entries);
      if (id) setActive(id);
    },
    {
      root: null,
      threshold: [0.1, 0.2, 0.35, 0.5],
      rootMargin: "-15% 0px -70% 0px",
    }
  );

  sections.forEach((sec) => io.observe(sec));

  window.addEventListener("scroll", onScrollHeader, { passive: true });
  onScrollHeader();

  window.addEventListener(
    "load",
    () => {
      window.dispatchEvent(new Event("scroll"));
    },
    { once: true }
  );
})();

// =========================
// Form (Estimate + Copy)
// =========================
(() => {
  const form = document.getElementById("orderForm");
  if (!form) return;

  const estEl = document.getElementById("estAmount");
  const btnCopy = document.getElementById("formCopy");
  const btnReset = document.getElementById("formReset");

  // ---- pricing (index.html 가격표 기준) ----
  // 커스텀 채팅 패키지: 250,000 / CSS 이식: 100,000
  // 컬러 프리셋 +5,000 / 엠바고 +20,000 / 포트폴리오 비공개 +30,000 / 후원 플랫폼 추가 +10,000
  // 빠른 마감 ×1.5 / 당일 마감 ×2
  const PRICING = {
    base: {
      custom: 250000,
      migrate: 100000,
    },
    add: {
      add_color_preset: 5000,
      add_embargo: 20000,
      add_private_portfolio: 30000,
      add_tip_platform: 10000,
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
    // index.html에 "채팅창 플랫폼" input이 id/name이 잘못 들어가 있어서(중복)
    // (:contentReference[oaicite:1]{index=1})
    // 2번째 url input을 채팅 플랫폼으로 fallback 처리
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

    // 마감 배수: 둘 다 체크되면 "당일 마감" 우선(= 2배)
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
      // fallback
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        ta.style.top = "0";
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand("copy");
        ta.remove();
        return ok;
      } catch (__) {
        return false;
      }
    }
  }

  function buildCopyTemplate() {
    const { streamUrl, chatPlatform } = getTextValueFallback();

    const baseOpt = getRadio("base_option") || "custom";
    const baseLabel = baseOpt === "migrate" ? "CSS 이식" : "커스텀 채팅 패키지";

    const optLabels = [];
    if (getCheck("add_color_preset")) optLabels.push("컬러 프리셋");
    if (getCheck("add_tip_platform")) optLabels.push("후원 플랫폼 추가");
    if (getCheck("add_embargo")) optLabels.push("엠바고");
    if (getCheck("add_private_portfolio")) optLabels.push("포트폴리오 비공개");
    if (getCheck("add_fast_deadline")) optLabels.push("빠른 마감(48h)");
    if (getCheck("add_same_day")) optLabels.push("당일 마감(24h)");

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
  // 입력 변경마다 계산
  form.addEventListener("input", () => calcEstimate());
  form.addEventListener("change", () => calcEstimate());

  // 초기화 후 견적도 리셋
  form.addEventListener("reset", () => {
    setTimeout(() => {
      if (estEl) estEl.textContent = "0";
    }, 0);
  });

  // 버튼 클릭
  btnCopy?.addEventListener("click", async () => {
    const text = buildCopyTemplate();
    const ok = await copyText(text);

    // UX: 성공/실패를 버튼 텍스트로 짧게 표시
    const old = btnCopy.textContent;
    btnCopy.textContent = ok ? "복사 완료!" : "복사 실패";
    btnCopy.disabled = true;
    setTimeout(() => {
      btnCopy.textContent = old;
      btnCopy.disabled = false;
    }, 900);
  });

  // 첫 진입 시 1회 계산
  calcEstimate();
})();
