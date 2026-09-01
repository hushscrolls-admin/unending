using UnityEngine;
using UnityEngine.UI;

namespace StyleTime
{
    public sealed class DollView
    {
        readonly Image _body;
        readonly Image _head;
        readonly Image _hair;
        readonly Image _eyeL;
        readonly Image _eyeR;
        readonly Image _freckleA;
        readonly Image _freckleB;
        readonly Image _freckleC;
        readonly Image _clothes;
        readonly Image _legs;
        readonly Image _shoes;
        readonly Image _bow;
        readonly RectTransform _root;

        public DollView(RectTransform parent)
        {
            _root = UiFactory.Panel(parent, "Doll", new Color(1, 1, 1, 0f), new Vector2(0.5f, 0.42f), new Vector2(0.5f, 0.42f), Vector2.zero, Vector2.zero, 8);
            _root.sizeDelta = new Vector2(360, 620);
            _root.GetComponent<Image>().raycastTarget = false;

            _legs = Layer("Legs", SpriteFactory.Rounded(48, 80, 20), new Vector2(0, -180), new Vector2(130, 220));
            _shoes = Layer("Shoes", SpriteFactory.Rounded(48, 32, 14), new Vector2(0, -300), new Vector2(150, 50));
            _body = Layer("Body", SpriteFactory.Rounded(64, 80, 28), new Vector2(0, -20), new Vector2(170, 250));
            _clothes = Layer("Clothes", SpriteFactory.Rounded(64, 80, 28), new Vector2(0, -30), new Vector2(186, 230));
            _head = Layer("Head", SpriteFactory.Circle(128), new Vector2(0, 190), new Vector2(180, 180));
            _hair = Layer("Hair", SpriteFactory.Circle(128), new Vector2(0, 230), new Vector2(210, 180));
            _eyeL = Layer("EyeL", SpriteFactory.Circle(32), new Vector2(-32, 188), new Vector2(28, 34));
            _eyeR = Layer("EyeR", SpriteFactory.Circle(32), new Vector2(32, 188), new Vector2(28, 34));
            _freckleA = Layer("F1", SpriteFactory.Circle(16), new Vector2(-36, 160), new Vector2(12, 12));
            _freckleB = Layer("F2", SpriteFactory.Circle(16), new Vector2(36, 160), new Vector2(12, 12));
            _freckleC = Layer("F3", SpriteFactory.Circle(16), new Vector2(0, 150), new Vector2(10, 10));
            _bow = Layer("Bow", SpriteFactory.Rounded(40, 28, 12), new Vector2(70, 250), new Vector2(56, 36));
        }

        public RectTransform Root => _root;

        public void Apply(AppearanceData appearance, OutfitData outfit)
        {
            if (appearance == null)
            {
                appearance = new AppearanceData();
            }

            if (outfit == null)
            {
                outfit = GameCatalog.StarterOutfit();
            }

            Color skin = GameCatalog.FindColor(GameCatalog.SkinTones, appearance.skinToneId).Color;
            Color hair = GameCatalog.FindColor(GameCatalog.HairColors, appearance.hairColorId).Color;
            Color eyes = GameCatalog.FindColor(GameCatalog.EyeColors, appearance.eyeColorId).Color;

            _body.color = skin;
            _head.color = skin;
            _legs.color = skin;
            _hair.color = hair;
            _eyeL.color = eyes;
            _eyeR.color = eyes;

            float freckle = appearance.Freckles == FrecklesAmount.None ? 0f : appearance.Freckles == FrecklesAmount.Light ? 0.45f : 0.8f;
            Color freckleColor = new Color(0.55f, 0.28f, 0.18f, freckle);
            _freckleA.color = freckleColor;
            _freckleB.color = freckleColor;
            _freckleC.color = freckleColor;

            ShapeHair(appearance.hairStyleId);

            bool pjs = outfit.wearingPyjamas;
            bool robe = outfit.wearingRobe && !pjs;
            if (pjs)
            {
                ClothingItem? item = GameCatalog.FindClothing(outfit.pyjamasId);
                Color c = item?.Color ?? UiTheme.Sky;
                _clothes.color = c;
                _legs.color = Color.Lerp(c, skin, 0.2f);
                _shoes.color = new Color(1, 1, 1, 0);
            }
            else if (robe)
            {
                ClothingItem? item = GameCatalog.FindClothing(outfit.robeId);
                _clothes.color = item?.Color ?? UiTheme.Cream;
                _shoes.color = new Color(1, 1, 1, 0);
            }
            else if (!string.IsNullOrEmpty(outfit.dressId))
            {
                ClothingItem? dress = GameCatalog.FindClothing(outfit.dressId);
                _clothes.color = dress?.Color ?? UiTheme.Gold;
                PaintBottomAndShoes(outfit, skin);
            }
            else
            {
                ClothingItem? top = GameCatalog.FindClothing(outfit.topId);
                _clothes.color = top?.Color ?? UiTheme.Blush;
                PaintBottomAndShoes(outfit, skin);
            }

            ClothingItem? bow = GameCatalog.FindClothing(outfit.hairAccessoryId);
            _bow.color = bow.HasValue ? bow.Value.Color : new Color(1, 1, 1, 0);
        }

        void PaintBottomAndShoes(OutfitData outfit, Color skin)
        {
            ClothingItem? bottom = GameCatalog.FindClothing(outfit.bottomId);
            _legs.color = bottom?.Color ?? Color.Lerp(skin, UiTheme.Lavender, 0.5f);
            ClothingItem? shoes = GameCatalog.FindClothing(outfit.shoesId);
            _shoes.color = shoes?.Color ?? Color.white;
        }

        void ShapeHair(string style)
        {
            var rt = _hair.rectTransform;
            switch (style)
            {
                case "ponytail":
                    rt.sizeDelta = new Vector2(170, 210);
                    rt.anchoredPosition = new Vector2(18, 236);
                    break;
                case "short":
                    rt.sizeDelta = new Vector2(186, 140);
                    rt.anchoredPosition = new Vector2(0, 228);
                    break;
                case "curly":
                    rt.sizeDelta = new Vector2(230, 200);
                    rt.anchoredPosition = new Vector2(0, 226);
                    break;
                default:
                    rt.sizeDelta = new Vector2(210, 170);
                    rt.anchoredPosition = new Vector2(0, 230);
                    break;
            }
        }

        Image Layer(string name, Sprite sprite, Vector2 pos, Vector2 size)
        {
            var image = UiFactory.Graphic(_root, name, sprite, Color.white);
            var rt = image.rectTransform;
            rt.anchorMin = rt.anchorMax = new Vector2(0.5f, 0.5f);
            rt.sizeDelta = size;
            rt.anchoredPosition = pos;
            return image;
        }
    }
}
