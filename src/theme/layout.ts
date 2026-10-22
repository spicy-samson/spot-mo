import { StyleSheet } from "react-native";

/**
 * Universal layout utility tokens.
 * Compose these in `style={[L.rowBetween, L.gap8, styles.myBox]}` to eliminate
 * redundant flex/align/gap boilerplate across stylesheets.
 */
export const L = StyleSheet.create({
  // Flex Layout
  fill: { flex: 1 },
  row: { flexDirection: "row" },
  rowCenter: { flexDirection: "row", alignItems: "center" },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rowEnd: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end" },
  col: { flexDirection: "column" },
  center: { alignItems: "center", justifyContent: "center" },

  // Common Gaps
  gap2: { gap: 2 },
  gap4: { gap: 4 },
  gap6: { gap: 6 },
  gap8: { gap: 8 },
  gap10: { gap: 10 },
  gap12: { gap: 12 },
  gap16: { gap: 16 },

  // Shape Radii
  roundedXs: { borderRadius: 4 },
  roundedSm: { borderRadius: 8 },
  roundedMd: { borderRadius: 12 },
  roundedLg: { borderRadius: 18 },
  roundedXl: { borderRadius: 24 },
  pill: { borderRadius: 999 },

  // Surfaces & Shadows
  shadowSm: {
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  shadowMd: {
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
});

