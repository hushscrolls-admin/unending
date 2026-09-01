using System.Collections.Generic;
using UnityEngine;

namespace StyleTime
{
    public static class SpriteFactory
    {
        static readonly Dictionary<string, Sprite> Cache = new Dictionary<string, Sprite>();

        public static Sprite Rounded(int width, int height, int radius)
        {
            string key = "r:" + width + "x" + height + ":" + radius;
            if (Cache.TryGetValue(key, out Sprite existing))
            {
                return existing;
            }

            var tex = new Texture2D(width, height, TextureFormat.RGBA32, false)
            {
                wrapMode = TextureWrapMode.Clamp,
                filterMode = FilterMode.Bilinear,
                name = key
            };

            var pixels = new Color32[width * height];
            var on = new Color32(255, 255, 255, 255);
            var off = new Color32(255, 255, 255, 0);
            int r = Mathf.Clamp(radius, 0, Mathf.Min(width, height) / 2);

            for (int y = 0; y < height; y++)
            {
                for (int x = 0; x < width; x++)
                {
                    bool inside = InsideRounded(x, y, width, height, r);
                    pixels[y * width + x] = inside ? on : off;
                }
            }

            tex.SetPixels32(pixels);
            tex.Apply(false, true);
            var sprite = Sprite.Create(tex, new Rect(0, 0, width, height), new Vector2(0.5f, 0.5f), 100f, 0, SpriteMeshType.FullRect, new Vector4(r, r, r, r));
            sprite.name = key;
            Cache[key] = sprite;
            return sprite;
        }

        public static Sprite Circle(int size)
        {
            string key = "c:" + size;
            if (Cache.TryGetValue(key, out Sprite existing))
            {
                return existing;
            }

            var tex = new Texture2D(size, size, TextureFormat.RGBA32, false)
            {
                wrapMode = TextureWrapMode.Clamp,
                filterMode = FilterMode.Bilinear,
                name = key
            };

            var pixels = new Color32[size * size];
            float c = (size - 1) * 0.5f;
            float r = c - 0.5f;
            float r2 = r * r;
            var on = new Color32(255, 255, 255, 255);
            var off = new Color32(255, 255, 255, 0);

            for (int y = 0; y < size; y++)
            {
                for (int x = 0; x < size; x++)
                {
                    float dx = x - c;
                    float dy = y - c;
                    pixels[y * size + x] = dx * dx + dy * dy <= r2 ? on : off;
                }
            }

            tex.SetPixels32(pixels);
            tex.Apply(false, true);
            var sprite = Sprite.Create(tex, new Rect(0, 0, size, size), new Vector2(0.5f, 0.5f), 100f);
            sprite.name = key;
            Cache[key] = sprite;
            return sprite;
        }

        static bool InsideRounded(int x, int y, int w, int h, int r)
        {
            if (x >= r && x < w - r)
            {
                return true;
            }

            if (y >= r && y < h - r)
            {
                return true;
            }

            int cx = x < r ? r : w - 1 - r;
            int cy = y < r ? r : h - 1 - r;
            int dx = x - cx;
            int dy = y - cy;
            return dx * dx + dy * dy <= r * r;
        }
    }
}
