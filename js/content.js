// Stage = 10 waves. Bosses land on 10 / 20 / 30 / 40 / 50
// (Butcher, Ironhide, Skycleaver, Stormcaller, The Sunfallen).
// Scott reach bars (design, not spreadsheet DPS):
//   0 prestiges → Stage 1 waves 6–8 (die or soft-cap; Armory alone)
//   1 prestige  → 1st boss (wave 10)
//   2 prestiges → mid Stage 2 (waves 14–16)
//   3 prestiges → 2nd boss (wave 20)
// Pass 15: faster pack tempo + steeper foe HP/dmg so virgin cannot stroll to W38.
// Pass 15.1: keep the virgin floor; kick harder after W16 so 3-prestige
// cannot stroll from Ironhide to Stormcaller.
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

// Walk-forward road. Trash packs enter from past the camera's right
// edge (true off-screen) on a timer, then march left onto the road.
// Stage span / gate math still space biomes; bosses cap each area.
const ROAD = {
  firstGap: 420,
  packGap: 580,
  packSpread: 28,
  afterBoss: 340,
  heroWalk: 124,
  stopMelee: 110,
  stopRanged: 172,
  // Plant inside Warrior melee (~108) even when a shield parks the
  // fighter. Charge must not be required to tag the archer.
  rangedKeep: 100,
  kiteFace: 56,
  kiteLeash: 8,
  // Half a grunt body past camera+W so the sprite is fully off-canvas.
  spawnPad: 80,
};

function spawnEdgeX(heroX, viewRightX) {
  const edge = Number(viewRightX);
  const pad = Number(ROAD.spawnPad) || 80;
  if (Number.isFinite(edge)) return edge + pad;
  return (Number(heroX) || 80) + RANGE.spawnGap + pad;
}

function spawnIsPastView(spawnX, viewRightX) {
  return Number(spawnX) > Number(viewRightX);
}

function rangedKeepFor(def) {
  const raw = def && def.keep != null ? Number(def.keep) : ROAD.rangedKeep;
  const n = Number.isFinite(raw) ? raw : ROAD.rangedKeep;
  return Math.min(ROAD.rangedKeep, Math.max(80, n));
}

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

// Keep a living boss on this side of the biome gate. Power Strike
// always knocks +x; Charge / Whirl can too. Without a hold they slide
// through the portal into the next stage.
const BOSS_GATE_PAD = 56;

function bossHoldX(stage) {
  return gateWorldX(stage) - BOSS_GATE_PAD;
}

function clampBossWorldX(x, stage) {
  const n = Number(x);
  const cap = bossHoldX(stage);
  if (!Number.isFinite(n)) return cap;
  return Math.min(n, cap);
}

const CLASSES = {
  warrior: {
    id: "warrior",
    name: "Warrior",
    tag: "Steel and grit",
    blurb: "Melee cleave and Power Strike. Unlock Mend, Whirlwind, and Charge on the Iron Pact.",
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
    blurb: "Firebolts and Fireball. Unlock Cauterize, Inferno, and Frost Nova on the Ember Court.",
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
    blurb: "Bow and Aimed Shot. Unlock Field Dress, Volley, and Sic 'em on the Wild Hunt.",
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
    hp: 40,
    dmg: 9,
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
    hp: 60,
    dmg: 7.5,
    armor: 6.2,
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
    hp: 36,
    dmg: 11,
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
    hp: 26,
    dmg: 9,
    armor: 0,
    speed: 62,
    atkRate: 0.7,
    reach: 78,
    keep: 100,
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
    hp: 24,
    dmg: 13,
    armor: 0,
    speed: 50,
    atkRate: 0.42,
    reach: 78,
    keep: 100,
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
    hp: 28,
    dmg: 4,
    armor: 0,
    speed: 58,
    atkRate: 0.55,
    reach: 78,
    keep: 96,
    gold: 15,
    magic: 7,
    color: "#c9a227",
    heal: 7,
    healRate: 3.7,
    healRange: 168,
  },
  assassin: {
    name: "Assassin",
    sprite: "assassin",
    hp: 28,
    dmg: 5.5,
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
    hp: 108,
    dmg: 14,
    armor: 2.4,
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
    hp: 190,
    dmg: 18,
    armor: 17,
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
    hp: 105,
    dmg: 15,
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
    hp: 100,
    dmg: 18,
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
    hp: 130,
    dmg: 13,
    armor: 3,
    speed: 34,
    atkRate: 0.5,
    reach: 95,
    keep: 200,
    gold: 80,
    magic: 22,
    color: "#d07030",
    heal: 8,
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

function grantSkill(slot) {
  return (h, lv) => {
    if (lv > 0) {
      h.skillUnlock = h.skillUnlock || [false, false, false];
      h.skillUnlock[slot] = true;
    }
  };
}

function node(spec) {
  const depth = spec.root ? 0 : spec.row;
  const gated = spec.unlockSkill != null || !!spec.choice;
  const built = Object.assign(
    {
      max: gated ? 1 : 3,
      req: spec.root ? [] : spec.req || [],
      cost: spec.cost || ((lv) => deepCost(depth, lv)),
    },
    spec
  );
  if (built.unlockSkill != null && !spec.apply) built.apply = grantSkill(built.unlockSkill);
  return built;
}

const PRESTIGE_TREES = {
  warrior: {
    id: "warrior",
    name: "Iron Pact",
    blurb:
      "Start with steel and an Oath. Passives open each branch. Unlock Mend, Whirlwind, and Charge, then pick one mutation.",
    branches: ["Shield", "Blade", "Vanguard"],
    nodes: [
      node({
        id: "oath",
        name: "Oath",
        branch: "Root",
        col: 1,
        row: 0,
        root: true,
        max: 3,
        kind: "passive",
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
        kind: "passive",
        req: ["oath"],
        desc: "+1.2 armor each run",
        apply: (h, lv) => {
          h.armor += lv * 1.2;
        },
      }),
      node({
        id: "unlockmend",
        name: "Mend",
        branch: "Shield",
        col: 0,
        row: 2,
        kind: "unlock",
        unlockSkill: 0,
        req: ["hide"],
        desc: "Unlocks Mend — heal yourself for mana",
      }),
      node({
        id: "suture",
        name: "Suture",
        branch: "Shield",
        col: 0,
        row: 3,
        kind: "alter",
        req: ["unlockmend"],
        desc: "Mend heals +4% of max HP per rank",
        apply: (h, lv) => {
          h.mendAmp = (h.mendAmp || 0) + lv * 0.04;
        },
      }),
      node({
        id: "ironmend",
        name: "Iron Mend",
        branch: "Shield",
        col: 0,
        row: 4,
        fork: 0,
        choice: "warrior-mend",
        kind: "choice",
        req: ["suture"],
        desc: "CHOICE · Mend grants +1.4 armor for 3s (defense)",
        apply: (h, lv) => {
          h.mendArmor = lv;
        },
      }),
      node({
        id: "rallymend",
        name: "Rally Mend",
        branch: "Shield",
        col: 0,
        row: 4,
        fork: 1,
        choice: "warrior-mend",
        kind: "choice",
        req: ["suture"],
        desc: "CHOICE · Mend also pulses 55% damage to nearby foes",
        apply: (h, lv) => {
          if (lv > 0) h.mendPulse = 0.55;
        },
      }),
      node({
        id: "swiftmend",
        name: "Swift Mend",
        branch: "Shield",
        col: 0,
        row: 4,
        fork: 2,
        choice: "warrior-mend",
        kind: "choice",
        req: ["suture"],
        desc: "CHOICE · Mend costs 8 less mana",
        apply: (h, lv) => {
          if (lv > 0) {
            h.skillManaOff = h.skillManaOff || [0, 0, 0];
            h.skillManaOff[0] += 8;
          }
        },
      }),
      node({
        id: "ironclad",
        name: "Ironclad",
        branch: "Shield",
        col: 0,
        row: 5,
        fork: 0,
        kind: "alter",
        req: ["ironmend"],
        desc: "After Mend, the next 3 hits deal 12% less per rank",
        apply: (h, lv) => {
          h.mendDR = lv;
        },
      }),
      node({
        id: "mendbrand",
        name: "Brand",
        branch: "Shield",
        col: 0,
        row: 5,
        fork: 1,
        kind: "alter",
        req: ["rallymend"],
        desc: "Mend pulse also applies a short bleed",
        apply: (h, lv) => {
          h.mendBleed = lv;
        },
      }),
      node({
        id: "secondwind",
        name: "Second Wind",
        branch: "Shield",
        col: 0,
        row: 5,
        fork: 2,
        max: 2,
        kind: "alter",
        req: ["swiftmend"],
        desc: "At 30% HP, heal 26% (charges = ranks)",
        apply: (h, lv) => {
          h.secondWind = lv;
        },
      }),
      node({
        id: "unbreakable",
        name: "Unbreakable",
        branch: "Shield",
        col: 0,
        row: 6,
        fork: 0,
        max: 1,
        kind: "alter",
        req: ["ironclad"],
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
        row: 6,
        fork: 1,
        max: 1,
        kind: "alter",
        req: ["mendbrand"],
        desc: "Mend heals an extra 10% of max HP",
        apply: (h, lv) => {
          if (lv > 0) h.mendAmp = (h.mendAmp || 0) + 0.1;
        },
      }),
      node({
        id: "laststand",
        name: "Last Stand",
        branch: "Shield",
        col: 0,
        row: 6,
        fork: 2,
        max: 1,
        kind: "alter",
        req: ["secondwind"],
        desc: "Below 28% HP: +25% damage and +20% speed",
        apply: (h, lv) => {
          if (lv > 0) h.lastStand = true;
        },
      }),
      node({
        id: "tempo",
        name: "Tempo",
        branch: "Blade",
        col: 1,
        row: 1,
        kind: "passive",
        req: ["oath"],
        desc: "+5% attack speed each run",
        apply: (h, lv) => {
          h.atkRate *= Math.pow(1.05, lv);
        },
      }),
      node({
        id: "unlockwhirl",
        name: "Whirlwind",
        branch: "Blade",
        col: 1,
        row: 2,
        kind: "unlock",
        unlockSkill: 1,
        req: ["tempo"],
        desc: "Unlocks Whirlwind — three hits on both sides",
      }),
      node({
        id: "sweep",
        name: "Sweep",
        branch: "Blade",
        col: 1,
        row: 3,
        kind: "alter",
        req: ["unlockwhirl"],
        desc: "Whirlwind damage +12% per rank",
        apply: (h, lv) => {
          h.whirlDmg = (h.whirlDmg || 1) * Math.pow(1.12, lv);
        },
      }),
      node({
        id: "shockwave",
        name: "Shockwave",
        branch: "Blade",
        col: 1,
        row: 4,
        fork: 0,
        choice: "warrior-whirl",
        kind: "choice",
        req: ["sweep"],
        desc: "CHOICE · Whirlwind stuns 0.5s",
        apply: (h, lv) => {
          if (lv > 0) h.whirlStun = (h.whirlStun || 0) + 0.5;
        },
      }),
      node({
        id: "maelstrom",
        name: "Maelstrom",
        branch: "Blade",
        col: 1,
        row: 4,
        fork: 1,
        choice: "warrior-whirl",
        kind: "choice",
        req: ["sweep"],
        desc: "CHOICE · Whirlwind +1 hit",
        apply: (h, lv) => {
          if (lv > 0) h.whirlExtra = (h.whirlExtra || 0) + 1;
        },
      }),
      node({
        id: "tempestwhirl",
        name: "Tempest",
        branch: "Blade",
        col: 1,
        row: 4,
        fork: 2,
        choice: "warrior-whirl",
        kind: "choice",
        req: ["sweep"],
        desc: "CHOICE · Whirlwind cooldown −18%",
        apply: (h, lv) => {
          if (lv > 0) {
            h.skillCdMult = h.skillCdMult || [1, 1, 1];
            h.skillCdMult[1] *= 0.82;
          }
        },
      }),
      node({
        id: "aftershock",
        name: "Aftershock",
        branch: "Blade",
        col: 1,
        row: 5,
        fork: 0,
        kind: "alter",
        req: ["shockwave"],
        desc: "Whirlwind stun +0.25s and a short slow",
        apply: (h, lv) => {
          h.whirlStun = (h.whirlStun || 0) + lv * 0.25;
          h.whirlSlow = (h.whirlSlow || 0) + lv * 0.8;
        },
      }),
      node({
        id: "whirlmaster",
        name: "Whirl Master",
        branch: "Blade",
        col: 1,
        row: 5,
        fork: 1,
        kind: "alter",
        req: ["maelstrom"],
        desc: "Whirlwind +1 hit per rank",
        apply: (h, lv) => {
          h.whirlExtra = (h.whirlExtra || 0) + lv;
        },
      }),
      node({
        id: "warmaster",
        name: "War Master",
        branch: "Blade",
        col: 1,
        row: 5,
        fork: 2,
        max: 1,
        kind: "alter",
        req: ["tempestwhirl"],
        desc: "Kills refund 0.45s of Whirlwind cooldown",
        apply: (h, lv) => {
          if (lv > 0) h.whirlRefund = 0.45;
        },
      }),
      node({
        id: "earthquake",
        name: "Earthquake",
        branch: "Blade",
        col: 1,
        row: 6,
        fork: 0,
        max: 1,
        kind: "alter",
        req: ["aftershock"],
        desc: "Whirlwind knocks foes back",
        apply: (h, lv) => {
          if (lv > 0) h.whirlKnock = 28;
        },
      }),
      node({
        id: "bloodlust",
        name: "Bloodlust",
        branch: "Blade",
        col: 1,
        row: 6,
        fork: 1,
        max: 2,
        kind: "alter",
        req: ["whirlmaster"],
        desc: "Kills grant Rage (1.6s per rank)",
        apply: (h, lv) => {
          h.bloodlust = lv;
        },
      }),
      node({
        id: "execute",
        name: "Execute",
        branch: "Blade",
        col: 1,
        row: 6,
        fork: 2,
        kind: "alter",
        req: ["warmaster"],
        desc: "+18% damage to foes below 40% HP",
        apply: (h, lv) => {
          h.execute = lv;
        },
      }),
      node({
        id: "purse",
        name: "Purse",
        branch: "Vanguard",
        col: 2,
        row: 1,
        kind: "passive",
        req: ["oath"],
        desc: "+18 starting gold each run",
        apply: (h, lv) => {
          h.startGold = (h.startGold || 0) + lv * 18;
        },
      }),
      node({
        id: "unlockcharge",
        name: "Charge",
        branch: "Vanguard",
        col: 2,
        row: 2,
        kind: "unlock",
        unlockSkill: 2,
        req: ["purse"],
        desc: "Unlocks Charge / Return — trampling dash",
      }),
      node({
        id: "trample",
        name: "Trample",
        branch: "Vanguard",
        col: 2,
        row: 3,
        kind: "alter",
        req: ["unlockcharge"],
        desc: "Charge damage +25% per rank",
        apply: (h, lv) => {
          h.chargeDmg = (h.chargeDmg || 0) + lv * 0.25;
        },
      }),
      node({
        id: "stampede",
        name: "Stampede",
        branch: "Vanguard",
        col: 2,
        row: 4,
        fork: 0,
        choice: "warrior-charge",
        kind: "choice",
        req: ["trample"],
        desc: "CHOICE · Charge stuns 0.55s",
        apply: (h, lv) => {
          if (lv > 0) h.chargeStun = (h.chargeStun || 0) + 0.55;
        },
      }),
      node({
        id: "breaker",
        name: "Breaker",
        branch: "Vanguard",
        col: 2,
        row: 4,
        fork: 1,
        choice: "warrior-charge",
        kind: "choice",
        req: ["trample"],
        desc: "CHOICE · Charge +50% damage",
        apply: (h, lv) => {
          if (lv > 0) h.chargeDmg = (h.chargeDmg || 0) + 0.5;
        },
      }),
      node({
        id: "reckless",
        name: "Reckless",
        branch: "Vanguard",
        col: 2,
        row: 4,
        fork: 2,
        choice: "warrior-charge",
        kind: "choice",
        req: ["trample"],
        desc: "CHOICE · Charge and Return 22% faster",
        apply: (h, lv) => {
          if (lv > 0) h.chargeSpd = (h.chargeSpd || 0) + 0.22;
        },
      }),
      node({
        id: "bullrush",
        name: "Bull Rush",
        branch: "Vanguard",
        col: 2,
        row: 5,
        fork: 0,
        kind: "alter",
        req: ["stampede"],
        desc: "Charge also knocks foes back",
        apply: (h, lv) => {
          h.chargeKnock = (h.chargeKnock || 0) + lv * 22;
        },
      }),
      node({
        id: "cleaveform",
        name: "Cleave Form",
        branch: "Vanguard",
        col: 2,
        row: 5,
        fork: 1,
        kind: "alter",
        req: ["breaker"],
        desc: "Second-target cleave +22% per rank",
        apply: (h, lv) => {
          h.cleaveBonus = (h.cleaveBonus || 0) + lv * 0.22;
        },
      }),
      node({
        id: "heirloom",
        name: "Heirloom",
        branch: "Vanguard",
        col: 2,
        row: 5,
        fork: 2,
        max: 1,
        kind: "alter",
        req: ["reckless"],
        desc: "Each run starts with Iron I already forged",
        apply: (h, lv) => {
          if (lv > 0) h.heirloom = true;
        },
      }),
      node({
        id: "warlord",
        name: "Warlord",
        branch: "Vanguard",
        col: 2,
        row: 6,
        fork: 0,
        max: 1,
        kind: "alter",
        req: ["bullrush"],
        desc: "Charge leaves a 1.1s slow",
        apply: (h, lv) => {
          if (lv > 0) h.chargeSlow = 1.1;
        },
      }),
      node({
        id: "reaper",
        name: "Reaper",
        branch: "Vanguard",
        col: 2,
        row: 6,
        fork: 1,
        max: 1,
        kind: "alter",
        req: ["cleaveform"],
        desc: "Execute starts at 52% HP instead of 40%",
        apply: (h, lv) => {
          if (lv > 0) h.executeHp = 0.52;
        },
      }),
      node({
        id: "kingpin",
        name: "Kingpin",
        branch: "Vanguard",
        col: 2,
        row: 6,
        fork: 2,
        max: 1,
        kind: "alter",
        req: ["heirloom"],
        desc: "Heirloom also starts the run with Swift I",
        apply: (h, lv) => {
          if (lv > 0) h.heirloomSwift = true;
        },
      }),
    ],
  },
  mage: {
    id: "mage",
    name: "Ember Court",
    blurb:
      "Kindle first. Passives open Well, Pyre, and Frost. Unlock Cauterize, Inferno, and Frost Nova, then pick one mutation.",
    branches: ["Well", "Pyre", "Frost"],
    nodes: [
      node({
        id: "kindle",
        name: "Kindle",
        branch: "Root",
        col: 1,
        row: 0,
        root: true,
        max: 3,
        kind: "passive",
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
        id: "spark",
        name: "Spark",
        branch: "Well",
        col: 0,
        row: 1,
        kind: "passive",
        req: ["kindle"],
        desc: "+10 max mana and +0.7 mana regen",
        apply: (h, lv) => {
          h.mana += lv * 5;
          h.maxMana += lv * 10;
          h.manaRegen += lv * 0.7;
        },
      }),
      node({
        id: "unlockcaut",
        name: "Cauterize",
        branch: "Well",
        col: 0,
        row: 2,
        kind: "unlock",
        unlockSkill: 0,
        req: ["spark"],
        desc: "Unlocks Cauterize — heal and ignite nearby foes",
      }),
      node({
        id: "brand",
        name: "Brand",
        branch: "Well",
        col: 0,
        row: 3,
        kind: "alter",
        req: ["unlockcaut"],
        desc: "Cauterize heal +4% and ignite +10% per rank",
        apply: (h, lv) => {
          h.cautAmp = (h.cautAmp || 0) + lv * 0.04;
          h.cautIgnite = (h.cautIgnite || 0) + lv * 0.1;
        },
      }),
      node({
        id: "searing",
        name: "Searing",
        branch: "Well",
        col: 0,
        row: 4,
        fork: 0,
        choice: "mage-caut",
        kind: "choice",
        req: ["brand"],
        desc: "CHOICE · Cauterize ignite +45% damage",
        apply: (h, lv) => {
          if (lv > 0) h.cautIgnite = (h.cautIgnite || 0) + 0.45;
        },
      }),
      node({
        id: "mendingflame",
        name: "Mending Flame",
        branch: "Well",
        col: 0,
        row: 4,
        fork: 1,
        choice: "mage-caut",
        kind: "choice",
        req: ["brand"],
        desc: "CHOICE · Cauterize heals +10% of max HP",
        apply: (h, lv) => {
          if (lv > 0) h.cautAmp = (h.cautAmp || 0) + 0.1;
        },
      }),
      node({
        id: "emberflow",
        name: "Emberflow",
        branch: "Well",
        col: 0,
        row: 4,
        fork: 2,
        choice: "mage-caut",
        kind: "choice",
        req: ["brand"],
        desc: "CHOICE · Cauterize costs 6 less mana",
        apply: (h, lv) => {
          if (lv > 0) {
            h.skillManaOff = h.skillManaOff || [0, 0, 0];
            h.skillManaOff[0] += 6;
          }
        },
      }),
      node({
        id: "evocation",
        name: "Evocation",
        branch: "Well",
        col: 0,
        row: 5,
        fork: 0,
        kind: "alter",
        req: ["searing"],
        desc: "Cauterize restores 10 mana per rank",
        apply: (h, lv) => {
          h.cautMana = lv;
        },
      }),
      node({
        id: "ritualist",
        name: "Ritualist",
        branch: "Well",
        col: 0,
        row: 5,
        fork: 1,
        max: 1,
        kind: "alter",
        req: ["mendingflame"],
        desc: "Cauterize ward lasts +1.1s",
        apply: (h, lv) => {
          if (lv > 0) h.cautWardExtra = 1.1;
        },
      }),
      node({
        id: "phylactery",
        name: "Phylactery",
        branch: "Well",
        col: 0,
        row: 5,
        fork: 2,
        max: 1,
        kind: "alter",
        req: ["emberflow"],
        desc: "Each run starts with Ember I already lit",
        apply: (h, lv) => {
          if (lv > 0) h.heirloom = true;
        },
      }),
      node({
        id: "kindling",
        name: "Kindling",
        branch: "Well",
        col: 0,
        row: 6,
        fork: 0,
        kind: "alter",
        req: ["evocation"],
        desc: "Killing a burning foe restores 4 mana per rank",
        apply: (h, lv) => {
          h.burnMana = lv;
        },
      }),
      node({
        id: "sage",
        name: "Sage",
        branch: "Well",
        col: 0,
        row: 6,
        fork: 1,
        kind: "alter",
        req: ["ritualist"],
        desc: "+0.4 mana regen and +8% glory per rank",
        apply: (h, lv) => {
          h.manaRegen += lv * 0.4;
          h.gloryBonus = (h.gloryBonus || 0) + lv;
        },
      }),
      node({
        id: "archon",
        name: "Archon",
        branch: "Well",
        col: 0,
        row: 6,
        fork: 2,
        max: 1,
        kind: "alter",
        req: ["phylactery"],
        desc: "Start each run with 24 extra mana",
        apply: (h, lv) => {
          if (lv > 0) h.mana += 24;
        },
      }),
      node({
        id: "cinder",
        name: "Cinder",
        branch: "Pyre",
        col: 1,
        row: 1,
        kind: "passive",
        req: ["kindle"],
        desc: "Hits apply a short burn (stronger per rank)",
        apply: (h, lv) => {
          h.cinder = lv;
        },
      }),
      node({
        id: "unlockinferno",
        name: "Inferno",
        branch: "Pyre",
        col: 1,
        row: 2,
        kind: "unlock",
        unlockSkill: 1,
        req: ["cinder"],
        desc: "Unlocks Inferno — three pulses of ground fire",
      }),
      node({
        id: "blaze",
        name: "Blaze",
        branch: "Pyre",
        col: 1,
        row: 3,
        kind: "alter",
        req: ["unlockinferno"],
        desc: "+18% burn damage and duration",
        apply: (h, lv) => {
          h.burnAmp = (h.burnAmp || 0) + lv * 0.18;
        },
      }),
      node({
        id: "wildflare",
        name: "Wildflare",
        branch: "Pyre",
        col: 1,
        row: 4,
        fork: 0,
        choice: "mage-inferno",
        kind: "choice",
        req: ["blaze"],
        desc: "CHOICE · Inferno staggers foes for 0.4s",
        apply: (h, lv) => {
          if (lv > 0) h.infernoStun = (h.infernoStun || 0) + 0.4;
        },
      }),
      node({
        id: "immolate",
        name: "Immolate",
        branch: "Pyre",
        col: 1,
        row: 4,
        fork: 1,
        choice: "mage-inferno",
        kind: "choice",
        req: ["blaze"],
        desc: "CHOICE · Inferno +1 pulse",
        apply: (h, lv) => {
          if (lv > 0) h.infernoExtra = (h.infernoExtra || 0) + 1;
        },
      }),
      node({
        id: "flashfire",
        name: "Flashfire",
        branch: "Pyre",
        col: 1,
        row: 4,
        fork: 2,
        choice: "mage-inferno",
        kind: "choice",
        req: ["blaze"],
        desc: "CHOICE · Inferno cooldown −18%",
        apply: (h, lv) => {
          if (lv > 0) {
            h.skillCdMult = h.skillCdMult || [1, 1, 1];
            h.skillCdMult[1] *= 0.82;
          }
        },
      }),
      node({
        id: "widerfire",
        name: "Wider Fire",
        branch: "Pyre",
        col: 1,
        row: 5,
        fork: 0,
        kind: "alter",
        req: ["wildflare"],
        desc: "Inferno reaches +36 farther per rank (still on the road)",
        apply: (h, lv) => {
          h.infernoReach = (h.infernoReach || 0) + lv * 36;
        },
      }),
      node({
        id: "conflagrate",
        name: "Conflagrate",
        branch: "Pyre",
        col: 1,
        row: 5,
        fork: 1,
        kind: "alter",
        req: ["immolate"],
        desc: "Burn DPS +16% per rank",
        apply: (h, lv) => {
          h.burnAmp = (h.burnAmp || 0) + lv * 0.16;
        },
      }),
      node({
        id: "spellweave",
        name: "Spellweave",
        branch: "Pyre",
        col: 1,
        row: 5,
        fork: 2,
        kind: "alter",
        req: ["flashfire"],
        desc: "12% chance an Inferno pulse repeats (not Nova)",
        apply: (h, lv) => {
          h.infernoEcho = (h.infernoEcho || 0) + lv * 0.12;
        },
      }),
      node({
        id: "phoenix",
        name: "Phoenix",
        branch: "Pyre",
        col: 1,
        row: 6,
        fork: 0,
        max: 1,
        kind: "alter",
        req: ["widerfire"],
        desc: "Once per run, a killing blow leaves you at 18% HP and ignites nearby foes",
        apply: (h, lv) => {
          if (lv > 0) h.phoenix = true;
        },
      }),
      node({
        id: "livingbomb",
        name: "Living Bomb",
        branch: "Pyre",
        col: 1,
        row: 6,
        fork: 1,
        max: 1,
        kind: "alter",
        req: ["conflagrate"],
        desc: "Wildfire-style kill burst equal to 30% of your damage",
        apply: (h, lv) => {
          if (lv > 0) {
            h.wildfire = Math.max(h.wildfire || 0, 1);
            h.livingBomb = true;
          }
        },
      }),
      node({
        id: "wildfire",
        name: "Wildfire",
        branch: "Pyre",
        col: 1,
        row: 6,
        fork: 2,
        max: 1,
        kind: "alter",
        req: ["spellweave"],
        desc: "Kills spread a short burn to the nearest foe",
        apply: (h, lv) => {
          if (lv > 0) h.wildfire = Math.max(h.wildfire || 0, 1);
        },
      }),
      node({
        id: "chill",
        name: "Chill",
        branch: "Frost",
        col: 2,
        row: 1,
        kind: "passive",
        req: ["kindle"],
        desc: "Hits slow foes (1.1s per rank)",
        apply: (h, lv) => {
          h.chill = lv;
        },
      }),
      node({
        id: "unlocknova",
        name: "Frost Nova",
        branch: "Frost",
        col: 2,
        row: 2,
        kind: "unlock",
        unlockSkill: 2,
        req: ["chill"],
        desc: "Unlocks Frost Nova — pack-scale freeze (7s CD floor)",
      }),
      node({
        id: "novadepth",
        name: "Nova Depth",
        branch: "Frost",
        col: 2,
        row: 3,
        kind: "alter",
        req: ["unlocknova"],
        desc: "Frost Nova +8 range and +0.08s freeze per rank",
        apply: (h, lv) => {
          h.novaReach = (h.novaReach || 0) + lv * 8;
          h.novaHold = (h.novaHold || 0) + lv * 0.08;
        },
      }),
      node({
        id: "deepfreeze",
        name: "Deep Freeze",
        branch: "Frost",
        col: 2,
        row: 4,
        fork: 0,
        choice: "mage-nova",
        kind: "choice",
        req: ["novadepth"],
        desc: "CHOICE · Frost Nova +0.35s freeze",
        apply: (h, lv) => {
          if (lv > 0) h.novaHold = (h.novaHold || 0) + 0.35;
        },
      }),
      node({
        id: "shatter",
        name: "Shatter",
        branch: "Frost",
        col: 2,
        row: 4,
        fork: 1,
        choice: "mage-nova",
        kind: "choice",
        req: ["novadepth"],
        desc: "CHOICE · +14% damage to frozen foes (2 Shatter)",
        apply: (h, lv) => {
          if (lv > 0) h.shatter = (h.shatter || 0) + 2;
        },
      }),
      node({
        id: "coldsnap",
        name: "Cold Snap",
        branch: "Frost",
        col: 2,
        row: 4,
        fork: 2,
        choice: "mage-nova",
        kind: "choice",
        req: ["novadepth"],
        desc: "CHOICE · Nova cooldown −18% (7s floor still holds)",
        apply: (h, lv) => {
          if (lv > 0) {
            h.skillCdMult = h.skillCdMult || [1, 1, 1];
            h.skillCdMult[2] *= 0.82;
          }
        },
      }),
      node({
        id: "glacial",
        name: "Glacial",
        branch: "Frost",
        col: 2,
        row: 5,
        fork: 0,
        kind: "alter",
        req: ["deepfreeze"],
        desc: "Chill lasts +0.35s per rank",
        apply: (h, lv) => {
          h.chillHold = (h.chillHold || 0) + lv * 0.35;
        },
      }),
      node({
        id: "icelance",
        name: "Ice Lance",
        branch: "Frost",
        col: 2,
        row: 5,
        fork: 1,
        kind: "alter",
        req: ["shatter"],
        desc: "After Nova, the next 2 hits deal +28% per rank",
        apply: (h, lv) => {
          h.iceLance = lv;
        },
      }),
      node({
        id: "novamana",
        name: "Rime Well",
        branch: "Frost",
        col: 2,
        row: 5,
        fork: 2,
        kind: "alter",
        req: ["coldsnap"],
        desc: "Nova refunds 8 mana per rank (cooldown floor still holds)",
        apply: (h, lv) => {
          h.novaMana = lv;
        },
      }),
      node({
        id: "winterheart",
        name: "Winterheart",
        branch: "Frost",
        col: 2,
        row: 6,
        fork: 0,
        max: 1,
        kind: "alter",
        req: ["glacial"],
        desc: "Shatter also applies to slowed foes at half strength",
        apply: (h, lv) => {
          if (lv > 0) {
            h.shatter = Math.max(h.shatter || 0, 1);
            h.slowShatter = true;
          }
        },
      }),
      node({
        id: "rime",
        name: "Rime",
        branch: "Frost",
        col: 2,
        row: 6,
        fork: 1,
        max: 1,
        kind: "alter",
        req: ["icelance"],
        desc: "Killing a frozen foe restores 10 mana",
        apply: (h, lv) => {
          if (lv > 0) h.rime = true;
        },
      }),
      node({
        id: "permafrost",
        name: "Permafrost",
        branch: "Frost",
        col: 2,
        row: 6,
        fork: 2,
        max: 1,
        kind: "alter",
        req: ["novamana"],
        desc: "Frost Nova +0.16s freeze and +1 Shatter",
        apply: (h, lv) => {
          if (lv > 0) {
            h.novaHold = (h.novaHold || 0) + 0.16;
            h.shatter = (h.shatter || 0) + 1;
          }
        },
      }),
    ],
  },
  ranger: {
    id: "ranger",
    name: "Wild Hunt",
    blurb:
      "Mark the trail. Passives open Stride, Bow, and Wolf. Unlock Field Dress, Volley, and Sic 'em, then pick one mutation.",
    branches: ["Stride", "Bow", "Wolf"],
    nodes: [
      node({
        id: "trail",
        name: "Trail",
        branch: "Root",
        col: 1,
        row: 0,
        root: true,
        max: 3,
        kind: "passive",
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
        id: "stride",
        name: "Stride",
        branch: "Stride",
        col: 0,
        row: 1,
        kind: "passive",
        req: ["trail"],
        desc: "+5% attack speed and wolf +12% move speed",
        apply: (h, lv) => {
          h.atkRate *= Math.pow(1.05, lv);
          h.wolfStride = (h.wolfStride || 0) + lv * 0.12;
        },
      }),
      node({
        id: "unlockdress",
        name: "Field Dress",
        branch: "Stride",
        col: 0,
        row: 2,
        kind: "unlock",
        unlockSkill: 0,
        req: ["stride"],
        desc: "Unlocks Field Dress — heal you and a living wolf",
      }),
      node({
        id: "poulticebase",
        name: "Poultice",
        branch: "Stride",
        col: 0,
        row: 3,
        kind: "alter",
        req: ["unlockdress"],
        desc: "Field Dress heals +5% of max HP per rank",
        apply: (h, lv) => {
          h.dressAmp = (h.dressAmp || 0) + lv * 0.05;
        },
      }),
      node({
        id: "trailward",
        name: "Trail Ward",
        branch: "Stride",
        col: 0,
        row: 4,
        fork: 0,
        choice: "ranger-dress",
        kind: "choice",
        req: ["poulticebase"],
        desc: "CHOICE · Field Dress grants 1.6s of 18% damage reduction",
        apply: (h, lv) => {
          if (lv > 0) h.dressWard = Math.max(h.dressWard || 0, 1);
        },
      }),
      node({
        id: "poultice",
        name: "Deep Poultice",
        branch: "Stride",
        col: 0,
        row: 4,
        fork: 1,
        choice: "ranger-dress",
        kind: "choice",
        req: ["poulticebase"],
        desc: "CHOICE · Field Dress heals +8% more",
        apply: (h, lv) => {
          if (lv > 0) h.dressAmp = (h.dressAmp || 0) + 0.08;
        },
      }),
      node({
        id: "quickhands",
        name: "Quick Hands",
        branch: "Stride",
        col: 0,
        row: 4,
        fork: 2,
        choice: "ranger-dress",
        kind: "choice",
        req: ["poulticebase"],
        desc: "CHOICE · Field Dress costs 6 less mana",
        apply: (h, lv) => {
          if (lv > 0) {
            h.skillManaOff = h.skillManaOff || [0, 0, 0];
            h.skillManaOff[0] += 6;
          }
        },
      }),
      node({
        id: "camouflage",
        name: "Camouflage",
        branch: "Stride",
        col: 0,
        row: 5,
        fork: 0,
        kind: "alter",
        req: ["trailward"],
        desc: "First 2.2s of each wave you take 14% less per rank",
        apply: (h, lv) => {
          h.camo = lv;
        },
      }),
      node({
        id: "secondwind",
        name: "Fieldcraft",
        branch: "Stride",
        col: 0,
        row: 5,
        fork: 1,
        max: 2,
        kind: "alter",
        req: ["poultice"],
        desc: "At 30% HP, heal 26% (charges = ranks)",
        apply: (h, lv) => {
          h.secondWind = lv;
        },
      }),
      node({
        id: "heirloom",
        name: "Keepsake",
        branch: "Stride",
        col: 0,
        row: 5,
        fork: 2,
        max: 1,
        kind: "alter",
        req: ["quickhands"],
        desc: "Each run starts with Bodkin I already nocked",
        apply: (h, lv) => {
          if (lv > 0) h.heirloom = true;
        },
      }),
      node({
        id: "veteran",
        name: "Veteran",
        branch: "Stride",
        col: 0,
        row: 6,
        fork: 0,
        max: 1,
        kind: "alter",
        req: ["camouflage"],
        desc: "+1 Fieldcraft charge",
        apply: (h, lv) => {
          if (lv > 0) h.secondWind = (h.secondWind || 0) + 1;
        },
      }),
      node({
        id: "fieldmedic",
        name: "Trail Medic",
        branch: "Stride",
        col: 0,
        row: 6,
        fork: 1,
        kind: "alter",
        req: ["secondwind"],
        desc: "Hearts heal +7% of max HP per rank",
        apply: (h, lv) => {
          h.heartAmp = (h.heartAmp || 0) + lv * 0.07;
        },
      }),
      node({
        id: "pathfinder",
        name: "Pathfinder",
        branch: "Stride",
        col: 0,
        row: 6,
        fork: 2,
        max: 1,
        kind: "alter",
        req: ["heirloom"],
        desc: "Keepsake also starts the run with Swift I",
        apply: (h, lv) => {
          if (lv > 0) h.heirloomSwift = true;
        },
      }),
      node({
        id: "edge",
        name: "Edge",
        branch: "Bow",
        col: 1,
        row: 1,
        kind: "passive",
        req: ["trail"],
        desc: "+4% crit chance each run",
        apply: (h, lv) => {
          h.crit += lv * 0.04;
        },
      }),
      node({
        id: "unlockvolley",
        name: "Volley",
        branch: "Bow",
        col: 1,
        row: 2,
        kind: "unlock",
        unlockSkill: 1,
        req: ["edge"],
        desc: "Unlocks Volley — five arrows",
      }),
      node({
        id: "rain",
        name: "Rain",
        branch: "Bow",
        col: 1,
        row: 3,
        max: 2,
        kind: "alter",
        req: ["unlockvolley"],
        desc: "Volley +1 arrow per rank",
        apply: (h, lv) => {
          h.volleyExtra = lv;
        },
      }),
      node({
        id: "pinvolley",
        name: "Pinning Volley",
        branch: "Bow",
        col: 1,
        row: 4,
        fork: 0,
        choice: "ranger-volley",
        kind: "choice",
        req: ["rain"],
        desc: "CHOICE · Volley arrows slow foes for 1.2s",
        apply: (h, lv) => {
          if (lv > 0) h.volleySlow = 1.2;
        },
      }),
      node({
        id: "broadhead",
        name: "Broadhead",
        branch: "Bow",
        col: 1,
        row: 4,
        fork: 1,
        choice: "ranger-volley",
        kind: "choice",
        req: ["rain"],
        desc: "CHOICE · Volley damage +18%",
        apply: (h, lv) => {
          if (lv > 0) h.volleyDmg = (h.volleyDmg || 1) * 1.18;
        },
      }),
      node({
        id: "rapidfire",
        name: "Rapid Fire",
        branch: "Bow",
        col: 1,
        row: 4,
        fork: 2,
        choice: "ranger-volley",
        kind: "choice",
        req: ["rain"],
        desc: "CHOICE · Volley cooldown −20%",
        apply: (h, lv) => {
          if (lv > 0) {
            h.skillCdMult = h.skillCdMult || [1, 1, 1];
            h.skillCdMult[1] *= 0.8;
          }
        },
      }),
      node({
        id: "multishot",
        name: "Multishot",
        branch: "Bow",
        col: 1,
        row: 5,
        fork: 0,
        kind: "alter",
        req: ["pinvolley"],
        desc: "Autos also hit a second foe for 36% per rank",
        apply: (h, lv) => {
          h.multishot = lv;
        },
      }),
      node({
        id: "headhunter",
        name: "Headhunter",
        branch: "Bow",
        col: 1,
        row: 5,
        fork: 1,
        kind: "alter",
        req: ["broadhead"],
        desc: "Critical hits deal +22% extra per rank",
        apply: (h, lv) => {
          h.critDmg = (h.critDmg || 0) + lv * 0.22;
        },
      }),
      node({
        id: "echo",
        name: "Echo",
        branch: "Bow",
        col: 1,
        row: 5,
        fork: 2,
        max: 2,
        kind: "alter",
        req: ["rapidfire"],
        desc: "+12% chance to repeat an auto per rank",
        apply: (h, lv) => {
          h.echo = (h.echo || 0) + lv * 0.12;
        },
      }),
      node({
        id: "deadeye",
        name: "Deadeye",
        branch: "Bow",
        col: 1,
        row: 6,
        fork: 0,
        max: 1,
        kind: "alter",
        req: ["multishot"],
        desc: "Foes farther than 200 take +14% damage",
        apply: (h, lv) => {
          if (lv > 0) h.deadeye = true;
        },
      }),
      node({
        id: "marksman",
        name: "Marksman",
        branch: "Bow",
        col: 1,
        row: 6,
        fork: 1,
        max: 1,
        kind: "alter",
        req: ["headhunter"],
        desc: "+18% Aimed Shot damage and +1 pierce",
        apply: (h, lv) => {
          if (lv > 0) {
            h.strikeMult = (h.strikeMult || 1) * 1.18;
            h.strikePierce = (h.strikePierce || 0) + 1;
          }
        },
      }),
      node({
        id: "sharpshooter",
        name: "Sharpshooter",
        branch: "Bow",
        col: 1,
        row: 6,
        fork: 2,
        max: 1,
        kind: "alter",
        req: ["echo"],
        desc: "Echo can also repeat Aimed Shot",
        apply: (h, lv) => {
          if (lv > 0) h.strikeEcho = true;
        },
      }),
      node({
        id: "pack",
        name: "Pack",
        branch: "Wolf",
        col: 2,
        row: 1,
        kind: "passive",
        req: ["trail"],
        desc: "Wolf +22% HP and +2 damage per rank",
        apply: (h, lv) => {
          h.pack = lv;
        },
      }),
      node({
        id: "unlocksic",
        name: "Sic 'em",
        branch: "Wolf",
        col: 2,
        row: 2,
        kind: "unlock",
        unlockSkill: 2,
        req: ["pack"],
        desc: "Unlocks Sic 'em — revive the wolf when it is DOWN",
      }),
      node({
        id: "sicmaster",
        name: "Sic Master",
        branch: "Wolf",
        col: 2,
        row: 3,
        max: 2,
        kind: "alter",
        req: ["unlocksic"],
        desc: "Sic 'em revive returns the wolf with +10% HP per rank",
        apply: (h, lv) => {
          h.sicRevive = (h.sicRevive || 0) + lv * 0.1;
        },
      }),
      node({
        id: "howl",
        name: "Howl",
        branch: "Wolf",
        col: 2,
        row: 4,
        fork: 0,
        choice: "ranger-sic",
        kind: "choice",
        req: ["sicmaster"],
        desc: "CHOICE · Each new wave, the wolf taunts for 1.1s",
        apply: (h, lv) => {
          if (lv > 0) h.howl = Math.max(h.howl || 0, 1);
        },
      }),
      node({
        id: "maul",
        name: "Maul",
        branch: "Wolf",
        col: 2,
        row: 4,
        fork: 1,
        choice: "ranger-sic",
        kind: "choice",
        req: ["sicmaster"],
        desc: "CHOICE · Wolf lifesteal +8%",
        apply: (h, lv) => {
          if (lv > 0) h.wolfLeech = (h.wolfLeech || 0) + 0.08;
        },
      }),
      node({
        id: "packrecall",
        name: "Pack Recall",
        branch: "Wolf",
        col: 2,
        row: 4,
        fork: 2,
        choice: "ranger-sic",
        kind: "choice",
        req: ["sicmaster"],
        desc: "CHOICE · Sic 'em cooldown −25%",
        apply: (h, lv) => {
          if (lv > 0) {
            h.skillCdMult = h.skillCdMult || [1, 1, 1];
            h.skillCdMult[2] *= 0.75;
          }
        },
      }),
      node({
        id: "packbond",
        name: "Pack Bond",
        branch: "Wolf",
        col: 2,
        row: 5,
        fork: 0,
        kind: "alter",
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
        col: 2,
        row: 5,
        fork: 1,
        kind: "alter",
        req: ["maul"],
        desc: "Wolf +12% HP and +1.5 damage per rank",
        apply: (h, lv) => {
          h.dire = lv;
        },
      }),
      node({
        id: "alpha",
        name: "Alpha",
        branch: "Wolf",
        col: 2,
        row: 5,
        fork: 2,
        max: 1,
        kind: "alter",
        req: ["packrecall"],
        desc: "Wolf +18% HP and +1.2 regen",
        apply: (h, lv) => {
          if (lv > 0) {
            h.pack = (h.pack || 0) + 1;
            h.wolfRegen = (h.wolfRegen || 0) + 1.2;
          }
        },
      }),
      node({
        id: "huntsman",
        name: "Huntsman",
        branch: "Wolf",
        col: 2,
        row: 6,
        fork: 0,
        max: 1,
        kind: "alter",
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
        col: 2,
        row: 6,
        fork: 1,
        max: 1,
        kind: "alter",
        req: ["dire"],
        desc: "While the wolf lives, incoming melee is reduced 10%",
        apply: (h, lv) => {
          if (lv > 0) h.alphaAura = true;
        },
      }),
      node({
        id: "pelt",
        name: "Pelt",
        branch: "Wolf",
        col: 2,
        row: 6,
        fork: 2,
        kind: "alter",
        req: ["alpha"],
        desc: "Wolf +1.1 armor each run",
        apply: (h, lv) => {
          h.wolfArmor = (h.wolfArmor || 0) + lv * 1.1;
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

// Pass-11 class trees (saveVersion 2). Used only to refund Glory on v3 migrate.
const V2_TREES = {
  warrior: [
    { id: "oath", max: 3, costs: [2, 4, 6] },
    { id: "hide", max: 3, costs: [4, 7, 10] },
    { id: "secondwind", max: 2, costs: [8, 12] },
    { id: "thorns", max: 3, costs: [12, 17, 22] },
    { id: "laststand", max: 1, costs: [18] },
    { id: "bulwark", max: 3, costs: [26, 34, 42] },
    { id: "aegis", max: 3, costs: [26, 34, 42] },
    { id: "fortress", max: 3, costs: [36, 46, 56] },
    { id: "ironclad", max: 3, costs: [36, 46, 56] },
    { id: "unbreakable", max: 1, costs: [50] },
    { id: "bastion", max: 1, costs: [50] },
    { id: "tempo", max: 3, costs: [4, 7, 10] },
    { id: "execute", max: 3, costs: [8, 12, 16] },
    { id: "overkill", max: 2, costs: [12, 17] },
    { id: "bloodlust", max: 2, costs: [18, 24] },
    { id: "cleaveform", max: 3, costs: [26, 34, 42] },
    { id: "deepwounds", max: 3, costs: [26, 34, 42] },
    { id: "whirlmaster", max: 3, costs: [36, 46, 56] },
    { id: "heavyhand", max: 3, costs: [36, 46, 56] },
    { id: "warmaster", max: 1, costs: [50] },
    { id: "reaper", max: 1, costs: [50] },
    { id: "purse", max: 3, costs: [4, 7, 10] },
    { id: "greed", max: 3, costs: [8, 12, 16] },
    { id: "sanguine", max: 3, costs: [12, 17, 22] },
    { id: "heirloom", max: 1, costs: [18] },
    { id: "warchest", max: 3, costs: [26, 34, 42] },
    { id: "scavenger", max: 3, costs: [26, 34, 42] },
    { id: "quartermaster", max: 3, costs: [36, 46, 56] },
    { id: "fieldmedic", max: 3, costs: [36, 46, 56] },
    { id: "kingpin", max: 1, costs: [50] },
    { id: "provisioner", max: 1, costs: [50] },
  ],
  mage: [
    { id: "kindle", max: 3, costs: [2, 4, 6] },
    { id: "cinder", max: 3, costs: [4, 7, 10] },
    { id: "blaze", max: 3, costs: [8, 12, 16] },
    { id: "overkill", max: 2, costs: [12, 17] },
    { id: "wildfire", max: 1, costs: [18] },
    { id: "conflagrate", max: 3, costs: [26, 34, 42] },
    { id: "immolate", max: 3, costs: [26, 34, 42] },
    { id: "kindling", max: 3, costs: [36, 46, 56] },
    { id: "widerfire", max: 3, costs: [36, 46, 56] },
    { id: "phoenix", max: 1, costs: [50] },
    { id: "livingbomb", max: 1, costs: [50] },
    { id: "chill", max: 3, costs: [4, 7, 10] },
    { id: "novadepth", max: 3, costs: [8, 12, 16] },
    { id: "shatter", max: 2, costs: [12, 17] },
    { id: "permafrost", max: 1, costs: [18] },
    { id: "frostbite", max: 3, costs: [26, 34, 42] },
    { id: "icelance", max: 3, costs: [26, 34, 42] },
    { id: "glacial", max: 3, costs: [36, 46, 56] },
    { id: "coldsnap", max: 3, costs: [36, 46, 56] },
    { id: "winterheart", max: 1, costs: [50] },
    { id: "rime", max: 1, costs: [50] },
    { id: "spark", max: 3, costs: [4, 7, 10] },
    { id: "tempest", max: 3, costs: [8, 12, 16] },
    { id: "fate", max: 3, costs: [12, 17, 22] },
    { id: "phylactery", max: 1, costs: [18] },
    { id: "battery", max: 3, costs: [26, 34, 42] },
    { id: "evocation", max: 3, costs: [26, 34, 42] },
    { id: "sage", max: 3, costs: [36, 46, 56] },
    { id: "spellweave", max: 3, costs: [36, 46, 56] },
    { id: "archon", max: 1, costs: [50] },
    { id: "ritualist", max: 1, costs: [50] },
  ],
  ranger: [
    { id: "trail", max: 3, costs: [2, 4, 6] },
    { id: "edge", max: 3, costs: [4, 7, 10] },
    { id: "reach", max: 3, costs: [8, 12, 16] },
    { id: "echo", max: 2, costs: [12, 17] },
    { id: "marksman", max: 1, costs: [18] },
    { id: "multishot", max: 3, costs: [26, 34, 42] },
    { id: "headhunter", max: 3, costs: [26, 34, 42] },
    { id: "aimedreach", max: 3, costs: [36, 46, 56] },
    { id: "volleyplus", max: 3, costs: [36, 46, 56] },
    { id: "deadeye", max: 1, costs: [50] },
    { id: "sharpshooter", max: 1, costs: [50] },
    { id: "pack", max: 3, costs: [4, 7, 10] },
    { id: "pelt", max: 3, costs: [8, 12, 16] },
    { id: "sicmaster", max: 2, costs: [12, 17] },
    { id: "alpha", max: 1, costs: [18] },
    { id: "howl", max: 3, costs: [26, 34, 42] },
    { id: "maul", max: 3, costs: [26, 34, 42] },
    { id: "packbond", max: 3, costs: [36, 46, 56] },
    { id: "dire", max: 3, costs: [36, 46, 56] },
    { id: "huntsman", max: 1, costs: [50] },
    { id: "alphaaura", max: 1, costs: [50] },
    { id: "stride", max: 3, costs: [4, 7, 10] },
    { id: "greed", max: 3, costs: [8, 12, 16] },
    { id: "secondwind", max: 2, costs: [12, 17] },
    { id: "heirloom", max: 1, costs: [18] },
    { id: "camouflage", max: 3, costs: [26, 34, 42] },
    { id: "looter", max: 3, costs: [26, 34, 42] },
    { id: "trailward", max: 3, costs: [36, 46, 56] },
    { id: "swiftwind", max: 3, costs: [36, 46, 56] },
    { id: "veteran", max: 1, costs: [50] },
    { id: "pathfinder", max: 1, costs: [50] },
  ],
};

const SAVE_VERSION = 3;

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
  resolveChoiceRanks(out);
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
  resolveChoiceRanks(out);
  return out;
}

function glorySpentCatalog(bag, nodes) {
  if (!bag || !nodes) return 0;
  let spent = 0;
  for (const n of nodes) {
    const lv = Math.max(0, Math.min(n.max, Math.floor(Number(bag[n.id]) || 0)));
    if (n.costs) {
      for (let i = 0; i < lv; i++) spent += n.costs[i] || 0;
    } else if (typeof n.cost === "function") {
      for (let i = 0; i < lv; i++) spent += n.cost(i);
    }
  }
  return spent;
}

function glorySpentOn(klass, bag) {
  return glorySpentCatalog(bag, prestigeNodes(klass));
}

function respecClassTrees(trees, klass) {
  const k = PRESTIGE_TREES[klass] ? klass : "warrior";
  const next = normalizeTrees(trees);
  const refund = glorySpentOn(k, next[k]);
  next[k] = emptyTrees()[k];
  return { trees: next, refund, klass: k };
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

function choiceSiblings(klass, node) {
  if (!node || !node.choice) return [];
  return prestigeNodes(klass).filter((n) => n.choice === node.choice && n.id !== node.id);
}

function choiceRival(node, prest, klass) {
  return choiceSiblings(klass, node).find((n) => (prest[n.id] || 0) > 0) || null;
}

function resolveChoiceRanks(trees) {
  for (const k of Object.keys(PRESTIGE_TREES)) {
    const bag = trees[k];
    if (!bag) continue;
    const groups = {};
    for (const n of PRESTIGE_TREES[k].nodes) {
      if (!n.choice) continue;
      if (!groups[n.choice]) groups[n.choice] = [];
      groups[n.choice].push(n);
    }
    for (const nodes of Object.values(groups)) {
      const ranked = nodes
        .filter((n) => (bag[n.id] || 0) > 0)
        .sort((a, b) => (bag[b.id] || 0) - (bag[a.id] || 0) || a.fork - b.fork);
      ranked.slice(1).forEach((n) => {
        bag[n.id] = 0;
      });
    }
  }
  return trees;
}

function prestReqMet(node, prest, klass) {
  if ((prest[node.id] || 0) > 0) return true;
  if (choiceRival(node, prest, klass)) return false;
  return (node.req || []).every((id) => (prest[id] || 0) >= parentRankNeed(klass, id));
}

function prestReqText(node, klass, prest) {
  const bits = [];
  if (node.req && node.req.length) {
    bits.push(
      node.req
        .map((id) => {
          const p = findPrestNode(klass, id);
          const need = parentRankNeed(klass, id);
          return (p ? p.name : id) + " " + need + "/" + need;
        })
        .join(" · ")
    );
  }
  if (prest) {
    const rival = choiceRival(node, prest, klass);
    if (rival) bits.push("Chose " + rival.name);
  }
  return bits.join(" · ");
}

function skillUnlockNode(klass, slot) {
  return prestigeNodes(klass).find((n) => n.unlockSkill === slot);
}

function treeGrantsSkill(klass, slot, bag) {
  const n = skillUnlockNode(klass, slot);
  return !!(n && bag && (bag[n.id] || 0) > 0);
}

function classHadRanks(bag) {
  if (!bag || typeof bag !== "object") return false;
  return Object.keys(bag).some((id) => (Number(bag[id]) || 0) > 0);
}

function migrateV2Trees(oldTrees) {
  const src = oldTrees && typeof oldTrees === "object" && !Array.isArray(oldTrees) ? oldTrees : {};
  const next = emptyTrees();
  let refund = 0;
  for (const k of Object.keys(PRESTIGE_TREES)) {
    const oldBag = src[k] && typeof src[k] === "object" ? src[k] : {};
    const oldSpent = glorySpentCatalog(oldBag, V2_TREES[k] || []);
    for (const n of PRESTIGE_TREES[k].nodes) {
      if (n.unlockSkill != null) continue;
      const rank = Math.floor(Number(oldBag[n.id]) || 0);
      if (rank > 0) next[k][n.id] = Math.max(0, Math.min(n.max, rank));
    }
    if (classHadRanks(oldBag)) {
      for (const n of PRESTIGE_TREES[k].nodes) {
        if (n.unlockSkill != null) next[k][n.id] = 1;
      }
    }
    resolveChoiceRanks(next);
    const kept = glorySpentOn(k, next[k]);
    refund += Math.max(0, oldSpent - kept);
  }
  return { trees: normalizeTrees(next), refund };
}

function migrateSave(raw) {
  const src = raw && typeof raw === "object" ? raw : {};
  const klass = src.klass && PRESTIGE_TREES[src.klass] ? src.klass : "warrior";
  if (src.saveVersion >= SAVE_VERSION && src.trees) {
    return {
      glory: src.glory || 0,
      bestWave: src.bestWave || 0,
      klass,
      trees: normalizeTrees(src.trees),
      refundNote: src.refundNote || 0,
    };
  }
  let glory = src.glory || 0;
  let refund = 0;
  if (isLegacyPrest(src.prest)) {
    const blood = glorySpentLegacy(src.prest);
    glory += blood;
    refund += blood;
  }
  if (src.trees && (src.saveVersion || 0) >= 2) {
    const mig = migrateV2Trees(src.trees);
    glory += mig.refund;
    refund += mig.refund;
    return {
      glory,
      bestWave: src.bestWave || 0,
      klass,
      trees: mig.trees,
      refundNote: refund,
    };
  }
  return {
    glory,
    bestWave: src.bestWave || 0,
    klass,
    trees: emptyTrees(),
    refundNote: refund,
  };
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
  const cap = n >= 21 ? 6 : 5;
  return Math.min(cap, Math.max(1, Math.ceil((n + 1) / 3.5)));
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
  // W1–3 stay near 1.0 so the first fights are readable.
  // W4–10 climb hard so Armory alone cannot stroll Stage 1.
  // W11–16 (early Stage 2) keep the 2-prestige mid-S2 bar.
  // W17–20 and W21+ kick harder so Mend + Armory cannot stroll to W40.
  const open = Math.min(w - 1, 3);
  const rise = Math.max(0, Math.min(w - 4, 6));
  const earlyMid = Math.max(0, Math.min(w - STAGE_LEN, 6));
  const lateMid = Math.max(0, Math.min(w - 16, 4));
  const late = Math.max(0, w - STAGE_LEN * 2);
  return {
    hp:
      Math.pow(1.024, open) *
      Math.pow(1.168, rise) *
      Math.pow(1.108, earlyMid) *
      Math.pow(1.16, lateMid) *
      Math.pow(1.28, late),
    dmg:
      Math.pow(1.02, open) *
      Math.pow(1.108, rise) *
      Math.pow(1.05, earlyMid) *
      Math.pow(1.085, lateMid) *
      Math.pow(1.16, late),
    gold: 1 + (w - 1) * 0.1,
  };
}

// Delay after spawning `wave` before the next pack. Early waves stay
// readable; mid Stage 1 starts stacking so pressure overlaps.
function nextWaveDelay(wave) {
  const w = Math.max(1, wave);
  // After wave 9 / 19 / … leave a beat so the boss is a set-piece,
  // not a pile-on top of leftover trash.
  if (w % 10 === 9) return 4.4;
  if (w <= 2) return 8.2;
  if (w <= 4) return 4.6;
  if (w <= 6) return 2.45;
  if (w <= 8) return 1.5;
  if (w <= 12) return 2.05;
  if (w <= 16) return 1.6;
  if (w <= 20) return 1.15;
  return 0.72;
}

function liveCap(wave) {
  const n = Math.max(0, wave);
  if (n < 4) return 3;
  if (n < 7) return 6;
  if (n < 10) return 6;
  if (n < 17) return 8;
  if (n < 21) return 10;
  return 12;
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

// Hero HUD / clamp only. World bars must not use this or late bosses
// label as 900/900 while real damage still lands.
const HERO_VITAL_CAP = 900;

function formatHpPair(hp, max, cap) {
  let m = Math.floor(Number(max));
  if (!Number.isFinite(m) || m < 1) m = 1;
  if (cap != null && Number.isFinite(cap) && m > cap) m = cap;
  let n = Math.floor(Number(hp));
  if (!Number.isFinite(n) || n < 0) n = 0;
  if (n > m) n = m;
  return { hp: n, max: m, text: n + "/" + m };
}

function heroHpPair(hp, max) {
  return formatHpPair(hp, max, HERO_VITAL_CAP);
}

function worldHpPair(hp, max) {
  return formatHpPair(hp, max, null);
}

function foeHpAt(type, wave) {
  const def = ENEMIES[type];
  if (!def) return 0;
  return def.hp * waveScale(wave).hp;
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
    spawnEdgeX,
    spawnIsPastView,
    rangedKeepFor,
    BOSS_GATE_PAD,
    bossHoldX,
    clampBossWorldX,
    roadRangeCap,
    clampCombatRange,
    RUN_UPGRADES,
    PRESTIGE_TREES,
    V2_TREES,
    SAVE_VERSION,
    goldCost,
    waveCount,
    isBossWave,
    bossTypeFor,
    waveRoster,
    waveScale,
    nextWaveDelay,
    liveCap,
    novaReachFor,
    novaFreezeFor,
    novaCdFor,
    allyHealAmount,
    HERO_VITAL_CAP,
    formatHpPair,
    heroHpPair,
    worldHpPair,
    foeHpAt,
    emptyTrees,
    normalizeTrees,
    migrateSave,
    migrateV2Trees,
    glorySpentOn,
    glorySpentCatalog,
    respecClassTrees,
    treeGrantsSkill,
    skillUnlockNode,
    prestReqMet,
    choiceRival,
    findPrestNode,
    prestigeNodes,
    prestigeTree,
  };
}
