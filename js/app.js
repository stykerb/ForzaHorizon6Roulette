/**
 * js/app.js
 * -----------------------------------------------------------------------
 * FH6 Roulette - app logic.
 *
 * Two independent chains get rolled:
 *
 *   1. Race Type -> Specific Race
 *      Specific Race is filtered by whichever Race Types are enabled in
 *      the Race Type card's filters (data/raceTypes.js + data/individualRaces.js).
 *
 *   2. Car Type -> Country -> Brand -> Decade -> Performance Class
 *      Each stage rules out choices that don't correspond to a real car
 *      in data/cars.js given everything rolled before it, so the chain
 *      can never land on an impossible combo (e.g. a German Kei Car, or
 *      a 2020s Classic Muscle car). Performance Class is the exception:
 *      it isn't "rolled" against a list of options so much as computed -
 *      see computeLegalClassIds() below for the tuning-headroom rules.
 *
 * Everything else (rendering, filter panels, persistence) is generic
 * over the CATEGORIES list, same as before.
 * -----------------------------------------------------------------------
 */
(function () {
  "use strict";

  const CATEGORIES = [
    { key: "race", label: "Race Type", icon: "\u{1F3C1}", data: RACE_TYPES },
    { key: "carType", label: "Car Type", icon: "\u{1F697}", data: CAR_TYPES },
    { key: "country", label: "Country", icon: "\u{1F30D}", data: COUNTRIES },
    { key: "brand", label: "Brand", icon: "\u{1F3ED}", data: BRANDS, sub: (item) => countryName(item.country) },
    { key: "decade", label: "Decade", icon: "\u{1F4C5}", data: DECADES },
    { key: "class", label: "Performance Class", icon: "⚡", data: PERFORMANCE_CLASSES, sub: (item) => `PI ${item.pi}`, color: (item) => item.color },
  ];
  const categoryByKey = {};
  CATEGORIES.forEach((c) => (categoryByKey[c.key] = c));

  // The car-attribute cascade, in roll order. Each stage's pool is ruled
  // by real data/cars.js rows matching every stage before it in this list
  // (see carsMatchingUpTo). "class" is handled separately, after this list.
  const CASCADE_ORDER = ["carType", "country", "brand", "decade"];
  const CASCADE_CAR_FIELD = { carType: "type", country: "country", brand: "make", decade: "decade" };
  const CLASS_ORDER = PERFORMANCE_CLASSES.map((c) => c.id); // low -> high, e.g. ["d","c","b","a","s1","s2","r","x"]

  const LS_FILTERS = "fh6r-disabled-ids-v1";
  const LS_HISTORY = "fh6r-history-v1";
  const LS_CURRENT = "fh6r-current-v1";
  const LS_STOCK_ONLY = "fh6r-stock-only-v1";
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
  let current = loadJSON(LS_CURRENT, {}); // { race: item, carType: item, ..., specificRace: item }
  let stockOnly = loadJSON(LS_STOCK_ONLY, false);

  function persistFilters() {
    saveJSON(LS_FILTERS, disabledIds);
  }
  function persistHistory() {
    saveJSON(LS_HISTORY, history);
  }
  function persistCurrent() {
    saveJSON(LS_CURRENT, current);
  }
  function persistStockOnly() {
    saveJSON(LS_STOCK_ONLY, stockOnly);
  }

  function randomFrom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // ---- the car cascade ---------------------------------------------------
  // Cars matching every cascade stage rolled *before* stageKey. Stages with
  // nothing rolled yet (current[key] is unset) impose no constraint - so
  // before anything's been spun, every stage sees the full car list.
  function carsMatchingUpTo(stageKey) {
    const idx = stageKey === "class" ? CASCADE_ORDER.length : CASCADE_ORDER.indexOf(stageKey);
    return CARS.filter((car) => {
      for (let i = 0; i < idx; i++) {
        const key = CASCADE_ORDER[i];
        const sel = current[key];
        if (sel && car[CASCADE_CAR_FIELD[key]] !== sel.id) return false;
      }
      return true;
    });
  }

  function cascadePool(cat) {
    const disabled = new Set(disabledIds[cat.key]);
    const matchingCars = carsMatchingUpTo(cat.key);
    const availableIds = new Set(matchingCars.map((car) => car[CASCADE_CAR_FIELD[cat.key]]));
    return cat.data.filter((item) => availableIds.has(item.id) && !disabled.has(item.id));
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

  function classPool() {
    const disabled = new Set(disabledIds.class);
    const matchingCars = carsMatchingUpTo("class");
    const legalIds = new Set(computeLegalClassIds(matchingCars));
    return PERFORMANCE_CLASSES.filter((item) => legalIds.has(item.id) && !disabled.has(item.id));
  }

  // ---- generic pool dispatch ----------------------------------------
  function enabledPool(cat) {
    if (cat.key === "class") return classPool();
    if (CASCADE_ORDER.indexOf(cat.key) !== -1) return cascadePool(cat);
    // "race" (and anything else with no cascade dependency)
    const disabled = new Set(disabledIds[cat.key]);
    return cat.data.filter((item) => !disabled.has(item.id));
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

    card.appendChild(header);
    card.appendChild(result);
    card.appendChild(sub);

    if (cat.key === "class") {
      const stockRow = document.createElement("label");
      stockRow.className = "stock-only-toggle";
      stockRow.innerHTML = `
        <input type="checkbox" id="stock-only-toggle" ${stockOnly ? "checked" : ""}>
        <span>Stock cars only <em>(no tuning headroom - only classes cars actually ship in)</em></span>
      `;
      card.appendChild(stockRow);
      stockRow.querySelector("input").addEventListener("change", (e) => {
        stockOnly = e.target.checked;
        persistStockOnly();
        updateCount(cat);
      });
    }

    card.appendChild(actions);

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
    card.appendChild(filterPanel);
    root.appendChild(card);

    cardsByKey[cat.key] = card;

    renderFilterList(cat);
    updateCount(cat);
    renderResult(cat);

    // events
    card.querySelector('[data-role="spin-one"]').addEventListener("click", () => spinOne(cat.key, true));
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

  function flashResult(cat) {
    const card = cardsByKey[cat.key];
    const resultEl = card.querySelector('[data-role="result"]');
    resultEl.classList.remove("flash");
    void resultEl.offsetWidth; // force reflow so the animation can restart
    resultEl.classList.add("flash");
  }

  // Rolls exactly one stage's value from its current pool. Returns the
  // picked item, or null if that stage has no valid options right now.
  function rollStageValue(cat) {
    const pool = enabledPool(cat);
    if (pool.length === 0) {
      current[cat.key] = null;
      return null;
    }
    const pick = randomFrom(pool);
    current[cat.key] = pick;
    return pick;
  }

  // Spinning a cascade stage invalidates everything after it (a new Car
  // Type can make the current Country/Brand/Decade/Class impossible), so
  // re-roll every stage from here forward, always in cascade order.
  function stagesFrom(key) {
    if (key === "class") return ["class"];
    const idx = CASCADE_ORDER.indexOf(key);
    if (idx === -1) return [key]; // "race" - no downstream dependents
    return [...CASCADE_ORDER.slice(idx), "class"];
  }

  function spinOne(key, animate) {
    const stages = stagesFrom(key);
    let anyEmpty = false;
    stages.forEach((stageKey) => {
      const cat = categoryByKey[stageKey];
      const pick = rollStageValue(cat);
      if (pick === null) anyEmpty = true;
      renderResult(cat);
      if (animate) flashResult(cat);
      updateCount(cat);
    });
    persistCurrent();
    if (anyEmpty) {
      showToast("No valid options for one or more categories - check filters.");
    }
    return current[key];
  }

  function spinAll() {
    let anyEmpty = false;

    // Chain 1: Race Type -> the exact Specific Race that type rolled.
    const racePick = rollStageValue(categoryByKey.race);
    if (racePick === null) anyEmpty = true;
    renderResult(categoryByKey.race);
    flashResult(categoryByKey.race);
    updateCount(categoryByKey.race);
    if (racePick) {
      spinSpecificRaceExact(racePick.id, true);
    } else {
      current.specificRace = null;
      renderSpecificRace();
    }

    // Chain 2: the full car cascade, in order.
    CASCADE_ORDER.concat("class").forEach((key) => {
      const cat = categoryByKey[key];
      const pick = rollStageValue(cat);
      if (pick === null) anyEmpty = true;
      renderResult(cat);
      flashResult(cat);
      updateCount(cat);
    });

    persistCurrent();
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
    snapshot.values.specificRace = current.specificRace ? current.specificRace.name : null;
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
      if (entry.values.specificRace) parts.push(entry.values.specificRace);
      row.innerHTML = `
        <span class="history-time">${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
        <span class="history-parts">${parts.join(" · ")}</span>
      `;
      list.appendChild(row);
    });
  }

  // ---- "Roll a Specific Race" section -----------------------------------
  // Manual spins here have no filter UI of their own - they reuse the Race
  // Type card's disabledIds["race"] set, matched against each race's
  // `typeId`. Spin All instead locks to the exact Race Type it just
  // rolled (see spinSpecificRaceExact), so the two can pick from different
  // pools by design: broad on a manual spin, exact within Spin All.
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

  function flashSpecificRace() {
    specificRaceEls.result.classList.remove("flash");
    void specificRaceEls.result.offsetWidth;
    specificRaceEls.result.classList.add("flash");
  }

  function spinSpecificRace() {
    const pool = specificRacePool();
    if (pool.length === 0) {
      showToast("No race types enabled - check the Race Type card's filters.");
      return;
    }
    current.specificRace = randomFrom(pool);
    persistCurrent();
    flashSpecificRace();
    renderSpecificRace();
  }

  // Used by Spin All: pick a specific race from exactly the Race Type that
  // was just rolled, ignoring the broader multi-type filter above.
  function spinSpecificRaceExact(typeId, animate) {
    const pool = INDIVIDUAL_RACES.filter((r) => r.typeId === typeId);
    current.specificRace = pool.length ? randomFrom(pool) : null;
    renderSpecificRace();
    if (animate && current.specificRace) flashSpecificRace();
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
