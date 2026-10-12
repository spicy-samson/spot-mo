import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";
import { useDrizzleStudio } from "expo-drizzle-studio-plugin";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import MapView, {Region} from "react-native-maps";

import { expo } from "@/../db/client";
// Default fallback region (e.g. Metro Manila) in case permission is denied
const DEFAULT_REGION: Region = {
  latitude: 14.5547,
  longitude: 121.0244,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export default function Index() {
  useDrizzleStudio(expo);

  const mapRef = useRef<MapView>(null);
  const [initialRegion, setInitialRegion] = useState<Region | null>(null);
  useEffect(() => {
    async function getCurrentLocation() {
      // 1. Request foreground location permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setInitialRegion(DEFAULT_REGION);
        return;
      }
      // 2. Get current device GPS coordinates
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      // 3. Set the initial region centered on the user
      setInitialRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.015, // Zoomed in to neighborhood level (~1.5 km)
        longitudeDelta: 0.015,
      });
    }
    getCurrentLocation();
  }, []);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion!}
        showsUserLocation={true}
        showsMyLocationButton={true}
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
