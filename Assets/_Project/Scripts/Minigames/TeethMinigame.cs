using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;

namespace StyleTime
{
    public sealed class TeethMinigame : IMinigame
    {
        const float BrushRadius = 70f;

        RectTransform _root;
        RectTransform _brush;
        readonly List<Image> _bits = new List<Image>();
        Action<MinigameResult> _done;
        bool _finished;
        Canvas _canvas;

        public void Begin(RectTransform host, MonoBehaviour runner, MinigameContext context, Action<MinigameResult> onComplete)
        {
            _done = onComplete;
            _canvas = host.GetComponentInParent<Canvas>();
            _root = UiFactory.Panel(host, "Teeth", new Color(1, 1, 1, 0.94f), new Vector2(0.06f, 0.08f), new Vector2(0.94f, 0.7f), Vector2.zero, Vector2.zero, 40);
            var title = UiFactory.Label(_root, "Title", "Brush those teeth!", UiTheme.HeadingSize, UiTheme.Ink);
            UiFactory.PinTop(title.rectTransform, 70, 16, 16);

            var mouth = UiFactory.Panel(_root, "Mouth", new Color(0.55f, 0.22f, 0.28f), new Vector2(0.5f, 0.5f), new Vector2(0.5f, 0.5f), Vector2.zero, Vector2.zero, 48);
            mouth.sizeDelta = new Vector2(780, 360);
            mouth.anchoredPosition = new Vector2(0, 20);

            PlaceTeeth(mouth, 1, 4, 70);
            PlaceTeeth(mouth, -1, 4, -80);

            var rng = new System.Random();
            int bits = context != null && context.Difficulty == DifficultyId.LittleStylist ? 4 : 6;
            for (int i = 0; i < bits; i++)
            {
                var speck = UiFactory.Graphic(mouth, "Bit" + i, SpriteFactory.Circle(32), new Color(0.45f, 0.28f, 0.12f));
                speck.rectTransform.sizeDelta = new Vector2(34, 28);
                speck.rectTransform.anchoredPosition = new Vector2(rng.Next(-280, 281), rng.Next(-90, 91));
                speck.raycastTarget = false;
                _bits.Add(speck);
            }

            var hint = UiFactory.Label(_root, "Hint", "Drag the toothbrush over the food.", UiTheme.CaptionSize, UiTheme.InkSoft);
            UiFactory.PinBottom(hint.rectTransform, 50, 16, 20);

            var brushImage = UiFactory.Graphic(_root, "Brush", SpriteFactory.Rounded(40, 80, 16), UiTheme.Sky, true);
            _brush = brushImage.rectTransform;
            _brush.sizeDelta = new Vector2(70, 220);
            _brush.anchoredPosition = new Vector2(280, -180);
            var handle = brushImage.gameObject.AddComponent<BrushHandle>();
            handle.Moved = OnBrush;
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

        void PlaceTeeth(RectTransform mouth, int rowSign, int count, float y)
        {
            float span = 560f;
            float start = -span * 0.5f;
            float step = span / (count - 1);
            for (int i = 0; i < count; i++)
            {
                var tooth = UiFactory.Graphic(mouth, "Tooth" + rowSign + i, SpriteFactory.Rounded(40, 56, 16), Color.white);
                tooth.rectTransform.sizeDelta = new Vector2(96, 130);
                tooth.rectTransform.anchoredPosition = new Vector2(start + step * i, y);
            }
        }

        void OnBrush(Vector2 screen)
        {
            if (_finished)
            {
                return;
            }

            Camera cam = _canvas != null && _canvas.renderMode != RenderMode.ScreenSpaceOverlay ? _canvas.worldCamera : null;
            for (int i = _bits.Count - 1; i >= 0; i--)
            {
                Image bit = _bits[i];
                if (bit == null)
                {
                    _bits.RemoveAt(i);
                    continue;
                }

                Vector2 local;
                RectTransformUtility.ScreenPointToLocalPointInRectangle(bit.rectTransform, screen, cam, out local);
                if (local.magnitude <= BrushRadius)
                {
                    UnityEngine.Object.Destroy(bit.gameObject);
                    _bits.RemoveAt(i);
                }
            }

            if (_bits.Count == 0)
            {
                _finished = true;
                _done?.Invoke(MinigameResult.Done(0, 1f));
            }
        }

        sealed class BrushHandle : MonoBehaviour, IDragHandler, IPointerDownHandler
        {
            public Action<Vector2> Moved;
            RectTransform _rt;

            void Awake()
            {
                _rt = (RectTransform)transform;
            }

            public void OnPointerDown(PointerEventData eventData)
            {
                Move(eventData);
            }

            public void OnDrag(PointerEventData eventData)
            {
                Move(eventData);
            }

            void Move(PointerEventData eventData)
            {
                var parent = _rt.parent as RectTransform;
                Camera cam = eventData.pressEventCamera;
                Vector2 local;
                if (RectTransformUtility.ScreenPointToLocalPointInRectangle(parent, eventData.position, cam, out local))
                {
                    _rt.anchoredPosition = local;
                }

                Moved?.Invoke(eventData.position);
            }
        }
    }
}
