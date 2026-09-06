#!/usr/bin/env node
/**
 * Prints the Scott reach table and fails if Nova or the curve drift.
 * Stage = 10 waves. Bosses on 10 / 20 / 30.
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
  novaReachFor,
  novaFreezeFor,
  novaCdFor,
} = require("../js/content.js");

const FAIL = [];
function assert(cond, msg) {
  if (!cond) FAIL.push(msg);
}

assert(STAGE_LEN === 10, "STAGE_LEN should be 10");
assert(isBossWave(10) && bossTypeFor(10) === "butcher", "wave 10 is The Butcher");
assert(isBossWave(20) && bossTypeFor(20) === "ironhide", "wave 20 is Ironhide");
assert(isBossWave(30) && bossTypeFor(30) === "skycleaver", "wave 30 is Skycleaver");

const spawnGap = 390;
const maxReach = novaReachFor(14 * 3);
const maxFreeze = novaFreezeFor(0.12 * 3 + 0.28);
const minCd = novaCdFor(0.08 * 12 + 0.06 * 3);

assert(NOVA.reach < spawnGap * 0.55, "base Nova reach must stay pack-scale, not spawn-line");
assert(maxReach <= NOVA.reachCap, "tree Nova reach must respect the cap");
assert(maxReach < spawnGap * 0.6, "maxed Nova still cannot cover the spawn line");
assert(NOVA.freeze <= 1.5, "base freeze is a panic, not a lock");
assert(maxFreeze < minCd - 3, "even maxed freeze must stay well below the CD floor");
assert(minCd >= NOVA.cdMin, "Tempest / tree haste cannot breach the Nova CD floor");
assert(CLASSES.mage.hp < CLASSES.warrior.hp, "Mage stays glassier than Warrior");
assert(CLASSES.mage.skills[2].cdMin === NOVA.cdMin, "skill spec carries the Nova CD floor");

const firstIron = goldCost(18, 1.38, 0, 10);
assert(firstIron <= 10, "opening crate should be a first-wave buy from the 14g start");

assert(CLASSES.mage.range < RANGE.spawnGap, "Mage base range must sit short of the spawn line");
assert(CLASSES.ranger.range < RANGE.spawnGap, "Ranger base range must sit short of the spawn line");
assert(CLASSES.mage.range > 240, "Mage base range should still hit W8 archers (~250 keep)");
assert(CLASSES.ranger.range >= 250, "Ranger base range should still contest W8 archers");
assert(clampCombatRange(900, 728) <= 728 - RANGE.roadPad, "combat range must clamp inside the road");
assert(clampCombatRange(CLASSES.mage.range + 24 * 8, 728) > CLASSES.mage.range, "range upgrades must still grow on the road");

for (const [id, tree] of Object.entries(PRESTIGE_TREES)) {
  const rows = tree.nodes.map((n) => n.row || 0);
  const deep = Math.max(...rows);
  const forks = tree.nodes.filter((n) => n.row === 5).length;
  assert(deep >= 7, id + " tree should reach row 7");
  assert(forks >= 6, id + " tree should fork at row 5 (two choices per branch)");
  assert(tree.nodes.filter((n) => n.root).length === 1, id + " keeps a single root");
}

const bars = [
  { label: "0 prestige  S1 W6–8", waves: [6, 7, 8], hpMax: 2.2, dmgMax: 1.55, packMax: 5 },
  { label: "1 prestige  1st boss W10", waves: [10], hpMax: 2.7, dmgMax: 1.75, packMax: 1 },
  { label: "2 prestige  mid S2 W14–16", waves: [14, 15, 16], hpMax: 5.4, dmgMax: 2.6, packMax: 5 },
  { label: "3 prestige  2nd boss W20", waves: [20], hpMax: 8.6, dmgMax: 3.5, packMax: 1 },
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

console.log("\nBar checks");
for (const bar of bars) {
  for (const n of bar.waves) {
    const sc = waveScale(n);
    const pack = waveRoster(n).length;
    const ok = sc.hp <= bar.hpMax && sc.dmg <= bar.dmgMax && pack <= bar.packMax;
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

if (FAIL.length) {
  console.error("\nFAILED\n" + FAIL.map((m) => " - " + m).join("\n"));
  process.exit(1);
}
console.log("\nbalance_check ok");
