# Forza Horizon 6 Roulette

A random challenge generator for **Forza Horizon 6**. Hit **Spin All** to get
a random Race Type, Specific Race, Season, Car Type, Country, Brand, Decade,
and Performance Class — a full build/race challenge in one click. Every
category except Race Type and Performance Class can also roll **Any**, a
wildcard meaning "no constraint here" (Race Type skips it because every real
race already has a type, so "any type" doesn't map to anything concrete).
Cards are grouped into a **Race** section (Race Type, Specific Race, Season)
and a **Car Build** section (Car Type, Country, Brand, Decade, Performance
Class), each with its own filter panel so you can exclude items you don't
want in the pool, a count badge you can click to see exactly what's possible
right now, and (where Any applies) a per-card toggle to always land on "Any."

New visitors start with Drag Racing off by default in the Race Type filter
(it's a jarring thing to spin into unannounced) — once you've touched any
filter, your own choices take over.

A row of **Preset Filters** (Murica, Euro, JDM, Race Cars, Off Road, Street
Gang, Weirdos) sits above the Race section — each fully replaces your current
filters with a themed set in one click; hover a preset to see exactly what it
does.

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

The page footer names the month the car/race data was last pulled from the
game (`DATA_PUBLISH_DATE` in `js/app.js`) - update it alongside the "Notes on
the starting data set" section below whenever `data/cars.js`,
`data/individualRaces.js`, etc. get refreshed.

### Settings toggles

- **Weighted by rarity** (on by default) — Race Type, Car Type, Country,
  Brand, and Decade are picked in proportion to how many real races/cars back
  each option, so e.g. Street Racing (15 races) comes up far more than Drag
  Racing (3), and USA (~200+ cars) far more than Croatia (1 car). Turn it off
  for "truly random" equal odds across every enabled option instead.
- **Strict mode** (off by default) — stops "Any" from ever being rolled.
- **Stock cars only** (off by default) — turns off Performance Class's tuning
  headroom (see below), so it only offers classes a matching car actually
  ships in.
- **Exclude Long Tracks** (off by default) — removes FH6's four ultra-long
  signature races (The Titan, The Gauntlet, The Colossus, The Goliath) from
  the Specific Race pool.
- **Wheelspin animation** (on by default) — Spin All plays an animated,
  in-game-styled wheelspin reveal instead of just snapping straight to the
  result.
- **Treat Lexus/Acura as Japan** (on by default) — FH6 itself groups Lexus
  and Acura under the USA Country filter (they're grouped with their
  US-market divisions in-game). On, the Country cascade instead treats their
  cars as Japanese, matching their real manufacturer origin (the same origin
  already shown for both brands elsewhere in the app). Off restores the
  game's own USA grouping. Affects the Country cascade/JDM preset only - the
  Brand card's own "Japan" origin label for Lexus/Acura doesn't change either
  way, since that's a fact about the brand, not the game's filter grouping.
- **Championship Mode** (off by default) — see below.
- **Anarchy Mode** (off by default) — only changes anything while
  Championship Mode is also on; see below.

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
any single card always rerolls that card itself (e.g. respinning Brand
always picks a new Brand; respinning Specific Race always keeps the current
Race Type fixed, same as before), but a card *below* it only rerolls if its
current value stops being legal once the new pick is in place — respinning
Decade leaves Performance Class alone if the current class still fits the
new Decade, and only rerolls it if it doesn't. "Any" on a downstream card is
always kept regardless (it has no upstream dependency to invalidate). This
keeps a solo respin from needlessly scrambling cards that are still
perfectly valid, while staying just as safe as before — a card that does
need to reroll still goes through the same backtracking-guaranteed pool.

Performance Class works a little differently: it's not picked from a fixed
list so much as computed from the stock class of whichever real cars match
the roll so far. Cars can be tuned *up*, never down, so:
- classes below the lowest-PI stock car in that matching pool are ruled out;
- every car can be tuned up to at least S2;
- reaching **R** needs a stock S2-or-higher car in the matching pool;
- reaching **X** needs a stock R-or-higher car in the matching pool.

### Championship Mode

Turns Spin All (and its own **Spin Leg** buttons) into a 3-race championship
— one car build, 3 races run back to back — matching how FH6 itself builds
Championships. Turning it on hides the Specific Race card in favor of 3
**Leg** cards (Leg 1, Leg 2, Leg 3 · Final), each with its own Race Type and
Specific Race; the Race Type card stays put but only as a filter now (its own
Spin is disabled) — Season and the whole Car Build section are unaffected and
still shared across all 3 legs, same as any other roll.

By default every leg stays on the same **surface** — Road Racing, Street
Racing, Dirt Racing, or Cross Country — so a championship can freely mix a
surface's Circuit and Sprint variants (e.g. Road Racing - Circuit and Road
Racing - Sprint) but never crosses surfaces. Touge Battle and Drag Racing
have no surface and are never picked for a championship leg, in either mode
— FH6 doesn't build multi-race championships out of either. **Anarchy Mode**
drops the same-surface rule, letting each leg land on any championship-
eligible surface independently.

Two more rules hold regardless of mode:
- No leg ever repeats another leg's specific race.
- Only the **final** leg (Leg 3) may land on one of FH6's four long tracks
  (The Titan, The Gauntlet, The Colossus, The Goliath) — legs 1-2 never do.
  Exclude Long Tracks still applies on top of that, same as everywhere else:
  on, and even Leg 3 won't get one.

Every other filter and weighting rule still applies exactly as it does
outside Championship Mode — the Race Type card's own filter, Weighted by
rarity, and manual weight multipliers all shape which legs come up, same as
a normal Race Type/Specific Race roll. If the filters leave no valid 3-leg
combination at all (e.g. every championship-eligible race type disabled),
the legs show "Spin to reveal" and a toast explains why, same as any other
impossible-combo case elsewhere in the app.

### Colors

Race Type, Specific Race, Season, and Performance Class results are colored
to match FH6's own in-game HUD colors for each (`color` in `data/raceTypes.js`,
`data/seasons.js`, and `data/classes.js`). Specific Race takes its color from
whichever Race Type it belongs to. Drag Racing uses a plain red rather than
its in-game pink, kept deliberately distinct from Dirt Racing's orange.

### Adjust Weights

Opens a modal with a tab per weighted category (Race Type, Car Type,
Country, Brand, Decade) showing every option as a bar (length = how many
real races/cars back it) plus a 0×–3× slider for your own multiplier on top
of that — e.g. drag Ferrari to 3× to see it more, or a country to 0× to
almost never see it without touching its filter checkbox. Multipliers apply
whether or not "Weighted by rarity" is on.

Where a category allows "Any," its weight is set to match whichever real
option in the current pool is weighted lowest — so it never outweighs even
the rarest real option, and reads as "about as likely as the option you're
least likely to get anyway" rather than a generic average.

### Copy Challenge

Copies the current roll as a Markdown table inside a code block — paste it
straight into Discord/Slack and it renders as a clean, aligned table.

### Show Data

Opens a searchable browser of every car (636) and every race (81) FH6
Roulette knows about, straight from `data/cars.js` and
`data/individualRaces.js`. Besides the search box, every column has its own
filter (a dropdown for Make/Type/Country/Class/Race Type, a text box for
Year/Model/Stock PI) - all of them combine with each other and the search
box at once. The Cars tab's Model column isn't stored data - it's derived
by stripping the leading year and the make off `name` (which is always
"`<year> <make> <model>`"), so "1964 Ford Mustang GT Coupe" shows as
Year 1964 / Make Ford / Model "Mustang GT Coupe".

### Matching Cars

Once every car-build card (Car Type, Country, Brand, Decade, Performance
Class) has a result, the **Matching Cars** button opens a list of every
stock car in the roster that actually fulfils that exact combo - same
searchable, per-column-filterable table as Show Data, just scoped to what
you could actually drive for this roll instead of the full 636. A car
counts as a match if its stock Type/Country/Brand/Decade line up (Any
cards impose no constraint) and it can reach the rolled Performance Class
without tuning down - respecting Stock Cars Only live, same as everywhere
else that class headroom matters. The button stays disabled until a full
car build exists (Reset Spin disables it again).

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
data/raceSurfaces.js      Groups raceTypes.js ids into Championship Mode's 4 surfaces
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

- `data/raceTypes.js` — `{ id, name, desc, color }` (`color` should match the in-game category color; road/dirt/cross-country's two ids each share one color, same as in-game)
- `data/raceSurfaces.js` — `{ id, name, typeIds }` (`typeIds` references one or more ids in `data/raceTypes.js`; Championship Mode only ever picks race types listed here, so a race type with no surface — Touge Battle, Drag Racing — never appears in a championship)
- `data/individualRaces.js` — `{ id, name, typeId }` (`typeId` references an id in `data/raceTypes.js`; adding a brand-new race *type* — not just a new race — means adding it to `raceTypes.js` first)
- `data/carTypes.js` — `{ id, name }`
- `data/brands.js` — `{ id, name, country }` (`country` references an id in `data/countries.js`)
- `data/countries.js` — `{ id, name }`
- `data/decades.js` — `{ id, name }`
- `data/classes.js` — `{ id, name, pi, color }`
- `data/seasons.js` — `{ id, name, color }`
- `data/cars.js` — `{ id, name, make, type, country, year, decade, class, pi }` — `make`/`type`/`country`/`decade`/`class` each reference an id in the file of the matching name above; `pi` is the car's **stock** Performance Index

Adding a race whose `id` is one of `the-titan`, `the-gauntlet`, `the-colossus`,
`the-goliath` (in `js/app.js`'s `LONG_TRACK_IDS`) makes it subject to the
Exclude Long Tracks toggle; that list is intentionally hardcoded rather than
data-driven since it names four specific, unlikely-to-change races.

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
