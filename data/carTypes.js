/**
 * data/carTypes.js
 * -----------------------------------------------------------------------
 * Car body / build styles that can be spun by the roulette.
 * See data/races.js for the "how to add an entry" instructions - same
 * pattern applies to every data file in this folder.
 * -----------------------------------------------------------------------
 */
const CAR_TYPES = [
  { id: "hot-hatch", name: "Hot Hatch", desc: "Small, quick, front-drive-flavoured everyday performance car." },
  { id: "muscle-car", name: "Muscle Car", desc: "American V8 straight-line brawler." },
  { id: "sports-car", name: "Sports Car", desc: "Balanced, driver-focused two-seater." },
  { id: "gt-car", name: "GT Car", desc: "Grand tourer built to cover ground fast and in comfort." },
  { id: "supercar", name: "Supercar", desc: "Exotic, high-performance halo car." },
  { id: "hypercar", name: "Hypercar", desc: "The absolute bleeding edge of speed and tech." },
  { id: "rally-monster", name: "Rally Monster", desc: "Homologation-bred all-wheel-drive rally weapon." },
  { id: "offroad-buggy", name: "Offroad Buggy / Trophy Truck", desc: "Long-travel suspension, built to fly over rough terrain." },
  { id: "classic-racer", name: "Classic Racer", desc: "Vintage race-bred machine from motorsport's golden eras." },
  { id: "retro-saloon", name: "Retro Saloon / Sedan", desc: "Old-school four-door, sleeper potential." },
  { id: "track-toy", name: "Track Toy", desc: "Stripped-out, purpose-built for lap times, not comfort." },
  { id: "drift-build", name: "Drift Build", desc: "Sideways-first, rear-drive, angle over grip." },
  { id: "pickup-truck", name: "Pickup Truck", desc: "Body-on-frame hauler, unlikely racer." },
  { id: "suv", name: "SUV / Off-Roader", desc: "Tall ride height, go-anywhere family hauler." },
  { id: "van", name: "Van", desc: "Boxy, front- or rear-drive cargo hauler turned unlikely racer." },
  { id: "kei-car", name: "Kei Car", desc: "Tiny Japanese city car with a big personality." },
  { id: "drag-car", name: "Drag Car", desc: "Built for one thing: the quarter mile." },
  { id: "open-wheel", name: "Open-Wheel / Formula", desc: "Exposed wheels, downforce-heavy single-seater." },
  { id: "roadster", name: "Roadster / Cabriolet", desc: "Open-top two-seater, wind in your hair." },
  { id: "unicorn", name: "Unicorn / Rare Reward Car", desc: "Ultra-rare car earned through special events, not the storefront." },
];

if (typeof module !== "undefined" && module.exports) module.exports = CAR_TYPES;
