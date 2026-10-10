import { useDrizzleStudio } from "expo-drizzle-studio-plugin";
import { StyleSheet, View } from "react-native";
import MapView from "react-native-maps";

import { expo } from "@/../db/client";

export default function Index() {
  useDrizzleStudio(expo);

  return (
    <View style={styles.container}>
      <MapView
        showsUserLocation
        initialRegion={{
          latitude: 37.78825,
          longitude: -122.4324,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        style={styles.map}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: "100%",
    height: "100%",
  },
});
