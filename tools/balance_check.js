#!/usr/bin/env node
/**
 * Prints the Scott reach table and fails if Nova, tempo, or the curve drift.
 * Stage = 10 waves. Bosses on 10 / 20 / 30.
 * Pass 15: virgin Warrior must die around S1 W6–8, not stroll to W38.
 * Pass 15.1: 3-prestige must struggle at Ironhide and die soon after, not stroll to W40.
 */
const {
  CLASSES,
  ENEMIES,
  STAGE_LEN,
  NOVA,
  RANGE,
  PRESTIGE_TREES,
  clampCombatRange,
  goldCost,
  isBossWave,
  bossTypeFor,
  waveRoster,
  waveScale,
  nextWaveDelay,
  liveCap,
  novaReachFor,
  novaFreezeFor,
  novaCdFor,
} = require("../js/content.js");
const { runSuite, report } = require("./reach_sim.js");

const FAIL = [];
function assert(cond, msg) {
  if (!cond) FAIL.push(msg);
}

assert(STAGE_LEN === 10, "STAGE_LEN should be 10");
assert(isBossWave(10) && bossTypeFor(10) === "butcher", "wave 10 is The Butcher");
assert(isBossWave(20) && bossTypeFor(20) === "ironhide", "wave 20 is Ironhide");
assert(isBossWave(30) && bossTypeFor(30) === "skycleaver", "wave 30 is Skycleaver");

const spawnGap = 390;
const maxReach = novaReachFor(8 * 3);
const maxFreeze = novaFreezeFor(0.08 * 3 + 0.35);
const minCd = novaCdFor(0.08 * 12);

assert(NOVA.reach < spawnGap * 0.55, "base Nova reach must stay pack-scale, not spawn-line");
assert(maxReach <= NOVA.reachCap, "tree Nova reach must respect the cap");
assert(maxReach < spawnGap * 0.6, "maxed Nova still cannot cover the spawn line");
assert(NOVA.freeze <= 1.5, "base freeze is a panic, not a lock");
assert(maxFreeze < minCd - 3, "even maxed freeze must stay well below the CD floor");
assert(minCd >= NOVA.cdMin, "Tempest / tree haste cannot breach the Nova CD floor");
assert(CLASSES.mage.hp < CLASSES.warrior.hp, "Mage stays glassier than Warrior");
assert(CLASSES.mage.skills[2].cdMin === NOVA.cdMin, "skill spec carries the Nova CD floor");

const firstIron = goldCost(18, 1.38, 0, 8);
const firstWard = goldCost(22, 1.36, 0, 9);
assert(firstIron <= 8, "opening crate should be an 8g buy from the 24g start");
assert(firstIron + firstWard <= 24, "24g must buy damage + Ward/Vital before wave 1");

assert(CLASSES.mage.range < RANGE.spawnGap, "Mage base range must sit short of the spawn line");
assert(CLASSES.ranger.range < RANGE.spawnGap, "Ranger base range must sit short of the spawn line");
assert(CLASSES.mage.range > 240, "Mage base range should still hit W8 archers");
assert(CLASSES.ranger.range >= 250, "Ranger base range should still contest W8 archers");
assert(ENEMIES.archer.keep <= CLASSES.warrior.reach + 16, "archer keep stays inside Warrior melee");
assert(ENEMIES.mage.keep <= CLASSES.warrior.reach + 16, "enemy mage keep stays inside Warrior melee");
assert(CLASSES.ranger.skills[2].id === "sic", "Ranger 3 stays Sic 'em");
assert(CLASSES.ranger.skills[2].cd >= 12, "Sic 'em revive CD should leave a real down window");
const sicMaster = PRESTIGE_TREES.ranger.nodes.find((n) => n.id === "sicmaster");
assert(sicMaster && /revive/i.test(sicMaster.desc), "Sic Master should buff revive HP, not leap/taunt");
assert(clampCombatRange(900, 728) <= 728 - RANGE.roadPad, "combat range must clamp inside the road");
assert(clampCombatRange(CLASSES.mage.range + 24 * 8, 728) > CLASSES.mage.range, "range upgrades must still grow on the road");

for (const [id, tree] of Object.entries(PRESTIGE_TREES)) {
  const rows = tree.nodes.map((n) => n.row || 0);
  const deep = Math.max(...rows);
  const unlocks = tree.nodes.filter((n) => n.unlockSkill != null);
  const choices = new Set(tree.nodes.filter((n) => n.choice).map((n) => n.choice));
  assert(deep >= 6, id + " tree should reach row 6");
  assert(unlocks.length === 3, id + " grants abilities 1/2/3 as unlock nodes");
  assert(choices.size === 3, id + " has one mutually exclusive choice per branch");
  assert(tree.nodes.filter((n) => n.root).length === 1, id + " keeps a single root");
  assert(
    unlocks.every((n) => (n.req || []).length > 0 && !n.root),
    id + " unlocks sit after the root passive"
  );
}

assert(typeof nextWaveDelay === "function" && typeof liveCap === "function", "tempo helpers are exported");
assert(nextWaveDelay(8) < nextWaveDelay(2), "W8 packs arrive faster than W2");
assert(nextWaveDelay(6) < nextWaveDelay(4), "tempo tightens through mid Stage 1");
assert(nextWaveDelay(9) > nextWaveDelay(8), "pre-boss beat is longer than W8 stack delay");
assert(liveCap(3) <= 3, "W1–3 live cap stays small so the opener is readable");
assert(liveCap(6) >= 5, "mid Stage 1 live cap allows overlapping packs");
assert(ENEMIES.grunt.hp >= 38 && ENEMIES.grunt.dmg >= 8.5, "raider base is Pass-15 strong");
assert(ENEMIES.archer.keep === 100 && ENEMIES.mage.keep === 100, "ranged keep stays 100");

const bars = [
  { label: "learnable W1–3", waves: [1, 2, 3], hpMin: 1, hpMax: 1.12, dmgMin: 1, dmgMax: 1.08, packMax: 2 },
  { label: "0 prestige  S1 W6–8", waves: [6, 7, 8], hpMin: 1.35, hpMax: 2.2, dmgMin: 1.22, dmgMax: 1.72, packMax: 4 },
  { label: "1 prestige  1st boss W10", waves: [10], hpMin: 2.2, hpMax: 3.2, dmgMin: 1.7, dmgMax: 2.2, packMax: 1 },
  { label: "2 prestige  mid S2 W14–16", waves: [14, 15, 16], hpMin: 3.6, hpMax: 5.6, dmgMin: 2.1, dmgMax: 2.9, packMax: 5 },
  { label: "3 prestige  2nd boss W20", waves: [20], hpMin: 6.4, hpMax: 9.2, dmgMin: 2.7, dmgMax: 3.7, packMax: 1 },
  { label: "post-Ironhide W24", waves: [24], hpMin: 18, hpMax: 32, dmgMin: 5.2, dmgMax: 8.2, packMax: 6 },
];

console.log("Scott reach table (stage = 10 waves)\n");
console.log(
  "wave".padStart(4),
  "boss".padEnd(12),
  "pack",
  "hp×".padStart(6),
  "dmg×".padStart(6),
  "gold×".padStart(6),
  "roster"
);
for (let n = 1; n <= 30; n++) {
  const sc = waveScale(n);
  const roster = waveRoster(n);
  const boss = isBossWave(n) ? ENEMIES[bossTypeFor(n)].name : "";
  console.log(
    String(n).padStart(4),
    (boss || "").padEnd(12),
    String(roster.length).padStart(4),
    sc.hp.toFixed(2).padStart(6),
    sc.dmg.toFixed(2).padStart(6),
    sc.gold.toFixed(2).padStart(6),
    roster.join(",")
  );
}

console.log("\nNova");
console.log("  reach", NOVA.reach, "cap", maxReach, "spawn gap", spawnGap);
console.log("  freeze", NOVA.freeze, "maxed", maxFreeze.toFixed(2));
console.log("  cd", NOVA.cd, "floor", minCd, "at absurd haste");

console.log("\nTempo");
for (const n of [1, 3, 6, 8, 9, 10, 16, 18, 21]) {
  console.log("  W" + n, "delay", nextWaveDelay(n) + "s", "liveCap", liveCap(n));
}

console.log("\nBar checks");
for (const bar of bars) {
  for (const n of bar.waves) {
    const sc = waveScale(n);
    const pack = waveRoster(n).length;
    const lo = (!bar.hpMin || sc.hp >= bar.hpMin) && (!bar.dmgMin || sc.dmg >= bar.dmgMin);
    const hi = sc.hp <= bar.hpMax && sc.dmg <= bar.dmgMax && pack <= bar.packMax;
    const ok = lo && hi;
    console.log(
      " ",
      ok ? "ok" : "FAIL",
      bar.label,
      "W" + n,
      "hp",
      sc.hp.toFixed(2),
      "dmg",
      sc.dmg.toFixed(2),
      "pack",
      pack
    );
    assert(ok, bar.label + " W" + n + " drifted (hp " + sc.hp.toFixed(2) + " dmg " + sc.dmg.toFixed(2) + ")");
  }
}

console.log("\nReach sim (Warrior, Iron ASAP, Power Strike on CD)");
const suite = runSuite();
report("BEFORE  0 prestige", suite.virginBefore);
report("AFTER   0 prestige", suite.virginAfter);
report("AFTER   1p Oath+Hide", suite.p1);
report("AFTER   2p + Mend", suite.p2);
report("AFTER   3p + Mend", suite.p3);

const v0 = suite.virginAfter;
const before = suite.virginBefore;
assert(!before.deathWave || before.deathWave >= 16, "legacy virgin must still stroll past mid S2 (before snapshot)");
assert(v0.deathWave != null, "Pass 15 virgin must die");
assert(v0.deathWave >= 6 && v0.deathWave <= 9, "Pass 15 virgin dies around S1 W6–8 (got W" + v0.deathWave + ")");
assert((v0.hpAt[6] || 0) < v0.maxHp * 0.85, "virgin is already taking real damage by W6");
assert(v0.overlapAt != null && v0.overlapAt <= 6, "packs overlap by mid Stage 1");
assert((suite.p1.hpAt[10] || 0) > 0, "1 prestige reaches The Butcher");
assert(suite.p1.deathWave == null || suite.p1.deathWave >= 10, "1 prestige does not die before the first boss");
assert(suite.p1.deathWave != null && suite.p1.deathWave <= 13, "1 prestige dies soon after the first boss");
assert((suite.p2.hpAt[14] || 0) > 0, "2 prestige reaches mid Stage 2");
assert(suite.p2.deathWave != null && suite.p2.deathWave <= 18, "2 prestige dies around mid Stage 2");
assert((suite.p3.hpAt[20] || 0) > 0, "3 prestige reaches the second boss");
assert(suite.p3.deathWave != null, "3 prestige must die");
assert(
  suite.p3.deathWave >= 20 && suite.p3.deathWave <= 28,
  "3 prestige dies at/soon after Ironhide, not W40 (got W" + suite.p3.deathWave + ")"
);
assert(suite.p3.survived === false, "3 prestige does not stroll to the wave cap");
assert(nextWaveDelay(21) < nextWaveDelay(16), "Stage 3 packs arrive faster than mid Stage 2");
assert(liveCap(21) > liveCap(16), "Stage 3 live cap stacks more bodies than mid Stage 2");
assert(waveRoster(21).length === 6, "Stage 3 opens with 6-packs");
assert(ENEMIES.ironhide.hp >= 175 && ENEMIES.ironhide.dmg >= 16, "Ironhide is a real 3-prestige wall");

if (FAIL.length) {
  console.error("\nFAILED\n" + FAIL.map((m) => " - " + m).join("\n"));
  process.exit(1);
}
console.log("\nbalance_check ok");
