(function () {
  const CSV_BASE =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vT7bBd8d_YfahCugR2TL-zaYDB7r3-aMXRBifboBW7bLlcJv-ffmtl1TkjmUXa0zowJyEKe8BkFc9ux/pub?output=csv";

  const SHEET_NAME = "notice";
  const TARGET_ID = "noticeSteps";

  const GROUP_ORDER = ["기본", "수정", "진행", "결제"];

  function toBool(v) {
    return String(v).trim().toLowerCase() === "true";
  }

  function stripScripts(html) {
    return String(html).replace(
      /<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi,
      ""
    );
  }

  function withBreaks(html) {
    return stripScripts(html).replace(/\r\n|\r|\n/g, "<br>");
  }

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

      if (!inQuotes && (ch === "," || ch === "\n" || ch === "\r")) {
        row.push(cur);
        cur = "";

        if (ch === "\r" && next === "\n") i++;
        if (ch === "\n" || ch === "\r") {
          if (row.some((c) => String(c).trim() !== "")) rows.push(row);
          row = [];
        }
        continue;
      }

      cur += ch;
    }

    row.push(cur);
    if (row.some((c) => String(c).trim() !== "")) rows.push(row);
    return rows;
  }

  function rowsToObjects(rows) {
    const header = rows[0].map((h) => String(h).trim());
    const body = rows.slice(1);

    return body.map((r) => {
      const obj = {};
      header.forEach((h, idx) => (obj[h] = r[idx] ?? ""));
      return obj;
    });
  }

  function groupItems(items) {
    const map = new Map();
    for (const it of items) {
      const g = String(it.group || "").trim() || "기타";
      if (!map.has(g)) map.set(g, []);
      map.get(g).push(it);
    }
    return map;
  }

  function sortGroupKeys(keys) {
    const known = [];
    const unknown = [];
    for (const k of keys) {
      if (GROUP_ORDER.includes(k)) known.push(k);
      else unknown.push(k);
    }
    known.sort((a, b) => GROUP_ORDER.indexOf(a) - GROUP_ORDER.indexOf(b));
    unknown.sort((a, b) => a.localeCompare(b, "ko"));
    return [...known, ...unknown];
  }

  function renderGroupedNotice(items) {
    const root = document.getElementById(TARGET_ID);
    if (!root) return;

    if (!items.length) {
      root.innerHTML = `<div class="notice__error">표시할 안내사항이 없습니다.</div>`;
      return;
    }

    const grouped = groupItems(items);
    const keys = sortGroupKeys([...grouped.keys()]);

    root.innerHTML = keys
      .map((groupName) => {
        const list = grouped
          .get(groupName)
          .slice()
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

        const rowsHTML = list
          .map((it) => {
            const desc = String(it.desc ?? "").trim();
            return `
              <li class="noticeItem">
                <div class="noticeItem__dot" aria-hidden="true"></div>
                <div class="noticeItem__body">${withBreaks(desc)}</div>
              </li>
            `.trim();
          })
          .join("");

        return `
          <section class="noticeGroup">
            <header class="noticeGroup__head">
              <h4 class="noticeGroup__title">${groupName}</h4>
            </header>
            <ul class="noticeList">
              ${rowsHTML}
            </ul>
          </section>
        `.trim();
      })
      .join("");
  }

  async function loadNotices() {
    const root = document.getElementById(TARGET_ID);
    if (!root) return;

    const url =
      CSV_BASE + `&sheet=${encodeURIComponent(SHEET_NAME)}`;

    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error("CSV fetch failed: " + res.status);

      const csvText = await res.text();
      const rows = parseCSV(csvText);
      if (!rows || rows.length < 2) throw new Error("CSV empty");

      const objs = rowsToObjects(rows);

      const visible = objs
        .filter((o) => !toBool(o.hidden))
        .map((o) => ({
          group: o.group,
          desc: o.desc,
          order: Number(String(o.order).trim()) || 0,
        }))
        .sort((a, b) => a.order - b.order);

      renderGroupedNotice(visible);
    } catch (err) {
      console.warn("[notice] load failed:", err);
      root.innerHTML =
        `<div class="notice__error">안내사항을 불러오지 못했습니다. (시트 공개/탭/헤더 확인)</div>`;
    }
  }

  document.addEventListener("DOMContentLoaded", loadNotices);
})();

/* =========================
   Packages
========================= */
(function () {
  const CSV_BASE =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vT7bBd8d_YfahCugR2TL-zaYDB7r3-aMXRBifboBW7bLlcJv-ffmtl1TkjmUXa0zowJyEKe8BkFc9ux/pub?gid=164493219&single=true&output=csv";

  const SHEET_NAME = "package";
  const TARGET_ID = "packages";

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

      if (!inQuotes && (ch === "," || ch === "\n" || ch === "\r")) {
        row.push(cur);
        cur = "";

        if (ch === "\r" && next === "\n") i++;
        if (ch === "\n" || ch === "\r") {
          if (row.some((c) => String(c).trim() !== "")) rows.push(row);
          row = [];
        }
        continue;
      }
      cur += ch;
    }

    row.push(cur);
    if (row.some((c) => String(c).trim() !== "")) rows.push(row);
    return rows;
  }

  function rowsToObjects(rows) {
    const header = rows[0].map((h) => String(h).trim());
    const body = rows.slice(1);

    return body.map((r) => {
      const obj = {};
      header.forEach((h, i) => (obj[h] = r[i] ?? ""));
      return obj;
    });
  }

  function renderValue(v) {
    const val = (v ?? "").toString().trim();
    if (!val) return `<span class="pkg-no">—</span>`;
    if (val === "O") return `<span class="pkg-ok">✓</span>`;
    if (val === "✕") return `<span class="pkg-no">—</span>`;
    return `<span class="pkg-text">${val}</span>`;
  }

  function renderTable(items) {
    const root = document.getElementById(TARGET_ID);
    if (!root) return;

    if (!items.length) {
      root.innerHTML = `<div class="notice__error">패키지 정보를 불러올 수 없습니다.</div>`;
      return;
    }

    function normalizeRow(o) {
      const pick = (keys) => {
        for (const k of keys) {
          const v = o[k];
          if (v !== undefined && v !== null) return v;
        }
        return "";
      };

      return {
        key: pick(["key", "Key", "KEY", "\ufeffkey"]),
        label: pick(["label", "Label", "LABEL", "\ufefflabel", "항목", "구분"]),
        desc: pick(["desc", "Desc", "DESC", "\ufeffdesc", "설명"]),
        basic: pick(["basic", "Basic", "BASIC", "\ufeffbasic", "베이직"]),
        standard: pick(["standard", "Standard", "STANDARD", "\ufeffstandard", "스탠다드"]),
        premium: pick(["premium", "Premium", "PREMIUM", "\ufeffpremium", "프리미엄"]),
        custom: pick(["custom", "Custom", "CUSTOM", "\ufeffcustom", "맞춤", "맞춤제작"]),
      };
    }

    const rowsHTML = items
      .map(normalizeRow)
      .filter((it) => String(it.label).trim())
      .map(
        (it) => `
          <tr>
            <th class="pkg-label">
              <div class="pkg-label__title">${it.label}</div>
              ${it.desc ? `<div class="pkg-label__desc">${it.desc}</div>` : ``}
            </th>
            <td>${renderValue(it.basic)}</td>
            <td>${renderValue(it.standard)}</td>
            <td>${renderValue(it.premium)}</td>
            <td>${renderValue(it.custom)}</td>
          </tr>
        `
      )
      .join("");

    root.innerHTML = `
      <div class="sec__head">
        <p class="sec__eyebrow">패키지 비교</p>
        <h2 class="sec__title">포트폴리오 제작 패키지</h2>
        <p class="sec__desc">필요한 구성에 맞춰 패키지를 선택하세요.</p>
      </div>

      <div class="card">
        <div class="pkg-wrap">
          <table class="pkg-table">
            <thead>
              <tr>
                <th></th>
                <th>베이직</th>
                <th class="is-recommend">
                <span class="pkg-head">스탠다드</span>
                </th>
                <th>프리미엄</th>
                <th>커스텀</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHTML}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }


  async function loadPackages() {
    const root = document.getElementById(TARGET_ID);
    if (!root) return;

    const url = CSV_BASE + `&sheet=${encodeURIComponent(SHEET_NAME)}`;

    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error("CSV fetch failed: " + res.status);

      const csvText = await res.text();

      // 1) 먼저 파싱부터
      const rows = parseCSV(csvText);
      const objs = rowsToObjects(rows);

      // 2) 그 다음에 로그
      console.log("[package url]", url);
      console.log("[package csv head]", csvText.slice(0, 120));
      console.log("[package rows count]", rows.length);
      console.log("[package keys]", Object.keys(objs[0] || {}));
      console.log("[package sample row]", objs[0]);

      renderTable(objs);
    } catch (err) {
      console.warn("[package] load failed:", err);
      root.innerHTML =
        `<div class="notice__error">패키지 정보를 불러오지 못했습니다. (시트 공개/탭/헤더 확인)</div>`;
    }
  }


  document.addEventListener("DOMContentLoaded", loadPackages);
})();

/* =========================
   Options
========================= */
(function () {
  const CSV_BASE =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vT7bBd8d_YfahCugR2TL-zaYDB7r3-aMXRBifboBW7bLlcJv-ffmtl1TkjmUXa0zowJyEKe8BkFc9ux/pub?gid=990149118&single=true&output=csv";

  const SHEET_NAME = "options";
  const TARGET_ID = "options";

  function stripScripts(html) {
    return String(html).replace(
      /<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi,
      ""
    );
  }

  // ✅ 줄바꿈 자동 인식 + <em> 유지
  function withBreaks(html) {
    return stripScripts(html).replace(/\r\n|\r|\n/g, "<br>");
  }

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

      if (!inQuotes && (ch === "," || ch === "\n" || ch === "\r")) {
        row.push(cur);
        cur = "";

        if (ch === "\r" && next === "\n") i++;
        if (ch === "\n" || ch === "\r") {
          if (row.some((c) => String(c).trim() !== "")) rows.push(row);
          row = [];
        }
        continue;
      }
      cur += ch;
    }

    row.push(cur);
    if (row.some((c) => String(c).trim() !== "")) rows.push(row);
    return rows;
  }

  function rowsToObjects(rows) {
    const header = rows[0].map((h) => String(h).trim());
    const body = rows.slice(1);

    return body.map((r) => {
      const obj = {};
      header.forEach((h, i) => (obj[h] = r[i] ?? ""));
      return obj;
    });
  }

  function formatPrice(price, type) {
    const t = String(type || "").trim().toLowerCase();
    const p = String(price ?? "").trim();

    // consult, multiplier
    if (t === "consult") return "협의";
    if (t === "multiplier") {
      const n = Number(p);
      return Number.isFinite(n) ? `x ${n}` : `x ${p}`;
    }

    // fixed
    const n = Number(p.replace(/,/g, ""));
    if (!Number.isFinite(n)) return p;
    return `${n.toLocaleString("ko-KR")}원`;
  }

  function renderOptions(items) {
    const root = document.getElementById(TARGET_ID);
    if (!root) return;

    if (!items.length) {
      root.innerHTML = `<div class="notice__error">추가 옵션을 불러올 수 없습니다.</div>`;
      return;
    }

    const rowsHTML = items
      .filter((it) => String(it.label || "").trim())
      .map((it) => {
        const label = String(it.label ?? "").trim();
        const desc = String(it.desc ?? "").trim();
        const priceText = formatPrice(it.price, it.price_type);

        return `
          <div class="optItem">
            <div class="optItem__head">
              <h4 class="optItem__title">${label}</h4>
              <div class="optItem__price">${priceText}</div>
            </div>
            ${
              desc
                ? `<div class="optItem__desc">${withBreaks(desc)}</div>`
                : ``
            }
          </div>
        `.trim();
      })
      .join("");

    root.innerHTML = `
      <div class="sec__head">
        <p class="sec__eyebrow">추가 옵션</p>
        <h2 class="sec__title">옵션 선택</h2>
        <p class="sec__desc">필요한 경우 옵션을 추가할 수 있습니다.</p>
      </div>

      <div class="card">
        <div class="optList">
          ${rowsHTML}
        </div>
      </div>
    `;
  }

  async function loadOptions() {
    const root = document.getElementById(TARGET_ID);
    if (!root) return;

    const url = CSV_BASE + `&sheet=${encodeURIComponent(SHEET_NAME)}`;

    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error("CSV fetch failed: " + res.status);

      const csvText = await res.text();
      const rows = parseCSV(csvText);
      if (!rows || rows.length < 2) throw new Error("CSV empty");

      const objs = rowsToObjects(rows);

      renderOptions(objs);
    } catch (err) {
      console.warn("[options] load failed:", err);
      root.innerHTML =
        `<div class="notice__error">옵션을 불러오지 못했습니다. (시트 공개/탭/헤더 확인)</div>`;
    }
  }

  document.addEventListener("DOMContentLoaded", loadOptions);
})();

/* =========================
   Inquiry Form
========================= */
(function () {
  const CSV_BASE =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vT7bBd8d_YfahCugR2TL-zaYDB7r3-aMXRBifboBW7bLlcJv-ffmtl1TkjmUXa0zowJyEKe8BkFc9ux/pub?gid=400943593&single=true&output=csv";

  const SHEET_NAME = "form";
  const TARGET_ID = "form";

  function stripScripts(html) {
    return String(html).replace(
      /<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi,
      ""
    );
  }

  function withBreaks(html) {
    return stripScripts(html).replace(/\r\n|\r|\n/g, "<br>");
  }

  function escHtml(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function escAttr(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;")
      .replace(/\r\n|\r|\n/g, "&#10;");
  }

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

      if (!inQuotes && (ch === "," || ch === "\n" || ch === "\r")) {
        row.push(cur);
        cur = "";

        if (ch === "\r" && next === "\n") i++;
        if (ch === "\n" || ch === "\r") {
          if (row.some((c) => String(c).trim() !== "")) rows.push(row);
          row = [];
        }
        continue;
      }
      cur += ch;
    }

    row.push(cur);
    if (row.some((c) => String(c).trim() !== "")) rows.push(row);
    return rows;
  }

  function rowsToObjects(rows) {
    const header = rows[0].map((h) => String(h).trim());
    const body = rows.slice(1);

    return body
      .map((r) => {
        const obj = {};
        header.forEach((h, i) => (obj[h] = r[i] ?? ""));
        return obj;
      })
      .filter((o) => String(o.key || "").trim());
  }

  function byOrder(a, b) {
    const na = Number(String(a.order ?? "").trim());
    const nb = Number(String(b.order ?? "").trim());
    const aa = Number.isFinite(na) ? na : 1e15;
    const bb = Number.isFinite(nb) ? nb : 1e15;
    return aa - bb;
  }

  function renderGroupBlock(key, rows) {
    const first = rows[0];
    const groupLabel = String(first.group ?? "").trim() || String(key);
    const type = String(first.type ?? "").trim().toLowerCase();

    const groupDesc = String(first.desc ?? "").trim();

    if (type === "radio" || type === "checkbox") {
      const inputType = type; // radio | checkbox
      const opts = rows.map((r, idx) => {
        const optLabel = String(r.label ?? "").trim();
        const optId = `${key}_${idx}`;

        return `
          <label class="fChoice" for="${escAttr(optId)}">
            <input id="${escAttr(optId)}" type="${inputType}" name="${escAttr(
              key
            )}" value="${escAttr(optLabel)}" />
            <span class="fChoice__label">${escHtml(optLabel)}</span>
          </label>
        `.trim();
      });

      return `
        <div class="fField fField--group" data-key="${escAttr(key)}">
          <div class="fLabel">${escHtml(groupLabel)}</div>
          ${groupDesc ? `<div class="fHelp">${withBreaks(groupDesc)}</div>` : ""}
          <div class="fChoices">
            ${opts.join("")}
          </div>
        </div>
      `.trim();
    }

    const label = String(first.label ?? "").trim() || groupLabel;
    const placeholder = String(first.placeholder ?? "").trim();
    const desc = String(first.desc ?? "").trim();

    if (type === "textarea") {
      return `
        <div class="fField" data-key="${escAttr(key)}">
          <label class="fLabel" for="${escAttr(key)}">${escHtml(label)}</label>
          <textarea id="${escAttr(key)}" name="${escAttr(
        key
      )}" class="fInput fTextarea" placeholder="${escAttr(
        placeholder
      )}"></textarea>
          ${desc ? `<div class="fHelp">${withBreaks(desc)}</div>` : ""}
        </div>
      `.trim();
    }

    if (type === "select") {
      let optionsHTML = `<option value="">${escHtml(placeholder || "선택")}</option>`;

      if (key === "deadline") {
        const defaults = [
          "정해진 납기일 없음",
          "1주 이내",
          "2주 이내",
          "1개월 이내",
          "협의",
        ];
        optionsHTML += defaults
          .map((t) => `<option value="${escAttr(t)}">${escHtml(t)}</option>`)
          .join("");
      }

      return `
        <div class="fField" data-key="${escAttr(key)}">
          <label class="fLabel" for="${escAttr(key)}">${escHtml(label)}</label>
          <select id="${escAttr(key)}" name="${escAttr(
        key
      )}" class="fInput fSelect">
            ${optionsHTML}
          </select>
          ${desc ? `<div class="fHelp">${withBreaks(desc)}</div>` : ""}
        </div>
      `.trim();
    }

    const inputType = type || "text";
    return `
      <div class="fField" data-key="${escAttr(key)}">
        <label class="fLabel" for="${escAttr(key)}">${escHtml(label)}</label>
        <input id="${escAttr(key)}" name="${escAttr(
      key
    )}" type="${escAttr(inputType)}" class="fInput" placeholder="${escAttr(
      placeholder
    )}" />
        ${desc ? `<div class="fHelp">${withBreaks(desc)}</div>` : ""}
      </div>
    `.trim();
  }

  function renderForm(objs) {
    const root = document.getElementById(TARGET_ID);
    if (!root) return;

    const map = new Map();
    objs.forEach((o) => {
      const k = String(o.key).trim();
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(o);
    });

    const groups = Array.from(map.entries())
      .map(([k, arr]) => {
        arr.sort(byOrder);
        const minOrder = arr.length ? Number(arr[0].order) : 1e15;
        return { key: k, rows: arr, order: Number.isFinite(minOrder) ? minOrder : 1e15 };
      })
      .sort((a, b) => a.order - b.order);

    const fieldsHTML = groups.map((g) => renderGroupBlock(g.key, g.rows)).join("");

    root.innerHTML = `
      <div class="sec__head">
        <p class="sec__eyebrow">문의</p>
        <h2 class="sec__title">문의 폼</h2>
      </div>

      <div class="card">
        <form class="fWrap" id="inquiryForm">
          ${fieldsHTML}
          <div class="fActions">
            <button type="button" class="btn" id="btnInquiryCopy">복사하기</button>
          </div>
        </form>
      </div>
    `;

    const btn = root.querySelector("#btnInquiryCopy");
    btn?.addEventListener("click", async () => {
      const form = root.querySelector("#inquiryForm");
      if (!form) return;

      const lines = [];
      const getVal = (name) => form.querySelector(`[name="${CSS.escape(name)}"]`)?.value || "";

      const artmug = getVal("artmug");
      if (artmug) lines.push(`아트머그 링크: ${artmug}`);

      const deadline = getVal("deadline");
      if (deadline) lines.push(`희망 납기일: ${deadline}`);

      const message = getVal("message");
      if (message) lines.push(`내용:\n${message}`);

      // radio (package)
      const pkg = form.querySelector('input[name="package"]:checked')?.value;
      if (pkg) lines.splice(1, 0, `희망 패키지: ${pkg}`);

      // checkbox (options)
      const opts = Array.from(form.querySelectorAll('input[name="options"]:checked')).map(
        (el) => el.value
      );
      if (opts.length) {
        lines.splice(2, 0, `추가 옵션: ${opts.join(", ")}`);
      }

      const text = lines.join("\n\n").trim();
      if (!text) return;

      try {
        await navigator.clipboard.writeText(text);
        btn.textContent = "복사 완료!";
        setTimeout(() => (btn.textContent = "복사하기"), 1200);
      } catch {
        const ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        btn.textContent = "복사 완료!";
        setTimeout(() => (btn.textContent = "복사하기"), 1200);
      }
    });
  }

  async function loadForm() {
    const root = document.getElementById(TARGET_ID);
    if (!root) return;

    const url = CSV_BASE + `&sheet=${encodeURIComponent(SHEET_NAME)}`;

    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error("CSV fetch failed: " + res.status);

      const csvText = await res.text();
      const rows = parseCSV(csvText);
      if (!rows || rows.length < 2) throw new Error("CSV empty");

      const objs = rowsToObjects(rows);
      renderForm(objs);
    } catch (err) {
      console.warn("[form] load failed:", err);
      root.innerHTML =
        `<div class="notice__error">문의 폼 정보를 불러오지 못했습니다. (시트 공개/헤더 확인)</div>`;
    }
  }

  document.addEventListener("DOMContentLoaded", loadForm);
})();


/* =========================
   FAQ
========================= */
(function () {
  const CSV_BASE =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vT7bBd8d_YfahCugR2TL-zaYDB7r3-aMXRBifboBW7bLlcJv-ffmtl1TkjmUXa0zowJyEKe8BkFc9ux/pub?gid=988866148&single=true&output=csv";

  const SHEET_NAME = "faq";
  const TARGET_ID = "faq";

  function toBool(v) {
    const s = String(v ?? "").trim().toLowerCase();
    return s === "true" || s === "1" || s === "yes" || s === "y";
  }

  function stripScripts(html) {
    return String(html).replace(
      /<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi,
      ""
    );
  }

  function withBreaks(html) {
    return stripScripts(html).replace(/\r\n|\r|\n/g, "<br>");
  }

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

      if (!inQuotes && (ch === "," || ch === "\n" || ch === "\r")) {
        row.push(cur);
        cur = "";

        if (ch === "\r" && next === "\n") i++;
        if (ch === "\n" || ch === "\r") {
          if (row.some((c) => String(c).trim() !== "")) rows.push(row);
          row = [];
        }
        continue;
      }

      cur += ch;
    }

    row.push(cur);
    if (row.some((c) => String(c).trim() !== "")) rows.push(row);
    return rows;
  }

  function rowsToObjects(rows) {
    const header = rows[0].map((h) => String(h).trim());
    const body = rows.slice(1);

    return body.map((r) => {
      const obj = {};
      header.forEach((h, idx) => (obj[h] = r[idx] ?? ""));
      return obj;
    });
  }

  function groupItems(items) {
    const map = new Map();
    for (const it of items) {
      const g = String(it.group || "").trim() || "기타";
      if (!map.has(g)) map.set(g, []);
      map.get(g).push(it);
    }
    return map;
  }

  function renderFAQ(items) {
    const root = document.getElementById(TARGET_ID);
    if (!root) return;

    if (!items.length) {
      root.innerHTML = `<div class="notice__error">표시할 FAQ가 없습니다.</div>`;
      return;
    }

    const grouped = groupItems(items);
    const groupKeys = Array.from(grouped.keys());

    const groupsHTML = groupKeys
      .map((groupName) => {
        const list = grouped
          .get(groupName)
          .slice()
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

        const qaHTML = list
          .map((it) => {
            return `
              <div class="faqItem">
                <button class="faqQ" type="button">
                  <span class="faqQ__text">${it.question}</span>
                  <span class="faqQ__icon">+</span>
                </button>
                <div class="faqA">
                  <div class="faqA__inner">
                    ${withBreaks(it.answer)}
                  </div>
                </div>
              </div>
            `.trim();
          })
          .join("");

        return `
          <section class="faqGroup">
            <header class="faqGroup__head">
              <h4 class="faqGroup__title">${groupName}</h4>
            </header>
            <div class="faqList">
              ${qaHTML}
            </div>
          </section>
        `.trim();
      })
      .join("");

    root.innerHTML = `
      <div class="sec__head">
        <p class="sec__eyebrow">FAQ</p>
        <h2 class="sec__title">자주 묻는 질문</h2>
        <p class="sec__desc">문의 전 아래 내용을 확인해주세요.</p>
      </div>
      <div class="card">
        ${groupsHTML}
      </div>
    `;

    bindFAQToggle();
  }

  async function loadFAQ() {
    const root = document.getElementById(TARGET_ID);
    if (!root) return;

    const url = CSV_BASE + `&sheet=${encodeURIComponent(SHEET_NAME)}`;

    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error("CSV fetch failed: " + res.status);

      const csvText = await res.text();
      const rows = parseCSV(csvText);
      if (!rows || rows.length < 2) throw new Error("CSV empty");

      const objs = rowsToObjects(rows);

      const visible = objs
        .filter((o) => !toBool(o.hidden))
        .map((o) => ({
          key: String(o.key ?? "").trim(),
          group: String(o.group ?? "").trim(),
          question: String(o.question ?? "").trim(),
          answer: String(o.answer ?? "").trim(),
          order: Number(String(o.order ?? "").trim()) || 0,
        }))
        .filter((o) => o.key && o.question);

      renderFAQ(visible);
    } catch (err) {
      console.warn("[faq] load failed:", err);
      root.innerHTML =
        `<div class="notice__error">FAQ를 불러오지 못했습니다. (시트 공개/탭/헤더 확인)</div>`;
    }
  }

  document.addEventListener("DOMContentLoaded", loadFAQ);
})();

function bindFAQToggle() {
  const items = document.querySelectorAll(".faqItem");

  items.forEach((item) => {
    const btn = item.querySelector(".faqQ");
    const panel = item.querySelector(".faqA");
    const icon = item.querySelector(".faqQ__icon");

    btn.addEventListener("click", () => {
      const isOpen = item.classList.contains("is-open");

      item.classList.toggle("is-open", !isOpen);
      icon.textContent = isOpen ? "+" : "–";

      if (!isOpen) {
        panel.style.maxHeight = panel.scrollHeight + "px";
      } else {
        panel.style.maxHeight = "0px";
      }
    });
  });
}

/* =========================
   Templates
========================= */
(function () {
  const CSV_BASE =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vT7bBd8d_YfahCugR2TL-zaYDB7r3-aMXRBifboBW7bLlcJv-ffmtl1TkjmUXa0zowJyEKe8BkFc9ux/pub?gid=279672905&single=true&output=csv";

  const SHEET_NAME = "templates";
  const TARGET_ID = "templates";

  // --- utils ---
  function toBool(v) {
    return String(v).trim().toLowerCase() === "true";
  }

  function stripScripts(html) {
    return String(html).replace(
      /<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi,
      ""
    );
  }

  function withBreaks(html) {
    return stripScripts(html).replace(/\r\n|\r|\n/g, "<br>");
  }
  function extractDriveFileId(url) {
    const s = String(url || "").trim();
    if (!s) return null;

    const m1 = s.match(/\/file\/d\/([a-zA-Z0-9_-]{10,})/);
    if (m1) return m1[1];

    const m2 = s.match(/\/d\/([a-zA-Z0-9_-]{10,})/);
    if (m2) return m2[1];

    const m3 = s.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
    if (m3) return m3[1];

    return null;
  }

  function normalizeImageUrl(url) {
    const s = String(url || "").trim();
    if (!s) return "";

    if (s.includes("lh3.googleusercontent.com/d/")) return s;

    if (s.includes("drive.google.com")) {
      const id = extractDriveFileId(s);
      if (id) return `https://lh3.googleusercontent.com/d/${id}`;
    }

    return s;
  }

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

      if (!inQuotes && (ch === "," || ch === "\n" || ch === "\r")) {
        row.push(cur);
        cur = "";

        if (ch === "\r" && next === "\n") i++;
        if (ch === "\n" || ch === "\r") {
          if (row.some((c) => String(c).trim() !== "")) rows.push(row);
          row = [];
        }
        continue;
      }
      cur += ch;
    }

    row.push(cur);
    if (row.some((c) => String(c).trim() !== "")) rows.push(row);
    return rows;
  }

  function rowsToObjects(rows) {
    const header = rows[0].map((h) => String(h).trim());
    const body = rows.slice(1);

    return body.map((r) => {
      const obj = {};
      header.forEach((h, i) => (obj[h] = r[i] ?? ""));
      return obj;
    });
  }

  function normalizeRow(o) {
    const pick = (keys) => {
      for (const k of keys) {
        const v = o[k];
        if (v !== undefined && v !== null) return v;
      }
      return "";
    };

    return {
      key: String(pick(["key", "Key", "KEY", "\ufeffkey"])).trim(),
      name: String(pick(["name", "Name", "NAME", "\ufeffname"])).trim(),
      package: String(pick(["package", "Package", "PACKAGE", "\ufeffpackage"])).trim(),
      section: String(pick(["section", "Section", "SECTION", "\ufeffsection"])).trim(),
      image: normalizeImageUrl(pick(["image", "Image", "IMAGE", "\ufeffimage"])),
      desc: String(pick(["desc", "Desc", "DESC", "\ufeffdesc"])).trim(),
      note: String(pick(["note", "Note", "NOTE", "\ufeffnote"])).trim(),
      tags: String(pick(["tags", "Tags", "TAGS", "\ufefftags"])).trim(),
      order: Number(String(pick(["order", "Order", "ORDER", "\ufefforder"])).trim() || 0),
      hidden: toBool(pick(["hidden", "Hidden", "HIDDEN", "\ufeffhidden"])),
    };
  }

  function groupTemplates(rows) {
    const map = new Map();

    for (const raw of rows) {
      const r = normalizeRow(raw);
      if (!r.key) continue;

      if (r.hidden) continue;

      if (!r.image) continue;

      if (!map.has(r.key)) {
        map.set(r.key, {
          key: r.key,
          name: r.name,
          package: r.package,
          section: r.section,
          tags: r.tags,
          slides: [],
        });
      }

      const g = map.get(r.key);
      if (!g.name && r.name) g.name = r.name;
      if (!g.package && r.package) g.package = r.package;
      if (!g.section && r.section) g.section = r.section;
      if (!g.tags && r.tags) g.tags = r.tags;

      g.slides.push({
        image: r.image,
        desc: r.desc,
        note: r.note,
        order: r.order,
      });
    }

    const templates = Array.from(map.values())
      .map((t) => {
        t.slides.sort((a, b) => (a.order || 0) - (b.order || 0));
        return t;
      })
      .filter((t) => t.slides.length >= 5);

    return templates;
  }

  function renderDebug(templates) {
    const root = document.getElementById(TARGET_ID);
    if (!root) return;

    if (!templates.length) {
      root.innerHTML = `
        <div class="sec__head">
          <p class="sec__eyebrow">템플릿 미리보기</p>
          <h2 class="sec__title">템플릿 쇼케이스</h2>
          <p class="sec__desc">준비된 템플릿을 불러오고 있어요.</p>
        </div>
        <div class="card">
          <div class="notice__error">표시할 템플릿이 없습니다. (이미지 5장 이상 & hidden=FALSE)</div>
        </div>
      `;
      return;
    }

    const cards = templates
      .map((t) => {
        const cover = t.slides[0]?.image || "";
        const count = t.slides.length;
        const name = t.name || t.key;

        return `
          <div class="tplCard">
            <div class="tplCard__thumb">
              <img src="${cover}" alt="${name}">
            </div>
            <div class="tplCard__meta">
              <div class="tplCard__name">${name}</div>
              <div class="tplCard__sub">${count} slides</div>
            </div>
          </div>
        `.trim();
      })
      .join("");

    root.innerHTML = `
      <div class="sec__head">
        <p class="sec__eyebrow">템플릿 미리보기</p>
        <h2 class="sec__title">템플릿 쇼케이스</h2>
        <p class="sec__desc">템플릿별 슬라이드를 확인할 수 있습니다.</p>
      </div>

      <div class="card">
        <div class="tplGrid">
          ${cards}
        </div>
      </div>
    `;
  }

  async function loadTemplates() {
    const root = document.getElementById(TARGET_ID);
    if (!root) return;

    const url = CSV_BASE + `&sheet=${encodeURIComponent(SHEET_NAME)}`;

    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error("CSV fetch failed: " + res.status);

      const csvText = await res.text();
      const rows = parseCSV(csvText);
      const objs = rowsToObjects(rows);

      const templates = groupTemplates(objs);

      console.log("[templates] groups:", templates.length);
      console.log("[templates] sample:", templates[0]);

      renderDebug(templates);
      bindTemplateCards(templates);
    } catch (err) {
      console.warn("[templates] load failed:", err);
      root.innerHTML =
        `<div class="notice__error">템플릿을 불러오지 못했습니다. (시트 공개/탭/헤더 확인)</div>`;
    }
  }

  document.addEventListener("DOMContentLoaded", loadTemplates);
})();

/* =========================
   Template Slider UI
========================= */
(function () {
  const viewer = document.getElementById("tplViewer");
  const slidesEl = viewer.querySelector(".tplSlides");
  const dotsEl = viewer.querySelector(".tplDots");
  const descEl = viewer.querySelector(".tplCaption__desc");
  const noteEl = viewer.querySelector(".tplCaption__note");

  let current = 0;
  let slides = [];

  function openViewer(template) {
    slides = template.slides;
    current = 0;
    const tagsEl = viewer.querySelector(".tplTags");

    slidesEl.innerHTML = slides
      .map(
        (s) =>
          `<div class="tplSlide"><img src="${s.image}" alt=""></div>`
      )
      .join("");

    dotsEl.innerHTML = slides
      .map((_, i) => `<button data-i="${i}"></button>`)
      .join("");

    tagsEl.innerHTML = "";

    if (template.tags) {
      template.tags.split(",").forEach(tag => {
        const span = document.createElement("span");
        span.className = "tplTag";
        span.textContent = tag.trim();
        tagsEl.appendChild(span);
      });
    }

    viewer.hidden = false;
    update();
  }

  function closeViewer() {
    viewer.hidden = true;
  }

  function update() {
    slidesEl.style.transform = `translateX(-${current * 100}%)`;

    const slide = slides[current];
    descEl.innerHTML = slide.desc || "";
    noteEl.innerHTML = slide.note || "";

    dotsEl.querySelectorAll("button").forEach((b, i) => {
      b.classList.toggle("is-active", i === current);
    });
  }

  viewer.querySelector(".tplNav--prev").onclick = () => {
    current = (current - 1 + slides.length) % slides.length;
    update();
  };

  viewer.querySelector(".tplNav--next").onclick = () => {
    current = (current + 1) % slides.length;
    update();
  };

  dotsEl.onclick = (e) => {
    const i = e.target.dataset.i;
    if (i !== undefined) {
      current = Number(i);
      update();
    }
  };

  viewer.querySelector(".tplViewer__close").onclick = closeViewer;
  viewer.querySelector(".tplViewer__backdrop").onclick = closeViewer;

  window.bindTemplateCards = function (templates) {
    document.querySelectorAll(".tplCard").forEach((card, idx) => {
      card.addEventListener("click", () => {
        openViewer(templates[idx]);
      });
    });
  };
})();


/* =========================
   Portfolio
========================= */
(function () {
  const CSV_URL =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vT7bBd8d_YfahCugR2TL-zaYDB7r3-aMXRBifboBW7bLlcJv-ffmtl1TkjmUXa0zowJyEKe8BkFc9ux/pub?gid=400850518&single=true&output=csv";

  const TARGET_ID = "portfolio";

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

      if (!inQuotes && (ch === "," || ch === "\n" || ch === "\r")) {
        row.push(cur);
        cur = "";

        if (ch === "\r" && next === "\n") i++;
        if (ch === "\n" || ch === "\r") {
          if (row.some((c) => String(c).trim() !== "")) rows.push(row);
          row = [];
        }
        continue;
      }

      cur += ch;
    }

    row.push(cur);
    if (row.some((c) => String(c).trim() !== "")) rows.push(row);
    return rows;
  }

  function rowsToObjects(rows) {
    const header = rows[0].map((h) => String(h).trim());
    const body = rows.slice(1);

    return body.map((r) => {
      const obj = {};
      header.forEach((h, i) => (obj[h] = r[i] ?? ""));
      return obj;
    });
  }

  function extractDriveFileId(url) {
    const s = String(url || "").trim();
    if (!s) return null;

    const m1 = s.match(/\/file\/d\/([a-zA-Z0-9_-]{10,})/);
    if (m1) return m1[1];

    const m2 = s.match(/\/d\/([a-zA-Z0-9_-]{10,})/);
    if (m2) return m2[1];

    const m3 = s.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
    if (m3) return m3[1];

    return null;
  }

  function normalizeImageUrl(url) {
    const s = String(url || "").trim();
    if (!s) return "";

    // 이미 변환된 형태면 그대로
    if (s.includes("lh3.googleusercontent.com/d/")) return s;

    // drive 링크면 파일 id 뽑아서 변환
    if (s.includes("drive.google.com")) {
      const id = extractDriveFileId(s);
      if (id) return `https://lh3.googleusercontent.com/d/${id}`;
    }

    return s;
  }

  function escHtml(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function escAttr(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function normalizeRow(o) {
    const pick = (keys) => {
      for (const k of keys) {
        const v = o[k];
        if (v !== undefined && v !== null) return v;
      }
      return "";
    };

    return {
      order: Number(String(pick(["order", "Order", "ORDER", "\ufefforder"])).trim()) || 0,
      name: String(pick(["name", "Name", "NAME", "\ufeffname"])).trim(),
      package: String(pick(["package", "Package", "PACKAGE", "\ufeffpackage"])).trim(),
      section: String(pick(["section", "Section", "SECTION", "\ufeffsection"])).trim(),
      type: String(pick(["type", "Type", "TYPE", "\ufefftype"])).trim(),
      image: normalizeImageUrl(pick(["image", "Image", "IMAGE", "\ufeffimage"])),
      link: String(pick(["link", "Link", "LINK", "\ufefflink", "url", "URL"])).trim(),
    };
  }

  function renderPortfolio(items) {
    const root = document.getElementById(TARGET_ID);
    if (!root) return;

    if (!items.length) {
      root.innerHTML = `
        <div class="sec__head">
          <p class="sec__eyebrow">포트폴리오</p>
          <h2 class="sec__title">제작 사례</h2>
          <p class="sec__desc">표시할 포트폴리오가 없습니다.</p>
        </div>
        <div class="card">
          <div class="notice__error">CSV 데이터/공개 설정/헤더를 확인해주세요.</div>
        </div>
      `;
      return;
    }

    const cards = items
      .map((it) => {
        const title = it.name || "Untitled";
        const subParts = [it.package, it.section, it.type]
        .filter(Boolean)
        .map(v => `<span>${escHtml(v)}</span>`)
        .join("");
        const href = it.link || "#";
        const img = it.image || "";

        return `
        <a class="tplCard pfCard" href="${escAttr(href)}" target="_blank" rel="noopener noreferrer">
          <div class="tplCard__thumb">
            ${
              img
                ? `<img src="${escAttr(img)}" alt="${escAttr(title)}" loading="lazy">`
                : ``
            }
            <span class="pfCard__ext" aria-hidden="true">
              <svg viewBox="0 0 16 16" class="pfCard__icon">
                <path fill-rule="evenodd" d="M8.636 3.5a.5.5 0 0 0-.5-.5H1.5A1.5 1.5 0 0 0 0 4.5v10A1.5 1.5 0 0 0 1.5 16h10a1.5 1.5 0 0 0 1.5-1.5V7.864a.5.5 0 0 0-1 0V14.5a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h6.636a.5.5 0 0 0 .5-.5"/>
                <path fill-rule="evenodd" d="M16 .5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0 0 1h3.793L6.146 9.146a.5.5 0 1 0 .708.708L15 1.707V5.5a.5.5 0 0 0 1 0z"/>
              </svg>
            </span>
          </div>

          <div class="tplCard__meta">
            <div class="tplCard__name">${escHtml(title)}</div>
            <div class="tplCard__sub">${subParts}</div>
          </div>
        </a>
      `.trim();
      })
      .join("");

    root.innerHTML = `
      <div class="sec__head">
        <p class="sec__eyebrow">포트폴리오</p>
        <h2 class="sec__title">제작 사례</h2>
        <p class="sec__desc">카드를 클릭하면 아트머그 페이지로 이동합니다.</p>
      </div>

      <div class="card">
        <div class="tplGrid">
          ${cards}
        </div>
      </div>
    `;
  }

  async function loadPortfolio() {
    const root = document.getElementById(TARGET_ID);
    if (!root) return;

    root.innerHTML = `
      <div class="sec__head">
        <p class="sec__eyebrow">포트폴리오</p>
        <h2 class="sec__title">제작 사례</h2>
        <p class="sec__desc">불러오는 중…</p>
      </div>
      <div class="card">
        <div class="notice__loading">불러오는 중…</div>
      </div>
    `;

    try {
      const res = await fetch(CSV_URL, { cache: "no-store" });
      if (!res.ok) throw new Error("CSV fetch failed: " + res.status);

      const csvText = await res.text();
      const rows = parseCSV(csvText);
      if (!rows || rows.length < 2) throw new Error("CSV empty");

      const objs = rowsToObjects(rows);
      const items = objs
        .map(normalizeRow)
        .filter((it) => it.name && it.link)
        .sort((a, b) => (a.order || 0) - (b.order || 0));

      renderPortfolio(items);
    } catch (err) {
      console.warn("[portfolio] load failed:", err);
      root.innerHTML =
        `<div class="notice__error">포트폴리오를 불러오지 못했습니다. (시트 공개/CSV 링크/헤더 확인)</div>`;
    }
  }

  document.addEventListener("DOMContentLoaded", loadPortfolio);
})();



// nav
(function initHamburgerNav(){
  const header = document.getElementById("nav");
  if(!header) return;

  const btn = header.querySelector(".topnav__toggle");
  const menu = header.querySelector("#navMenu");
  if(!btn || !menu) return;

  function open(){
    header.classList.add("is-open");
    btn.setAttribute("aria-expanded","true");
    btn.setAttribute("aria-label","메뉴 닫기");
  }
  function close(){
    header.classList.remove("is-open");
    btn.setAttribute("aria-expanded","false");
    btn.setAttribute("aria-label","메뉴 열기");
  }
  function toggle(){
    header.classList.contains("is-open") ? close() : open();
  }

  btn.addEventListener("click", (e) => {
    e.preventDefault();
    toggle();
  });

  menu.addEventListener("click", (e) => {
    const a = e.target.closest("a");
    if(a) close();
  });

  document.addEventListener("click", (e) => {
    if(!header.classList.contains("is-open")) return;
    if(e.target.closest("#nav")) return;
    close();
  });

  document.addEventListener("keydown", (e) => {
    if(e.key === "Escape") close();
  });
})();
