import { useMemo } from "react";
import { StyleSheet } from "react-native";
import { useTheme, LightColors } from "@/constants/theme";

export type ThemeColors = typeof LightColors;

/**
 * Custom hook to generate a StyleSheet bound directly to the active theme colors.
 * Eliminates the need to maintain static styles in `StyleSheet.create` and then
 * clutter JSX with inline arrays like `style={[styles.box, { backgroundColor: colors.card }]}`.
 *
 * @example
 * const styles = useThemedStyles((colors, isDark) => ({
 *   card: {
 *     backgroundColor: colors.card,
 *     borderColor: colors.border,
 *     borderRadius: 16,
 *   },
 * }));
 */
export function useThemedStyles<
  T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>
>(
  factory: (colors: ThemeColors, isDark: boolean) => T
): T {
  const { colors, isDark } = useTheme();
  return useMemo(() => StyleSheet.create(factory(colors, isDark)), [colors, isDark]);
}

