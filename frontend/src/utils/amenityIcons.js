import {
  IconWifi,
  IconParkingCircle,
  IconGlassCocktail,
  IconToolsKitchen2,
  IconCoffee,
  IconBellRinging,
  IconClock24,
  IconBriefcase,
  IconPresentation,
  IconUsersGroup,
  IconBarbell,
  IconMassage,
  IconSparkles,
  IconPool,
  IconGift,
  IconLock,
  IconShieldCheck,
  IconTruck,
  IconDeviceTv,
  IconSmokingNo,
  IconBell,
  IconSnowflake,
  IconWheelchair,
  IconWashMachine,
  IconBath,
  IconChargingPile,
  IconFirstAidKit,
  IconIroning,
} from '@tabler/icons-react';

// Amenity names are free text (from hosts), so match on keywords to pick a
// relevant icon instead of showing the same generic icon for everything.
// Shared between hotel and BnB listing pages — BnB amenity vocabulary
// differs from Hotel's (e.g. "Wide doorway", "Smoke alarm" vs "24/7 Front
// Desk", "Spa"), so both sets of terms need their own rules here.
const AMENITY_ICON_RULES = [
  [/non.?smoking/i, IconSmokingNo],
  [/wi-?fi|internet/i, IconWifi],
  [/shuttle/i, IconTruck],
  [/parking/i, IconParkingCircle],
  [/bar\b|cocktail|lounge/i, IconGlassCocktail],
  [/restaurant|kitchen/i, IconToolsKitchen2],
  [/breakfast/i, IconCoffee],
  [/room service/i, IconBellRinging],
  [/front desk|24.?7|24.?hour/i, IconClock24],
  [/business/i, IconBriefcase],
  [/conference|meeting/i, IconPresentation],
  [/family/i, IconUsersGroup],
  [/fitness|gym/i, IconBarbell],
  [/spa\b/i, IconMassage],
  [/pool|swim/i, IconPool],
  [/minibar|mini bar/i, IconGift],
  [/safe\b/i, IconLock],
  [/security|camera/i, IconShieldCheck],
  [/tv|television/i, IconDeviceTv],
  [/smoke alarm|carbon monoxide|fire extinguisher/i, IconBell],
  [/air conditioning|\bac\b/i, IconSnowflake],
  [/wide doorway|step-free|accessib|wheelchair/i, IconWheelchair],
  [/dryer|washer|washing machine/i, IconWashMachine],
  [/hot tub|bathtub/i, IconBath],
  [/ev charger|charging/i, IconChargingPile],
  [/first aid/i, IconFirstAidKit],
  [/iron\b/i, IconIroning],
];

export const getAmenityIcon = (name = '') => {
  const match = AMENITY_ICON_RULES.find(([pattern]) => pattern.test(name));
  return match ? match[1] : IconSparkles;
};
