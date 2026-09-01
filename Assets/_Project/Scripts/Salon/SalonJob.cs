using System;
using UnityEngine;

namespace StyleTime
{
    public sealed class SalonCustomer
    {
        public string Name;
        public ServiceType Service;
        public string RequestId;
        public string RequestLabel;
        public int BaseCostCents;
        public int TipCents;
        public int TenderCents;
        public int OfferCents => BaseCostCents + TipCents;
    }

    public static class SalonEconomy
    {
        public const int WorkDaySeconds = 300;
        public const int MaxMistakes = 3;

        public static SalonCustomer RollNailsCustomer(DifficultyId difficulty, System.Random rng)
        {
            NailColor color = GameCatalog.NailColors[rng.Next(GameCatalog.NailColors.Length)];
            int baseCost = BaseCost(difficulty, rng);
            float quality = 1f;
            int tip = RollTip(baseCost, quality, rng);
            int offer = baseCost + tip;
            int tender = TenderGenerator.PickTender(offer, difficulty, rng);

            return new SalonCustomer
            {
                Name = GameCatalog.CustomerFirstNames[rng.Next(GameCatalog.CustomerFirstNames.Length)],
                Service = ServiceType.Nails,
                RequestId = color.Id,
                RequestLabel = color.Label,
                BaseCostCents = baseCost,
                TipCents = tip,
                TenderCents = tender
            };
        }

        public static int RollTip(int baseCostCents, float quality01, System.Random rng)
        {
            quality01 = Mathf.Clamp01(quality01);
            int min = Mathf.Max(Money.Dollar, Mathf.RoundToInt(baseCostCents * 0.1f));
            int max = Mathf.Max(min + Money.Dollar, Mathf.RoundToInt(baseCostCents * 0.45f));
            int raw = rng.Next(min, max + 1);
            int scaled = Mathf.Max(Money.Dollar / 4, Mathf.RoundToInt(raw * Mathf.Lerp(0.45f, 1f, quality01)));
            if (scaled % 25 != 0)
            {
                scaled = Mathf.Max(25, (scaled / 25) * 25);
            }

            return scaled;
        }

        public static void ApplyQualityToOffer(SalonCustomer customer, float quality01, int leftoverMistakes, DifficultyId difficulty, System.Random rng)
        {
            float quality = Mathf.Clamp01(quality01 - leftoverMistakes * 0.25f);
            customer.TipCents = RollTip(customer.BaseCostCents, quality, rng);
            customer.TenderCents = TenderGenerator.PickTender(customer.OfferCents, difficulty, rng);
            if (customer.TenderCents <= customer.OfferCents)
            {
                customer.TenderCents = customer.OfferCents + 500;
            }
        }

        static int BaseCost(DifficultyId difficulty, System.Random rng)
        {
            switch (difficulty)
            {
                case DifficultyId.LittleStylist:
                    return rng.Next(2, 6) * Money.Dollar;
                case DifficultyId.CoinCounter:
                    return rng.Next(4, 12) * Money.Dollar;
                case DifficultyId.ChangeMaker:
                    return rng.Next(8, 22) * Money.Dollar;
                default:
                    return rng.Next(6, 20) * Money.Dollar + rng.Next(0, 4) * 25;
            }
        }
    }

    public sealed class WorkDayClock
    {
        public WorkDayClock(float seconds)
        {
            Remaining = seconds;
            Duration = seconds;
        }

        public float Duration { get; }
        public float Remaining { get; private set; }
        public bool Expired => Remaining <= 0f;

        public void Tick(float deltaTime)
        {
            Remaining = Mathf.Max(0f, Remaining - deltaTime);
        }

        public string Label()
        {
            int total = Mathf.CeilToInt(Remaining);
            int m = total / 60;
            int s = total % 60;
            return m.ToString() + ":" + s.ToString("D2");
        }
    }
}
