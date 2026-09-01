using System;
using UnityEngine;
using UnityEngine.UI;

namespace StyleTime
{
    public sealed class NailsMinigame : IMinigame
    {
        RectTransform _root;
        Image[] _nails;
        string[] _painted;
        string _chosen = "";
        string _requested;
        int _mistakes;
        int _maxMistakes = 3;
        bool _work;
        bool _finished;
        Action<MinigameResult> _done;
        Text _status;

        public void Begin(RectTransform host, MonoBehaviour runner, MinigameContext context, Action<MinigameResult> onComplete)
        {
            _done = onComplete;
            _requested = context != null && !string.IsNullOrEmpty(context.RequestId) ? context.RequestId : "teal";
            _work = context != null && context.IsWorkJob;
            _maxMistakes = context != null ? context.MaxMistakes : 3;
            NailColor want = GameCatalog.FindNail(_requested);
            int nailCount = context != null && context.Difficulty == DifficultyId.LittleStylist ? 6 : 10;

            _root = UiFactory.Panel(host, "Nails", new Color(1, 1, 1, 0.94f), new Vector2(0.05f, 0.06f), new Vector2(0.95f, 0.72f), Vector2.zero, Vector2.zero, 40);
            var title = UiFactory.Label(_root, "Title", "Paint nails " + want.Label + "!", UiTheme.HeadingSize, UiTheme.Ink);
            UiFactory.PinTop(title.rectTransform, 70, 12, 16);
            _status = UiFactory.Label(_root, "Status", "Pick the polish, then tap each nail.", UiTheme.CaptionSize, UiTheme.InkSoft);
            UiFactory.PinTop(_status.rectTransform, 50, 80, 20);

            var swatch = UiFactory.Graphic(_root, "Want", SpriteFactory.Rounded(40, 40, 16), want.Color);
            swatch.rectTransform.anchorMin = swatch.rectTransform.anchorMax = new Vector2(0.5f, 1);
            swatch.rectTransform.pivot = new Vector2(0.5f, 1);
            swatch.rectTransform.sizeDelta = new Vector2(90, 40);
            swatch.rectTransform.anchoredPosition = new Vector2(0, -128);

            _nails = new Image[nailCount];
            _painted = new string[nailCount];
            int perHand = nailCount / 2;
            BuildHand(-220, perHand, 0);
            BuildHand(220, nailCount - perHand, perHand);

            float paletteY = 130;
            for (int i = 0; i < GameCatalog.NailColors.Length; i++)
            {
                NailColor color = GameCatalog.NailColors[i];
                int captured = i;
                var btn = UiFactory.Button(_root, "Col" + color.Id, color.Label, color.Color, () => Pick(GameCatalog.NailColors[captured].Id), 72);
                var rt = btn.GetComponent<RectTransform>();
                rt.anchorMin = rt.anchorMax = new Vector2(0.5f, 0);
                rt.pivot = new Vector2(0.5f, 0);
                rt.sizeDelta = new Vector2(200, 72);
                int col = i % 4;
                int row = i / 4;
                rt.anchoredPosition = new Vector2(-330 + col * 220, paletteY + (1 - row) * 84);
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

        void BuildHand(float x, int count, int startIndex)
        {
            float spread = 160f;
            float origin = -spread * 0.5f;
            float step = count <= 1 ? 0 : spread / (count - 1);
            for (int i = 0; i < count; i++)
            {
                int index = startIndex + i;
                var nail = UiFactory.Graphic(_root, "Nail" + index, SpriteFactory.Rounded(28, 48, 14), new Color(0.95f, 0.86f, 0.8f), true);
                nail.rectTransform.anchorMin = nail.rectTransform.anchorMax = new Vector2(0.5f, 0.58f);
                nail.rectTransform.sizeDelta = new Vector2(56, 92);
                nail.rectTransform.anchoredPosition = new Vector2(x + origin + step * i, 0);
                var button = nail.gameObject.AddComponent<Button>();
                int captured = index;
                button.onClick.AddListener(() => Paint(captured));
                _nails[index] = nail;
            }
        }

        void Pick(string id)
        {
            _chosen = id;
            NailColor color = GameCatalog.FindNail(id);
            _status.text = "Using " + color.Label + " polish.";
        }

        void Paint(int index)
        {
            if (_finished)
            {
                return;
            }

            if (string.IsNullOrEmpty(_chosen))
            {
                _status.text = "Pick a polish colour first.";
                return;
            }

            if (_chosen != _requested)
            {
                _mistakes += 1;
                _painted[index] = "";
                _nails[index].color = new Color(0.95f, 0.86f, 0.8f);
                _status.text = "Oops! They wanted " + GameCatalog.FindNail(_requested).Label + ".";
                if (_work && _mistakes >= _maxMistakes)
                {
                    Finish(false);
                }

                return;
            }

            _painted[index] = _chosen;
            _nails[index].color = GameCatalog.FindNail(_chosen).Color;
            if (AllPainted())
            {
                Finish(true);
            }
        }

        bool AllPainted()
        {
            for (int i = 0; i < _painted.Length; i++)
            {
                if (_painted[i] != _requested)
                {
                    return false;
                }
            }

            return true;
        }

        void Finish(bool success)
        {
            _finished = true;
            float quality = success ? Mathf.Clamp01(1f - _mistakes * 0.2f) : 0f;
            _done?.Invoke(success ? MinigameResult.Done(_mistakes, quality) : MinigameResult.Walkout(_mistakes));
        }
    }
}
