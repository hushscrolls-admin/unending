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
- Wave 1 is a single raider. Pack size and enemy types grow from there: shields, berserkers, archers, mages, healers, assassins. Healers only patch allies in range with a modest drip (not a full-pack reset), and extra waves wait if the road is already crowded.
- Kills drop gold, mana, hearts, and short buffs (rage / haste).
- Spend gold in the Armory during the fight. A run starts with 14g, so the opening crate (10 / 11 / 12g) is a first-wave buy. The first raider still pays for a second pad before Wave 4. Later crates still open at 5 / 9 / 13 / 17. **Each class has its own Armory pool** — Warrior steel, Mage fire/mana, Ranger bow/wolf. There are no shared/tagged cross-class rows.
- **Click** the battlefield or press **Space** for the class strike. Mend / Cauterize / Field Dress flash when you (or the wolf) are low and the heal is ready. Cauterize shows a scorch, `CAUTERIZE` heal, and `IGNITE` on nearby foes.
- New waves march in on a timer even if the last pack is still alive. The gap grows as the wave number climbs.
- Every 10th wave is a unique boss: The Butcher, Ironhide, Skycleaver, Stormcaller, The Sunfallen (then they cycle).
- On death you keep Glory and spend it on **that class's prestige tree**. Then rise again as any class. Gold and run upgrades reset. Glory is shared; ranks are per class.

## Classes

| Class | Auto | Strike (Click / Space) | 1 | 2 | 3 |
|---|---|---|---|---|---|
| **Warrior** | Melee cleave (second target at half damage) | Power Strike — heavy hit, short stun, knockback | Mend (25 mana) | Whirlwind (6s, three hits both sides) | Charge / Return — trampling dash to the back line |
| **Fire Mage** | Firebolt + burn DoT | Fireball — explosion and a stronger burn | Cauterize (25 mana) — heal and ignite nearby foes | Inferno (8s) — three pulses of ground fire | Frost Nova (28 mana, 9s, 7s floor) — pack-scale freeze, not a full-map lock. Glassier than Warrior (84 HP, 1 armor) with a short early-wave ward. Faces the road (toward enemies). |
| **Ranger** | Bow shot | Aimed Shot — high burst, pierces two extras | Field Dress (25 mana) — heal you and the wolf (revives if down) | Volley (7s) — five arrows | Sic 'em (8s) — wolf leaps the back line and taunts melee |

The Ranger's wolf is a companion tank. Melee prefers the closer target; Sic 'em forces them onto the wolf for a few seconds. If the wolf falls, Field Dress or Sic 'em brings it back.

Class kits stay distinct. Armory and prestige only add flavor on top of those skills.

## Reach bars

Stages are 10 waves. Bosses are every 10th wave: The Butcher (10), Ironhide (20), Skycleaver (30), Stormcaller (40), The Sunfallen (50), then they cycle.

Design reach (Warrior is the floor; Mage / Ranger should also hit these without Nova cheese):

| Prestiges | Target |
|---|---|
| 0 | Stage 1, waves 6–8 |
| 1 (root filled after the first death) | 1st boss (wave 10) |
| 2 | mid Stage 2 (waves 14–16) |
| 3 | 2nd boss (wave 20) |

Frost Nova is a panic CC: pack-scale radius (capped well short of the spawn line), ~1.35s freeze, 9s cooldown with a 7s floor so Tempest / tree haste cannot make it spamable.

## Armory (per class)

Wave gates stay 1 / 5 / 9 / 13 / 17. The offered buys change with the class you rose as.

| Class | Wave 1 | Wave 5 | Wave 9 | Wave 13 | Wave 17 |
|---|---|---|---|---|---|
| **Warrior** | Iron, Swift, Vitality | Guard, Spoils | Leech, Cleave, Brace | Sharpen, Tempo, Rally | Champion, Rend |
| **Fire Mage** | Ember, Cadence, Ward | Well, Tithe | Long Cast, Cinder, Focus | Pyre, Tempest, Kindle | Echo, Infernal |
| **Ranger** | Bodkin, Swift, Vitality | Spoils, Stride | Edge, Longshot, Quiver | Sharpen, Echo, Track | Pack, Alpha |

## Prestige trees

Each class has its own tree. One **root** (3 ranks) must be filled before any branch opens. After that, **every rank** on a node must be filled before its children unlock. Glory costs climb as you go deeper.

| Class | Tree | Root | Branches (each forks after the old leaf) |
|---|---|---|---|
| **Warrior** | Iron Pact | Oath | Shield (Hide → … → Last Stand → Bulwark / Aegis → Fortress / Ironclad → Unbreakable / Bastion), Blade (Tempo → … → Bloodlust → Cleave Form / Deep Wounds → Whirl Master / Heavy Hand → War Master / Reaper), Spoils (Purse → … → Heirloom → War Chest / Scavenger → Quartermaster / Field Medic → Kingpin / Provisioner) |
| **Fire Mage** | Ember Court | Kindle | Pyre (Cinder → … → Wildfire → Conflagrate / Immolate → Kindling / Wider Fire → Phoenix / Living Bomb), Frost (Chill → … → Permafrost → Frostbite / Ice Lance → Glacial / Cold Snap → Winterheart / Rime), Well (Spark → … → Phylactery → Battery / Evocation → Sage / Spellweave → Archon / Ritualist) |
| **Ranger** | Wild Hunt | Trail | Bow (Edge → … → Marksman → Multishot / Headhunter → True Flight / Rain → Deadeye / Sharpshooter), Wolf (Pack → … → Alpha → Howl / Maul → Pack Bond / Dire → Huntsman / Alpha Aura), Stride (Stride → … → Keepsake → Camouflage / Looter → Trail Ward / Swift Wind → Veteran / Pathfinder) |

Rows 0–4 are the original path (1 / 2 / 3 prestige bars still land here). Rows 5–7 are expensive forks: two choices that do not require filling both, then a capstone on the path you picked. Glory costs climb with depth. Full ranks on a node still unlock its children.

Long Cast / Longshot / Track now extend **on-road** targeting and projectile travel. Base Mage / Ranger range sits short of the spawn line so extra range actually hits farther campers. Shots clamp at the playable road — they no longer fly into the shop / off-screen.

Pick **Rise as** on the death screen to browse that class's tree before you spend.

Ranks save to `localStorage` (`unending-save-v1`, `saveVersion: 2`) on every buy and survive die → Rise, `unending.jump(n)`, and reload. The Armory line lists owned ranks for the class you are playing.

### Save migration

Old overnight Blood Tree ranks are **refunded as Glory**, then the old shared tree is cleared. Banked unspent Glory is kept. The next run toasts the refund amount. New ranks live under `trees.warrior` / `trees.mage` / `trees.ranger`. Existing Glory is never wiped.

## Controls

| Input | Action |
|---|---|
| Click / Space | Class strike |
| 1 / 2 / 3 | Class skills (see table) |
| P | Pause |

The S / 1 / 2 / 3 cooldown strip sits above the control hint on the bottom left, away from the fighter.

## Art

Chunky 16-bit pixel sprites, chroma-keyed from generated stills and video-harvested idle/attack/walk frames. See `assets/` and `tools/process_sprites.py`.
