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

  // Shown in the page footer - keep in sync with README's "Notes on the
  // starting data set" whenever data/cars.js, data/individualRaces.js, etc.
  // get refreshed from a newer in-game update.
  const DATA_PUBLISH_DATE = "August 2026";

  function raceTypeColor(typeId) {
    const t = RACE_TYPES.find((x) => x.id === typeId);
    return t ? t.color : "";
  }

  const CATEGORIES = [
    // No "Any" here - every individual race has a real type, so "any race type" doesn't map to anything concrete.
    { key: "race", label: "Race Type", icon: "\u{1F3C1}", data: RACE_TYPES, group: "race", allowAny: false, weightable: true, color: (item) => item.color },
    { key: "specificRace", label: "Specific Race", icon: "\u{1F5FA}️", data: INDIVIDUAL_RACES, group: "race", allowAny: true, weightable: false, noFilter: true, note: "Locked to the Race Type above once it's rolled - otherwise pulls from every enabled Race Type.", color: (item) => (item.id === ANY.id ? "" : raceTypeColor(item.typeId)) },
    { key: "season", label: "Season", icon: "\u{1F324}️", data: SEASONS, group: "race", allowAny: true, weightable: false, color: (item) => (item.id === ANY.id ? "" : item.color) },
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

  // The four ultra-long signature races - excludable as a group via one toggle.
  const LONG_TRACK_IDS = new Set(["the-titan", "the-gauntlet", "the-colossus", "the-goliath"]);

  const LS_FILTERS = "fh6r-disabled-ids-v2";
  const LS_HISTORY = "fh6r-history-v2";
  const LS_CURRENT = "fh6r-current-v2";
  const LS_STOCK_ONLY = "fh6r-stock-only-v1";
  const LS_WEIGHTED = "fh6r-weighted-v1";
  const LS_STRICT = "fh6r-strict-v1";
  const LS_EXCLUDE_LONG_TRACKS = "fh6r-exclude-long-tracks-v1";
  const LS_WHEELSPIN_ANIM = "fh6r-wheelspin-anim-v1";
  const LS_ALWAYS_ANY = "fh6r-always-any-v1";
  const LS_MULTIPLIERS = "fh6r-weight-multipliers-v1";
  const LS_JAPANIZE_LEXUS_ACURA = "fh6r-japanize-lexus-acura-v1";
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

  // Brand-new visitors (nothing saved yet) start with Drag Racing off - it's
  // a jarring default to spin into unannounced. Returning visitors keep
  // whatever they've since chosen, including deliberately re-enabling it.
  const isFirstVisit = localStorage.getItem(LS_FILTERS) === null;
  const disabledIds = loadJSON(LS_FILTERS, {});
  CATEGORIES.forEach((c) => {
    if (!disabledIds[c.key]) disabledIds[c.key] = [];
  });
  if (isFirstVisit) disabledIds.race = ["drag-racing"];

  let history = loadJSON(LS_HISTORY, []);
  let current = loadJSON(LS_CURRENT, {});
  let stockOnly = loadJSON(LS_STOCK_ONLY, false);
  let weighted = loadJSON(LS_WEIGHTED, true);
  let strictMode = loadJSON(LS_STRICT, false);
  let excludeLongTracks = loadJSON(LS_EXCLUDE_LONG_TRACKS, false);
  let wheelspinAnimEnabled = loadJSON(LS_WHEELSPIN_ANIM, true);
  let alwaysAny = loadJSON(LS_ALWAYS_ANY, {});
  let multipliers = loadJSON(LS_MULTIPLIERS, {}); // { carType: {id: mult}, ... }
  WEIGHTABLE_KEYS.forEach((k) => {
    if (!multipliers[k]) multipliers[k] = {};
  });
  // In-game, FH6 groups Lexus and Acura under the USA filter (their parent
  // companies Toyota/Honda are Japanese, but the cars themselves are grouped
  // with their US-market divisions). On by default: treat them as Japan
  // instead, matching their real manufacturer origin (data/brands.js already
  // lists both as Japanese for display purposes - this makes the Country
  // cascade agree with that instead of the game's USA grouping).
  let japanizeLexusAcura = loadJSON(LS_JAPANIZE_LEXUS_ACURA, true);

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
    saveJSON(LS_EXCLUDE_LONG_TRACKS, excludeLongTracks);
    saveJSON(LS_WHEELSPIN_ANIM, wheelspinAnimEnabled);
    saveJSON(LS_ALWAYS_ANY, alwaysAny);
    saveJSON(LS_JAPANIZE_LEXUS_ACURA, japanizeLexusAcura);
  }
  function persistMultipliers() {
    saveJSON(LS_MULTIPLIERS, multipliers);
  }

  // Cars are always loaded from data/cars.js with their game-accurate
  // ("usa") country, so the very first pass here is always their real
  // stored value - safe to capture as the "toggle off" fallback.
  const LEXUS_ACURA_MAKES = new Set(["lexus", "acura"]);
  const LEXUS_ACURA_ORIGINAL_COUNTRY = new Map();
  CARS.forEach((car) => {
    if (LEXUS_ACURA_MAKES.has(car.make)) LEXUS_ACURA_ORIGINAL_COUNTRY.set(car.id, car.country);
  });
  function applyJapanizeLexusAcura() {
    CARS.forEach((car) => {
      if (LEXUS_ACURA_MAKES.has(car.make)) {
        car.country = japanizeLexusAcura ? "japan" : LEXUS_ACURA_ORIGINAL_COUNTRY.get(car.id);
      }
    });
  }
  applyJapanizeLexusAcura();

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

  // `staleKeys` (optional): CASCADE_ORDER stages whose current[] value
  // should NOT be treated as a fixed constraint here, even though their
  // FILTER still applies - because they haven't been (re)decided yet in
  // whatever respin is currently in progress, so their current[] is left
  // over from before it started. Without this, respinning e.g. Country
  // while Brand/Decade/Class still hold their old values would wrongly
  // restrict Country to whatever matches those stale picks (whichever
  // country happens to share a car with the old Brand), instead of the
  // full set of countries the car type actually supports.
  function carsSatisfyingAllExcept(excludeKey, staleKeys) {
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
        if (staleKeys && staleKeys.has(key)) continue;
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

  // Per-car version of the same tuning-headroom rule computeLegalClassIds
  // applies to a whole pool: can THIS stock car reach the given target
  // class? Never down-tune; with "stock cars only" off, every car reaches
  // at least S2, a stock S2+ car reaches R, and a stock R+ car reaches X.
  function carReachesClass(car, targetId) {
    const targetIdx = classIndex(targetId);
    const stockIdx = classIndex(car.class);
    if (targetIdx < stockIdx) return false;
    if (stockOnly) return targetIdx === stockIdx;
    let capIdx = classIndex("s2");
    if (stockIdx >= classIndex("s2")) capIdx = classIndex("r");
    if (stockIdx >= classIndex("r")) capIdx = classIndex("x");
    return targetIdx <= capIdx;
  }

  // The stock cars that could actually fulfill the current Car
  // Type/Country/Brand/Decade/Class result - same structural pool the
  // Performance Class card's own count badge uses (carsMatchingUpTo), then
  // narrowed to cars that can reach the rolled class (or all of them, if
  // Performance Class somehow held "Any" - it never actually does, since
  // it's the one car-build stage allowAny is off for, but this stays
  // correct either way).
  function computeMatchingStockCars() {
    const pool = carsMatchingUpTo("class");
    const classSel = current.class;
    if (!classSel || isAny(classSel)) return pool;
    return pool.filter((car) => carReachesClass(car, classSel.id));
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
      return INDIVIDUAL_RACES.filter(
        (r) => !disabled.has(r.typeId) && (!excludeLongTracks || !LONG_TRACK_IDS.has(r.id)) && (!raceSel || isAny(raceSel) || r.typeId === raceSel.id)
      ).map((item) => ({ item, weight: 1, base: 1 }));
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
  // being picked in the first place. `staleKeys` - see carsSatisfyingAllExcept.
  function spinPoolFor(cat, staleKeys) {
    return poolForStage(cat, (excludeKey) => carsSatisfyingAllExcept(excludeKey, staleKeys));
  }

  // Injects "Any" into a real pool. Skipped when Strict Mode is on, the
  // category doesn't allow it, or there's only one real option (Any would
  // be redundant with it). Any's weight matches the pool's least-weighted
  // real option, so it never outweighs even the rarest item - it reads as
  // "at least as likely as the option you're least likely to get anyway."
  function injectAny(real, cat) {
    if (!cat.allowAny || strictMode || real.length <= 1) return real;
    const minWeight = Math.min(...real.map((r) => r.weight));
    return [...real, { item: ANY, weight: minWeight, base: null }];
  }

  function spinFullPool(cat, staleKeys) {
    return injectAny(spinPoolFor(cat, staleKeys), cat);
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

  // `keepIfFits` (optional): stage keys allowed to keep their existing
  // current[] value instead of rolling a fresh one, PROVIDED that value is
  // still legal given everything already settled earlier in this same
  // chain (checked in order, so each stage sees up-to-date upstream
  // values - including any upstream stage that itself just got rerolled).
  // Used by spinOne so respinning e.g. Decade doesn't needlessly scramble
  // Performance Class unless the new Decade actually invalidates it. Any
  // always counts as still fitting (it has no upstream dependency).
  // Falls through to a normal reroll if the kept value can't lead to a
  // valid rest-of-chain. Never used by Spin All, which clears every
  // stage's current[] first, so there's nothing to keep either way.
  function rollChain(stageKeys, keepIfFits) {
    const excludeSets = {};
    stageKeys.forEach((k) => (excludeSets[k] = new Set()));
    let attempts = 0;
    const MAX_ATTEMPTS = 20000;

    function tryStage(i) {
      if (i >= stageKeys.length) return true;
      const key = stageKeys[i];
      const cat = categoryByKey[key];
      // Stages after this one in the chain haven't been (re)decided yet -
      // their current[] is still whatever it was before this respin
      // started, so the joint pool below must not treat it as fixed (see
      // carsSatisfyingAllExcept). Everything at or before index i is
      // already final for this pass (kept-and-confirmed, or freshly
      // picked), so it's correctly still treated as fixed context.
      const staleKeys = new Set(stageKeys.slice(i + 1));

      if (keepIfFits && keepIfFits.has(key)) {
        const existing = current[key];
        const existingFits = existing && (isAny(existing) ? cat.allowAny && !strictMode : realPoolFor(cat).some((p) => p.item.id === existing.id));
        if (existingFits && tryStage(i + 1)) return true;
      }

      if (alwaysAny[key] && cat.allowAny) {
        current[key] = ANY;
        if (tryStage(i + 1)) return true;
        current[key] = null;
        return false;
      }

      for (;;) {
        if (++attempts > MAX_ATTEMPTS) return false;
        const pool = spinFullPool(cat, staleKeys).filter((p) => !excludeSets[key].has(p.item.id));
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

  // Whether every car-build stage (Car Type -> Country -> Brand -> Decade ->
  // Performance Class) has actually been rolled - i.e. there's a real result
  // to look up matching stock cars for. "Any" counts as rolled (it's still a
  // deliberate result), only null (never spun) doesn't.
  function carBuildComplete() {
    return [...CASCADE_ORDER, "class"].every((k) => !!current[k]);
  }

  function refreshMatchingCarsButton() {
    const btn = document.getElementById("show-matching-cars");
    if (btn) btn.disabled = !carBuildComplete();
  }

  function renderResult(cat) {
    const card = cardsByKey[cat.key];
    const resultEl = card.querySelector('[data-role="result"]');
    const subEl = card.querySelector('[data-role="sub"]');
    const item = current[cat.key];
    if (!item) {
      resultEl.innerHTML = `<span class="placeholder">Spin to reveal</span>`;
      subEl.textContent = "";
      refreshMatchingCarsButton();
      return;
    }
    resultEl.textContent = displayName(cat, item);
    resultEl.classList.toggle("is-any", isAny(item));
    resultEl.style.color = cat.color ? cat.color(item) : "";
    subEl.textContent = isAny(item) ? "No constraint on this pick" : cat.sub ? cat.sub(item) : item.desc || "";
    if (cat.key === "specificRace" && item && !isAny(item)) {
      subEl.textContent = raceTypeName(item.typeId);
    }
    refreshMatchingCarsButton();
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
    // stages[0] is the card actually spun - always rerolls. Everything
    // below it in the chain only rerolls if its current value stops
    // fitting once stages[0]'s new pick (and anything else re-rolled ahead
    // of it) is in place - see the keepIfFits handling in rollChain.
    const before = {};
    stages.forEach((k) => {
      before[k] = current[k] ? current[k].id : null;
    });
    current[stages[0]] = null;
    const ok = rollChain(stages, new Set(stages.slice(1)));
    stages.forEach((stageKey) => {
      const cat = categoryByKey[stageKey];
      renderResult(cat);
      const changed = (current[stageKey] ? current[stageKey].id : null) !== before[stageKey];
      if (animate && changed) flashResult(cat);
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

  // Rolls every category via the same rollChain logic Spin All has always
  // used - populates `current` with the final, already-guaranteed-valid
  // results. Separated from finalizeSpinAll so the wheelspin animation can
  // run the real roll up front (silently) and only defer how/when the
  // results get *revealed*, never re-deriving or faking them.
  function computeSpinAllChains() {
    CATEGORIES.forEach((cat) => {
      current[cat.key] = null;
    });
    const okRace = rollChain(["race", "specificRace"]);
    const okSeason = rollChain(["season"]);
    const okCar = rollChain([...CASCADE_ORDER, "class"]);
    return { okRace, okSeason, okCar };
  }

  function finalizeSpinAll(result) {
    CATEGORIES.forEach((cat) => {
      renderResult(cat);
      flashResult(cat);
    });
    persistCurrent();
    refreshAllCounts();
    if (!result.okRace || !result.okSeason || !result.okCar) {
      showToast("One or more categories have no valid options - check filters.");
    }
    pushHistory();
  }

  function spinAll() {
    finalizeSpinAll(computeSpinAllChains());
  }

  function spinAllAnimated() {
    const result = computeSpinAllChains();
    runWheelSpinAnimation(() => finalizeSpinAll(result));
  }

  // ---- wheelspin animation ----------------------------------------------
  // Purely a reveal: by the time this runs, `current` already holds the
  // real, final result for every category (computeSpinAllChains ran first).
  // Each reel's scrolling pool is realPoolFor(cat) - the same structural,
  // "what's actually possible given what's rolled above it" pool the count
  // badges use - so a reel never scrolls through an option that couldn't
  // legally follow whatever's already landed to its left/above it.
  const WHEEL_SLOT_H = 100; // keep in sync with --wheel-slot-h in css/styles.css
  const TRIPLE_KEYS = ["race", "specificRace", "season"];
  const SINGLE_KEYS = [...CASCADE_ORDER, "class"];

  const wheelspinOverlay = document.getElementById("wheelspin-overlay");
  const wheelspinPanelEl = wheelspinOverlay.querySelector('[data-role="wheelspin-panel"]');
  const wheelspinCounterNumEl = wheelspinOverlay.querySelector('[data-role="wheelspin-counter-num"]');
  const wheelspinCounterTrackEl = wheelspinOverlay.querySelector('[data-role="wheelspin-counter-track"]');
  const wheelspinCounterLabelEl = wheelspinOverlay.querySelector('[data-role="wheelspin-counter-label"]');
  const wheelspinStageEl = wheelspinOverlay.querySelector('[data-role="wheelspin-stage"]');
  const wheelspinActionBtn = wheelspinOverlay.querySelector('[data-role="wheelspin-action"]');
  let wheelspinActive = false;
  let counterDisplayedValue = null; // null = nothing shown yet, next set snaps instead of rolling

  function wheelItemColor(cat, item) {
    if (!cat.color || isAny(item)) return "";
    return cat.color(item) || "";
  }

  // Performance Class options ("D", "S1", "X"...) read as too terse/small on
  // their own in a big card or tile, so both the main result card and the
  // wheelspin reels spell them out as "S1 Class" etc. Every other category
  // (and the shared PERFORMANCE_CLASSES data itself, used elsewhere - the
  // weights modal, filter list, data browser) is untouched.
  function displayName(cat, item) {
    if (cat.key === "class" && !isAny(item)) return `${item.name} Class`;
    return item.name;
  }

  // Rolls the counter box like a mechanical odometer digit: slides the
  // current value up and out while the new one slides in from below, then
  // resets to a single settled row. The very first call (or a repeat of the
  // same value) just snaps - there's nothing meaningful to roll from.
  function rollCounterTo(newValue) {
    const track = wheelspinCounterTrackEl;
    if (counterDisplayedValue === null || counterDisplayedValue === newValue) {
      track.style.transition = "none";
      track.style.transform = "translateY(0)";
      track.innerHTML = `<div class="wheelspin-counter-digit">${newValue}</div>`;
      counterDisplayedValue = newValue;
      return;
    }
    const rowH = wheelspinCounterNumEl.clientHeight;
    track.style.transition = "none";
    track.style.transform = "translateY(0)";
    track.innerHTML = `
      <div class="wheelspin-counter-digit">${counterDisplayedValue}</div>
      <div class="wheelspin-counter-digit">${newValue}</div>
    `;
    void track.offsetHeight; // force reflow so the transition below actually animates
    track.style.transition = "transform 380ms cubic-bezier(0.3, 0.7, 0.3, 1)";
    requestAnimationFrame(() => {
      track.style.transform = `translateY(-${rowH}px)`;
    });
    const settle = () => {
      track.removeEventListener("transitionend", settle);
      track.style.transition = "none";
      track.style.transform = "translateY(0)";
      track.innerHTML = `<div class="wheelspin-counter-digit">${newValue}</div>`;
    };
    track.addEventListener("transitionend", settle);
    setTimeout(settle, 450);
    counterDisplayedValue = newValue;
  }

  function buildWheelCol(key) {
    const cat = categoryByKey[key];
    const col = document.createElement("div");
    col.className = "wheel-col";
    col.dataset.key = key;
    col.innerHTML = `
      <span class="wheel-col-label">${cat.icon} ${cat.label}</span>
      <div class="wheel-reel" data-role="wheel-reel">
        <div class="wheel-reel-track"></div>
        <div class="wheel-reel-flash" data-role="wheel-reel-flash"></div>
      </div>
    `;
    return col;
  }

  // Draws `count` rows from `items`, each independently as likely as any
  // other, but never repeating the row directly above it. The spin is only
  // ever a graphic, not a weighted draw, but a small filtered-down pool
  // (e.g. 2 countries left) can otherwise land the same option in adjacent
  // rows purely by chance - jarring since it reads as "the wheel is stuck."
  // `firstPrevId`, if given, keeps row 0 from repeating whatever's already
  // showing just above where this sequence gets spliced in (e.g. the real
  // target it's landing on).
  function randomNoAdjacentRepeat(items, count, firstPrevId) {
    const seq = [];
    let prevId = firstPrevId || null;
    for (let i = 0; i < count; i++) {
      const choices = items.length > 1 && prevId !== null ? items.filter((it) => it.id !== prevId) : items;
      const pick = choices[Math.floor(Math.random() * choices.length)];
      seq.push(pick);
      prevId = pick.id;
    }
    return seq;
  }

  // Fills a freshly-built reel with a static (non-scrolling) 3-row preview
  // the moment its card appears, so the window never shows an empty box -
  // Spin then just starts the same reel scrolling from wherever this left
  // it, rather than populating it for the first time.
  function renderIdlePreview(reel, pool, cat) {
    const track = reel.querySelector(".wheel-reel-track");
    reel.classList.remove("landed", "no-options");
    track.style.transition = "none";
    track.style.transform = "translateY(0)";
    if (!pool || pool.length === 0) {
      reel.classList.add("no-options");
      track.innerHTML = `<div class="wheel-slot"><div class="wheel-tile">No options</div></div>`;
      return;
    }
    const items = pool.map((p) => p.item);
    const preview = randomNoAdjacentRepeat(items, 3);
    track.innerHTML = preview
      .map((item) => `<div class="wheel-slot"><div class="wheel-tile" style="color:${wheelItemColor(cat, item)}">${displayName(cat, item)}</div></div>`)
      .join("");
  }

  const SPIN_PREFIX_ROWS = 24; // decorative rows scrolled through before landing

  // Spins a single reel: scrolls through `pool` (no adjacent repeats, every
  // row equally likely - see randomNoAdjacentRepeat), then settles on
  // `target` (the already-known real result). Like the in-game wheelspin,
  // the reel fades to white for the last stretch before landing - it's
  // covering up that the scroll is just a graphic, not the actual (weighted)
  // draw, the same trick the game itself uses. `onDone` fires once the
  // landing transition and reveal both finish (or immediately for a
  // "no options" reel).
  function animateReel(reel, pool, target, cat, durationMs, onDone) {
    const track = reel.querySelector(".wheel-reel-track");
    const flash = reel.querySelector('[data-role="wheel-reel-flash"]');
    reel.classList.remove("landed", "no-options");
    flash.style.transition = "none";
    flash.style.opacity = "0";

    if (!target || !pool || pool.length === 0) {
      reel.classList.add("no-options");
      track.style.transition = "none";
      track.style.transform = "translateY(0)";
      track.innerHTML = `<div class="wheel-slot"><div class="wheel-tile">No options</div></div>`;
      setTimeout(() => onDone && onDone(), 150);
      return;
    }

    const items = pool.map((p) => p.item);
    const prefix = randomNoAdjacentRepeat(items, SPIN_PREFIX_ROWS);
    // Don't let the row right before the target coincidentally match it.
    if (items.length > 1 && prefix[prefix.length - 1].id === target.id) {
      const prevPrevId = prefix.length > 1 ? prefix[prefix.length - 2].id : null;
      const choices = items.filter((it) => it.id !== target.id && it.id !== prevPrevId);
      prefix[prefix.length - 1] = (choices.length ? choices : items.filter((it) => it.id !== target.id))[0];
    }
    const sequence = [...prefix, target];
    const targetIndex = sequence.length - 1;
    // Two more (purely decorative - never landed on) rows after the target,
    // so the 3-row-tall reel shows it centered with neighbors peeking above
    // and below, matching the in-game reel's look.
    sequence.push(...randomNoAdjacentRepeat(items, 2, target.id));

    track.innerHTML = sequence
      .map((item) => `<div class="wheel-slot"><div class="wheel-tile" style="color:${wheelItemColor(cat, item)}">${displayName(cat, item)}</div></div>`)
      .join("");

    const finalOffset = (targetIndex - 1) * WHEEL_SLOT_H;
    track.style.transition = "none";
    track.style.transform = "translateY(0px)";
    void track.offsetHeight; // force reflow so the transition below actually animates
    track.style.transition = `transform ${durationMs}ms cubic-bezier(0.15, 0.72, 0.24, 1)`;
    requestAnimationFrame(() => {
      track.style.transform = `translateY(-${finalOffset}px)`;
    });

    // Fade to white for the final stretch of the spin (masking exactly which
    // rows are scrolling past right as it decelerates), then clear quickly
    // once landed to reveal the result - mirrors the in-game wheelspin.
    const flashInDelay = durationMs * 0.55;
    const flashInDuration = durationMs * 0.3;
    const flashInTimer = setTimeout(() => {
      flash.style.transition = `opacity ${flashInDuration}ms ease-in`;
      flash.style.opacity = "1";
    }, flashInDelay);

    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      clearTimeout(flashInTimer);
      track.removeEventListener("transitionend", settle);
      reel.classList.add("landed");
      flash.style.transition = "opacity 220ms ease-out";
      flash.style.opacity = "0";
      if (onDone) onDone();
    };
    track.addEventListener("transitionend", settle);
    setTimeout(settle, durationMs + 300); // fallback in case transitionend doesn't fire
  }

  // Two gated phases, each advanced by hand:
  //   "triple" - one event, the three race cards spinning together (staggered
  //              stops, 0.5s apart, left to right). Exactly one "Super
  //              Wheelspin," so its counter only ever reads 1 or 0.
  //   "single" - the five car-build cards, one at a time. Its counter is the
  //              count of those five still un-landed.
  // The user drives every step: pressing "Spin" starts the current stage,
  // and only once it lands does the button become "Next" (or "Finish" on the
  // very last one) to move on - nothing advances on its own.
  function runWheelSpinAnimation(onComplete) {
    if (wheelspinActive) return;
    wheelspinActive = true;
    counterDisplayedValue = null; // fresh open: first counter render should snap, not roll

    let phase = "triple"; // "triple" | "single"
    let singleIdx = 0;
    let stageLanded = false;
    let cancelled = false;

    function currentKeys() {
      return phase === "triple" ? TRIPLE_KEYS : [SINGLE_KEYS[singleIdx]];
    }

    function updateCounter() {
      let remaining, label;
      if (phase === "triple") {
        remaining = stageLanded ? 0 : 1;
        label = `Super Wheelspin${remaining === 1 ? "" : "s"} Remaining`;
      } else {
        remaining = SINGLE_KEYS.length - singleIdx - (stageLanded ? 1 : 0);
        label = `Wheelspin${remaining === 1 ? "" : "s"} Remaining`;
      }
      rollCounterTo(remaining);
      wheelspinCounterLabelEl.textContent = label;
    }

    function buildStage() {
      wheelspinPanelEl.dataset.phase = phase;
      wheelspinStageEl.className = phase === "triple" ? "wheelspin-stage wheelspin-stage-triple" : "wheelspin-stage wheelspin-stage-single";
      wheelspinStageEl.innerHTML = "";
      currentKeys().forEach((key) => {
        const col = buildWheelCol(key);
        wheelspinStageEl.appendChild(col);
        const cat = categoryByKey[key];
        renderIdlePreview(col.querySelector('[data-role="wheel-reel"]'), injectAny(realPoolFor(cat), cat), cat);
      });
    }

    function isLastStage() {
      return phase === "single" && singleIdx === SINGLE_KEYS.length - 1;
    }

    function startSpin() {
      wheelspinActionBtn.disabled = true;
      const keys = currentKeys();
      // 50% longer than the original [1000,1500,2000]/[1100] pacing - the
      // extra time is what the pre-reveal white flash (see animateReel) needs.
      const durations = phase === "triple" ? [1500, 2250, 3000] : [1650];
      let toLand = keys.length;
      keys.forEach((key, i) => {
        const cat = categoryByKey[key];
        const reel = wheelspinStageEl.querySelector(`[data-key="${key}"] [data-role="wheel-reel"]`);
        const pool = injectAny(realPoolFor(cat), cat);
        animateReel(reel, pool, current[key], cat, durations[i], () => {
          if (cancelled) return;
          toLand--;
          if (toLand === 0) {
            stageLanded = true;
            updateCounter();
            wheelspinActionBtn.textContent = isLastStage() ? "Finish" : "Next";
            wheelspinActionBtn.disabled = false;
          }
        });
      });
    }

    function advanceStage() {
      if (phase === "triple") {
        phase = "single";
        singleIdx = 0;
      } else if (singleIdx < SINGLE_KEYS.length - 1) {
        singleIdx++;
      } else {
        finish();
        return;
      }
      stageLanded = false;
      buildStage();
      updateCounter();
      wheelspinActionBtn.textContent = "Spin";
      wheelspinActionBtn.disabled = false;
    }

    function onActionClick() {
      if (stageLanded) advanceStage();
      else startSpin();
    }

    function finish() {
      if (cancelled) return;
      cancelled = true;
      wheelspinOverlay.classList.add("hidden");
      wheelspinActionBtn.removeEventListener("click", onActionClick);
      wheelspinOverlay.removeEventListener("click", onBackdropClick);
      document.removeEventListener("keydown", onKeydown);
      wheelspinActive = false;
      onComplete();
    }
    // Escape/backdrop click is a skip-to-end escape hatch, not the main
    // flow - safe at any point since `current` already holds the real,
    // fully-computed results regardless of how far the reveal got.
    function onBackdropClick(e) {
      if (e.target === wheelspinOverlay) finish();
    }
    function onKeydown(e) {
      if (e.key === "Escape") finish();
    }

    wheelspinActionBtn.addEventListener("click", onActionClick);
    wheelspinOverlay.addEventListener("click", onBackdropClick);
    document.addEventListener("keydown", onKeydown);

    buildStage();
    updateCounter();
    wheelspinActionBtn.textContent = "Spin";
    wheelspinActionBtn.disabled = false;
    wheelspinOverlay.classList.remove("hidden");
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
  wireToggle(
    "exclude-long-tracks-toggle",
    () => excludeLongTracks,
    (v) => (excludeLongTracks = v)
  );
  // Wheelspin animation doesn't affect any pool, so skip the refreshAllCounts
  // wireToggle() does after every other setting - wire it by hand instead.
  (function () {
    const el = document.getElementById("wheelspin-anim-toggle");
    el.checked = wheelspinAnimEnabled;
    el.addEventListener("change", (e) => {
      wheelspinAnimEnabled = e.target.checked;
      persistSettings();
    });
  })();
  // This one changes actual car data (CARS[i].country), not just how it's
  // read - so beyond the usual persist+recount, it also has to force the
  // data browser's Cars tab to rebuild next time it's opened (it caches its
  // table HTML, which would otherwise keep showing the stale country).
  (function () {
    const el = document.getElementById("japanize-lexus-acura-toggle");
    el.checked = japanizeLexusAcura;
    el.addEventListener("change", (e) => {
      japanizeLexusAcura = e.target.checked;
      applyJapanizeLexusAcura();
      dataModalBuilt.cars = false;
      persistSettings();
      refreshAllCounts();
    });
  })();

  // ---- wire up global controls ----------------------------------------
  document.getElementById("spin-all").addEventListener("click", () => {
    if (wheelspinAnimEnabled) spinAllAnimated();
    else spinAll();
  });
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

  // ---- preset filters -------------------------------------------------
  // Each preset is a full reset followed by a specific set of restrictions -
  // applying one is always idempotent regardless of whatever filters were
  // set before. Every preset excludes Drag Racing unless it says otherwise
  // (only Murica includes it).
  function resetAllFilters() {
    CATEGORIES.forEach((cat) => {
      disabledIds[cat.key] = [];
    });
  }
  function enableOnly(catKey, enabledIdList) {
    const cat = categoryByKey[catKey];
    const keep = new Set(enabledIdList);
    disabledIds[catKey] = cat.data.filter((item) => !keep.has(item.id)).map((item) => item.id);
  }
  function disableSome(catKey, idsToDisable) {
    const set = new Set(disabledIds[catKey]);
    idsToDisable.forEach((id) => set.add(id));
    disabledIds[catKey] = Array.from(set);
  }
  const NO_DRAG = ["drag-racing"];

  const PRESETS = [
    {
      id: "murica",
      label: "🦅 Murica",
      tooltip: "USA, Canada & Australian cars. No Touge. Drag races included.",
      apply: () => {
        enableOnly("country", ["usa", "canada", "australia"]);
        disableSome("race", ["touge-battle"]);
      },
    },
    {
      id: "euro",
      label: "🇪🇺 Euro",
      tooltip: "European country cars only. No Drag races.",
      apply: () => {
        enableOnly("country", ["austria", "croatia", "denmark", "france", "germany", "italy", "sweden", "uk"]);
        disableSome("race", NO_DRAG);
      },
    },
    {
      id: "jdm",
      label: "🎌 JDM",
      tooltip: "Japanese cars only. No Drag races.",
      apply: () => {
        enableOnly("country", ["japan"]);
        disableSome("race", NO_DRAG);
      },
    },
    {
      id: "race-cars",
      label: "🏆 Race Cars",
      tooltip: "Track Toys, Extreme Track Toys & Hypercars. Road and Street races only. S1 and up. No Drag races.",
      apply: () => {
        enableOnly("carType", ["track-toys", "extreme-track-toys", "hypercars"]);
        enableOnly("race", ["road-circuit", "road-sprint", "street-racing"]);
        enableOnly("class", ["s1", "s2", "r", "x"]);
      },
    },
    {
      id: "off-road",
      label: "🏜️ Off Road",
      tooltip: "Buggies, Offroad, Rally, Utility Hero & UTV car types. Dirt and Cross Country races only. No Drag races.",
      apply: () => {
        enableOnly("carType", ["buggies", "unlimited-buggies", "offroad", "unlimited-offroad", "classic-rally", "modern-rally", "retro-rally", "rally-monsters", "utility-heroes", "sports-utility-heroes", "utvs"]);
        enableOnly("race", ["dirt-trail", "dirt-scramble", "cross-country", "cross-country-circuit"]);
      },
    },
    {
      id: "street-gang",
      label: "🌃 Street Gang",
      tooltip: "Road, Street & Touge races. Excludes Buggies, Classic/Retro Muscle, Racers, Track Toys, Rare Classics, Pickups/4x4's, Offroad, Utility Hero, UTV, Drift & Classic/Retro Rally car types. No Drag races.",
      apply: () => {
        enableOnly("race", ["road-circuit", "road-sprint", "street-racing", "touge-battle"]);
        disableSome("carType", [
          "buggies", "unlimited-buggies",
          "classic-muscle", "retro-muscle",
          "classic-racers", "retro-racers",
          "track-toys", "extreme-track-toys",
          "rare-classics", "pickups-4x4s",
          "offroad", "unlimited-offroad",
          "utility-heroes", "sports-utility-heroes",
          "utvs",
          "drift-cars", "classic-rally", "retro-rally",
        ]);
      },
    },
    {
      id: "weirdos",
      label: "🤪 Weirdos",
      tooltip: "Buggies, Classic variants, Cult Cars, Drift Cars, Eclectic Domestics, UTVs, Rare Classics & Racer car types. No Drag races.",
      apply: () => {
        enableOnly("carType", [
          "buggies", "unlimited-buggies",
          "classic-muscle", "classic-racers", "classic-rally", "classic-sports-cars",
          "cult-cars", "drift-cars", "eclectic-domestics", "utvs", "rare-classics", "retro-racers",
        ]);
        disableSome("race", NO_DRAG);
      },
    },
  ];

  function applyPreset(preset) {
    resetAllFilters();
    preset.apply();
    persistFilters();
    CATEGORIES.forEach((cat) => {
      if (!cat.noFilter) renderFilterList(cat);
    });
    refreshAllCounts();
    showToast(`Preset applied: ${preset.label.replace(/^\S+\s/, "")}`);
  }

  const presetBar = document.getElementById("preset-filters");
  PRESETS.forEach((preset) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn preset-btn";
    btn.textContent = preset.label;
    btn.title = preset.tooltip;
    btn.addEventListener("click", () => applyPreset(preset));
    presetBar.appendChild(btn);
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

  // In-game car names are always "<year> <make> <model>" (data/cars.js's own
  // convention - see its header comment). Stripping the leading year and
  // the make (from data/brands.js, which can itself be multi-word, e.g.
  // "Aston Martin") leaves exactly the model - "1964 Ford Mustang GT Coupe"
  // becomes "Mustang GT Coupe". Verified against all 636 cars with zero
  // exceptions before relying on it here.
  function deriveCarModel(car) {
    let rest = car.name.replace(/^\d{4}\s+/, "");
    const brandName = nameOf(BRANDS, car.make);
    if (rest === brandName) return "";
    if (rest.startsWith(brandName + " ")) return rest.slice(brandName.length + 1);
    return rest; // shouldn't happen given the verification above, but fail soft
  }

  // Column definitions drive both the header/filter row and each row's
  // cells, so the two can never drift out of sync. `type: "select"` gets a
  // dropdown of every distinct value present; `type: "text"` gets a
  // substring filter input. Combined with the global search box above the
  // table - a row must match both to show.
  const CAR_TABLE_COLUMNS = [
    { key: "year", label: "Year", type: "text", value: (c) => String(c.year) },
    { key: "make", label: "Make", type: "select", value: (c) => nameOf(BRANDS, c.make) },
    { key: "model", label: "Model", type: "text", value: (c) => deriveCarModel(c) },
    { key: "type", label: "Type", type: "select", value: (c) => nameOf(CAR_TYPES, c.type) },
    { key: "country", label: "Country", type: "select", value: (c) => nameOf(COUNTRIES, c.country) },
    { key: "class", label: "Class", type: "select", value: (c) => classDisplay(c.class) },
    { key: "pi", label: "Stock PI", type: "text", value: (c) => String(c.pi) },
  ];
  const RACE_TABLE_COLUMNS = [
    { key: "name", label: "Name", type: "text", value: (r) => r.name },
    { key: "raceType", label: "Race Type", type: "select", value: (r) => raceTypeName(r.typeId) },
  ];

  function buildFilterableTable(columns, items) {
    const headerCells = columns.map((col) => `<th>${col.label}</th>`).join("");
    const filterCells = columns
      .map((col) => {
        if (col.type === "select") {
          const values = [...new Set(items.map((item) => col.value(item)))].sort((a, b) => a.localeCompare(b));
          const options = values.map((v) => `<option value="${v}">${v}</option>`).join("");
          return `<th><select class="data-col-filter" data-col="${col.key}" aria-label="Filter ${col.label}"><option value="">All</option>${options}</select></th>`;
        }
        return `<th><input type="text" class="data-col-filter" data-col="${col.key}" placeholder="Filter..." aria-label="Filter ${col.label}"></th>`;
      })
      .join("");
    const rows = items
      .map((item) => {
        const cells = columns.map((col) => `<td data-col="${col.key}">${col.value(item)}</td>`).join("");
        return `<tr>${cells}</tr>`;
      })
      .join("");
    return `
      <table class="data-table" data-role="data-table">
        <thead>
          <tr>${headerCells}</tr>
          <tr class="data-table-filter-row">${filterCells}</tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  function buildDataTable(tab) {
    if (tab === "cars") return buildFilterableTable(CAR_TABLE_COLUMNS, CARS);
    return buildFilterableTable(RACE_TABLE_COLUMNS, INDIVIDUAL_RACES);
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
      wrap.querySelectorAll(".data-col-filter").forEach((el) => {
        el.addEventListener("input", () => filterDataTable(dataSearch.value));
        el.addEventListener("change", () => filterDataTable(dataSearch.value));
      });
    }
    dataModalBody.querySelectorAll("[data-tab-panel]").forEach((p) => {
      p.classList.toggle("hidden", p.dataset.tabPanel !== tab);
    });
    dataSearch.value = "";
    filterDataTable("");
  }

  // Shared by the Show Data modal (which scopes to whichever tab panel is
  // active) and the Matching Stock Cars modal (a single table, no tabs) -
  // both just need "hide rows that don't match the search term and every
  // active column filter" applied to some container holding one buildFilterableTable.
  function filterTableRows(panel, term) {
    if (!panel) return;
    const t = term.trim().toLowerCase();
    const colFilters = Array.from(panel.querySelectorAll(".data-col-filter"))
      .map((el) => ({ col: el.dataset.col, isSelect: el.tagName === "SELECT", value: el.value.trim() }))
      .filter((f) => f.value !== "");
    panel.querySelectorAll("tbody tr").forEach((row) => {
      const matchesSearch = !t || row.textContent.toLowerCase().includes(t);
      const matchesColumns = colFilters.every((f) => {
        const cell = row.querySelector(`td[data-col="${f.col}"]`);
        if (!cell) return true;
        const cellText = cell.textContent;
        return f.isSelect ? cellText === f.value : cellText.toLowerCase().includes(f.value.toLowerCase());
      });
      row.style.display = matchesSearch && matchesColumns ? "" : "none";
    });
  }

  function filterDataTable(term) {
    filterTableRows(dataModalBody.querySelector(`[data-tab-panel="${dataModalTab}"]`), term);
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

  // ---- matching stock cars modal ------------------------------------------
  // Reuses the same buildFilterableTable/CAR_TABLE_COLUMNS the data browser
  // uses, just pointed at whatever stock cars actually fulfil the current
  // roll instead of the full roster. Rebuilt fresh every time it's opened
  // (unlike the data browser's tabs, there's nothing worth caching - the
  // matching set changes on every respin).
  const matchingCarsModal = document.getElementById("matching-cars-modal");
  const matchingCarsBody = document.getElementById("matching-cars-body");
  const matchingCarsSummary = document.getElementById("matching-cars-summary");
  const matchingCarsSearch = document.getElementById("matching-cars-search");

  function matchingCarsSummaryText(cars) {
    const parts = [...CASCADE_ORDER, "class"].map((k) => (current[k] ? current[k].name : "Any"));
    return `${parts.join(" · ")} — ${cars.length} stock car${cars.length === 1 ? "" : "s"} match${cars.length === 1 ? "es" : ""}.`;
  }

  document.getElementById("show-matching-cars").addEventListener("click", () => {
    if (!carBuildComplete()) return;
    const cars = computeMatchingStockCars();
    matchingCarsSummary.textContent = matchingCarsSummaryText(cars);
    matchingCarsBody.innerHTML = buildFilterableTable(CAR_TABLE_COLUMNS, cars);
    matchingCarsSearch.value = "";
    matchingCarsBody.querySelectorAll(".data-col-filter").forEach((el) => {
      el.addEventListener("input", () => filterTableRows(matchingCarsBody, matchingCarsSearch.value));
      el.addEventListener("change", () => filterTableRows(matchingCarsBody, matchingCarsSearch.value));
    });
    matchingCarsModal.classList.remove("hidden");
  });
  matchingCarsSearch.addEventListener("input", (e) => filterTableRows(matchingCarsBody, e.target.value));
  document.getElementById("matching-cars-modal-close").addEventListener("click", () => {
    matchingCarsModal.classList.add("hidden");
  });
  matchingCarsModal.addEventListener("click", (e) => {
    if (e.target === matchingCarsModal) matchingCarsModal.classList.add("hidden");
  });

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
    if (!matchingCarsModal.classList.contains("hidden")) matchingCarsModal.classList.add("hidden");
  });

  // ---- init -------------------------------------------------------------
  document.getElementById("data-publish-date").textContent = DATA_PUBLISH_DATE;
  CATEGORIES.forEach(buildCard);
  renderHistory();
})();
