/**
 * js/app.js
 * -----------------------------------------------------------------------
 * Forza Horizon 6 Roulette - app logic.
 *
 * Three independent groups get rolled:
 *   1. Race Type -> Specific Race
 *   2. Season (standalone)
 *   3. Car Type -> Country -> Brand -> Decade -> Performance Class
 *
 * Each card's displayed pool (the #/## count, its "show options" popover,
 * and what a solo respin draws from) is *structural*: it only depends on
 * whatever's ROLLED in the stages before it in that group, plus its own
 * filter - never on a later stage's filter. Car Type, first in its chain,
 * is always just "how many of my own options are enabled," full stop.
 *
 * That means a stage can still hit a dead end (e.g. Country locked to
 * Austria leaves no legal Class once Car Type happens to roll something
 * with zero Austria cars). Rather than pre-solving that away by making
 * every stage aware of every other stage's filters, each group is rolled
 * with backtracking (rollChain): a dead end retries the stage that caused
 * it with a different value, so the group always resolves to a real,
 * consistent combination without any stage's own count/options list
 * needing to account for what's below it.
 * -----------------------------------------------------------------------
 */
(function () {
  "use strict";

  const ANY = Object.freeze({ id: "__any__", name: "Any" });

  const CASCADE_ORDER = ["carType", "country", "brand", "decade"];
  const CASCADE_CAR_FIELD = { carType: "type", country: "country", brand: "make", decade: "decade" };

  const CATEGORIES = [
    { key: "race", label: "Race Type", icon: "\u{1F3C1}", data: RACE_TYPES, group: "race", allowAny: true, weightable: true },
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

  const WEIGHTABLE_KEYS = CATEGORIES.filter((c) => c.weightable).map((c) => c.key); // ["race","carType","country","brand","decade"]

  const CLASS_ORDER = PERFORMANCE_CLASSES.map((c) => c.id);

  // Race counts per type, precomputed once - the base weight for the Race
  // Type card, mirroring how car counts weight Car Type/Country/Brand/Decade.
  const RACE_COUNTS_BY_TYPE = new Map();
  INDIVIDUAL_RACES.forEach((r) => RACE_COUNTS_BY_TYPE.set(r.typeId, (RACE_COUNTS_BY_TYPE.get(r.typeId) || 0) + 1));

  const LS_FILTERS = "fh6r-disabled-ids-v2";
  const LS_HISTORY = "fh6r-history-v2";
  const LS_CURRENT = "fh6r-current-v2";
  const LS_STOCK_ONLY = "fh6r-stock-only-v1";
  const LS_WEIGHTED = "fh6r-weighted-v1";
  const LS_STRICT = "fh6r-strict-v1";
  const LS_ALWAYS_ANY = "fh6r-always-any-v1";
  const LS_MULTIPLIERS = "fh6r-weight-multipliers-v1";
  const MAX_HISTORY = 30;

  function countryName(id) {
    const c = COUNTRIES.find((x) => x.id === id);
    return c ? c.name : id;
  }
  function raceTypeName(typeId) {
    const t = RACE_TYPES.find((x) => x.id === typeId);
    return t ? t.name : typeId;
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

  const disabledIds = loadJSON(LS_FILTERS, {});
  CATEGORIES.forEach((c) => {
    if (!disabledIds[c.key]) disabledIds[c.key] = [];
  });

  let history = loadJSON(LS_HISTORY, []);
  let current = loadJSON(LS_CURRENT, {});
  let stockOnly = loadJSON(LS_STOCK_ONLY, false);
  let weighted = loadJSON(LS_WEIGHTED, true);
  let strictMode = loadJSON(LS_STRICT, false);
  let alwaysAny = loadJSON(LS_ALWAYS_ANY, {});
  let multipliers = loadJSON(LS_MULTIPLIERS, {}); // { carType: {id: mult}, ... }
  WEIGHTABLE_KEYS.forEach((k) => {
    if (!multipliers[k]) multipliers[k] = {};
  });

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
    saveJSON(LS_ALWAYS_ANY, alwaysAny);
  }
  function persistMultipliers() {
    saveJSON(LS_MULTIPLIERS, multipliers);
  }

  function isAny(item) {
    return !!item && item.id === ANY.id;
  }

  function multiplierFor(catKey, itemId) {
    const m = multipliers[catKey] && multipliers[catKey][itemId];
    return m === undefined || m === null ? 1 : m; // 0 is a valid, deliberate multiplier - don't fall back to 1 for it
  }

  // ---- the car cascade ----------------------------------------------------
  // Two different questions get asked of the same four fields:
  //
  // "What should this card's count badge / options popover show?" - purely
  // structural, only stages ABOVE this one in roll order (their ROLLED
  // value, never their filter). Car Type, first in its chain, is always
  // just its own filter's count - nothing precedes it.
  //
  // "What's actually safe to roll for this card?" - every OTHER stage's
  // filter (and rolled value, once it has one) applies, regardless of roll
  // order, so a filter set on a card further down the chain (e.g. Decade
  // locked to the 1960s) rules out upstream picks (a Car Type with zero
  // 1960s cars) that could only ever dead-end. This is what the actual
  // spin uses - see spinPoolFor / rollChain below.
  function carsMatchingUpTo(stageKey) {
    const idx = stageKey === "class" ? CASCADE_ORDER.length : CASCADE_ORDER.indexOf(stageKey);
    return CARS.filter((car) => {
      for (let i = 0; i < idx; i++) {
        const key = CASCADE_ORDER[i];
        const sel = current[key];
        if (sel && !isAny(sel) && car[CASCADE_CAR_FIELD[key]] !== sel.id) return false;
      }
      return true;
    });
  }

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
  // stock car available given everything rolled above - cars tune UP, never
  // down. Every car can reach S2; R needs a stock S2+ car in the pool, X
  // needs a stock R+ car. "Stock cars only" turns off that tuning headroom.
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

  function appliedWeight(cat, itemId, baseCount) {
    const base = cat.weightable && weighted ? baseCount : 1;
    return Math.max(base * multiplierFor(cat.key, itemId), 0);
  }

  // ---- pools: {item, weight, base}[] of REAL (non-Any) options ------------
  // matchingCarsFn is carsMatchingUpTo for the structural/display pool, or
  // carsSatisfyingAllExcept for the joint/spin-safe pool - see the comment
  // above carsMatchingUpTo for what each means.
  function poolForStage(cat, matchingCarsFn) {
    if (cat.key === "class") {
      const disabled = new Set(disabledIds.class);
      const matchingCars = matchingCarsFn("class");
      const legalIds = new Set(computeLegalClassIds(matchingCars));
      return PERFORMANCE_CLASSES.filter((item) => legalIds.has(item.id) && !disabled.has(item.id)).map((item) => ({ item, weight: 1, base: 1 }));
    }

    if (CASCADE_ORDER.indexOf(cat.key) !== -1) {
      const disabled = new Set(disabledIds[cat.key]);
      const matchingCars = matchingCarsFn(cat.key);
      const field = CASCADE_CAR_FIELD[cat.key];
      const counts = new Map();
      matchingCars.forEach((car) => {
        const id = car[field];
        counts.set(id, (counts.get(id) || 0) + 1);
      });
      return cat.data
        .filter((item) => counts.has(item.id) && !disabled.has(item.id))
        .map((item) => ({ item, weight: appliedWeight(cat, item.id, counts.get(item.id)), base: counts.get(item.id) }));
    }

    if (cat.key === "specificRace") {
      const disabled = new Set(disabledIds.race); // reuses the Race Type card's filter
      const raceSel = current.race;
      return INDIVIDUAL_RACES.filter((r) => !disabled.has(r.typeId) && (!raceSel || isAny(raceSel) || r.typeId === raceSel.id)).map((item) => ({ item, weight: 1, base: 1 }));
    }

    if (cat.key === "race") {
      const disabled = new Set(disabledIds.race);
      return cat.data
        .filter((item) => !disabled.has(item.id))
        .map((item) => ({ item, weight: appliedWeight(cat, item.id, RACE_COUNTS_BY_TYPE.get(item.id) || 0), base: RACE_COUNTS_BY_TYPE.get(item.id) || 0 }));
    }

    // "season" - no natural base weight, always equal odds (manual multiplier N/A)
    const disabled = new Set(disabledIds[cat.key]);
    return cat.data.filter((item) => !disabled.has(item.id)).map((item) => ({ item, weight: 1, base: 1 }));
  }

  // Structural pool - what a card's count badge and options popover show.
  function realPoolFor(cat) {
    return poolForStage(cat, carsMatchingUpTo);
  }

  // Joint pool - what the actual roll draws from, so a filter set anywhere
  // in the chain (not just above this card) keeps a dead end from ever
  // being picked in the first place.
  function spinPoolFor(cat) {
    return poolForStage(cat, carsSatisfyingAllExcept);
  }

  // Injects "Any" into a real pool. Skipped when Strict Mode is on, the
  // category doesn't allow it, or there's only one real option (Any would
  // be redundant with it). Any's weight is the pool's average, so it reads
  // as "about as likely as a typical option" rather than dominating/vanishing.
  function injectAny(real, cat) {
    if (!cat.allowAny || strictMode || real.length <= 1) return real;
    const totalWeight = real.reduce((sum, r) => sum + r.weight, 0);
    return [...real, { item: ANY, weight: totalWeight / real.length, base: null }];
  }

  function spinFullPool(cat) {
    return injectAny(spinPoolFor(cat), cat);
  }

  function weightedRandom(pool) {
    const total = pool.reduce((sum, p) => sum + p.weight, 0);
    if (total <= 0) return pool[Math.floor(Math.random() * pool.length)].item; // all-zero weights: fall back to uniform
    let r = Math.random() * total;
    for (let i = 0; i < pool.length; i++) {
      r -= pool[i].weight;
      if (r <= 0) return pool[i].item;
    }
    return pool[pool.length - 1].item;
  }

  // ---- rolling, with backtracking so a dead end never surfaces as a
  // failure the user has to work around manually --------------------------
  function stagesFrom(key) {
    if (key === "race") return ["race", "specificRace"];
    const idx = CASCADE_ORDER.indexOf(key);
    if (idx !== -1) return [...CASCADE_ORDER.slice(idx), "class"];
    return [key]; // specificRace, season, class
  }

  function rollChain(stageKeys) {
    const excludeSets = {};
    stageKeys.forEach((k) => (excludeSets[k] = new Set()));
    let attempts = 0;
    const MAX_ATTEMPTS = 20000;

    function tryStage(i) {
      if (i >= stageKeys.length) return true;
      const key = stageKeys[i];
      const cat = categoryByKey[key];

      if (alwaysAny[key] && cat.allowAny) {
        current[key] = ANY;
        if (tryStage(i + 1)) return true;
        current[key] = null;
        return false;
      }

      for (;;) {
        if (++attempts > MAX_ATTEMPTS) return false;
        const pool = spinFullPool(cat).filter((p) => !excludeSets[key].has(p.item.id));
        if (pool.length === 0) {
          current[key] = null;
          return false;
        }
        const pick = weightedRandom(pool);
        current[key] = pick;
        if (tryStage(i + 1)) return true;
        excludeSets[key].add(pick.id);
      }
    }

    return tryStage(0);
  }

  // ---- DOM building ----------------------------------------------------
  const roots = { race: document.getElementById("race-categories"), car: document.getElementById("car-categories") };
  const cardsByKey = {};
  let openPopoverKey = null;

  function buildCard(cat) {
    const card = document.createElement("section");
    card.className = "card";
    card.dataset.key = cat.key;

    const header = document.createElement("div");
    header.className = "card-header";
    header.innerHTML = `
      <span class="card-icon">${cat.icon}</span>
      <span class="card-label">${cat.label}</span>
      <span class="card-count-wrap">
        <button type="button" class="card-count" data-role="count" title="Click to see current options"></button>
        <div class="count-popover hidden" data-role="count-popover"></div>
      </span>
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
    if (cat.allowAny) {
      const alwaysRow = document.createElement("label");
      alwaysRow.className = "always-any-toggle";
      alwaysRow.innerHTML = `
        <input type="checkbox" data-role="always-any" ${alwaysAny[cat.key] ? "checked" : ""}>
        <span>\u{1F3AF} Always land on "Any"</span>
      `;
      card.appendChild(alwaysRow);
      alwaysRow.querySelector("input").addEventListener("change", (e) => {
        alwaysAny[cat.key] = e.target.checked;
        persistSettings();
      });
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
    card.querySelector('[data-role="count"]').addEventListener("click", (e) => {
      e.stopPropagation();
      togglePopover(cat.key);
    });
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

  function refreshAllCounts() {
    CATEGORIES.forEach(updateCount);
  }

  function updateCount(cat) {
    const card = cardsByKey[cat.key];
    const total = cat.data.length;
    const pool = realPoolFor(cat);
    card.querySelector('[data-role="count"]').textContent = `${pool.length}/${total}`;
    const spinBtn = card.querySelector('[data-role="spin-one"]');
    spinBtn.disabled = pool.length === 0;
    card.classList.toggle("empty-pool", pool.length === 0);
    if (openPopoverKey === cat.key) renderPopover(cat, pool);
  }

  function renderPopover(cat, pool) {
    const card = cardsByKey[cat.key];
    const pop = card.querySelector('[data-role="count-popover"]');
    if (pool.length === 0) {
      pop.innerHTML = `<p class="popover-empty">Nothing available - check filters${CASCADE_ORDER.indexOf(cat.key) > 0 || cat.key === "class" || cat.key === "specificRace" ? " or what's rolled above" : ""}.</p>`;
      return;
    }
    const sorted = [...pool].sort((a, b) => b.weight - a.weight || a.item.name.localeCompare(b.item.name));
    const showWeight = cat.weightable;
    pop.innerHTML = `
      <div class="popover-title">${pool.length} option${pool.length === 1 ? "" : "s"} possible right now</div>
      <ul class="popover-list">
        ${sorted.map((p) => `<li>${p.item.name}${showWeight ? ` <span class="popover-count">(${p.base})</span>` : ""}</li>`).join("")}
      </ul>
    `;
  }

  function togglePopover(key) {
    if (openPopoverKey === key) {
      closePopover();
      return;
    }
    closePopover();
    openPopoverKey = key;
    const cat = categoryByKey[key];
    renderPopover(cat, realPoolFor(cat));
    cardsByKey[key].querySelector('[data-role="count-popover"]').classList.remove("hidden");
  }

  function closePopover() {
    if (!openPopoverKey) return;
    const card = cardsByKey[openPopoverKey];
    if (card) card.querySelector('[data-role="count-popover"]').classList.add("hidden");
    openPopoverKey = null;
  }

  document.addEventListener("click", (e) => {
    if (openPopoverKey && !e.target.closest(".count-popover")) closePopover();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && openPopoverKey) closePopover();
  });

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
    void resultEl.offsetWidth;
    resultEl.classList.add("flash");
  }

  function spinOne(key, animate) {
    const stages = stagesFrom(key);
    stages.forEach((k) => {
      current[k] = null;
    });
    const ok = rollChain(stages);
    stages.forEach((stageKey) => {
      const cat = categoryByKey[stageKey];
      renderResult(cat);
      if (animate) flashResult(cat);
    });
    persistCurrent();
    refreshAllCounts();
    if (!ok) showToast("No valid options for one or more categories - check filters.");
    return current[key];
  }

  function resetSpin() {
    CATEGORIES.forEach((cat) => {
      current[cat.key] = null;
      renderResult(cat);
    });
    persistCurrent();
    refreshAllCounts();
    showToast("Results cleared - every card rolls fresh now.");
  }

  function spinAll() {
    CATEGORIES.forEach((cat) => {
      current[cat.key] = null;
    });
    const okRace = rollChain(["race", "specificRace"]);
    const okSeason = rollChain(["season"]);
    const okCar = rollChain([...CASCADE_ORDER, "class"]);
    CATEGORIES.forEach((cat) => {
      renderResult(cat);
      flashResult(cat);
    });
    persistCurrent();
    refreshAllCounts();
    if (!okRace || !okSeason || !okCar) {
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

  // ---- Discord/Slack-friendly markdown table for Copy Challenge -----------
  function buildCurrentChallengeText() {
    const rows = CATEGORIES.map((cat) => [cat.label, current[cat.key] ? current[cat.key].name : "—"]);
    const col1 = Math.max("Category".length, ...rows.map((r) => r[0].length));
    const col2 = Math.max("Result".length, ...rows.map((r) => r[1].length));
    const pad = (s, w) => s + " ".repeat(w - s.length);
    const lines = [pad("Category", col1) + "  " + pad("Result", col2), "-".repeat(col1) + "  " + "-".repeat(col2)];
    rows.forEach((r) => lines.push(pad(r[0], col1) + "  " + r[1]));
    return "🎲 **Forza Horizon 6 Roulette Challenge**\n\n```\n" + lines.join("\n") + "\n```";
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
  document.getElementById("reset-spin").addEventListener("click", resetSpin);

  document.getElementById("copy-challenge").addEventListener("click", async () => {
    const text = buildCurrentChallengeText();
    try {
      await navigator.clipboard.writeText(text);
      showToast("Challenge copied as a Markdown table - paste it into Discord/Slack!");
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
  document.querySelectorAll("#data-modal [data-modal-tab]").forEach((btn) => {
    btn.addEventListener("click", () => showDataTab(btn.dataset.modalTab));
  });
  dataSearch.addEventListener("input", (e) => filterDataTable(e.target.value));

  // ---- weights modal: visualize + manually adjust ------------------------
  const weightsModal = document.getElementById("weights-modal");
  const weightsBody = document.getElementById("weights-modal-body");
  let weightsTab = "race";

  function baseWeightList(catKey) {
    // Base weight ignoring current cascade position and manual multipliers -
    // "how rare is this option across the whole roster," not "right now."
    const cat = categoryByKey[catKey];
    if (catKey === "race") {
      return cat.data.map((item) => ({ item, base: RACE_COUNTS_BY_TYPE.get(item.id) || 0 }));
    }
    const field = CASCADE_CAR_FIELD[catKey];
    const counts = new Map();
    CARS.forEach((car) => {
      const id = car[field];
      counts.set(id, (counts.get(id) || 0) + 1);
    });
    return cat.data.map((item) => ({ item, base: counts.get(item.id) || 0 }));
  }

  function renderWeightsTab(tab) {
    weightsTab = tab;
    document.querySelectorAll("[data-weights-tab]").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.weightsTab === tab);
    });
    const cat = categoryByKey[tab];
    const list = baseWeightList(tab).sort((a, b) => b.base - a.base || a.item.name.localeCompare(b.item.name));
    const maxBase = Math.max(1, ...list.map((r) => r.base));

    weightsBody.innerHTML = `
      <div class="weights-toolbar">
        <p>Bar length = how many ${tab === "race" ? "races" : "cars"} back that option. Slider = your own multiplier on top (1.0× = unchanged).</p>
        <button type="button" class="btn btn-tiny" data-role="reset-tab-weights">Reset ${cat.label} to 1.0×</button>
      </div>
      <div class="weights-list">
        ${list
          .map((r) => {
            const mult = multiplierFor(tab, r.item.id);
            const pct = (r.base / maxBase) * 100;
            return `
            <div class="weight-row" data-item-id="${r.item.id}">
              <span class="weight-name" title="${r.item.name}">${r.item.name}</span>
              <span class="weight-bar-track"><span class="weight-bar-fill" style="width:${pct}%"></span></span>
              <span class="weight-base">${r.base}</span>
              <input type="range" class="weight-slider" min="0" max="3" step="0.1" value="${mult}" data-role="weight-slider">
              <span class="weight-mult">${mult.toFixed(1)}×</span>
            </div>`;
          })
          .join("")}
      </div>
    `;

    weightsBody.querySelectorAll(".weight-row").forEach((row) => {
      const id = row.dataset.itemId;
      const slider = row.querySelector('[data-role="weight-slider"]');
      const multLabel = row.querySelector(".weight-mult");
      slider.addEventListener("input", () => {
        const v = parseFloat(slider.value);
        multipliers[tab][id] = v;
        multLabel.textContent = `${v.toFixed(1)}×`;
        persistMultipliers();
        refreshAllCounts();
      });
    });

    weightsBody.querySelector('[data-role="reset-tab-weights"]').addEventListener("click", () => {
      multipliers[tab] = {};
      persistMultipliers();
      refreshAllCounts();
      renderWeightsTab(tab);
    });
  }

  document.getElementById("show-weights").addEventListener("click", () => {
    weightsModal.classList.remove("hidden");
    renderWeightsTab(weightsTab);
  });
  document.getElementById("weights-modal-close").addEventListener("click", () => {
    weightsModal.classList.add("hidden");
  });
  weightsModal.addEventListener("click", (e) => {
    if (e.target === weightsModal) weightsModal.classList.add("hidden");
  });
  document.querySelectorAll("#weights-modal [data-weights-tab]").forEach((btn) => {
    btn.addEventListener("click", () => renderWeightsTab(btn.dataset.weightsTab));
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!dataModal.classList.contains("hidden")) dataModal.classList.add("hidden");
    if (!weightsModal.classList.contains("hidden")) weightsModal.classList.add("hidden");
  });

  // ---- init -------------------------------------------------------------
  CATEGORIES.forEach(buildCard);
  renderHistory();
})();
