// Color tokens mirrored from the web app's CSS variables so both surfaces
// share the same visual language.
//
// Web source (index.css, light):
//   --background:       40  20% 97%  → #f8f7f3  warm cream
//   --foreground:       160 30% 20%  → #24423a  dark forest green
//   --primary:          155 30% 45%  → #4d8265  vibrant green
//   --secondary:        40  20% 92%  → #ece9e3  warm light
//   --muted:            155 15% 92%  → #e4ece8
//   --muted-foreground: 160 15% 45%  → #5f7870
//   --border:           155 15% 85%  → #ccd8d3
//   --card:             0   0%  100% → #ffffff

const colors = {
  light: {
    text: "#24423a",
    tint: "#4d8265",

    background: "#f8f7f3",
    foreground: "#24423a",

    card: "#ffffff",
    cardForeground: "#24423a",

    primary: "#4d8265",
    primaryForeground: "#ffffff",

    secondary: "#ece9e3",
    secondaryForeground: "#24423a",

    muted: "#e4ece8",
    mutedForeground: "#5f7870",

    accent: "#e8a835",
    accentForeground: "#3a2200",

    destructive: "#cc3333",
    destructiveForeground: "#ffffff",

    border: "#ccd8d3",
    input: "#ccd8d3",
  },
  dark: {
    text: "#e8ede9",
    tint: "#7cb89a",

    background: "#1a2420",
    foreground: "#e8ede9",

    card: "#233029",
    cardForeground: "#e8ede9",

    primary: "#7cb89a",
    primaryForeground: "#1a2420",

    secondary: "#2e3f38",
    secondaryForeground: "#7cb89a",

    muted: "#2e3f38",
    mutedForeground: "#7a9b8e",

    accent: "#c48c25",
    accentForeground: "#fffbe8",

    destructive: "#e06060",
    destructiveForeground: "#ffffff",

    border: "#3a5049",
    input: "#3a5049",
  },

  radius: 16,
};

export default colors;
