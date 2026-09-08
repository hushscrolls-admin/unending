#!/usr/bin/env node
/**
 * Hero HUD stays clamped at 900. Enemy / world bars show real hp/max
 * so bosses above VITAL_CAP are not stuck at 900/900.
 */
"use strict";

const {
  HERO_VITAL_CAP,
  heroHpPair,
  worldHpPair,
  formatHpPair,
  foeHpAt,
} = require("../js/content.js");

const FAIL = [];
function ok(cond, msg) {
  if (!cond) FAIL.push(msg);
  else console.log("OK  ", msg);
}

ok(HERO_VITAL_CAP === 900, "HERO_VITAL_CAP stays 900 (do not reopen 9999 HUD)");

const heroFull = heroHpPair(1200, 1200);
ok(heroFull.text === "900/900", `hero 1200/1200 labels as 900/900, got ${heroFull.text}`);
ok(heroFull.hp === 900 && heroFull.max === 900, "hero pair values clamp to 900");

const heroHurt = heroHpPair(450, 2000);
ok(heroHurt.text === "450/900", `hero 450/2000 labels as 450/900, got ${heroHurt.text}`);

const heroNan = heroHpPair(NaN, Infinity);
ok(heroNan.text === "0/1", `hero NaN/Infinity sanitizes to 0/1, got ${heroNan.text}`);

const worldBoss = worldHpPair(1200, 1200);
ok(worldBoss.text === "1200/1200", `world 1200/1200 is unclamped, got ${worldBoss.text}`);
ok(worldBoss.hp === 1200 && worldBoss.max === 1200, "world pair keeps real values");

const skyHp = foeHpAt("skycleaver", 30);
ok(skyHp > HERO_VITAL_CAP, `Skycleaver w30 maxHp ${skyHp} exceeds hero vital cap`);
const skyLabel = worldHpPair(skyHp, skyHp);
const skyShown = Math.floor(skyHp);
ok(
  skyLabel.text === `${skyShown}/${skyShown}`,
  `Skycleaver label is ${skyShown}/${skyShown}, not 900/900 (got ${skyLabel.text})`
);
ok(skyLabel.text !== "900/900", "boss label is not stuck at 900/900");

const skyHurt = worldHpPair(skyHp - 80, skyHp);
ok(
  skyHurt.text === `${Math.floor(skyHp - 80)}/${skyShown}`,
  `damaged boss shows real remainder, got ${skyHurt.text}`
);

const lateHp = foeHpAt("stormcaller", 70);
ok(lateHp > 900, `Stormcaller w70 maxHp ${lateHp} exceeds 900`);
ok(worldHpPair(lateHp, lateHp).text !== "900/900", "late-wave boss is not 900/900");

const clampedWorld = formatHpPair(5000, 5000, 900);
ok(clampedWorld.text === "900/900", "formatHpPair still clamps when a cap is passed");

if (FAIL.length) {
  for (const msg of FAIL) console.error("FAIL", msg);
  console.error(FAIL.length + " hud check(s) failed");
  process.exit(1);
}
console.log("hud checks passed");
