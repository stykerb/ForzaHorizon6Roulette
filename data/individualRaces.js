/**
 * data/individualRaces.js
 * -----------------------------------------------------------------------
 * Every named race in Forza Horizon 6, used by the "Roll a Specific Race"
 * section. There's no filter UI of its own - it reuses whichever Race
 * Types are enabled/disabled in the Race Type wheel above (see
 * data/raceTypes.js), matched via each race's `typeId`.
 *
 * Fields:
 *   id      - unique, lowercase, dashes only, never renamed once shipped
 *   name    - display name (in-game race name)
 *   typeId  - id from data/raceTypes.js
 *
 * HOW TO ADD A NEW ENTRY: copy a row, give it a unique `id`, fill in
 * `name` and the right `typeId`, save. If a game update adds a brand new
 * race type too, add it to data/raceTypes.js first.
 * -----------------------------------------------------------------------
 */
const INDIVIDUAL_RACES = [
  // Street Races
  { id: "cedar-run-street-race", name: "Cedar Run Street Race", typeId: "street-racing" },
  { id: "daikoku-chase-street-race", name: "Daikoku Chase Street Race", typeId: "street-racing" },
  { id: "festival-chase-street-race", name: "Festival Chase Street Race", typeId: "street-racing" },
  { id: "hokubu-ascent-street-race", name: "Hokubu Ascent Street Race", typeId: "street-racing" },
  { id: "kita-ine-street-race", name: "Kita Ine Street Race", typeId: "street-racing" },
  { id: "matsumi-climb-street-race", name: "Matsumi Climb Street Race", typeId: "street-racing" },
  { id: "minami-chase-street-race", name: "Minami Chase Street Race", typeId: "street-racing" },
  { id: "nachi-run-street-race", name: "Nachi Run Street Race", typeId: "street-racing" },
  { id: "norikura-descent-street-race", name: "Norikura Descent Street Race", typeId: "street-racing" },
  { id: "okishinaimura-run-street-race", name: "Okishinaimura Run Street Race", typeId: "street-racing" },
  { id: "rainbow-bridge-descent-street-race", name: "Rainbow Bridge Descent Street Race", typeId: "street-racing" },
  { id: "river-descent-street-race", name: "River Descent Street Race", typeId: "street-racing" },
  { id: "shimanoyama-charge-street-race", name: "Shimanoyama Charge Street Race", typeId: "street-racing" },
  { id: "sunflower-charge-street-race", name: "Sunflower Charge Street Race", typeId: "street-racing" },
  { id: "tokyo-city-docks-charge-street-race", name: "Tokyo City Docks Charge Street Race", typeId: "street-racing" },

  // Road Races
  { id: "coastline-sprint", name: "Coastline Sprint", typeId: "road-sprint" },
  { id: "daikoku-circuit", name: "Daikoku Circuit", typeId: "road-circuit" },
  { id: "electric-town-circuit", name: "Electric Town Circuit", typeId: "road-circuit" },
  { id: "festival-sprint", name: "Festival Sprint", typeId: "road-sprint" },
  { id: "highway-circuit", name: "Highway Circuit", typeId: "road-circuit" },
  { id: "hokubu-circuit", name: "Hokubu Circuit", typeId: "road-circuit" },
  { id: "irokawa-circuit-road-race", name: "Irokawa Circuit Road Race", typeId: "road-circuit" },
  { id: "ito-sprint", name: "Ito Sprint", typeId: "road-sprint" },
  { id: "legend-island-circuit", name: "Legend Island Circuit", typeId: "road-circuit" },
  { id: "narai-juku-circuit", name: "Narai-Juku Circuit", typeId: "road-circuit" },
  { id: "satta-sprint", name: "Satta Sprint", typeId: "road-sprint" },
  { id: "seaside-park-sprint", name: "Seaside Park Sprint", typeId: "road-sprint" },
  { id: "shikisai-sprint", name: "Shikisai Sprint", typeId: "road-sprint" },
  { id: "shimanoyama-circuit", name: "Shimanoyama Circuit", typeId: "road-circuit" },
  { id: "shimanoyama-sprint", name: "Shimanoyama Sprint", typeId: "road-sprint" },
  { id: "shirakawa-circuit", name: "Shirakawa Circuit", typeId: "road-circuit" },
  { id: "tateyama-kurobe-sprint", name: "Tateyama Kurobe Sprint", typeId: "road-sprint" },
  { id: "the-colossus", name: "The Colossus", typeId: "road-sprint" },
  { id: "the-goliath", name: "The Goliath", typeId: "road-sprint" },
  { id: "venus-sprint", name: "Venus Sprint", typeId: "road-sprint" },

  // Touge Races
  { id: "arashiyama-takao-touge-race", name: "Arashiyama Takao Touge Race", typeId: "touge-battle" },
  { id: "bandai-azuma-touge-race", name: "Bandai Azuma Touge Race", typeId: "touge-battle" },
  { id: "hakone-nanamagari-touge-race", name: "Hakone Nanamagari Touge Race", typeId: "touge-battle" },
  { id: "mt-haruna-touge-race", name: "Mt. Haruna Touge Race", typeId: "touge-battle" },
  { id: "norikura-skyline-touge-race", name: "Norikura Skyline Touge Race", typeId: "touge-battle" },

  // Drag Races
  { id: "horizon-festival-drag-strip", name: "Horizon Festival Drag Strip", typeId: "drag-racing" },
  { id: "irokawa-space-center-drag-strip", name: "Irokawa Space Center Drag Strip", typeId: "drag-racing" },
  { id: "ito-airfield-drag-strip", name: "Ito Airfield Drag Strip", typeId: "drag-racing" },

  // Dirt Races
  { id: "airfield-trail", name: "Airfield Trail", typeId: "dirt-trail" },
  { id: "bamboo-forest-scramble", name: "Bamboo Forest Scramble", typeId: "dirt-scramble" },
  { id: "cherry-field-trail", name: "Cherry Field Trail", typeId: "dirt-trail" },
  { id: "chiheisen-scramble", name: "Chiheisen Scramble", typeId: "dirt-scramble" },
  { id: "hirosaki-scramble", name: "Hirosaki Scramble", typeId: "dirt-scramble" },
  { id: "hokubu-trail", name: "Hokubu Trail", typeId: "dirt-trail" },
  { id: "horizon-stadium-scramble", name: "Horizon Stadium Scramble", typeId: "dirt-scramble" },
  { id: "ine-scramble", name: "Ine Scramble", typeId: "dirt-scramble" },
  { id: "ito-trail", name: "Ito Trail", typeId: "dirt-trail" },
  { id: "kawazu-nanadaru-scramble", name: "Kawazu Nanadaru Scramble", typeId: "dirt-scramble" },
  { id: "kinkaku-ji-trail", name: "Kinkaku-ji Trail", typeId: "dirt-trail" },
  { id: "legend-island-trail", name: "Legend Island Trail", typeId: "dirt-trail" },
  { id: "nukabira-trail", name: "Nukabira Trail", typeId: "dirt-trail" },
  { id: "oyashirazu-trail", name: "Oyashirazu Trail", typeId: "dirt-trail" },
  { id: "sekibe-scramble", name: "Sekibe Scramble", typeId: "dirt-scramble" },
  { id: "sotoyama-scramble", name: "Sotoyama Scramble", typeId: "dirt-scramble" },
  { id: "sunflower-scramble", name: "Sunflower Scramble", typeId: "dirt-scramble" },
  { id: "taiyaki-scramble", name: "Taiyaki Scramble", typeId: "dirt-scramble" },
  { id: "takashiro-trail", name: "Takashiro Trail", typeId: "dirt-trail" },
  { id: "the-gauntlet", name: "The Gauntlet", typeId: "dirt-scramble" },

  // Cross Country Races
  { id: "city-docks-cross-country-circuit", name: "City Docks Cross Country Circuit", typeId: "cross-country-circuit" },
  { id: "edogawa-cross-country-circuit", name: "Edogawa Cross Country Circuit", typeId: "cross-country-circuit" },
  { id: "izu-cross-country", name: "Izu Cross Country", typeId: "cross-country" },
  { id: "legend-island-cross-country-circuit", name: "Legend Island Cross Country Circuit", typeId: "cross-country-circuit" },
  { id: "nangan-cross-country-circuit", name: "Nangan Cross Country Circuit", typeId: "cross-country-circuit" },
  { id: "naruo-cross-country-circuit", name: "Naruo Cross Country Circuit", typeId: "cross-country-circuit" },
  { id: "oka-cross-country-circuit", name: "Oka Cross Country Circuit", typeId: "cross-country-circuit" },
  { id: "ruriko-ji-cross-country", name: "Ruriko-ji Cross Country", typeId: "cross-country" },
  { id: "shimanoyama-cross-country", name: "Shimanoyama Cross Country", typeId: "cross-country" },
  { id: "shinjuku-gyoen-cross-country", name: "Shinjuku Gyoen Cross Country", typeId: "cross-country" },
  { id: "snow-forest-cross-country-circuit", name: "Snow Forest Cross Country Circuit", typeId: "cross-country-circuit" },
  { id: "soni-highlands-cross-country", name: "Soni Highlands Cross Country", typeId: "cross-country" },
  { id: "takashiro-cross-country", name: "Takashiro Cross Country", typeId: "cross-country" },
  { id: "tateyama-alpine-cross-country", name: "Tateyama Alpine Cross Country", typeId: "cross-country" },
  { id: "temple-cross-country", name: "Temple Cross Country", typeId: "cross-country" },
  { id: "the-titan", name: "The Titan", typeId: "cross-country" },
  { id: "wind-farm-cross-country", name: "Wind Farm Cross Country", typeId: "cross-country" },
  { id: "yahikoyama-cross-country", name: "Yahikoyama Cross Country", typeId: "cross-country" },
];

if (typeof module !== "undefined" && module.exports) module.exports = INDIVIDUAL_RACES;
