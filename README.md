# Unending

A 2D sidescrolling idle fighter. One mercenary on the left of the road. Hordes walk out of the trees. Gold buys steel. Death buys Glory.

Inspired by the layout and upgrade-loop feel of *Magic Archery* (character planted left, auto-action, spend while you watch), with melee combat and a prestige restart.

## Play

Serve the folder (browsers block `file://` image loads in some setups):

```bash
python3 -m http.server 8765
```

Open `http://localhost:8765`.

## Loop

- The fighter holds the left. Melee walks to him. Archers and casters keep their distance.
- **3** Charge: dash to the back line and stay there fighting. Press again to jump home.
- Wave 1 is a single raider. Pack size and enemy types grow from there: shields, berserkers, archers, mages, healers, assassins.
- Kills drop gold, mana, hearts, and short buffs (rage / haste).
- Spend gold in the Armory during the fight.
- **Click** the battlefield or press **Space** for a Power Strike.
- **1** Mend (25 mana). **2** Whirlwind (6s, three hits on both sides).
- New waves march in on a timer even if the last pack is still alive. The gap grows as the wave number climbs.
- Every 10th wave is a unique boss: The Butcher, Ironhide, Skycleaver, Stormcaller, The Sunfallen (then they cycle).
- On death you keep Glory and buy permanent starting bonuses, then rise again. Gold and run upgrades reset.

## Controls

| Input | Action |
|---|---|
| Click / Space | Power Strike |
| 1 | Mend |
| 2 | Whirlwind (cooldown) |
| 3 | Charge / Return (toggle) |
| P | Pause |

## Art

Chunky 16-bit pixel sprites, chroma-keyed from generated stills and video-harvested idle/attack/walk frames. See `assets/` and `tools/process_sprites.py`.
