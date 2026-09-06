# Unending

A 2D sidescrolling idle fighter. One mercenary walks the road. Camps wait at fixed distances and only move when they come on screen. Gold buys steel. Death buys Glory.

Pick **Warrior**, **Fire Mage**, or **Ranger** on the title screen (or after a death). Auto-attacks and skills stay idle-fighter; the camera scrolls with the hero’s forward march. After each area boss the road opens into a new biome.

## Play

Serve the folder (browsers block `file://` image loads in some setups):

```bash
python3 -m http.server 8765
```

Open `http://localhost:8765`.

## Loop

- The fighter **walks forward**. The camera follows. You do not steer — you spend, strike, and use skills.
- Enemies sit at **static camps** along the road. They idle (WAIT) until they enter the wake line, then they aggro and fight.
- Wave 1–2 are a single raider. Waves 3–6 stay two grunts. Shields and the first 3-pack wait until 7; berserkers until 9. Healers only patch allies in range with a modest drip (not a full-pack reset).
- Every **10th wave** is a unique boss at the **end of the area**: The Butcher, Ironhide, Skycleaver, Stormcaller, The Sunfallen (then they cycle).
- After the boss falls, walk through the gate into a **new biome** (Duskwood Road → Ember Wastes → Rime Pass → Storm Flats → Sunken Court).
- Kills grant gold immediately (it is not a walk-over). Hearts, mana, and short buffs (rage / haste) pop on the road, then magnet to the fighter — or to the wolf if it is closer — so Mage and Ranger collect them without walking. Warrior still picks them up by charging through, but is no longer the only class that benefits.
- Spend gold in the Armory during the fight. A run starts with **24g**, and the opening crate is **8 / 8 / 9g**, so Mage can buy Ember and Ward before Wave 1 lands. Later crates still open at 5 / 9 / 13 / 17. **Each class has its own Armory pool** — Warrior steel, Mage fire/mana, Ranger bow/wolf. There are no shared/tagged cross-class rows.
- **Click** the battlefield or press **Space** for the class strike. Mend / Cauterize / Field Dress flash when you (or a living wolf) are low and the heal is ready. Ranger **Sic 'em** flashes when the wolf is DOWN. Cauterize shows a scorch, `CAUTERIZE` heal, and `IGNITE` on nearby foes.
- On death you keep Glory and spend it on **that class's prestige tree**. Then rise again as any class. Gold and run upgrades reset. Glory is shared; ranks are per class.

## Classes

| Class | Auto | Strike (Click / Space) | 1 | 2 | 3 |
|---|---|---|---|---|---|
| **Warrior** | Melee cleave (second target at half damage) | Power Strike — heavy hit, short stun, knockback | Mend (25 mana) | Whirlwind (6s, three hits both sides) | Charge / Return — trampling dash through the current camp |
| **Fire Mage** | Firebolt + burn DoT | Fireball — explosion and a stronger burn | Cauterize (25 mana) — heal and ignite nearby foes | Inferno (8s) — three pulses of ground fire | Frost Nova (28 mana, 9s, 7s floor) — pack-scale freeze, not a full-map lock. Glassier than Warrior (84 HP, 1 armor) with a short early-wave ward. Faces the road (toward enemies). |
| **Ranger** | Bow shot | Aimed Shot — high burst, pierces two extras | Field Dress (22 mana) — heal you and a living wolf | Volley (7s) — five arrows | Sic 'em (12s) — revive the wolf when it is DOWN |

The Ranger's wolf is a mortal companion tank. Melee and incoming shots can drop it. Field Dress patches you and a living wolf. **Sic 'em** is the revive — it does not leap or taunt. While the wolf is down you are glassier until 3 brings it back.

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
