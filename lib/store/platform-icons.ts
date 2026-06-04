import type { IconType } from "react-icons";
import {
  SiActivision,
  SiAndroid,
  SiApple,
  SiBattledotnet,
  SiEa,
  SiEpicgames,
  SiGogdotcom,
  SiOrigin,
  SiPlaystation,
  SiPlaystation4,
  SiPlaystation5,
  SiRockstargames,
  SiSteam,
  SiUbisoft,
} from "react-icons/si";
import { RiXboxFill } from "react-icons/ri";
import { TbDeviceGamepad2, TbDeviceNintendo } from "react-icons/tb";

export type PlatformIconConfig = {
  icon: IconType;
  label: string;
};

/** Normaliza strings de plataforma del catálogo a una clave estable. */
export function normalizePlatformKey(platform: string): string {
  const raw = platform.toLowerCase().trim();
  const n = raw.replace(/[^a-z0-9]+/g, " ");

  if (n.includes("steam")) return "steam";
  if (n.includes("xbox") || n.includes("microsoft store")) return "xbox";
  if (/\bps5\b/.test(n) || n.includes("playstation 5")) return "ps5";
  if (/\bps4\b/.test(n) || n.includes("playstation 4")) return "ps4";
  if (n.includes("playstation") || n === "psn") return "playstation";
  if (n.includes("nintendo") || n.includes("switch")) return "nintendo";
  if (n.includes("epic")) return "epic";
  if (n.includes("gog")) return "gog";
  if (n.includes("origin") || n.includes("ea app") || n === "ea")
    return "origin";
  if (n.includes("ubisoft") || n.includes("uplay")) return "ubisoft";
  if (n.includes("battle") || n.includes("blizzard")) return "battlenet";
  if (n.includes("rockstar")) return "rockstar";
  if (n.includes("activision")) return "activision";
  if (n.includes("android")) return "android";
  if (n.includes("ios") || n.includes("apple") || n.includes("mac"))
    return "apple";

  return raw.replace(/\s+/g, "") || "other";
}

const PLATFORM_ICONS: Record<string, PlatformIconConfig> = {
  steam: { icon: SiSteam, label: "Steam" },
  xbox: { icon: RiXboxFill, label: "Xbox" },
  playstation: { icon: SiPlaystation, label: "PlayStation" },
  ps4: { icon: SiPlaystation4, label: "PlayStation 4" },
  ps5: { icon: SiPlaystation5, label: "PlayStation 5" },
  nintendo: { icon: TbDeviceNintendo, label: "Nintendo" },
  epic: { icon: SiEpicgames, label: "Epic Games" },
  gog: { icon: SiGogdotcom, label: "GOG" },
  origin: { icon: SiOrigin, label: "Origin / EA" },
  ubisoft: { icon: SiUbisoft, label: "Ubisoft" },
  battlenet: { icon: SiBattledotnet, label: "Battle.net" },
  rockstar: { icon: SiRockstargames, label: "Rockstar" },
  activision: { icon: SiActivision, label: "Activision" },
  ea: { icon: SiEa, label: "EA" },
  android: { icon: SiAndroid, label: "Android" },
  apple: { icon: SiApple, label: "Apple" },
  other: { icon: TbDeviceGamepad2, label: "Plataforma" },
};

export function getPlatformIconConfig(platform: string): PlatformIconConfig {
  const key = normalizePlatformKey(platform);
  return (
    PLATFORM_ICONS[key] ?? {
      icon: TbDeviceGamepad2,
      label: platform.trim() || "Plataforma",
    }
  );
}
