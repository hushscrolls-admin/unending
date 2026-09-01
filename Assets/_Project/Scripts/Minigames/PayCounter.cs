using System;
using System.Collections.Generic;
using System.Text;
using UnityEngine;
using UnityEngine.UI;

namespace StyleTime
{
    public sealed class PayCounter : IMinigame
    {
        ChangeProblem _problem;
        DifficultyId _difficulty;
        RectTransform _root;
        Action<MinigameResult> _done;
        int _mistakes;
        int _maxMistakes = 3;
        bool _finished;
        int _trayTotal;
        readonly List<int> _tray = new List<int>();
        Text _status;
        Text _typed;
        Text _trayLabel;
        readonly StringBuilder _input = new StringBuilder();
        MultipleChoiceSet _choices;

        public void Prepare(ChangeProblem problem, DifficultyId difficulty)
        {
            _problem = problem;
            _difficulty = difficulty;
        }

        public void Begin(RectTransform host, MonoBehaviour runner, MinigameContext context, Action<MinigameResult> onComplete)
        {
            _done = onComplete;
            if (context != null)
            {
                _difficulty = context.Difficulty;
                _maxMistakes = context.MaxMistakes;
            }

            if (_problem == null)
            {
                _problem = ChangeProblemFactory.Create(_difficulty, new System.Random());
            }

            _root = UiFactory.Panel(host, "Pay", new Color(1, 1, 1, 0.96f), new Vector2(0.05f, 0.05f), new Vector2(0.95f, 0.78f), Vector2.zero, Vector2.zero, 40);
            string header = "That's " + Money.Format(_problem.PriceCents, _difficulty) +
                            ". They paid " + Money.Format(_problem.TenderCents, _difficulty) +
                            ". Give the change!";
            var title = UiFactory.Label(_root, "Title", header, UiTheme.BodySize, UiTheme.Ink);
            UiFactory.PinTop(title.rectTransform, 140, 16, 20);
            _status = UiFactory.Label(_root, "Status", "You can do this.", UiTheme.CaptionSize, UiTheme.InkSoft);
            UiFactory.PinTop(_status.rectTransform, 40, 150, 20);

            switch (_difficulty)
            {
                case DifficultyId.LittleStylist:
                    BuildChoices();
                    break;
                case DifficultyId.CoinCounter:
                    BuildCoinTray();
                    break;
                default:
                    BuildPad(_difficulty == DifficultyId.ShopMaths);
                    break;
            }
        }

        public void Tick(float deltaTime)
        {
        }

        public void Dispose()
        {
            if (_root != null)
            {
                UnityEngine.Object.Destroy(_root.gameObject);
                _root = null;
            }
        }

        void BuildChoices()
        {
            _choices = ChangeProblemFactory.CreateChoices(_problem, new System.Random());
            for (int i = 0; i < _choices.Options.Length; i++)
            {
                MoneyPile pile = _choices.Options[i];
                int captured = i;
                var btn = UiFactory.Button(_root, "Pile" + i, Describe(pile), UiTheme.Cream, () => Choose(captured), 150);
                var rt = btn.GetComponent<RectTransform>();
                rt.anchorMin = new Vector2(0.08f, 0.18f);
                rt.anchorMax = new Vector2(0.92f, 0.18f);
                rt.pivot = new Vector2(0.5f, 0);
                rt.sizeDelta = new Vector2(0, 150);
                rt.anchoredPosition = new Vector2(0, 20 + (2 - i) * 165);
            }
        }

        void BuildCoinTray()
        {
            _trayLabel = UiFactory.Label(_root, "Tray", "Your change: $0", UiTheme.HeadingSize, UiTheme.Ink);
            UiFactory.PinTop(_trayLabel.rectTransform, 60, 200, 20);

            int[] coins = { 100, 500, 1000, 2000 };
            string[] labels = { "$1", "$5", "$10", "$20" };
            for (int i = 0; i < coins.Length; i++)
            {
                int value = coins[i];
                var btn = UiFactory.Button(_root, "C" + value, labels[i], i % 2 == 0 ? UiTheme.Mint : UiTheme.Lavender, () => AddCoin(value), 120);
                var rt = btn.GetComponent<RectTransform>();
                rt.anchorMin = rt.anchorMax = new Vector2(0.5f, 0.42f);
                rt.sizeDelta = new Vector2(200, 120);
                rt.anchoredPosition = new Vector2(-330 + (i % 4) * 220, 40);
            }

            var submit = UiFactory.Button(_root, "Submit", "That's the change", UiTheme.Blush, SubmitTray, 110);
            UiFactory.PinBottom(submit.GetComponent<RectTransform>(), 110, 160, 48);
            var undo = UiFactory.Button(_root, "Undo", "Undo coin", UiTheme.Cream, UndoCoin, 90);
            UiFactory.PinBottom(undo.GetComponent<RectTransform>(), 90, 50, 48);
        }

        void BuildPad(bool decimals)
        {
            _typed = UiFactory.Label(_root, "Typed", "$", UiTheme.TitleSize, UiTheme.Ink);
            UiFactory.PinTop(_typed.rectTransform, 90, 200, 20);

            string[] keys = decimals
                ? new[] { "1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫" }
                : new[] { "1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "⌫" };

            for (int i = 0; i < keys.Length; i++)
            {
                string key = keys[i];
                var btn = UiFactory.Button(_root, "K" + key, key, UiTheme.Cream, () => Press(key, decimals), 100);
                var rt = btn.GetComponent<RectTransform>();
                int col = i % 3;
                int row = i / 3;
                rt.anchorMin = rt.anchorMax = new Vector2(0.5f, 0.52f);
                rt.sizeDelta = new Vector2(180, 100);
                rt.anchoredPosition = new Vector2((col - 1) * 200, 40 - row * 112);
            }

            var ok = UiFactory.Button(_root, "OK", "Give change", UiTheme.Mint, SubmitTyped, 110);
            UiFactory.PinBottom(ok.GetComponent<RectTransform>(), 110, 36, 48);
            RefreshTyped();
        }

        void Choose(int index)
        {
            if (_finished)
            {
                return;
            }

            if (index == _choices.CorrectIndex)
            {
                Finish(true);
                return;
            }

            RegisterMistake("Not quite. Try another pile.");
        }

        void AddCoin(int cents)
        {
            if (_finished)
            {
                return;
            }

            _tray.Add(cents);
            _trayTotal += cents;
            _trayLabel.text = "Your change: " + Money.Format(_trayTotal, false);
        }

        void UndoCoin()
        {
            if (_finished || _tray.Count == 0)
            {
                return;
            }

            int last = _tray[_tray.Count - 1];
            _tray.RemoveAt(_tray.Count - 1);
            _trayTotal -= last;
            _trayLabel.text = "Your change: " + Money.Format(_trayTotal, false);
        }

        void SubmitTray()
        {
            if (_finished)
            {
                return;
            }

            if (_problem.IsCorrect(_trayTotal))
            {
                Finish(true);
                return;
            }

            RegisterMistake("That total is not the change yet.");
        }

        void Press(string key, bool decimals)
        {
            if (_finished)
            {
                return;
            }

            if (key == "⌫")
            {
                if (_input.Length > 0)
                {
                    _input.Length -= 1;
                }
            }
            else if (key == "C")
            {
                _input.Length = 0;
            }
            else if (key == ".")
            {
                if (decimals && _input.ToString().IndexOf('.') < 0)
                {
                    _input.Append('.');
                }
            }
            else if (_input.Length < 8)
            {
                _input.Append(key);
            }

            RefreshTyped();
        }

        void RefreshTyped()
        {
            _typed.text = "$" + _input;
        }

        void SubmitTyped()
        {
            if (_finished)
            {
                return;
            }

            int cents;
            bool parsed = _difficulty == DifficultyId.ShopMaths
                ? Money.TryParseDollarsAndCents(_input.ToString(), out cents)
                : Money.TryParseWholeDollars(_input.ToString(), out cents);

            if (!parsed)
            {
                RegisterMistake("Type a number first.");
                return;
            }

            if (_problem.IsCorrect(cents))
            {
                Finish(true);
                return;
            }

            RegisterMistake("Not the right change. Try again.");
        }

        void RegisterMistake(string message)
        {
            _mistakes += 1;
            _status.text = message + " (" + _mistakes + "/" + _maxMistakes + ")";
            if (_mistakes >= _maxMistakes)
            {
                Finish(false);
            }
        }

        void Finish(bool success)
        {
            _finished = true;
            _done?.Invoke(success ? MinigameResult.Done(_mistakes, success ? 1f : 0f) : MinigameResult.Walkout(_mistakes));
        }

        static string Describe(MoneyPile pile)
        {
            return Money.Format(pile.TotalCents, false);
        }
    }
}
