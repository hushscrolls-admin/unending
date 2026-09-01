using UnityEngine;

namespace StyleTime
{
    /// <summary>
    /// Drop this on a Blender doll later. The slice uses <see cref="DollView"/> instead.
    /// Slot names match the appearance/outfit ids so the hero mesh is a swap, not a rewrite.
    /// </summary>
    public sealed class CharacterApplicator : MonoBehaviour
    {
        public Renderer SkinRenderer;
        public Renderer HairRenderer;
        public Renderer EyeRenderer;
        public GameObject[] HairStyles;
        public string[] HairStyleIds;
        public GameObject FrecklesLight;
        public GameObject FrecklesMedium;

        public void Apply(AppearanceData appearance)
        {
            if (appearance == null)
            {
                return;
            }

            ApplyTint(SkinRenderer, GameCatalog.FindColor(GameCatalog.SkinTones, appearance.skinToneId).Color);
            ApplyTint(HairRenderer, GameCatalog.FindColor(GameCatalog.HairColors, appearance.hairColorId).Color);
            ApplyTint(EyeRenderer, GameCatalog.FindColor(GameCatalog.EyeColors, appearance.eyeColorId).Color);

            if (HairStyles != null && HairStyleIds != null)
            {
                for (int i = 0; i < HairStyles.Length; i++)
                {
                    if (HairStyles[i] == null)
                    {
                        continue;
                    }

                    bool on = i < HairStyleIds.Length && HairStyleIds[i] == appearance.hairStyleId;
                    HairStyles[i].SetActive(on);
                }
            }

            if (FrecklesLight != null)
            {
                FrecklesLight.SetActive(appearance.Freckles == FrecklesAmount.Light);
            }

            if (FrecklesMedium != null)
            {
                FrecklesMedium.SetActive(appearance.Freckles == FrecklesAmount.Medium);
            }
        }

        static void ApplyTint(Renderer renderer, Color color)
        {
            if (renderer == null)
            {
                return;
            }

            var block = new MaterialPropertyBlock();
            renderer.GetPropertyBlock(block);
            block.SetColor("_BaseColor", color);
            block.SetColor("_Color", color);
            renderer.SetPropertyBlock(block);
        }
    }
}
