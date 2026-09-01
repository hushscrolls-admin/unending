using System;
using System.Collections.Generic;
using NUnit.Framework;

namespace StyleTime.Tests
{
    public class ChangeProblemTests
    {
        [Test]
        public void Change_IsTenderMinusPrice()
        {
            var problem = new ChangeProblem(1300, 2000);
            Assert.AreEqual(700, problem.ChangeCents);
            Assert.IsTrue(problem.IsCorrect(700));
            Assert.IsFalse(problem.IsCorrect(600));
        }

        [Test]
        public void Factory_AlwaysProducesSolvableChange()
        {
            foreach (DifficultyId difficulty in Enum.GetValues(typeof(DifficultyId)))
            {
                var rng = new Random(42);
                for (int i = 0; i < 80; i++)
                {
                    ChangeProblem problem = ChangeProblemFactory.Create(difficulty, rng);
                    Assert.Greater(problem.TenderCents, problem.PriceCents, difficulty.ToString());
                    Assert.GreaterOrEqual(problem.ChangeCents, 0);
                    Assert.IsTrue(problem.IsCorrect(problem.ChangeCents));
                }
            }
        }

        [Test]
        public void LittleStylist_ChoicesContainExactlyOneCorrectAnswer()
        {
            var rng = new Random(7);
            for (int i = 0; i < 40; i++)
            {
                ChangeProblem problem = ChangeProblemFactory.Create(DifficultyId.LittleStylist, rng);
                MultipleChoiceSet choices = ChangeProblemFactory.CreateChoices(problem, rng);
                Assert.AreEqual(3, choices.Options.Length);
                int matches = 0;
                for (int c = 0; c < choices.Options.Length; c++)
                {
                    if (choices.Options[c].TotalCents == problem.ChangeCents)
                    {
                        matches += 1;
                        Assert.AreEqual(c, choices.CorrectIndex);
                    }
                }

                Assert.AreEqual(1, matches);
                var seen = new HashSet<int>();
                foreach (MoneyPile pile in choices.Options)
                {
                    Assert.IsTrue(seen.Add(pile.TotalCents), "Duplicate pile amount");
                }
            }
        }

        [Test]
        public void ShopMaths_CanUseQuarterIncrements()
        {
            var rng = new Random(99);
            bool sawCents = false;
            for (int i = 0; i < 50; i++)
            {
                ChangeProblem problem = ChangeProblemFactory.Create(DifficultyId.ShopMaths, rng);
                if (problem.PriceCents % 100 != 0)
                {
                    sawCents = true;
                }

                Assert.AreEqual(0, problem.PriceCents % 25);
            }

            Assert.IsTrue(sawCents);
        }

        [Test]
        public void MoneyParse_WholeAndDecimal()
        {
            int cents;
            Assert.IsTrue(Money.TryParseWholeDollars("7", out cents));
            Assert.AreEqual(700, cents);
            Assert.IsTrue(Money.TryParseDollarsAndCents("5.50", out cents));
            Assert.AreEqual(550, cents);
            Assert.IsTrue(Money.TryParseDollarsAndCents("$12.05", out cents));
            Assert.AreEqual(1205, cents);
            Assert.IsFalse(Money.TryParseWholeDollars("5.50", out cents));
            Assert.IsFalse(Money.TryParseDollarsAndCents("1.234", out cents));
        }

        [Test]
        public void MoneyFormat_HidesCentsUntilShopMaths()
        {
            Assert.AreEqual("$7", Money.Format(700, DifficultyId.ChangeMaker));
            Assert.AreEqual("$7.50", Money.Format(750, DifficultyId.ShopMaths));
        }

        [Test]
        public void Tender_NeverUndershootsPrice()
        {
            var rng = new Random(3);
            for (int price = 100; price <= 4000; price += 125)
            {
                int tender = TenderGenerator.PickTender(price, DifficultyId.ShopMaths, rng);
                Assert.Greater(tender, price);
            }
        }
    }
}
