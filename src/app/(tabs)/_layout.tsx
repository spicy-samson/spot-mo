import { Tabs } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";

import { useTheme, FontFamily } from "@/constants/theme";
import { TabBarContext } from "@/context/TabBarContext";

function CustomBottomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  return (
    <View
      style={[
        styles.tabBarContainer,
        {
          backgroundColor: isDark
            ? "rgba(24, 24, 27, 0.95)"
            : "rgba(255, 255, 255, 0.96)",
          borderTopColor: colors.border,
          paddingBottom: Math.max(insets.bottom, 10),
        },
      ]}
    >
      {state.routes.map((route: any, index: number) => {
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        // 1. Center Hero Orb: Explore (The pulsating heart of Spot Mo)
        if (route.name === "index") {
          return (
            <View key={route.key} style={styles.centerOrbWrapper}>
              <TouchableOpacity
                onPress={onPress}
                activeOpacity={0.85}
                style={[
                  styles.centerOrbButton,
                  {
                    backgroundColor: isDark ? "#F5F5F4" : "#1C1917",
                    borderColor: isDark ? "#27272A" : "#FFFFFF",
                    shadowColor: isDark ? "#000000" : "#1C1917",
                  },
                ]}
                accessibilityLabel="Explore live map and nearby decisions"
                accessibilityRole="button"
              >
                <Ionicons
                  name={isFocused ? "compass" : "compass-outline"}
                  size={27}
                  color={isDark ? "#1C1917" : "#FFFFFF"}
                />
              </TouchableOpacity>
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: isFocused ? colors.leisure : colors.subtle,
                    fontFamily: isFocused
                      ? FontFamily.sansBold
                      : FontFamily.sansMedium,
                    marginTop: 3,
                  },
                ]}
              >
                Explore
              </Text>
            </View>
          );
        }

        // 2. Left Tab: Spots (Curated Black Book)
        if (route.name === "spots") {
          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              activeOpacity={0.7}
              style={styles.tabItem}
              accessibilityLabel="Saved spots and wishlist"
              accessibilityRole="button"
            >
              <Ionicons
                name={isFocused ? "bookmark" : "bookmark-outline"}
                size={22}
                color={isFocused ? colors.leisure : colors.subtle}
              />
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: isFocused ? colors.leisure : colors.subtle,
                    fontFamily: isFocused
                      ? FontFamily.sansBold
                      : FontFamily.sansMedium,
                  },
                ]}
              >
                Spots
              </Text>
            </TouchableOpacity>
          );
        }

        // 3. Right Tab: Spend (Financial Diary & Logs)
        if (route.name === "spend") {
          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              activeOpacity={0.7}
              style={styles.tabItem}
              accessibilityLabel="Daily budget and spend history"
              accessibilityRole="button"
            >
              <Ionicons
                name={isFocused ? "wallet" : "wallet-outline"}
                size={22}
                color={isFocused ? colors.leisure : colors.subtle}
              />
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: isFocused ? colors.leisure : colors.subtle,
                    fontFamily: isFocused
                      ? FontFamily.sansBold
                      : FontFamily.sansMedium,
                  },
                ]}
              >
                Spend
              </Text>
            </TouchableOpacity>
          );
        }

        return null;
      })}
    </View>
  );
}

export default function TabLayout() {
  const [isTabBarHidden, setIsTabBarHidden] = useState(false);

  return (
    <TabBarContext.Provider value={{ isTabBarHidden, setIsTabBarHidden }}>
      <Tabs
        initialRouteName="index"
        tabBar={(props) =>
          isTabBarHidden ? null : <CustomBottomTabBar {...props} />
        }
        screenOptions={{
          headerShown: false,
        }}
      >
        {/* Left: Spots Collection */}
        <Tabs.Screen
          name="spots"
          options={{
            title: "Spots",
          }}
        />

        {/* Center: Live Map & Decision Radar */}
        <Tabs.Screen
          name="index"
          options={{
            title: "Explore",
          }}
        />

        {/* Right: Financial Diary & Receipts */}
        <Tabs.Screen
          name="spend"
          options={{
            title: "Spend",
          }}
        />
      </Tabs>
    </TabBarContext.Provider>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    borderTopWidth: 1,
    paddingTop: 8,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -3 },
    elevation: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    gap: 3,
  },
  centerOrbWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -22,
  },
  centerOrbButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3.5,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 8,
  },
  tabLabel: {
    fontSize: 10,
    letterSpacing: 0.2,
  },
});
