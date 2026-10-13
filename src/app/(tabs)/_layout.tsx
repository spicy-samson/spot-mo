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
            ? "rgba(18, 18, 20, 0.92)"
            : "rgba(255, 255, 255, 0.92)",
          borderTopColor: isDark
            ? "rgba(255, 255, 255, 0.1)"
            : "rgba(0, 0, 0, 0.08)",
          paddingBottom: Math.max(insets.bottom, 8),
          shadowColor: "#000000",
          shadowOpacity: isDark ? 0.35 : 0.05,
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

        const activeColor = colors.copper;
        const inactiveColor = colors.subtle;

        // 1. Center Tab: Explore
        if (route.name === "index") {
          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              activeOpacity={0.7}
              style={styles.tabItem}
              accessibilityLabel="Explore live map and nearby decisions"
              accessibilityRole="button"
            >
              <Ionicons
                name={isFocused ? "compass" : "compass-outline"}
                size={23}
                color={isFocused ? activeColor : inactiveColor}
              />
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: isFocused ? activeColor : inactiveColor,
                    fontFamily: isFocused
                      ? FontFamily.sansBold
                      : FontFamily.sansMedium,
                  },
                ]}
              >
                Explore
              </Text>
            </TouchableOpacity>
          );
        }

        // 2. Left Tab: Spots
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
                color={isFocused ? activeColor : inactiveColor}
              />
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: isFocused ? activeColor : inactiveColor,
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

        // 3. Right Tab: Spend
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
                color={isFocused ? activeColor : inactiveColor}
              />
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: isFocused ? activeColor : inactiveColor,
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
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    shadowOffset: { width: 0, height: -2 },
    shadowRadius: 10,
    elevation: 8,
    zIndex: 50,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    gap: 3,
  },
  tabLabel: {
    fontSize: 10,
    letterSpacing: 0.15,
  },
});
