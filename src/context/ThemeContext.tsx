import { DarkColors, LightColors } from "@/constants/colors";
import React, { createContext, useContext, useState } from "react";
import { useColorScheme as useRNColorScheme } from "react-native";

export type ThemeMode = "light" | "dark" | "system";

export interface ThemeContextType {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  isDark: boolean;
  colors: typeof LightColors;
}

export const ThemeContext = createContext<ThemeContextType>({
  mode: "light",
  setMode: () => {},
  toggleTheme: () => {},
  isDark: false,
  colors: LightColors,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useRNColorScheme();
  // Default to 'light' so the app opens in clean daylight mode by default
  const [mode, setMode] = useState<ThemeMode>("light");

  const isDark = mode === "system" ? systemScheme === "dark" : mode === "dark";
  const colors = isDark ? DarkColors : LightColors;

  const toggleTheme = () => {
    setMode((prev) => {
      const currentDark =
        prev === "system" ? systemScheme === "dark" : prev === "dark";
      return currentDark ? "light" : "dark";
    });
  };

  return (
    <ThemeContext.Provider
      value={{ mode, setMode, toggleTheme, isDark, colors }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
