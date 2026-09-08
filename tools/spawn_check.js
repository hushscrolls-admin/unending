#!/usr/bin/env node
/**
 * Playtest: trash packs must spawn past the camera/viewport right edge
 * (true off-screen), not at the old hero.x + 390 cap.
 *
 * Mirrors the walk-forward camera:
 *   camera = heroX - PLAYER_SCREEN_X
 *   viewRight = camera + viewW
 *   spawnX = viewRight + ROAD.spawnPad
 */
"use strict";

const { RANGE, ROAD, spawnEdgeX, spawnIsPastView } = require("../js/content.js");

const FAIL = [];
function ok(cond, msg) {
  if (!cond) FAIL.push(msg);
  else console.log("OK  ", msg);
}

const PLAYER_SCREEN_X = 220;
const VIEW_W = 1280;

function cameraFor(heroX) {
  return heroX - PLAYER_SCREEN_X;
}

function viewRightFor(heroX, viewW) {
  return cameraFor(heroX) + (viewW || VIEW_W);
}

function probe(heroX, viewW) {
  const w = viewW || VIEW_W;
  const camera = cameraFor(heroX);
  const viewRight = viewRightFor(heroX, w);
  const spawnX = spawnEdgeX(heroX, viewRight);
  return {
    heroX,
    camera,
    viewW: w,
    viewRight,
    spawnX,
    spawnDx: spawnX - heroX,
    spawnScreenX: spawnX - camera,
    oldCapX: heroX + RANGE.spawnGap,
    oldCapScreenX: heroX + RANGE.spawnGap - camera,
    pastCameraRight: spawnIsPastView(spawnX, viewRight),
    pastOldCap: spawnX > heroX + RANGE.spawnGap,
  };
}

ok(ROAD.spawnPad >= 64, "spawn pad is at least a body-width past the viewport");
ok(typeof spawnEdgeX === "function", "spawnEdgeX is exported");
ok(typeof spawnIsPastView === "function", "spawnIsPastView is exported");

const wave1 = probe(80, 1280);
ok(wave1.viewRight === 80 - 220 + 1280, "wave-1 viewRight is camera + W");
ok(wave1.spawnX === wave1.viewRight + ROAD.spawnPad, "spawn sits spawnPad past camera right");
ok(wave1.pastCameraRight, "wave-1 spawn X is past the camera right edge");
ok(wave1.spawnScreenX > VIEW_W, "wave-1 spawn screen X is off the canvas");
ok(wave1.pastOldCap, "wave-1 spawn is past the old hero+390 cap");
ok(wave1.oldCapScreenX < VIEW_W, "the old 390 cap was still on-canvas (the bug)");
ok(wave1.spawnDx > RANGE.spawnGap, "spawn dx is larger than the old 390 gap");

const walked = probe(500, 1280);
ok(walked.pastCameraRight, "after a walk-forward, spawn still clears camera right");
ok(walked.spawnX === walked.viewRight + ROAD.spawnPad, "spawn tracks the camera, not a world camp");
ok(walked.spawnDx > RANGE.spawnGap, "walk-forward spawn dx stays past the old cap");

const wide = probe(80, 1920);
ok(wide.spawnX > wide.viewRight, "wide viewport still spawns off the right edge");
ok(wide.spawnX > spawnEdgeX(80, viewRightFor(80, 1280)), "wider screens push spawn farther right");

const narrow = probe(80, 640);
ok(narrow.pastCameraRight, "narrow viewport still spawns past camera right");
ok(narrow.spawnX > narrow.heroX + RANGE.spawnGap, "even a 640-wide view beats hero+390");

ok(spawnEdgeX(80, 808) !== 80 + RANGE.spawnGap, "hero+390 cap is no longer applied");
ok(spawnIsPastView(80 + RANGE.spawnGap, viewRightFor(80, 1280)) === false, "hero+390 is left of camera right under walk-forward");

if (FAIL.length) {
  console.error("spawn_check failed:\n - " + FAIL.join("\n - "));
  process.exit(1);
}

console.log("spawn_check ok");
console.log(JSON.stringify({ wave1, walked, wide, narrow, pad: ROAD.spawnPad }, null, 2));
