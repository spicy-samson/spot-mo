import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import { Stack } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { db } from "@/../db/client";
import migrations from "@/../drizzle/migrations";

export default function RootLayout() {
  const { success, error } = useMigrations(db, migrations as any);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Migration Error: {error.message}</Text>
      </View>
    );
  }

  if (!success) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#288e2d" />
      </View>
    );
  }

  return (
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
          headerShown: true,
          title: "New Spot",
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
