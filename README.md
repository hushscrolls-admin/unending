# Unending

A 2D sidescrolling idle fighter. One mercenary on the left of the road. Hordes walk out of the trees. Gold buys steel. Death buys Glory.

Pick **Warrior**, **Fire Mage**, or **Ranger** on the title screen (or after a death). Inspired by the layout and upgrade-loop feel of *Magic Archery* (character planted left, auto-action, spend while you watch), with melee or ranged combat and a prestige restart.

## Play

Serve the folder (browsers block `file://` image loads in some setups):

```bash
python3 -m http.server 8765
```

Open `http://localhost:8765`.

## Loop

- The fighter holds the left. Melee walks in. Archers, casters, and healers keep a shorter distance than before so they stay on the road.
- Wave 1 is a single raider. Pack size and enemy types grow from there: shields, berserkers, archers, mages, healers, assassins. Healers only patch allies in range, and extra waves wait if the road is already crowded.
- Kills drop gold, mana, hearts, and short buffs (rage / haste).
- Spend gold in the Armory during the fight. Wave 1 only stocks Iron / Swift / Vitality. Guard and Fortune open at 5, leech / edge / reach at 9, Tempest / Cinder / Sharpen at 13, Echo / Pack at 17.
- **Click** the battlefield or press **Space** for the class strike.
- New waves march in on a timer even if the last pack is still alive. The gap grows as the wave number climbs.
- Every 10th wave is a unique boss: The Butcher, Ironhide, Skycleaver, Stormcaller, The Sunfallen (then they cycle).
- On death you keep Glory and spend it on the Blood Tree (Vital / Might / Fortune). Roots are the old flat bonuses; deeper nodes unlock charges, execute, thorns, splash, Last Stand, Bloodlust, and Heirloom. Then rise again as any class. Gold and run upgrades reset. Old Blood / Might / Purse / Greed / Spark / Fate ranks still apply.

## Classes

| Class | Auto | Strike (Click / Space) | 1 | 2 | 3 |
|---|---|---|---|---|---|
| **Warrior** | Melee cleave (second target at half damage) | Power Strike — heavy hit, short stun, knockback | Mend (25 mana) | Whirlwind (6s, three hits both sides) | Charge / Return — trampling dash to the back line |
| **Fire Mage** | Firebolt + burn DoT | Fireball — explosion and a stronger burn | Cauterize (25 mana) — heal and ignite nearby foes | Inferno (8s) — three pulses of ground fire | Frost Nova (28 mana, 7s) — freeze the pack |
| **Ranger** | Bow shot | Aimed Shot — high burst, pierces two extras | Field Dress (25 mana) — heal you and the wolf (revives if down) | Volley (7s) — five arrows | Sic 'em (8s) — wolf leaps the back line and taunts melee |

The Ranger's wolf is a companion tank. Melee prefers the closer target; Sic 'em forces them onto the wolf for a few seconds. If the wolf falls, Field Dress or Sic 'em brings it back.

## Blood Tree

Three branches. Old saves keep Blood / Might / Purse / Greed / Spark / Fate ranks.

| Branch | Path |
|---|---|
| **Vital** | Blood → Hide → Second Wind → Thorns → Last Stand |
| **Might** | Might → Tempo → Execute → Overkill → Bloodlust |
| **Fortune** | Purse → Greed → Spark → Fate → Heirloom |

## Controls

| Input | Action |
|---|---|
| Click / Space | Class strike |
| 1 / 2 / 3 | Class skills (see table) |
| P | Pause |

## Art

Chunky 16-bit pixel sprites, chroma-keyed from generated stills and video-harvested idle/attack/walk frames. See `assets/` and `tools/process_sprites.py`.
