import Ionicons from "@expo/vector-icons/Ionicons";
import Octicons from "@expo/vector-icons/Octicons";
import { desc, eq } from "drizzle-orm";
import * as Location from "expo-location";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, Region } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { db } from "@/../db/client";
import { offeringsTable, placesTable } from "@/../db/schema";
import { Colors, FontFamily, useTheme } from "@/constants/theme";

interface PlaceWithOffering {
  id: string;
  name: string;
  category: "food" | "leisure" | "self_care";
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  city: string | null;
  highlightDish?: string;
  highlightPrice?: number;
  distanceKm?: number;
}

function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatDistance(distKm?: number): string {
  if (distKm === undefined) return "Nearby";
  if (distKm < 1) {
    return `${Math.round(distKm * 1000)}m away`;
  }
  return `${distKm.toFixed(1)}km away`;
}

const DEFAULT_REGION: Region = {
  latitude: 14.5547,
  longitude: 121.0244,
  latitudeDelta: 0.014,
  longitudeDelta: 0.014,
};

const RADIUS_PRESETS = [0.5, 1, 2, 3, 5] as const;
type RadiusPreset = (typeof RADIUS_PRESETS)[number];

const RADIUS_DELTAS: Record<
  RadiusPreset,
  { latitudeDelta: number; longitudeDelta: number }
> = {
  0.5: { latitudeDelta: 0.007, longitudeDelta: 0.007 },
  1: { latitudeDelta: 0.014, longitudeDelta: 0.014 },
  2: { latitudeDelta: 0.028, longitudeDelta: 0.028 },
  3: { latitudeDelta: 0.045, longitudeDelta: 0.045 },
  5: { latitudeDelta: 0.075, longitudeDelta: 0.075 },
};

function formatRadiusLabel(km: RadiusPreset): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km} km`;
}

// Google Maps custom style (Light): Keeps parks & cultural landmarks, hides commercial & civic clutter
const GOOGLE_MAPS_STYLE_LESS_LANDMARKS = [
  // Commercial & business clutter (removes random stores, corporate offices)
  {
    featureType: "poi.business",
    elementType: "all",
    stylers: [{ visibility: "off" }],
  },
  // Government & municipal offices
  {
    featureType: "poi.government",
    elementType: "all",
    stylers: [{ visibility: "off" }],
  },
  // Medical & healthcare clinics
  {
    featureType: "poi.medical",
    elementType: "all",
    stylers: [{ visibility: "off" }],
  },
  // Schools & educational facilities
  {
    featureType: "poi.school",
    elementType: "all",
    stylers: [{ visibility: "off" }],
  },
  // Sports complexes & gyms
  {
    featureType: "poi.sports_complex",
    elementType: "all",
    stylers: [{ visibility: "off" }],
  },
  // Generic road sign icons & bus stops
  {
    featureType: "road",
    elementType: "labels.icon",
    stylers: [{ visibility: "off" }],
  },
  // Subdued styling for parks & green spaces
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#dceddb" }],
  },
  // Attractions & cultural landmarks clearly visible
  {
    featureType: "poi.attraction",
    elementType: "all",
    stylers: [{ visibility: "on" }],
  },
];

// Google Maps custom style (Dark): High-contrast night navigation with minimal POI clutter
const GOOGLE_MAPS_STYLE_DARK_LESS_LANDMARKS = [
  { elementType: "geometry", stylers: [{ color: "#212529" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#18191A" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#DEE2E6" }] },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#F8F9FA" }],
  },
  {
    featureType: "poi.business",
    elementType: "all",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "poi.government",
    elementType: "all",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "poi.medical",
    elementType: "all",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "poi.school",
    elementType: "all",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "poi.sports_complex",
    elementType: "all",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#1A2E22" }],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [{ color: "#7FA892" }],
  },
  {
    featureType: "poi.attraction",
    elementType: "all",
    stylers: [{ visibility: "on" }],
  },
  {
    featureType: "poi.attraction",
    elementType: "labels.text.fill",
    stylers: [{ color: "#FBBF24" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#343A40" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#282C34" }],
  },
  {
    featureType: "road",
    elementType: "labels.icon",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#CED4DA" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#495057" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#343A40" }],
  },
  {
    featureType: "transit",
    elementType: "all",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#0F2035" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#748CA3" }],
  },
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const screenHeight = Dimensions.get("window").height;
  const bottomBarClearance = 50 + Math.max(insets.bottom, 8);
  const fullSheetHeight = Math.min(500, screenHeight - insets.top - 130);

  const PEEK_HEIGHT = 72;
  const HALF_HEIGHT = 310;

  const { colors, isDark, toggleTheme } = useTheme();
  const mapRef = useRef<MapView>(null);
  const [userLocation, setUserLocation] = useState<Region | null>(null);
  const [currentMapCenter, setCurrentMapCenter] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [city, setCity] = useState("Nearby");
  const [radiusKm, setRadiusKm] = useState<RadiusPreset>(1);
  const [activeCategory, setActiveCategory] = useState<
    "all" | "food" | "leisure" | "self_care"
  >("all");

  const [places, setPlaces] = useState<PlaceWithOffering[]>([]);
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null);
  const [mapZoomDelta, setMapZoomDelta] = useState(0.018);

  // Expandable Decision Deck Bottom Sheet state
  const [sheetState, setSheetState] = useState<"peek" | "half" | "full">(
    "peek",
  );

  const getTargetHeight = (state: "peek" | "half" | "full") => {
    switch (state) {
      case "peek":
        return PEEK_HEIGHT;
      case "half":
        return HALF_HEIGHT;
      case "full":
        return fullSheetHeight;
    }
  };

  const animatedSheetHeight = useRef(new Animated.Value(PEEK_HEIGHT)).current;
  const currentSheetHeight = useRef(PEEK_HEIGHT);

  useEffect(() => {
    const id = animatedSheetHeight.addListener(({ value }) => {
      currentSheetHeight.current = value;
    });
    return () => {
      animatedSheetHeight.removeListener(id);
    };
  }, [animatedSheetHeight]);

  // Sync animation whenever sheetState changes programmatically
  useEffect(() => {
    const target = getTargetHeight(sheetState);
    Animated.spring(animatedSheetHeight, {
      toValue: target,
      useNativeDriver: false,
      damping: 24,
      stiffness: 220,
      mass: 0.8,
    }).start();
  }, [sheetState, fullSheetHeight]);

  const cycleSheetState = () => {
    setSheetState((prev) =>
      prev === "peek" ? "half" : prev === "half" ? "full" : "peek",
    );
  };

  const dragStartHeight = useRef(PEEK_HEIGHT);

  const sheetPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 4;
      },
      onPanResponderGrant: () => {
        dragStartHeight.current = currentSheetHeight.current;
      },
      onPanResponderMove: (_, gestureState) => {
        const nextHeight = dragStartHeight.current - gestureState.dy;
        const clamped = Math.max(
          PEEK_HEIGHT - 12,
          Math.min(fullSheetHeight + 15, nextHeight),
        );
        animatedSheetHeight.setValue(clamped);

        if (clamped > (HALF_HEIGHT + fullSheetHeight) / 2) {
          if (sheetState !== "full") setSheetState("full");
        } else if (clamped > (PEEK_HEIGHT + HALF_HEIGHT) / 2) {
          if (sheetState !== "half") setSheetState("half");
        } else {
          if (sheetState !== "peek") setSheetState("peek");
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const currentH = currentSheetHeight.current;
        const vy = gestureState.vy;

        let target: "peek" | "half" | "full" = sheetState;

        if (vy < -0.4) {
          if (currentH < HALF_HEIGHT) {
            target = "half";
          } else {
            target = "full";
          }
        } else if (vy > 0.4) {
          if (currentH > HALF_HEIGHT) {
            target = "half";
          } else {
            target = "peek";
          }
        } else {
          const dPeek = Math.abs(currentH - PEEK_HEIGHT);
          const dHalf = Math.abs(currentH - HALF_HEIGHT);
          const dFull = Math.abs(currentH - fullSheetHeight);

          if (dPeek <= dHalf && dPeek <= dFull) {
            target = "peek";
          } else if (dHalf <= dFull) {
            target = "half";
          } else {
            target = "full";
          }
        }

        setSheetState(target);
        Animated.spring(animatedSheetHeight, {
          toValue: getTargetHeight(target),
          useNativeDriver: false,
          damping: 24,
          stiffness: 220,
          mass: 0.8,
        }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(animatedSheetHeight, {
          toValue: getTargetHeight(sheetState),
          useNativeDriver: false,
          damping: 24,
          stiffness: 220,
        }).start();
      },
    }),
  ).current;

  // Dedicated Angkas-style Live Reticle Pinning Mode
  const [isPinningMode, setIsPinningMode] = useState(false);
  const [isPanningMap, setIsPanningMap] = useState(false);
  const [centerCoord, setCenterCoord] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [centerAddress, setCenterAddress] = useState<string>(
    "Locating address...",
  );

  // Category- and time-aware contextual info for Decision Radar & Header
  const getContextualInfo = (cat: "all" | "food" | "leisure" | "self_care") => {
    const hour = new Date().getHours();

    if (hour >= 5 && hour < 11) {
      const greeting = "Good morning";
      switch (cat) {
        case "food":
          return {
            greeting,
            title: "Breakfast Window",
            icon: "cafe-outline" as const,
            color: colors.food,
            lightColor: colors.foodLight,
          };
        case "leisure":
          return {
            greeting,
            title: "Morning Stroll",
            icon: "compass-outline" as const,
            color: colors.leisure,
            lightColor: colors.leisureLight,
          };
        case "self_care":
          return {
            greeting,
            title: "Morning Relaxation",
            icon: "leaf-outline" as const,
            color: colors.selfCare,
            lightColor: colors.selfCareLight,
          };
        default:
          return {
            greeting,
            title: "Morning Radar",
            icon: "sunny-outline" as const,
            color: colors.leisure,
            lightColor: colors.leisureLight,
          };
      }
    } else if (hour >= 11 && hour < 14) {
      const greeting = "Good afternoon";
      switch (cat) {
        case "food":
          return {
            greeting,
            title: "Lunch Time",
            icon: "restaurant-outline" as const,
            color: colors.food,
            lightColor: colors.foodLight,
          };
        case "leisure":
          return {
            greeting,
            title: "Midday Break",
            icon: "compass-outline" as const,
            color: colors.leisure,
            lightColor: colors.leisureLight,
          };
        case "self_care":
          return {
            greeting,
            title: "Midday Reset",
            icon: "leaf-outline" as const,
            color: colors.selfCare,
            lightColor: colors.selfCareLight,
          };
        default:
          return {
            greeting,
            title: "Lunch Window",
            icon: "restaurant-outline" as const,
            color: colors.leisure,
            lightColor: colors.leisureLight,
          };
      }
    } else if (hour >= 14 && hour < 18) {
      const greeting = "Good afternoon";
      switch (cat) {
        case "food":
          return {
            greeting,
            title: "Merienda Snack",
            icon: "cafe-outline" as const,
            color: colors.food,
            lightColor: colors.foodLight,
          };
        case "leisure":
          return {
            greeting,
            title: "Afternoon Walk",
            icon: "compass-outline" as const,
            color: colors.leisure,
            lightColor: colors.leisureLight,
          };
        case "self_care":
          return {
            greeting,
            title: "Afternoon Recharge",
            icon: "leaf-outline" as const,
            color: colors.selfCare,
            lightColor: colors.selfCareLight,
          };
        default:
          return {
            greeting,
            title: "Merienda Window",
            icon: "cafe-outline" as const,
            color: colors.leisure,
            lightColor: colors.leisureLight,
          };
      }
    } else if (hour >= 18 && hour < 22) {
      const greeting = "Good evening";
      switch (cat) {
        case "food":
          return {
            greeting,
            title: "Dinner Time",
            icon: "restaurant-outline" as const,
            color: colors.food,
            lightColor: colors.foodLight,
          };
        case "leisure":
          return {
            greeting,
            title: "Evening Out",
            icon: "compass-outline" as const,
            color: colors.leisure,
            lightColor: colors.leisureLight,
          };
        case "self_care":
          return {
            greeting,
            title: "Evening Wind Down",
            icon: "leaf-outline" as const,
            color: colors.selfCare,
            lightColor: colors.selfCareLight,
          };
        default:
          return {
            greeting,
            title: "Dinner Window",
            icon: "restaurant-outline" as const,
            color: colors.leisure,
            lightColor: colors.leisureLight,
          };
      }
    } else {
      const greeting = "Late night";
      switch (cat) {
        case "food":
          return {
            greeting,
            title: "Night Bites",
            icon: "restaurant-outline" as const,
            color: colors.food,
            lightColor: colors.foodLight,
          };
        case "leisure":
          return {
            greeting,
            title: "Night Stroll",
            icon: "compass-outline" as const,
            color: colors.leisure,
            lightColor: colors.leisureLight,
          };
        case "self_care":
          return {
            greeting,
            title: "Night Unwind",
            icon: "leaf-outline" as const,
            color: colors.selfCare,
            lightColor: colors.selfCareLight,
          };
        default:
          return {
            greeting,
            title: "Night Window",
            icon: "moon-outline" as const,
            color: colors.leisure,
            lightColor: colors.leisureLight,
          };
      }
    }
  };

  const contextRaw = getContextualInfo(activeCategory);
  const contextInfo = {
    ...contextRaw,
    meal: contextRaw.title,
  };

  // Load User Location
  useEffect(() => {
    async function initLocation() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setUserLocation(DEFAULT_REGION);
          return;
        }

        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        const initial: Region = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.014,
          longitudeDelta: 0.014,
        };

        setUserLocation(initial);
        mapRef.current?.animateToRegion(initial, 1000);

        const [rev] = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        if (rev?.city || rev?.subregion || rev?.region) {
          setCity(rev.city || rev.subregion || rev.region || "Nearby");
        }
      } catch {
        setUserLocation(DEFAULT_REGION);
      }
    }

    initLocation();
  }, []);

  // Fetch places from SQLite whenever screen is focused or location changes
  useFocusEffect(
    useCallback(() => {
      loadPlaces();
      // Exit pinning mode whenever user navigates back to map
      setIsPinningMode(false);
    }, [activeCategory, userLocation]),
  );

  async function loadPlaces() {
    try {
      let rows = await db
        .select()
        .from(placesTable)
        .where(eq(placesTable.isArchived, false))
        .orderBy(desc(placesTable.createdAt));

      if (rows.length === 0) {
        // Auto-seed example spots if table is empty

        rows = await db
          .select()
          .from(placesTable)
          .where(eq(placesTable.isArchived, false))
          .orderBy(desc(placesTable.createdAt));
      }

      // Fetch first standout offering for each place
      const placesWithItems: PlaceWithOffering[] = [];
      for (const p of rows) {
        if (activeCategory !== "all" && p.category !== activeCategory) {
          continue;
        }

        const itemRows = await db
          .select()
          .from(offeringsTable)
          .where(eq(offeringsTable.placeId, p.id))
          .limit(1);

        const highlight = itemRows[0];
        const dist =
          userLocation && p.latitude && p.longitude
            ? calculateDistanceKm(
                userLocation.latitude,
                userLocation.longitude,
                p.latitude,
                p.longitude,
              )
            : undefined;

        placesWithItems.push({
          id: p.id,
          name: p.name,
          category: p.category as any,
          latitude: p.latitude,
          longitude: p.longitude,
          address: p.address,
          city: p.city,
          highlightDish: highlight?.name,
          highlightPrice: highlight?.price,
          distanceKm: dist,
        });
      }

      // Sort by proximity: closest spots first
      placesWithItems.sort((a, b) => {
        if (a.distanceKm !== undefined && b.distanceKm !== undefined) {
          return a.distanceKm - b.distanceKm;
        }
        return 0;
      });

      setPlaces(placesWithItems);
    } catch (e) {
      console.log("Error loading places:", e);
    }
  }

  const focusPlaceOnMap = (place: PlaceWithOffering) => {
    setSelectedSpotId(place.id);
    if (place.latitude && place.longitude) {
      mapRef.current?.animateToRegion(
        {
          latitude: place.latitude,
          longitude: place.longitude,
          latitudeDelta: 0.008,
          longitudeDelta: 0.008,
        },
        500,
      );
      if (sheetState === "peek") {
        setSheetState("half");
      }
    }
  };

  const filteredPlaces = useMemo(() => {
    return places.filter((p) => {
      if (p.distanceKm !== undefined) {
        return p.distanceKm <= radiusKm;
      }
      return true;
    });
  }, [places, radiusKm]);

  const heroSpot = selectedSpotId
    ? filteredPlaces.find((p) => p.id === selectedSpotId) ||
      (filteredPlaces.length > 0 ? filteredPlaces[0] : null)
    : filteredPlaces.length > 0
      ? filteredPlaces[0]
      : null;

  const handleCenterGPS = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Location Permission Needed",
          "Spot Mo needs location access to pinpoint where you are right now. Please allow location access in your device settings.",
          [{ text: "OK" }],
        );
        return;
      }

      const last = await Location.getLastKnownPositionAsync().catch(() => null);
      const deltas = RADIUS_DELTAS[radiusKm];
      if (last) {
        const fastTarget: Region = {
          latitude: last.coords.latitude,
          longitude: last.coords.longitude,
          ...deltas,
        };
        setUserLocation(fastTarget);
        mapRef.current?.animateToRegion(fastTarget, 600);
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const target: Region = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        ...deltas,
      };

      setUserLocation(target);
      mapRef.current?.animateToRegion(target, 700);

      const [rev] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      }).catch(() => []);

      if (rev?.city || rev?.subregion || rev?.region) {
        setCity(rev.city || rev.subregion || rev.region || "Nearby");
      }
    } catch (err) {
      console.warn("Error refreshing GPS location:", err);
      if (userLocation) {
        mapRef.current?.animateToRegion(userLocation, 800);
      }
    }
  };

  const handleRadiusChange = (newRadius: RadiusPreset) => {
    setRadiusKm(newRadius);
    const deltas = RADIUS_DELTAS[newRadius];
    const center = userLocation || currentMapCenter || DEFAULT_REGION;
    mapRef.current?.animateToRegion(
      {
        latitude: center.latitude,
        longitude: center.longitude,
        ...deltas,
      },
      600,
    );
  };

  const cycleRadius = () => {
    const currentIndex = RADIUS_PRESETS.indexOf(radiusKm);
    const nextIndex = (currentIndex + 1) % RADIUS_PRESETS.length;
    handleRadiusChange(RADIUS_PRESETS[nextIndex]);
  };

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case "food":
        return {
          label: "Food",
          icon: "restaurant" as const,
          color: colors.food,
        };
      case "leisure":
        return {
          label: "Leisure",
          icon: "compass" as const,
          color: colors.leisure,
        };
      case "self_care":
        return {
          label: "Self-care",
          icon: "leaf" as const,
          color: colors.selfCare,
        };
      default:
        return {
          label: "Spot",
          icon: "location" as const,
          color: colors.charcoal,
        };
    }
  };

  // Reverse geocoding for Angkas Center Reticle
  const reverseGeocodeCenter = async (latitude: number, longitude: number) => {
    try {
      const [rev] = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (rev) {
        const street = rev.street || rev.name || rev.district || "";
        const c = rev.city || rev.subregion || rev.region || "Nearby";
        const addr = street ? `${street}, ${c}` : c;
        setCenterAddress(addr);
      }
    } catch {
      setCenterAddress(
        `Spot at (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
      );
    }
  };

  // Toggle Dedicated Angkas Pinning Mode
  const handleTogglePinMode = async () => {
    if (!isPinningMode) {
      setIsPinningMode(true);
      setSelectedSpotId(null);

      let targetLat = userLocation?.latitude ?? DEFAULT_REGION.latitude;
      let targetLng = userLocation?.longitude ?? DEFAULT_REGION.longitude;

      try {
        const camera = await mapRef.current?.getCamera();
        if (camera?.center?.latitude && camera?.center?.longitude) {
          targetLat = camera.center.latitude;
          targetLng = camera.center.longitude;
        }
      } catch {}

      setCenterCoord({
        latitude: targetLat,
        longitude: targetLng,
      });
      reverseGeocodeCenter(targetLat, targetLng);
    } else {
      setIsPinningMode(false);
    }
  };

  if (!userLocation) {
    return (
      <View
        style={[styles.loadingContainer, { backgroundColor: colors.canvas }]}
      >
        <ActivityIndicator size="large" color={colors.copper} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.canvas }]}>
      {/* 1. Fullscreen Map with Minimalist Landmarks Style (Light/Dark aware) */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={userLocation}
        showsUserLocation
        showsMyLocationButton={false}
        showsPointsOfInterests={true}
        pointsOfInterestFilter={[
          "park",
          "nationalPark",
          "landmark",
          "nationalMonument",
          "museum",
          "theater",
          "publicTransport",
        ]}
        userInterfaceStyle={isDark ? "dark" : "light"}
        customMapStyle={
          isDark
            ? GOOGLE_MAPS_STYLE_DARK_LESS_LANDMARKS
            : GOOGLE_MAPS_STYLE_LESS_LANDMARKS
        }
        onRegionChange={(region) => {
          if (isPinningMode && !isPanningMap) {
            setIsPanningMap(true);
          }
          if (region && typeof region.latitudeDelta === "number") {
            const currentTier =
              region.latitudeDelta < 0.013
                ? "expanded"
                : region.latitudeDelta > 0.035
                  ? "far"
                  : "orb";

            setMapZoomDelta((prev) => {
              const prevTier =
                prev < 0.013 ? "expanded" : prev > 0.035 ? "far" : "orb";
              if (currentTier !== prevTier) {
                return region.latitudeDelta;
              }
              return prev;
            });
          }
        }}
        onRegionChangeComplete={(region) => {
          setMapZoomDelta(region.latitudeDelta);
          setCurrentMapCenter({
            latitude: region.latitude,
            longitude: region.longitude,
          });
          if (isPinningMode) {
            setIsPanningMap(false);
            setCenterCoord({
              latitude: region.latitude,
              longitude: region.longitude,
            });
            reverseGeocodeCenter(region.latitude, region.longitude);
          }
        }}
        onPress={(e) => {
          if (!isPinningMode) {
            // Do not clear selection if a marker was pressed
            if (e?.nativeEvent?.action === "marker-press") {
              return;
            }
            setSelectedSpotId(null);
          }
        }}
      >


        {/* Concept 4: Adaptive Zoom Orbs for Pinned Spots within Search Perimeter */}
        {filteredPlaces.map((place) => {
          if (!place.latitude || !place.longitude) return null;
          const badge = getCategoryBadge(place.category);
          const isSelected = selectedSpotId === place.id;
          const isExpanded = isSelected || mapZoomDelta < 0.013;
          const isFarZoomedOut = mapZoomDelta > 0.035;
          const isHero = heroSpot?.id === place.id;

          return (
            <Marker
              key={`${place.id}-${isExpanded ? "pill" : "orb"}-${isSelected ? "sel" : "unsel"}`}
              coordinate={{
                latitude: place.latitude,
                longitude: place.longitude,
              }}
              tracksViewChanges={true}
              onPress={(e) => {
                e?.stopPropagation?.();
                if (!isPinningMode) {
                  if (selectedSpotId === place.id) {
                    setSelectedSpotId(null);
                  } else {
                    setSelectedSpotId(place.id);
                    focusPlaceOnMap(place);
                  }
                }
              }}
            >
              <View style={styles.markerContainer} pointerEvents="box-none">
                {isExpanded ? (
                  <>
                    <View
                      style={[
                        styles.customMarkerPill,
                        { backgroundColor: badge.color },
                        isSelected && styles.selectedMarkerPill,
                      ]}
                    >
                      <View
                        style={[
                          styles.markerIconCircle,
                          isDark && { backgroundColor: "rgba(0, 0, 0, 0.16)" },
                        ]}
                      >
                        <Ionicons
                          name={badge.icon}
                          size={11}
                          color={isDark ? "#1C1917" : "#FFFFFF"}
                        />
                      </View>
                      <Text
                        style={[
                          styles.markerPlaceName,
                          isDark && { color: "#1C1917" },
                        ]}
                        numberOfLines={1}
                      >
                        {place.name}
                      </Text>
                      {place.highlightPrice !== undefined && (
                        <Text
                          style={[
                            styles.markerPriceTag,
                            isDark && { color: "#1C1917" },
                          ]}
                        >
                          {place.highlightPrice > 0
                            ? `₱${place.highlightPrice}`
                            : "Free"}
                        </Text>
                      )}
                    </View>
                    <View
                      style={[
                        styles.markerArrow,
                        { backgroundColor: badge.color },
                      ]}
                    />
                  </>
                ) : (
                  <>
                    <View
                      style={[
                        styles.orbWrapper,
                        isFarZoomedOut && { transform: [{ scale: 0.78 }] },
                      ]}
                    >
                      {isHero && (
                        <View
                          style={[
                            styles.radarPulseRing,
                            {
                              borderColor: badge.color,
                              backgroundColor: `${badge.color}22`,
                            },
                          ]}
                        />
                      )}
                      <View
                        style={[
                          styles.categoryOrb,
                          {
                            backgroundColor: badge.color,
                            borderColor: isDark ? "#1C1917" : "#FFFFFF",
                          },
                        ]}
                      >
                        <Ionicons
                          name={badge.icon}
                          size={13}
                          color={isDark ? "#1C1917" : "#FFFFFF"}
                        />
                      </View>
                    </View>
                    <View
                      style={[
                        styles.orbArrow,
                        { backgroundColor: badge.color },
                        isFarZoomedOut && {
                          transform: [{ scale: 0.78 }, { rotate: "45deg" }],
                          marginTop: -2,
                        },
                      ]}
                    />
                  </>
                )}
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* Angkas Live Center Reticle Overlay (Screen Center) */}
      {isPinningMode && (
        <View style={styles.centerReticleContainer} pointerEvents="none">
          <View style={styles.centerReticleTooltip}>
            <Text style={styles.centerReticleTooltipText}>
              {isPanningMap ? "Aiming target..." : "Target centered"}
            </Text>
          </View>
          <View
            style={[
              styles.centerReticlePinWrapper,
              isPanningMap && styles.centerReticlePinLifting,
            ]}
          >
            <View
              style={[
                styles.centerReticleHead,
                {
                  backgroundColor: colors.copper,
                  borderColor: isDark ? "#1C1917" : "#FFFFFF",
                },
              ]}
            >
              <Octicons name="location" size={17} color={colors.primaryText} />
            </View>
            <View
              style={[
                styles.centerReticleStem,
                { backgroundColor: isDark ? "#78716C" : colors.copperDark },
              ]}
            />
          </View>
          <View
            style={[
              styles.centerReticleShadow,
              isPanningMap && styles.centerReticleShadowLifting,
            ]}
          />
        </View>
      )}

      {/* 2. Floating Top Header */}
      <View style={styles.topHeaderWrapper}>
        <View style={styles.topUtilityRow}>
          {/* Context Greeting Capsule */}
          <View
            style={[
              styles.greetingCapsule,
              { backgroundColor: colors.headerCapsuleBg },
            ]}
          >
            <View
              style={[
                styles.greetingIconWrapper,
                { backgroundColor: contextInfo.color },
              ]}
            >
              <Ionicons
                name={contextInfo.icon}
                size={14}
                color={isDark ? "#1C1917" : "#FFFFFF"}
              />
            </View>
            <View style={styles.greetingTextColumn}>
              <Text
                style={[
                  styles.greetingTitle,
                  { color: colors.headerCapsuleText },
                ]}
              >
                {contextInfo.greeting}, Third
              </Text>
              <View style={styles.greetingMetaRow}>
                <View
                  style={[
                    styles.pulseDot,
                    { backgroundColor: contextInfo.color },
                  ]}
                />
                <Text
                  style={[
                    styles.greetingMetaText,
                    { color: colors.headerCapsuleSubtext },
                  ]}
                >
                  {contextInfo.title} • {city}
                </Text>
              </View>
            </View>
          </View>

          {/* Right Action Group: Theme Toggle & Radar Radius */}
          <View style={styles.topRightControls}>
            <TouchableOpacity
              style={[
                styles.themeTogglePill,
                {
                  backgroundColor: colors.cardGlass,
                  borderColor: colors.border,
                },
              ]}
              onPress={toggleTheme}
              activeOpacity={0.7}
              accessibilityLabel={
                isDark ? "Switch to light mode" : "Switch to dark mode"
              }
            >
              <Ionicons
                name={isDark ? "sunny" : "moon"}
                size={14}
                color={isDark ? "#FBBF24" : colors.charcoal}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.radiusPill,
                {
                  backgroundColor: colors.cardGlass,
                  borderColor: colors.border,
                },
              ]}
              onPress={cycleRadius}
            >
              <Octicons name="broadcast" size={12} color={colors.leisure} />
              <Text style={[styles.radiusText, { color: colors.charcoal }]}>
                {formatRadiusLabel(radiusKm)}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Category Filter Pills (Distinct Triad Chromatic Accents) */}
        <View style={styles.categoryPillsRow}>
          {(
            [
              {
                id: "all",
                label: "All",
                icon: "grid-outline" as const,
                activeColor: colors.copper,
              },
              {
                id: "food",
                label: "Food",
                icon: "restaurant-outline" as const,
                activeColor: colors.food,
              },
              {
                id: "leisure",
                label: "Leisure",
                icon: "compass-outline" as const,
                activeColor: colors.leisure,
              },
              {
                id: "self_care",
                label: "Self-care",
                icon: "leaf-outline" as const,
                activeColor: colors.selfCare,
              },
            ] as const
          ).map((c) => {
            const isActive = activeCategory === c.id;
            return (
              <TouchableOpacity
                key={c.id}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: isActive
                      ? c.activeColor
                      : colors.cardGlass,
                    borderColor: isActive ? c.activeColor : colors.border,
                  },
                ]}
                onPress={() => setActiveCategory(c.id)}
              >
                <Ionicons
                  name={c.icon}
                  size={12}
                  color={
                    isActive
                      ? isDark
                        ? c.id === "all"
                          ? colors.primaryText
                          : "#1C1917"
                        : c.id === "all"
                          ? colors.primaryText
                          : "#FFFFFF"
                      : colors.charcoal
                  }
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={[
                    styles.filterPillText,
                    {
                      color: isActive
                        ? isDark
                          ? c.id === "all"
                            ? colors.primaryText
                            : "#1C1917"
                          : c.id === "all"
                            ? colors.primaryText
                            : "#FFFFFF"
                        : colors.charcoal,
                      fontWeight: isActive ? "700" : "600",
                    },
                  ]}
                >
                  {c.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* 3. Floating Satellite Controls */}
      <Animated.View
        style={[
          styles.satelliteControlsWrapper,
          isPinningMode
            ? {
                bottom: bottomBarClearance + 148,
                right: 16,
              }
            : sheetState === "full"
              ? {
                  top: insets.top + 104,
                  right: 16,
                }
              : {
                  bottom: Animated.add(
                    animatedSheetHeight,
                    bottomBarClearance + 12,
                  ),
                  right: 16,
                },
        ]}
      >
        {/* Recenter Location Button */}
        <TouchableOpacity
          style={[
            styles.recenterButton,
            {
              backgroundColor: isDark ? "#27272A" : colors.satelliteBtnBg,
              borderColor: isDark ? "#3F3F46" : colors.border,
            },
          ]}
          onPress={handleCenterGPS}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name="locate"
            size={20}
            color={isDark ? "#F5F5F4" : colors.satelliteBtnIcon}
          />
        </TouchableOpacity>

        {/* Pin Spot Mode Toggle Button */}
        <TouchableOpacity
          style={[
            styles.pinSpotFloatingButton,
            {
              backgroundColor: isPinningMode
                ? isDark
                  ? "#27272A"
                  : "#1C1917"
                : isDark
                  ? "#F5F5F4"
                  : colors.fabBg,
              shadowColor: isDark ? "#000000" : colors.fabBg,
              borderColor: isPinningMode && isDark ? "#3F3F46" : undefined,
              borderWidth: isPinningMode && isDark ? 1.5 : 0,
            },
          ]}
          onPress={handleTogglePinMode}
          activeOpacity={0.9}
        >
          <Octicons
            name={isPinningMode ? "x" : "plus"}
            size={24}
            color={
              isPinningMode
                ? isDark
                  ? "#F5F5F4"
                  : "#FFFFFF"
                : isDark
                  ? "#1C1917"
                  : colors.fabIcon
            }
          />
        </TouchableOpacity>
      </Animated.View>

      {/* 4. Angkas Pinning Mode Confirmation Dock */}
      {isPinningMode && (
        <View
          style={[
            styles.pinningDockCard,
            {
              backgroundColor: colors.cardGlass,
              borderColor: colors.border,
              bottom: bottomBarClearance + 8,
            },
          ]}
        >
          <View style={styles.pinningDockHeader}>
            <View style={styles.pinningTag}>
              <View
                style={[styles.pinningDot, { backgroundColor: colors.copper }]}
              />
              <Text style={[styles.pinningTagText, { color: colors.copper }]}>
                AIMING SPOT
              </Text>
            </View>
            {centerCoord && (
              <Text
                style={[styles.pinningCoordsText, { color: colors.subtle }]}
              >
                {centerCoord.latitude.toFixed(4)}°,{" "}
                {centerCoord.longitude.toFixed(4)}°
              </Text>
            )}
          </View>

          <Text
            style={[styles.pinningAddressText, { color: colors.charcoal }]}
            numberOfLines={1}
          >
            {centerAddress}
          </Text>

          <View style={styles.pinningActionsRow}>
            <TouchableOpacity
              style={[
                styles.pinningCancelBtn,
                { backgroundColor: colors.sandDark },
              ]}
              onPress={() => setIsPinningMode(false)}
            >
              <Text
                style={[
                  styles.pinningCancelBtnText,
                  { color: colors.charcoal },
                ]}
              >
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.pinningConfirmBtn,
                { backgroundColor: colors.copper },
              ]}
              onPress={() => {
                if (centerCoord) {
                  router.push({
                    pathname: "/spot/new",
                    params: {
                      lat: centerCoord.latitude.toString(),
                      lng: centerCoord.longitude.toString(),
                      address: centerAddress,
                    },
                  });
                  console.log("Navigating to /spot/new with params:", {
                    lat: centerCoord.latitude.toString(),
                    lng: centerCoord.longitude.toString(),
                    address: centerAddress,
                  });
                }
              }}
            >
              <Text
                style={[
                  styles.pinningConfirmBtnText,
                  { color: colors.primaryText },
                ]}
              >
                Pin Spot Here →
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 5. Expandable Decision Deck Bottom Sheet */}
      {!isPinningMode && (
        <Animated.View
          style={[
            styles.curatedDecisionSheet,
            {
              bottom: bottomBarClearance,
              height: animatedSheetHeight,
              backgroundColor: colors.cardGlass,
              borderTopColor: colors.border,
            },
          ]}
        >
          {/* Grab Handle Header (Draggable + Tap to cycle state) */}
          <View
            style={styles.sheetHandleRow}
            {...sheetPanResponder.panHandlers}
          >
            <TouchableOpacity
              onPress={cycleSheetState}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 40, right: 40 }}
            >
              <View
                style={[
                  styles.sheetHandleBar,
                  { backgroundColor: colors.sandDark },
                ]}
              />
            </TouchableOpacity>
          </View>

          {/* STATE A: PEEK STATE (72pt) */}
          {sheetState === "peek" && (
            <View {...sheetPanResponder.panHandlers}>
              <TouchableOpacity
                style={styles.peekContentRow}
                onPress={() => setSheetState("half")}
                activeOpacity={0.85}
              >
                <View style={styles.peekLeftSection}>
                  <View
                    style={[
                      styles.peekContextIconBox,
                      { backgroundColor: contextInfo.lightColor },
                    ]}
                  >
                    <Ionicons
                      name={contextInfo.icon}
                      size={14}
                      color={contextInfo.color}
                    />
                  </View>
                  <View>
                    <Text
                      style={[styles.peekMealTitle, { color: colors.charcoal }]}
                    >
                      {contextInfo.title}
                    </Text>
                    <Text
                      style={[
                        styles.peekSpotsCountText,
                        { color: colors.muted },
                      ]}
                    >
                      {filteredPlaces.length} spots on radar (
                        {formatRadiusLabel(radiusKm)})
                    </Text>
                  </View>
                </View>

                <View style={styles.peekRightSection}>
                  <View style={styles.peekBudgetGlance}>
                    <Text
                      style={[
                        styles.peekBudgetAmount,
                        { color: colors.charcoal },
                      ]}
                    >
                      <Text
                        style={{
                          fontFamily: FontFamily.serifBold,
                          color: colors.leisure,
                        }}
                      >
                        ₱320
                      </Text>{" "}
                      left
                    </Text>
                    <View
                      style={[
                        styles.peekBudgetMiniBar,
                        { backgroundColor: colors.sandDark },
                      ]}
                    >
                      <View
                        style={[
                          styles.peekBudgetMiniFill,
                          {
                            width: "64%",
                            backgroundColor: colors.leisure,
                          },
                        ]}
                      />
                    </View>
                  </View>
                  <View
                    style={[
                      styles.sheetExpandChevronBox,
                      { backgroundColor: colors.sandDark },
                    ]}
                  >
                    <Octicons
                      name="chevron-up"
                      size={14}
                      color={colors.charcoal}
                    />
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* STATE B: HALF STATE - DECISION SPOTLIGHT (310pt) */}
          {sheetState === "half" && (
            <View style={styles.halfContentContainer}>
              {/* Header bar */}
              <View
                style={styles.halfHeaderRow}
                {...sheetPanResponder.panHandlers}
              >
                <View style={styles.feedTitleLeft}>
                  <View
                    style={[
                      styles.copperDot,
                      { backgroundColor: contextInfo.color },
                    ]}
                  />
                  <Text style={[styles.feedTitle, { color: colors.charcoal }]}>
                    {contextInfo.title.toUpperCase()}
                  </Text>
                  <Text
                    style={[
                      styles.cityPill,
                      {
                        backgroundColor: contextInfo.lightColor,
                        color: contextInfo.color,
                      },
                    ]}
                  >
                    {city}
                  </Text>
                </View>
                <View style={styles.halfHeaderControls}>
                  <TouchableOpacity
                    onPress={() => setSheetState("full")}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={[
                      styles.stateControlBtn,
                      { backgroundColor: colors.sandDark },
                    ]}
                  >
                    <Octicons
                      name="chevron-up"
                      size={14}
                      color={colors.charcoal}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setSheetState("peek")}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={[
                      styles.stateControlBtn,
                      { backgroundColor: colors.sandDark },
                    ]}
                  >
                    <Octicons
                      name="chevron-down"
                      size={14}
                      color={colors.charcoal}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Spotlight Hero Card */}
              {heroSpot ? (
                <View
                  style={[
                    styles.heroSpotCard,
                    {
                      backgroundColor: isDark
                        ? "rgba(39, 39, 42, 0.75)"
                        : "rgba(245, 245, 240, 0.9)",
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.heroCardHeaderRow}>
                    <View style={styles.heroBadgeRow}>
                      <View
                        style={[
                          styles.heroCategoryBadge,
                          {
                            backgroundColor:
                              getCategoryBadge(heroSpot.category).color + "20",
                          },
                        ]}
                      >
                        <Ionicons
                          name={getCategoryBadge(heroSpot.category).icon}
                          size={12}
                          color={getCategoryBadge(heroSpot.category).color}
                        />
                        <Text
                          style={[
                            styles.heroCategoryText,
                            {
                              color: getCategoryBadge(heroSpot.category).color,
                            },
                          ]}
                        >
                          {getCategoryBadge(heroSpot.category).label}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.heroDistanceBadge,
                          { backgroundColor: colors.sandDark },
                        ]}
                      >
                        <Ionicons
                          name="walk-outline"
                          size={11}
                          color={colors.charcoal}
                        />
                        <Text
                          style={[
                            styles.heroDistanceText,
                            { color: colors.charcoal },
                          ]}
                        >
                          {formatDistance(heroSpot.distanceKm)}
                        </Text>
                      </View>
                    </View>

                    {heroSpot.highlightPrice ? (
                      <Text
                        style={[styles.heroPriceText, { color: colors.copper }]}
                      >
                        ₱{heroSpot.highlightPrice}
                      </Text>
                    ) : null}
                  </View>

                  <Text
                    style={[styles.heroSpotName, { color: colors.charcoal }]}
                    numberOfLines={1}
                  >
                    {heroSpot.name}
                  </Text>

                  <Text
                    style={[styles.heroSpotSubtitle, { color: colors.muted }]}
                    numberOfLines={1}
                  >
                    {heroSpot.highlightDish
                      ? `${heroSpot.highlightDish} • ${
                          heroSpot.address || heroSpot.city || "Nearby"
                        }`
                      : heroSpot.address || "Local favorite"}
                  </Text>

                  {/* Hero Action Row */}
                  <View style={styles.heroActionRow}>
                    <TouchableOpacity
                      style={[
                        styles.heroFocusBtn,
                        {
                          backgroundColor: colors.sandDark,
                          borderColor: colors.border,
                        },
                      ]}
                      onPress={() => focusPlaceOnMap(heroSpot)}
                    >
                      <Ionicons
                        name="navigate-outline"
                        size={13}
                        color={colors.charcoal}
                      />
                      <Text
                        style={[
                          styles.heroFocusBtnText,
                          { color: colors.charcoal },
                        ]}
                      >
                        Focus Map
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.heroLogBtn,
                        { backgroundColor: colors.copper },
                      ]}
                      onPress={() => router.push(`/spot/${heroSpot.id}`)}
                    >
                      <Ionicons
                        name="book-outline"
                        size={12}
                        color={colors.primaryText}
                      />
                      <Text
                        style={[
                          styles.heroLogBtnText,
                          { color: colors.primaryText },
                        ]}
                      >
                        Spot Details
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.emptyHeroSpot}>
                  <Octicons
                    name="search"
                    size={22}
                    color={colors.subtle}
                    style={{ marginBottom: 6 }}
                  />
                  <Text
                    style={[
                      styles.emptyHeroText,
                      {
                        color: colors.charcoal,
                        fontFamily: FontFamily.sansSemiBold,
                      },
                    ]}
                  >
                    No spots within {formatRadiusLabel(radiusKm)}
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.expandRadiusBtn,
                      { backgroundColor: colors.sandDark, marginTop: 8 },
                    ]}
                    onPress={cycleRadius}
                  >
                    <Text
                      style={[
                        styles.expandRadiusBtnText,
                        { color: colors.charcoal },
                      ]}
                    >
                      Expand Radius (Next:{" "}
                      {formatRadiusLabel(
                        RADIUS_PRESETS[
                          (RADIUS_PRESETS.indexOf(radiusKm) + 1) %
                            RADIUS_PRESETS.length
                        ],
                      )}
                      )
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Next 2 Nearby Spots Quick List */}
              {filteredPlaces.length > 1 && (
                <View style={styles.miniSpotsList}>
                  {filteredPlaces.slice(1, 3).map((spot) => {
                    const badge = getCategoryBadge(spot.category);
                    return (
                      <TouchableOpacity
                        key={spot.id}
                        style={[
                          styles.miniSpotRow,
                          { borderBottomColor: colors.border },
                        ]}
                        onPress={() => focusPlaceOnMap(spot)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.miniSpotLeft}>
                          <View
                            style={[
                              styles.miniCategoryDot,
                              { backgroundColor: badge.color },
                            ]}
                          />
                          <Text
                            style={[
                              styles.miniSpotName,
                              { color: colors.charcoal },
                            ]}
                            numberOfLines={1}
                          >
                            {spot.name}
                          </Text>
                        </View>
                        <View style={styles.miniSpotRight}>
                          <Text
                            style={[
                              styles.miniSpotDist,
                              { color: colors.muted },
                            ]}
                          >
                            {formatDistance(spot.distanceKm)}
                          </Text>
                          {spot.highlightPrice ? (
                            <Text
                              style={[
                                styles.miniSpotPrice,
                                { color: colors.copper },
                              ]}
                            >
                              ₱{spot.highlightPrice}
                            </Text>
                          ) : null}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Footer Prompt */}
              <TouchableOpacity
                style={styles.halfFooterBar}
                onPress={() => setSheetState("full")}
              >
                <Text
                  style={[styles.halfFooterText, { color: contextInfo.color }]}
                >
                  Browse all {filteredPlaces.length} radar spots in full deck →
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* STATE C: FULL STATE - CURATED RADAR DECK */}
          {sheetState === "full" && (
            <View style={styles.fullContentContainer}>
              {/* Header */}
              <View
                style={styles.fullHeaderRow}
                {...sheetPanResponder.panHandlers}
              >
                <View style={styles.fullTitleRow}>
                  <View
                    style={[
                      styles.copperDot,
                      { backgroundColor: contextInfo.color },
                    ]}
                  />
                  <Text
                    style={[styles.fullTitleText, { color: colors.charcoal }]}
                  >
                    {contextInfo.title.toUpperCase()}
                  </Text>
                  <View
                    style={[
                      styles.fullCountBadge,
                      { backgroundColor: colors.sandDark },
                    ]}
                  >
                    <Text
                      style={[styles.fullCountText, { color: colors.charcoal }]}
                    >
                      {filteredPlaces.length} spots ({formatRadiusLabel(radiusKm)})
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => setSheetState("half")}
                  style={[
                    styles.fullMinimizeBtn,
                    { backgroundColor: colors.sandDark },
                  ]}
                >
                  <Text
                    style={[
                      styles.fullMinimizeBtnText,
                      { color: colors.charcoal },
                    ]}
                  >
                    Minimise ↓
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Full Deck Scrollable Cards */}
              <ScrollView
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={true}
                contentContainerStyle={styles.fullScrollContent}
              >
                {filteredPlaces.length === 0 ? (
                  <View style={styles.fullEmptyContainer}>
                    <Octicons name="search" size={32} color={colors.subtle} />
                    <Text
                      style={[
                        styles.fullEmptyTitle,
                        { color: colors.charcoal },
                      ]}
                    >
                      No spots within {formatRadiusLabel(radiusKm)}
                    </Text>
                    <Text
                      style={[styles.fullEmptySub, { color: colors.muted }]}
                    >
                      There are no spots recorded within {formatRadiusLabel(radiusKm)} of your location.
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.expandRadiusActionBtn,
                        { backgroundColor: colors.copper, marginTop: 12 },
                      ]}
                      onPress={cycleRadius}
                    >
                      <Text
                        style={[
                          styles.expandRadiusActionBtnText,
                          { color: colors.primaryText },
                        ]}
                      >
                        Expand Radius to{" "}
                        {formatRadiusLabel(
                          RADIUS_PRESETS[
                            (RADIUS_PRESETS.indexOf(radiusKm) + 1) %
                              RADIUS_PRESETS.length
                          ],
                        )}{" "}
                        →
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  filteredPlaces.map((place) => {
                    const badge = getCategoryBadge(place.category);
                    return (
                      <View
                        key={place.id}
                        style={[
                          styles.deckCard,
                          {
                            backgroundColor: isDark
                              ? "rgba(39, 39, 42, 0.75)"
                              : "rgba(250, 248, 245, 0.95)",
                            borderColor: colors.border,
                          },
                        ]}
                      >
                        <View style={styles.deckCardHeader}>
                          <View style={styles.deckCardBadgeGroup}>
                            <View
                              style={[
                                styles.heroCategoryBadge,
                                {
                                  backgroundColor: badge.color + "20",
                                },
                              ]}
                            >
                              <Ionicons
                                name={badge.icon}
                                size={11}
                                color={badge.color}
                              />
                              <Text
                                style={[
                                  styles.heroCategoryText,
                                  { color: badge.color },
                                ]}
                              >
                                {badge.label}
                              </Text>
                            </View>
                            <View
                              style={[
                                styles.heroDistanceBadge,
                                { backgroundColor: colors.sandDark },
                              ]}
                            >
                              <Ionicons
                                name="walk-outline"
                                size={11}
                                color={colors.charcoal}
                              />
                              <Text
                                style={[
                                  styles.heroDistanceText,
                                  { color: colors.charcoal },
                                ]}
                              >
                                {formatDistance(place.distanceKm)}
                              </Text>
                            </View>
                          </View>
                          {place.highlightPrice ? (
                            <Text
                              style={[
                                styles.deckCardPrice,
                                { color: colors.copper },
                              ]}
                            >
                              ₱{place.highlightPrice}
                            </Text>
                          ) : null}
                        </View>

                        <Text
                          style={[
                            styles.deckCardName,
                            { color: colors.charcoal },
                          ]}
                        >
                          {place.name}
                        </Text>

                        <Text
                          style={[
                            styles.deckCardDetail,
                            { color: colors.muted },
                          ]}
                          numberOfLines={1}
                        >
                          {place.highlightDish
                            ? `${place.highlightDish} • ${
                                place.address || place.city || "Nearby"
                              }`
                            : place.address || "Local favorite"}
                        </Text>

                        <View style={styles.deckCardActionsRow}>
                          <TouchableOpacity
                            style={[
                              styles.deckCardFocusBtn,
                              {
                                backgroundColor: colors.sandDark,
                                borderColor: colors.border,
                              },
                            ]}
                            onPress={() => focusPlaceOnMap(place)}
                          >
                            <Ionicons
                              name="navigate-outline"
                              size={12}
                              color={colors.charcoal}
                            />
                            <Text
                              style={[
                                styles.deckCardFocusBtnText,
                                { color: colors.charcoal },
                              ]}
                            >
                              Show on Map
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[
                              styles.deckCardLogBtn,
                              { backgroundColor: colors.copper },
                            ]}
                            onPress={() => {
                              router.push(`/spot/${place.id}/edit`);
                            }}
                          >
                            <Text
                              style={[
                                styles.deckCardLogBtnText,
                                { color: colors.primaryText },
                              ]}
                            >
                              {place.category === "food"
                                ? "+ Add Dish"
                                : place.category === "leisure"
                                ? "+ Add Activity"
                                : "+ Add Service"}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })
                )}
              </ScrollView>
            </View>
          )}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.canvasMuted,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.sand,
  },
  map: {
    ...StyleSheet.absoluteFill,
  },
  markerContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  customMarkerPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.copper,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 18,
    gap: 4,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.32,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  selectedMarkerPill: {
    borderWidth: 2,
    borderColor: "#FFFFFF",
    transform: [{ scale: 1.08 }],
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 6,
  },
  markerIconCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.22)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 2,
  },
  markerPlaceName: {
    fontFamily: FontFamily.sansSemiBold,
    color: "#FFFFFF",
    fontSize: 11.5,
    maxWidth: 110,
    letterSpacing: -0.1,
  },
  markerPriceTag: {
    fontFamily: FontFamily.sansBold,
    color: "#FDE68A",
    fontSize: 11,
  },
  markerArrow: {
    width: 7,
    height: 7,
    backgroundColor: Colors.copper,
    transform: [{ rotate: "45deg" }],
    alignSelf: "center",
    marginTop: -3.5,
  },
  orbWrapper: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryOrb: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.28,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  orbArrow: {
    width: 6,
    height: 6,
    backgroundColor: Colors.copper,
    transform: [{ rotate: "45deg" }],
    alignSelf: "center",
    marginTop: -3,
  },
  radarPulseRing: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    zIndex: -1,
  },

  /* Angkas Center Reticle Graphic (Screen Center) */
  centerReticleContainer: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -18 }, { translateY: -44 }],
    alignItems: "center",
    justifyContent: "center",
    zIndex: 50,
  },
  centerReticleTooltip: {
    backgroundColor: "#1C1917",
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 10,
    marginBottom: 6,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  centerReticleTooltipText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 10,
    color: "#FAF6EF",
    letterSpacing: 0.2,
  },
  centerReticlePinWrapper: {
    alignItems: "center",
    transform: [{ translateY: 0 }],
  },
  centerReticlePinLifting: {
    transform: [{ translateY: -14 }],
  },
  centerReticleHead: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    borderColor: "#FFFFFF",
    shadowColor: Colors.copper,
    shadowOpacity: 0.45,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  centerReticleStem: {
    width: 3.5,
    height: 12,
    borderRadius: 1.75,
    marginTop: -1,
  },
  centerReticleShadow: {
    width: 14,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "rgba(0, 0, 0, 0.28)",
    marginTop: 1,
    transform: [{ scale: 1 }],
    opacity: 1,
  },
  centerReticleShadowLifting: {
    transform: [{ scale: 0.55 }],
    opacity: 0.15,
  },

  /* Angkas Pin Confirmation Dock */
  pinningDockCard: {
    position: "absolute",
    left: 14,
    right: 14,
    borderRadius: 22,
    borderWidth: 1,
    padding: 14,
    zIndex: 60,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  pinningDockHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  pinningTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  pinningDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pinningTagText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 9.5,
    letterSpacing: 0.8,
  },
  pinningCoordsText: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 10,
  },
  pinningAddressText: {
    fontFamily: FontFamily.serifSemiBold,
    fontSize: 14.5,
    marginBottom: 12,
  },
  pinningActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pinningCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  pinningCancelBtnText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 12,
  },
  pinningConfirmBtn: {
    flex: 2,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.copper,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  pinningConfirmBtnText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 12.5,
    color: "#FFFFFF",
  },

  /* Floating Top Header */
  topHeaderWrapper: {
    position: "absolute",
    top: Platform.OS === "ios" ? 54 : 36,
    left: 16,
    right: 16,
    zIndex: 20,
    gap: 10,
  },
  topUtilityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greetingCapsule: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(31, 36, 33, 0.95)",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 18,
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  greetingIconWrapper: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: Colors.copper,
    alignItems: "center",
    justifyContent: "center",
  },
  greetingTextColumn: {
    justifyContent: "center",
  },
  greetingTitle: {
    fontFamily: FontFamily.serifSemiBold,
    color: Colors.sand,
    fontSize: 12.5,
    letterSpacing: -0.2,
  },
  greetingMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 1,
  },
  pulseDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.copperLight,
  },
  greetingMetaText: {
    fontFamily: FontFamily.sansMedium,
    color: "#D1D8D4",
    fontSize: 9.5,
  },
  topRightControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  themeTogglePill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  radiusPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 5,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  radiusText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 11,
    color: Colors.charcoal,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  categoryPillsRow: {
    flexDirection: "row",
    gap: 8,
  },
  filterPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterPillActive: {
    backgroundColor: Colors.copper,
    borderColor: Colors.copper,
  },
  filterPillText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 11.5,
    color: Colors.charcoal,
  },
  filterPillTextActive: {
    fontFamily: FontFamily.sansBold,
    color: "#FFFFFF",
  },

  /* Floating Satellite Controls */
  satelliteControlsWrapper: {
    position: "absolute",
    right: 18,
    zIndex: 25,
    alignItems: "center",
    gap: 12,
  },
  recenterButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  pinSpotFloatingButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.copper,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(254, 243, 199, 0.4)",
    shadowColor: Colors.copper,
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
  },

  /* Expandable Decision Deck Bottom Sheet (Edge-to-Edge Native Drawer) */
  curatedDecisionSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 30,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -3 },
    elevation: 8,
  },
  sheetHandleRow: {
    width: "100%",
    paddingTop: 8,
    paddingBottom: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetHandleBar: {
    width: 38,
    height: 4,
    borderRadius: 2,
  },

  /* State A: Peek Mode */
  peekContentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  peekLeftSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  peekContextIconBox: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  peekMealTitle: {
    fontFamily: FontFamily.serifSemiBold,
    fontSize: 12.5,
    letterSpacing: -0.1,
  },
  peekSpotsCountText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 10,
    marginTop: 1,
  },
  peekRightSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  peekBudgetGlance: {
    alignItems: "flex-end",
  },
  peekBudgetAmount: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 11,
  },
  peekBudgetMiniBar: {
    width: 52,
    height: 3,
    borderRadius: 1.5,
    marginTop: 3,
    overflow: "hidden",
  },
  peekBudgetMiniFill: {
    height: "100%",
    borderRadius: 1.5,
  },
  sheetExpandChevronBox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },

  /* State B: Half Mode (Decision Spotlight) */
  halfContentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  halfHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  feedTitleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  copperDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  feedTitle: {
    fontFamily: FontFamily.serifSemiBold,
    fontSize: 11,
    letterSpacing: 0.6,
  },
  cityPill: {
    fontFamily: FontFamily.sansBold,
    fontSize: 9.5,
    letterSpacing: 0.2,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  halfHeaderControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  stateControlBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Hero Card */
  heroSpotCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  heroCardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  heroBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  heroCategoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 8,
  },
  heroCategoryText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 10,
  },
  heroDistanceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 8,
  },
  heroDistanceText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 10,
  },
  heroPriceText: {
    fontFamily: FontFamily.serifSemiBold,
    fontSize: 12.5,
  },
  heroSpotName: {
    fontFamily: FontFamily.serifBold,
    fontSize: 15,
    marginBottom: 2,
  },
  heroSpotSubtitle: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 11,
    marginBottom: 8,
  },
  heroActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  heroFocusBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  heroFocusBtnText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 10.5,
  },
  heroLogBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 10,
  },
  heroLogBtnText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 10.5,
  },
  emptyHeroSpot: {
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyHeroText: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
  },
  expandRadiusBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  expandRadiusBtnText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 11,
  },

  /* Mini Spots List */
  miniSpotsList: {
    marginBottom: 6,
  },
  miniSpotRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 5.5,
    borderBottomWidth: 0.5,
  },
  miniSpotLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
    marginRight: 8,
  },
  miniCategoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  miniSpotName: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 12,
    flex: 1,
  },
  miniSpotRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  miniSpotDist: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 10,
  },
  miniSpotPrice: {
    fontFamily: FontFamily.serifSemiBold,
    fontSize: 11,
  },
  halfFooterBar: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 4,
  },
  halfFooterText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 10.5,
    letterSpacing: 0.1,
  },

  /* State C: Full Mode */
  fullContentContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  fullHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  fullTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  fullTitleText: {
    fontFamily: FontFamily.serifSemiBold,
    fontSize: 12,
    letterSpacing: 0.6,
  },
  fullCountBadge: {
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  fullCountText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 10,
  },
  fullMinimizeBtn: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
  },
  fullMinimizeBtnText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 10.5,
  },
  fullScrollContent: {
    paddingBottom: 16,
    gap: 8,
  },
  fullEmptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 36,
    gap: 8,
  },
  fullEmptyTitle: {
    fontFamily: FontFamily.serifSemiBold,
    fontSize: 14,
  },
  fullEmptySub: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 11.5,
    textAlign: "center",
  },
  expandRadiusActionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  expandRadiusActionBtnText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 12,
  },
  deckCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  deckCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  deckCardBadgeGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  deckCardPrice: {
    fontFamily: FontFamily.serifSemiBold,
    fontSize: 12.5,
  },
  deckCardName: {
    fontFamily: FontFamily.serifSemiBold,
    fontSize: 14.5,
    marginBottom: 2,
  },
  deckCardDetail: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 11,
    marginBottom: 8,
  },
  deckCardActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  deckCardFocusBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9,
    borderWidth: 1,
  },
  deckCardFocusBtnText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 10.5,
  },
  deckCardLogBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 9,
  },
  deckCardLogBtnText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 10.5,
  },
});
