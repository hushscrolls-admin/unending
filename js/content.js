// Stage = 10 waves. Bosses land on 10 / 20 / 30 / 40 / 50
// (Butcher, Ironhide, Skycleaver, Stormcaller, The Sunfallen).
// Scott reach bars (design, not spreadsheet DPS):
//   0 prestiges → Stage 1 waves 6–8
//   1 prestige  → 1st boss (wave 10)
//   2 prestiges → mid Stage 2 (waves 14–16)
//   3 prestiges → 2nd boss (wave 20)
const STAGE_LEN = 10;

const NOVA = {
  reach: 172,
  reachCap: 220,
  freeze: 1.35,
  cd: 9,
  cdMin: 7,
  mana: 28,
};

// Base ranges sit short of the spawn line (~390) so Long Cast / Longshot
// actually extend on-road reach. Combat range is clamped to the playable road.
const RANGE = {
  mage: 268,
  ranger: 252,
  roadPad: 28,
  spawnGap: 390,
};

function roadRangeCap(playSpan) {
  return Math.max(160, (playSpan || 420) - RANGE.roadPad);
}

function clampCombatRange(range, playSpan) {
  const n = Math.max(40, Number(range) || 0);
  return Math.min(n, roadRangeCap(playSpan));
}

// Walk-forward road. Camps sit at fixed distances and only aggro
// when they enter the wake line. A boss caps each 10-wave biome.
const ROAD = {
  firstGap: 420,
  packGap: 580,
  packSpread: 32,
  afterBoss: 340,
  heroWalk: 124,
  stopMelee: 110,
  stopRanged: 172,
};

const BIOMES = [
  {
    id: "duskwood",
    name: "Duskwood Road",
    hue: 0,
    sat: 1,
    bright: 1,
    skyTop: "#141c28",
    skyBot: "#3a4a34",
    ground: "#3a3224",
    dust: "#6a5a38",
    fog: "rgba(16, 24, 16, 0.16)",
    accent: "#2d4a28",
    particle: "leaf",
  },
  {
    id: "ember",
    name: "Ember Wastes",
    hue: -32,
    sat: 1.55,
    bright: 0.72,
    wash: "rgba(90, 18, 6, 0.42)",
    skyTop: "#2a0806",
    skyBot: "#8a2a10",
    ground: "#4a140c",
    dust: "#ff6a22",
    fog: "rgba(120, 28, 8, 0.35)",
    accent: "#c43a12",
    particle: "ember",
  },
  {
    id: "rime",
    name: "Rime Pass",
    hue: 175,
    sat: 0.55,
    bright: 1.12,
    wash: "rgba(20, 50, 80, 0.38)",
    skyTop: "#061018",
    skyBot: "#3a6888",
    ground: "#142430",
    dust: "#d8f4ff",
    fog: "rgba(200, 230, 250, 0.2)",
    accent: "#6aa8c0",
    particle: "snow",
  },
  {
    id: "storm",
    name: "Storm Flats",
    hue: 52,
    sat: 0.7,
    bright: 0.62,
    wash: "rgba(28, 16, 64, 0.44)",
    skyTop: "#0a0818",
    skyBot: "#3a2468",
    ground: "#14101c",
    dust: "#b090ff",
    fog: "rgba(50, 24, 90, 0.32)",
    accent: "#7a5ad8",
    particle: "spark",
  },
  {
    id: "sunken",
    name: "Sunken Court",
    hue: 12,
    sat: 1.28,
    bright: 0.88,
    wash: "rgba(70, 42, 10, 0.36)",
    skyTop: "#1a1008",
    skyBot: "#8a5a20",
    ground: "#322414",
    dust: "#ffe27a",
    fog: "rgba(80, 50, 16, 0.28)",
    accent: "#e6c15a",
    particle: "mote",
  },
];

function stageIndex(wave) {
  return Math.max(1, Math.ceil(Math.max(1, wave) / STAGE_LEN));
}

function waveInStage(wave) {
  const w = Math.max(1, wave);
  const r = w % STAGE_LEN;
  return r === 0 ? STAGE_LEN : r;
}

function biomeForStage(stage) {
  return BIOMES[(Math.max(1, stage) - 1) % BIOMES.length];
}

function stageSpan() {
  return ROAD.firstGap + (STAGE_LEN - 1) * ROAD.packGap + ROAD.afterBoss;
}

function stageOriginX(stage) {
  return 80 + (Math.max(1, stage) - 1) * stageSpan();
}

function packWorldX(stage, wave) {
  const local = waveInStage(wave);
  return stageOriginX(stage) + ROAD.firstGap + (local - 1) * ROAD.packGap;
}

function gateWorldX(stage) {
  return packWorldX(stage, STAGE_LEN) + ROAD.afterBoss;
}

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
    flip: true,
    hue: 0,
    style: "ranged",
    proj: "fire",
    companion: false,
    hp: 84,
    dmg: 7,
    armor: 1,
    atkRate: 0.76,
    reach: 86,
    range: RANGE.mage,
    mana: 36,
    maxMana: 110,
    manaRegen: 3.8,
    strikeName: "Fireball",
    strikeCd: 1.4,
    skills: [
      { id: "cauterize", name: "Cauterize", mana: 22 },
      { id: "inferno", name: "Inferno", cd: 8 },
      { id: "nova", name: "Frost Nova", mana: NOVA.mana, cd: NOVA.cd, cdMin: NOVA.cdMin },
    ],
  },
  ranger: {
    id: "ranger",
    name: "Ranger",
    tag: "Bow and wolf",
    blurb: "Ranged burst. Your wolf holds the road — until it falls.",
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
    range: RANGE.ranger,
    mana: 22,
    maxMana: 80,
    manaRegen: 2.6,
    strikeName: "Aimed Shot",
    strikeCd: 1.4,
    skills: [
      { id: "dress", name: "Field Dress", mana: 22 },
      { id: "volley", name: "Volley", cd: 7 },
      { id: "sic", name: "Sic 'em", cd: 12 },
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
    gold: 12,
    magic: 2,
    color: "#7a8a4a",
  },
  shield: {
    name: "Shield",
    sprite: "shield",
    hp: 46,
    dmg: 4,
    armor: 5.5,
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
    dmg: 8,
    armor: 0,
    speed: 95,
    atkRate: 1.05,
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
    dmg: 11,
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
    heal: 6,
    healRate: 3.7,
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
    dmg: 12,
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
    heal: 7,
    healRate: 3.4,
    healRange: 180,
    projectile: "bolt",
    projSpeed: 260,
    atkRange: 380,
  },
};

const BOSS_ORDER = ["butcher", "ironhide", "skycleaver", "stormcaller", "sunfallen"];

function goldCost(base, growth, lv, first) {
  if (first != null && lv === 0) return first;
  return Math.floor(base * Math.pow(growth, lv));
}

function bumpDmg(n) {
  return (hero) => {
    hero.dmg += n;
  };
}

function bumpSpeed(mult) {
  return (hero) => {
    hero.atkRate *= mult;
  };
}

function bumpVital(hp) {
  return (hero) => {
    hero.maxHp += hp;
    hero.hp = Math.min(hero.maxHp, hero.hp + hp);
  };
}

const RUN_UPGRADES = [
  {
    id: "w_iron",
    klass: "warrior",
    name: "Iron",
    desc: "+2 damage",
    icon: "⚔",
    unlockWave: 1,
    heirloom: true,
    cost: (lv) => goldCost(18, 1.38, lv, 8),
    apply: bumpDmg(2),
  },
  {
    id: "w_swift",
    klass: "warrior",
    name: "Swift",
    desc: "+8% attack speed",
    icon: "»",
    unlockWave: 1,
    cost: (lv) => goldCost(20, 1.4, lv, 8),
    apply: bumpSpeed(1.08),
  },
  {
    id: "w_vital",
    klass: "warrior",
    name: "Vitality",
    desc: "+25 max HP, heal 25",
    icon: "♥",
    unlockWave: 1,
    cost: (lv) => goldCost(22, 1.36, lv, 9),
    apply: bumpVital(25),
  },
  {
    id: "w_guard",
    klass: "warrior",
    name: "Guard",
    desc: "+1.5 armor",
    icon: "🛡",
    unlockWave: 5,
    cost: (lv) => goldCost(24, 1.4, lv),
    apply: (hero) => {
      hero.armor += 1.5;
    },
  },
  {
    id: "w_spoils",
    klass: "warrior",
    name: "Spoils",
    desc: "+12% gold from the fallen",
    icon: "●",
    unlockWave: 5,
    cost: (lv) => goldCost(25, 1.42, lv),
    apply: (hero) => {
      hero.goldFind += 0.12;
    },
  },
  {
    id: "w_leech",
    klass: "warrior",
    name: "Leech",
    desc: "+3% lifesteal",
    icon: "◈",
    unlockWave: 9,
    cost: (lv) => goldCost(28, 1.45, lv),
    apply: (hero) => {
      hero.leech += 0.03;
    },
  },
  {
    id: "w_cleave",
    klass: "warrior",
    name: "Cleave",
    desc: "+16% damage to the second melee target",
    icon: "🪓",
    unlockWave: 9,
    cost: (lv) => goldCost(30, 1.44, lv),
    apply: (hero) => {
      hero.cleaveBonus = (hero.cleaveBonus || 0) + 0.16;
    },
  },
  {
    id: "w_brace",
    klass: "warrior",
    name: "Brace",
    desc: "+2 armor",
    icon: "☗",
    unlockWave: 9,
    cost: (lv) => goldCost(32, 1.42, lv),
    apply: (hero) => {
      hero.armor += 2;
    },
  },
  {
    id: "w_sharpen",
    klass: "warrior",
    name: "Sharpen",
    desc: "+18% Power Strike damage",
    icon: "✸",
    unlockWave: 13,
    cost: (lv) => goldCost(36, 1.48, lv),
    apply: (hero) => {
      hero.strikeMult = (hero.strikeMult || 1) * 1.18;
    },
  },
  {
    id: "w_tempo",
    klass: "warrior",
    name: "Tempo",
    desc: "+8% attack speed",
    icon: "↯",
    unlockWave: 13,
    cost: (lv) => goldCost(34, 1.46, lv),
    apply: bumpSpeed(1.08),
  },
  {
    id: "w_rally",
    klass: "warrior",
    name: "Rally",
    desc: "−8% skill cooldowns",
    icon: "⚑",
    unlockWave: 13,
    cost: (lv) => goldCost(34, 1.46, lv),
    apply: (hero) => {
      hero.skillHaste = (hero.skillHaste || 0) + 0.08;
    },
  },
  {
    id: "w_champion",
    klass: "warrior",
    name: "Champion",
    desc: "+3 damage and +20 max HP",
    icon: "♛",
    unlockWave: 17,
    cost: (lv) => goldCost(40, 1.5, lv),
    apply: (hero) => {
      hero.dmg += 3;
      hero.maxHp += 20;
      hero.hp = Math.min(hero.maxHp, hero.hp + 20);
    },
  },
  {
    id: "w_rend",
    klass: "warrior",
    name: "Rend",
    desc: "+4% lifesteal and +1.2 armor",
    icon: "☣",
    unlockWave: 17,
    cost: (lv) => goldCost(38, 1.48, lv),
    apply: (hero) => {
      hero.leech += 0.04;
      hero.armor += 1.2;
    },
  },

  {
    id: "m_ember",
    klass: "mage",
    name: "Ember",
    desc: "+2 damage",
    icon: "✶",
    unlockWave: 1,
    heirloom: true,
    cost: (lv) => goldCost(18, 1.38, lv, 8),
    apply: bumpDmg(2),
  },
  {
    id: "m_cadence",
    klass: "mage",
    name: "Cadence",
    desc: "+8% cast speed",
    icon: "»",
    unlockWave: 1,
    cost: (lv) => goldCost(20, 1.4, lv, 8),
    apply: bumpSpeed(1.08),
  },
  {
    id: "m_ward",
    klass: "mage",
    name: "Ward",
    desc: "+25 max HP, heal 25",
    icon: "♥",
    unlockWave: 1,
    cost: (lv) => goldCost(22, 1.36, lv, 9),
    apply: bumpVital(25),
  },
  {
    id: "m_well",
    klass: "mage",
    name: "Well",
    desc: "+10 max mana and +0.5 mana regen",
    icon: "◉",
    unlockWave: 5,
    cost: (lv) => goldCost(24, 1.4, lv),
    apply: (hero) => {
      hero.maxMana += 10;
      hero.mana = Math.min(hero.maxMana, hero.mana + 8);
      hero.manaRegen += 0.5;
    },
  },
  {
    id: "m_tithe",
    klass: "mage",
    name: "Tithe",
    desc: "+12% gold from the fallen",
    icon: "●",
    unlockWave: 5,
    cost: (lv) => goldCost(25, 1.42, lv),
    apply: (hero) => {
      hero.goldFind += 0.12;
    },
  },
  {
    id: "m_reach",
    klass: "mage",
    name: "Long Cast",
    desc: "+24 bolt range on the road (hits farther campers)",
    icon: "↦",
    unlockWave: 9,
    cost: (lv) => goldCost(32, 1.42, lv),
    apply: (hero) => {
      hero.reach += 24;
      hero.range += 24;
    },
  },
  {
    id: "m_cinder",
    klass: "mage",
    name: "Cinder",
    desc: "Hits apply a short burn",
    icon: "▴",
    unlockWave: 9,
    cost: (lv) => goldCost(30, 1.45, lv),
    apply: (hero) => {
      hero.cinder = (hero.cinder || 0) + 1;
    },
  },
  {
    id: "m_focus",
    klass: "mage",
    name: "Focus",
    desc: "+14 max mana and +6 starting mana",
    icon: "✧",
    unlockWave: 9,
    cost: (lv) => goldCost(28, 1.44, lv),
    apply: (hero) => {
      hero.maxMana += 14;
      hero.mana = Math.min(hero.maxMana, hero.mana + 6);
    },
  },
  {
    id: "m_pyre",
    klass: "mage",
    name: "Pyre",
    desc: "+18% Fireball damage",
    icon: "✸",
    unlockWave: 13,
    cost: (lv) => goldCost(36, 1.48, lv),
    apply: (hero) => {
      hero.strikeMult = (hero.strikeMult || 1) * 1.18;
    },
  },
  {
    id: "m_tempest",
    klass: "mage",
    name: "Tempest",
    desc: "−8% skill cooldowns",
    icon: "↯",
    unlockWave: 13,
    cost: (lv) => goldCost(34, 1.46, lv),
    apply: (hero) => {
      hero.skillHaste = (hero.skillHaste || 0) + 0.08;
    },
  },
  {
    id: "m_kindle",
    klass: "mage",
    name: "Kindle",
    desc: "Autos and Fireball burns last longer and hit harder",
    icon: "♨",
    unlockWave: 13,
    cost: (lv) => goldCost(36, 1.48, lv),
    apply: (hero) => {
      hero.burnAmp = (hero.burnAmp || 0) + 0.22;
    },
  },
  {
    id: "m_echo",
    klass: "mage",
    name: "Echo",
    desc: "12% chance to repeat a firebolt",
    icon: "⟳",
    unlockWave: 17,
    cost: (lv) => goldCost(40, 1.5, lv),
    apply: (hero) => {
      hero.echo = (hero.echo || 0) + 0.12;
    },
  },
  {
    id: "m_inferno",
    klass: "mage",
    name: "Infernal",
    desc: "+22% Inferno pulse damage",
    icon: "♨",
    unlockWave: 17,
    cost: (lv) => goldCost(38, 1.48, lv),
    apply: (hero) => {
      hero.infernoMult = (hero.infernoMult || 1) * 1.22;
    },
  },

  {
    id: "r_bodkin",
    klass: "ranger",
    name: "Bodkin",
    desc: "+2 damage",
    icon: "⚔",
    unlockWave: 1,
    heirloom: true,
    cost: (lv) => goldCost(18, 1.38, lv, 8),
    apply: bumpDmg(2),
  },
  {
    id: "r_swift",
    klass: "ranger",
    name: "Swift",
    desc: "+8% attack speed",
    icon: "»",
    unlockWave: 1,
    cost: (lv) => goldCost(20, 1.4, lv, 8),
    apply: bumpSpeed(1.08),
  },
  {
    id: "r_vital",
    klass: "ranger",
    name: "Vitality",
    desc: "+25 max HP, heal 25",
    icon: "♥",
    unlockWave: 1,
    cost: (lv) => goldCost(22, 1.36, lv, 9),
    apply: bumpVital(25),
  },
  {
    id: "r_spoils",
    klass: "ranger",
    name: "Spoils",
    desc: "+12% gold from the fallen",
    icon: "●",
    unlockWave: 5,
    cost: (lv) => goldCost(25, 1.42, lv),
    apply: (hero) => {
      hero.goldFind += 0.12;
    },
  },
  {
    id: "r_stride",
    klass: "ranger",
    name: "Stride",
    desc: "Wolf +18% move speed, you +12 on-road shot range",
    icon: "⇢",
    unlockWave: 5,
    cost: (lv) => goldCost(24, 1.4, lv),
    apply: (hero) => {
      hero.wolfStride = (hero.wolfStride || 0) + 0.18;
      hero.reach += 12;
      hero.range += 12;
    },
  },
  {
    id: "r_edge",
    klass: "ranger",
    name: "Edge",
    desc: "+6% crit chance",
    icon: "✦",
    unlockWave: 9,
    cost: (lv) => goldCost(30, 1.45, lv),
    apply: (hero) => {
      hero.crit += 0.06;
    },
  },
  {
    id: "r_reach",
    klass: "ranger",
    name: "Longshot",
    desc: "+24 shot range on the road (hits farther campers)",
    icon: "↦",
    unlockWave: 9,
    cost: (lv) => goldCost(32, 1.42, lv),
    apply: (hero) => {
      hero.reach += 24;
      hero.range += 24;
    },
  },
  {
    id: "r_quiver",
    klass: "ranger",
    name: "Quiver",
    desc: "+8% attack speed",
    icon: "➳",
    unlockWave: 9,
    cost: (lv) => goldCost(28, 1.44, lv),
    apply: bumpSpeed(1.08),
  },
  {
    id: "r_sharpen",
    klass: "ranger",
    name: "Sharpen",
    desc: "+18% Aimed Shot damage",
    icon: "✸",
    unlockWave: 13,
    cost: (lv) => goldCost(36, 1.48, lv),
    apply: (hero) => {
      hero.strikeMult = (hero.strikeMult || 1) * 1.18;
    },
  },
  {
    id: "r_echo",
    klass: "ranger",
    name: "Echo",
    desc: "12% chance to repeat a shot",
    icon: "⟳",
    unlockWave: 13,
    cost: (lv) => goldCost(36, 1.48, lv),
    apply: (hero) => {
      hero.echo = (hero.echo || 0) + 0.12;
    },
  },
  {
    id: "r_track",
    klass: "ranger",
    name: "Track",
    desc: "+5% crit and +12 on-road shot range",
    icon: "◎",
    unlockWave: 13,
    cost: (lv) => goldCost(34, 1.46, lv),
    apply: (hero) => {
      hero.crit += 0.05;
      hero.reach += 12;
      hero.range += 12;
    },
  },
  {
    id: "r_pack",
    klass: "ranger",
    name: "Pack",
    desc: "Wolf +22% HP and +2 damage",
    icon: "🐺",
    unlockWave: 17,
    cost: (lv) => goldCost(38, 1.48, lv),
    apply: (hero) => {
      hero.pack = (hero.pack || 0) + 1;
    },
  },
  {
    id: "r_alpha",
    klass: "ranger",
    name: "Alpha",
    desc: "Wolf +1.4 armor and +0.8 regen",
    icon: "☽",
    unlockWave: 17,
    cost: (lv) => goldCost(40, 1.5, lv),
    apply: (hero) => {
      hero.wolfArmor = (hero.wolfArmor || 0) + 1.4;
      hero.wolfRegen = (hero.wolfRegen || 0) + 0.8;
    },
  },
];

function deepCost(depth, lv) {
  const base = [2, 4, 8, 12, 18, 26, 36, 50][depth] || 50;
  const step = [2, 3, 4, 5, 6, 8, 10, 12][depth] || 12;
  return base + lv * step;
}

function node(spec) {
  const depth = spec.root ? 0 : spec.row;
  return Object.assign(
    {
      max: 3,
      req: spec.root ? [] : spec.req || [],
      cost: spec.cost || ((lv) => deepCost(depth, lv)),
    },
    spec
  );
}

const PRESTIGE_TREES = {
  warrior: {
    id: "warrior",
    name: "Iron Pact",
    blurb: "One oath, then Shield, Blade, and Spoils. Each path forks after the old leaf.",
    branches: ["Shield", "Blade", "Spoils"],
    nodes: [
      node({
        id: "oath",
        name: "Oath",
        branch: "Root",
        col: 1,
        row: 0,
        root: true,
        max: 3,
        desc: "+18 starting HP and +1 damage each run",
        apply: (h, lv) => {
          h.maxHp += lv * 18;
          h.hp += lv * 18;
          h.dmg += lv;
          h.prestHp = (h.prestHp || 0) + lv * 18;
        },
      }),
      node({
        id: "hide",
        name: "Hide",
        branch: "Shield",
        col: 0,
        row: 1,
        req: ["oath"],
        desc: "+1.2 armor each run",
        apply: (h, lv) => {
          h.armor += lv * 1.2;
        },
      }),
      node({
        id: "secondwind",
        name: "Second Wind",
        branch: "Shield",
        col: 0,
        row: 2,
        max: 2,
        req: ["hide"],
        desc: "At 30% HP, heal 26% (charges = ranks)",
        apply: (h, lv) => {
          h.secondWind = lv;
        },
      }),
      node({
        id: "thorns",
        name: "Thorns",
        branch: "Shield",
        col: 0,
        row: 3,
        req: ["secondwind"],
        desc: "Reflect 10% of melee hits per rank",
        apply: (h, lv) => {
          h.thorns = lv;
        },
      }),
      node({
        id: "laststand",
        name: "Last Stand",
        branch: "Shield",
        col: 0,
        row: 4,
        max: 1,
        req: ["thorns"],
        desc: "Below 28% HP: +25% damage and +20% speed",
        apply: (h, lv) => {
          if (lv > 0) h.lastStand = true;
        },
      }),
      node({
        id: "bulwark",
        name: "Bulwark",
        branch: "Shield",
        col: 0,
        row: 5,
        fork: 0,
        req: ["laststand"],
        desc: "First 2 hits each wave deal 16% less per rank",
        apply: (h, lv) => {
          h.waveWard = lv;
        },
      }),
      node({
        id: "aegis",
        name: "Aegis",
        branch: "Shield",
        col: 0,
        row: 5,
        fork: 1,
        req: ["laststand"],
        desc: "Mend grants +1.4 armor for 3s per rank",
        apply: (h, lv) => {
          h.mendArmor = lv;
        },
      }),
      node({
        id: "fortress",
        name: "Fortress",
        branch: "Shield",
        col: 0,
        row: 6,
        req: ["bulwark"],
        desc: "Below 45% HP, +1.6 armor per rank",
        apply: (h, lv) => {
          h.lowHpArmor = lv;
        },
      }),
      node({
        id: "ironclad",
        name: "Ironclad",
        branch: "Shield",
        col: 0,
        row: 6,
        fork: 1,
        req: ["aegis"],
        desc: "After Mend, the next 3 hits deal 12% less per rank",
        apply: (h, lv) => {
          h.mendDR = lv;
        },
      }),
      node({
        id: "unbreakable",
        name: "Unbreakable",
        branch: "Shield",
        col: 0,
        row: 7,
        max: 1,
        req: ["fortress"],
        desc: "Once per run, a killing blow leaves you at 12% HP",
        apply: (h, lv) => {
          if (lv > 0) h.cheatDeath = true;
        },
      }),
      node({
        id: "bastion",
        name: "Bastion",
        branch: "Shield",
        col: 0,
        row: 7,
        fork: 1,
        max: 1,
        req: ["ironclad"],
        desc: "Mend heals an extra 10% of max HP",
        apply: (h, lv) => {
          if (lv > 0) h.mendAmp = 0.1;
        },
      }),
      node({
        id: "tempo",
        name: "Tempo",
        branch: "Blade",
        col: 1,
        row: 1,
        req: ["oath"],
        desc: "+5% attack speed each run",
        apply: (h, lv) => {
          h.atkRate *= Math.pow(1.05, lv);
        },
      }),
      node({
        id: "execute",
        name: "Execute",
        branch: "Blade",
        col: 1,
        row: 2,
        req: ["tempo"],
        desc: "+18% damage to foes below 40% HP",
        apply: (h, lv) => {
          h.execute = lv;
        },
      }),
      node({
        id: "overkill",
        name: "Overkill",
        branch: "Blade",
        col: 1,
        row: 3,
        max: 2,
        req: ["execute"],
        desc: "Wasted damage splashes to the nearest foe",
        apply: (h, lv) => {
          h.overkill = lv;
        },
      }),
      node({
        id: "bloodlust",
        name: "Bloodlust",
        branch: "Blade",
        col: 1,
        row: 4,
        max: 2,
        req: ["overkill"],
        desc: "Kills grant Rage (1.6s per rank)",
        apply: (h, lv) => {
          h.bloodlust = lv;
        },
      }),
      node({
        id: "cleaveform",
        name: "Cleave Form",
        branch: "Blade",
        col: 1,
        row: 5,
        fork: 0,
        req: ["bloodlust"],
        desc: "Second-target cleave +22% per rank",
        apply: (h, lv) => {
          h.cleaveBonus = (h.cleaveBonus || 0) + lv * 0.22;
        },
      }),
      node({
        id: "deepwounds",
        name: "Deep Wounds",
        branch: "Blade",
        col: 1,
        row: 5,
        fork: 1,
        req: ["bloodlust"],
        desc: "Autos apply a short bleed (stronger per rank)",
        apply: (h, lv) => {
          h.bleed = lv;
        },
      }),
      node({
        id: "whirlmaster",
        name: "Whirl Master",
        branch: "Blade",
        col: 1,
        row: 6,
        req: ["cleaveform"],
        desc: "Whirlwind +1 hit per rank",
        apply: (h, lv) => {
          h.whirlExtra = lv;
        },
      }),
      node({
        id: "heavyhand",
        name: "Heavy Hand",
        branch: "Blade",
        col: 1,
        row: 6,
        fork: 1,
        req: ["deepwounds"],
        desc: "Power Strike +12% damage and +0.18s stun per rank",
        apply: (h, lv) => {
          h.strikeMult = (h.strikeMult || 1) * Math.pow(1.12, lv);
          h.strikeStun = (h.strikeStun || 0) + lv * 0.18;
        },
      }),
      node({
        id: "warmaster",
        name: "War Master",
        branch: "Blade",
        col: 1,
        row: 7,
        max: 1,
        req: ["whirlmaster"],
        desc: "Kills refund 0.45s of Whirlwind cooldown",
        apply: (h, lv) => {
          if (lv > 0) h.whirlRefund = 0.45;
        },
      }),
      node({
        id: "reaper",
        name: "Reaper",
        branch: "Blade",
        col: 1,
        row: 7,
        fork: 1,
        max: 1,
        req: ["heavyhand"],
        desc: "Execute starts at 52% HP instead of 40%",
        apply: (h, lv) => {
          if (lv > 0) h.executeHp = 0.52;
        },
      }),
      node({
        id: "purse",
        name: "Purse",
        branch: "Spoils",
        col: 2,
        row: 1,
        req: ["oath"],
        desc: "+18 starting gold each run",
        apply: (h, lv) => {
          h.startGold = (h.startGold || 0) + lv * 18;
        },
      }),
      node({
        id: "greed",
        name: "Greed",
        branch: "Spoils",
        col: 2,
        row: 2,
        req: ["purse"],
        desc: "+12% gold find each run",
        apply: (h, lv) => {
          h.goldFind += lv * 0.12;
        },
      }),
      node({
        id: "sanguine",
        name: "Sanguine",
        branch: "Spoils",
        col: 2,
        row: 3,
        req: ["greed"],
        desc: "+2% lifesteal each run",
        apply: (h, lv) => {
          h.leech += lv * 0.02;
        },
      }),
      node({
        id: "heirloom",
        name: "Heirloom",
        branch: "Spoils",
        col: 2,
        row: 4,
        max: 1,
        req: ["sanguine"],
        desc: "Each run starts with Iron I already forged",
        apply: (h, lv) => {
          if (lv > 0) h.heirloom = true;
        },
      }),
      node({
        id: "warchest",
        name: "War Chest",
        branch: "Spoils",
        col: 2,
        row: 5,
        fork: 0,
        req: ["heirloom"],
        desc: "Bosses and elites drop +22% gold per rank",
        apply: (h, lv) => {
          h.eliteGold = lv;
        },
      }),
      node({
        id: "scavenger",
        name: "Scavenger",
        branch: "Spoils",
        col: 2,
        row: 5,
        fork: 1,
        req: ["heirloom"],
        desc: "Heart drops +8% more often per rank",
        apply: (h, lv) => {
          h.heartFind = (h.heartFind || 0) + lv * 0.08;
        },
      }),
      node({
        id: "quartermaster",
        name: "Quartermaster",
        branch: "Spoils",
        col: 2,
        row: 6,
        req: ["warchest"],
        desc: "+14 starting gold and +6% gold find per rank",
        apply: (h, lv) => {
          h.startGold = (h.startGold || 0) + lv * 14;
          h.goldFind += lv * 0.06;
        },
      }),
      node({
        id: "fieldmedic",
        name: "Field Medic",
        branch: "Spoils",
        col: 2,
        row: 6,
        fork: 1,
        req: ["scavenger"],
        desc: "Hearts heal +7% of max HP per rank",
        apply: (h, lv) => {
          h.heartAmp = (h.heartAmp || 0) + lv * 0.07;
        },
      }),
      node({
        id: "kingpin",
        name: "Kingpin",
        branch: "Spoils",
        col: 2,
        row: 7,
        max: 1,
        req: ["quartermaster"],
        desc: "Heirloom also starts the run with Swift I",
        apply: (h, lv) => {
          if (lv > 0) h.heirloomSwift = true;
        },
      }),
      node({
        id: "provisioner",
        name: "Provisioner",
        branch: "Spoils",
        col: 2,
        row: 7,
        fork: 1,
        max: 1,
        req: ["fieldmedic"],
        desc: "+1 Second Wind charge, or +10% max HP if you have none",
        apply: (h, lv) => {
          if (lv > 0) h.provisioner = true;
        },
      }),
    ],
  },
  mage: {
    id: "mage",
    name: "Ember Court",
    blurb: "Kindle the root, then Pyre, Frost, and Well. Each path forks after the old leaf.",
    branches: ["Pyre", "Frost", "Well"],
    nodes: [
      node({
        id: "kindle",
        name: "Kindle",
        branch: "Root",
        col: 1,
        row: 0,
        root: true,
        max: 3,
        desc: "+12 starting HP, +8 max mana, +0.35 mana regen",
        apply: (h, lv) => {
          h.maxHp += lv * 12;
          h.hp += lv * 12;
          h.maxMana += lv * 8;
          h.mana += lv * 5;
          h.manaRegen += lv * 0.35;
          h.prestHp = (h.prestHp || 0) + lv * 12;
        },
      }),
      node({
        id: "cinder",
        name: "Cinder",
        branch: "Pyre",
        col: 0,
        row: 1,
        req: ["kindle"],
        desc: "Hits apply a short burn (stronger per rank)",
        apply: (h, lv) => {
          h.cinder = lv;
        },
      }),
      node({
        id: "blaze",
        name: "Blaze",
        branch: "Pyre",
        col: 0,
        row: 2,
        req: ["cinder"],
        desc: "+18% burn damage and duration",
        apply: (h, lv) => {
          h.burnAmp = (h.burnAmp || 0) + lv * 0.18;
        },
      }),
      node({
        id: "overkill",
        name: "Overkill",
        branch: "Pyre",
        col: 0,
        row: 3,
        max: 2,
        req: ["blaze"],
        desc: "Wasted damage splashes to the nearest foe",
        apply: (h, lv) => {
          h.overkill = lv;
        },
      }),
      node({
        id: "wildfire",
        name: "Wildfire",
        branch: "Pyre",
        col: 0,
        row: 4,
        max: 1,
        req: ["overkill"],
        desc: "Kills spread a short burn to the nearest foe",
        apply: (h, lv) => {
          h.wildfire = lv;
        },
      }),
      node({
        id: "conflagrate",
        name: "Conflagrate",
        branch: "Pyre",
        col: 0,
        row: 5,
        fork: 0,
        req: ["wildfire"],
        desc: "Burn DPS +16% per rank",
        apply: (h, lv) => {
          h.burnAmp = (h.burnAmp || 0) + lv * 0.16;
        },
      }),
      node({
        id: "immolate",
        name: "Immolate",
        branch: "Pyre",
        col: 0,
        row: 5,
        fork: 1,
        req: ["wildfire"],
        desc: "Inferno +1 pulse per rank",
        apply: (h, lv) => {
          h.infernoExtra = lv;
        },
      }),
      node({
        id: "kindling",
        name: "Kindling",
        branch: "Pyre",
        col: 0,
        row: 6,
        req: ["conflagrate"],
        desc: "Killing a burning foe restores 4 mana per rank",
        apply: (h, lv) => {
          h.burnMana = lv;
        },
      }),
      node({
        id: "widerfire",
        name: "Wider Fire",
        branch: "Pyre",
        col: 0,
        row: 6,
        fork: 1,
        req: ["immolate"],
        desc: "Inferno reaches +36 farther per rank (still on the road)",
        apply: (h, lv) => {
          h.infernoReach = (h.infernoReach || 0) + lv * 36;
        },
      }),
      node({
        id: "phoenix",
        name: "Phoenix",
        branch: "Pyre",
        col: 0,
        row: 7,
        max: 1,
        req: ["kindling"],
        desc: "Once per run, a killing blow leaves you at 18% HP and ignites nearby foes",
        apply: (h, lv) => {
          if (lv > 0) h.phoenix = true;
        },
      }),
      node({
        id: "livingbomb",
        name: "Living Bomb",
        branch: "Pyre",
        col: 0,
        row: 7,
        fork: 1,
        max: 1,
        req: ["widerfire"],
        desc: "Wildfire also deals a burst equal to 30% of your damage",
        apply: (h, lv) => {
          if (lv > 0) h.livingBomb = true;
        },
      }),
      node({
        id: "chill",
        name: "Chill",
        branch: "Frost",
        col: 1,
        row: 1,
        req: ["kindle"],
        desc: "Hits slow foes (1.1s per rank)",
        apply: (h, lv) => {
          h.chill = lv;
        },
      }),
      node({
        id: "novadepth",
        name: "Nova Depth",
        branch: "Frost",
        col: 1,
        row: 2,
        req: ["chill"],
        desc: "Frost Nova +14 range and +0.12s freeze",
        apply: (h, lv) => {
          h.novaReach = (h.novaReach || 0) + lv * 14;
          h.novaHold = (h.novaHold || 0) + lv * 0.12;
        },
      }),
      node({
        id: "shatter",
        name: "Shatter",
        branch: "Frost",
        col: 1,
        row: 3,
        max: 2,
        req: ["novadepth"],
        desc: "+14% damage to frozen foes",
        apply: (h, lv) => {
          h.shatter = lv;
        },
      }),
      node({
        id: "permafrost",
        name: "Permafrost",
        branch: "Frost",
        col: 1,
        row: 4,
        max: 1,
        req: ["shatter"],
        desc: "Frost Nova +0.28s freeze and +1 Shatter",
        apply: (h, lv) => {
          if (lv > 0) {
            h.novaHold = (h.novaHold || 0) + 0.28;
            h.shatter = (h.shatter || 0) + 1;
          }
        },
      }),
      node({
        id: "frostbite",
        name: "Frostbite",
        branch: "Frost",
        col: 1,
        row: 5,
        fork: 0,
        req: ["permafrost"],
        desc: "Slowed foes take +8% damage per rank",
        apply: (h, lv) => {
          h.frostbite = lv;
        },
      }),
      node({
        id: "icelance",
        name: "Ice Lance",
        branch: "Frost",
        col: 1,
        row: 5,
        fork: 1,
        req: ["permafrost"],
        desc: "After Nova, the next 2 hits deal +28% per rank",
        apply: (h, lv) => {
          h.iceLance = lv;
        },
      }),
      node({
        id: "glacial",
        name: "Glacial",
        branch: "Frost",
        col: 1,
        row: 6,
        req: ["frostbite"],
        desc: "Chill lasts +0.35s per rank",
        apply: (h, lv) => {
          h.chillHold = (h.chillHold || 0) + lv * 0.35;
        },
      }),
      node({
        id: "coldsnap",
        name: "Cold Snap",
        branch: "Frost",
        col: 1,
        row: 6,
        fork: 1,
        req: ["icelance"],
        desc: "Nova refunds 8 mana per rank (cooldown floor still holds)",
        apply: (h, lv) => {
          h.novaMana = lv;
        },
      }),
      node({
        id: "winterheart",
        name: "Winterheart",
        branch: "Frost",
        col: 1,
        row: 7,
        max: 1,
        req: ["glacial"],
        desc: "Shatter also applies to slowed foes at half strength",
        apply: (h, lv) => {
          if (lv > 0) h.slowShatter = true;
        },
      }),
      node({
        id: "rime",
        name: "Rime",
        branch: "Frost",
        col: 1,
        row: 7,
        fork: 1,
        max: 1,
        req: ["coldsnap"],
        desc: "Killing a frozen foe restores 10 mana",
        apply: (h, lv) => {
          if (lv > 0) h.rime = true;
        },
      }),
      node({
        id: "spark",
        name: "Spark",
        branch: "Well",
        col: 2,
        row: 1,
        req: ["kindle"],
        desc: "+10 max mana and +0.7 mana regen",
        apply: (h, lv) => {
          h.mana += lv * 5;
          h.maxMana += lv * 10;
          h.manaRegen += lv * 0.7;
        },
      }),
      node({
        id: "tempest",
        name: "Tempest",
        branch: "Well",
        col: 2,
        row: 2,
        req: ["spark"],
        desc: "−6% skill cooldowns per rank",
        apply: (h, lv) => {
          h.skillHaste = (h.skillHaste || 0) + lv * 0.06;
        },
      }),
      node({
        id: "fate",
        name: "Fate",
        branch: "Well",
        col: 2,
        row: 3,
        req: ["tempest"],
        desc: "+18% glory on death",
        apply: (h, lv) => {
          h.gloryBonus = lv;
        },
      }),
      node({
        id: "phylactery",
        name: "Phylactery",
        branch: "Well",
        col: 2,
        row: 4,
        max: 1,
        req: ["fate"],
        desc: "Each run starts with Ember I already lit",
        apply: (h, lv) => {
          if (lv > 0) h.heirloom = true;
        },
      }),
      node({
        id: "battery",
        name: "Battery",
        branch: "Well",
        col: 2,
        row: 5,
        fork: 0,
        req: ["phylactery"],
        desc: "+12 max mana and kills restore 2 mana per rank",
        apply: (h, lv) => {
          h.maxMana += lv * 12;
          h.mana += lv * 8;
          h.killMana = (h.killMana || 0) + lv * 2;
        },
      }),
      node({
        id: "evocation",
        name: "Evocation",
        branch: "Well",
        col: 2,
        row: 5,
        fork: 1,
        req: ["phylactery"],
        desc: "Cauterize restores 10 mana per rank",
        apply: (h, lv) => {
          h.cautMana = lv;
        },
      }),
      node({
        id: "sage",
        name: "Sage",
        branch: "Well",
        col: 2,
        row: 6,
        req: ["battery"],
        desc: "+0.4 mana regen and +8% glory per rank",
        apply: (h, lv) => {
          h.manaRegen += lv * 0.4;
          h.gloryBonus = (h.gloryBonus || 0) + lv;
        },
      }),
      node({
        id: "spellweave",
        name: "Spellweave",
        branch: "Well",
        col: 2,
        row: 6,
        fork: 1,
        req: ["evocation"],
        desc: "12% chance an Inferno pulse repeats (not Nova)",
        apply: (h, lv) => {
          h.infernoEcho = (h.infernoEcho || 0) + lv * 0.12;
        },
      }),
      node({
        id: "archon",
        name: "Archon",
        branch: "Well",
        col: 2,
        row: 7,
        max: 1,
        req: ["sage"],
        desc: "Start each run with 24 extra mana",
        apply: (h, lv) => {
          if (lv > 0) h.mana += 24;
        },
      }),
      node({
        id: "ritualist",
        name: "Ritualist",
        branch: "Well",
        col: 2,
        row: 7,
        fork: 1,
        max: 1,
        req: ["spellweave"],
        desc: "Cauterize ward lasts +1.1s",
        apply: (h, lv) => {
          if (lv > 0) h.cautWardExtra = 1.1;
        },
      }),
    ],
  },
  ranger: {
    id: "ranger",
    name: "Wild Hunt",
    blurb: "Mark the trail, then Bow, Wolf, and Stride. Each path forks after the old leaf.",
    branches: ["Bow", "Wolf", "Stride"],
    nodes: [
      node({
        id: "trail",
        name: "Trail",
        branch: "Root",
        col: 1,
        row: 0,
        root: true,
        max: 3,
        desc: "+12 starting HP, +1 damage, wolf +12 HP",
        apply: (h, lv) => {
          h.maxHp += lv * 12;
          h.hp += lv * 12;
          h.dmg += lv;
          h.wolfHp = (h.wolfHp || 0) + lv * 12;
          h.prestHp = (h.prestHp || 0) + lv * 12;
        },
      }),
      node({
        id: "edge",
        name: "Edge",
        branch: "Bow",
        col: 0,
        row: 1,
        req: ["trail"],
        desc: "+4% crit chance each run",
        apply: (h, lv) => {
          h.crit += lv * 0.04;
        },
      }),
      node({
        id: "reach",
        name: "Longshot",
        branch: "Bow",
        col: 0,
        row: 2,
        req: ["edge"],
        desc: "+16 on-road shot range each run",
        apply: (h, lv) => {
          h.reach += lv * 16;
          h.range += lv * 16;
        },
      }),
      node({
        id: "echo",
        name: "Echo",
        branch: "Bow",
        col: 0,
        row: 3,
        max: 2,
        req: ["reach"],
        desc: "+12% chance to repeat an auto per rank",
        apply: (h, lv) => {
          h.echo = (h.echo || 0) + lv * 0.12;
        },
      }),
      node({
        id: "marksman",
        name: "Marksman",
        branch: "Bow",
        col: 0,
        row: 4,
        max: 1,
        req: ["echo"],
        desc: "+18% Aimed Shot damage and +1 pierce",
        apply: (h, lv) => {
          if (lv > 0) {
            h.strikeMult = (h.strikeMult || 1) * 1.18;
            h.strikePierce = (h.strikePierce || 0) + 1;
          }
        },
      }),
      node({
        id: "multishot",
        name: "Multishot",
        branch: "Bow",
        col: 0,
        row: 5,
        fork: 0,
        req: ["marksman"],
        desc: "Autos also hit a second foe for 36% per rank",
        apply: (h, lv) => {
          h.multishot = lv;
        },
      }),
      node({
        id: "headhunter",
        name: "Headhunter",
        branch: "Bow",
        col: 0,
        row: 5,
        fork: 1,
        req: ["marksman"],
        desc: "Critical hits deal +22% extra per rank",
        apply: (h, lv) => {
          h.critDmg = (h.critDmg || 0) + lv * 0.22;
        },
      }),
      node({
        id: "aimedreach",
        name: "True Flight",
        branch: "Bow",
        col: 0,
        row: 6,
        req: ["multishot"],
        desc: "Aimed Shot +1 pierce and uses your full on-road range",
        apply: (h, lv) => {
          h.strikePierce = (h.strikePierce || 0) + lv;
        },
      }),
      node({
        id: "volleyplus",
        name: "Rain",
        branch: "Bow",
        col: 0,
        row: 6,
        fork: 1,
        req: ["headhunter"],
        desc: "Volley +1 arrow per rank",
        apply: (h, lv) => {
          h.volleyExtra = lv;
        },
      }),
      node({
        id: "deadeye",
        name: "Deadeye",
        branch: "Bow",
        col: 0,
        row: 7,
        max: 1,
        req: ["aimedreach"],
        desc: "Foes farther than 200 take +14% damage",
        apply: (h, lv) => {
          if (lv > 0) h.deadeye = true;
        },
      }),
      node({
        id: "sharpshooter",
        name: "Sharpshooter",
        branch: "Bow",
        col: 0,
        row: 7,
        fork: 1,
        max: 1,
        req: ["volleyplus"],
        desc: "Echo can also repeat Aimed Shot",
        apply: (h, lv) => {
          if (lv > 0) h.strikeEcho = true;
        },
      }),
      node({
        id: "pack",
        name: "Pack",
        branch: "Wolf",
        col: 1,
        row: 1,
        req: ["trail"],
        desc: "Wolf +22% HP and +2 damage per rank",
        apply: (h, lv) => {
          h.pack = lv;
        },
      }),
      node({
        id: "pelt",
        name: "Pelt",
        branch: "Wolf",
        col: 1,
        row: 2,
        req: ["pack"],
        desc: "Wolf +1.1 armor each run",
        apply: (h, lv) => {
          h.wolfArmor = (h.wolfArmor || 0) + lv * 1.1;
        },
      }),
      node({
        id: "sicmaster",
        name: "Sic Master",
        branch: "Wolf",
        col: 1,
        row: 3,
        max: 2,
        req: ["pelt"],
        desc: "Sic 'em revive returns the wolf with +10% HP per rank",
        apply: (h, lv) => {
          h.sicRevive = (h.sicRevive || 0) + lv * 0.1;
        },
      }),
      node({
        id: "alpha",
        name: "Alpha",
        branch: "Wolf",
        col: 1,
        row: 4,
        max: 1,
        req: ["sicmaster"],
        desc: "Wolf +18% HP and +1.2 regen",
        apply: (h, lv) => {
          if (lv > 0) {
            h.pack = (h.pack || 0) + 1;
            h.wolfRegen = (h.wolfRegen || 0) + 1.2;
          }
        },
      }),
      node({
        id: "howl",
        name: "Howl",
        branch: "Wolf",
        col: 1,
        row: 5,
        fork: 0,
        req: ["alpha"],
        desc: "Each new wave, the wolf taunts for 1.1s per rank",
        apply: (h, lv) => {
          h.howl = lv;
        },
      }),
      node({
        id: "maul",
        name: "Maul",
        branch: "Wolf",
        col: 1,
        row: 5,
        fork: 1,
        req: ["alpha"],
        desc: "Wolf lifesteal +4% per rank",
        apply: (h, lv) => {
          h.wolfLeech = (h.wolfLeech || 0) + lv * 0.04;
        },
      }),
      node({
        id: "packbond",
        name: "Pack Bond",
        branch: "Wolf",
        col: 1,
        row: 6,
        req: ["howl"],
        desc: "You heal 10% of the wolf's damage per rank",
        apply: (h, lv) => {
          h.packBond = lv;
        },
      }),
      node({
        id: "dire",
        name: "Dire",
        branch: "Wolf",
        col: 1,
        row: 6,
        fork: 1,
        req: ["maul"],
        desc: "Wolf +12% HP and +1.5 damage per rank",
        apply: (h, lv) => {
          h.dire = lv;
        },
      }),
      node({
        id: "huntsman",
        name: "Huntsman",
        branch: "Wolf",
        col: 1,
        row: 7,
        max: 1,
        req: ["packbond"],
        desc: "Sic 'em revive also heals you for 14% of max HP",
        apply: (h, lv) => {
          if (lv > 0) h.sicHeal = 0.14;
        },
      }),
      node({
        id: "alphaaura",
        name: "Alpha Aura",
        branch: "Wolf",
        col: 1,
        row: 7,
        fork: 1,
        max: 1,
        req: ["dire"],
        desc: "While the wolf lives, incoming melee is reduced 10%",
        apply: (h, lv) => {
          if (lv > 0) h.alphaAura = true;
        },
      }),
      node({
        id: "stride",
        name: "Stride",
        branch: "Stride",
        col: 2,
        row: 1,
        req: ["trail"],
        desc: "+5% attack speed and wolf +12% move speed",
        apply: (h, lv) => {
          h.atkRate *= Math.pow(1.05, lv);
          h.wolfStride = (h.wolfStride || 0) + lv * 0.12;
        },
      }),
      node({
        id: "greed",
        name: "Trophy",
        branch: "Stride",
        col: 2,
        row: 2,
        req: ["stride"],
        desc: "+12% gold find each run",
        apply: (h, lv) => {
          h.goldFind += lv * 0.12;
        },
      }),
      node({
        id: "secondwind",
        name: "Fieldcraft",
        branch: "Stride",
        col: 2,
        row: 3,
        max: 2,
        req: ["greed"],
        desc: "At 30% HP, heal 26% (charges = ranks)",
        apply: (h, lv) => {
          h.secondWind = lv;
        },
      }),
      node({
        id: "heirloom",
        name: "Keepsake",
        branch: "Stride",
        col: 2,
        row: 4,
        max: 1,
        req: ["secondwind"],
        desc: "Each run starts with Bodkin I already nocked",
        apply: (h, lv) => {
          if (lv > 0) h.heirloom = true;
        },
      }),
      node({
        id: "camouflage",
        name: "Camouflage",
        branch: "Stride",
        col: 2,
        row: 5,
        fork: 0,
        req: ["heirloom"],
        desc: "First 2.2s of each wave you take 14% less per rank",
        apply: (h, lv) => {
          h.camo = lv;
        },
      }),
      node({
        id: "looter",
        name: "Looter",
        branch: "Stride",
        col: 2,
        row: 5,
        fork: 1,
        req: ["heirloom"],
        desc: "+8% gold find and +6 starting gold per rank",
        apply: (h, lv) => {
          h.goldFind += lv * 0.08;
          h.startGold = (h.startGold || 0) + lv * 6;
        },
      }),
      node({
        id: "trailward",
        name: "Trail Ward",
        branch: "Stride",
        col: 2,
        row: 6,
        req: ["camouflage"],
        desc: "Field Dress grants 1.6s of 18% damage reduction per rank",
        apply: (h, lv) => {
          h.dressWard = lv;
        },
      }),
      node({
        id: "swiftwind",
        name: "Swift Wind",
        branch: "Stride",
        col: 2,
        row: 6,
        fork: 1,
        req: ["looter"],
        desc: "+4% attack speed and wolf +8% move speed per rank",
        apply: (h, lv) => {
          h.atkRate *= Math.pow(1.04, lv);
          h.wolfStride = (h.wolfStride || 0) + lv * 0.08;
        },
      }),
      node({
        id: "veteran",
        name: "Veteran",
        branch: "Stride",
        col: 2,
        row: 7,
        max: 1,
        req: ["trailward"],
        desc: "+1 Fieldcraft charge",
        apply: (h, lv) => {
          if (lv > 0) h.secondWind = (h.secondWind || 0) + 1;
        },
      }),
      node({
        id: "pathfinder",
        name: "Pathfinder",
        branch: "Stride",
        col: 2,
        row: 7,
        fork: 1,
        max: 1,
        req: ["swiftwind"],
        desc: "Keepsake also starts the run with Swift I",
        apply: (h, lv) => {
          if (lv > 0) h.heirloomSwift = true;
        },
      }),
    ],
  },
};

const LEGACY_PRESTIGE = [
  { id: "blood", max: 8, cost: (lv) => 1 + lv * 2 },
  { id: "might", max: 8, cost: (lv) => 1 + lv * 2 },
  { id: "purse", max: 8, cost: (lv) => 1 + lv * 2 },
  { id: "hide", max: 5, cost: (lv) => 1 + lv * 2 },
  { id: "tempo", max: 5, cost: (lv) => 1 + lv * 2 },
  { id: "greed", max: 5, cost: (lv) => 1 + lv * 2 },
  { id: "secondwind", max: 2, cost: (lv) => 3 + lv * 3 },
  { id: "execute", max: 3, cost: (lv) => 3 + lv * 3 },
  { id: "spark", max: 5, cost: (lv) => 2 + lv * 2 },
  { id: "thorns", max: 3, cost: (lv) => 5 + lv * 3 },
  { id: "overkill", max: 2, cost: (lv) => 5 + lv * 3 },
  { id: "fate", max: 5, cost: (lv) => 2 + lv * 3 },
  { id: "laststand", max: 1, cost: (lv) => 8 + lv * 4 },
  { id: "bloodlust", max: 2, cost: (lv) => 6 + lv * 4 },
  { id: "heirloom", max: 1, cost: (lv) => 7 + lv * 4 },
];

const SAVE_VERSION = 2;

function prestigeTree(klass) {
  return PRESTIGE_TREES[klass] || PRESTIGE_TREES.warrior;
}

function prestigeNodes(klass) {
  return prestigeTree(klass).nodes;
}

function prestigeRoot(klass) {
  return prestigeNodes(klass).find((n) => n.root);
}

function findPrestNode(klass, id) {
  return prestigeNodes(klass).find((n) => n.id === id);
}

function emptyTrees() {
  const out = {};
  for (const k of Object.keys(PRESTIGE_TREES)) {
    out[k] = Object.fromEntries(PRESTIGE_TREES[k].nodes.map((n) => [n.id, 0]));
  }
  return out;
}

function normalizeTrees(trees) {
  const out = emptyTrees();
  const src = trees && typeof trees === "object" && !Array.isArray(trees) ? trees : {};
  for (const k of Object.keys(out)) {
    const bag = src[k] && typeof src[k] === "object" ? src[k] : {};
    for (const n of PRESTIGE_TREES[k].nodes) {
      const rank = Math.floor(Number(bag[n.id]) || 0);
      out[k][n.id] = Math.max(0, Math.min(n.max, rank));
    }
  }
  return out;
}

function mergeTrees(a, b) {
  const out = normalizeTrees(a);
  const extra = normalizeTrees(b);
  for (const k of Object.keys(out)) {
    for (const id of Object.keys(out[k])) {
      out[k][id] = Math.max(out[k][id] || 0, extra[k][id] || 0);
    }
  }
  return out;
}

function glorySpentLegacy(prest) {
  if (!prest || typeof prest !== "object") return 0;
  let spent = 0;
  for (const n of LEGACY_PRESTIGE) {
    const lv = Math.max(0, Math.min(n.max, Math.floor(Number(prest[n.id]) || 0)));
    for (let i = 0; i < lv; i++) spent += n.cost(i);
  }
  return spent;
}

function isLegacyPrest(prest) {
  if (!prest || typeof prest !== "object" || Array.isArray(prest)) return false;
  if (prest.warrior || prest.mage || prest.ranger) return false;
  return LEGACY_PRESTIGE.some((n) => (prest[n.id] || 0) > 0);
}

function parentRankNeed(klass, parentId) {
  const parent = findPrestNode(klass, parentId);
  return parent ? parent.max : 1;
}

function prestReqMet(node, prest, klass) {
  if ((prest[node.id] || 0) > 0) return true;
  return (node.req || []).every((id) => (prest[id] || 0) >= parentRankNeed(klass, id));
}

function prestReqText(node, klass) {
  if (!node.req || !node.req.length) return "";
  return node.req
    .map((id) => {
      const p = findPrestNode(klass, id);
      const need = parentRankNeed(klass, id);
      return (p ? p.name : id) + " " + need + "/" + need;
    })
    .join(" · ");
}

function shopList(klass) {
  const id = klass && PRESTIGE_TREES[klass] ? klass : null;
  if (!id) return RUN_UPGRADES.slice();
  return RUN_UPGRADES.filter((u) => u.klass === id);
}

function shopUnlockWave(u) {
  return u.unlockWave || 1;
}

function nextShopUnlockWave(wave, klass) {
  let best = 0;
  for (const u of shopList(klass)) {
    const w = shopUnlockWave(u);
    if (w > wave && (!best || w < best)) best = w;
  }
  return best;
}

function shopUnlocksAt(wave, klass) {
  return shopList(klass).filter((u) => shopUnlockWave(u) === wave);
}

function heirloomUpgrade(klass) {
  return shopList(klass).find((u) => u.heirloom);
}

function waveCount(n) {
  return Math.min(5, Math.max(1, Math.ceil((n + 1) / 3.5)));
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
    if (n >= 15 && n % 3 === 1 && i === count - 1) type = "healer";
    else if (n >= 13 && i === count - 1 && count >= 3) type = "mage";
    else if (n >= 9 && i === count - 1) type = "archer";
    else if (n >= 13 && i === count - 2 && count >= 4) type = "archer";
    else if (n >= 11 && i % 4 === 3) type = "assassin";
    else if (n >= 9 && i % 3 === 2) type = "berserk";
    else if (n >= 7 && i % 2 === 1) type = "shield";
    units.push(type);
  }
  if (n === 1) return ["grunt"];
  return units;
}

function waveScale(n) {
  const w = Math.max(1, n);
  const open = Math.min(w - 1, 4);
  const rise = Math.max(0, Math.min(w - 5, 5));
  const mid = Math.max(0, Math.min(w - STAGE_LEN, STAGE_LEN));
  const late = Math.max(0, w - STAGE_LEN * 2);
  return {
    hp: Math.pow(1.015, open) * Math.pow(1.075, rise) * Math.pow(1.105, mid) * Math.pow(1.12, late),
    dmg: Math.pow(1.008, open) * Math.pow(1.038, rise) * Math.pow(1.055, mid) * Math.pow(1.065, late),
    gold: 1 + (w - 1) * 0.1,
  };
}

function novaReachFor(extra) {
  return Math.min(NOVA.reachCap, NOVA.reach + Math.max(0, extra || 0));
}

function novaFreezeFor(extra) {
  return NOVA.freeze + Math.max(0, extra || 0);
}

function novaCdFor(haste) {
  const scaled = NOVA.cd * Math.max(0.45, 1 - Math.max(0, haste || 0));
  return Math.max(NOVA.cdMin, scaled);
}

function allyHealAmount(def, wave, healerCount) {
  const n = Math.max(1, wave || 1);
  const raw = (def.heal || 0) * (1 + (n - 1) * 0.028);
  const others = Math.max(0, (healerCount || 1) - 1);
  const pile = 1 / (1 + 0.45 * others);
  return raw * pile;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    CLASSES,
    ENEMIES,
    BOSS_ORDER,
    STAGE_LEN,
    NOVA,
    RANGE,
    ROAD,
    BIOMES,
    stageIndex,
    waveInStage,
    biomeForStage,
    stageSpan,
    stageOriginX,
    packWorldX,
    gateWorldX,
    roadRangeCap,
    clampCombatRange,
    RUN_UPGRADES,
    PRESTIGE_TREES,
    goldCost,
    waveCount,
    isBossWave,
    bossTypeFor,
    waveRoster,
    waveScale,
    novaReachFor,
    novaFreezeFor,
    novaCdFor,
    allyHealAmount,
  };
}
