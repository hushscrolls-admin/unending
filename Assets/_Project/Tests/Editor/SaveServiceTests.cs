using System.IO;
using NUnit.Framework;
using UnityEngine;

namespace StyleTime.Tests
{
    public class SaveServiceTests
    {
        string _path;

        [SetUp]
        public void SetUp()
        {
            _path = Path.Combine(Application.temporaryCachePath, "style_time_test_save.json");
            if (File.Exists(_path))
            {
                File.Delete(_path);
            }
        }

        [TearDown]
        public void TearDown()
        {
            if (File.Exists(_path))
            {
                File.Delete(_path);
            }
        }

        [Test]
        public void MissingFile_CreatesFourEmptySlots()
        {
            SaveDatabase db = SaveService.LoadFrom(_path);
            Assert.AreEqual(SaveService.SlotCount, db.slots.Length);
            Assert.IsFalse(db.slots[0].HasCharacter);
        }

        [Test]
        public void RoundTrip_PreservesNameWalletAndDifficulty()
        {
            var session = new GameSession(_path);
            AppearanceData look = new AppearanceData
            {
                skinToneId = "bronze",
                hairStyleId = "curly",
                hairColorId = "pink",
                eyeColorId = "green",
                freckles = (int)FrecklesAmount.Light
            };
            look.Body = BodyId.Girl;
            session.CreateStylist(1, "Ava-Rose", look, DifficultyId.ShopMaths);
            session.AddPay(1250);
            session.SetPhase(DayPhase.Work);

            var again = new GameSession(_path);
            StylistSave save = again.Database.slots[1];
            Assert.IsTrue(save.HasCharacter);
            Assert.AreEqual("Ava-Rose", save.stylistName);
            Assert.AreEqual(1250, save.walletCents);
            Assert.AreEqual(DifficultyId.ShopMaths, save.Difficulty);
            Assert.AreEqual(DayPhase.Work, save.Phase);
            Assert.AreEqual("bronze", save.appearance.skinToneId);
            Assert.AreEqual(1, again.Database.activeSlotIndex);
        }

        [Test]
        public void SanitizeName_StripsJunkAndFallsBack()
        {
            Assert.AreEqual("Mia", SaveService.SanitizeName(" Mia! "));
            Assert.AreEqual("Stylist", SaveService.SanitizeName("@@@"));
            Assert.AreEqual("Anne-Marie", SaveService.SanitizeName("Anne-Marie"));
        }

        [Test]
        public void Sleep_AdvancesDayAndReturnsToMorning()
        {
            var session = new GameSession(_path);
            session.CreateStylist(0, "Sam", new AppearanceData(), DifficultyId.CoinCounter);
            session.AdvanceAfterSleep();
            Assert.AreEqual(1, session.Active.dayInWeek);
            Assert.AreEqual(DayPhase.MorningWake, session.Active.Phase);
            session.AdvanceAfterSleep();
            session.AdvanceAfterSleep();
            Assert.AreEqual(0, session.Active.dayInWeek);
            Assert.AreEqual(1, session.Active.weekIndex);
        }

        [Test]
        public void CorruptFile_DoesNotThrow()
        {
            File.WriteAllText(_path, "{ not json");
            SaveDatabase db = SaveService.LoadFrom(_path);
            Assert.IsNotNull(db);
            Assert.AreEqual(SaveService.SlotCount, db.slots.Length);
        }
    }
}
