import { useColorScheme } from "react-native";

export const LightColors = {
  // Primary Anchor CTA (Obsidian Espresso — Sleek neutral, zero glare, lets markers shine)
  copper: "#1C1917",
  copperDark: "#0C0A09",
  copperLight: "#292524",
  terracotta: "#1C1917",
  terracottaDark: "#0C0A09",
  terracottaLight: "#F5F5F4",
  primaryText: "#FFFFFF",

  // Distinct Triad Categories
  food: "#2E6F40", // Kyoto Matcha / Crisp Olive (Appetizing culinary green)
  foodLight: "#EAF4ED",
  leisure: "#B45309", // Warm Sand Ochre / Honey Amber (Cozy cafe & discovery)
  leisureLight: "#FEF3C7",
  selfCare: "#4F46E5", // Muted Iris / Indigo (Restorative wellness)
  selfCareLight: "#EEF2FF",

  // Neutrals & Surfaces
  canvas: "#FBF9F5", // Oat Milk Canvas
  canvasMuted: "#F2EFE9",
  card: "#FFFFFF",
  cardGlass: "rgba(255, 255, 255, 0.96)",
  charcoal: "#1C1917",
  umber: "#292524",
  sand: "#FBF9F5",
  sandDark: "#E7E5E4",
  border: "#E7E5E4",
  borderSubtle: "#F5F5F4",
  subtle: "#78716C",
  muted: "#A8A29E",
  caption: "#8E8E93",
  highlight: "#FEF3C7",

  // Glass Capsules
  headerCapsuleBg: "rgba(28, 25, 23, 0.94)",
  headerCapsuleText: "#F5F5F4",
  headerCapsuleSubtext: "#A8A29E",

  // Map & Controls
  satelliteBtnBg: "rgba(255, 255, 255, 0.95)",
  satelliteBtnIcon: "#1C1917",
  fabBg: "#1C1917",
  fabIcon: "#FFFFFF",

  // Status & Semantics
  sage: "#4F46E5",
  moss: "#2E6F40",
  mossDark: "#1E4A2B",
  mossLight: "#EAF4ED",
  ochre: "#B45309",
};

export const DarkColors = {
  // Primary Anchor CTA (Crisp Alabaster — Pops cleanly on dark map without neon glare)
  copper: "#F5F5F4",
  copperDark: "#E7E5E4",
  copperLight: "#FFFFFF",
  terracotta: "#F5F5F4",
  terracottaDark: "#E7E5E4",
  terracottaLight: "#292524",
  primaryText: "#1C1917",

  // Distinct Triad Categories (Luminous but soft on dark surfaces)
  food: "#4ADE80", // Vibrant Matcha Mint
  foodLight: "#143520",
  leisure: "#FBBF24", // Warm Golden Ochre
  leisureLight: "#3D260A",
  selfCare: "#818CF8", // Soft Iris Lavender
  selfCareLight: "#1E1B4B",

  // Neutrals & Surfaces (OLED Deep Charcoal)
  canvas: "#0C0A09",
  canvasMuted: "#18181B",
  card: "#1C1917",
  cardGlass: "rgba(24, 24, 27, 0.92)",
  charcoal: "#F5F5F4",
  umber: "#E7E5E4",
  sand: "#1C1917",
  sandDark: "#292524",
  border: "#292524",
  borderSubtle: "#1C1917",
  subtle: "#A8A29E",
  muted: "#78716C",
  caption: "#A1A1AA",
  highlight: "#292524",

  // Glass Capsules
  headerCapsuleBg: "rgba(18, 18, 20, 0.94)",
  headerCapsuleText: "#F5F5F4",
  headerCapsuleSubtext: "#A1A1AA",

  // Map & Controls
  satelliteBtnBg: "rgba(30, 30, 34, 0.95)",
  satelliteBtnIcon: "#F5F5F4",
  fabBg: "#F5F5F4",
  fabIcon: "#1C1917",

  // Status & Semantics
  sage: "#818CF8",
  moss: "#4ADE80",
  mossDark: "#22C55E",
  mossLight: "#143520",
  ochre: "#FBBF24",
};

export const Colors = LightColors;

export { useTheme, ThemeProvider } from "@/context/ThemeContext";
export { FontFamily, Typography } from "@/constants/typography";

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};
