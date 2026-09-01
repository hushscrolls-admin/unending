using System;
using System.Globalization;

namespace StyleTime
{
    public static class Money
    {
        public const int Dollar = 100;

        public static readonly int[] CoinCents = { 1, 5, 10, 25 };
        public static readonly int[] NoteCents = { 100, 500, 1000, 2000, 5000 };
        public static readonly int[] WholeDollarCoins = { 100, 500, 1000, 2000 };

        public static bool ShowsCents(DifficultyId difficulty)
        {
            return difficulty == DifficultyId.ShopMaths;
        }

        public static string Format(int cents, DifficultyId difficulty)
        {
            return Format(cents, ShowsCents(difficulty));
        }

        public static string Format(int cents, bool showCents)
        {
            if (cents < 0)
            {
                return "-" + Format(-cents, showCents);
            }

            if (!showCents)
            {
                return "$" + (cents / Dollar).ToString(CultureInfo.InvariantCulture);
            }

            int dollars = cents / Dollar;
            int remainder = cents % Dollar;
            return "$" + dollars.ToString(CultureInfo.InvariantCulture) + "." + remainder.ToString("D2", CultureInfo.InvariantCulture);
        }

        public static bool TryParseWholeDollars(string text, out int cents)
        {
            cents = 0;
            if (string.IsNullOrWhiteSpace(text))
            {
                return false;
            }

            text = text.Trim();
            if (text.StartsWith("$", StringComparison.Ordinal))
            {
                text = text.Substring(1);
            }

            if (!int.TryParse(text, NumberStyles.Integer, CultureInfo.InvariantCulture, out int dollars))
            {
                return false;
            }

            if (dollars < 0 || dollars > 10000)
            {
                return false;
            }

            cents = dollars * Dollar;
            return true;
        }

        public static bool TryParseDollarsAndCents(string text, out int cents)
        {
            cents = 0;
            if (string.IsNullOrWhiteSpace(text))
            {
                return false;
            }

            text = text.Trim();
            if (text.StartsWith("$", StringComparison.Ordinal))
            {
                text = text.Substring(1);
            }

            int dot = text.IndexOf('.');
            if (dot < 0)
            {
                if (!int.TryParse(text, NumberStyles.Integer, CultureInfo.InvariantCulture, out int dollarsOnly))
                {
                    return false;
                }

                if (dollarsOnly < 0 || dollarsOnly > 10000)
                {
                    return false;
                }

                cents = dollarsOnly * Dollar;
                return true;
            }

            string dollarPart = text.Substring(0, dot);
            string centPart = text.Substring(dot + 1);
            if (dollarPart.Length == 0)
            {
                dollarPart = "0";
            }

            if (centPart.Length == 0 || centPart.Length > 2)
            {
                return false;
            }

            if (centPart.Length == 1)
            {
                centPart += "0";
            }

            if (!int.TryParse(dollarPart, NumberStyles.Integer, CultureInfo.InvariantCulture, out int dollars))
            {
                return false;
            }

            if (!int.TryParse(centPart, NumberStyles.Integer, CultureInfo.InvariantCulture, out int rem))
            {
                return false;
            }

            if (dollars < 0 || dollars > 10000 || rem < 0 || rem > 99)
            {
                return false;
            }

            cents = dollars * Dollar + rem;
            return true;
        }
    }
}
