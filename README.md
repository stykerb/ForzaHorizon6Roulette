# FH6 Roulette

A random challenge generator for **Forza Horizon 6**. Hit **Spin All** to get
a random Race Type, Car Type, Brand, Country, Decade, and Performance Class —
a full build/race challenge in one click. Each category can be spun on its
own, and every category has a filter panel so you can exclude items you don't
want in the pool (e.g. turn off "Kei Car" or lock the class to S1 only).

No build step, no dependencies, no server required — it's plain HTML/CSS/JS.

## Using it

Just open `index.html` in a browser, or host the folder anywhere static
(GitHub Pages, Netlify, a plain file share, etc). A GitHub Pages workflow is
included in `.github/workflows/deploy.yml` — enable Pages for this repo
("Source: GitHub Actions") and it will publish automatically on pushes to
`main`.

Your filter choices and challenge history are saved in your browser's
`localStorage`, so they persist between visits on the same device/browser.

## Project layout

```
index.html         Page shell, loads data files then js/app.js
css/styles.css      All styling
js/app.js           App logic — rendering, spinning, filters, persistence
data/races.js        Race / event types
data/carTypes.js     Car body / build styles
data/brands.js       Manufacturers (with country of origin)
data/countries.js    Countries of origin
data/decades.js      Model decades
data/classes.js      Forza performance classes (D through X)
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

- `data/races.js` — `{ id, name, desc }`
- `data/carTypes.js` — `{ id, name, desc }`
- `data/brands.js` — `{ id, name, country }` (`country` references an id in `data/countries.js`)
- `data/countries.js` — `{ id, name }`
- `data/decades.js` — `{ id, name }`
- `data/classes.js` — `{ id, name, pi, color }`

New items you add are **enabled by default** for everyone — the app only
persists which items are *disabled*, so anything new automatically joins the
active pool without extra migration work.

## Notes on the starting data set

The brand/race/car-type lists were seeded from Forza Horizon 6's launch
roster (Japan setting, ~90 manufacturers, JDM-heavy) as of August 2026. It's
a solid starting point but not guaranteed to be exhaustive — treat it as a
living document and update it as the game evolves.
