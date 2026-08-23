# Forza Horizon 6 Roulette

A random challenge generator for **Forza Horizon 6**. Hit **Spin All** to get
a random Race Type, Specific Race, Season, Car Type, Country, Brand, Decade,
and Performance Class — a full build/race challenge in one click. Every
category (except Performance Class) can also roll **Any**, a wildcard meaning
"no constraint here." Cards are grouped into a **Race** section (Race Type,
Specific Race, Season) and a **Car Build** section (Car Type, Country, Brand,
Decade, Performance Class), each with its own filter panel so you can exclude
items you don't want in the pool, a count badge you can click to see exactly
what's possible right now, and (except Performance Class) a per-card toggle
to always land on "Any."

No build step, no dependencies, no server required — it's plain HTML/CSS/JS.

## Using it

Just open `index.html` in a browser, or host the folder anywhere static
(GitHub Pages, Netlify, a plain file share, etc). A GitHub Pages workflow is
included in `.github/workflows/deploy.yml` — enable Pages for this repo
("Source: GitHub Actions") and it will publish automatically on pushes to
`main`.

Your filter choices, settings, weight adjustments, and challenge history are
saved in your browser's `localStorage`, so they persist between visits on the
same device/browser.

### The three settings toggles

- **Weighted by rarity** (on by default) — Race Type, Car Type, Country,
  Brand, and Decade are picked in proportion to how many real races/cars back
  each option, so e.g. Street Racing (15 races) comes up far more than Drag
  Racing (3), and USA (~200+ cars) far more than Croatia (1 car). Turn it off
  for "truly random" equal odds across every enabled option instead.
- **Strict mode** (off by default) — stops "Any" from ever being rolled.
- **Stock cars only** (off by default) — turns off Performance Class's tuning
  headroom (see below), so it only offers classes a matching car actually
  ships in.

Each card also has its own **🎯 Always land on "Any"** toggle, which pins
that one card to Any on every spin (Spin All or its own Spin button) —
independent of Strict Mode, and useful for "I don't care what Country this
is, just give me a Ferrari."

### The cascades never land on an impossible combo

Car Type → Country → Brand → Decade → Performance Class, and Race Type →
Specific Race, each roll in order. Two different questions get asked of the
same four car fields, on purpose:

- **What should this card's count badge / "click to see options" popover
  show?** Purely structural — only what's rolled *above* that card plus its
  own filter. Car Type, first in its chain, always just shows how many of
  its own options are enabled, full stop, since nothing precedes it.
- **What's actually safe to roll?** Every *other* card's filter counts,
  regardless of roll order — so filtering Decade down to the 1960s also
  keeps Car Type from ever rolling something with zero 1960s cars, even
  though Car Type comes first and its badge doesn't reflect that filter.
  Whatever gets picked is still cross-checked with backtracking (a dead end
  quietly retries the card that caused it with a different value), so a
  combination the filters make outright impossible surfaces as a clear "no
  valid options" message instead of a silent failure.

That split is deliberate: the display stays simple to read (a card's count
means exactly what it looks like it means), while the actual spin is always
safe regardless of which card's filter is doing the constraining. Spinning
any single card re-rolls everything downstream of it too (e.g. respinning
Brand alone re-rolls Decade and Performance Class, but keeps Car Type and
Country fixed; respinning Specific Race alone keeps the current Race Type
fixed), so a solo respin always stays consistent with what's above it.

Performance Class works a little differently: it's not picked from a fixed
list so much as computed from the stock class of whichever real cars match
the roll so far. Cars can be tuned *up*, never down, so:
- classes below the lowest-PI stock car in that matching pool are ruled out;
- every car can be tuned up to at least S2;
- reaching **R** needs a stock S2-or-higher car in the matching pool;
- reaching **X** needs a stock R-or-higher car in the matching pool.

### Adjust Weights

Opens a modal with a tab per weighted category (Race Type, Car Type,
Country, Brand, Decade) showing every option as a bar (length = how many
real races/cars back it) plus a 0×–3× slider for your own multiplier on top
of that — e.g. drag Ferrari to 3× to see it more, or a country to 0× to
almost never see it without touching its filter checkbox. Multipliers apply
whether or not "Weighted by rarity" is on.

### Copy Challenge

Copies the current roll as a Markdown table inside a code block — paste it
straight into Discord/Slack and it renders as a clean, aligned table.

### Show Data

Opens a searchable browser of every car (636) and every race (81) FH6
Roulette knows about, straight from `data/cars.js` and
`data/individualRaces.js`.

### Reset Spin

Clears every card back to "Spin to reveal" without a page reload — handy
before spinning just one card in isolation, so it doesn't inherit stale
picks from a previous roll.

## Project layout

```
index.html              Page shell, loads data files then js/app.js
css/styles.css           All styling
js/app.js                App logic — rendering, spinning, filters, persistence
data/raceTypes.js         Race type categories (Road/Street/Touge/Drag/Dirt/Cross Country)
data/individualRaces.js   Every named race, tagged with a raceTypes.js id
data/carTypes.js          Car build/category types
data/brands.js            Manufacturers (with country of origin)
data/countries.js         Countries of origin
data/decades.js           Model decades
data/classes.js           Forza performance classes (D through X)
data/seasons.js            Festival seasons
data/cars.js               The full FH6 car roster (stock config) - powers the cascade
```

`js/app.js` is entirely data-agnostic — it just reads whatever is in the
`data/*.js` files. That's the whole point: content and code are separate, so
keeping this up to date with game updates is just editing data files.

## Keeping it up to date with game updates

Forza Horizon 6 gets new content over time (Series updates, car packs, new
event types). To keep this app current, just ask — for example:

> "Add the Rimac Nevera R and three other new cars from the latest update"
>
> "FH6 added a new race type called X, add it to the roulette"
>
> "Remove Saab, it's not in the game"

Since brands/races/etc. are just plain arrays of objects in `data/*.js`, this
is a small, mechanical edit each time — no other code needs to change.

### Data file conventions

Every entry needs a unique `id` (lowercase, dashes only). **Never rename or
reuse an `id` once it's shipped** — a player's saved filters, "Always Any"
toggles, and weight multipliers all reference items by `id`, so renaming one
effectively "loses" those settings for anyone who already customized them.
If a manufacturer or race is renamed in-game, keep the old `id` and just
update the `name`.

- `data/raceTypes.js` — `{ id, name, desc }`
- `data/individualRaces.js` — `{ id, name, typeId }` (`typeId` references an id in `data/raceTypes.js`; adding a brand-new race *type* — not just a new race — means adding it to `raceTypes.js` first)
- `data/carTypes.js` — `{ id, name }`
- `data/brands.js` — `{ id, name, country }` (`country` references an id in `data/countries.js`)
- `data/countries.js` — `{ id, name }`
- `data/decades.js` — `{ id, name }`
- `data/classes.js` — `{ id, name, pi, color }`
- `data/seasons.js` — `{ id, name }`
- `data/cars.js` — `{ id, name, make, type, country, year, decade, class, pi }` — `make`/`type`/`country`/`decade`/`class` each reference an id in the file of the matching name above; `pi` is the car's **stock** Performance Index

New items you add are **enabled by default** for everyone — the app only
persists which items are *disabled*, so anything new automatically joins the
active pool without extra migration work.

Adding a new car to `data/cars.js` is the one case where accuracy matters
most, since it directly drives which combos the cascade considers possible,
what gets weighted toward, and what Performance Class options exist —
double-check the make/type/country/class against the in-game car list before
adding it.

`data/decades.js` (and, in principle, any other cascading data file) should
only ever list options with at least one real car behind them in
`data/cars.js` — an empty one is a guaranteed dead end for anyone who
filters down to it. `1940s` is deliberately absent for exactly this reason
(no car in the roster is from 1940–1949); if a future update adds one, add
the decade back.

## Notes on the starting data set

The brand list (89 manufacturers), car type list, country list, performance
classes (D–X, FH6's PI bands), the full named-race list, and the full 636-car
roster in `data/cars.js` (name, make, year, type, country, stock class) were
captured directly from the in-game FH6 filters/roster as of August 2026.
Treat it as a living document and update it as the game evolves.
