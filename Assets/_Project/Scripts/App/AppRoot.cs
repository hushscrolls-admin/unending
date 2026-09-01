using System;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;

namespace StyleTime
{
    public sealed class AppRoot : MonoBehaviour
    {
        GameSession _session;
        Canvas _canvas;
        RectTransform _background;
        RectTransform _stage;
        RectTransform _hud;
        Text _hudLeft;
        Text _hudRight;
        DollView _doll;
        IMinigame _minigame;
        WorkDayClock _clock;
        SalonCustomer _customer;
        int _jobMistakes;
        int _jobsDone;
        bool _creatingNew;
        int _createStep;
        AppearanceData _draftAppearance;
        DifficultyId _draftDifficulty;
        string _draftName = "";
        System.Random _rng;

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        static void Bootstrap()
        {
            if (FindAnyObjectByType<AppRoot>() != null)
            {
                return;
            }

            var go = new GameObject("StyleTimeApp");
            DontDestroyOnLoad(go);
            go.AddComponent<AppRoot>();
        }

        void Awake()
        {
            _rng = new System.Random();
            _session = new GameSession();
            EnsureEventSystem();
            _canvas = UiFactory.CreateCanvas(transform);
            _background = UiFactory.Panel(_canvas.transform, "Background", UiTheme.Cream, Vector2.zero, Vector2.one, Vector2.zero, Vector2.zero, 4);
            _background.GetComponent<Image>().raycastTarget = true;
            _doll = new DollView((RectTransform)_canvas.transform);
            _stage = UiFactory.Panel(_canvas.transform, "Stage", new Color(1, 1, 1, 0f), Vector2.zero, Vector2.one, Vector2.zero, Vector2.zero, 4);
            _stage.GetComponent<Image>().raycastTarget = false;
            BuildHud();
            ShowTitle();
        }

        void Update()
        {
            _minigame?.Tick(Time.deltaTime);
            if (_clock != null && !_clock.Expired && _session.Active != null && _session.Active.Phase == DayPhase.Work)
            {
                _clock.Tick(Time.deltaTime);
                RefreshHud();
                if (_clock.Expired)
                {
                    EndWorkDay();
                }
            }
        }

        void EnsureEventSystem()
        {
            if (FindAnyObjectByType<EventSystem>() != null)
            {
                return;
            }

            var go = new GameObject("EventSystem");
            DontDestroyOnLoad(go);
            go.AddComponent<EventSystem>();
            go.AddComponent<StandaloneInputModule>();
        }

        void BuildHud()
        {
            _hud = UiFactory.Panel(_canvas.transform, "Hud", new Color(1, 1, 1, 0.82f), new Vector2(0, 1), new Vector2(1, 1), Vector2.zero, Vector2.zero, 8);
            _hud.GetComponent<RectTransform>().sizeDelta = new Vector2(0, 110);
            _hud.GetComponent<RectTransform>().pivot = new Vector2(0.5f, 1);
            _hudLeft = UiFactory.Label(_hud, "Left", "Style Time", UiTheme.BodySize, UiTheme.Ink, TextAnchor.MiddleLeft);
            _hudLeft.rectTransform.anchorMin = new Vector2(0, 0);
            _hudLeft.rectTransform.anchorMax = new Vector2(0.6f, 1);
            _hudLeft.rectTransform.offsetMin = new Vector2(28, 8);
            _hudLeft.rectTransform.offsetMax = new Vector2(-8, -8);
            _hudRight = UiFactory.Label(_hud, "Right", "", UiTheme.BodySize, UiTheme.Ink, TextAnchor.MiddleRight);
            _hudRight.rectTransform.anchorMin = new Vector2(0.45f, 0);
            _hudRight.rectTransform.anchorMax = new Vector2(1, 1);
            _hudRight.rectTransform.offsetMin = new Vector2(8, 8);
            _hudRight.rectTransform.offsetMax = new Vector2(-28, -8);
        }

        void RefreshHud()
        {
            StylistSave save = _session.Active;
            if (save == null || !save.HasCharacter)
            {
                _hudLeft.text = "Style Time";
                _hudRight.text = "";
                return;
            }

            string money = Money.Format(save.walletCents, save.Difficulty);
            _hudLeft.text = save.stylistName + "  ·  " + money;
            if (_clock != null && save.Phase == DayPhase.Work)
            {
                _hudRight.text = _clock.Label() + "  ·  " + _jobsDone + " jobs";
            }
            else
            {
                _hudRight.text = "Day " + (save.dayInWeek + 1);
            }
        }

        void ClearStage()
        {
            _minigame?.Dispose();
            _minigame = null;
            UiFactory.Clear(_stage);
        }

        void PaintRoom(DayPhase phase)
        {
            RoomId room = DayFlow.RoomFor(phase);
            RoomBackgrounds.Apply(_background.GetComponent<Image>(), room);
            bool showDoll = DayFlow.ShowsDoll(phase) && (_session.Active != null || _draftAppearance != null);
            _doll.Root.gameObject.SetActive(showDoll);
            if (showDoll)
            {
                AppearanceData appearance = _draftAppearance ?? _session.Active?.appearance;
                OutfitData outfit = _session.Active?.equipped ?? GameCatalog.StarterOutfit();
                if (phase == DayPhase.Creation)
                {
                    outfit = GameCatalog.StarterOutfit();
                    outfit.wearingPyjamas = false;
                }

                _doll.Apply(appearance, outfit);
            }

            RefreshHud();
        }

        void EnterPhase(DayPhase phase, bool persist = true)
        {
            if (_session.Active != null && persist && phase != DayPhase.Title && phase != DayPhase.SlotPick && phase != DayPhase.Creation)
            {
                _session.SetPhase(phase);
            }

            PaintRoom(phase);
            ClearStage();

            switch (phase)
            {
                case DayPhase.Title: ShowTitle(); break;
                case DayPhase.SlotPick: ShowSlots(); break;
                case DayPhase.Creation: ShowCreator(); break;
                case DayPhase.MorningWake:
                    ShowBeat("Good morning, " + Name() + "!", "Time to get ready for work.", DayPhase.MorningDress);
                    break;
                case DayPhase.MorningDress: ShowWardrobe(false); break;
                case DayPhase.MorningTeeth: Launch(new TeethMinigame(), HomeContext("Brush your teeth."), () => EnterPhase(DayPhase.MorningHair)); break;
                case DayPhase.MorningHair: ShowHair(); break;
                case DayPhase.MorningBreakfast: Launch(new StepMinigame(Recipes.Cereal()), HomeContext("Breakfast"), () => EnterPhase(DayPhase.MorningLeave)); break;
                case DayPhase.MorningLeave:
                    ShowBeat("Off to the salon!", "Help as many people as you can before closing.", DayPhase.Work);
                    break;
                case DayPhase.Work: StartWork(); break;
                case DayPhase.NightArrive:
                    ShowBeat("Home sweet home.", "You earned " + Money.Format(_session.Active.walletCents, _session.Active.Difficulty) + " today.", DayPhase.NightDinner);
                    break;
                case DayPhase.NightDinner: Launch(new StepMinigame(Recipes.Pasta()), HomeContext("Dinner"), () => EnterPhase(DayPhase.NightShower)); break;
                case DayPhase.NightShower: Launch(new StepMinigame(Recipes.Shower()), HomeContext("Shower"), () => EnterPhase(DayPhase.NightTeeth)); break;
                case DayPhase.NightTeeth: Launch(new TeethMinigame(), HomeContext("Brush your teeth."), () => EnterPhase(DayPhase.NightPjs)); break;
                case DayPhase.NightPjs: ShowWardrobe(true); break;
                case DayPhase.NightSleep: ShowSleep(); break;
                default: ShowTitle(); break;
            }
        }

        void ResumeActive()
        {
            if (_session.Active == null || !_session.Active.HasCharacter)
            {
                ShowTitle();
                return;
            }

            DayPhase phase = _session.Active.Phase;
            if (phase == DayPhase.Title || phase == DayPhase.SlotPick || phase == DayPhase.Creation)
            {
                phase = DayPhase.MorningWake;
            }

            EnterPhase(phase, false);
        }

        string Name()
        {
            return _session.Active != null ? _session.Active.stylistName : "Stylist";
        }

        MinigameContext HomeContext(string prompt)
        {
            return new MinigameContext
            {
                Difficulty = _session.Active != null ? _session.Active.Difficulty : DifficultyId.LittleStylist,
                IsWorkJob = false,
                Prompt = prompt,
                MaxMistakes = 99
            };
        }

        void Launch(IMinigame minigame, MinigameContext context, Action onSuccess)
        {
            _minigame?.Dispose();
            _minigame = minigame;
            minigame.Begin(_stage, this, context, result =>
            {
                _minigame?.Dispose();
                _minigame = null;
                onSuccess?.Invoke();
            });
        }

        void ShowTitle()
        {
            _clock = null;
            PaintRoom(DayPhase.Title);
            ClearStage();
            _doll.Root.gameObject.SetActive(false);
            var title = UiFactory.Label(_stage, "Title", "Style Time", UiTheme.TitleSize, UiTheme.Ink);
            UiFactory.PinTop(title.rectTransform, 140, 280, 24);
            var tag = UiFactory.Label(_stage, "Tag", "Salon days, cosy nights.", UiTheme.BodySize, UiTheme.InkSoft);
            UiFactory.PinTop(tag.rectTransform, 60, 420, 40);

            var column = UiFactory.Column(_stage, "Menu", 48, 24);
            var colRt = column.GetComponent<RectTransform>();
            colRt.anchoredPosition = new Vector2(0, -520);
            colRt.sizeDelta = new Vector2(-120, 0);

            if (_session.HasAnyStylist())
            {
                SizeButton(UiFactory.Button(column.transform, "Continue", "Continue", UiTheme.Mint, () =>
                {
                    _creatingNew = false;
                    ShowSlots();
                }));
            }

            SizeButton(UiFactory.Button(column.transform, "New", "New stylist", UiTheme.Blush, () =>
            {
                _creatingNew = true;
                ShowSlots();
            }));
        }

        void ShowSlots()
        {
            PaintRoom(DayPhase.SlotPick);
            ClearStage();
            _doll.Root.gameObject.SetActive(false);
            var title = UiFactory.Label(_stage, "Title", _creatingNew ? "Pick an empty bed" : "Who's playing?", UiTheme.HeadingSize, UiTheme.Ink);
            UiFactory.PinTop(title.rectTransform, 80, 160, 24);
            var column = UiFactory.Column(_stage, "Slots", 48, 18);
            column.GetComponent<RectTransform>().anchoredPosition = new Vector2(0, -280);
            column.GetComponent<RectTransform>().sizeDelta = new Vector2(-100, 0);

            for (int i = 0; i < SaveService.SlotCount; i++)
            {
                StylistSave slot = _session.Database.slots[i];
                int captured = i;
                string label;
                bool enabled;
                if (slot.HasCharacter)
                {
                    label = slot.stylistName + "  ·  Day " + (slot.dayInWeek + 1);
                    enabled = !_creatingNew;
                }
                else
                {
                    label = "Empty bed";
                    enabled = _creatingNew;
                }

                var button = UiFactory.Button(column.transform, "Slot" + i, label, enabled ? UiTheme.Lavender : new Color(0.85f, 0.82f, 0.86f), () => PickSlot(captured));
                button.interactable = enabled;
                SizeButton(button, 120);
            }

            SizeButton(UiFactory.Button(column.transform, "Back", "Back", UiTheme.Cream, ShowTitle), 90);
        }

        void PickSlot(int index)
        {
            _session.SelectSlot(index);
            if (_creatingNew)
            {
                _draftAppearance = new AppearanceData();
                _draftDifficulty = DifficultyId.LittleStylist;
                _draftName = "";
                _createStep = 0;
                EnterPhase(DayPhase.Creation, false);
                return;
            }

            ResumeActive();
        }

        void ShowCreator()
        {
            ClearStage();
            PaintRoom(DayPhase.Creation);
            var title = UiFactory.Label(_stage, "Title", CreatorTitle(_createStep), UiTheme.HeadingSize, UiTheme.Ink);
            UiFactory.PinTop(title.rectTransform, 70, 130, 20);

            var column = UiFactory.Column(_stage, "Choices", 24, 14);
            var colRt = column.GetComponent<RectTransform>();
            colRt.anchorMin = new Vector2(0.06f, 0);
            colRt.anchorMax = new Vector2(0.94f, 0.42f);
            colRt.offsetMin = Vector2.zero;
            colRt.offsetMax = Vector2.zero;
            colRt.pivot = new Vector2(0.5f, 0);
            Destroy(column.GetComponent<ContentSizeFitter>());

            switch (_createStep)
            {
                case 0:
                    Choice(column.transform, "Girl", () => { _draftAppearance.Body = BodyId.Girl; NextCreate(); });
                    Choice(column.transform, "Boy", () => { _draftAppearance.Body = BodyId.Boy; NextCreate(); });
                    break;
                case 1:
                    foreach (CatalogColor tone in GameCatalog.SkinTones)
                    {
                        CatalogColor captured = tone;
                        Choice(column.transform, captured.Label, () =>
                        {
                            _draftAppearance.skinToneId = captured.Id;
                            _doll.Apply(_draftAppearance, WorkPreviewOutfit());
                        }, captured.Color);
                    }
                    break;
                case 2:
                    foreach (var style in GameCatalog.HairStyles)
                    {
                        var captured = style;
                        Choice(column.transform, captured.label, () =>
                        {
                            _draftAppearance.hairStyleId = captured.id;
                            _doll.Apply(_draftAppearance, WorkPreviewOutfit());
                        });
                    }
                    break;
                case 3:
                    foreach (CatalogColor color in GameCatalog.HairColors)
                    {
                        CatalogColor captured = color;
                        Choice(column.transform, captured.Label, () =>
                        {
                            _draftAppearance.hairColorId = captured.Id;
                            _doll.Apply(_draftAppearance, WorkPreviewOutfit());
                        }, captured.Color);
                    }
                    break;
                case 4:
                    foreach (CatalogColor color in GameCatalog.EyeColors)
                    {
                        CatalogColor captured = color;
                        Choice(column.transform, captured.Label, () =>
                        {
                            _draftAppearance.eyeColorId = captured.Id;
                            _doll.Apply(_draftAppearance, WorkPreviewOutfit());
                        }, captured.Color);
                    }
                    break;
                case 5:
                    Choice(column.transform, "No freckles", () => _draftAppearance.Freckles = FrecklesAmount.None);
                    Choice(column.transform, "A few freckles", () => { _draftAppearance.Freckles = FrecklesAmount.Light; _doll.Apply(_draftAppearance, WorkPreviewOutfit()); });
                    Choice(column.transform, "Lots of freckles", () => { _draftAppearance.Freckles = FrecklesAmount.Medium; _doll.Apply(_draftAppearance, WorkPreviewOutfit()); });
                    break;
                case 6:
                    var field = UiFactory.Input(column.transform, "Name", "Type a name");
                    field.text = _draftName;
                    field.onValueChanged.AddListener(v => _draftName = v);
                    SizeButton(field.GetComponent<RectTransform>(), 110);
                    break;
                case 7:
                    foreach (DifficultyId id in Enum.GetValues(typeof(DifficultyId)))
                    {
                        DifficultyInfo info = GameCatalog.GetDifficulty(id);
                        DifficultyId captured = id;
                        Choice(column.transform, info.Title + "\n" + info.Blurb, () => _draftDifficulty = captured);
                    }
                    break;
            }

            var nav = UiFactory.Panel(_stage, "Nav", new Color(1, 1, 1, 0), new Vector2(0.08f, 0), new Vector2(0.92f, 0), Vector2.zero, Vector2.zero, 8);
            nav.sizeDelta = new Vector2(0, 140);
            nav.pivot = new Vector2(0.5f, 0);
            nav.anchoredPosition = new Vector2(0, 24);
            nav.GetComponent<Image>().raycastTarget = false;

            if (_createStep > 0)
            {
                var back = UiFactory.Button(nav, "Back", "Back", UiTheme.Cream, () =>
                {
                    _createStep -= 1;
                    ShowCreator();
                }, 110);
                back.GetComponent<RectTransform>().anchorMin = new Vector2(0, 0);
                back.GetComponent<RectTransform>().anchorMax = new Vector2(0.48f, 1);
                back.GetComponent<RectTransform>().offsetMin = Vector2.zero;
                back.GetComponent<RectTransform>().offsetMax = Vector2.zero;
            }

            string nextLabel = _createStep >= 7 ? "Let's go!" : "Next";
            var next = UiFactory.Button(nav, "Next", nextLabel, UiTheme.Mint, () =>
            {
                if (_createStep >= 7)
                {
                    FinishCreate();
                    return;
                }

                NextCreate();
            }, 110);
            next.GetComponent<RectTransform>().anchorMin = new Vector2(_createStep > 0 ? 0.52f : 0, 0);
            next.GetComponent<RectTransform>().anchorMax = Vector2.one;
            next.GetComponent<RectTransform>().offsetMin = Vector2.zero;
            next.GetComponent<RectTransform>().offsetMax = Vector2.zero;
        }

        void NextCreate()
        {
            _createStep += 1;
            ShowCreator();
        }

        void FinishCreate()
        {
            _session.CreateStylist(_session.Database.activeSlotIndex, _draftName, _draftAppearance, _draftDifficulty);
            _draftAppearance = null;
            EnterPhase(DayPhase.MorningWake);
        }

        static string CreatorTitle(int step)
        {
            switch (step)
            {
                case 0: return "Who are you?";
                case 1: return "Skin tone";
                case 2: return "Hair style";
                case 3: return "Hair colour";
                case 4: return "Eye colour";
                case 5: return "Freckles?";
                case 6: return "Your name";
                default: return "Maths level";
            }
        }

        static OutfitData WorkPreviewOutfit()
        {
            var outfit = GameCatalog.StarterOutfit();
            outfit.wearingPyjamas = false;
            return outfit;
        }

        void ShowWardrobe(bool pyjamaTime)
        {
            ClearStage();
            var title = UiFactory.Label(_stage, "Title", pyjamaTime ? "Pyjamas, then bed." : "Get dressed for work.", UiTheme.HeadingSize, UiTheme.Ink);
            UiFactory.PinTop(title.rectTransform, 70, 130, 20);
            var status = UiFactory.Label(_stage, "Status", "", UiTheme.CaptionSize, UiTheme.InkSoft);
            UiFactory.PinTop(status.rectTransform, 40, 200, 24);

            var column = UiFactory.Column(_stage, "Items", 20, 10);
            var colRt = column.GetComponent<RectTransform>();
            colRt.anchorMin = new Vector2(0.08f, 0.16f);
            colRt.anchorMax = new Vector2(0.92f, 0.46f);
            colRt.offsetMin = Vector2.zero;
            colRt.offsetMax = Vector2.zero;
            Destroy(column.GetComponent<ContentSizeFitter>());

            StylistSave save = _session.Active;
            var owned = save.OwnedSet();
            foreach (ClothingItem item in GameCatalog.Clothes)
            {
                if (!owned.Contains(item.Id))
                {
                    continue;
                }

                if (pyjamaTime && item.Slot != ClothingSlot.Pyjamas)
                {
                    continue;
                }

                if (!pyjamaTime && item.Slot == ClothingSlot.Pyjamas)
                {
                    continue;
                }

                ClothingItem captured = item;
                Choice(column.transform, item.Label, () =>
                {
                    Equip(captured, pyjamaTime);
                    _doll.Apply(save.appearance, save.equipped);
                    status.text = captured.Label;
                }, captured.Color);
            }

            var go = UiFactory.Button(_stage, "Go", pyjamaTime ? "Sleepy time" : "I'm ready!", UiTheme.Mint, () =>
            {
                if (pyjamaTime)
                {
                    save.equipped.wearingPyjamas = true;
                    save.equipped.wearingRobe = false;
                    _session.Persist();
                    EnterPhase(DayPhase.NightSleep);
                    return;
                }

                if (!save.equipped.IsWorkLegal())
                {
                    status.text = "Pop on some work clothes first.";
                    return;
                }

                _session.Persist();
                EnterPhase(DayPhase.MorningTeeth);
            }, 120);
            UiFactory.PinBottom(go.GetComponent<RectTransform>(), 120, 36, 48);
            _doll.Apply(save.appearance, save.equipped);
        }

        void Equip(ClothingItem item, bool pyjamaTime)
        {
            OutfitData outfit = _session.Active.equipped;
            outfit.Set(item.Slot, item.Id);
            if (item.Slot == ClothingSlot.Pyjamas || pyjamaTime)
            {
                outfit.wearingPyjamas = true;
                outfit.wearingRobe = false;
            }
            else if (item.Slot == ClothingSlot.Robe)
            {
                outfit.wearingRobe = true;
                outfit.wearingPyjamas = false;
            }
            else
            {
                outfit.wearingPyjamas = false;
                outfit.wearingRobe = false;
                if (item.Slot == ClothingSlot.Dress)
                {
                    outfit.topId = "";
                    outfit.bottomId = "";
                }
                else if (item.Slot == ClothingSlot.Top || item.Slot == ClothingSlot.Bottom)
                {
                    outfit.dressId = "";
                }
            }
        }

        void ShowHair()
        {
            ClearStage();
            var title = UiFactory.Label(_stage, "Title", "Tidy your hair.", UiTheme.HeadingSize, UiTheme.Ink);
            UiFactory.PinTop(title.rectTransform, 70, 140, 20);
            var column = UiFactory.Column(_stage, "Hair", 40, 16);
            column.GetComponent<RectTransform>().anchoredPosition = new Vector2(0, -420);
            column.GetComponent<RectTransform>().sizeDelta = new Vector2(-140, 0);
            Choice(column.transform, "Leave it", () => EnterPhase(DayPhase.MorningBreakfast));
            if (_session.Active.OwnedSet().Contains("clip_bow"))
            {
                Choice(column.transform, "Add a bow", () =>
                {
                    _session.Active.equipped.hairAccessoryId = "clip_bow";
                    _session.Persist();
                    _doll.Apply(_session.Active.appearance, _session.Active.equipped);
                    EnterPhase(DayPhase.MorningBreakfast);
                }, UiTheme.Blush);
            }
        }

        void ShowBeat(string heading, string body, DayPhase next)
        {
            ClearStage();
            var title = UiFactory.Label(_stage, "Title", heading, UiTheme.HeadingSize, UiTheme.Ink);
            UiFactory.PinTop(title.rectTransform, 120, 160, 32);
            var copy = UiFactory.Label(_stage, "Body", body, UiTheme.BodySize, UiTheme.InkSoft);
            UiFactory.PinTop(copy.rectTransform, 140, 300, 48);
            var go = UiFactory.Button(_stage, "Go", "Continue", UiTheme.Mint, () => EnterPhase(next), 120);
            UiFactory.PinBottom(go.GetComponent<RectTransform>(), 120, 48, 64);
        }

        void StartWork()
        {
            if (_session.Active != null)
            {
                _session.SetPhase(DayPhase.Work);
            }

            _clock = new WorkDayClock(SalonEconomy.WorkDaySeconds);
            _jobsDone = 0;
            PaintRoom(DayPhase.Work);
            NextCustomer();
        }

        void NextCustomer()
        {
            if (_clock == null || _clock.Expired)
            {
                EndWorkDay();
                return;
            }

            ClearStage();
            _customer = SalonEconomy.RollNailsCustomer(_session.Active.Difficulty, _rng);
            _jobMistakes = 0;
            var title = UiFactory.Label(_stage, "Title", _customer.Name + " is here!", UiTheme.HeadingSize, UiTheme.Ink);
            UiFactory.PinTop(title.rectTransform, 80, 180, 24);
            var body = UiFactory.Label(_stage, "Body", "They want " + _customer.RequestLabel + " nails.", UiTheme.BodySize, UiTheme.InkSoft);
            UiFactory.PinTop(body.rectTransform, 80, 280, 40);
            var swatch = UiFactory.Graphic(_stage, "Swatch", SpriteFactory.Rounded(48, 48, 18), GameCatalog.FindNail(_customer.RequestId).Color);
            swatch.rectTransform.anchorMin = swatch.rectTransform.anchorMax = new Vector2(0.5f, 0.52f);
            swatch.rectTransform.sizeDelta = new Vector2(140, 80);
            var go = UiFactory.Button(_stage, "Start", "Let's do this", UiTheme.Blush, BeginNails, 120);
            UiFactory.PinBottom(go.GetComponent<RectTransform>(), 120, 48, 64);
            var close = UiFactory.Button(_stage, "Close", "Closing time", UiTheme.Cream, EndWorkDay, 80);
            UiFactory.PinBottom(close.GetComponent<RectTransform>(), 80, 180, 64);
        }

        void BeginNails()
        {
            if (_clock != null && _clock.Expired)
            {
                EndWorkDay();
                return;
            }

            ClearStage();
            var context = new MinigameContext
            {
                Difficulty = _session.Active.Difficulty,
                IsWorkJob = true,
                RequestId = _customer.RequestId,
                Prompt = _customer.RequestLabel,
                MaxMistakes = SalonEconomy.MaxMistakes
            };
            var nails = new NailsMinigame();
            _minigame = nails;
            nails.Begin(_stage, this, context, OnNailsDone);
        }

        void OnNailsDone(MinigameResult result)
        {
            _minigame?.Dispose();
            _minigame = null;
            if (_clock != null && _clock.Expired)
            {
                EndWorkDay();
                return;
            }

            _jobMistakes += result.Mistakes;
            if (!result.Success || _jobMistakes >= SalonEconomy.MaxMistakes)
            {
                ShowWalkout("They left without paying.");
                return;
            }

            SalonEconomy.ApplyQualityToOffer(_customer, result.Quality01, result.Mistakes, _session.Active.Difficulty, _rng);
            BeginPay();
        }

        void BeginPay()
        {
            ClearStage();
            var problem = new ChangeProblem(_customer.OfferCents, _customer.TenderCents);
            var pay = new PayCounter();
            pay.Prepare(problem, _session.Active.Difficulty);
            _minigame = pay;
            var context = new MinigameContext
            {
                Difficulty = _session.Active.Difficulty,
                IsWorkJob = true,
                MaxMistakes = Mathf.Max(1, SalonEconomy.MaxMistakes - _jobMistakes)
            };
            pay.Begin(_stage, this, context, OnPayDone);
        }

        void OnPayDone(MinigameResult result)
        {
            _minigame?.Dispose();
            _minigame = null;
            _jobMistakes += result.Mistakes;
            if (_clock != null && _clock.Expired)
            {
                EndWorkDay();
                return;
            }

            if (!result.Success)
            {
                ShowWalkout("They left — the change wasn't right.");
                return;
            }

            _session.AddPay(_customer.OfferCents);
            _jobsDone += 1;
            ShowPaid();
        }

        void ShowPaid()
        {
            ClearStage();
            RefreshHud();
            var title = UiFactory.Label(_stage, "Title", "Nice work!", UiTheme.HeadingSize, UiTheme.Ink);
            UiFactory.PinTop(title.rectTransform, 80, 200, 24);
            var body = UiFactory.Label(_stage, "Body",
                _customer.Name + " paid " + Money.Format(_customer.OfferCents, _session.Active.Difficulty) + ".",
                UiTheme.BodySize, UiTheme.InkSoft);
            UiFactory.PinTop(body.rectTransform, 100, 300, 40);
            var go = UiFactory.Button(_stage, "Next", "Next customer", UiTheme.Mint, NextCustomer, 120);
            UiFactory.PinBottom(go.GetComponent<RectTransform>(), 120, 48, 64);
        }

        void ShowWalkout(string reason)
        {
            ClearStage();
            var title = UiFactory.Label(_stage, "Title", "Oh no...", UiTheme.HeadingSize, UiTheme.Ink);
            UiFactory.PinTop(title.rectTransform, 80, 200, 24);
            var body = UiFactory.Label(_stage, "Body", reason, UiTheme.BodySize, UiTheme.InkSoft);
            UiFactory.PinTop(body.rectTransform, 100, 300, 40);
            var go = UiFactory.Button(_stage, "Next", "Next customer", UiTheme.Cream, NextCustomer, 120);
            UiFactory.PinBottom(go.GetComponent<RectTransform>(), 120, 48, 64);
        }

        void ShowSleep()
        {
            ClearStage();
            var title = UiFactory.Label(_stage, "Title", "Night night, " + Name() + ".", UiTheme.HeadingSize, UiTheme.Ink);
            UiFactory.PinTop(title.rectTransform, 100, 200, 32);
            var body = UiFactory.Label(_stage, "Body", "Saved. Tomorrow is another salon day.", UiTheme.BodySize, UiTheme.InkSoft);
            UiFactory.PinTop(body.rectTransform, 100, 320, 40);
            var go = UiFactory.Button(_stage, "Sleep", "Sleep", UiTheme.Lavender, () =>
            {
                _session.AdvanceAfterSleep();
                EnterPhase(DayPhase.MorningWake, false);
            }, 120);
            UiFactory.PinBottom(go.GetComponent<RectTransform>(), 120, 48, 64);
        }

        void EndWorkDay()
        {
            _clock = null;
            _minigame?.Dispose();
            _minigame = null;
            EnterPhase(DayPhase.NightArrive);
        }

        void Choice(Transform parent, string label, Action onClick, Color? color = null)
        {
            SizeButton(UiFactory.Button(parent, label, label, color ?? UiTheme.Cream, () =>
            {
                onClick?.Invoke();
            }), 100);
        }

        static void SizeButton(Button button, int height = 110)
        {
            SizeButton(button.GetComponent<RectTransform>(), height);
        }

        static void SizeButton(RectTransform rt, int height)
        {
            var le = rt.gameObject.GetComponent<LayoutElement>();
            if (le == null)
            {
                le = rt.gameObject.AddComponent<LayoutElement>();
            }

            le.preferredHeight = height;
            le.minHeight = height;
            rt.sizeDelta = new Vector2(rt.sizeDelta.x, height);
        }
    }
}
