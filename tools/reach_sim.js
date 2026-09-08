#!/usr/bin/env node
/**
 * Deterministic virgin-Warrior reach sim (Iron ASAP, Power Strike on CD).
 * Used by balance_check. Pass 15: should die around S1 W6–8, not stroll to W38.
 */
"use strict";

const {
  CLASSES,
  ENEMIES,
  ROAD,
  RANGE,
  RUN_UPGRADES,
  PRESTIGE_TREES,
  spawnEdgeX,
  rangedKeepFor,
  waveRoster,
  waveScale,
  nextWaveDelay,
  liveCap,
  isBossWave,
  goldCost,
} = require("../js/content.js");

const VIEW_W = 1280;
const PLAYER_SCREEN_X = 220;
const HOME_X = 80;
const START_GOLD = 24;
const DT = 1 / 30;
const STRIKE_CD = 1.35;
const STRIKE_MULT = 2.15;
const CLEAVE = 0.48;
const MAX_T = 420;

const LEGACY = {
  nextWaveDelay(wave) {
    const early = wave < 6 ? 6.8 : wave < 10 ? 3.0 : 0.6;
    return 8.2 + wave * 0.5 + early;
  },
  liveCap(n) {
    if (n < 6) return 3;
    if (n < 10) return 4;
    return 6;
  },
  waveScale(n) {
    const w = Math.max(1, n);
    const open = Math.min(w - 1, 4);
    const rise = Math.max(0, Math.min(w - 5, 5));
    const mid = Math.max(0, Math.min(w - 10, 10));
    const late = Math.max(0, w - 20);
    return {
      hp: Math.pow(1.015, open) * Math.pow(1.075, rise) * Math.pow(1.105, mid) * Math.pow(1.12, late),
      dmg: Math.pow(1.008, open) * Math.pow(1.038, rise) * Math.pow(1.055, mid) * Math.pow(1.065, late),
      gold: 1 + (w - 1) * 0.1,
    };
  },
  enemies: {
    grunt: { hp: 28, dmg: 5, armor: 0 },
    shield: { hp: 46, dmg: 4, armor: 5.5 },
    berserk: { hp: 26, dmg: 8, armor: 0 },
    archer: { hp: 20, dmg: 7, armor: 0 },
    mage: { hp: 18, dmg: 11, armor: 0 },
    healer: { hp: 22, dmg: 3, armor: 0 },
    assassin: { hp: 22, dmg: 4, armor: 0 },
    butcher: { hp: 90, dmg: 12, armor: 2 },
    ironhide: { hp: 110, dmg: 11, armor: 16 },
    skycleaver: { hp: 75, dmg: 12, armor: 1 },
    stormcaller: { hp: 70, dmg: 15, armor: 0 },
    sunfallen: { hp: 95, dmg: 10, armor: 3 },
  },
};

function dmgIn(raw, armor) {
  return Math.max(1, raw * (100 / (100 + armor * 8)));
}

function shopFor(klass) {
  return RUN_UPGRADES.filter((u) => u.klass === klass);
}

function applyPrestige(hero, ranks) {
  const tree = PRESTIGE_TREES.warrior;
  for (const [id, lv] of Object.entries(ranks || {})) {
    const node = tree.nodes.find((n) => n.id === id);
    if (node && node.apply && lv > 0) node.apply(hero, lv);
  }
}

function makeHero(ranks) {
  const c = CLASSES.warrior;
  const hero = {
    x: HOME_X,
    hp: c.hp,
    maxHp: c.hp,
    dmg: c.dmg,
    armor: c.armor,
    atkRate: c.atkRate,
    atkT: 0,
    reach: c.reach,
    walk: ROAD.heroWalk,
    leech: 0,
    goldFind: 1,
    strikeMult: 1,
    cleaveBonus: 0,
    skillHaste: 0,
    strikeCd: 0,
    mana: c.mana,
    maxMana: c.maxMana,
    manaRegen: c.manaRegen,
    skillUnlock: [false, false, false],
    mendAmp: 0,
  };
  applyPrestige(hero, ranks);
  hero.hp = hero.maxHp;
  return hero;
}

function buyIronAsap(state) {
  const shop = shopFor("warrior");
  const iron = shop.find((u) => u.id === "w_iron");
  const rest = shop.filter((u) => u.id !== "w_iron");
  const tryBuy = (u) => {
    const unlock = u.unlockWave || 1;
    if (Math.max(1, state.wave) < unlock) return false;
    const lv = state.levels[u.id] || 0;
    const cost = u.cost(lv);
    if (state.gold < cost) return false;
    state.gold -= cost;
    state.levels[u.id] = lv + 1;
    u.apply(state.hero);
    state.boughtAny = true;
    return true;
  };
  let bought = 0;
  while (tryBuy(iron)) bought += 1;
  for (const u of rest) {
    if (tryBuy(u)) bought += 1;
  }
  return bought;
}

function viewRight(heroX) {
  return heroX - PLAYER_SCREEN_X + VIEW_W;
}

function spawnX(heroX) {
  return spawnEdgeX(heroX, viewRight(heroX));
}

function simulate(opts) {
  const ranks = (opts && opts.ranks) || {};
  const useLegacy = !!(opts && opts.legacy);
  const scaleFn = useLegacy ? LEGACY.waveScale : waveScale;
  const delayFn = useLegacy ? LEGACY.nextWaveDelay : nextWaveDelay;
  const capFn = useLegacy ? LEGACY.liveCap : liveCap;
  const baseOf = (type) => {
    const live = ENEMIES[type];
    const old = LEGACY.enemies[type] || {};
    if (!useLegacy) return live;
    return Object.assign({}, live, {
      hp: old.hp != null ? old.hp : live.hp,
      dmg: old.dmg != null ? old.dmg : live.dmg,
      armor: old.armor != null ? old.armor : live.armor,
    });
  };

  const hero = makeHero(ranks);
  const state = {
    hero,
    gold: START_GOLD,
    levels: {},
    boughtAny: false,
    wave: 0,
    waveTimer: 0.4,
    kills: 0,
    enemies: [],
    bolts: [],
    t: 0,
    peakWave: 0,
    peakLive: 0,
    overlapAt: null,
    hpAt: {},
  };

  buyIronAsap(state);

  function spawnWave(n) {
    const roster = waveRoster(n);
    const far = spawnX(hero.x);
    const sc = scaleFn(n);
    roster.forEach((type, i) => {
      const def = baseOf(type);
      state.enemies.push({
        type,
        def: ENEMIES[type],
        wave: n,
        x: far + i * ROAD.packSpread,
        hp: def.hp * sc.hp,
        maxHp: def.hp * sc.hp,
        dmg: def.dmg * sc.dmg,
        armor: def.armor,
        gold: (ENEMIES[type].gold || 0) * sc.gold,
        atkT: 0.35,
        cc: 0,
        plantX: null,
        enraged: false,
        stepped: false,
        healT: 0.5,
      });
    });
    state.wave = n;
    state.peakWave = Math.max(state.peakWave, n);
    state.waveTimer = isBossWave(n) ? 1e9 : delayFn(n);
    if (!state.hpAt[n]) state.hpAt[n] = hero.hp;
  }

  function fightBlocking() {
    const meleeReach = hero.reach + 16;
    return state.enemies.some((e) => {
      if (e.hp <= 0) return false;
      if (e.x <= hero.x - 100) return false;
      const gap = e.x - hero.x;
      if (e.def.projectile || e.def.heal) return gap < meleeReach - 6;
      return gap < ROAD.stopMelee;
    });
  }

  function livingMelee() {
    const r = hero.reach + 16;
    return state.enemies
      .filter((e) => e.hp > 0 && Math.abs(e.x - hero.x) <= r)
      .sort((a, b) => a.x - b.x);
  }

  function hitFoe(e, amount) {
    if (!e || e.hp <= 0) return;
    const d = dmgIn(amount, e.armor);
    e.hp -= d;
    if (hero.leech > 0) hero.hp = Math.min(hero.maxHp, hero.hp + d * hero.leech);
    if (e.hp <= 0) {
      state.kills += 1;
      state.gold += Math.floor(e.gold * hero.goldFind);
      buyIronAsap(state);
      if (e.def.boss) state.waveTimer = delayFn(state.wave);
    }
  }

  function swing(mult, extra) {
    const targets = livingMelee();
    if (!targets.length) return;
    const dmg = hero.dmg * mult;
    hitFoe(targets[0], dmg);
    if (targets[0] && extra && extra.stun) targets[0].cc = Math.max(targets[0].cc, extra.stun);
    if (targets[0] && extra && extra.knock) targets[0].x += extra.knock;
    if (targets[1] && extra && extra.cleave) {
      hitFoe(targets[1], dmg * extra.cleave * (1 + (hero.cleaveBonus || 0)));
    }
  }

  function hitHero(amount) {
    const d = dmgIn(amount, hero.armor);
    hero.hp -= d;
  }

  function tickWaves(dt) {
    if (isBossWave(state.wave) && state.enemies.some((e) => e.def.boss && e.hp > 0)) return;
    const live = state.enemies.filter((e) => e.hp > 0).length;
    state.peakLive = Math.max(state.peakLive, live);
    if (live >= 2 && state.enemies.some((e) => e.wave !== state.wave && e.hp > 0) && !state.overlapAt) {
      state.overlapAt = state.wave;
    }
    if (live >= capFn(state.wave)) {
      state.waveTimer = Math.max(state.waveTimer, 1.8);
      return;
    }
    state.waveTimer -= dt;
    if (state.waveTimer <= 0) spawnWave(state.wave + 1);
  }

  function maybeMend() {
    if (!hero.skillUnlock[0]) return;
    if (hero.mana < 25) return;
    if (hero.hp > hero.maxHp * 0.45) return;
    hero.mana -= 25;
    hero.hp = Math.min(hero.maxHp, hero.hp + hero.maxHp * (0.28 + (hero.mendAmp || 0)));
  }

  while (state.t < MAX_T && hero.hp > 0 && state.wave < 40) {
    const dt = DT;
    state.t += dt;
    hero.strikeCd = Math.max(0, hero.strikeCd - dt);
    hero.mana = Math.min(hero.maxMana, hero.mana + hero.manaRegen * dt);
    tickWaves(dt);
    maybeMend();

    const melee = livingMelee();
    const ready = melee.length > 0;
    if (ready) {
      hero.atkT -= dt * hero.atkRate;
      if (hero.atkT <= 0) {
        hero.atkT = 1;
        swing(1, { cleave: CLEAVE });
      }
      if (hero.strikeCd <= 0 && melee.length) {
        hero.strikeCd = STRIKE_CD * Math.max(0.45, 1 - (hero.skillHaste || 0));
        swing(STRIKE_MULT * (hero.strikeMult || 1), { stun: 0.55, knock: 18, cleave: CLEAVE });
      }
    } else if (!fightBlocking()) {
      hero.x += hero.walk * dt;
    }

    for (const e of state.enemies) {
      if (e.hp <= 0) continue;
      e.cc = Math.max(0, e.cc - dt);
      if (e.def.enrage && !e.enraged && e.hp < e.maxHp * 0.45) {
        e.enraged = true;
        e.dmg *= 1.45;
      }
      if (e.def.shadowstep && !e.stepped && Math.abs(e.x - hero.x) < 220) {
        e.x = hero.x - 56;
        e.stepped = true;
      }
      if (e.cc > 0) continue;
      const ranged = !!(e.def.projectile || e.def.heal);
      const spd = e.def.speed;
      if (ranged) {
        const keep = rangedKeepFor(e.def);
        let desired = hero.x + keep;
        if (e.plantX == null && e.x <= desired + 12) e.plantX = e.x;
        const leash = (e.plantX != null ? e.plantX : desired) + ROAD.kiteLeash;
        desired = Math.min(desired, leash);
        if (e.x > desired + 8) e.x -= spd * dt;
        if (e.def.heal) {
          e.healT -= dt;
          if (e.healT <= 0) {
            e.healT = e.def.healRate;
            const hurt = state.enemies.find((o) => o !== e && o.hp > 0 && o.hp < o.maxHp - 1);
            const tgt = hurt || (e.hp < e.maxHp - 1 ? e : null);
            if (tgt) tgt.hp = Math.min(tgt.maxHp, tgt.hp + (e.def.heal || 0));
          }
        }
        if (e.def.projectile && Math.abs(e.x - hero.x) <= (e.def.atkRange || 380)) {
          e.atkT -= dt * e.def.atkRate;
          if (e.atkT <= 0) {
            e.atkT = 1;
            const shots = e.def.volley || 1;
            const dist = Math.abs(e.x - hero.x);
            const eta = dist / (e.def.projSpeed || 400);
            for (let i = 0; i < shots; i++) {
              state.bolts.push({ t: eta + i * 0.05, dmg: e.dmg });
            }
          }
        }
      } else {
        const closeIn = Math.max(56, hero.reach - 16);
        if (Math.abs(e.x - hero.x) > closeIn) {
          e.x += Math.sign(hero.x - e.x) * spd * dt;
        } else {
          e.atkT -= dt * e.def.atkRate;
          if (e.atkT <= 0) {
            e.atkT = 1;
            hitHero(e.dmg);
          }
        }
      }
    }

    for (const b of state.bolts) {
      b.t -= dt;
      if (b.t <= 0 && !b.hit) {
        hitHero(b.dmg);
        b.hit = true;
      }
    }
    state.bolts = state.bolts.filter((b) => !b.hit);

    state.enemies = state.enemies.filter((e) => e.hp > 0);
  }

  return {
    deathWave: hero.hp <= 0 ? state.wave : null,
    survived: hero.hp > 0,
    wave: state.wave,
    hp: Math.max(0, hero.hp),
    maxHp: hero.maxHp,
    dmg: hero.dmg,
    armor: hero.armor,
    atkRate: hero.atkRate,
    gold: state.gold,
    kills: state.kills,
    t: Math.round(state.t * 10) / 10,
    iron: state.levels.w_iron || 0,
    vital: state.levels.w_vital || 0,
    peakLive: state.peakLive,
    overlapAt: state.overlapAt,
    hpAt: state.hpAt,
    legacy: useLegacy,
  };
}

function report(label, res) {
  const reach = res.deathWave ? "died W" + res.deathWave : "alive W" + res.wave;
  console.log(
    label.padEnd(28),
    reach.padEnd(12),
    "hp",
    Math.round(res.hp) + "/" + Math.round(res.maxHp),
    "dmg",
    res.dmg.toFixed(1),
    "iron",
    res.iron,
    "kills",
    res.kills,
    "live",
    res.peakLive,
    "overlap",
    res.overlapAt || "—",
    "t",
    res.t + "s"
  );
  return res;
}

function runSuite() {
  const virginBefore = simulate({ legacy: true });
  const virginAfter = simulate({});
  const p1 = simulate({ ranks: { oath: 3, hide: 1 } });
  const p2 = simulate({ ranks: { oath: 3, hide: 3, unlockmend: 1 } });
  const p3 = simulate({
    ranks: { oath: 3, hide: 3, tempo: 3, unlockmend: 1, suture: 2 },
  });
  return { virginBefore, virginAfter, p1, p2, p3 };
}

if (require.main === module) {
  const suite = runSuite();
  console.log("Reach sim (Warrior, Iron ASAP, Power Strike on CD)\n");
  report("BEFORE  0 prestige", suite.virginBefore);
  report("AFTER   0 prestige", suite.virginAfter);
  report("AFTER   1p Oath 3", suite.p1);
  report("AFTER   2p Oath+Hide+Tempo", suite.p2);
  report("AFTER   3p + Mend", suite.p3);
  console.log("\nPass 15 target: virgin dies S1 W6–8. 1p ≥ W10. 2p mid S2. 3p W20.");
}

module.exports = { simulate, runSuite, report, LEGACY };
