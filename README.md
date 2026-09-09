# Unending

A pixel-art idle fighter with active abilities, a 50-wave campaign, and an endless road beyond it. One mercenary holds the left; melee enemies close in while archers, casters, healers, and assassins demand a different response.

## Play

From this folder:

```bash
python3 -m http.server 8765 --bind 127.0.0.1
```

Open <http://localhost:8765>. Keep using the same browser and address/port to retain saves. Choose **Resume saved run**, **Begin a new run**, or visit **Camp** to spend Glory before starting. Beginning a new run replaces the current run snapshot.

## The road

- Clear five chapters of ten waves. Each chapter changes enemy combinations; every tenth wave is a boss. Defeat The Sunfallen at wave 50 to complete the campaign, bank Glory, and choose camp or endless mode.
- Enemy approach distance is fixed, independent of screen width. Normal waves have an 18-second maximum timer, with a 14-enemy cap. Clearing the field brings the next wave in after two seconds. Bosses wait for the field to clear, prevent further spawns while alive, and grant five seconds of recovery afterward.
- **Call next** skips recovery when the field is clear. Boss kills grant gold, 15% health, and 20 mana.
- The Armory has three capped upgrades: Steel (damage), Resolve (HP and armor), and Tempo (attack speed). Buy one rank, up to five, or the maximum affordable amount. Optional auto-spending can balance purchases or prioritize a single stat. It spends actual run gold and can be turned off at any time.
- Every five cleared waves, combat pauses for a talent choice. Choose from up to three offers; equip at most four different talents, with three ranks each. Once all four are fully ranked, further talent milestones stop offering choices.
- Power Strike interrupts enemy healing. Charge closes on ranged enemies; Return moves home. Whirlwind hits on both sides, including assassins behind you.

## Prestige

Glory rewards progress, not waiting: one per cleared wave, eight extra per boss, ten permanent bonus Glory for each boss wave's first clear, and 50 for the first campaign completion. Ordinary run Glory is banked on death or campaign completion; continuing into endless cannot pay it twice.

Choose one active branch. Only its purchased bonuses apply:

| Branch | Minor ranks | Keystone after six minor ranks |
|---|---|---|
| Vanguard | Starting HP and armor | Return grants a temporary shield; 10s cooldown |
| Ravager | Starting HP and damage | Whirlwind causes a non-stacking, three-second bleed |
| Spellblade | Starting HP and mana regeneration | Mend empowers the next successful weapon strike |

Each minor node has three ranks; each keystone has one. All ranks can be refunded for their full purchase price between runs. Changing the selected branch is free. There is no repeatable Glory multiplier.

## Saves and controls

Active runs save every three seconds, at major choices, and when leaving or hiding the page. Resume retains enemies, projectiles, pickups, talents and their pending offers, gold, timers, and purchased ranks. Hiding the tab pauses combat; it does not grant offline progress. Death removes the run snapshot.

Legacy `unending-save-v1` progress migrates automatically: unspent Glory is retained and all legacy prestige spending is refunded. The original key is left intact. Legacy best wave is conservatively reduced by one because the old counter tracked waves entered. New data uses `unending-save-v2` and `unending-run-v2`.

| Input | Action |
|---|---|
| Click battlefield / Space | Power Strike |
| 1 | Mend: 25 mana, 4s cooldown |
| 2 | Whirlwind: 6s cooldown |
| 3 | Charge / Return |
| P | Pause / resume |
| N | Call next wave when clear |

Combat and purchases freeze during pause and talent selection. The death/completion recap reports build, damage sources, boss times, time without enemies, and purchase frequency. Expand **Combat stats** for current attributes.

## Validation and tuning

No build step or runtime dependencies. JavaScript syntax checks:

```bash
node --check js/content.js
node --check js/game.js
```

`node tools/balance.cjs` runs seeded simulations against the actual combat loop with DOM/audio/rendering stubbed out. It compares fresh and fully developed branches under an active ability policy, plus a passive baseline. These are tuning probes, not human playtests; the bot reacts immediately and buys frequently.

`tools/smoke.cjs` runs browser regression checks using a separately installed Playwright and Chromium. Serve the game on port 8766 (or set `GAME_URL`), make `playwright` available to Node (for example through `NODE_PATH`), and run:

```bash
node tools/smoke.cjs
```

Set `CHROMIUM_PATH` if Chromium is not `/usr/bin/chromium`. Tests use an isolated browser context and do not touch your normal browser saves. They check pause, combat, wave rewards, talent selection, prestige, caps, save/resume, legacy refunds, viewport pacing, and campaign/endless transitions. Screenshots are written under `/tmp/unending-*.png`.

Balance constants live in `js/content.js`; combat, persistence, and UI are in `js/game.js`. Campaign HP grows by 6.5% per wave, damage by 3%, and gold linearly by 14% of base per wave. Endless adds steeper HP/damage growth. Crit is capped at 35%, lifesteal at 8%, and area lifesteal is quarter-strength on actual health removed. Bleed does not trigger lifesteal.

## Art

Existing chunky pixel sprites and forest background are retained. Assets were generated and harvested into idle/attack/walk frames; see `assets/` and `tools/process_sprites.py`.
