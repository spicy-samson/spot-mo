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

  // Distinct Triad Categories (High hue separation, Google/Apple Maps conventions)
  food: "#F97316", // Warm Vibrant Orange (Appetite & dining standard)
  foodLight: "#FFF7ED",
  leisure: "#16A34A", // Park & Recreation Green (Outdoors & activity standard)
  leisureLight: "#F0FDF4",
  selfCare: "#8B5CF6", // Restorative Lavender Purple (Wellness & spa standard)
  selfCareLight: "#F5F3FF",

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
  sage: "#8B5CF6",
  moss: "#16A34A",
  mossDark: "#15803D",
  mossLight: "#F0FDF4",
  ochre: "#F97316",
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

  // Distinct Triad Categories (Luminous & brightened for dark OLED maps)
  food: "#FB923C", // Brightened Warm Orange
  foodLight: "#431407",
  leisure: "#4ADE80", // Brightened Mint/Emerald Green
  leisureLight: "#052E16",
  selfCare: "#A78BFA", // Luminous Lavender Purple
  selfCareLight: "#2E1065",

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
  sage: "#A78BFA",
  moss: "#4ADE80",
  mossDark: "#22C55E",
  mossLight: "#052E16",
  ochre: "#FB923C",
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

export { L } from "@/theme/layout";
export { useThemedStyles, type ThemeColors } from "@/theme/useThemedStyles";
export { Row, Col } from "@/components/common/Layout";
