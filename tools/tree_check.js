#!/usr/bin/env node
/**
 * Prestige tree overhaul: virgin kits, unlocks, choice mutex, v2→v3 migrate.
 */
"use strict";

const {
  CLASSES,
  PRESTIGE_TREES,
  SAVE_VERSION,
  emptyTrees,
  migrateSave,
  migrateV2Trees,
  treeGrantsSkill,
  skillUnlockNode,
  prestReqMet,
  choiceRival,
  prestigeNodes,
  findPrestNode,
  glorySpentOn,
  respecClassTrees,
} = require("../js/content.js");

const FAIL = [];
function ok(cond, msg) {
  if (!cond) FAIL.push(msg);
}

ok(SAVE_VERSION === 3, "saveVersion is 3");

for (const id of ["warrior", "mage", "ranger"]) {
  const tree = PRESTIGE_TREES[id];
  const root = tree.nodes.find((n) => n.root);
  ok(!!root && root.max === 3 && (root.kind === "passive" || !root.unlockSkill), id + " root is a passive");
  const unlocks = [0, 1, 2].map((slot) => skillUnlockNode(id, slot));
  ok(unlocks.every(Boolean), id + " has unlock nodes for 1/2/3");
  ok(
    unlocks.every((n) => n.row >= 2 && (n.req || []).length > 0),
    id + " unlocks sit after a branch passive"
  );
  const virgin = emptyTrees()[id];
  ok(!treeGrantsSkill(id, 0, virgin) && !treeGrantsSkill(id, 1, virgin) && !treeGrantsSkill(id, 2, virgin), id + " virgin bag grants no skills");
  const groups = {};
  for (const n of tree.nodes) {
    if (!n.choice) continue;
    groups[n.choice] = groups[n.choice] || [];
    groups[n.choice].push(n);
  }
  ok(Object.keys(groups).length === 3, id + " has three choice groups");
  for (const [choice, nodes] of Object.entries(groups)) {
    ok(nodes.length >= 2, choice + " is a real fork");
    const bag = emptyTrees()[id];
    bag[nodes[0].id] = 1;
    ok(!!choiceRival(nodes[1], bag, id), choice + " locks siblings after a pick");
    ok(!prestReqMet(nodes[1], bag, id), choice + " rival cannot be bought");
  }
}

ok(CLASSES.warrior.skills[0].id === "mend", "Warrior 1 is still Mend");
ok(CLASSES.mage.skills[2].id === "nova", "Mage 3 is still Frost Nova");
ok(CLASSES.ranger.skills[2].id === "sic", "Ranger 3 is still Sic 'em");

const v2 = {
  warrior: { oath: 3, hide: 3, tempo: 2, purse: 1 },
  mage: { kindle: 3, cinder: 1 },
  ranger: {},
};
const mig = migrateV2Trees(v2);
ok(mig.trees.warrior.unlockmend === 1, "v2 warrior ranks grant Mend");
ok(mig.trees.warrior.unlockwhirl === 1, "v2 warrior ranks grant Whirlwind");
ok(mig.trees.warrior.unlockcharge === 1, "v2 warrior ranks grant Charge");
ok(mig.trees.warrior.oath === 3, "Oath remaps");
ok(mig.trees.mage.unlockinferno === 1, "v2 mage ranks grant Inferno");
ok(mig.trees.ranger.unlocksic === 0, "empty ranger tree stays locked");
ok(mig.refund >= 0, "v2 migrate never charges extra Glory");
const deep = migrateV2Trees({
  warrior: { oath: 3, bulwark: 3, warchest: 3, greed: 3 },
  mage: { kindle: 3, battery: 3, tempest: 3, fate: 3 },
  ranger: { trail: 3, aimedreach: 3, volleyplus: 3, looter: 3 },
});
ok(deep.refund > 40, "deep v2 leaves refund Glory for dropped nodes");

const both = migrateV2Trees({
  warrior: {},
  mage: {},
  ranger: { trail: 3, howl: 2, maul: 3 },
});
ok(both.trees.ranger.howl === 0 || both.trees.ranger.maul === 0, "Howl/Maul choice keeps one pick");
ok(both.trees.ranger.unlocksic === 1, "old wolf ranks still grant Sic 'em");

const fresh = migrateSave(null);
ok(fresh.glory === 0 && fresh.refundNote === 0, "empty save stays empty");
ok(!treeGrantsSkill("warrior", 0, fresh.trees.warrior), "new save does not unlock skills");

const v2save = migrateSave({
  saveVersion: 2,
  glory: 10,
  trees: { warrior: { oath: 3, hide: 1 }, mage: {}, ranger: {} },
  klass: "warrior",
});
ok(v2save.trees.warrior.unlockmend === 1, "saveVersion 2 warrior keeps the kit");
ok(v2save.glory >= 10, "banked Glory is kept");

const blood = migrateSave({
  saveVersion: 1,
  glory: 4,
  prest: { blood: 2, might: 1 },
  klass: "mage",
});
ok(blood.refundNote > 0 && blood.glory > 4, "Blood Tree still refunds Glory");
ok(!treeGrantsSkill("mage", 2, blood.trees.mage), "Blood Tree refund does not auto-unlock Nova");

const child = findPrestNode("warrior", "unlockmend");
const early = emptyTrees().warrior;
ok(!prestReqMet(child, early, "warrior"), "Mend stays locked until Hide is filled");
early.hide = 3;
ok(prestReqMet(child, early, "warrior"), "full Hide unlocks the Mend node");
ok(glorySpentOn("warrior", { oath: 1 }) === 2, "root still costs 2 Glory");

const mixed = emptyTrees();
mixed.warrior.oath = 3;
mixed.warrior.hide = 3;
mixed.mage.kindle = 3;
const warriorSpent = glorySpentOn("warrior", mixed.warrior);
const mageSpent = glorySpentOn("mage", mixed.mage);
ok(warriorSpent > 0 && mageSpent > 0, "spent Glory is counted per class");
const respecW = respecClassTrees(mixed, "warrior");
ok(respecW.refund === warriorSpent, "respec refunds only the current class spend");
ok(respecW.trees.warrior.oath === 0 && respecW.trees.warrior.hide === 0, "respec clears the current class");
ok(respecW.trees.mage.kindle === 3, "respec leaves other class trees untouched");
ok(!treeGrantsSkill("warrior", 0, respecW.trees.warrior), "respec returns the virgin kit on that class");
ok(glorySpentOn("mage", respecW.trees.mage) === mageSpent, "other class spend is unchanged");

if (FAIL.length) {
  console.error("tree_check failed:\n - " + FAIL.join("\n - "));
  process.exit(1);
}
console.log("tree_check ok");
console.log(
  JSON.stringify(
    {
      saveVersion: SAVE_VERSION,
      unlocks: Object.fromEntries(
        Object.keys(PRESTIGE_TREES).map((k) => [
          k,
          prestigeNodes(k)
            .filter((n) => n.unlockSkill != null)
            .map((n) => n.id),
        ])
      ),
      v2Refund: mig.refund,
    },
    null,
    2
  )
);
