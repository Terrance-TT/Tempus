import { useEffect, useState } from "react";

export type ThemeMode = "light" | "dark";

export interface ColorPreset {
  id: string;
  label: string;
  swatch: string;
  vars: {
    primary: string;
    ring: string;
    sidebarPrimary: string;
    sidebarRing: string;
  };
}

export const COLOR_PRESETS: ColorPreset[] = [
  {
    id: "sage",
    label: "Sage",
    swatch: "hsl(155, 30%, 45%)",
    vars: { primary: "155 30% 45%", ring: "155 30% 45%", sidebarPrimary: "155 30% 45%", sidebarRing: "155 30% 45%" },
  },
  {
    id: "ocean",
    label: "Ocean",
    swatch: "hsl(205, 55%, 48%)",
    vars: { primary: "205 55% 48%", ring: "205 55% 48%", sidebarPrimary: "205 55% 48%", sidebarRing: "205 55% 48%" },
  },
  {
    id: "sunset",
    label: "Sunset",
    swatch: "hsl(22, 75%, 52%)",
    vars: { primary: "22 75% 52%", ring: "22 75% 52%", sidebarPrimary: "22 75% 52%", sidebarRing: "22 75% 52%" },
  },
  {
    id: "berry",
    label: "Berry",
    swatch: "hsl(335, 55%, 50%)",
    vars: { primary: "335 55% 50%", ring: "335 55% 50%", sidebarPrimary: "335 55% 50%", sidebarRing: "335 55% 50%" },
  },
  {
    id: "slate",
    label: "Slate",
    swatch: "hsl(222, 20%, 45%)",
    vars: { primary: "222 20% 45%", ring: "222 20% 45%", sidebarPrimary: "222 20% 45%", sidebarRing: "222 20% 45%" },
  },
];

const MODE_KEY = "tempus_theme_mode";
const PRESET_KEY = "tempus_theme_preset";

export function getStoredMode(): ThemeMode {
  const stored = localStorage.getItem(MODE_KEY);
  return stored === "light" || stored === "dark" ? stored : "dark";
}

export function getStoredPreset(): string {
  const stored = localStorage.getItem(PRESET_KEY);
  return stored && COLOR_PRESETS.some((p) => p.id === stored) ? stored : "sage";
}

function applyMode(mode: ThemeMode) {
  document.documentElement.classList.toggle("dark", mode === "dark");
}

function applyPreset(presetId: string) {
  const preset = COLOR_PRESETS.find((p) => p.id === presetId) ?? COLOR_PRESETS[0];
  const root = document.documentElement.style;
  root.setProperty("--primary", preset.vars.primary);
  root.setProperty("--ring", preset.vars.ring);
  root.setProperty("--sidebar-primary", preset.vars.sidebarPrimary);
  root.setProperty("--sidebar-ring", preset.vars.sidebarRing);
}

/** Applies the persisted theme mode + color preset. Call once at app startup, before paint if possible. */
export function applyStoredTheme() {
  applyMode(getStoredMode());
  applyPreset(getStoredPreset());
}

export function useTheme() {
  const [mode, setModeState] = useState<ThemeMode>(getStoredMode);
  const [presetId, setPresetIdState] = useState<string>(getStoredPreset);

  useEffect(() => {
    applyMode(mode);
  }, [mode]);

  useEffect(() => {
    applyPreset(presetId);
  }, [presetId]);

  const setMode = (next: ThemeMode) => {
    localStorage.setItem(MODE_KEY, next);
    setModeState(next);
  };

  const setPresetId = (next: string) => {
    localStorage.setItem(PRESET_KEY, next);
    setPresetIdState(next);
  };

  return { mode, setMode, presetId, setPresetId, presets: COLOR_PRESETS };
}
