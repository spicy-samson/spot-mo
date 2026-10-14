import Ionicons from "@expo/vector-icons/Ionicons";
import Octicons from "@expo/vector-icons/Octicons";
import { desc, eq } from "drizzle-orm";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { db } from "@/../db/client";
import {
  Offering,
  offeringsTable,
  Place,
  placesTable,
  Visit,
  visitsTable,
} from "@/../db/schema";
import { Colors, FontFamily, L, Row, useTheme } from "@/constants/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

function getOpenStatus(open?: string | null, close?: string | null) {
  if (!open || !close) return null;
  const now = new Date().toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const isOpen =
    open <= close
      ? now >= open && now <= close
      : now >= open || now <= close;
  return {
    isOpen,
    label: isOpen ? "Open Now" : "Closed",
    timeRange: `${open} – ${close}`,
  };
}

function formatVisitDate(dateStr?: string | null): string {
  if (!dateStr) return "Recently";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default function SpotDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  const [place, setPlace] = useState<Place | null>(null);
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSpotDetails = useCallback(async () => {
    if (!id) return;
    try {
      const [p] = await db
        .select()
        .from(placesTable)
        .where(eq(placesTable.id, id));

      if (p) {
        setPlace(p);
        const offs = await db
          .select()
          .from(offeringsTable)
          .where(eq(offeringsTable.placeId, id));
        setOfferings(offs);

        const vists = await db
          .select()
          .from(visitsTable)
          .where(eq(visitsTable.placeId, id))
          .orderBy(desc(visitsTable.visitedAt));
        setVisits(vists);
      }
    } catch (err) {
      console.warn("Error fetching spot details:", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      loadSpotDetails();
    }, [loadSpotDetails]),
  );

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/spots");
    }
  };

  const toggleFavorite = async () => {
    if (!place) return;
    const nextFav = !place.isFavorite;
    setPlace({ ...place, isFavorite: nextFav });
    try {
      await db
        .update(placesTable)
        .set({ isFavorite: nextFav, updatedAt: new Date().toISOString() })
        .where(eq(placesTable.id, place.id));
    } catch (err) {
      console.warn("Failed to toggle favorite:", err);
      setPlace({ ...place, isFavorite: !nextFav });
    }
  };

  const handleOpenDirections = () => {
    if (!place?.latitude || !place?.longitude) {
      Alert.alert(
        "Location Unavailable",
        "This spot does not have coordinates pinned.",
      );
      return;
    }
    const { latitude: lat, longitude: lng, name } = place;
    const url = Platform.select({
      ios: `maps:0,0?q=${encodeURIComponent(name)}@${lat},${lng}`,
      android: `geo:0,0?q=${lat},${lng}(${encodeURIComponent(name)})`,
      default: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
    });
    Linking.openURL(url!).catch(() => {
      Linking.openURL(
        `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
      );
    });
  };

  const handleCall = () => {
    if (!place?.contactNumber) return;
    Linking.openURL(`tel:${place.contactNumber.replace(/[^0-9+]/g, "")}`);
  };

  const handleArchive = () => {
    if (!place) return;
    Alert.alert(
      "Archive Spot",
      `Are you sure you want to remove "${place.name}" from your active Black Book?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Archive",
          style: "destructive",
          onPress: async () => {
            try {
              await db
                .update(placesTable)
                .set({ isArchived: true, updatedAt: new Date().toISOString() })
                .where(eq(placesTable.id, place.id));
              router.replace("/(tabs)/spots");
            } catch (err: any) {
              Alert.alert("Error", err?.message || "Failed to archive spot");
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View
        style={[
          styles.centerContainer,
          { backgroundColor: colors.canvas, paddingTop: insets.top },
        ]}
      >
        <ActivityIndicator size="large" color={colors.copper} />
        <Text style={[styles.loadingText, { color: colors.muted }]}>
          Loading spot details...
        </Text>
      </View>
    );
  }

  if (!place) {
    return (
      <View
        style={[
          styles.centerContainer,
          { backgroundColor: colors.canvas, paddingTop: insets.top },
        ]}
      >
        <Octicons name="alert" size={32} color={colors.subtle} />
        <Text style={[styles.errorTitle, { color: colors.charcoal }]}>
          Spot Not Found
        </Text>
        <Text style={[styles.errorSubtitle, { color: colors.muted }]}>
          This spot may have been removed or does not exist.
        </Text>
        <TouchableOpacity
          style={[styles.backHomeBtn, { backgroundColor: colors.copper }]}
          onPress={handleBack}
        >
          <Text style={[styles.backHomeBtnText, { color: colors.primaryText }]}>
            Go Back
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const catConfig =
    place.category === "food"
      ? {
          label: "Food & Cafe",
          color: colors.food,
          bgColor: colors.foodLight,
          icon: "restaurant-outline" as const,
        }
      : place.category === "leisure"
        ? {
            label: "Leisure & Park",
            color: colors.leisure,
            bgColor: colors.leisureLight,
            icon: "compass-outline" as const,
          }
        : {
            label: "Self-Care",
            color: colors.selfCare,
            bgColor: colors.selfCareLight,
            icon: "leaf-outline" as const,
          };

  const scheduleStatus = getOpenStatus(
    place.scheduleOpen,
    place.scheduleClose,
  );
  const paymentMethodsList = (place.paymentMethods as string[]) || ["Cash"];
  const totalSpent = visits.reduce((acc, v) => acc + (v.amountSpent || 0), 0);

  return (
    <View style={[styles.screen, { backgroundColor: colors.canvas }]}>
      {/* 1. FLOATING NAVIGATION BAR */}
      <View
        style={[
          styles.navBar,
          {
            paddingTop: insets.top + 8,
            backgroundColor: isDark
              ? "rgba(18, 18, 20, 0.95)"
              : "rgba(251, 249, 245, 0.95)",
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.navIconBtn}
          onPress={handleBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Octicons name="chevron-left" size={20} color={colors.charcoal} />
        </TouchableOpacity>

        <Text
          style={[styles.navTitle, { color: colors.charcoal }]}
          numberOfLines={1}
        >
          {place.name}
        </Text>

        <Row gap={8}>
          {/* Favorite Toggle Button */}
          <TouchableOpacity
            style={[
              styles.navCircleBtn,
              {
                backgroundColor: place.isFavorite
                  ? isDark
                    ? "#3D260A"
                    : "#FEF3C7"
                  : colors.card,
                borderColor: colors.border,
              },
            ]}
            onPress={toggleFavorite}
          >
            <Ionicons
              name={place.isFavorite ? "star" : "star-outline"}
              size={15}
              color={place.isFavorite ? colors.leisure : colors.subtle}
            />
          </TouchableOpacity>

          {/* Edit Spot Button */}
          <TouchableOpacity
            style={[
              styles.navEditBtn,
              { backgroundColor: colors.copper },
            ]}
            onPress={() => router.push(`/spot/${place.id}/edit`)}
          >
            <Octicons name="pencil" size={12} color={colors.primaryText} />
            <Text
              style={[
                styles.navEditText,
                { color: colors.primaryText },
              ]}
            >
              Edit
            </Text>
          </TouchableOpacity>
        </Row>
      </View>

      {/* 2. SCROLLABLE SPOT CONTENT */}
      <ScrollView
        contentContainerStyle={[
          styles.scrollBody,
          { paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Spot Category & Verification Badges */}
        <Row between style={{ marginBottom: 10 }}>
          <Row gap={6}>
            <View
              style={[
                styles.categoryBadge,
                { backgroundColor: catConfig.bgColor },
              ]}
            >
              <Ionicons
                name={catConfig.icon}
                size={11}
                color={catConfig.color}
              />
              <Text
                style={[
                  styles.categoryBadgeText,
                  { color: catConfig.color },
                ]}
              >
                {catConfig.label}
              </Text>
            </View>

            <View
              style={[
                styles.visitCountBadge,
                {
                  backgroundColor:
                    visits.length > 0
                      ? isDark
                        ? "#1C3122"
                        : "#EAF4ED"
                      : isDark
                        ? "#2D261A"
                        : "#FEF3C7",
                },
              ]}
            >
              <Text
                style={[
                  styles.visitCountText,
                  {
                    color:
                      visits.length > 0 ? colors.food : colors.leisure,
                  },
                ]}
              >
                {visits.length > 0
                  ? `Visited (${visits.length}x)`
                  : "Saved to Wishlist"}
              </Text>
            </View>
          </Row>

          <Text style={[styles.spotIdTag, { color: colors.muted }]}>
            SPOT #{place.id.slice(-4).toUpperCase()}
          </Text>
        </Row>

        {/* Spot Title & Address */}
        <Text style={[styles.spotHeading, { color: colors.charcoal }]}>
          {place.name}
        </Text>

        <Row gap={6} style={{ marginTop: 4, marginBottom: 14 }}>
          <Octicons name="location" size={13} color={colors.muted} />
          <Text style={[styles.addressText, { color: colors.muted }]}>
            {place.address && place.city
              ? `${place.address} • ${place.city}`
              : place.address || place.city || "Local Spot"}
          </Text>
        </Row>

        {/* Operating Hours & Payment Chips Row */}
        {(scheduleStatus || paymentMethodsList.length > 0) && (
          <Row gap={8} style={styles.metadataTagsRow}>
            {scheduleStatus && (
              <View
                style={[
                  styles.metaChip,
                  {
                    backgroundColor: scheduleStatus.isOpen
                      ? isDark
                        ? "#152E1C"
                        : "#EAF4ED"
                      : isDark
                        ? "#301D1E"
                        : "#FEE2E2",
                    borderColor: scheduleStatus.isOpen
                      ? `${colors.food}40`
                      : "#EF444440",
                  },
                ]}
              >
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor: scheduleStatus.isOpen
                        ? colors.food
                        : "#EF4444",
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.metaChipText,
                    {
                      color: scheduleStatus.isOpen
                        ? colors.food
                        : "#EF4444",
                    },
                  ]}
                >
                  {scheduleStatus.label} ({scheduleStatus.timeRange})
                </Text>
              </View>
            )}

            {paymentMethodsList.length > 0 && (
              <View
                style={[
                  styles.metaChip,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Ionicons
                  name="wallet-outline"
                  size={12}
                  color={colors.muted}
                />
                <Text
                  style={[styles.metaChipText, { color: colors.subtle }]}
                >
                  {paymentMethodsList.join(" • ")}
                </Text>
              </View>
            )}
          </Row>
        )}

        {/* 3. INTERACTIVE MINI-MAP PREVIEW */}
        {place.latitude && place.longitude ? (
          <View
            style={[
              styles.mapCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <MapView
              provider={PROVIDER_DEFAULT}
              style={styles.miniMap}
              scrollEnabled={false}
              zoomEnabled={false}
              pitchEnabled={false}
              rotateEnabled={false}
              region={{
                latitude: place.latitude,
                longitude: place.longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
              }}
            >
              <Marker
                coordinate={{
                  latitude: place.latitude,
                  longitude: place.longitude,
                }}
              >
                <View
                  style={[
                    styles.mapMarkerPin,
                    { backgroundColor: catConfig.color },
                  ]}
                >
                  <Ionicons
                    name={
                      place.category === "food"
                        ? "restaurant"
                        : place.category === "leisure"
                        ? "compass"
                        : "leaf"
                    }
                    size={13}
                    color="#FFFFFF"
                  />
                </View>
              </Marker>
            </MapView>

            <View style={styles.mapActionsRow}>
              <TouchableOpacity
                style={[
                  styles.directionsBtn,
                  {
                    backgroundColor: colors.copper,
                  },
                ]}
                onPress={handleOpenDirections}
              >
                <Ionicons
                  name="navigate"
                  size={13}
                  color={colors.primaryText}
                />
                <Text
                  style={[
                    styles.directionsBtnText,
                    { color: colors.primaryText },
                  ]}
                >
                  Get Directions (Maps)
                </Text>
              </TouchableOpacity>

              {place.contactNumber && (
                <TouchableOpacity
                  style={[
                    styles.callBtn,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={handleCall}
                >
                  <Ionicons
                    name="call-outline"
                    size={14}
                    color={colors.charcoal}
                  />
                  <Text
                    style={[styles.callBtnText, { color: colors.charcoal }]}
                  >
                    Call
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ) : null}

        {/* Contact Person / Staff Note */}
        {(place.contactPerson || place.contactNumber) && (
          <View
            style={[
              styles.contactSection,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.sectionHeading, { color: colors.muted }]}>
              Contact & Inquiries
            </Text>
            <Row between style={{ marginTop: 6 }}>
              {place.contactPerson ? (
                <Row gap={5}>
                  <Ionicons
                    name="person-outline"
                    size={14}
                    color={colors.muted}
                  />
                  <Text
                    style={[styles.contactValue, { color: colors.charcoal }]}
                  >
                    {place.contactPerson}
                  </Text>
                </Row>
              ) : null}
              {place.contactNumber ? (
                <TouchableOpacity onPress={handleCall}>
                  <Row gap={4}>
                    <Ionicons
                      name="call-outline"
                      size={14}
                      color={colors.copper}
                    />
                    <Text
                      style={[styles.contactValue, { color: colors.copper }]}
                    >
                      {place.contactNumber}
                    </Text>
                  </Row>
                </TouchableOpacity>
              ) : null}
            </Row>
          </View>
        )}

        {/* 4. EDITORIAL NOTES & VIBE */}
        {place.notes ? (
          <View
            style={[
              styles.notesSection,
              {
                borderLeftColor: catConfig.color,
                backgroundColor: isDark
                  ? "rgba(39, 39, 42, 0.4)"
                  : "rgba(245, 245, 240, 0.7)",
              },
            ]}
          >
            <Text style={[styles.notesLabel, { color: colors.muted }]}>
              CURATOR NOTE & VIBE
            </Text>
            <Text style={[styles.notesText, { color: colors.charcoal }]}>
              “{place.notes}”
            </Text>
          </View>
        ) : null}

        {/* 5. STANDOUT MENU & RECOMMENDATIONS */}
        <View style={styles.blockSection}>
          <Row between style={{ marginBottom: 10 }}>
            <Text style={[styles.sectionHeading, { color: colors.muted }]}>
              What's Good Here ({offerings.length})
            </Text>
            <TouchableOpacity
              onPress={() => router.push(`/spot/${place.id}/edit`)}
            >
              <Text style={[styles.sectionActionLink, { color: colors.leisure }]}>
                {place.category === "food"
                  ? "+ Add Dish"
                  : place.category === "leisure"
                  ? "+ Add Activity"
                  : "+ Add Service"}
              </Text>
            </TouchableOpacity>
          </Row>

          {offerings.length === 0 ? (
            <View
              style={[
                styles.emptyBox,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.emptyBoxText, { color: colors.caption }]}>
                {place.category === "food"
                  ? "No specific dishes or menu items added yet."
                  : place.category === "leisure"
                  ? "No specific activities or highlights added yet."
                  : "No specific services or treatments added yet."}
              </Text>
            </View>
          ) : (
            offerings.map((item) => (
              <View
                key={item.id}
                style={[
                  styles.offeringCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Row between style={L.fill}>
                  <Row gap={8} style={{ flex: 1, paddingRight: 8 }}>
                    {item.isRecommended ? (
                      <View
                        style={[
                          styles.recommendedStarBadge,
                          {
                            backgroundColor: isDark ? "#3A2912" : "#FEF3C7",
                            borderColor: isDark ? "#854D0E" : "#FDE68A",
                            borderWidth: 1,
                          },
                        ]}
                      >
                        <Ionicons name="star" size={12} color="#D97706" />
                      </View>
                    ) : (
                      <View
                        style={[
                          styles.regularItemBadge,
                          {
                            backgroundColor: colors.sandDark,
                            borderColor: colors.border,
                            borderWidth: 1,
                          },
                        ]}
                      >
                        <Ionicons
                          name={
                            place.category === "food"
                              ? "restaurant-outline"
                              : place.category === "leisure"
                              ? "compass-outline"
                              : "leaf-outline"
                          }
                          size={12}
                          color={catConfig.color}
                        />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.offeringName,
                          { color: colors.charcoal },
                        ]}
                        numberOfLines={1}
                      >
                        {item.name}
                      </Text>
                      {item.isRecommended && (
                        <Text
                          style={[
                            styles.recommendedTag,
                            { color: colors.copper },
                          ]}
                        >
                          {place.category === "food"
                            ? "Must-Order Dish"
                            : place.category === "leisure"
                            ? "Must-Try Activity"
                            : "Signature Service"}
                        </Text>
                      )}
                    </View>
                  </Row>

                  <Text
                    style={[styles.offeringPrice, { color: colors.copper }]}
                  >
                    {item.price === 0 ? "Free" : `₱${item.price}`}
                  </Text>
                </Row>
              </View>
            ))
          )}
        </View>

        {/* 6. VISIT HISTORY & SPEND LOG */}
        <View style={styles.blockSection}>
          <Row between style={{ marginBottom: 10 }}>
            <View>
              <Text style={[styles.sectionHeading, { color: colors.muted }]}>
                Visits & Spending Log
              </Text>
              <Text style={[styles.spendSummary, { color: colors.charcoal }]}>
                {visits.length} {visits.length === 1 ? "visit" : "visits"} • Total{" "}
                <Text style={{ fontFamily: FontFamily.sansBold }}>
                  ₱{totalSpent}
                </Text>
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.logVisitBtn,
                { backgroundColor: colors.copper },
              ]}
              onPress={() =>
                router.push({
                  pathname: "/log-visit",
                  params: {
                    placeId: place.id,
                    placeName: place.name,
                  },
                })
              }
            >
              <Octicons name="plus" size={11} color={colors.primaryText} />
              <Text
                style={[
                  styles.logVisitBtnText,
                  { color: colors.primaryText },
                ]}
              >
                Log Visit
              </Text>
            </TouchableOpacity>
          </Row>

          {visits.length === 0 ? (
            <View
              style={[
                styles.emptyBox,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.emptyBoxText, { color: colors.caption }]}>
                No visits logged yet. Keep track of what you ordered and spent!
              </Text>
            </View>
          ) : (
            visits.map((vis) => (
              <View
                key={vis.id}
                style={[
                  styles.visitRow,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Row between style={{ marginBottom: 4 }}>
                  <Text
                    style={[styles.visitDateText, { color: colors.charcoal }]}
                  >
                    {formatVisitDate(vis.visitedAt)}
                  </Text>
                  <Text
                    style={[styles.visitAmountText, { color: colors.copper }]}
                  >
                    ₱{vis.amountSpent}
                  </Text>
                </Row>
                {vis.itemsSummary ? (
                  <Text
                    style={[styles.visitSummaryText, { color: colors.subtle }]}
                  >
                    {vis.itemsSummary}
                  </Text>
                ) : null}
                {vis.rating ? (
                  <Row gap={2} style={{ marginTop: 4 }}>
                    {Array.from({ length: vis.rating }).map((_, i) => (
                      <Ionicons
                        key={i}
                        name="star"
                        size={11}
                        color={colors.leisure}
                      />
                    ))}
                  </Row>
                ) : null}
              </View>
            ))
          )}
        </View>

        {/* 7. ARCHIVE SPOT (Destructive action) */}
        <TouchableOpacity
          style={[styles.archiveBtn, { borderColor: `${colors.muted}40` }]}
          onPress={handleArchive}
        >
          <Octicons name="archive" size={13} color={colors.caption} />
          <Text style={[styles.archiveBtnText, { color: colors.caption }]}>
            Archive Spot from Black Book
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  loadingText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 13,
    marginTop: 12,
  },
  errorTitle: {
    fontFamily: FontFamily.serifSemiBold,
    fontSize: 18,
    marginTop: 14,
  },
  errorSubtitle: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12.5,
    textAlign: "center",
    marginTop: 4,
    lineHeight: 18,
  },
  backHomeBtn: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
  },
  backHomeBtnText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 12,
  },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  navIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  navTitle: {
    flex: 1,
    fontFamily: FontFamily.serifSemiBold,
    fontSize: 16,
    letterSpacing: -0.2,
    marginHorizontal: 10,
    textAlign: "center",
  },
  navCircleBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  navEditBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
  },
  navEditText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 12,
  },
  scrollBody: {
    padding: 18,
    gap: 16,
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
  },
  categoryBadgeText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 10.5,
  },
  visitCountBadge: {
    paddingHorizontal: 7.5,
    paddingVertical: 3.5,
    borderRadius: 8,
  },
  visitCountText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 10.5,
  },
  spotIdTag: {
    fontFamily: FontFamily.sansBold,
    fontSize: 9.5,
    letterSpacing: 0.8,
  },
  spotHeading: {
    fontFamily: FontFamily.serifBold,
    fontSize: 26,
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  addressText: {
    flex: 1,
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
  },
  metadataTagsRow: {
    flexWrap: "wrap",
    marginBottom: 4,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  metaChipText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 11,
  },
  mapCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  miniMap: {
    width: "100%",
    height: 140,
  },
  mapMarkerPin: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1.5 },
    elevation: 4,
  },
  mapActionsRow: {
    flexDirection: "row",
    padding: 10,
    gap: 8,
  },
  directionsBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  directionsBtnText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 12.5,
  },
  callBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  callBtnText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 12.5,
  },
  contactSection: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  contactValue: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 12.5,
  },
  notesSection: {
    borderLeftWidth: 3,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  notesLabel: {
    fontFamily: FontFamily.sansBold,
    fontSize: 9.5,
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  notesText: {
    fontFamily: FontFamily.serifRegular,
    fontStyle: "italic",
    fontSize: 13.5,
    lineHeight: 20,
  },
  blockSection: {
    gap: 8,
  },
  sectionHeading: {
    fontFamily: FontFamily.sansBold,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  spendSummary: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 12,
    marginTop: 1,
  },
  sectionActionLink: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 12,
  },
  logVisitBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  logVisitBtnText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 11.5,
  },
  emptyBox: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  emptyBoxText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 12,
  },
  offeringCard: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  recommendedStarBadge: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  regularItemBadge: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  offeringName: {
    fontFamily: FontFamily.serifSemiBold,
    fontSize: 14,
  },
  recommendedTag: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 10,
    marginTop: 1,
  },
  offeringPrice: {
    fontFamily: FontFamily.serifBold,
    fontSize: 14,
  },
  visitRow: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  visitDateText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 12.5,
  },
  visitAmountText: {
    fontFamily: FontFamily.serifBold,
    fontSize: 13.5,
  },
  visitSummaryText: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    marginTop: 2,
  },
  archiveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 10,
  },
  archiveBtnText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 12,
  },
});

