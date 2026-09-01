using System;
using System.Collections.Generic;

namespace StyleTime
{
    [Serializable]
    public class StylistSave
    {
        public int version = SaveService.CurrentVersion;
        public string slotId = "";
        public string stylistName = "";
        public AppearanceData appearance = new AppearanceData();
        public int difficultyId;
        public int weekIndex;
        public int dayInWeek;
        public int phase = (int)DayPhase.MorningWake;
        public int walletCents;
        public string[] ownedClothingIds = Array.Empty<string>();
        public OutfitData equipped = new OutfitData();
        public bool occupied;

        public DifficultyId Difficulty
        {
            get => (DifficultyId)difficultyId;
            set => difficultyId = (int)value;
        }

        public DayPhase Phase
        {
            get => (DayPhase)phase;
            set => phase = (int)value;
        }

        public bool HasCharacter => occupied && !string.IsNullOrEmpty(stylistName);

        public HashSet<string> OwnedSet()
        {
            return new HashSet<string>(ownedClothingIds ?? Array.Empty<string>());
        }

        public void SetOwned(IEnumerable<string> ids)
        {
            var list = new List<string>();
            if (ids != null)
            {
                foreach (string id in ids)
                {
                    if (!string.IsNullOrEmpty(id) && !list.Contains(id))
                    {
                        list.Add(id);
                    }
                }
            }

            ownedClothingIds = list.ToArray();
        }
    }

    [Serializable]
    public class SaveDatabase
    {
        public int version = SaveService.CurrentVersion;
        public int activeSlotIndex;
        public StylistSave[] slots;

        public static SaveDatabase CreateEmpty()
        {
            var db = new SaveDatabase
            {
                slots = new StylistSave[SaveService.SlotCount]
            };

            for (int i = 0; i < SaveService.SlotCount; i++)
            {
                db.slots[i] = SaveService.CreateBlankSlot(i);
            }

            return db;
        }

        public StylistSave Active()
        {
            if (slots == null || slots.Length != SaveService.SlotCount)
            {
                return null;
            }

            if (activeSlotIndex < 0 || activeSlotIndex >= slots.Length)
            {
                return null;
            }

            return slots[activeSlotIndex];
        }
    }
}
