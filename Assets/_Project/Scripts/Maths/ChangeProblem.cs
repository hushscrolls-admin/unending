using System;
using System.Collections.Generic;

namespace StyleTime
{
    public sealed class ChangeProblem
    {
        public ChangeProblem(int priceCents, int tenderCents)
        {
            if (priceCents < 0)
            {
                throw new ArgumentOutOfRangeException(nameof(priceCents));
            }

            if (tenderCents < priceCents)
            {
                throw new ArgumentException("Tender must cover the price.", nameof(tenderCents));
            }

            PriceCents = priceCents;
            TenderCents = tenderCents;
        }

        public int PriceCents { get; }
        public int TenderCents { get; }
        public int ChangeCents => TenderCents - PriceCents;

        public bool IsCorrect(int answerCents)
        {
            return answerCents == ChangeCents;
        }
    }

    public sealed class MoneyPile
    {
        public MoneyPile(int totalCents, IReadOnlyList<int> pieces)
        {
            TotalCents = totalCents;
            Pieces = pieces;
        }

        public int TotalCents { get; }
        public IReadOnlyList<int> Pieces { get; }
    }

    public sealed class MultipleChoiceSet
    {
        public MultipleChoiceSet(MoneyPile[] options, int correctIndex)
        {
            Options = options;
            CorrectIndex = correctIndex;
        }

        public MoneyPile[] Options { get; }
        public int CorrectIndex { get; }
    }

    public static class ChangeProblemFactory
    {
        public static ChangeProblem Create(DifficultyId difficulty, Random rng)
        {
            if (rng == null)
            {
                throw new ArgumentNullException(nameof(rng));
            }

            int price = RollPrice(difficulty, rng);
            int tender = TenderGenerator.PickTender(price, difficulty, rng);
            return new ChangeProblem(price, tender);
        }

        public static ChangeProblem CreateWithPrice(DifficultyId difficulty, int priceCents, Random rng)
        {
            if (rng == null)
            {
                throw new ArgumentNullException(nameof(rng));
            }

            int tender = TenderGenerator.PickTender(priceCents, difficulty, rng);
            return new ChangeProblem(priceCents, tender);
        }

        public static MultipleChoiceSet CreateChoices(ChangeProblem problem, Random rng)
        {
            if (problem == null)
            {
                throw new ArgumentNullException(nameof(problem));
            }

            if (rng == null)
            {
                throw new ArgumentNullException(nameof(rng));
            }

            var amounts = new List<int> { problem.ChangeCents };
            AddDistinct(amounts, Math.Max(0, problem.ChangeCents - Money.Dollar));
            AddDistinct(amounts, problem.ChangeCents + Money.Dollar);
            AddDistinct(amounts, problem.PriceCents);
            AddDistinct(amounts, Math.Max(0, problem.TenderCents - problem.PriceCents - 500));
            AddDistinct(amounts, 100);
            AddDistinct(amounts, 500);

            while (amounts.Count < 3)
            {
                int bump = (rng.Next(2, 8)) * Money.Dollar;
                AddDistinct(amounts, problem.ChangeCents + bump);
            }

            var picked = new List<int> { problem.ChangeCents };
            var pool = new List<int>();
            for (int i = 0; i < amounts.Count; i++)
            {
                if (amounts[i] != problem.ChangeCents)
                {
                    pool.Add(amounts[i]);
                }
            }

            Shuffle(pool, rng);
            picked.Add(pool[0]);
            picked.Add(pool[1]);
            Shuffle(picked, rng);

            var options = new MoneyPile[3];
            int correct = 0;
            for (int i = 0; i < 3; i++)
            {
                options[i] = MakePile(picked[i]);
                if (picked[i] == problem.ChangeCents)
                {
                    correct = i;
                }
            }

            return new MultipleChoiceSet(options, correct);
        }

        public static MoneyPile MakePile(int totalCents)
        {
            var pieces = new List<int>();
            int remaining = totalCents;
            int[] denoms = remaining % Money.Dollar == 0
                ? Money.WholeDollarCoins
                : CombinedDenoms();

            for (int i = denoms.Length - 1; i >= 0; i--)
            {
                int d = denoms[i];
                while (remaining >= d)
                {
                    pieces.Add(d);
                    remaining -= d;
                    if (pieces.Count > 12)
                    {
                        break;
                    }
                }

                if (remaining == 0 || pieces.Count > 12)
                {
                    break;
                }
            }

            if (remaining > 0)
            {
                pieces.Add(remaining);
            }

            return new MoneyPile(totalCents, pieces);
        }

        static int RollPrice(DifficultyId difficulty, Random rng)
        {
            switch (difficulty)
            {
                case DifficultyId.LittleStylist:
                    return rng.Next(2, 9) * Money.Dollar;
                case DifficultyId.CoinCounter:
                    return rng.Next(3, 19) * Money.Dollar;
                case DifficultyId.ChangeMaker:
                    return rng.Next(8, 46) * Money.Dollar;
                case DifficultyId.ShopMaths:
                    return rng.Next(4, 29) * Money.Dollar + rng.Next(0, 4) * 25;
                default:
                    return 5 * Money.Dollar;
            }
        }

        static int[] CombinedDenoms()
        {
            return new[] { 1, 5, 10, 25, 100, 500, 1000, 2000, 5000 };
        }

        static void AddDistinct(List<int> list, int value)
        {
            if (value < 0)
            {
                return;
            }

            if (!list.Contains(value))
            {
                list.Add(value);
            }
        }

        static void Shuffle<T>(IList<T> list, Random rng)
        {
            for (int i = list.Count - 1; i > 0; i--)
            {
                int j = rng.Next(i + 1);
                T tmp = list[i];
                list[i] = list[j];
                list[j] = tmp;
            }
        }
    }

    public static class TenderGenerator
    {
        public static int PickTender(int priceCents, DifficultyId difficulty, Random rng)
        {
            if (rng == null)
            {
                throw new ArgumentNullException(nameof(rng));
            }

            int[] notes = difficulty == DifficultyId.LittleStylist
                ? new[] { 500, 1000, 2000 }
                : Money.NoteCents;

            var covering = new List<int>();
            for (int i = 0; i < notes.Length; i++)
            {
                if (notes[i] > priceCents)
                {
                    covering.Add(notes[i]);
                }
            }

            if (covering.Count == 0)
            {
                return priceCents + notes[notes.Length - 1];
            }

            if (rng.NextDouble() < 0.6 || covering.Count == 1)
            {
                return covering[0];
            }

            return covering[rng.Next(covering.Count)];
        }
    }
}
