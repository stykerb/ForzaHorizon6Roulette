/**
 * data/brands.js
 * -----------------------------------------------------------------------
 * Car manufacturers that can be spun by the roulette.
 *
 * This is a curated starting roster covering the manufacturers featured
 * in Forza Horizon 6 at/around launch (Japan-heavy, plus the usual
 * European/American/Korean spread). It is NOT guaranteed to be 100%
 * complete or in perfect sync with every DLC/update car pack - when a
 * game update adds a new manufacturer, just ask to have it added and
 * this file gets a new entry.
 *
 * Fields:
 *   id      - unique, lowercase, dashes only, never renamed once shipped
 *   name    - display name
 *   country - id from data/countries.js (used for flavour text / grouping,
 *             the "Country" wheel still spins independently)
 *
 * See data/races.js for the general "how to add an entry" instructions.
 * -----------------------------------------------------------------------
 */
const BRANDS = [
  // Japan
  { id: "toyota", name: "Toyota", country: "japan" },
  { id: "lexus", name: "Lexus", country: "japan" },
  { id: "nissan", name: "Nissan", country: "japan" },
  { id: "nismo", name: "Nismo", country: "japan" },
  { id: "honda", name: "Honda", country: "japan" },
  { id: "acura", name: "Acura", country: "japan" },
  { id: "mazda", name: "Mazda", country: "japan" },
  { id: "mazdaspeed", name: "Mazdaspeed", country: "japan" },
  { id: "subaru", name: "Subaru", country: "japan" },
  { id: "mitsubishi", name: "Mitsubishi", country: "japan" },
  { id: "suzuki", name: "Suzuki", country: "japan" },
  { id: "daihatsu", name: "Daihatsu", country: "japan" },
  { id: "isuzu", name: "Isuzu", country: "japan" },
  { id: "datsun", name: "Datsun", country: "japan" },
  { id: "autozam", name: "Autozam", country: "japan" },
  { id: "kei-office", name: "Kei Office", country: "japan" },
  { id: "toyota-gazoo-racing", name: "Toyota Gazoo Racing", country: "japan" },
  { id: "mugen", name: "Mugen", country: "japan" },
  { id: "spoon-sports", name: "Spoon Sports", country: "japan" },
  { id: "rocket-bunny", name: "Rocket Bunny / TRA Kyoto", country: "japan" },
  { id: "liberty-walk", name: "Liberty Walk", country: "japan" },
  { id: "top-secret", name: "Top Secret", country: "japan" },
  { id: "varis", name: "Varis", country: "japan" },
  { id: "voltex", name: "Voltex", country: "japan" },

  // United States
  { id: "ford", name: "Ford", country: "usa" },
  { id: "chevrolet", name: "Chevrolet", country: "usa" },
  { id: "cadillac", name: "Cadillac", country: "usa" },
  { id: "dodge", name: "Dodge", country: "usa" },
  { id: "srt", name: "SRT", country: "usa" },
  { id: "ram", name: "RAM", country: "usa" },
  { id: "jeep", name: "Jeep", country: "usa" },
  { id: "chrysler", name: "Chrysler", country: "usa" },
  { id: "gmc", name: "GMC", country: "usa" },
  { id: "hummer", name: "Hummer", country: "usa" },
  { id: "lincoln", name: "Lincoln", country: "usa" },
  { id: "tesla", name: "Tesla", country: "usa" },
  { id: "rivian", name: "Rivian", country: "usa" },
  { id: "shelby", name: "Shelby", country: "usa" },
  { id: "saleen", name: "Saleen", country: "usa" },
  { id: "hoonigan", name: "Hoonigan", country: "usa" },
  { id: "rtr", name: "RTR Vehicles", country: "usa" },
  { id: "local-motors", name: "Local Motors", country: "usa" },
  { id: "vlf", name: "VLF", country: "usa" },
  { id: "icon-4x4", name: "ICON 4x4", country: "usa" },

  // Germany
  { id: "bmw", name: "BMW", country: "germany" },
  { id: "bmw-m", name: "BMW M", country: "germany" },
  { id: "mercedes-benz", name: "Mercedes-Benz", country: "germany" },
  { id: "mercedes-amg", name: "Mercedes-AMG", country: "germany" },
  { id: "audi", name: "Audi", country: "germany" },
  { id: "volkswagen", name: "Volkswagen", country: "germany" },
  { id: "porsche", name: "Porsche", country: "germany" },
  { id: "opel", name: "Opel", country: "germany" },
  { id: "ruf", name: "RUF", country: "germany" },
  { id: "brabus", name: "Brabus", country: "germany" },
  { id: "gumpert-apollo", name: "Apollo (Gumpert)", country: "germany" },

  // Italy
  { id: "ferrari", name: "Ferrari", country: "italy" },
  { id: "lamborghini", name: "Lamborghini", country: "italy" },
  { id: "alfa-romeo", name: "Alfa Romeo", country: "italy" },
  { id: "maserati", name: "Maserati", country: "italy" },
  { id: "fiat", name: "Fiat", country: "italy" },
  { id: "abarth", name: "Abarth", country: "italy" },
  { id: "pagani", name: "Pagani", country: "italy" },
  { id: "lancia", name: "Lancia", country: "italy" },
  { id: "de-tomaso", name: "De Tomaso", country: "italy" },

  // United Kingdom
  { id: "aston-martin", name: "Aston Martin", country: "uk" },
  { id: "bentley", name: "Bentley", country: "uk" },
  { id: "rolls-royce", name: "Rolls-Royce", country: "uk" },
  { id: "jaguar", name: "Jaguar", country: "uk" },
  { id: "land-rover", name: "Land Rover", country: "uk" },
  { id: "mclaren", name: "McLaren", country: "uk" },
  { id: "lotus", name: "Lotus", country: "uk" },
  { id: "mini", name: "MINI", country: "uk" },
  { id: "vauxhall", name: "Vauxhall", country: "uk" },
  { id: "tvr", name: "TVR", country: "uk" },
  { id: "caterham", name: "Caterham", country: "uk" },
  { id: "ariel", name: "Ariel", country: "uk" },
  { id: "noble", name: "Noble", country: "uk" },
  { id: "morgan", name: "Morgan", country: "uk" },
  { id: "westfield", name: "Westfield", country: "uk" },

  // France
  { id: "renault", name: "Renault", country: "france" },
  { id: "renault-sport", name: "Renault Sport", country: "france" },
  { id: "peugeot", name: "Peugeot", country: "france" },
  { id: "citroen", name: "Citroën", country: "france" },
  { id: "bugatti", name: "Bugatti", country: "france" },
  { id: "alpine", name: "Alpine", country: "france" },

  // Sweden
  { id: "volvo", name: "Volvo", country: "sweden" },
  { id: "koenigsegg", name: "Koenigsegg", country: "sweden" },
  { id: "polestar", name: "Polestar", country: "sweden" },
  { id: "saab", name: "Saab", country: "sweden" },

  // South Korea
  { id: "hyundai", name: "Hyundai", country: "south-korea" },
  { id: "kia", name: "Kia", country: "south-korea" },
  { id: "genesis", name: "Genesis", country: "south-korea" },

  // Czech Republic
  { id: "skoda", name: "Škoda", country: "czech-republic" },

  // Spain
  { id: "seat", name: "SEAT", country: "spain" },
  { id: "cupra", name: "Cupra", country: "spain" },
  { id: "hispano-suiza", name: "Hispano-Suiza", country: "spain" },

  // Netherlands
  { id: "donkervoort", name: "Donkervoort", country: "netherlands" },
  { id: "spyker", name: "Spyker", country: "netherlands" },

  // Croatia
  { id: "rimac", name: "Rimac", country: "croatia" },

  // Australia
  { id: "hsv", name: "HSV (Holden Special Vehicles)", country: "australia" },
  { id: "holden", name: "Holden", country: "australia" },

  // China
  { id: "byd", name: "BYD", country: "china" },

  // Russia
  { id: "lada", name: "Lada", country: "russia" },
];

if (typeof module !== "undefined" && module.exports) module.exports = BRANDS;
