/**
 * data/carTypes.js
 * -----------------------------------------------------------------------
 * Car build/category types that can be spun by the roulette (matches
 * FH6's in-game car type filters).
 * See data/races.js.../ data/raceTypes.js for the "how to add an entry"
 * instructions - same pattern applies to every data file in this folder.
 * -----------------------------------------------------------------------
 */
const CAR_TYPES = [
  { id: "buggies", name: "Buggies" },
  { id: "classic-muscle", name: "Classic Muscle" },
  { id: "classic-racers", name: "Classic Racers" },
  { id: "classic-rally", name: "Classic Rally" },
  { id: "classic-sports-cars", name: "Classic Sports Cars" },
  { id: "cult-cars", name: "Cult Cars" },
  { id: "drift-cars", name: "Drift Cars" },
  { id: "eclectic-domestics", name: "Eclectic Domestics" },
  { id: "extreme-track-toys", name: "Extreme Track Toys" },
  { id: "gt-cars", name: "GT Cars" },
  { id: "hot-hatch", name: "Hot Hatch" },
  { id: "hypercars", name: "Hypercars" },
  { id: "modern-muscle", name: "Modern Muscle" },
  { id: "modern-rally", name: "Modern Rally" },
  { id: "modern-sports-cars", name: "Modern Sports Cars" },
  { id: "modern-super-saloons", name: "Modern Super Saloons" },
  { id: "modern-supercars", name: "Modern Supercars" },
  { id: "offroad", name: "Offroad" },
  { id: "pickups-4x4s", name: "Pickups & 4x4's" },
  { id: "rally-monsters", name: "Rally Monsters" },
  { id: "rare-classics", name: "Rare Classics" },
  { id: "retro-hot-hatch", name: "Retro Hot Hatch" },
  { id: "retro-muscle", name: "Retro Muscle" },
  { id: "retro-racers", name: "Retro Racers" },
  { id: "retro-rally", name: "Retro Rally" },
  { id: "retro-sports-cars", name: "Retro Sports Cars" },
  { id: "retro-super-saloons", name: "Retro Super Saloons" },
  { id: "retro-supercars", name: "Retro Supercars" },
  { id: "rods-customs", name: "Rods & Customs" },
  { id: "sports-utility-heroes", name: "Sports Utility Heroes" },
  { id: "super-gt", name: "Super GT" },
  { id: "super-hot-hatch", name: "Super Hot Hatch" },
  { id: "track-toys", name: "Track Toys" },
  { id: "unlimited-buggies", name: "Unlimited Buggies" },
  { id: "unlimited-offroad", name: "Unlimited Offroad" },
  { id: "utility-heroes", name: "Utility Heroes" },
  { id: "utvs", name: "UTV's" },
];

if (typeof module !== "undefined" && module.exports) module.exports = CAR_TYPES;
