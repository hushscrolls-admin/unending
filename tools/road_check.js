#!/usr/bin/env node
/**
 * Walk-forward road layout plus Pass 10 curve / Nova / tree guards.
 * Does not replace balance_check.js — it only asserts the road still sits
 * on top of that floor.
 */
"use strict";

const {
  CLASSES,
  ENEMIES,
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
  RUN_UPGRADES,
  PRESTIGE_TREES,
  goldCost,
  waveCount,
  isBossWave,
  bossTypeFor,
  waveRoster,
  waveScale,
} = require("../js/content.js");

const FAIL = [];
function ok(cond, msg) {
  if (!cond) FAIL.push(msg);
}

ok(STAGE_LEN === 10, "STAGE_LEN is 10");
ok(BIOMES.length >= 5, "five biomes cycle the road");
ok(BIOMES[0].id === "duskwood" && BIOMES[1].id === "ember", "Duskwood then Ember");
ok(biomeForStage(1).name === "Duskwood Road", "stage 1 is Duskwood Road");
ok(biomeForStage(2).name === "Ember Wastes", "stage 2 is Ember Wastes");
ok(biomeForStage(3).name === "Rime Pass", "stage 3 is Rime Pass");
ok(packWorldX(1, 1) > stageOriginX(1), "first pack sits ahead of the origin");
ok(packWorldX(1, 10) > packWorldX(1, 9), "boss sits past wave 9");
ok(gateWorldX(1) > packWorldX(1, 10), "gate sits past the boss");
ok(stageOriginX(2) === stageOriginX(1) + stageSpan(), "stage 2 starts after stage 1 span");
ok(stageIndex(10) === 1 && stageIndex(11) === 2, "stage index splits on 10/11");
ok(waveInStage(10) === 10 && waveInStage(11) === 1, "wave-in-stage wraps after the boss");
ok(isBossWave(10) && isBossWave(20) && !isBossWave(8), "boss every 10 waves");
ok(bossTypeFor(10) === "butcher", "wave 10 is The Butcher");
ok(waveRoster(1).join() === "grunt", "wave 1 is a single raider");
ok(waveRoster(10)[0] === "butcher", "wave 10 roster is The Butcher");
ok(waveRoster(20)[0] === "ironhide", "wave 20 roster is Ironhide");
ok(waveCount(1) >= 1 && waveCount(8) <= 4, "Pass 10 pack growth stays modest");

ok(ROAD.heroWalk >= 100, "hero march speed is a walk, not a sprint");
ok(ROAD.stopMelee < ROAD.stopRanged, "ranged holds farther than melee");
ok(ROAD.packGap > ROAD.firstGap, "later camps sit farther apart than the first");

ok(NOVA.reach === 172 && NOVA.reachCap === 220, "Nova stay pack-scale");
ok(NOVA.cd === 9 && NOVA.cdMin === 7 && NOVA.mana === 28, "Nova 9s / 7s floor / 28 mana");
ok(NOVA.reach < RANGE.spawnGap * 0.55, "base Nova cannot cover the old spawn line");
ok(CLASSES.mage.range === RANGE.mage && CLASSES.ranger.range === RANGE.ranger, "class ranges match RANGE");

const firstIron = goldCost(18, 1.38, 0, 8);
ok(firstIron === 8, "opening Iron crate is 8g");
ok(firstIron + goldCost(22, 1.36, 0, 9) <= 24, "24g still buys damage + Ward before wave 1");

const s8 = waveScale(8);
const oldHp = Math.pow(1.17, 7);
ok(s8.hp < oldHp * 0.7, "wave 8 HP is well below the old 1.17^n curve");
ok(s8.hp <= 1.55, "wave 8 stays inside the 0-prestige reach bar");
ok(waveScale(10).hp <= 1.85, "first boss stays inside the 1-prestige bar");
ok(waveScale(20).hp <= 4.9, "second boss stays inside the 3-prestige bar");

ok(ENEMIES.shield.armor <= 5.5, "shield armor is softened");
ok(ENEMIES.berserk.dmg <= 8, "berserker damage is softened");
ok(ENEMIES.butcher.dmg <= 12, "Butcher damage is softened");

ok(CLASSES.ranger.skills[2].id === "sic", "Ranger 3 stays Sic 'em");
ok(CLASSES.ranger.skills[2].cd >= 12, "Sic 'em revive CD leaves a down window");
ok(CLASSES.ranger.skills[0].id === "dress", "Ranger 1 stays Field Dress");

for (const [id, tree] of Object.entries(PRESTIGE_TREES)) {
  ok(tree.nodes.length >= 31, id + " tree is 31 nodes");
  ok(tree.branches.length === 3, id + " still has three branches");
  ok(Math.max(...tree.nodes.map((n) => n.row || 0)) >= 7, id + " reaches row 7");
  const shop = RUN_UPGRADES.filter((u) => u.klass === id);
  ok(shop.length >= 12, id + " has a full Armory pool");
}

ok(CLASSES.warrior.style === "melee", "Warrior is melee");
ok(CLASSES.mage.style === "ranged" && CLASSES.ranger.style === "ranged", "Mage/Ranger stay ranged");

if (FAIL.length) {
  console.error("road_check failed:\n - " + FAIL.join("\n - "));
  process.exit(1);
}

console.log("road_check ok");
console.log(
  JSON.stringify(
    {
      biomes: BIOMES.map((b) => b.name),
      firstPack: packWorldX(1, 1),
      bossX: packWorldX(1, 10),
      gate: gateWorldX(1),
      stage2Origin: stageOriginX(2),
      wave8: waveScale(8),
      wave20: waveScale(20),
      nova: NOVA,
      firstIron,
    },
    null,
    2
  )
);
