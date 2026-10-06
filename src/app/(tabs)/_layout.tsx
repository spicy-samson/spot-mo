import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useState } from "react";
import { DynamicColorIOS, Platform } from "react-native";

import { TabBarContext } from "../../context/TabBarContext";

export default function TabLayout() {
  const [isTabBarHidden, setIsTabBarHidden] = useState(false);

  return (
    <TabBarContext value={{ setIsTabBarHidden }}>
      <NativeTabs
        // Dynamic colors adapt to light/dark mode under the liquid glass
        hidden={isTabBarHidden}
        labelStyle={{
          color: Platform.select({
            ios: DynamicColorIOS({ dark: "white", light: "black" }),
            default: undefined,
          }),
        }}
        tintColor={Platform.select({
          ios: DynamicColorIOS({ dark: "#38bdf8", light: "#0284c7" }),
        })}
      >
        {/* 1. Home / Map & Decisions */}
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Label>Explore</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            sf={{ default: "house", selected: "house.fill" }}
            md={{ default: "home", selected: "home_filled" }}
          />
        </NativeTabs.Trigger>

        {/* 2. Curated Spots Black Book */}
        <NativeTabs.Trigger name="spots">
          <NativeTabs.Trigger.Label>Spots</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            sf={{ default: "bookmark", selected: "bookmark.fill" }}
            md={{ default: "bookmark_border", selected: "bookmark" }}
          />
        </NativeTabs.Trigger>

        {/* 3. Daily Budget & Spend */}
        <NativeTabs.Trigger name="spend">
          <NativeTabs.Trigger.Label>Spend</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            sf={{ default: "creditcard", selected: "creditcard.fill" }}
            md={{ default: "payments", selected: "payments" }}
          />
        </NativeTabs.Trigger>
      </NativeTabs>
    </TabBarContext>
  );
}
