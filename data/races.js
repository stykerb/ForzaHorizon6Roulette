/**
 * data/races.js
 * -----------------------------------------------------------------------
 * Race / event types that can be spun by the roulette.
 *
 * HOW TO ADD A NEW ENTRY (e.g. a new event type added in a game update):
 *   1. Copy an existing object below.
 *   2. Give it a unique `id` (lowercase, dashes only, never reused/renamed
 *      once shipped, or players' saved filters will silently drop it).
 *   3. Fill in `name` and `desc`.
 *   4. Save the file - the app picks it up automatically, no other code
 *      needs to change.
 * -----------------------------------------------------------------------
 */
const RACES = [
  { id: "road-circuit", name: "Road Racing - Circuit", desc: "Multi-lap tarmac circuit race." },
  { id: "road-sprint", name: "Road Racing - Sprint", desc: "Point-to-point tarmac race." },
  { id: "street-racing", name: "Street Racing", desc: "Underground night point-to-point sprint through city streets." },
  { id: "dirt-racing", name: "Dirt Racing", desc: "Race on unpaved trails, gravel roads and forest paths." },
  { id: "cross-country", name: "Cross Country", desc: "Open-terrain off-road race with minimal track boundaries - cut your own line." },
  { id: "touge-battle", name: "Touge Battle", desc: "One-on-one mountain pass battle, uphill or downhill." },
  { id: "horizon-showcase", name: "Horizon Showcase", desc: "Scripted, theatrical showdown against a spectacular rival (plane, train, blimp...)." },
  { id: "horizon-open", name: "Horizon Open", desc: "Free-for-all online race, any car, any road." },
  { id: "speed-trap", name: "PR Stunt - Speed Trap", desc: "Hit the highest possible speed through a radar gate." },
  { id: "speed-zone", name: "PR Stunt - Speed Zone", desc: "Maintain top speed through a sustained zone." },
  { id: "danger-sign", name: "PR Stunt - Danger Sign", desc: "Launch off a ramp for maximum distance." },
  { id: "drift-zone", name: "PR Stunt - Drift Zone", desc: "Rack up drift score through a marked zone." },
  { id: "eliminator", name: "Eliminator", desc: "Battle royale - last driver standing, upgrade as you go." },
  { id: "day-trip", name: "Day Trip", desc: "Scenic group tour of Japan that ends in a competitive challenge." },
  { id: "king", name: "King", desc: "Playground Games mode - hold the crown as long as you can." },
  { id: "infected", name: "Infected", desc: "Playground Games mode - tag mode, last survivor wins." },
  { id: "the-trial", name: "The Trial", desc: "4-player co-op convoy race against a tough AI field." },
  { id: "rivals", name: "Rivals / Time Trial", desc: "Solo time-attack against the clock and the leaderboard." },
];

if (typeof module !== "undefined" && module.exports) module.exports = RACES;
