namespace StyleTime
{
    public sealed class GameSession
    {
        public SaveDatabase Database { get; private set; }
        public string SavePath { get; }

        public GameSession(string savePath = null)
        {
            SavePath = string.IsNullOrEmpty(savePath) ? SaveService.DefaultPath : savePath;
            Database = SaveService.LoadFrom(SavePath);
        }

        public StylistSave Active => Database.Active();

        public bool HasAnyStylist()
        {
            if (Database?.slots == null)
            {
                return false;
            }

            for (int i = 0; i < Database.slots.Length; i++)
            {
                if (Database.slots[i] != null && Database.slots[i].HasCharacter)
                {
                    return true;
                }
            }

            return false;
        }

        public void SelectSlot(int index)
        {
            Database.activeSlotIndex = index;
            Persist();
        }

        public StylistSave CreateStylist(int slotIndex, string name, AppearanceData appearance, DifficultyId difficulty)
        {
            var save = SaveService.StartNew(slotIndex, name, appearance, difficulty);
            Database.slots[slotIndex] = save;
            Database.activeSlotIndex = slotIndex;
            Persist();
            return save;
        }

        public void Persist()
        {
            SaveService.WriteTo(SavePath, Database);
        }

        public void AdvanceAfterSleep()
        {
            StylistSave save = Active;
            if (save == null)
            {
                return;
            }

            save.dayInWeek += 1;
            if (save.dayInWeek >= 3)
            {
                save.dayInWeek = 0;
                save.weekIndex += 1;
            }

            save.Phase = DayPhase.MorningWake;
            save.equipped.wearingPyjamas = true;
            save.equipped.wearingRobe = false;
            Persist();
        }

        public void SetPhase(DayPhase phase)
        {
            if (Active == null)
            {
                return;
            }

            Active.Phase = phase;
            Persist();
        }

        public void AddPay(int cents)
        {
            if (Active == null || cents <= 0)
            {
                return;
            }

            Active.walletCents += cents;
            Persist();
        }
    }
}
