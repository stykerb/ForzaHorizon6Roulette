/**
 * js/app.js
 * -----------------------------------------------------------------------
 * FH6 Roulette - app logic.
 *
 * This file is data-agnostic: it doesn't know the specifics of any race,
 * car, or brand. Everything content-related lives in data/*.js. If you
 * ever add a brand-new CATEGORY (not just a new item in an existing
 * category), add one entry to the CATEGORIES array below and everything
 * else (rendering, filters, persistence, spinning) works automatically.
 * -----------------------------------------------------------------------
 */
(function () {
  "use strict";

  const CATEGORIES = [
    { key: "race", label: "Race Type", icon: "\u{1F3C1}", data: RACE_TYPES },
    { key: "carType", label: "Car Type", icon: "\u{1F697}", data: CAR_TYPES },
    { key: "brand", label: "Brand", icon: "\u{1F3ED}", data: BRANDS, sub: (item) => countryName(item.country) },
    { key: "country", label: "Country", icon: "\u{1F30D}", data: COUNTRIES },
    { key: "decade", label: "Decade", icon: "\u{1F4C5}", data: DECADES },
    { key: "class", label: "Performance Class", icon: "⚡", data: PERFORMANCE_CLASSES, sub: (item) => `PI ${item.pi}`, color: (item) => item.color },
  ];

  const LS_FILTERS = "fh6r-disabled-ids-v1";
  const LS_HISTORY = "fh6r-history-v1";
  const LS_CURRENT = "fh6r-current-v1";
  const MAX_HISTORY = 30;

  function countryName(id) {
    const c = COUNTRIES.find((x) => x.id === id);
    return c ? c.name : id;
  }

  // ---- persistence -------------------------------------------------
  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      console.warn("fh6-roulette: failed to read", key, e);
      return fallback;
    }
  }
  function saveJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn("fh6-roulette: failed to save", key, e);
    }
  }

  // disabledIds: { race: [id, id...], carType: [...], ... }
  // Anything NOT listed is enabled by default - new items added to a
  // data file later are automatically included for existing users.
  const disabledIds = loadJSON(LS_FILTERS, {});
  CATEGORIES.forEach((c) => {
    if (!disabledIds[c.key]) disabledIds[c.key] = [];
  });

  let history = loadJSON(LS_HISTORY, []);
  let current = loadJSON(LS_CURRENT, {}); // { race: item, carType: item, ... }

  function persistFilters() {
    saveJSON(LS_FILTERS, disabledIds);
  }
  function persistHistory() {
    saveJSON(LS_HISTORY, history);
  }
  function persistCurrent() {
    saveJSON(LS_CURRENT, current);
  }

  // ---- pool helpers --------------------------------------------------
  function enabledPool(cat) {
    const disabled = new Set(disabledIds[cat.key]);
    return cat.data.filter((item) => !disabled.has(item.id));
  }

  function randomFrom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // ---- DOM building ----------------------------------------------------
  const root = document.getElementById("categories");
  const cardsByKey = {};

  function buildCard(cat) {
    const card = document.createElement("section");
    card.className = "card";
    card.dataset.key = cat.key;

    const header = document.createElement("div");
    header.className = "card-header";
    header.innerHTML = `
      <span class="card-icon">${cat.icon}</span>
      <span class="card-label">${cat.label}</span>
      <span class="card-count" data-role="count"></span>
    `;

    const result = document.createElement("div");
    result.className = "card-result";
    result.dataset.role = "result";
    result.innerHTML = `<span class="placeholder">Spin to reveal</span>`;

    const sub = document.createElement("div");
    sub.className = "card-sub";
    sub.dataset.role = "sub";

    const actions = document.createElement("div");
    actions.className = "card-actions";
    actions.innerHTML = `
      <button type="button" class="btn btn-spin" data-role="spin-one">\u{1F3B2} Spin</button>
      <button type="button" class="btn btn-filter" data-role="toggle-filter">⚙️ Filters</button>
    `;

    const filterPanel = document.createElement("div");
    filterPanel.className = "filter-panel hidden";
    filterPanel.dataset.role = "filter-panel";

    const needsSearch = cat.data.length > 12;
    filterPanel.innerHTML = `
      ${needsSearch ? `<input type="search" class="filter-search" placeholder="Search ${cat.label.toLowerCase()}..." data-role="search">` : ""}
      <div class="filter-toolbar">
        <button type="button" class="btn btn-tiny" data-role="select-all">Select all</button>
        <button type="button" class="btn btn-tiny" data-role="select-none">Select none</button>
      </div>
      <div class="filter-list" data-role="filter-list"></div>
    `;

    card.appendChild(header);
    card.appendChild(result);
    card.appendChild(sub);
    card.appendChild(actions);
    card.appendChild(filterPanel);
    root.appendChild(card);

    cardsByKey[cat.key] = card;

    renderFilterList(cat);
    updateCount(cat);
    renderResult(cat);

    // events
    card.querySelector('[data-role="spin-one"]').addEventListener("click", () => spinOne(cat, true));
    card.querySelector('[data-role="toggle-filter"]').addEventListener("click", () => {
      filterPanel.classList.toggle("hidden");
    });
    card.querySelector('[data-role="select-all"]').addEventListener("click", () => {
      disabledIds[cat.key] = [];
      persistFilters();
      renderFilterList(cat);
      updateCount(cat);
    });
    card.querySelector('[data-role="select-none"]').addEventListener("click", () => {
      disabledIds[cat.key] = cat.data.map((i) => i.id);
      persistFilters();
      renderFilterList(cat);
      updateCount(cat);
    });
    const searchInput = card.querySelector('[data-role="search"]');
    if (searchInput) {
      searchInput.addEventListener("input", () => renderFilterList(cat, searchInput.value));
    }
  }

  function renderFilterList(cat, filterText) {
    const card = cardsByKey[cat.key];
    const list = card.querySelector('[data-role="filter-list"]');
    const disabled = new Set(disabledIds[cat.key]);
    const term = (filterText || "").trim().toLowerCase();

    list.innerHTML = "";
    cat.data
      .filter((item) => !term || item.name.toLowerCase().includes(term))
      .forEach((item) => {
        const id = `chk-${cat.key}-${item.id}`;
        const row = document.createElement("label");
        row.className = "filter-row";
        row.htmlFor = id;
        row.innerHTML = `
          <input type="checkbox" id="${id}" ${disabled.has(item.id) ? "" : "checked"}>
          <span>${item.name}${cat.sub ? ` <em>(${cat.sub(item)})</em>` : ""}</span>
        `;
        row.querySelector("input").addEventListener("change", (e) => {
          const set = new Set(disabledIds[cat.key]);
          if (e.target.checked) set.delete(item.id);
          else set.add(item.id);
          disabledIds[cat.key] = Array.from(set);
          persistFilters();
          updateCount(cat);
        });
        list.appendChild(row);
      });
  }

  function updateCount(cat) {
    const card = cardsByKey[cat.key];
    const total = cat.data.length;
    const enabled = enabledPool(cat).length;
    card.querySelector('[data-role="count"]').textContent = `${enabled}/${total}`;
    const spinBtn = card.querySelector('[data-role="spin-one"]');
    spinBtn.disabled = enabled === 0;
    card.classList.toggle("empty-pool", enabled === 0);

    // The specific-race pool is filtered by the Race Type card's filters,
    // so keep its count/spin-state in sync whenever those change.
    if (cat.key === "race") updateSpecificRaceCount();
  }

  function renderResult(cat) {
    const card = cardsByKey[cat.key];
    const resultEl = card.querySelector('[data-role="result"]');
    const subEl = card.querySelector('[data-role="sub"]');
    const item = current[cat.key];
    if (!item) {
      resultEl.innerHTML = `<span class="placeholder">Spin to reveal</span>`;
      subEl.textContent = "";
      return;
    }
    resultEl.textContent = item.name;
    resultEl.style.color = cat.color ? cat.color(item) : "";
    subEl.textContent = cat.sub ? cat.sub(item) : (item.desc || "");
  }

  function spinOne(cat, animate) {
    const pool = enabledPool(cat);
    if (pool.length === 0) return null;
    const card = cardsByKey[cat.key];
    const resultEl = card.querySelector('[data-role="result"]');

    const pick = randomFrom(pool);
    current[cat.key] = pick;
    persistCurrent();

    if (animate) {
      resultEl.classList.remove("flash");
      // force reflow so the animation can restart on repeated spins
      void resultEl.offsetWidth;
      resultEl.classList.add("flash");
    }
    renderResult(cat);
    return pick;
  }

  function spinAll() {
    let anyEmpty = false;
    CATEGORIES.forEach((cat) => {
      const result = spinOne(cat, true);
      if (result === null) anyEmpty = true;
    });
    if (anyEmpty) {
      showToast("One or more categories have no items enabled - check filters.");
    }
    pushHistory();
  }

  function pushHistory() {
    const snapshot = {
      ts: Date.now(),
      values: {},
    };
    CATEGORIES.forEach((cat) => {
      const item = current[cat.key];
      snapshot.values[cat.key] = item ? item.name : null;
    });
    history.unshift(snapshot);
    if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
    persistHistory();
    renderHistory();
  }

  function renderHistory() {
    const list = document.getElementById("history-list");
    list.innerHTML = "";
    if (history.length === 0) {
      list.innerHTML = `<p class="placeholder">No challenges saved yet. Hit "Spin All" to generate one.</p>`;
      return;
    }
    history.forEach((entry) => {
      const row = document.createElement("div");
      row.className = "history-row";
      const date = new Date(entry.ts);
      const parts = CATEGORIES.map((cat) => entry.values[cat.key] || "—").join(" · ");
      row.innerHTML = `
        <span class="history-time">${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
        <span class="history-parts">${parts}</span>
      `;
      list.appendChild(row);
    });
  }

  // ---- "Roll a Specific Race" section -----------------------------------
  // Has no filter UI of its own - it reuses the Race Type card's
  // disabledIds["race"] set, matched against each race's `typeId`.
  const specificRaceEls = {
    result: document.getElementById("specific-race-result"),
    sub: document.getElementById("specific-race-sub"),
    count: document.getElementById("specific-race-count"),
    spinBtn: document.getElementById("specific-race-spin"),
  };

  function raceTypeName(typeId) {
    const t = RACE_TYPES.find((x) => x.id === typeId);
    return t ? t.name : typeId;
  }

  function specificRacePool() {
    const disabled = new Set(disabledIds.race);
    return INDIVIDUAL_RACES.filter((r) => !disabled.has(r.typeId));
  }

  function updateSpecificRaceCount() {
    const total = INDIVIDUAL_RACES.length;
    const enabled = specificRacePool().length;
    specificRaceEls.count.textContent = `${enabled}/${total}`;
    specificRaceEls.spinBtn.disabled = enabled === 0;
  }

  function renderSpecificRace() {
    const race = current.specificRace;
    if (!race) {
      specificRaceEls.result.innerHTML = `<span class="placeholder">Spin to reveal</span>`;
      specificRaceEls.sub.textContent = "";
      return;
    }
    specificRaceEls.result.textContent = race.name;
    specificRaceEls.sub.textContent = raceTypeName(race.typeId);
  }

  function spinSpecificRace() {
    const pool = specificRacePool();
    if (pool.length === 0) {
      showToast("No race types enabled - check the Race Type card's filters.");
      return;
    }
    current.specificRace = randomFrom(pool);
    persistCurrent();
    specificRaceEls.result.classList.remove("flash");
    void specificRaceEls.result.offsetWidth;
    specificRaceEls.result.classList.add("flash");
    renderSpecificRace();
  }

  specificRaceEls.spinBtn.addEventListener("click", spinSpecificRace);

  function showToast(msg) {
    const toast = document.getElementById("toast");
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove("show"), 2600);
  }

  function buildCurrentChallengeText() {
    const lines = CATEGORIES.map((cat) => `${cat.label}: ${current[cat.key] ? current[cat.key].name : "—"}`);
    if (current.specificRace) lines.push(`Specific Race: ${current.specificRace.name}`);
    return lines.join("\n");
  }

  // ---- wire up global controls ----------------------------------------
  document.getElementById("spin-all").addEventListener("click", spinAll);

  document.getElementById("copy-challenge").addEventListener("click", async () => {
    const text = buildCurrentChallengeText();
    try {
      await navigator.clipboard.writeText(text);
      showToast("Challenge copied to clipboard!");
    } catch (e) {
      showToast("Couldn't copy automatically - select and copy manually.");
    }
  });

  document.getElementById("clear-history").addEventListener("click", () => {
    if (history.length === 0) return;
    if (!confirm("Clear all saved challenge history?")) return;
    history = [];
    persistHistory();
    renderHistory();
  });

  document.getElementById("reset-filters").addEventListener("click", () => {
    if (!confirm("Reset all filters back to \"everything enabled\"?")) return;
    CATEGORIES.forEach((cat) => {
      disabledIds[cat.key] = [];
    });
    persistFilters();
    CATEGORIES.forEach((cat) => {
      renderFilterList(cat);
      updateCount(cat);
    });
    showToast("Filters reset.");
  });

  // ---- init -------------------------------------------------------------
  CATEGORIES.forEach(buildCard);
  renderHistory();
  renderSpecificRace();
  updateSpecificRaceCount();
})();
