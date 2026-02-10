// app.js
(() => {
  const root = document.getElementById("calendar");
  if (!root) return;

  const CSV_URLS = {
    rules:
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vTNJUl8qQYgFvPX5FghbjrApLUGLR7tou-ufaOlOrMh4aWlI757ec3Sn64vGVLo7QxaKTKR50x8tI_Z/pub?gid=0&single=true&output=csv",
    closed_ranges:
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vTNJUl8qQYgFvPX5FghbjrApLUGLR7tou-ufaOlOrMh4aWlI757ec3Sn64vGVLo7QxaKTKR50x8tI_Z/pub?gid=1262250161&single=true&output=csv",
    meta:
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vTNJUl8qQYgFvPX5FghbjrApLUGLR7tou-ufaOlOrMh4aWlI757ec3Sn64vGVLo7QxaKTKR50x8tI_Z/pub?gid=320439803&single=true&output=csv",
  };

  // -------------------------
  // CSV Parser
  // -------------------------
  function parseCSV(text) {
    const rows = [];
    let row = [];
    let cur = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const next = text[i + 1];

      if (ch === '"' && inQuotes && next === '"') {
        cur += '"';
        i++;
        continue;
      }

      if (ch === '"') {
        inQuotes = !inQuotes;
        continue;
      }

      if (ch === "," && !inQuotes) {
        row.push(cur);
        cur = "";
        continue;
      }

      if ((ch === "\n" || ch === "\r") && !inQuotes) {
        if (ch === "\r" && next === "\n") i++;
        row.push(cur);
        cur = "";
        if (row.some((v) => v.trim() !== "")) rows.push(row);
        row = [];
        continue;
      }

      cur += ch;
    }

    row.push(cur);
    if (row.some((v) => v.trim() !== "")) rows.push(row);

    const headers = (rows.shift() || []).map((h) => h.trim());
    return rows
      .map((r) => {
        const obj = {};
        headers.forEach((h, idx) => {
          obj[h] = (r[idx] ?? "").trim();
        });
        return obj;
      })
      .filter((o) => Object.values(o).some((v) => v !== ""));
  }

  async function fetchCSV(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`CSV fetch failed: ${res.status}`);
    const text = await res.text();
    return parseCSV(text);
  }

  // -------------------------
  // Date utils
  // -------------------------
  const pad2 = (n) => String(n).padStart(2, "0");
  const toYMD = (d) =>
    `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const toYM = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;

  const inRange = (ymd, start, end) => start <= ymd && ymd <= end;

  const formatMD = (ymd) => {
    const [, mm, dd] = ymd.split("-").map((x) => parseInt(x, 10));
    return `${mm}월 ${dd}일`;
  };

  // -------------------------
  // Calendar grid
  // -------------------------
  function buildMonthCells(baseDate, isClosedFn) {
    const y = baseDate.getFullYear();
    const m = baseDate.getMonth();

    const first = new Date(y, m, 1);
    const startDay = first.getDay(); // 0=일
    const gridStart = new Date(y, m, 1 - startDay);

    const cells = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);

      const ymd = toYMD(d);
      const isOtherMonth = d.getMonth() !== m;

      cells.push({
        date: d,
        ymd,
        day: d.getDate(),
        isOtherMonth,
        status: isClosedFn(ymd) ? "closed" : "open",
      });
    }
    return cells;
  }

  // -------------------------
  // Render
  // -------------------------
  function renderCalendar({ targetMonthDate, rules, closedRanges, metaByMonth, tabMode }) {
    const ym = toYM(targetMonthDate);

    const isClosed = (ymd) =>
      closedRanges.some((r) => inRange(ymd, r.start_date, r.end_date));

    const cells = buildMonthCells(targetMonthDate, isClosed);

    const meta = metaByMonth.get(ym);
    const nextOpen = meta?.next_open_date || "";

    const footerTemplate = rules.footer_template || "";
    const footerText =
      nextOpen && footerTemplate
        ? footerTemplate.replace("{next_open_md}", formatMD(nextOpen))
        : "";

    const closedLabel = rules.closed_label || "마감";
    const openLabel = rules.open_label || "접수 가능";

    const todayYMD = toYMD(new Date());

    root.classList.remove("is-cal-anim");
    void root.offsetWidth;
    root.classList.add("is-cal-anim");

    root.innerHTML = `
      <div class="miniCal">
        <div class="miniCal__top">
          <div class="miniCal__tabs" role="tablist" aria-label="월 선택">
            <button class="miniCal__tab ${tabMode === "this" ? "is-active" : ""}" data-tab="this" type="button">당월</button>
            <button class="miniCal__tab ${tabMode === "next" ? "is-active" : ""}" data-tab="next" type="button">익월</button>
          </div>
          <div class="miniCal__title">${targetMonthDate.getFullYear()}.${pad2(targetMonthDate.getMonth() + 1)}</div>
        </div>

        <div class="miniCal__dow">
          ${["일","월","화","수","목","금","토"].map(w=>`<div>${w}</div>`).join("")}
        </div>

        <div class="miniCal__grid">
          ${cells
            .map((c) => {
              const closed = c.status === "closed";
              const statusClass = closed ? "is-closed" : "is-open";
              const chipClass = closed ? "is-closed" : "is-open";
              const chipText = closed ? closedLabel : openLabel;

              const isToday = !c.isOtherMonth && c.ymd === todayYMD;
              const todayClass = isToday ? "is-today" : "";

              return `
                <div class="miniCal__cell ${c.isOtherMonth ? "is-other" : ""} ${statusClass} ${todayClass}"
                     data-ymd="${c.ymd}">
                  <div class="miniCal__day">${c.day}</div>
                  <div class="miniCal__chip ${chipClass}">${chipText}</div>
                </div>
              `;
            })
            .join("")}
        </div>

        ${footerText ? `<div class="miniCal__footer">${footerText}</div>` : ""}
      </div>
    `;
  }

  function renderError(msg) {
    root.innerHTML = `
      <div class="miniCal">
        <div class="miniCal__footer">캘린더를 불러오지 못했어요. ${msg}</div>
      </div>
    `;
  }

  // -------------------------
  // Data load
  // -------------------------
  async function main() {
    const [rulesRows, closedRows, metaRows] = await Promise.all([
      fetchCSV(CSV_URLS.rules),
      fetchCSV(CSV_URLS.closed_ranges),
      fetchCSV(CSV_URLS.meta),
    ]);

    // rules: key/value -> object
    const rules = {};
    for (const r of rulesRows) {
      const key = (r.key || "").trim();
      const value = (r.value || "").trim();
      if (key) rules[key] = value;
    }

    // closed ranges
    const closedRanges = closedRows
      .map((r) => ({
        start_date: (r.start_date || "").trim(),
        end_date: (r.end_date || "").trim(),
        reason: (r.reason || "").trim(),
      }))
      .filter((r) => r.start_date && r.end_date);

    // meta: month -> Map
    const metaByMonth = new Map();
    for (const r of metaRows) {
      const month = (r.month || "").trim(); // YYYY-MM
      const next_open_date = (r.next_open_date || "").trim(); // YYYY-MM-DD
      if (month) metaByMonth.set(month, { next_open_date });
    }

    // tabs: this / next (only two)
    const today = new Date();
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

    let tabMode = "this";
    let current = thisMonth;

    const rerender = () =>
      renderCalendar({ targetMonthDate: current, rules, closedRanges, metaByMonth, tabMode });

    rerender();

    root.addEventListener("click", (e) => {
      const tab = e.target.closest(".miniCal__tab");
      if (!tab) return;

      tabMode = tab.dataset.tab === "next" ? "next" : "this";
      current = tabMode === "next" ? nextMonth : thisMonth;
      rerender();
    });
  }

  main().catch((err) => {
    console.error(err);
    renderError(err?.message || "원인을 확인해주세요.");
  });
})();



// =========================
// Notice
// =========================
(() => {
  const root = document.getElementById("notice");
  if (!root) return;

  const NOTICE_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTNJUl8qQYgFvPX5FghbjrApLUGLR7tou-ufaOlOrMh4aWlI757ec3Sn64vGVLo7QxaKTKR50x8tI_Z/pub?gid=2027436448&single=true&output=csv";

  // --- CSV Parser ---
  function parseCSV(text) {
    const rows = [];
    let row = [];
    let cur = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const next = text[i + 1];

      if (ch === '"' && inQuotes && next === '"') {
        cur += '"';
        i++;
        continue;
      }
      if (ch === '"') {
        inQuotes = !inQuotes;
        continue;
      }
      if (ch === "," && !inQuotes) {
        row.push(cur);
        cur = "";
        continue;
      }
      if ((ch === "\n" || ch === "\r") && !inQuotes) {
        if (ch === "\r" && next === "\n") i++;
        row.push(cur);
        cur = "";
        if (row.some((v) => v.trim() !== "")) rows.push(row);
        row = [];
        continue;
      }
      cur += ch;
    }

    row.push(cur);
    if (row.some((v) => v.trim() !== "")) rows.push(row);

    const headers = (rows.shift() || []).map((h) => h.trim());
    return rows
      .map((r) => {
        const obj = {};
        headers.forEach((h, idx) => {
          obj[h] = (r[idx] ?? "").trim();
        });
        return obj;
      })
      .filter((o) => Object.values(o).some((v) => v !== ""));
  }

  async function fetchCSV(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`CSV fetch failed: ${res.status}`);
    return parseCSV(await res.text());
  }

  function toNum(v, fallback = 9999) {
    const n = Number(String(v ?? "").trim());
    return Number.isFinite(n) ? n : fallback;
  }

  function escapeHTML(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function sanitizeDescAllowEm(html) {
    const raw = String(html ?? "");

    const escaped = escapeHTML(raw);

    return escaped
      .replaceAll("&lt;em&gt;", "<em>")
      .replaceAll("&lt;/em&gt;", "</em>");
  }

  function renderNotices(rows) {
    const items = rows
      .map((r) => ({
        order: toNum(r.order, 9999),
        icon: (r.icon || "").trim(),
        desc: (r.desc || "").trim(),
      }))
      .filter((x) => x.desc)
      .sort((a, b) => a.order - b.order);

    if (!items.length) {
      root.innerHTML = "";
      return;
    }

    root.innerHTML = `
      <section class="notice card" aria-labelledby="noticeTitle">
        <header class="notice__head">
          <h2 class="sectionTitle" id="noticeTitle">작업 전 안내</h2>
          <p class="sectionDesc">원활한 진행을 위해 문의 전 꼭 확인해 주세요.</p>
        </header>

        <ul class="noticeList" role="list">
          ${items
            .map((it) => {
              const icon = it.icon || "ℹ️";
              return `
                <li class="noticeItem">
                  <div class="noticeItem__icon" aria-hidden="true">${escapeHTML(
                    icon
                  )}</div>
                  <div class="noticeItem__desc">${sanitizeDescAllowEm(
                    it.desc
                  )}</div>
                </li>
              `;
            })
            .join("")}
        </ul>
      </section>
    `;
  }

  function renderError(msg) {
    root.innerHTML = `
      <section class="notice card" aria-labelledby="noticeTitle">
        <header class="notice__head">
          <h2 class="sectionTitle" id="noticeTitle">작업 전 안내</h2>
        </header>
        <p class="sectionDesc">공지사항을 불러오지 못했어요. ${escapeHTML(msg)}</p>
      </section>
    `;
  }

  (async () => {
    try {
      const rows = await fetchCSV(NOTICE_CSV_URL);
      renderNotices(rows);
    } catch (err) {
      console.error(err);
      renderError(err?.message || "원인을 확인해주세요.");
    }
  })();
})();


// =========================
// Portfolio
// =========================
(() => {
  const root = document.querySelector("#portfolio .pofWrap");
  if (!root) return;

  const PORTFOLIO_CSV_URL =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vTNJUl8qQYgFvPX5FghbjrApLUGLR7tou-ufaOlOrMh4aWlI757ec3Sn64vGVLo7QxaKTKR50x8tI_Z/pub?gid=1037051871&single=true&output=csv";

  const TAB_META = [
    { key: "collab", label: "협업 패키지" },
    { key: "legacy", label: "레거시 패키지" },
    { key: "migrate", label: "CSS 이식" },
  ];

  /* ---------------- CSV ---------------- */
  function parseCSV(text) {
    const rows = [];
    let row = [];
    let cur = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const next = text[i + 1];

      if (ch === '"' && inQuotes && next === '"') {
        cur += '"';
        i++;
        continue;
      }
      if (ch === '"') {
        inQuotes = !inQuotes;
        continue;
      }
      if (ch === "," && !inQuotes) {
        row.push(cur);
        cur = "";
        continue;
      }
      if ((ch === "\n" || ch === "\r") && !inQuotes) {
        if (ch === "\r" && next === "\n") i++;
        row.push(cur);
        if (row.some((v) => v.trim())) rows.push(row);
        row = [];
        cur = "";
        continue;
      }
      cur += ch;
    }
    row.push(cur);
    if (row.some((v) => v.trim())) rows.push(row);

    const headers = (rows.shift() || []).map((h) => h.trim());
    return rows
      .map((r) => {
        const o = {};
        headers.forEach((h, i) => (o[h] = (r[i] || "").trim()));
        return o;
      })
      .filter((o) => Object.values(o).some((v) => String(v).trim() !== ""));
  }

  async function fetchCSV(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`CSV fetch failed: ${res.status}`);
    return parseCSV(await res.text());
  }

  /* ---------------- Utils ---------------- */
  const escapeHTML = (s) =>
    String(s || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  const parseTags = (s) =>
    String(s || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  function getYouTubeId(urlOrId) {
    const raw = String(urlOrId || "").trim();
    if (!raw) return "";
    if (/^[\w-]{11}$/.test(raw)) return raw;

    try {
      const u = new URL(raw);

      // youtu.be/<id>
      if (u.hostname.includes("youtu.be")) {
        const id = u.pathname.split("/").filter(Boolean)[0] || "";
        return /^[\w-]{11}$/.test(id) ? id : "";
      }

      // youtube.com/watch?v=<id>
      const v = u.searchParams.get("v");
      return v && /^[\w-]{11}$/.test(v) ? v : "";
    } catch {
      // fallback: query parsing
      const m = raw.match(/[?&]v=([\w-]{11})/);
      if (m) return m[1];
      const m2 = raw.match(/youtu\.be\/([\w-]{11})/);
      if (m2) return m2[1];
      return "";
    }
  }

  function setBestThumb(imgEl, videoId) {
    const candidates = [
      `https://i.ytimg.com/vi_webp/${videoId}/maxresdefault.webp`,
      `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
      `https://i.ytimg.com/vi_webp/${videoId}/sddefault.webp`,
      `https://i.ytimg.com/vi/${videoId}/sddefault.jpg`,
      `https://i.ytimg.com/vi_webp/${videoId}/hqdefault.webp`,
      `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      `https://i.ytimg.com/vi_webp/${videoId}/mqdefault.webp`,
      `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
    ];

    let idx = 0;
    let settled = false;

    const setFallbackSVG = () => {
      const svg = encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720">
          <defs>
            <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="#e6f7fd"/>
              <stop offset="1" stop-color="#eef4fb"/>
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#g)"/>
          <circle cx="1030" cy="560" r="70" fill="rgba(31,47,85,.75)"/>
          <polygon points="1010,520 1010,600 1070,560" fill="#fff"/>
          <text x="70" y="640" font-size="40" font-family="sans-serif" fill="rgba(31,47,85,.55)">
            Thumbnail unavailable
          </text>
        </svg>
      `);
      imgEl.src = `data:image/svg+xml;charset=utf-8,${svg}`;
    };

    const tryNext = () => {
      if (idx >= candidates.length) {
        settled = true;
        setFallbackSVG();
        return;
      }
      imgEl.src = candidates[idx++];
    };

    imgEl.onerror = () => {
      if (settled) return;
      tryNext();
    };

    imgEl.onload = () => {
      if (settled) return;
      const w = imgEl.naturalWidth || 0;
      const h = imgEl.naturalHeight || 0;

      // placeholder급(너무 작은) 이미지는 다음 후보로
      if (w > 0 && h > 0 && (w < 200 || h < 150)) {
        tryNext();
        return;
      }

      settled = true;
    };

    tryNext();
  }

  function openModal(id, title) {
    const modal = document.createElement("div");
    modal.className = "pofModal";
    modal.innerHTML = `
      <div class="pofModal__backdrop" data-close="1"></div>
      <div class="pofModal__panel" role="dialog" aria-modal="true" aria-label="${escapeHTML(
        title || "영상 재생"
      )}">
        <button class="pofModal__close" type="button" aria-label="닫기" data-close="1">✕</button>
        <div class="pofModal__frame">
          <iframe
            src="https://www.youtube.com/embed/${encodeURIComponent(
              id
            )}?autoplay=1&rel=0"
            title="${escapeHTML(title || "YouTube video player")}"
            frameborder="0"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowfullscreen
          ></iframe>
        </div>
        ${
          title
            ? `<div class="pofModal__title">${escapeHTML(title)}</div>`
            : ""
        }
      </div>
    `;

    const close = () => modal.remove();

    modal.addEventListener("click", (e) => {
      const t = e.target;
      if (t && t.dataset && t.dataset.close === "1") close();
    });

    const onKey = (e) => {
      if (e.key === "Escape") {
        window.removeEventListener("keydown", onKey);
        close();
      }
    };
    window.addEventListener("keydown", onKey);

    document.body.appendChild(modal);
  }

  function renderError(msg) {
    root.innerHTML = `
      <section class="pof card">
        <h2 class="sectionTitle">포트폴리오</h2>
        <p class="sectionDesc">포트폴리오를 불러오지 못했어요. ${escapeHTML(msg)}</p>
      </section>
    `;
  }

  /* ---------------- Render ---------------- */
  function render(data) {
    let active = TAB_META[0].key;

    root.innerHTML = `
      <section class="pof card" aria-labelledby="pofTitle">
        <header class="pof__head">
          <h2 class="sectionTitle" id="pofTitle">포트폴리오</h2>
          <p class="sectionDesc">썸네일을 클릭하면 영상이 재생됩니다.</p>
          <div class="pofTabs" role="tablist" aria-label="포트폴리오 탭">
            ${TAB_META.map(
              (t, i) =>
                `<button class="pofTab ${
                  !i ? "is-active" : ""
                }" type="button" role="tab" data-tab="${t.key}" aria-selected="${
                  !i ? "true" : "false"
                }">${escapeHTML(t.label)}</button>`
            ).join("")}
          </div>
        </header>

        <div class="pofStage">
          <button class="pofNav pofNav--prev" type="button" aria-label="이전" data-nav="prev" data-dir="-1" data-icon="◀"></button>
          <div class="pofRail" data-rail="1"></div>
          <button class="pofNav pofNav--next" type="button" aria-label="다음" data-nav="next" data-dir="1" data-icon="▶"></button>
        </div>
      </section>
    `;

    const stage = root.querySelector(".pofStage");
    const rail = root.querySelector(".pofRail");
    const tabBtns = Array.from(root.querySelectorAll(".pofTab"));

    // 루프용 락
    let loopLock = false;

    function mount(cat) {
      const base = data
        .filter((v) => v.category === cat)
        .sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));

      // 버튼 숨김 + 루프 없음
      if (base.length === 0) {
        stage.classList.add("is-empty");
        stage.classList.remove("is-single");
        stage.classList.remove("is-few"); // 추가
        rail.innerHTML = `<div class="pofEmpty">등록된 샘플이 아직 없어요.</div>`;
        rail.scrollLeft = 0;
        return;
      }

      stage.classList.remove("is-empty");

      if (base.length === 1) stage.classList.add("is-single");
      else stage.classList.remove("is-single");

      stage.classList.toggle("is-few", base.length <= 3);

      const items = base.length >= 4 ? [...base, ...base, ...base] : [...base];

      rail.innerHTML = `
        <div class="pofTrack" role="list">
          ${items
            .map((it) => {
              const tags = it.tags
                .map((t) => `<span class="tagChip">${escapeHTML(t)}</span>`)
                .join("");
              return `
                <button class="pofCard" type="button" role="listitem"
                        data-vid="${escapeHTML(it.id)}"
                        data-title="${escapeHTML(it.title)}">
                  <div class="pofThumb">
                    <img class="pofThumb__img" alt="${escapeHTML(
                      it.title
                    )} 썸네일" loading="lazy">
                    <span class="pofThumb__play" aria-hidden="true">▶</span>
                  </div>
                  <div class="pofMeta">
                    <div class="pofTitle">${escapeHTML(it.title)}</div>
                    ${
                      tags
                        ? `<div class="pofTags" aria-label="태그">${tags}</div>`
                        : ""
                    }
                  </div>
                </button>
              `;
            })
            .join("")}
        </div>
      `;

      // 썸네일 적용
      const imgs = rail.querySelectorAll(".pofThumb__img");
      const cards = rail.querySelectorAll(".pofCard");
      cards.forEach((c, i) => {
        const vid = c.dataset.vid;
        if (vid && imgs[i]) setBestThumb(imgs[i], vid);
      });

      // 가운데 묶음으로 이동(루프일 때만)
      requestAnimationFrame(() => {
        if (base.length >= 2) {
          rail.scrollLeft = rail.scrollWidth / 3;
        } else {
          rail.scrollLeft = 0;
        }
      });
    }

    // 초기 탭
    mount(active);

    // 클릭 핸들러(탭/버튼/카드)
    root.addEventListener("click", (e) => {
      const tab = e.target.closest(".pofTab");
      if (tab) {
        const key = tab.dataset.tab;
        if (!key || key === active) return;

        active = key;
        tabBtns.forEach((b) => {
          const isOn = b.dataset.tab === active;
          b.classList.toggle("is-active", isOn);
          b.setAttribute("aria-selected", isOn ? "true" : "false");
        });

        mount(active);
        return;
      }

      const nav = e.target.closest(".pofNav");
      if (nav) {
        if (stage.classList.contains("is-empty") || stage.classList.contains("is-single"))
          return;

        const card = rail.querySelector(".pofCard");
        const step = card ? card.getBoundingClientRect().width + 12 : 320;
        const dir = Number(nav.dataset.dir || 0);
        rail.scrollBy({ left: dir * step, behavior: "smooth" });
        return;
      }

      const card = e.target.closest(".pofCard");
      if (card) {
        const id = card.dataset.vid;
        const title = card.dataset.title || "";
        if (id) openModal(id, title);
      }
    });

    // 루프 보정
    rail.addEventListener("scroll", () => {
      if (stage.classList.contains("is-empty") || stage.classList.contains("is-single"))
        return;
      if (loopLock) return;

      const third = rail.scrollWidth / 3;
      const x = rail.scrollLeft;

      if (x < third * 0.5) {
        loopLock = true;
        rail.scrollLeft = x + third;
        requestAnimationFrame(() => (loopLock = false));
      } else if (x > third * 1.5) {
        loopLock = true;
        rail.scrollLeft = x - third;
        requestAnimationFrame(() => (loopLock = false));
      }
    });
  }

  /* ---------------- Init ---------------- */
  fetchCSV(PORTFOLIO_CSV_URL)
    .then((rows) => {
      const data = rows
        .map((r) => ({
          category: String(r.category || "").trim(),
          order: Number(String(r.order || "").trim()) || 9999,
          title: String(r.title || "").trim(),
          id: getYouTubeId(r.youtube),
          tags: parseTags(r.tags),
        }))
        .filter((v) => v.category && v.id && v.title);

      render(data);
    })
    .catch((err) => {
      console.error(err);
      renderError(err?.message || "원인을 확인해주세요.");
    });
})();
