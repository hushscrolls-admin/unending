const CLASSES = {
  warrior: {
    id: "warrior",
    name: "Warrior",
    tag: "Steel and grit",
    blurb: "Melee cleave. Charge the back line and stay there.",
    color: "#c9a227",
    sprite: "hero",
    anims: true,
    flip: false,
    style: "melee",
    companion: false,
    hp: 100,
    dmg: 8,
    armor: 0,
    atkRate: 0.9,
    reach: 92,
    range: 92,
    mana: 20,
    maxMana: 80,
    manaRegen: 2.2,
    strikeName: "Power Strike",
    strikeCd: 1.35,
    skills: [
      { id: "mend", name: "Mend", mana: 25 },
      { id: "whirl", name: "Whirlwind", cd: 6 },
      { id: "charge", name: "Charge", toggle: true },
    ],
  },
  mage: {
    id: "mage",
    name: "Fire Mage",
    tag: "Flame and frost",
    blurb: "Ranged bolts. Burn them down, then freeze the pack.",
    color: "#ff6a3a",
    sprite: "heroMage",
    anims: false,
    flip: false,
    hue: 0,
    style: "ranged",
    proj: "fire",
    companion: false,
    hp: 74,
    dmg: 7,
    armor: 0,
    atkRate: 0.7,
    reach: 86,
    range: 400,
    mana: 36,
    maxMana: 110,
    manaRegen: 3.4,
    strikeName: "Fireball",
    strikeCd: 1.55,
    skills: [
      { id: "cauterize", name: "Cauterize", mana: 25 },
      { id: "inferno", name: "Inferno", cd: 8 },
      { id: "nova", name: "Frost Nova", mana: 28, cd: 7 },
    ],
  },
  ranger: {
    id: "ranger",
    name: "Ranger",
    tag: "Bow and wolf",
    blurb: "Ranged burst. Your wolf holds the road.",
    color: "#7aaf4a",
    sprite: "heroRanger",
    anims: false,
    flip: true,
    style: "ranged",
    proj: "arrow",
    companion: true,
    hp: 86,
    dmg: 9,
    armor: 0,
    atkRate: 0.95,
    reach: 80,
    range: 380,
    mana: 22,
    maxMana: 80,
    manaRegen: 2.4,
    strikeName: "Aimed Shot",
    strikeCd: 1.4,
    skills: [
      { id: "dress", name: "Field Dress", mana: 25 },
      { id: "volley", name: "Volley", cd: 7 },
      { id: "sic", name: "Sic 'em", cd: 8 },
    ],
  },
};

const ENEMIES = {
  grunt: {
    name: "Raider",
    sprite: "grunt",
    walk: true,
    hp: 28,
    dmg: 5,
    armor: 0,
    speed: 70,
    atkRate: 0.85,
    reach: 78,
    keep: 78,
    gold: 8,
    magic: 2,
    color: "#7a8a4a",
  },
  shield: {
    name: "Shield",
    sprite: "shield",
    hp: 46,
    dmg: 4,
    armor: 7,
    speed: 48,
    atkRate: 0.7,
    reach: 86,
    keep: 86,
    gold: 12,
    magic: 2,
    color: "#8a6a3a",
  },
  berserk: {
    name: "Berserker",
    sprite: "berserk",
    hp: 26,
    dmg: 11,
    armor: 0,
    speed: 95,
    atkRate: 1.15,
    reach: 80,
    keep: 80,
    gold: 14,
    magic: 3,
    color: "#a33a2a",
    enrage: true,
  },
  archer: {
    name: "Archer",
    sprite: "archer",
    hp: 20,
    dmg: 7,
    armor: 0,
    speed: 62,
    atkRate: 0.7,
    reach: 78,
    keep: 250,
    gold: 13,
    magic: 4,
    color: "#4a6a3a",
    projectile: "arrow",
    projSpeed: 420,
    atkRange: 380,
  },
  mage: {
    name: "Mage",
    sprite: "mage",
    hp: 18,
    dmg: 14,
    armor: 0,
    speed: 50,
    atkRate: 0.42,
    reach: 78,
    keep: 270,
    gold: 16,
    magic: 8,
    color: "#3a4aaa",
    projectile: "bolt",
    projSpeed: 280,
    atkRange: 420,
  },
  healer: {
    name: "Healer",
    sprite: "healer",
    hp: 22,
    dmg: 3,
    armor: 0,
    speed: 58,
    atkRate: 0.55,
    reach: 78,
    keep: 200,
    gold: 15,
    magic: 7,
    color: "#c9a227",
    heal: 10,
    healRate: 2.6,
    healRange: 168,
  },
  assassin: {
    name: "Assassin",
    sprite: "assassin",
    hp: 22,
    dmg: 4,
    armor: 0,
    speed: 88,
    atkRate: 1.05,
    reach: 70,
    keep: 70,
    gold: 14,
    magic: 4,
    color: "#3a3a48",
    crit: 0.4,
    shadowstep: true,
  },
  butcher: {
    name: "The Butcher",
    sprite: "butcher",
    boss: true,
    scale: 1.55,
    hp: 90,
    dmg: 14,
    armor: 2,
    speed: 38,
    atkRate: 0.55,
    reach: 110,
    keep: 110,
    gold: 48,
    magic: 16,
    color: "#c44a2a",
    enrage: true,
  },
  ironhide: {
    name: "Ironhide",
    sprite: "ironhide",
    boss: true,
    scale: 1.5,
    hp: 110,
    dmg: 11,
    armor: 16,
    speed: 28,
    atkRate: 0.48,
    reach: 115,
    keep: 115,
    gold: 58,
    magic: 14,
    color: "#6a7080",
  },
  skycleaver: {
    name: "Skycleaver",
    sprite: "skycleaver",
    boss: true,
    scale: 1.5,
    hp: 75,
    dmg: 12,
    armor: 1,
    speed: 44,
    atkRate: 0.55,
    reach: 90,
    keep: 240,
    gold: 62,
    magic: 18,
    color: "#8a6a3a",
    projectile: "arrow",
    projSpeed: 460,
    volley: 3,
    atkRange: 420,
  },
  stormcaller: {
    name: "Stormcaller",
    sprite: "stormcaller",
    boss: true,
    scale: 1.48,
    hp: 70,
    dmg: 15,
    armor: 0,
    speed: 36,
    atkRate: 0.38,
    reach: 90,
    keep: 260,
    gold: 70,
    magic: 24,
    color: "#5a4ad0",
    projectile: "bolt",
    projSpeed: 300,
    volley: 2,
    atkRange: 440,
  },
  sunfallen: {
    name: "The Sunfallen",
    sprite: "sunfallen",
    boss: true,
    scale: 1.48,
    hp: 95,
    dmg: 10,
    armor: 3,
    speed: 34,
    atkRate: 0.5,
    reach: 95,
    keep: 200,
    gold: 80,
    magic: 22,
    color: "#d07030",
    heal: 14,
    healRate: 2.2,
    healRange: 180,
    projectile: "bolt",
    projSpeed: 260,
    atkRange: 380,
  },
};

const BOSS_ORDER = ["butcher", "ironhide", "skycleaver", "stormcaller", "sunfallen"];

const RUN_UPGRADES = [
  {
    id: "iron",
    name: "Iron",
    desc: "+2 damage",
    icon: "⚔",
    cost: (lv) => Math.floor(18 * Math.pow(1.38, lv)),
    apply: (hero) => {
      hero.dmg += 2;
    },
  },
  {
    id: "swift",
    name: "Swift",
    desc: "+8% attack speed",
    icon: "»",
    cost: (lv) => Math.floor(20 * Math.pow(1.4, lv)),
    apply: (hero) => {
      hero.atkRate *= 1.08;
    },
  },
  {
    id: "vital",
    name: "Vitality",
    desc: "+25 max HP, heal 25",
    icon: "♥",
    cost: (lv) => Math.floor(22 * Math.pow(1.36, lv)),
    apply: (hero) => {
      hero.maxHp += 25;
      hero.hp = Math.min(hero.maxHp, hero.hp + 25);
    },
  },
  {
    id: "guard",
    name: "Guard",
    desc: "+1.5 armor",
    icon: "🛡",
    cost: (lv) => Math.floor(24 * Math.pow(1.4, lv)),
    apply: (hero) => {
      hero.armor += 1.5;
    },
  },
  {
    id: "fortune",
    name: "Fortune",
    desc: "+12% gold find",
    icon: "●",
    cost: (lv) => Math.floor(25 * Math.pow(1.42, lv)),
    apply: (hero) => {
      hero.goldFind += 0.12;
    },
  },
  {
    id: "leech",
    name: "Leech",
    desc: "+3% lifesteal",
    icon: "◈",
    cost: (lv) => Math.floor(28 * Math.pow(1.45, lv)),
    apply: (hero) => {
      hero.leech += 0.03;
    },
  },
  {
    id: "edge",
    name: "Edge",
    desc: "+6% crit chance",
    icon: "✦",
    cost: (lv) => Math.floor(30 * Math.pow(1.45, lv)),
    apply: (hero) => {
      hero.crit += 0.06;
    },
  },
];

const PRESTIGE_UPGRADES = [
  {
    id: "blood",
    name: "Blood",
    desc: "+20 starting HP each run",
    cost: (lv) => 1 + lv * 2,
  },
  {
    id: "might",
    name: "Might",
    desc: "+2 starting damage each run",
    cost: (lv) => 1 + lv * 2,
  },
  {
    id: "purse",
    name: "Purse",
    desc: "+18 starting gold each run",
    cost: (lv) => 1 + lv * 2,
  },
  {
    id: "greed",
    name: "Greed",
    desc: "+12% gold find each run",
    cost: (lv) => 2 + lv * 2,
  },
  {
    id: "fate",
    name: "Fate",
    desc: "+18% glory on death",
    cost: (lv) => 2 + lv * 3,
  },
  {
    id: "spark",
    name: "Spark",
    desc: "+0.7 mana regen each run",
    cost: (lv) => 2 + lv * 2,
  },
];

function waveCount(n) {
  return Math.min(5, Math.max(1, Math.ceil(n / 1.7)));
}

function isBossWave(n) {
  return n > 0 && n % 10 === 0;
}

function bossTypeFor(n) {
  const idx = (Math.floor(n / 10) - 1) % BOSS_ORDER.length;
  return BOSS_ORDER[idx];
}

function waveRoster(n) {
  if (isBossWave(n)) return [bossTypeFor(n)];
  const count = waveCount(n);
  const units = [];
  for (let i = 0; i < count; i++) {
    let type = "grunt";
    if (n >= 13 && n % 3 === 1 && i === count - 1) type = "healer";
    else if (n >= 11 && i === count - 1 && count >= 3) type = "mage";
    else if (n >= 7 && i === count - 1) type = "archer";
    else if (n >= 11 && i === count - 2 && count >= 4) type = "archer";
    else if (n >= 8 && i % 4 === 3) type = "assassin";
    else if (n >= 5 && i % 3 === 2) type = "berserk";
    else if (n >= 3 && i % 2 === 1) type = "shield";
    units.push(type);
  }
  if (n === 1) return ["grunt"];
  return units;
}

function waveScale(n) {
  return {
    hp: Math.pow(1.17, n - 1),
    dmg: Math.pow(1.09, n - 1),
    gold: 1 + (n - 1) * 0.08,
  };
}
