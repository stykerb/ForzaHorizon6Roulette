/**
 * js/app.js
 * -----------------------------------------------------------------------
 * FH6 Roulette - app logic.
 *
 * Two dependent chains get rolled, plus one standalone category:
 *
 *   1. Race Type -> Specific Race
 *      Specific Race is filtered by whichever Race Types are enabled in
 *      the Race Type card's filters (data/raceTypes.js + data/individualRaces.js).
 *
 *   2. Car Type -> Country -> Brand -> Decade -> Performance Class
 *      Each stage rules out choices that don't correspond to a real car
 *      in data/cars.js given everything else currently locked in - both
 *      what's been *rolled* upstream AND what every stage's *filters*
 *      allow, so a narrow filter on one stage (e.g. Country -> Austria
 *      only) can never leave a later stage with zero valid options.
 *      Performance Class isn't picked from a fixed list so much as
 *      computed - see computeLegalClassIds() below for the tuning-
 *      headroom rules.
 *
 *   3. Season - fully independent, plain equal-odds pick.
 *
 * Every category (except Performance Class) can also roll "Any" - a
 * wildcard meaning "no constraint here." Car Type/Country/Brand/Decade
 * are weighted by how many real cars back each option, toggle-able off
 * for uniform "truly random" odds. Rendering, filter panels, and
 * persistence stay generic over the CATEGORIES list.
 * -----------------------------------------------------------------------
 */
(function () {
  "use strict";

  const ANY = Object.freeze({ id: "__any__", name: "Any" });

  // The car-attribute cascade, in roll order. Every stage's legality is
  // resolved jointly with every OTHER stage in this list (see
  // carsSatisfyingAllExcept) - not just the ones rolled before it - so
  // filters on any of them keep every stage reachable.
  const CASCADE_ORDER = ["carType", "country", "brand", "decade"];
  const CASCADE_CAR_FIELD = { carType: "type", country: "country", brand: "make", decade: "decade" };

  const CATEGORIES = [
    { key: "race", label: "Race Type", icon: "\u{1F3C1}", data: RACE_TYPES, group: "race", allowAny: true, weightable: false },
    { key: "specificRace", label: "Specific Race", icon: "\u{1F5FA}️", data: INDIVIDUAL_RACES, group: "race", allowAny: true, weightable: false, noFilter: true, note: "Locked to the Race Type above once it's rolled - otherwise pulls from every enabled Race Type." },
    { key: "season", label: "Season", icon: "\u{1F324}️", data: SEASONS, group: "race", allowAny: true, weightable: false },
    { key: "carType", label: "Car Type", icon: "\u{1F697}", data: CAR_TYPES, group: "car", allowAny: true, weightable: true },
    { key: "country", label: "Country", icon: "\u{1F30D}", data: COUNTRIES, group: "car", allowAny: true, weightable: true },
    { key: "brand", label: "Brand", icon: "\u{1F3ED}", data: BRANDS, group: "car", allowAny: true, weightable: true, sub: (item) => (item.id === ANY.id ? "" : countryName(item.country)) },
    { key: "decade", label: "Decade", icon: "\u{1F4C5}", data: DECADES, group: "car", allowAny: true, weightable: true },
    { key: "class", label: "Performance Class", icon: "⚡", data: PERFORMANCE_CLASSES, group: "car", allowAny: false, weightable: false, sub: (item) => (item.id === ANY.id ? "" : `PI ${item.pi}`), color: (item) => (item.id === ANY.id ? "" : item.color) },
  ];
  const categoryByKey = {};
  CATEGORIES.forEach((c) => (categoryByKey[c.key] = c));

  const CLASS_ORDER = PERFORMANCE_CLASSES.map((c) => c.id); // low -> high, e.g. ["d","c","b","a","s1","s2","r","x"]

  const LS_FILTERS = "fh6r-disabled-ids-v2";
  const LS_HISTORY = "fh6r-history-v2";
  const LS_CURRENT = "fh6r-current-v2";
  const LS_STOCK_ONLY = "fh6r-stock-only-v1";
  const LS_WEIGHTED = "fh6r-weighted-v1";
  const LS_STRICT = "fh6r-strict-v1";
  const MAX_HISTORY = 30;

  function countryName(id) {
    const c = COUNTRIES.find((x) => x.id === id);
    return c ? c.name : id;
  }

  // ---- persistence -------------------------------------------------
  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? JSON.parse(raw) : fallback;
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
  let current = loadJSON(LS_CURRENT, {}); // { race: item, carType: item, ..., specificRace: item, season: item }
  let stockOnly = loadJSON(LS_STOCK_ONLY, false);
  let weighted = loadJSON(LS_WEIGHTED, true);
  let strictMode = loadJSON(LS_STRICT, false);

  function persistFilters() {
    saveJSON(LS_FILTERS, disabledIds);
  }
  function persistHistory() {
    saveJSON(LS_HISTORY, history);
  }
  function persistCurrent() {
    saveJSON(LS_CURRENT, current);
  }
  function persistSettings() {
    saveJSON(LS_STOCK_ONLY, stockOnly);
    saveJSON(LS_WEIGHTED, weighted);
    saveJSON(LS_STRICT, strictMode);
  }

  function isAny(item) {
    return !!item && item.id === ANY.id;
  }

  // ---- the car cascade ---------------------------------------------------
  // Cars consistent with every cascade stage EXCEPT excludeKey - both that
  // stage's own disabled-filter set AND (if it's been rolled, and isn't
  // "Any") its rolled value. Passing null excludes nothing, i.e. every
  // stage's filters+rolled value applies (used for Performance Class,
  // which isn't itself one of the four structural fields).
  function carsSatisfyingAllExcept(excludeKey) {
    const disabledSets = {};
    CASCADE_ORDER.forEach((key) => {
      disabledSets[key] = new Set(disabledIds[key]);
    });
    return CARS.filter((car) => {
      for (let i = 0; i < CASCADE_ORDER.length; i++) {
        const key = CASCADE_ORDER[i];
        if (key === excludeKey) continue;
        const field = CASCADE_CAR_FIELD[key];
        if (disabledSets[key].has(car[field])) return false;
        const sel = current[key];
        if (sel && !isAny(sel) && car[field] !== sel.id) return false;
      }
      return true;
    });
  }

  function classIndex(id) {
    return CLASS_ORDER.indexOf(id);
  }

  // "Impossible" performance classes are classes lower than the lowest-PI
  // stock car available given everything else rolled - cars can be tuned
  // UP, never down. Every car can reach S2 or lower; reaching R needs a
  // stock S2-or-higher car in the pool, and reaching X needs a stock
  // R-or-higher car in the pool. With "Stock cars only" on, none of that
  // tuning headroom applies - only classes cars actually ship in are legal.
  function computeLegalClassIds(matchingCars) {
    if (matchingCars.length === 0) return [];
    if (stockOnly) {
      const present = new Set(matchingCars.map((c) => c.class));
      return CLASS_ORDER.filter((id) => present.has(id));
    }
    const indices = matchingCars.map((c) => classIndex(c.class));
    const minIdx = Math.min(...indices);
    const hasS2Plus = indices.some((i) => i >= classIndex("s2"));
    const hasRPlus = indices.some((i) => i >= classIndex("r"));
    let maxIdx = classIndex("s2");
    if (hasS2Plus) maxIdx = classIndex("r");
    if (hasRPlus) maxIdx = classIndex("x");
    return CLASS_ORDER.slice(minIdx, maxIdx + 1);
  }

  // ---- pools: {item, weight}[] of REAL (non-Any) options ------------------
  function realPoolFor(cat) {
    if (cat.key === "class") {
      const disabled = new Set(disabledIds.class);
      const matchingCars = carsSatisfyingAllExcept(null);
      const legalIds = new Set(computeLegalClassIds(matchingCars));
      return PERFORMANCE_CLASSES.filter((item) => legalIds.has(item.id) && !disabled.has(item.id)).map((item) => ({ item, weight: 1 }));
    }

    if (CASCADE_ORDER.indexOf(cat.key) !== -1) {
      const disabled = new Set(disabledIds[cat.key]);
      const matchingCars = carsSatisfyingAllExcept(cat.key);
      const field = CASCADE_CAR_FIELD[cat.key];
      const counts = new Map();
      matchingCars.forEach((car) => {
        const id = car[field];
        counts.set(id, (counts.get(id) || 0) + 1);
      });
      const useWeights = cat.weightable && weighted;
      return cat.data
        .filter((item) => counts.has(item.id) && !disabled.has(item.id))
        .map((item) => ({ item, weight: useWeights ? counts.get(item.id) : 1 }));
    }

    if (cat.key === "specificRace") {
      const disabled = new Set(disabledIds.race); // reuses the Race Type card's filter
      const raceSel = current.race;
      return INDIVIDUAL_RACES.filter((r) => !disabled.has(r.typeId) && (!raceSel || isAny(raceSel) || r.typeId === raceSel.id)).map((item) => ({ item, weight: 1 }));
    }

    // "race", "season" - simple filter-based, equal odds
    const disabled = new Set(disabledIds[cat.key]);
    return cat.data.filter((item) => !disabled.has(item.id)).map((item) => ({ item, weight: 1 }));
  }

  // Full pool including "Any", when it applies. "Any" is skipped when
  // Strict Mode is on, the category doesn't allow it, or there's only one
  // real option anyway (Any would be redundant with it). Any's own weight
  // is the pool's average weight, so it reads as "about as likely as a
  // typical single option" rather than dominating or vanishing.
  function fullPool(cat) {
    const real = realPoolFor(cat);
    if (!cat.allowAny || strictMode || real.length <= 1) return real;
    const totalWeight = real.reduce((sum, r) => sum + r.weight, 0);
    return [...real, { item: ANY, weight: totalWeight / real.length }];
  }

  function weightedRandom(pool) {
    const total = pool.reduce((sum, p) => sum + p.weight, 0);
    let r = Math.random() * total;
    for (let i = 0; i < pool.length; i++) {
      r -= pool[i].weight;
      if (r <= 0) return pool[i].item;
    }
    return pool[pool.length - 1].item;
  }

  // ---- DOM building ----------------------------------------------------
  const roots = { race: document.getElementById("race-categories"), car: document.getElementById("car-categories") };
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
      ${cat.noFilter ? "" : `<button type="button" class="btn btn-filter" data-role="toggle-filter">⚙️ Filters</button>`}
    `;

    card.appendChild(header);
    card.appendChild(result);
    card.appendChild(sub);
    if (cat.note) {
      const note = document.createElement("div");
      note.className = "card-note";
      note.textContent = cat.note;
      card.appendChild(note);
    }
    card.appendChild(actions);

    let filterPanel = null;
    if (!cat.noFilter) {
      filterPanel = document.createElement("div");
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
      card.appendChild(filterPanel);
    }

    roots[cat.group].appendChild(card);
    cardsByKey[cat.key] = card;

    if (filterPanel) renderFilterList(cat);
    updateCount(cat);
    renderResult(cat);

    // events
    card.querySelector('[data-role="spin-one"]').addEventListener("click", () => spinOne(cat.key, true));
    if (filterPanel) {
      card.querySelector('[data-role="toggle-filter"]').addEventListener("click", () => {
        filterPanel.classList.toggle("hidden");
      });
      card.querySelector('[data-role="select-all"]').addEventListener("click", () => {
        disabledIds[cat.key] = [];
        persistFilters();
        renderFilterList(cat);
        refreshAllCounts();
      });
      card.querySelector('[data-role="select-none"]').addEventListener("click", () => {
        disabledIds[cat.key] = cat.data.map((i) => i.id);
        persistFilters();
        renderFilterList(cat);
        refreshAllCounts();
      });
      const searchInput = card.querySelector('[data-role="search"]');
      if (searchInput) {
        searchInput.addEventListener("input", () => renderFilterList(cat, searchInput.value));
      }
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
          refreshAllCounts();
        });
        list.appendChild(row);
      });
  }

  // A filter change on ANY cascade-linked category can shift what's
  // reachable for every OTHER one (that's the whole point of the fix), so
  // recompute every visible count together rather than just the card whose
  // filter changed.
  function refreshAllCounts() {
    CATEGORIES.forEach(updateCount);
  }

  function updateCount(cat) {
    const card = cardsByKey[cat.key];
    const total = cat.data.length;
    const enabled = realPoolFor(cat).length;
    card.querySelector('[data-role="count"]').textContent = `${enabled}/${total}`;
    const spinBtn = card.querySelector('[data-role="spin-one"]');
    spinBtn.disabled = enabled === 0;
    card.classList.toggle("empty-pool", enabled === 0);
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
    resultEl.classList.toggle("is-any", isAny(item));
    resultEl.style.color = cat.color ? cat.color(item) : "";
    subEl.textContent = isAny(item) ? "No constraint on this pick" : cat.sub ? cat.sub(item) : item.desc || "";
    if (cat.key === "specificRace" && item && !isAny(item)) {
      subEl.textContent = raceTypeName(item.typeId);
    }
  }

  function flashResult(cat) {
    const card = cardsByKey[cat.key];
    const resultEl = card.querySelector('[data-role="result"]');
    resultEl.classList.remove("flash");
    void resultEl.offsetWidth; // force reflow so the animation can restart
    resultEl.classList.add("flash");
  }

  function raceTypeName(typeId) {
    const t = RACE_TYPES.find((x) => x.id === typeId);
    return t ? t.name : typeId;
  }

  // Rolls exactly one stage's value from its current pool. Returns the
  // picked item, or null if that stage has no valid options right now.
  function rollStageValue(cat) {
    const pool = fullPool(cat);
    if (pool.length === 0) {
      current[cat.key] = null;
      return null;
    }
    const pick = weightedRandom(pool);
    current[cat.key] = pick;
    return pick;
  }

  // Spinning a stage invalidates everything downstream of it (a new Car
  // Type can make the current Country/Brand/Decade/Class impossible; a new
  // Race Type can make the current Specific Race impossible), so those
  // stale values are cleared and re-rolled together, always in order.
  function stagesFrom(key) {
    if (key === "race") return ["race", "specificRace"];
    const idx = CASCADE_ORDER.indexOf(key);
    if (idx !== -1) return [...CASCADE_ORDER.slice(idx), "class"];
    return [key]; // specificRace, season, class - nothing depends on these
  }

  function spinOne(key, animate) {
    const stages = stagesFrom(key);
    // Clear stale downstream values FIRST so they don't wrongly constrain
    // the stages being recomputed (e.g. a stale Decade shouldn't limit
    // what Brand can become when re-rolling Brand onward).
    stages.forEach((k) => {
      current[k] = null;
    });
    let anyEmpty = false;
    stages.forEach((stageKey) => {
      const cat = categoryByKey[stageKey];
      const pick = rollStageValue(cat);
      if (pick === null) anyEmpty = true;
      renderResult(cat);
      if (animate) flashResult(cat);
    });
    persistCurrent();
    refreshAllCounts();
    if (anyEmpty) {
      showToast("No valid options for one or more categories - check filters.");
    }
    return current[key];
  }

  const SPIN_ALL_ORDER = ["race", "specificRace", "season", "carType", "country", "brand", "decade", "class"];

  function spinAll() {
    CATEGORIES.forEach((cat) => {
      current[cat.key] = null;
    });
    let anyEmpty = false;
    SPIN_ALL_ORDER.forEach((key) => {
      const cat = categoryByKey[key];
      const pick = rollStageValue(cat);
      if (pick === null) anyEmpty = true;
      renderResult(cat);
      flashResult(cat);
    });
    persistCurrent();
    refreshAllCounts();
    if (anyEmpty) {
      showToast("One or more categories have no valid options - check filters.");
    }
    pushHistory();
  }

  function pushHistory() {
    const snapshot = { ts: Date.now(), values: {} };
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
      const parts = CATEGORIES.map((cat) => entry.values[cat.key] || "—");
      row.innerHTML = `
        <span class="history-time">${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
        <span class="history-parts">${parts.join(" · ")}</span>
      `;
      list.appendChild(row);
    });
  }

  function showToast(msg) {
    const toast = document.getElementById("toast");
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove("show"), 2600);
  }

  // ---- Discord/Slack-friendly markdown for Copy Challenge -----------------
  function buildCurrentChallengeText() {
    const lines = ["🎲 **FH6 Roulette Challenge**", ""];
    CATEGORIES.forEach((cat) => {
      const item = current[cat.key];
      lines.push(`${cat.icon} **${cat.label}:** ${item ? item.name : "—"}`);
    });
    return lines.join("\n");
  }

  // ---- settings toggles ---------------------------------------------------
  function wireToggle(id, getter, setter) {
    const el = document.getElementById(id);
    el.checked = getter();
    el.addEventListener("change", (e) => {
      setter(e.target.checked);
      persistSettings();
      refreshAllCounts();
    });
  }
  wireToggle(
    "weighted-toggle",
    () => weighted,
    (v) => (weighted = v)
  );
  wireToggle(
    "strict-toggle",
    () => strictMode,
    (v) => (strictMode = v)
  );
  wireToggle(
    "stock-only-toggle",
    () => stockOnly,
    (v) => (stockOnly = v)
  );

  // ---- wire up global controls ----------------------------------------
  document.getElementById("spin-all").addEventListener("click", spinAll);

  document.getElementById("copy-challenge").addEventListener("click", async () => {
    const text = buildCurrentChallengeText();
    try {
      await navigator.clipboard.writeText(text);
      showToast("Challenge copied - paste it right into Discord/Slack!");
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
    if (!confirm('Reset all filters back to "everything enabled"?')) return;
    CATEGORIES.forEach((cat) => {
      disabledIds[cat.key] = [];
    });
    persistFilters();
    CATEGORIES.forEach((cat) => {
      if (!cat.noFilter) renderFilterList(cat);
    });
    refreshAllCounts();
    showToast("Filters reset.");
  });

  // ---- data browser modal --------------------------------------------
  const dataModal = document.getElementById("data-modal");
  const dataModalBody = document.getElementById("data-modal-body");
  const dataSearch = document.getElementById("data-modal-search");
  let dataModalTab = "cars";
  let dataModalBuilt = { cars: false, races: false };

  function classDisplay(id) {
    const c = PERFORMANCE_CLASSES.find((x) => x.id === id);
    return c ? c.name : id;
  }
  function nameOf(list, id) {
    const item = list.find((x) => x.id === id);
    return item ? item.name : id;
  }

  function buildDataTable(tab) {
    if (tab === "cars") {
      const rows = CARS.map(
        (c) => `
        <tr>
          <td>${c.name}</td>
          <td>${nameOf(BRANDS, c.make)}</td>
          <td>${nameOf(CAR_TYPES, c.type)}</td>
          <td>${nameOf(COUNTRIES, c.country)}</td>
          <td>${c.year}</td>
          <td>${classDisplay(c.class)}</td>
          <td>${c.pi}</td>
        </tr>`
      ).join("");
      return `
        <table class="data-table" data-role="data-table">
          <thead><tr><th>Name</th><th>Make</th><th>Type</th><th>Country</th><th>Year</th><th>Class</th><th>PI</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>`;
    }
    const rows = INDIVIDUAL_RACES.map(
      (r) => `
      <tr>
        <td>${r.name}</td>
        <td>${raceTypeName(r.typeId)}</td>
      </tr>`
    ).join("");
    return `
      <table class="data-table" data-role="data-table">
        <thead><tr><th>Name</th><th>Race Type</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  function showDataTab(tab) {
    dataModalTab = tab;
    document.querySelectorAll("[data-modal-tab]").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.modalTab === tab);
    });
    if (!dataModalBuilt[tab]) {
      dataModalBody.querySelectorAll(`[data-tab-panel="${tab}"]`).forEach((p) => p.remove());
      const wrap = document.createElement("div");
      wrap.dataset.tabPanel = tab;
      wrap.innerHTML = buildDataTable(tab);
      dataModalBody.appendChild(wrap);
      dataModalBuilt[tab] = true;
    }
    dataModalBody.querySelectorAll("[data-tab-panel]").forEach((p) => {
      p.classList.toggle("hidden", p.dataset.tabPanel !== tab);
    });
    dataSearch.value = "";
    filterDataTable("");
  }

  function filterDataTable(term) {
    const t = term.trim().toLowerCase();
    const panel = dataModalBody.querySelector(`[data-tab-panel="${dataModalTab}"]`);
    if (!panel) return;
    panel.querySelectorAll("tbody tr").forEach((row) => {
      row.style.display = !t || row.textContent.toLowerCase().includes(t) ? "" : "none";
    });
  }

  document.getElementById("show-data-table").addEventListener("click", () => {
    dataModal.classList.remove("hidden");
    showDataTab(dataModalTab);
  });
  document.getElementById("data-modal-close").addEventListener("click", () => {
    dataModal.classList.add("hidden");
  });
  dataModal.addEventListener("click", (e) => {
    if (e.target === dataModal) dataModal.classList.add("hidden");
  });
  document.querySelectorAll("[data-modal-tab]").forEach((btn) => {
    btn.addEventListener("click", () => showDataTab(btn.dataset.modalTab));
  });
  dataSearch.addEventListener("input", (e) => filterDataTable(e.target.value));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !dataModal.classList.contains("hidden")) {
      dataModal.classList.add("hidden");
    }
  });

  // ---- init -------------------------------------------------------------
  CATEGORIES.forEach(buildCard);
  renderHistory();
})();
