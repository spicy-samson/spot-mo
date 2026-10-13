import { useEffect } from "react";
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import {
  Lora_400Regular,
  Lora_500Medium,
  Lora_600SemiBold,
  Lora_700Bold,
  Lora_400Regular_Italic,
} from "@expo-google-fonts/lora";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { db } from "@/../db/client";
import migrations from "@/../drizzle/migrations";

import { ThemeProvider } from "@/context/ThemeContext";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Lora_400Regular,
    Lora_500Medium,
    Lora_600SemiBold,
    Lora_700Bold,
    Lora_400Regular_Italic,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const { success, error } = useMigrations(db, migrations as any);

  useEffect(() => {
    if ((fontsLoaded || fontError) && success) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError, success]);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Migration Error: {error.message}</Text>
      </View>
    );
  }

  if (!success || (!fontsLoaded && !fontError)) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1C1917" />
      </View>
    );
  }

  return (
    <ThemeProvider>
      <Stack screenOptions={{ headerShown: false }}>
        {/* The main tab interface */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

        {/* Detail screens (slide from right) */}
        <Stack.Screen
          name="spot/[id]"
          options={{ headerShown: true, title: "Spot Details" }}
        />

        {/* Modals (slide up from bottom) */}
        <Stack.Screen
          name="spot/new"
          options={{
            presentation: "modal",
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="log-visit"
          options={{
            presentation: "modal",
            headerShown: true,
            title: "Log Visit",
          }}
        />
        <Stack.Screen
          name="settings"
          options={{
            presentation: "modal",
            headerShown: true,
            title: "Settings",
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    color: "red",
    padding: 20,
    textAlign: "center",
  },
});
