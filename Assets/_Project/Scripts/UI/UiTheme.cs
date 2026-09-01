using UnityEngine;

namespace StyleTime
{
    public static class UiTheme
    {
        public static readonly Color Cream = Hex("FFF6EE");
        public static readonly Color Blush = Hex("F4A7B9");
        public static readonly Color Mint = Hex("A8E6CF");
        public static readonly Color Lavender = Hex("C3B1E1");
        public static readonly Color Ink = Hex("4A3F55");
        public static readonly Color InkSoft = Hex("7A6E86");
        public static readonly Color Panel = Hex("FFFBFF");
        public static readonly Color PanelShadow = new Color(0.29f, 0.25f, 0.33f, 0.18f);
        public static readonly Color Gold = Hex("E8C547");
        public static readonly Color Coral = Hex("E07070");
        public static readonly Color Sky = Hex("BFDFF0");
        public static readonly Color Night = Hex("2C2540");
        public static readonly Color White = Color.white;

        public const int TitleSize = 72;
        public const int HeadingSize = 44;
        public const int BodySize = 32;
        public const int CaptionSize = 24;
        public const int ButtonSize = 34;

        public static Font Font
        {
            get
            {
                if (_font == null)
                {
                    _font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
                    if (_font == null)
                    {
                        _font = Resources.GetBuiltinResource<Font>("Arial.ttf");
                    }
                }

                return _font;
            }
        }

        static Font _font;

        public static Color Hex(string hex)
        {
            ColorUtility.TryParseHtmlString("#" + hex, out Color color);
            return color;
        }

        public static Color RoomTint(RoomId room)
        {
            switch (room)
            {
                case RoomId.Bedroom: return Hex("F7D5E2");
                case RoomId.Bathroom: return Hex("D7EEF6");
                case RoomId.Kitchen: return Hex("F8E6C8");
                case RoomId.Salon: return Hex("E7D7F4");
                case RoomId.Creator: return Hex("E8F6EF");
                default: return Cream;
            }
        }
    }
}
