import * as Location from "expo-location";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, Region } from "react-native-maps";
import Ionicons from "@expo/vector-icons/Ionicons";
import Octicons from "@expo/vector-icons/Octicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { desc, eq } from "drizzle-orm";

import { db } from "@/../db/client";
import { offeringsTable, placesTable } from "@/../db/schema";
import { Colors, FontFamily, Typography, useTheme } from "@/constants/theme";

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
}

const DEFAULT_REGION: Region = {
  latitude: 14.5547,
  longitude: 121.0244,
  latitudeDelta: 0.02,
  longitudeDelta: 0.02,
};

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
  { featureType: "poi.business", elementType: "all", stylers: [{ visibility: "off" }] },
  { featureType: "poi.government", elementType: "all", stylers: [{ visibility: "off" }] },
  { featureType: "poi.medical", elementType: "all", stylers: [{ visibility: "off" }] },
  { featureType: "poi.school", elementType: "all", stylers: [{ visibility: "off" }] },
  { featureType: "poi.sports_complex", elementType: "all", stylers: [{ visibility: "off" }] },
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
  const { colors, isDark, toggleTheme } = useTheme();
  const mapRef = useRef<MapView>(null);
  const [userLocation, setUserLocation] = useState<Region | null>(null);
  const [city, setCity] = useState("Makati");
  const [radiusKm, setRadiusKm] = useState(3);
  const [activeCategory, setActiveCategory] = useState<
    "all" | "food" | "leisure" | "self_care"
  >("all");

  const [places, setPlaces] = useState<PlaceWithOffering[]>([]);

  // Pending Pin on map
  const [pendingPin, setPendingPin] = useState<{
    latitude: number;
    longitude: number;
    address?: string;
  } | null>(null);

  // Time-aware greeting
  const getContextualGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) {
      return {
        greeting: "Good morning",
        meal: "Breakfast window",
        icon: "cafe-outline" as const,
      };
    } else if (hour >= 11 && hour < 14) {
      return {
        greeting: "Good afternoon",
        meal: "Lunch time",
        icon: "sunny-outline" as const,
      };
    } else if (hour >= 14 && hour < 18) {
      return {
        greeting: "Good afternoon",
        meal: "Merienda snack",
        icon: "cafe-outline" as const,
      };
    } else if (hour >= 18 && hour < 22) {
      return {
        greeting: "Good evening",
        meal: "Dinner time",
        icon: "restaurant-outline" as const,
      };
    } else {
      return {
        greeting: "Late night",
        meal: "Night bites",
        icon: "moon-outline" as const,
      };
    }
  };

  const contextInfo = getContextualGreeting();

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
          latitudeDelta: 0.018,
          longitudeDelta: 0.018,
        };

        setUserLocation(initial);
        mapRef.current?.animateToRegion(initial, 1000);

        const [rev] = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        if (rev?.city || rev?.subregion) {
          setCity(rev.city || rev.subregion || "Makati");
        }
      } catch {
        setUserLocation(DEFAULT_REGION);
      }
    }

    initLocation();
  }, []);

  // Fetch places from SQLite whenever screen is focused
  useFocusEffect(
    useCallback(() => {
      loadPlaces();
      // Clear pending pin whenever user navigates back to map
      setPendingPin(null);
    }, [activeCategory]),
  );

  async function loadPlaces() {
    try {
      const rows = await db
        .select()
        .from(placesTable)
        .where(eq(placesTable.isArchived, false))
        .orderBy(desc(placesTable.createdAt));

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
        });
      }

      setPlaces(placesWithItems);
    } catch (e) {
      console.log("Error loading places:", e);
    }
  }

  const handleCenterGPS = () => {
    if (userLocation) {
      mapRef.current?.animateToRegion(userLocation, 800);
    }
  };

  const cycleRadius = () => {
    const next =
      radiusKm === 1 ? 3 : radiusKm === 3 ? 5 : radiusKm === 5 ? 10 : 1;
    setRadiusKm(next);
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

  // Map tap: drop or move pending pin, and reverse geocode
  const handleMapPress = async (coord: {
    latitude: number;
    longitude: number;
  }) => {
    setPendingPin({
      latitude: coord.latitude,
      longitude: coord.longitude,
      address: "Locating address...",
    });

    try {
      const [rev] = await Location.reverseGeocodeAsync(coord);
      if (rev) {
        const street = rev.street || rev.name || rev.district || "";
        const c = rev.city || rev.subregion || rev.region || "Makati";
        const addr = street ? `${street}, ${c}` : c;
        setPendingPin({
          latitude: coord.latitude,
          longitude: coord.longitude,
          address: addr,
        });
      }
    } catch {
      setPendingPin({
        latitude: coord.latitude,
        longitude: coord.longitude,
        address: `Pin (${coord.latitude.toFixed(4)}, ${coord.longitude.toFixed(4)})`,
      });
    }
  };

  // Floating + button action
  const handleFloatingPinPress = () => {
    if (pendingPin) {
      router.push({
        pathname: "/spot/new",
        params: {
          lat: pendingPin.latitude.toString(),
          lng: pendingPin.longitude.toString(),
          address: pendingPin.address || "",
        },
      });
    } else if (userLocation) {
      handleMapPress({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
      });
    } else {
      router.push("/spot/new");
    }
  };

  // Tab bar base clearance:
  // Inside NativeTabs on iOS, insets.bottom is typically ~83 (tab bar 49 + home indicator 34).
  // If insets.bottom already includes the tab bar (> 45), place the card just 4pt above insets.bottom.
  // Otherwise, add the 49pt tab bar height + insets.bottom + 4pt.
  const bottomBarClearance =
    insets.bottom > 45 ? insets.bottom + 4 : 49 + insets.bottom + 4;

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
        onPress={(e) => handleMapPress(e.nativeEvent.coordinate)}
      >
        {/* Pinned Saved Places Markers */}
        {places.map((place) => {
          if (!place.latitude || !place.longitude) return null;
          const badge = getCategoryBadge(place.category);
          return (
            <Marker
              key={place.id}
              coordinate={{
                latitude: place.latitude,
                longitude: place.longitude,
              }}
              title={place.name}
              description={
                place.highlightDish
                  ? `${place.highlightDish} • ₱${place.highlightPrice}`
                  : place.category
              }
              tracksViewChanges={false}
            >
              <View
                style={[
                  styles.customMarkerPill,
                  { backgroundColor: badge.color },
                ]}
              >
                <View style={styles.markerIconCircle}>
                  <Ionicons name={badge.icon} size={11} color="#FFFFFF" />
                </View>
                <Text style={styles.markerPlaceName} numberOfLines={1}>
                  {place.name}
                </Text>
                {place.highlightPrice ? (
                  <Text
                    style={[
                      styles.markerPriceTag,
                      isDark && { color: "#1C1917" },
                    ]}
                  >
                    ₱{place.highlightPrice}
                  </Text>
                ) : null}
              </View>
              <View
                style={[styles.markerArrow, { backgroundColor: badge.color }]}
              />
            </Marker>
          );
        })}

        {/* Pending Pin Marker (Tactile bent pin on the map) */}
        {pendingPin && (
          <Marker
            coordinate={{
              latitude: pendingPin.latitude,
              longitude: pendingPin.longitude,
            }}
            anchor={{ x: 0.5, y: 0.95 }}
          >
            <View style={styles.bentPinGraphic}>
              <View
                style={[
                  styles.bentPinHead,
                  {
                    backgroundColor: colors.copper,
                    borderColor: isDark ? "#1C1917" : "#FFFFFF",
                  },
                ]}
              >
                <Octicons name="pin" size={17} color={colors.primaryText} />
              </View>
              <View
                style={[
                  styles.bentPinStem,
                  { backgroundColor: colors.copperDark },
                ]}
              />
              <View style={styles.bentPinGroundShadow} />
            </View>
          </Marker>
        )}
      </MapView>

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
                { backgroundColor: colors.leisure },
              ]}
            >
              <Ionicons name={contextInfo.icon} size={14} color="#FFFFFF" />
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
                  style={[styles.pulseDot, { backgroundColor: colors.food }]}
                />
                <Text
                  style={[
                    styles.greetingMetaText,
                    { color: colors.headerCapsuleSubtext },
                  ]}
                >
                  {contextInfo.meal} • {city}
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
                {radiusKm} km
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
                      ? c.id === "all"
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
                        ? c.id === "all"
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

      {/* 3. Floating Satellite Controls (Center Right) */}
      <View
        style={[
          styles.satelliteControlsWrapper,
          {
            bottom: bottomBarClearance + (pendingPin ? 116 : 58) + 8,
          },
        ]}
      >
        {/* Recenter Location Button */}
        <TouchableOpacity
          style={[
            styles.recenterButton,
            {
              backgroundColor: colors.satelliteBtnBg,
              borderColor: colors.border,
            },
          ]}
          onPress={handleCenterGPS}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Octicons
            name="cross-reference"
            size={18}
            color={colors.satelliteBtnIcon}
          />
        </TouchableOpacity>

        {/* Big Anchor Pin Button (Neutral Anchor — Never competes with map pins) */}
        <TouchableOpacity
          style={[
            styles.pinSpotFloatingButton,
            {
              backgroundColor: colors.fabBg,
              shadowColor: colors.fabBg,
            },
          ]}
          onPress={handleFloatingPinPress}
          activeOpacity={0.9}
        >
          <Octicons name="plus" size={24} color={colors.fabIcon} />
        </TouchableOpacity>
      </View>

      {/* 4. Pending Spot Pin Action Banner */}
      {pendingPin && (
        <View
          style={[
            styles.pendingPinBanner,
            {
              bottom: bottomBarClearance + 58,
              backgroundColor: colors.cardGlass,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.pendingPinBannerLeft}>
            <View
              style={[
                styles.pendingPinBannerDot,
                { backgroundColor: colors.copper },
              ]}
            >
              <Octicons name="location" size={13} color={colors.primaryText} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={[styles.pendingPinBannerTitle, { color: colors.copper }]}
              >
                Selected Pin
              </Text>
              <Text
                style={[
                  styles.pendingPinBannerAddress,
                  { color: colors.charcoal },
                ]}
                numberOfLines={1}
              >
                {pendingPin.address}
              </Text>
            </View>
          </View>

          <View style={styles.pendingPinBannerActions}>
            <TouchableOpacity
              style={[
                styles.pendingPinDismissBtn,
                { backgroundColor: colors.sandDark },
              ]}
              onPress={() => setPendingPin(null)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Octicons name="x" size={16} color={colors.subtle} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.pendingPinSaveBtn,
                { backgroundColor: colors.copper },
              ]}
              onPress={() =>
                router.push({
                  pathname: "/spot/new",
                  params: {
                    lat: pendingPin.latitude.toString(),
                    lng: pendingPin.longitude.toString(),
                    address: pendingPin.address || "",
                  },
                })
              }
            >
              <Text
                style={[
                  styles.pendingPinSaveBtnText,
                  { color: colors.primaryText },
                ]}
              >
                Pin Spot →
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 5. Curated Feed Floating Card */}
      <View
        style={[
          styles.curatedFloatingCard,
          {
            bottom: bottomBarClearance,
            backgroundColor: colors.cardGlass,
            borderColor: colors.border,
          },
        ]}
      >
        {/* Header row */}
        <View style={styles.feedHeaderRow}>
          <View style={styles.feedTitleLeft}>
            <View
              style={[styles.copperDot, { backgroundColor: colors.leisure }]}
            />
            <Text style={[styles.feedTitle, { color: colors.charcoal }]}>
              Curated Feed
            </Text>
            <View
              style={[
                styles.feedCountBadge,
                { backgroundColor: colors.sandDark },
              ]}
            >
              <Text style={[styles.feedCountText, { color: colors.charcoal }]}>
                {places.length}
              </Text>
            </View>
          </View>
          <Text
            style={[
              styles.cityPill,
              {
                backgroundColor: colors.leisureLight,
                color: colors.leisure,
              },
            ]}
          >
            {city} CBD
          </Text>
        </View>

        {/* Daily Budget Tracker Glance */}
        <View style={styles.budgetRow}>
          <Text style={[styles.budgetAmountText, { color: colors.charcoal }]}>
            <Text style={[styles.budgetHighlight, { color: colors.leisure }]}>
              ₱320
            </Text>{" "}
            left{" "}
            <Text style={[styles.budgetSubTotal, { color: colors.muted }]}>
              of ₱500
            </Text>
          </Text>
          <Text style={[styles.budgetSpentText, { color: colors.food }]}>
            ₱180 Spent today
          </Text>
        </View>
        <View
          style={[
            styles.budgetProgressBar,
            { backgroundColor: colors.sandDark },
          ]}
        >
          <View
            style={[
              styles.budgetProgressFill,
              { width: "36%", backgroundColor: colors.leisure },
            ]}
          />
        </View>
      </View>
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
  customMarkerPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.copper,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 18,
    gap: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.6)",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
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
    fontFamily: FontFamily.serifSemiBold,
    color: "#FFFFFF",
    fontSize: 11.5,
    maxWidth: 95,
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

  /* Pending / Bent Pin Graphic */
  bentPinGraphic: {
    alignItems: "center",
    transform: [{ rotate: "-8deg" }],
  },
  bentPinHead: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.terracotta,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    shadowColor: Colors.terracotta,
    shadowOpacity: 0.5,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  bentPinStem: {
    width: 3,
    height: 10,
    backgroundColor: Colors.copperDark,
    borderRadius: 1.5,
    marginTop: -2,
  },
  bentPinGroundShadow: {
    width: 12,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(0,0,0,0.25)",
    marginTop: 1,
  },

  /* Pending Pin Floating Action Banner */
  pendingPinBanner: {
    position: "absolute",
    left: 14,
    right: 14,
    zIndex: 35,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
  },
  pendingPinBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  pendingPinBannerDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.terracotta,
    alignItems: "center",
    justifyContent: "center",
  },
  pendingPinBannerTitle: {
    fontFamily: FontFamily.serifSemiBold,
    fontSize: 12,
    color: Colors.copper,
    letterSpacing: -0.1,
  },
  pendingPinBannerAddress: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 11,
    color: Colors.charcoal,
    marginTop: 1,
  },
  pendingPinBannerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pendingPinDismissBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.sand,
    alignItems: "center",
    justifyContent: "center",
  },
  pendingPinSaveBtn: {
    backgroundColor: Colors.terracotta,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  pendingPinSaveBtnText: {
    fontFamily: FontFamily.sansBold,
    color: "#FFFFFF",
    fontSize: 11,
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

  /* Curated Floating Card */
  curatedFloatingCard: {
    position: "absolute",
    left: 14,
    right: 14,
    zIndex: 30,
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
  },
  feedHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
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
    backgroundColor: Colors.copper,
  },
  feedTitle: {
    fontFamily: FontFamily.serifSemiBold,
    fontSize: 11,
    textTransform: "uppercase",
    color: Colors.charcoal,
    letterSpacing: 0.6,
  },
  feedCountBadge: {
    backgroundColor: Colors.sandDark,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  feedCountText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 9,
    color: Colors.charcoal,
  },
  cityPill: {
    fontFamily: FontFamily.sansBold,
    fontSize: 9.5,
    letterSpacing: 0.2,
    color: Colors.copper,
    backgroundColor: Colors.terracottaLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },

  /* Compact Budget Rows */
  budgetRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  budgetAmountText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 11.5,
    color: Colors.charcoal,
  },
  budgetHighlight: {
    fontFamily: FontFamily.serifSemiBold,
    color: Colors.copper,
    fontSize: 12.5,
  },
  budgetSubTotal: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 9.5,
    color: Colors.muted,
  },
  budgetSpentText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 9.5,
    color: Colors.moss,
  },
  budgetProgressBar: {
    height: 4,
    backgroundColor: Colors.sandDark,
    borderRadius: 2,
    overflow: "hidden",
  },
  budgetProgressFill: {
    height: "100%",
    backgroundColor: Colors.copper,
    borderRadius: 2,
  },
});
