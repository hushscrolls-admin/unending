using System;

namespace StyleTime
{
    [Serializable]
    public class AppearanceData
    {
        public int bodyId;
        public string skinToneId = "peach";
        public string hairStyleId = "bob";
        public string hairColorId = "brown";
        public string eyeColorId = "brown";
        public int freckles;

        public BodyId Body
        {
            get => (BodyId)bodyId;
            set => bodyId = (int)value;
        }

        public FrecklesAmount Freckles
        {
            get => (FrecklesAmount)freckles;
            set => freckles = (int)value;
        }

        public AppearanceData Clone()
        {
            return new AppearanceData
            {
                bodyId = bodyId,
                skinToneId = skinToneId,
                hairStyleId = hairStyleId,
                hairColorId = hairColorId,
                eyeColorId = eyeColorId,
                freckles = freckles
            };
        }
    }

    [Serializable]
    public class OutfitData
    {
        public string hairAccessoryId = "";
        public string topId = "tee_pink";
        public string bottomId = "skirt_denim";
        public string dressId = "";
        public string shoesId = "flats_white";
        public string pyjamasId = "pjs_cloud";
        public string robeId = "robe_cream";
        public bool wearingPyjamas = true;
        public bool wearingRobe;

        public string Get(ClothingSlot slot)
        {
            switch (slot)
            {
                case ClothingSlot.HairAccessory: return hairAccessoryId;
                case ClothingSlot.Top: return topId;
                case ClothingSlot.Bottom: return bottomId;
                case ClothingSlot.Dress: return dressId;
                case ClothingSlot.Shoes: return shoesId;
                case ClothingSlot.Pyjamas: return pyjamasId;
                case ClothingSlot.Robe: return robeId;
                default: return "";
            }
        }

        public void Set(ClothingSlot slot, string id)
        {
            switch (slot)
            {
                case ClothingSlot.HairAccessory: hairAccessoryId = id ?? ""; break;
                case ClothingSlot.Top: topId = id ?? ""; break;
                case ClothingSlot.Bottom: bottomId = id ?? ""; break;
                case ClothingSlot.Dress: dressId = id ?? ""; break;
                case ClothingSlot.Shoes: shoesId = id ?? ""; break;
                case ClothingSlot.Pyjamas: pyjamasId = id ?? ""; break;
                case ClothingSlot.Robe: robeId = id ?? ""; break;
            }
        }

        public bool IsWorkLegal()
        {
            if (wearingPyjamas || wearingRobe)
            {
                return false;
            }

            bool hasDress = !string.IsNullOrEmpty(dressId);
            bool hasSeparates = !string.IsNullOrEmpty(topId) && !string.IsNullOrEmpty(bottomId);
            return hasDress || hasSeparates;
        }

        public OutfitData Clone()
        {
            return new OutfitData
            {
                hairAccessoryId = hairAccessoryId,
                topId = topId,
                bottomId = bottomId,
                dressId = dressId,
                shoesId = shoesId,
                pyjamasId = pyjamasId,
                robeId = robeId,
                wearingPyjamas = wearingPyjamas,
                wearingRobe = wearingRobe
            };
        }
    }
}
