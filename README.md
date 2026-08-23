# FH6 Roulette

A random challenge generator for **Forza Horizon 6**. Hit **Spin All** to get
a random Race Type, Specific Race, Season, Car Type, Country, Brand, Decade,
and Performance Class — a full build/race challenge in one click. Every
category (except Performance Class) can also roll **Any**, a wildcard meaning
"no constraint here." Cards are grouped into a **Race** section (Race Type,
Specific Race, Season) and a **Car Build** section (Car Type, Country, Brand,
Decade, Performance Class), each with its own filter panel so you can exclude
items you don't want in the pool.

No build step, no dependencies, no server required — it's plain HTML/CSS/JS.

## Using it

Just open `index.html` in a browser, or host the folder anywhere static
(GitHub Pages, Netlify, a plain file share, etc). A GitHub Pages workflow is
included in `.github/workflows/deploy.yml` — enable Pages for this repo
("Source: GitHub Actions") and it will publish automatically on pushes to
`main`.

Your filter choices, settings, and challenge history are saved in your
browser's `localStorage`, so they persist between visits on the same
device/browser.

### The three settings toggles

- **Weighted by rarity** (on by default) — Car Type, Country, Brand, and
  Decade are picked in proportion to how many real cars back each option, so
  e.g. USA (~200+ cars) comes up far more than Croatia (1 car). Turn it off
  for "truly random" equal odds across every enabled option instead.
- **Strict mode** (off by default) — stops "Any" from ever being rolled.
- **Stock cars only** (off by default) — turns off Performance Class's tuning
  headroom (see below), so it only offers classes a matching car actually
  ships in.

### The car cascade never lands on an impossible combo

Car Type → Country → Brand → Decade → Performance Class are resolved
*jointly*, not just left-to-right: every stage's pool is only the options
backed by a real car in `data/cars.js` (FH6's full 636-car roster) that's
*also* consistent with every other stage's current filters and rolled value —
so a narrow filter on one card (say, Country locked to "Austria" only) can
never leave another card (Car Type) with no legal options. Spinning any
single card re-rolls everything downstream of it too (e.g. respinning Brand
alone re-rolls Decade and Performance Class, but keeps Car Type and Country
fixed), so the result is always consistent with what's above it.

Performance Class works a little differently: it's not picked from a fixed
list so much as computed from the stock class of whichever real cars match
the roll so far. Cars can be tuned *up*, never down, so:
- classes below the lowest-PI stock car in that matching pool are ruled out;
- every car can be tuned up to at least S2;
- reaching **R** needs a stock S2-or-higher car in the matching pool;
- reaching **X** needs a stock R-or-higher car in the matching pool.

The **Specific Race** card follows the same idea on a smaller scale: it locks
to the exact Race Type shown above it once one's rolled (respinning Specific
Race alone keeps that Race Type fixed), and otherwise pulls from every
enabled Race Type.

### Copy Challenge

Copies the current roll as Discord/Slack-friendly Markdown (bold labels +
emoji) — paste it straight into a chat.

### Show Data

Opens a searchable browser of every car (636) and every race (81) FH6 Roulette
knows about, straight from `data/cars.js` and `data/individualRaces.js`.

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
reuse an `id` once it's shipped** — a player's saved filters reference items
by `id`, so renaming one effectively "loses" that filter setting for anyone
who already unchecked it. If a manufacturer or race is renamed in-game, keep
the old `id` and just update the `name`.

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

## Notes on the starting data set

The brand list (89 manufacturers), car type list, country list, performance
classes (D–X, FH6's PI bands), the full named-race list, and the full 636-car
roster in `data/cars.js` (name, make, year, type, country, stock class) were
captured directly from the in-game FH6 filters/roster as of August 2026.
Treat it as a living document and update it as the game evolves.
