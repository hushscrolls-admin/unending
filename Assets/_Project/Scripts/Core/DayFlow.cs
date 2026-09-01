namespace StyleTime
{
    public static class DayFlow
    {
        public static RoomId RoomFor(DayPhase phase)
        {
            switch (phase)
            {
                case DayPhase.Title:
                case DayPhase.SlotPick:
                    return RoomId.Title;
                case DayPhase.Creation:
                    return RoomId.Creator;
                case DayPhase.MorningWake:
                case DayPhase.MorningDress:
                case DayPhase.MorningHair:
                case DayPhase.NightPjs:
                case DayPhase.NightSleep:
                    return RoomId.Bedroom;
                case DayPhase.MorningTeeth:
                case DayPhase.NightTeeth:
                case DayPhase.NightShower:
                    return RoomId.Bathroom;
                case DayPhase.MorningBreakfast:
                case DayPhase.NightDinner:
                    return RoomId.Kitchen;
                case DayPhase.Work:
                case DayPhase.MorningLeave:
                    return RoomId.Salon;
                case DayPhase.NightArrive:
                    return RoomId.Bedroom;
                default:
                    return RoomId.Title;
            }
        }

        public static DayPhase NextAfter(DayPhase phase)
        {
            switch (phase)
            {
                case DayPhase.MorningWake: return DayPhase.MorningDress;
                case DayPhase.MorningDress: return DayPhase.MorningTeeth;
                case DayPhase.MorningTeeth: return DayPhase.MorningHair;
                case DayPhase.MorningHair: return DayPhase.MorningBreakfast;
                case DayPhase.MorningBreakfast: return DayPhase.MorningLeave;
                case DayPhase.MorningLeave: return DayPhase.Work;
                case DayPhase.Work: return DayPhase.NightArrive;
                case DayPhase.NightArrive: return DayPhase.NightDinner;
                case DayPhase.NightDinner: return DayPhase.NightShower;
                case DayPhase.NightShower: return DayPhase.NightTeeth;
                case DayPhase.NightTeeth: return DayPhase.NightPjs;
                case DayPhase.NightPjs: return DayPhase.NightSleep;
                default: return DayPhase.MorningWake;
            }
        }

        public static bool ShowsDoll(DayPhase phase)
        {
            switch (phase)
            {
                case DayPhase.Title:
                case DayPhase.SlotPick:
                case DayPhase.Work:
                    return false;
                default:
                    return true;
            }
        }
    }
}
