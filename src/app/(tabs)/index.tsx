
import { StyleSheet, Text, View } from 'react-native';
import MapView from "react-native-maps";
import * as SQLite from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { usersTable } from '../../../db/schema';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import migrations from '../../../drizzle/migrations';
import { useDrizzleStudio } from 'expo-drizzle-studio-plugin';

const expo = SQLite.openDatabaseSync('db.db');
const db = drizzle(expo);


export default function Index() {
  return (
    // MapView with a marker
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
