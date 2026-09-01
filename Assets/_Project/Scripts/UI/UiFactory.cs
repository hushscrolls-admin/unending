using System;
using UnityEngine;
using UnityEngine.Events;
using UnityEngine.UI;

namespace StyleTime
{
    public static class UiFactory
    {
        public static Canvas CreateCanvas(Transform parent)
        {
            var root = new GameObject("StyleTimeCanvas", typeof(RectTransform), typeof(Canvas), typeof(CanvasScaler), typeof(GraphicRaycaster));
            root.transform.SetParent(parent, false);
            var canvas = root.GetComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvas.sortingOrder = 10;
            var scaler = root.GetComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1080, 1920);
            scaler.matchWidthOrHeight = 0.5f;
            var rt = root.GetComponent<RectTransform>();
            Stretch(rt);
            return canvas;
        }

        public static RectTransform Panel(Transform parent, string name, Color color, Vector2 anchorMin, Vector2 anchorMax, Vector2 offsetMin, Vector2 offsetMax, int radius = 48)
        {
            var go = new GameObject(name, typeof(RectTransform), typeof(CanvasRenderer), typeof(Image));
            go.transform.SetParent(parent, false);
            var rt = go.GetComponent<RectTransform>();
            rt.anchorMin = anchorMin;
            rt.anchorMax = anchorMax;
            rt.offsetMin = offsetMin;
            rt.offsetMax = offsetMax;
            var image = go.GetComponent<Image>();
            image.sprite = SpriteFactory.Rounded(64, 64, Mathf.Clamp(radius, 8, 28));
            image.type = Image.Type.Sliced;
            image.color = color;
            image.raycastTarget = true;
            return rt;
        }

        public static Image Graphic(Transform parent, string name, Sprite sprite, Color color, bool raycast = false)
        {
            var go = new GameObject(name, typeof(RectTransform), typeof(CanvasRenderer), typeof(Image));
            go.transform.SetParent(parent, false);
            var image = go.GetComponent<Image>();
            image.sprite = sprite;
            image.color = color;
            image.raycastTarget = raycast;
            if (sprite != null && sprite.border.sqrMagnitude > 0f)
            {
                image.type = Image.Type.Sliced;
            }

            return image;
        }

        public static Text Label(Transform parent, string name, string text, int size, Color color, TextAnchor align = TextAnchor.MiddleCenter, bool wrap = true)
        {
            var go = new GameObject(name, typeof(RectTransform), typeof(CanvasRenderer), typeof(Text));
            go.transform.SetParent(parent, false);
            var label = go.GetComponent<Text>();
            label.font = UiTheme.Font;
            label.fontSize = size;
            label.color = color;
            label.alignment = align;
            label.horizontalOverflow = wrap ? HorizontalWrapMode.Wrap : HorizontalWrapMode.Overflow;
            label.verticalOverflow = VerticalWrapMode.Overflow;
            label.raycastTarget = false;
            label.text = text;
            return label;
        }

        public static Button Button(Transform parent, string name, string text, Color fill, UnityAction onClick, int height = 110)
        {
            var rt = Panel(parent, name, fill, new Vector2(0, 1), new Vector2(1, 1), Vector2.zero, Vector2.zero, 40);
            rt.sizeDelta = new Vector2(0, height);
            var button = rt.gameObject.AddComponent<Button>();
            var colors = button.colors;
            colors.highlightedColor = Color.Lerp(fill, Color.white, 0.15f);
            colors.pressedColor = Color.Lerp(fill, UiTheme.Ink, 0.12f);
            colors.disabledColor = new Color(fill.r, fill.g, fill.b, 0.4f);
            button.colors = colors;
            button.onClick.AddListener(onClick);
            var label = Label(rt, "Label", text, UiTheme.ButtonSize, UiTheme.Ink);
            Stretch(label.rectTransform);
            label.rectTransform.offsetMin = new Vector2(16, 8);
            label.rectTransform.offsetMax = new Vector2(-16, -8);
            return button;
        }

        public static InputField Input(Transform parent, string name, string placeholder)
        {
            var rt = Panel(parent, name, Color.white, new Vector2(0, 1), new Vector2(1, 1), Vector2.zero, Vector2.zero, 28);
            rt.sizeDelta = new Vector2(0, 100);
            var field = rt.gameObject.AddComponent<InputField>();
            var text = Label(rt, "Text", "", UiTheme.HeadingSize, UiTheme.Ink);
            Stretch(text.rectTransform);
            text.rectTransform.offsetMin = new Vector2(24, 8);
            text.rectTransform.offsetMax = new Vector2(-24, -8);
            text.supportRichText = false;
            var ph = Label(rt, "Placeholder", placeholder, UiTheme.BodySize, UiTheme.InkSoft);
            Stretch(ph.rectTransform);
            ph.rectTransform.offsetMin = new Vector2(24, 8);
            ph.rectTransform.offsetMax = new Vector2(-24, -8);
            field.textComponent = text;
            field.placeholder = ph;
            field.characterLimit = 16;
            field.contentType = InputField.ContentType.Standard;
            return field;
        }

        public static Slider Bar(Transform parent, string name)
        {
            var rt = Panel(parent, name, new Color(1, 1, 1, 0.55f), new Vector2(0, 0.5f), new Vector2(1, 0.5f), Vector2.zero, Vector2.zero, 18);
            rt.sizeDelta = new Vector2(0, 36);
            var fillRt = Panel(rt, "Fill", UiTheme.Mint, Vector2.zero, Vector2.one, Vector2.zero, Vector2.zero, 16);
            var slider = rt.gameObject.AddComponent<Slider>();
            slider.fillRect = fillRt;
            slider.minValue = 0;
            slider.maxValue = 1;
            slider.value = 0;
            slider.interactable = false;
            slider.transition = Selectable.Transition.None;
            return slider;
        }

        public static void Stretch(RectTransform rt)
        {
            rt.anchorMin = Vector2.zero;
            rt.anchorMax = Vector2.one;
            rt.offsetMin = Vector2.zero;
            rt.offsetMax = Vector2.zero;
        }

        public static void PinTop(RectTransform rt, float height, float top, float side)
        {
            rt.anchorMin = new Vector2(0, 1);
            rt.anchorMax = new Vector2(1, 1);
            rt.pivot = new Vector2(0.5f, 1);
            rt.sizeDelta = new Vector2(-side * 2, height);
            rt.anchoredPosition = new Vector2(0, -top);
        }

        public static void PinBottom(RectTransform rt, float height, float bottom, float side)
        {
            rt.anchorMin = new Vector2(0, 0);
            rt.anchorMax = new Vector2(1, 0);
            rt.pivot = new Vector2(0.5f, 0);
            rt.sizeDelta = new Vector2(-side * 2, height);
            rt.anchoredPosition = new Vector2(0, bottom);
        }

        public static void Clear(Transform parent)
        {
            for (int i = parent.childCount - 1; i >= 0; i--)
            {
                UnityEngine.Object.Destroy(parent.GetChild(i).gameObject);
            }
        }

        public static VerticalLayoutGroup Column(Transform parent, string name, int pad, int spacing)
        {
            var go = new GameObject(name, typeof(RectTransform), typeof(VerticalLayoutGroup), typeof(ContentSizeFitter));
            go.transform.SetParent(parent, false);
            var layout = go.GetComponent<VerticalLayoutGroup>();
            layout.padding = new RectOffset(pad, pad, pad, pad);
            layout.spacing = spacing;
            layout.childAlignment = TextAnchor.UpperCenter;
            layout.childControlWidth = true;
            layout.childControlHeight = false;
            layout.childForceExpandWidth = true;
            layout.childForceExpandHeight = false;
            var fitter = go.GetComponent<ContentSizeFitter>();
            fitter.verticalFit = ContentSizeFitter.FitMode.PreferredSize;
            var rt = go.GetComponent<RectTransform>();
            rt.anchorMin = new Vector2(0, 1);
            rt.anchorMax = new Vector2(1, 1);
            rt.pivot = new Vector2(0.5f, 1);
            rt.sizeDelta = Vector2.zero;
            return layout;
        }
    }
}
