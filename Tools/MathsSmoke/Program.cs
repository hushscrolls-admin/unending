using System;
using StyleTime;

internal static class Program
{
    static int Main()
    {
        int failed = 0;
        failed += Check("change arithmetic", () =>
        {
            var p = new ChangeProblem(1300, 2000);
            return p.ChangeCents == 700 && p.IsCorrect(700) && !p.IsCorrect(600);
        });

        failed += Check("factory solvable", () =>
        {
            foreach (DifficultyId difficulty in Enum.GetValues(typeof(DifficultyId)))
            {
                var rng = new Random(42);
                for (int i = 0; i < 80; i++)
                {
                    ChangeProblem problem = ChangeProblemFactory.Create(difficulty, rng);
                    if (problem.TenderCents <= problem.PriceCents || !problem.IsCorrect(problem.ChangeCents))
                    {
                        return false;
                    }
                }
            }

            return true;
        });

        failed += Check("little stylist unique choice", () =>
        {
            var rng = new Random(7);
            for (int i = 0; i < 40; i++)
            {
                ChangeProblem problem = ChangeProblemFactory.Create(DifficultyId.LittleStylist, rng);
                MultipleChoiceSet choices = ChangeProblemFactory.CreateChoices(problem, rng);
                int matches = 0;
                for (int c = 0; c < choices.Options.Length; c++)
                {
                    if (choices.Options[c].TotalCents == problem.ChangeCents)
                    {
                        matches++;
                        if (c != choices.CorrectIndex)
                        {
                            return false;
                        }
                    }
                }

                if (matches != 1)
                {
                    return false;
                }
            }

            return true;
        });

        failed += Check("money parse", () =>
        {
            return Money.TryParseWholeDollars("7", out int a) && a == 700
                && Money.TryParseDollarsAndCents("$5.50", out int b) && b == 550
                && !Money.TryParseWholeDollars("5.50", out _)
                && Money.Format(750, DifficultyId.ShopMaths) == "$7.50"
                && Money.Format(700, DifficultyId.ChangeMaker) == "$7";
        });

        Console.WriteLine(failed == 0 ? "ALL PASSED" : failed + " FAILED");
        return failed == 0 ? 0 : 1;
    }

    static int Check(string name, Func<bool> body)
    {
        try
        {
            if (body())
            {
                Console.WriteLine("PASS  " + name);
                return 0;
            }

            Console.WriteLine("FAIL  " + name);
            return 1;
        }
        catch (Exception ex)
        {
            Console.WriteLine("FAIL  " + name + "  " + ex.Message);
            return 1;
        }
    }
}
