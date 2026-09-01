# Style Time

A kids salon / life-sim for Android and iOS. Create a stylist, work a three-day week of morning → salon → night, then spend a day off with friends.

Built in **Unity 6 LTS** (URP) with a **2.5D** presentation: a Blender doll later, painted 2D rooms now. Portrait, offline, no ads.

## Open the project

1. Install **Unity 6000.5.8f1** (or any Unity 6 LTS) via Unity Hub.
2. Add Android and iOS build support if you want device builds.
3. Open this folder as the project. First import will resolve URP.
4. Press Play on `Assets/Scenes/Boot.unity`.

The game builds its UI at runtime, so Play Mode works without extra scene setup.

On the salon customer screen, **Closing time** skips the 5-minute clock so you can test the night routine without waiting.

## Vertical slice (what plays today)

- Create a stylist (body, skin, hair, eyes, freckles, name, maths level)
- Morning: dress, brush teeth, cereal, leave
- Work: 5-minute salon, nails customers, make change at the chosen maths level
- Night: dinner, shower (clothed), teeth, pyjamas, sleep
- Save / continue across four local slots

Not in this slice yet: haircut / makeup / dye, the 3-day week + day off, shops, house editor, NPC friends, Blender hero doll.

## Maths levels

| Profile | Change-making |
|---|---|
| Little Stylist | Pick the pictured coin pile |
| Coin Counter | Tap coins until they equal the change |
| Change Maker | Type whole dollars |
| Shop Maths | Type dollars and cents |

## Blender doll (later)

Export a Unity Humanoid FBX, T-pose, 1 unit = 1 metre, same bind pose for hair and clothes. Slot names are already in `AppearanceData` / `OutfitData`. The stand-in UI doll uses those same ids.

## Safety

No online chat, no ads, no analytics. Shower uses a bathrobe. Saves stay on device.
