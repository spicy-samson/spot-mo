import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* The main tab interface */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

      {/* Detail screens (slide from right) */}
      <Stack.Screen 
        name="spot/[id]" 
        options={{ headerShown: true, title: 'Spot Details' }} 
      />

      {/* Modals (slide up from bottom) */}
      <Stack.Screen 
        name="spot/new" 
        options={{ presentation: 'modal', headerShown: true, title: 'New Spot' }} 
      />
      <Stack.Screen 
        name="log-visit" 
        options={{ presentation: 'modal', headerShown: true, title: 'Log Visit' }} 
      />
      <Stack.Screen 
        name="settings" 
        options={{ presentation: 'modal', headerShown: true, title: 'Settings' }} 
      />
    </Stack>
  );
}