using System;
using System.IO;
using UnityEngine;

namespace StyleTime
{
    public static class SaveService
    {
        public const int CurrentVersion = 1;
        public const int SlotCount = 4;
        public const string FileName = "style_time_saves.json";

        public static string DefaultPath => Path.Combine(Application.persistentDataPath, FileName);

        public static SaveDatabase Load()
        {
            return LoadFrom(DefaultPath);
        }

        public static SaveDatabase LoadFrom(string path)
        {
            if (string.IsNullOrEmpty(path) || !File.Exists(path))
            {
                return SaveDatabase.CreateEmpty();
            }

            try
            {
                string json = File.ReadAllText(path);
                var db = JsonUtility.FromJson<SaveDatabase>(json);
                return Normalize(db);
            }
            catch (Exception ex)
            {
                Debug.LogWarning("Style Time save could not be read. Starting fresh. " + ex.Message);
                TryBackup(path);
                return SaveDatabase.CreateEmpty();
            }
        }

        public static void Write(SaveDatabase db)
        {
            WriteTo(DefaultPath, db);
        }

        public static void WriteTo(string path, SaveDatabase db)
        {
            if (db == null)
            {
                throw new ArgumentNullException(nameof(db));
            }

            db = Normalize(db);
            string json = JsonUtility.ToJson(db, true);
            string directory = Path.GetDirectoryName(path);
            if (!string.IsNullOrEmpty(directory))
            {
                Directory.CreateDirectory(directory);
            }

            File.WriteAllText(path, json);
        }

        public static StylistSave CreateBlankSlot(int index)
        {
            return new StylistSave
            {
                slotId = "slot_" + index,
                occupied = false,
                phase = (int)DayPhase.MorningWake,
                ownedClothingIds = GameCatalog.StarterClothingIds(),
                equipped = GameCatalog.StarterOutfit(),
                appearance = new AppearanceData()
            };
        }

        public static StylistSave StartNew(int slotIndex, string name, AppearanceData appearance, DifficultyId difficulty)
        {
            var save = CreateBlankSlot(slotIndex);
            save.occupied = true;
            save.stylistName = SanitizeName(name);
            save.appearance = appearance != null ? appearance.Clone() : new AppearanceData();
            save.Difficulty = difficulty;
            save.weekIndex = 0;
            save.dayInWeek = 0;
            save.Phase = DayPhase.MorningWake;
            save.walletCents = 0;
            save.equipped = GameCatalog.StarterOutfit();
            save.equipped.wearingPyjamas = true;
            save.SetOwned(GameCatalog.StarterClothingIds());
            return save;
        }

        public static string SanitizeName(string name)
        {
            if (string.IsNullOrWhiteSpace(name))
            {
                return "Stylist";
            }

            var chars = new char[Math.Min(name.Trim().Length, 16)];
            int n = 0;
            foreach (char c in name.Trim())
            {
                if (char.IsLetter(c) || c == ' ' || c == '-' || c == '\'')
                {
                    chars[n++] = c;
                    if (n >= chars.Length)
                    {
                        break;
                    }
                }
            }

            string cleaned = new string(chars, 0, n).Trim();
            return string.IsNullOrEmpty(cleaned) ? "Stylist" : cleaned;
        }

        public static SaveDatabase Normalize(SaveDatabase db)
        {
            if (db == null)
            {
                return SaveDatabase.CreateEmpty();
            }

            if (db.slots == null || db.slots.Length != SlotCount)
            {
                var next = new StylistSave[SlotCount];
                for (int i = 0; i < SlotCount; i++)
                {
                    if (db.slots != null && i < db.slots.Length && db.slots[i] != null)
                    {
                        next[i] = db.slots[i];
                    }
                    else
                    {
                        next[i] = CreateBlankSlot(i);
                    }
                }

                db.slots = next;
            }

            for (int i = 0; i < db.slots.Length; i++)
            {
                if (db.slots[i] == null)
                {
                    db.slots[i] = CreateBlankSlot(i);
                }

                if (db.slots[i].appearance == null)
                {
                    db.slots[i].appearance = new AppearanceData();
                }

                if (db.slots[i].equipped == null)
                {
                    db.slots[i].equipped = GameCatalog.StarterOutfit();
                }

                if (db.slots[i].ownedClothingIds == null || db.slots[i].ownedClothingIds.Length == 0)
                {
                    db.slots[i].ownedClothingIds = GameCatalog.StarterClothingIds();
                }

                if (string.IsNullOrEmpty(db.slots[i].slotId))
                {
                    db.slots[i].slotId = "slot_" + i;
                }

                db.slots[i].version = CurrentVersion;
            }

            if (db.activeSlotIndex < 0 || db.activeSlotIndex >= SlotCount)
            {
                db.activeSlotIndex = 0;
            }

            db.version = CurrentVersion;
            return db;
        }

        static void TryBackup(string path)
        {
            try
            {
                File.Copy(path, path + ".bak", true);
            }
            catch (Exception ex)
            {
                Debug.LogWarning("Could not back up a corrupt save. " + ex.Message);
            }
        }
    }
}
