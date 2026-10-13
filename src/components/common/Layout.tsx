import React from "react";
import { View, ViewProps, StyleSheet } from "react-native";

export interface RowProps extends ViewProps {
  between?: boolean;
  center?: boolean;
  end?: boolean;
  gap?: number;
}

/**
 * Clean `<Row>` flex container.
 * Eliminates repetitive `flexDirection: "row"`, `alignItems: "center"`, `gap`, etc.
 */
export function Row({
  between,
  center = true,
  end,
  gap = 0,
  style,
  children,
  ...props
}: RowProps) {
  return (
    <View
      style={[
        styles.row,
        between && styles.between,
        center && styles.center,
        end && styles.end,
        gap > 0 && { gap },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

export interface ColProps extends ViewProps {
  center?: boolean;
  gap?: number;
}

/**
 * Clean `<Col>` flex container with optional gap and center alignment.
 */
export function Col({
  center,
  gap = 0,
  style,
  children,
  ...props
}: ColProps) {
  return (
    <View
      style={[
        styles.col,
        center && styles.center,
        gap > 0 && { gap },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
  },
  col: {
    flexDirection: "column",
  },
  between: {
    justifyContent: "space-between",
  },
  center: {
    alignItems: "center",
  },
  end: {
    justifyContent: "flex-end",
  },
});

