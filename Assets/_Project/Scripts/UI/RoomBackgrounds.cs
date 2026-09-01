using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

namespace StyleTime
{
    public static class RoomBackgrounds
    {
        static readonly Dictionary<string, Sprite> Cache = new Dictionary<string, Sprite>();

        public static void Apply(Image target, RoomId room)
        {
            if (target == null)
            {
                return;
            }

            Sprite sprite = Load(ResourceName(room));
            if (sprite == null)
            {
                target.sprite = SpriteFactory.Rounded(16, 16, 2);
                target.color = UiTheme.RoomTint(room);
                target.type = Image.Type.Sliced;
                return;
            }

            target.sprite = sprite;
            target.color = Color.white;
            target.type = Image.Type.Simple;
            target.preserveAspect = false;
        }

        static string ResourceName(RoomId room)
        {
            switch (room)
            {
                case RoomId.Bedroom: return "Rooms/bedroom";
                case RoomId.Bathroom: return "Rooms/bathroom";
                case RoomId.Kitchen: return "Rooms/kitchen";
                case RoomId.Salon: return "Rooms/salon";
                default: return "Rooms/title";
            }
        }

        static Sprite Load(string resource)
        {
            if (Cache.TryGetValue(resource, out Sprite cached))
            {
                return cached;
            }

            var tex = Resources.Load<Texture2D>(resource);
            if (tex == null)
            {
                return null;
            }

            var sprite = Sprite.Create(tex, new Rect(0, 0, tex.width, tex.height), new Vector2(0.5f, 0.5f), 100f);
            sprite.name = resource;
            Cache[resource] = sprite;
            return sprite;
        }
    }
}
