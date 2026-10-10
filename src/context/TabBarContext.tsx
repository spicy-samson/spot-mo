import { createContext, useContext } from "react";

export interface TabBarContextType {
  isTabBarHidden: boolean;
  setIsTabBarHidden: (hidden: boolean) => void;
}

export const TabBarContext = createContext<TabBarContextType>({
  isTabBarHidden: false,
  setIsTabBarHidden: () => {},
});

export const useTabBar = () => useContext(TabBarContext);
