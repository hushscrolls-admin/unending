using System;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;

namespace StyleTime
{
    public sealed class StepMinigame : IMinigame
    {
        readonly Recipe _recipe;
        RectTransform _root;
        Text _prompt;
        Text _title;
        Slider _bar;
        Button _button;
        Text _buttonLabel;
        HoldRelay _hold;
        int _step;
        int _taps;
        float _held;
        bool _holding;
        Action<MinigameResult> _done;
        bool _finished;

        public StepMinigame(Recipe recipe)
        {
            _recipe = recipe;
        }

        public void Begin(RectTransform host, MonoBehaviour runner, MinigameContext context, Action<MinigameResult> onComplete)
        {
            _done = onComplete;
            _root = UiFactory.Panel(host, "StepMinigame", new Color(1, 1, 1, 0.92f), new Vector2(0.06f, 0.08f), new Vector2(0.94f, 0.62f), Vector2.zero, Vector2.zero, 40);
            _title = UiFactory.Label(_root, "Title", _recipe.Title, UiTheme.HeadingSize, UiTheme.Ink);
            UiFactory.PinTop(_title.rectTransform, 70, 20, 20);
            _prompt = UiFactory.Label(_root, "Prompt", "", UiTheme.BodySize, UiTheme.InkSoft);
            UiFactory.PinTop(_prompt.rectTransform, 120, 100, 28);
            _bar = UiFactory.Bar(_root, "Bar");
            var barRt = _bar.GetComponent<RectTransform>();
            barRt.anchorMin = new Vector2(0.12f, 0.42f);
            barRt.anchorMax = new Vector2(0.88f, 0.42f);
            barRt.pivot = new Vector2(0.5f, 0.5f);
            barRt.sizeDelta = new Vector2(0, 36);
            _button = UiFactory.Button(_root, "Act", "Go", UiTheme.Mint, OnTap, 130);
            UiFactory.PinBottom(_button.GetComponent<RectTransform>(), 130, 36, 48);
            _buttonLabel = _button.GetComponentInChildren<Text>();
            _hold = _button.gameObject.AddComponent<HoldRelay>();
            _hold.Down = () => _holding = true;
            _hold.Up = () => _holding = false;
            ShowStep();
        }

        public void Tick(float deltaTime)
        {
            if (_finished || _recipe == null || _step >= _recipe.Steps.Length)
            {
                return;
            }

            RecipeStep step = _recipe.Steps[_step];
            if (!step.HoldToFill || !_holding)
            {
                return;
            }

            _held += deltaTime;
            _bar.value = Mathf.Clamp01(_held / step.HoldSeconds);
            if (_held >= step.HoldSeconds)
            {
                Advance();
            }
        }

        public void Dispose()
        {
            if (_root != null)
            {
                UnityEngine.Object.Destroy(_root.gameObject);
                _root = null;
            }
        }

        void OnTap()
        {
            if (_finished)
            {
                return;
            }

            RecipeStep step = _recipe.Steps[_step];
            if (step.HoldToFill)
            {
                return;
            }

            _taps += 1;
            _bar.value = step.TapCount <= 1 ? 1f : (float)_taps / step.TapCount;
            if (_taps >= step.TapCount)
            {
                Advance();
            }
        }

        void Advance()
        {
            _step += 1;
            _taps = 0;
            _held = 0f;
            _holding = false;
            if (_step >= _recipe.Steps.Length)
            {
                _finished = true;
                _done?.Invoke(MinigameResult.Done(0, 1f));
                return;
            }

            ShowStep();
        }

        void ShowStep()
        {
            RecipeStep step = _recipe.Steps[_step];
            _prompt.text = step.Prompt;
            _buttonLabel.text = step.ButtonLabel;
            _bar.value = 0f;
            _bar.gameObject.SetActive(step.HoldToFill || step.TapCount > 1);
        }

        sealed class HoldRelay : MonoBehaviour, IPointerDownHandler, IPointerUpHandler, IPointerExitHandler
        {
            public Action Down;
            public Action Up;

            public void OnPointerDown(PointerEventData eventData)
            {
                Down?.Invoke();
            }

            public void OnPointerUp(PointerEventData eventData)
            {
                Up?.Invoke();
            }

            public void OnPointerExit(PointerEventData eventData)
            {
                Up?.Invoke();
            }
        }
    }
}
