using System.Collections.Generic;
using UnityEngine;

namespace StyleTime
{
    public readonly struct CatalogColor
    {
        public CatalogColor(string id, string label, Color color)
        {
            Id = id;
            Label = label;
            Color = color;
        }

        public string Id { get; }
        public string Label { get; }
        public Color Color { get; }
    }

    public readonly struct ClothingItem
    {
        public ClothingItem(string id, string label, ClothingSlot slot, Color color, bool workLegal)
        {
            Id = id;
            Label = label;
            Slot = slot;
            Color = color;
            WorkLegal = workLegal;
        }

        public string Id { get; }
        public string Label { get; }
        public ClothingSlot Slot { get; }
        public Color Color { get; }
        public bool WorkLegal { get; }
    }

    public readonly struct NailColor
    {
        public NailColor(string id, string label, Color color)
        {
            Id = id;
            Label = label;
            Color = color;
        }

        public string Id { get; }
        public string Label { get; }
        public Color Color { get; }
    }

    public static class GameCatalog
    {
        public static readonly CatalogColor[] SkinTones =
        {
            new CatalogColor("porcelain", "Porcelain", Hex("F7D9C4")),
            new CatalogColor("peach", "Peach", Hex("E8B896")),
            new CatalogColor("honey", "Honey", Hex("C8885A")),
            new CatalogColor("amber", "Amber", Hex("A0663C")),
            new CatalogColor("bronze", "Bronze", Hex("7A4428")),
            new CatalogColor("deep", "Deep", Hex("4A2A1A"))
        };

        public static readonly CatalogColor[] HairColors =
        {
            new CatalogColor("black", "Black", Hex("1B1410")),
            new CatalogColor("brown", "Brown", Hex("5A3820")),
            new CatalogColor("auburn", "Auburn", Hex("8A3A22")),
            new CatalogColor("blonde", "Blonde", Hex("E2C06A")),
            new CatalogColor("ginger", "Ginger", Hex("D06830")),
            new CatalogColor("pink", "Pink", Hex("F4A7C0")),
            new CatalogColor("mint", "Mint", Hex("7ED9B8")),
            new CatalogColor("lavender", "Lavender", Hex("B7A0E0"))
        };

        public static readonly CatalogColor[] EyeColors =
        {
            new CatalogColor("brown", "Brown", Hex("5A3820")),
            new CatalogColor("hazel", "Hazel", Hex("7A6A30")),
            new CatalogColor("green", "Green", Hex("3E8A52")),
            new CatalogColor("blue", "Blue", Hex("4A7EC8")),
            new CatalogColor("grey", "Grey", Hex("7A8490")),
            new CatalogColor("violet", "Violet", Hex("7A58B0"))
        };

        public static readonly (string id, string label)[] HairStyles =
        {
            ("bob", "Bob"),
            ("ponytail", "Ponytail"),
            ("short", "Short"),
            ("curly", "Curly")
        };

        public static readonly NailColor[] NailColors =
        {
            new NailColor("pink", "Pink", Hex("F4A7C0")),
            new NailColor("teal", "Teal", Hex("3CB8A9")),
            new NailColor("lilac", "Lilac", Hex("C3B1E1")),
            new NailColor("red", "Red", Hex("E05070")),
            new NailColor("sunshine", "Sunshine", Hex("F2D05A")),
            new NailColor("navy", "Navy", Hex("3A4E8C")),
            new NailColor("mint", "Mint", Hex("7ED9B8")),
            new NailColor("coral", "Coral", Hex("F08A70"))
        };

        public static readonly ClothingItem[] Clothes =
        {
            new ClothingItem("pjs_cloud", "Cloud pyjamas", ClothingSlot.Pyjamas, Hex("D7E8F8"), false),
            new ClothingItem("pjs_star", "Star pyjamas", ClothingSlot.Pyjamas, Hex("F8E6C8"), false),
            new ClothingItem("robe_cream", "Cream robe", ClothingSlot.Robe, Hex("F3E6D0"), false),
            new ClothingItem("tee_pink", "Pink tee", ClothingSlot.Top, Hex("F4A7B9"), true),
            new ClothingItem("tee_mint", "Mint tee", ClothingSlot.Top, Hex("A8E6CF"), true),
            new ClothingItem("skirt_denim", "Denim skirt", ClothingSlot.Bottom, Hex("6A88B8"), true),
            new ClothingItem("pants_lilac", "Lilac pants", ClothingSlot.Bottom, Hex("C3B1E1"), true),
            new ClothingItem("dress_sun", "Sun dress", ClothingSlot.Dress, Hex("F2D05A"), true),
            new ClothingItem("flats_white", "White flats", ClothingSlot.Shoes, Hex("F6F2EA"), true),
            new ClothingItem("trainers_teal", "Teal trainers", ClothingSlot.Shoes, Hex("3CB8A9"), true),
            new ClothingItem("clip_bow", "Hair bow", ClothingSlot.HairAccessory, Hex("F4A7B9"), true)
        };

        public static readonly string[] CustomerFirstNames =
        {
            "Mia", "Noah", "Ava", "Leo", "Ivy", "Sam", "Ruby", "Eli", "Nora", "Kai", "Lila", "Omar"
        };

        public static CatalogColor FindColor(IReadOnlyList<CatalogColor> list, string id)
        {
            for (int i = 0; i < list.Count; i++)
            {
                if (list[i].Id == id)
                {
                    return list[i];
                }
            }

            return list[0];
        }

        public static ClothingItem? FindClothing(string id)
        {
            for (int i = 0; i < Clothes.Length; i++)
            {
                if (Clothes[i].Id == id)
                {
                    return Clothes[i];
                }
            }

            return null;
        }

        public static NailColor FindNail(string id)
        {
            for (int i = 0; i < NailColors.Length; i++)
            {
                if (NailColors[i].Id == id)
                {
                    return NailColors[i];
                }
            }

            return NailColors[0];
        }

        public static string[] StarterClothingIds()
        {
            return new[]
            {
                "pjs_cloud", "robe_cream", "tee_pink", "tee_mint", "skirt_denim",
                "pants_lilac", "flats_white", "clip_bow"
            };
        }

        public static OutfitData StarterOutfit()
        {
            return new OutfitData
            {
                topId = "tee_pink",
                bottomId = "skirt_denim",
                shoesId = "flats_white",
                pyjamasId = "pjs_cloud",
                robeId = "robe_cream",
                dressId = "",
                hairAccessoryId = "",
                wearingPyjamas = true
            };
        }

        public static DifficultyInfo GetDifficulty(DifficultyId id)
        {
            switch (id)
            {
                case DifficultyId.LittleStylist:
                    return new DifficultyInfo(id, "Little Stylist", "Pick the matching coins. Big buttons and hints.");
                case DifficultyId.CoinCounter:
                    return new DifficultyInfo(id, "Coin Counter", "Tap coins until they add up to the change.");
                case DifficultyId.ChangeMaker:
                    return new DifficultyInfo(id, "Change Maker", "Type the change in whole dollars.");
                default:
                    return new DifficultyInfo(id, "Shop Maths", "Type the change with dollars and cents.");
            }
        }

        public static Color Hex(string hex)
        {
            ColorUtility.TryParseHtmlString("#" + hex, out Color color);
            return color;
        }
    }

    public readonly struct DifficultyInfo
    {
        public DifficultyInfo(DifficultyId id, string title, string blurb)
        {
            Id = id;
            Title = title;
            Blurb = blurb;
        }

        public DifficultyId Id { get; }
        public string Title { get; }
        public string Blurb { get; }
    }
}
