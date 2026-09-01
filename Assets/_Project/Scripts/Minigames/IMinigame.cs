using System;
using UnityEngine;

namespace StyleTime
{
    public readonly struct MinigameResult
    {
        public MinigameResult(bool success, int mistakes, float quality01)
        {
            Success = success;
            Mistakes = Mathf.Max(0, mistakes);
            Quality01 = Mathf.Clamp01(quality01);
        }

        public bool Success { get; }
        public int Mistakes { get; }
        public float Quality01 { get; }

        public static MinigameResult Walkout(int mistakes)
        {
            return new MinigameResult(false, mistakes, 0f);
        }

        public static MinigameResult Done(int mistakes, float quality)
        {
            return new MinigameResult(true, mistakes, quality);
        }
    }

    public sealed class MinigameContext
    {
        public DifficultyId Difficulty;
        public bool IsWorkJob;
        public string RequestId = "";
        public string Prompt = "";
        public int MaxMistakes = 3;
    }

    public interface IMinigame
    {
        void Begin(RectTransform host, MonoBehaviour runner, MinigameContext context, Action<MinigameResult> onComplete);
        void Tick(float deltaTime);
        void Dispose();
    }

    public sealed class RecipeStep
    {
        public string Prompt;
        public bool HoldToFill;
        public float HoldSeconds = 1.2f;
        public int TapCount = 1;
        public string ButtonLabel = "Go";
    }

    public sealed class Recipe
    {
        public string Id;
        public string Title;
        public RecipeStep[] Steps;
    }

    public static class Recipes
    {
        public static Recipe Cereal()
        {
            return new Recipe
            {
                Id = "cereal",
                Title = "Cereal",
                Steps = new[]
                {
                    new RecipeStep { Prompt = "Grab a bowl.", ButtonLabel = "Bowl", TapCount = 1 },
                    new RecipeStep { Prompt = "Pour the cereal.", ButtonLabel = "Pour", HoldToFill = true, HoldSeconds = 1.1f },
                    new RecipeStep { Prompt = "Add milk.", ButtonLabel = "Milk", HoldToFill = true, HoldSeconds = 1.0f },
                    new RecipeStep { Prompt = "Eat up!", ButtonLabel = "Spoon", TapCount = 5 }
                }
            };
        }

        public static Recipe Pasta()
        {
            return new Recipe
            {
                Id = "pasta",
                Title = "Pasta",
                Steps = new[]
                {
                    new RecipeStep { Prompt = "Boil the water.", ButtonLabel = "Boil", HoldToFill = true, HoldSeconds = 1.2f },
                    new RecipeStep { Prompt = "Add the pasta.", ButtonLabel = "Pasta", TapCount = 1 },
                    new RecipeStep { Prompt = "Stir the pot.", ButtonLabel = "Stir", TapCount = 4 },
                    new RecipeStep { Prompt = "Plate dinner.", ButtonLabel = "Plate", TapCount = 1 },
                    new RecipeStep { Prompt = "Time to eat!", ButtonLabel = "Fork", TapCount = 4 }
                }
            };
        }

        public static Recipe Shower()
        {
            return new Recipe
            {
                Id = "shower",
                Title = "Shower",
                Steps = new[]
                {
                    new RecipeStep { Prompt = "Wet down — keep the robe on.", ButtonLabel = "Water", HoldToFill = true, HoldSeconds = 1.3f },
                    new RecipeStep { Prompt = "Soap the dirt off arms, legs and face.", ButtonLabel = "Soap", TapCount = 6 },
                    new RecipeStep { Prompt = "Rinse the bubbles away.", ButtonLabel = "Rinse", HoldToFill = true, HoldSeconds = 1.3f },
                    new RecipeStep { Prompt = "Towel dry.", ButtonLabel = "Towel", HoldToFill = true, HoldSeconds = 1.0f },
                    new RecipeStep { Prompt = "Blow-dry your hair.", ButtonLabel = "Dryer", HoldToFill = true, HoldSeconds = 1.2f }
                }
            };
        }
    }
}
