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
- Every **10th wave** is a unique boss at the **end of the area**: The Butcher, Ironhide, Skycleaver, Stormcaller, The Sunfallen (then they cycle). Camp and boss HP chips show real `hp/max`. The hero HUD still clamps at 900.
- After the boss falls, walk through the gate into a **new biome** (Duskwood Road → Ember Wastes → Rime Pass → Storm Flats → Sunken Court). Living bosses cannot be knocked past that gate (Power Strike / Charge / Whirl).
- Kills grant gold immediately (it is not a walk-over). Hearts, mana, and short buffs (rage / haste) pop on the road, then magnet to the fighter — or to the wolf if it is closer — so Mage and Ranger collect them without walking. Warrior still picks them up by charging through, but is no longer the only class that benefits.
- Spend gold in the Armory during the fight. A run starts with **24g**, and the opening crate is **8 / 8 / 9g**, so Mage can buy Ember and Ward before Wave 1 lands. Later crates still open at 5 / 9 / 13 / 17. **Each class has its own Armory pool** — Warrior steel, Mage fire/mana, Ranger bow/wolf. There are no shared/tagged cross-class rows.
- **Click** the battlefield or press **Space** for the class strike. Mend / Cauterize / Field Dress flash when you (or a living wolf) are low and the heal is ready. Ranger **Sic 'em** flashes when the wolf is DOWN. Cauterize shows a scorch, `CAUTERIZE` heal, and `IGNITE` on nearby foes.
- A virgin run has only the class **auto-attack** and **super** (Click / Space). Abilities 1 / 2 / 3 stay locked until that class tree grants them.
- On death you keep Glory and spend it on **that class's prestige tree**. Then rise again as any class. Gold and run upgrades reset. Glory is shared; ranks are per class.

## Classes

| Class | Auto | Strike (Click / Space) | 1 | 2 | 3 |
|---|---|---|---|---|---|
| **Warrior** | Melee cleave (second target at half damage) | Power Strike — heavy hit, short stun, knockback | Mend (25 mana) | Whirlwind (6s, three hits both sides) | Charge / Return — trampling dash through the current camp |
| **Fire Mage** | Firebolt + burn DoT | Fireball — explosion and a stronger burn | Cauterize (25 mana) — heal and ignite nearby foes | Inferno (8s) — three pulses of ground fire | Frost Nova (28 mana, 9s, 7s floor) — pack-scale freeze, not a full-map lock. Glassier than Warrior (84 HP, 1 armor) with a short early-wave ward. Faces the road (toward enemies). |
| **Ranger** | Bow shot | Aimed Shot — high burst, pierces two extras | Field Dress (22 mana) — heal you and a living wolf | Volley (7s) — five arrows | Sic 'em (12s) — revive the wolf when it is DOWN |

The Ranger's wolf is a mortal companion tank. Melee and incoming shots can drop it. Field Dress patches you and a living wolf. **Sic 'em** is the revive — it does not leap or taunt. While the wolf is down you are glassier until 3 brings it back.

Class kits stay distinct. Armory still flavors the kit you have. Prestige **unlocks** 1 / 2 / 3, then improves them and offers unique mutations.

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

Each class has its own tree. One **root** (3 ranks, a passive) must be filled before any branch opens. After that, **every rank** on a node must be filled before its children unlock. Glory costs climb as you go deeper.

Trees start with **passives**, then **grant access** to abilities 1 / 2 / 3 as unlock nodes. Further nodes improve that ability. Some nodes are **choice nodes** — mutually exclusive (CC vs damage vs reduced cooldown / cost for the same skill).

| Class | Tree | Root | Branches |
|---|---|---|---|
| **Warrior** | Iron Pact | Oath | Shield (Hide → unlock **Mend** → Suture → Iron Mend / Rally Mend / Swift Mend), Blade (Tempo → unlock **Whirlwind** → Sweep → Shockwave / Maelstrom / Tempest), Vanguard (Purse → unlock **Charge** → Trample → Stampede / Breaker / Reckless) |
| **Fire Mage** | Ember Court | Kindle | Well (Spark → unlock **Cauterize** → Brand → Searing / Mending Flame / Emberflow), Pyre (Cinder → unlock **Inferno** → Blaze → Wildflare / Immolate / Flashfire), Frost (Chill → unlock **Frost Nova** → Nova Depth → Deep Freeze / Shatter / Cold Snap) |
| **Ranger** | Wild Hunt | Trail | Stride (Stride → unlock **Field Dress** → Poultice → Trail Ward / Deep Poultice / Quick Hands), Bow (Edge → unlock **Volley** → Rain → Pinning Volley / Broadhead / Rapid Fire), Wolf (Pack → unlock **Sic 'em** → Sic Master → Howl / Maul / Pack Recall) |

Choice nodes are one pick per group. Children of the unpicked options stay locked. Nova’s 7s cooldown floor still holds on the Cold Snap path.

Long Cast / Longshot / Track still extend **on-road** targeting and projectile travel. Base Mage / Ranger range sits short of the spawn line so extra range actually hits farther campers. Shots clamp at the playable road.

Pick **Rise as** on the death screen to browse that class's tree before you spend.

Ranks save to `localStorage` (`unending-save-v1`, `saveVersion: 3`) on every buy and survive die → Rise, `unending.jump(n)`, and reload. The Armory line lists owned ranks for the class you are playing.

### Save migration

`saveVersion` 3 rebuilds the class trees:

- Overnight Blood Tree ranks (`prest`) are still **refunded as Glory**.
- Pass-11 / `saveVersion` 2 ranks are **remapped** onto matching node ids (Oath, Hide, Kindle, Sic Master, …).
- If a class had any ranks, its three **ability unlocks** are granted so the old always-on kit does not vanish.
- Choice collisions (e.g. old Howl + Maul) keep the higher rank and drop the other.
- Glory spent on nodes that no longer exist, or that exceed the kept remap, is **refunded**. Banked unspent Glory is kept. Existing Glory is never wiped.
- The next run toasts the refund amount.

New ranks live under `trees.warrior` / `trees.mage` / `trees.ranger`.

## Controls

| Input | Action |
|---|---|
| Click / Space | Class strike |
| 1 / 2 / 3 | Class skills, once the class tree has unlocked that slot |
| P | Pause |

The S cooldown pip is always shown. 1 / 2 / 3 pips and Armory skill buttons stay locked until that class tree grants the slot.

Roadside deco is the same tree grammar in every biome: a trunk, a wide blocky canopy, then a theme accent. Duskwood and Ember add ember/flame tongues so the trees read as **on fire**, not as up-arrow chevrons. Rime gets snow caps, Storm a lightning tick, Sunken a gilt edge. WAIT stamps and HEAL RANGE are unchanged.

## Art

Chunky 16-bit pixel sprites, chroma-keyed from generated stills and video-harvested idle/attack/walk frames. See `assets/` and `tools/process_sprites.py`.
