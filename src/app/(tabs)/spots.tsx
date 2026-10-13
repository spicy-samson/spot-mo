import { router } from "expo-router";
import { useMemo, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import Octicons from "@expo/vector-icons/Octicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  FontFamily,
  L,
  Row,
  useThemedStyles,
  useTheme,
} from "@/constants/theme";
import { useTabBar } from "@/context/TabBarContext";

// ============================================================================
// DATA CONTRACT (Mirrors SQLite schema: places, offerings, visits)
// ============================================================================
export interface OfferingDraft {
  id: string;
  name: string;
  price: number;
  itemType: "good" | "service";
  isRecommended: boolean;
  notes?: string | null;
}

export interface VisitDraft {
  id: string;
  visitedAt: string;
  amountSpent: number;
  itemsSummary?: string | null;
  rating?: number | null;
  transportMode?: "walk" | "bike" | "transit" | "car" | "motorcycle" | "other" | null;
  notes?: string | null;
}

export interface SpotItem {
  id: string;
  name: string;
  category: "food" | "leisure" | "self_care";
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  city: string | null;
  notes: string | null;
  isFavorite: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  offerings: OfferingDraft[];
  visits: VisitDraft[];
}

// ============================================================================
// SCHEMA-COMPLIANT DUMMY DATA FOR UI DRAFTING
// ============================================================================
const DUMMY_SPOTS: SpotItem[] = [
  {
    id: "place-1",
    name: "Yardstick Coffee",
    category: "food",
    latitude: 14.5547,
    longitude: 121.0163,
    address: "Universal LMS Bldg, 106 Esteban St, Legazpi Village",
    city: "Makati",
    notes: "Signature third-wave roastery with minimalist counter seating. Exceptional filter brews.",
    isFavorite: true,
    isArchived: false,
    createdAt: "2026-09-15T08:30:00Z",
    updatedAt: "2026-10-12T14:20:00Z",
    offerings: [
      {
        id: "off-1",
        name: "Golden Ticket Waffles",
        price: 380,
        itemType: "good",
        isRecommended: true,
      },
      {
        id: "off-2",
        name: "Cold Brew Concentrate",
        price: 180,
        itemType: "good",
        isRecommended: false,
      },
    ],
    visits: [
      {
        id: "vis-1",
        visitedAt: "2 days ago",
        amountSpent: 560,
        itemsSummary: "Waffles + Cold Brew",
        rating: 5,
        transportMode: "walk",
      },
    ],
  },
  {
    id: "place-2",
    name: "Washington SyCip Park",
    category: "leisure",
    latitude: 14.5542,
    longitude: 121.0181,
    address: "Legazpi St, Legazpi Village",
    city: "Makati",
    notes: "Lush tropical bamboo sanctuary with quiet reading benches, sculptures, and koi ponds.",
    isFavorite: true,
    isArchived: false,
    createdAt: "2026-09-10T10:00:00Z",
    updatedAt: "2026-10-10T09:15:00Z",
    offerings: [
      {
        id: "off-3",
        name: "Park Stroll & Entry",
        price: 0,
        itemType: "service",
        isRecommended: true,
      },
      {
        id: "off-4",
        name: "Weekend Market Taho",
        price: 60,
        itemType: "good",
        isRecommended: true,
      },
    ],
    visits: [
      {
        id: "vis-3",
        visitedAt: "Yesterday",
        amountSpent: 60,
        itemsSummary: "Morning walk + Taho",
        rating: 5,
        transportMode: "walk",
      },
    ],
  },
  {
    id: "place-3",
    name: "Toby's Estate",
    category: "food",
    latitude: 14.5583,
    longitude: 121.0234,
    address: "V Corporate Centre, L.P. Leviste St, Salcedo Village",
    city: "Makati",
    notes: "Reliable pour-overs and brunch fare. Great natural daylight from floor-to-ceiling windows.",
    isFavorite: false,
    isArchived: false,
    createdAt: "2026-09-20T12:00:00Z",
    updatedAt: "2026-10-05T16:00:00Z",
    offerings: [
      {
        id: "off-5",
        name: "Flat White (Woolloomooloo)",
        price: 190,
        itemType: "good",
        isRecommended: true,
      },
    ],
    visits: [
      {
        id: "vis-4",
        visitedAt: "Last week",
        amountSpent: 350,
        itemsSummary: "Flat White & Pastry",
        rating: 4,
        transportMode: "walk",
      },
    ],
  },
  {
    id: "place-4",
    name: "Ayala Triangle Gardens",
    category: "leisure",
    latitude: 14.5574,
    longitude: 121.0227,
    address: "Paseo de Roxas cor. Makati Ave",
    city: "Makati",
    notes: "Sprawling central park shaded by heritage rain trees. Excellent evening jogging loop.",
    isFavorite: false,
    isArchived: false,
    createdAt: "2026-09-25T11:00:00Z",
    updatedAt: "2026-09-25T11:00:00Z",
    offerings: [
      {
        id: "off-7",
        name: "Sunset Run & Relaxation",
        price: 0,
        itemType: "service",
        isRecommended: true,
      },
    ],
    visits: [], // Wishlist (unvisited)
  },
  {
    id: "place-5",
    name: "The Grey Space Salon & Spa",
    category: "self_care",
    latitude: 14.5645,
    longitude: 121.0315,
    address: "Dormitory Bldg, Alfonso St, Poblacion",
    city: "Makati",
    notes: "Minimalist Scandinavian aesthetic. Organic scalp treatments and herbal tea ritual.",
    isFavorite: true,
    isArchived: false,
    createdAt: "2026-10-01T15:00:00Z",
    updatedAt: "2026-10-11T17:00:00Z",
    offerings: [
      {
        id: "off-8",
        name: "Botanical Scalp Therapy",
        price: 650,
        itemType: "service",
        isRecommended: true,
      },
    ],
    visits: [
      {
        id: "vis-5",
        visitedAt: "Oct 4",
        amountSpent: 650,
        itemsSummary: "Botanical Scalp Therapy",
        rating: 5,
        transportMode: "transit",
      },
    ],
  },
  {
    id: "place-6",
    name: "Kura Izakaya",
    category: "food",
    latitude: 14.5638,
    longitude: 121.0332,
    address: "Don Pedro St, Poblacion",
    city: "Makati",
    notes: "Cozy 12-seater counter serving charcoal binchotan yakitori and curated highballs.",
    isFavorite: false,
    isArchived: false,
    createdAt: "2026-10-08T19:00:00Z",
    updatedAt: "2026-10-08T19:00:00Z",
    offerings: [
      {
        id: "off-10",
        name: "Momo & Tsukune Platter",
        price: 420,
        itemType: "good",
        isRecommended: true,
      },
    ],
    visits: [], // Wishlist (unvisited)
  },
  {
    id: "place-7",
    name: "Poblacion Pottery Studio",
    category: "self_care",
    latitude: 14.5662,
    longitude: 121.0345,
    address: "Fermin St, Poblacion",
    city: "Makati",
    notes: "Calm ceramic studio offering beginner wheel-throwing and mindful hand-building.",
    isFavorite: false,
    isArchived: false,
    createdAt: "2026-10-11T10:00:00Z",
    updatedAt: "2026-10-11T10:00:00Z",
    offerings: [
      {
        id: "off-12",
        name: "2-Hour Wheel Intro Session",
        price: 1200,
        itemType: "service",
        isRecommended: true,
      },
    ],
    visits: [], // Wishlist (unvisited)
  },
];

export default function TabSpotsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  // --------------------------------------------------------------------------
  // STATE HOOKS
  // --------------------------------------------------------------------------
  const [spots, setSpots] = useState<SpotItem[]>(DUMMY_SPOTS);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<
    "all" | "favorites" | "wishlist" | "visited"
  >("all");
  const [selectedCategory, setSelectedCategory] = useState<
    "all" | "food" | "leisure" | "self_care"
  >("all");

  const toggleFavorite = (id: string) => {
    setSpots((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
      )
    );
  };

  // --------------------------------------------------------------------------
  // QUICK-RETURN COLLAPSIBLE BARS ANIMATION
  // --------------------------------------------------------------------------
  const { setIsTabBarHidden } = useTabBar();
  const [headerHeight, setHeaderHeight] = useState(insets.top + 185);
  const prevOffset = useRef(0);
  const isHeaderVisible = useRef(true);
  const headerTranslateY = useRef(new Animated.Value(0)).current;

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const currentOffset = event.nativeEvent.contentOffset.y;
    const diff = currentOffset - prevOffset.current;

    // Near the top: always keep bars visible
    if (currentOffset <= 15) {
      if (!isHeaderVisible.current) {
        isHeaderVisible.current = true;
        setIsTabBarHidden(false);
        Animated.spring(headerTranslateY, {
          toValue: 0,
          bounciness: 0,
          useNativeDriver: true,
        }).start();
      }
      prevOffset.current = currentOffset;
      return;
    }

    // Scrolling DOWN -> Retract top bar upwards & hide tab bar
    if (diff > 10 && currentOffset > 30 && isHeaderVisible.current) {
      isHeaderVisible.current = false;
      setIsTabBarHidden(true);
      Animated.timing(headerTranslateY, {
        toValue: -headerHeight,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }
    // Scrolling UP -> Instantly reveal top bar downwards & show tab bar
    else if (diff < -10 && !isHeaderVisible.current) {
      isHeaderVisible.current = true;
      setIsTabBarHidden(false);
      Animated.timing(headerTranslateY, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }

    prevOffset.current = currentOffset;
  };

  // --------------------------------------------------------------------------
  // FILTERING LOGIC
  // --------------------------------------------------------------------------
  const filteredSpots = useMemo(() => {
    return spots.filter((spot) => {
      if (searchQuery.trim().length > 0) {
        const query = searchQuery.toLowerCase();
        const matchesName = spot.name.toLowerCase().includes(query);
        const matchesAddress = spot.address?.toLowerCase().includes(query);
        const matchesOfferings = spot.offerings.some((o) =>
          o.name.toLowerCase().includes(query)
        );
        if (!matchesName && !matchesAddress && !matchesOfferings) return false;
      }
      if (selectedStatus === "favorites" && !spot.isFavorite) return false;
      if (selectedStatus === "wishlist" && spot.visits.length > 0) return false;
      if (selectedStatus === "visited" && spot.visits.length === 0) return false;
      if (selectedCategory !== "all" && spot.category !== selectedCategory) {
        return false;
      }
      return true;
    });
  }, [spots, searchQuery, selectedStatus, selectedCategory]);

  const totalCount = spots.length;
  const favoritesCount = spots.filter((s) => s.isFavorite).length;
  const wishlistCount = spots.filter((s) => s.visits.length === 0).length;
  const visitedCount = spots.filter((s) => s.visits.length > 0).length;

  const getCategoryConfig = (category: "food" | "leisure" | "self_care") => {
    switch (category) {
      case "food":
        return {
          label: "Food & Cafe",
          color: colors.food,
          bgColor: colors.foodLight,
          icon: "restaurant-outline" as const,
        };
      case "leisure":
        return {
          label: "Leisure & Park",
          color: colors.leisure,
          bgColor: colors.leisureLight,
          icon: "compass-outline" as const,
        };
      case "self_care":
        return {
          label: "Self-Care",
          color: colors.selfCare,
          bgColor: colors.selfCareLight,
          icon: "leaf-outline" as const,
        };
    }
  };

  const bottomClearance = 50 + Math.max(insets.bottom, 8) + 16;

  // --------------------------------------------------------------------------
  // MODERN STREAMLINED THEMED STYLES
  // --------------------------------------------------------------------------
  const styles = useThemedStyles((c, dark) => ({
    screenContainer: {
      flex: 1,
      backgroundColor: c.canvas,
    },
    headerSection: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10,
      paddingHorizontal: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      backgroundColor: dark ? "rgba(12, 10, 9, 0.96)" : "rgba(251, 249, 245, 0.96)",
    },
    screenTitle: {
      fontFamily: FontFamily.serifBold,
      fontSize: 24,
      letterSpacing: -0.4,
      color: c.charcoal,
    },
    screenSubtitle: {
      fontFamily: FontFamily.sansRegular,
      fontSize: 12,
      color: c.muted,
      marginTop: 2,
    },
    addSpotHeaderBtn: {
      backgroundColor: c.copper,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      ...L.shadowSm,
    },
    addSpotHeaderBtnText: {
      fontFamily: FontFamily.sansBold,
      fontSize: 12,
      color: c.primaryText,
    },
    searchBarContainer: {
      backgroundColor: dark ? "rgba(39, 39, 42, 0.6)" : "rgba(255, 255, 255, 0.9)",
      borderColor: c.border,
      borderWidth: 1,
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: Platform.OS === "ios" ? 9 : 6,
      marginBottom: 12,
    },
    searchInput: {
      fontFamily: FontFamily.sansMedium,
      fontSize: 13,
      color: c.charcoal,
      padding: 0,
      ...L.fill,
    },
    statusSegmentRow: {
      gap: 8,
      paddingBottom: 8,
    },
    statusSegmentPill: {
      backgroundColor: c.sandDark,
      borderColor: c.border,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 18,
    },
    statusSegmentPillActive: {
      backgroundColor: c.copper,
      borderColor: c.copper,
      ...L.shadowSm,
    },
    statusSegmentBadge: {
      paddingHorizontal: 5.5,
      paddingVertical: 1,
      borderRadius: 8,
      backgroundColor: c.sandDark,
    },
    categoryChip: {
      paddingHorizontal: 10,
      paddingVertical: 4.5,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: dark ? "rgba(39, 39, 42, 0.7)" : "rgba(255, 255, 255, 0.8)",
    },
    spotCard: {
      backgroundColor: dark ? "rgba(24, 24, 27, 0.95)" : "rgba(255, 255, 255, 0.98)",
      borderColor: c.border,
      borderWidth: 1,
      borderRadius: 18,
      padding: 14,
      ...L.shadowSm,
    },
    categoryBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
    },
    categoryBadgeText: {
      fontFamily: FontFamily.sansBold,
      fontSize: 10,
    },
    statusBadge: {
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 8,
      backgroundColor: c.sandDark,
    },
    statusBadgeWishlist: {
      backgroundColor: dark ? "#2D261A" : "#FEF3C7",
    },
    statusBadgeText: {
      fontFamily: FontFamily.sansSemiBold,
      fontSize: 10,
      color: c.charcoal,
    },
    statusBadgeWishlistText: {
      color: dark ? "#FBBF24" : "#B45309",
    },
    favoriteBtn: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: c.sandDark,
      ...L.center,
    },
    favoriteBtnActive: {
      backgroundColor: dark ? "#3D260A" : "#FEF3C7",
    },
    spotName: {
      fontFamily: FontFamily.serifSemiBold,
      fontSize: 18,
      letterSpacing: -0.2,
      color: c.charcoal,
    },
    addressText: {
      fontFamily: FontFamily.sansRegular,
      fontSize: 11.5,
      color: c.muted,
      ...L.fill,
    },
    notesBox: {
      borderLeftWidth: 3,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 4,
      marginVertical: 8,
      backgroundColor: dark ? "rgba(39, 39, 42, 0.4)" : "rgba(245, 245, 240, 0.7)",
    },
    notesText: {
      fontFamily: FontFamily.serifRegular,
      fontStyle: "italic",
      fontSize: 12,
      lineHeight: 17,
      color: c.charcoal,
    },
    offeringStrip: {
      backgroundColor: c.sandDark,
      borderColor: c.border,
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 6,
      marginBottom: 10,
    },
    offeringIconCircle: {
      width: 16,
      height: 16,
      borderRadius: 8,
      ...L.center,
    },
    offeringTitle: {
      fontFamily: FontFamily.sansSemiBold,
      fontSize: 11.5,
      color: c.charcoal,
    },
    offeringPrice: {
      fontFamily: FontFamily.serifSemiBold,
      fontSize: 12.5,
      color: c.copper,
    },
    metaVisitedText: {
      fontFamily: FontFamily.sansMedium,
      fontSize: 11,
      color: c.subtle,
    },
    metaWishlistText: {
      fontFamily: FontFamily.sansMedium,
      fontSize: 11,
      color: c.leisure,
    },
    cardActionRow: {
      paddingTop: 10,
      borderTopWidth: 0.5,
      borderTopColor: c.border,
    },
    cardActionBtn: {
      backgroundColor: c.sandDark,
      borderColor: c.border,
      borderWidth: 1,
      paddingVertical: 7,
      borderRadius: 10,
      ...L.fill,
    },
    cardActionBtnText: {
      fontFamily: FontFamily.sansSemiBold,
      fontSize: 11,
      color: c.charcoal,
    },
    cardActionBtnPrimary: {
      backgroundColor: c.copper,
      paddingVertical: 7,
      borderRadius: 10,
      ...L.fill,
    },
    cardActionBtnPrimaryText: {
      fontFamily: FontFamily.sansBold,
      fontSize: 11,
      color: c.primaryText,
    },
    listContent: {
      paddingHorizontal: 16,
      gap: 14,
    },
    listHeaderCount: {
      fontFamily: FontFamily.sansBold,
      fontSize: 10,
      letterSpacing: 0.6,
      color: c.muted,
    },
    listHeaderCityTag: {
      fontFamily: FontFamily.sansSemiBold,
      fontSize: 10.5,
      color: c.leisure,
    },
    emptyContainer: {
      paddingVertical: 48,
      paddingHorizontal: 24,
      gap: 10,
      ...L.center,
    },
    emptyIconCircle: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: c.sandDark,
      marginBottom: 6,
      ...L.center,
    },
    emptyTitle: {
      fontFamily: FontFamily.serifSemiBold,
      fontSize: 16,
      color: c.charcoal,
    },
    emptySubtitle: {
      fontFamily: FontFamily.sansRegular,
      fontSize: 12,
      textAlign: "center",
      lineHeight: 18,
      color: c.muted,
    },
    emptyResetBtn: {
      marginTop: 8,
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 14,
      backgroundColor: c.sandDark,
    },
  }));

  // --------------------------------------------------------------------------
  // RENDER SPOT CARD
  // --------------------------------------------------------------------------
  const renderSpotCard = ({ item }: { item: SpotItem }) => {
    const cat = getCategoryConfig(item.category);
    const hasVisited = item.visits.length > 0;
    const lastVisit = hasVisited ? item.visits[0] : null;
    const standout = item.offerings.find((o) => o.isRecommended) || item.offerings[0];

    return (
      <View style={styles.spotCard}>
        {/* Card Header Row */}
        <Row between style={{ marginBottom: 10 }}>
          <Row gap={6}>
            {/* Category Badge */}
            <Row gap={4} style={[styles.categoryBadge, { backgroundColor: cat.bgColor }]}>
              <Ionicons name={cat.icon} size={11} color={cat.color} />
              <Text style={[styles.categoryBadgeText, { color: cat.color }]}>
                {cat.label}
              </Text>
            </Row>

            {/* Visit Status Pill */}
            <View
              style={[
                styles.statusBadge,
                !hasVisited && styles.statusBadgeWishlist,
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  !hasVisited && styles.statusBadgeWishlistText,
                ]}
              >
                {hasVisited ? `Visited (${item.visits.length}x)` : "Wishlist"}
              </Text>
            </View>
          </Row>

          {/* Favorite Star Button */}
          <TouchableOpacity
            onPress={() => toggleFavorite(item.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={[
              styles.favoriteBtn,
              item.isFavorite && styles.favoriteBtnActive,
            ]}
          >
            <Ionicons
              name={item.isFavorite ? "star" : "star-outline"}
              size={14}
              color={item.isFavorite ? colors.leisure : colors.subtle}
            />
          </TouchableOpacity>
        </Row>

        {/* Spot Title & City */}
        <View style={{ marginBottom: 8 }}>
          <Text style={styles.spotName} numberOfLines={1}>
            {item.name}
          </Text>
          <Row gap={5} style={{ marginTop: 2 }}>
            <Octicons name="location" size={11} color={colors.muted} />
            <Text style={styles.addressText} numberOfLines={1}>
              {item.address ? `${item.address} • ` : ""}
              {item.city || "Makati"}
            </Text>
          </Row>
        </View>

        {/* Notes / Vibe (Editorial Quote) */}
        {item.notes ? (
          <View style={[styles.notesBox, { borderLeftColor: cat.color }]}>
            <Text style={styles.notesText} numberOfLines={2}>
              “{item.notes}”
            </Text>
          </View>
        ) : null}

        {/* Standout Offerings Section */}
        {standout ? (
          <Row between style={styles.offeringStrip}>
            <Row gap={6} style={L.fill}>
              <View style={[styles.offeringIconCircle, { backgroundColor: cat.color }]}>
                <Ionicons name="sparkles" size={10} color="#FFFFFF" />
              </View>
              <Text style={styles.offeringTitle} numberOfLines={1}>
                {standout.name}
              </Text>
            </Row>
            <Text style={styles.offeringPrice}>
              {standout.price === 0 ? "Free" : `₱${standout.price}`}
            </Text>
          </Row>
        ) : null}

        {/* Visit & Spend Metadata Row */}
        <View style={{ marginBottom: 12 }}>
          {hasVisited && lastVisit ? (
            <Row gap={5}>
              <Ionicons
                name="checkmark-circle-outline"
                size={13}
                color={colors.food}
              />
              <Text style={styles.metaVisitedText}>
                Last {lastVisit.visitedAt} • Spent{" "}
                <Text
                  style={{
                    fontFamily: FontFamily.sansBold,
                    color: colors.charcoal,
                  }}
                >
                  ₱{lastVisit.amountSpent}
                </Text>
                {lastVisit.rating ? ` • ★ ${lastVisit.rating}` : ""}
              </Text>
            </Row>
          ) : (
            <Row gap={5}>
              <Ionicons
                name="bookmark-outline"
                size={13}
                color={colors.leisure}
              />
              <Text style={styles.metaWishlistText}>
                Saved in Wishlist • Ready to explore
              </Text>
            </Row>
          )}
        </View>

        {/* Bottom Action Buttons */}
        <Row gap={8} style={styles.cardActionRow}>
          <TouchableOpacity
            style={styles.cardActionBtn}
            onPress={() => router.push("/(tabs)")}
          >
            <Row center gap={5}>
              <Ionicons name="compass-outline" size={13} color={colors.charcoal} />
              <Text style={styles.cardActionBtnText}>Map Radar</Text>
            </Row>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cardActionBtnPrimary}
            onPress={() => {
              router.push({
                pathname: "/spot/new",
                params: { address: item.address || "" },
              });
            }}
          >
            <Row center gap={5}>
              <Octicons name="plus" size={12} color={colors.primaryText} />
              <Text style={styles.cardActionBtnPrimaryText}>Log Visit ₱</Text>
            </Row>
          </TouchableOpacity>
        </Row>
      </View>
    );
  };

  return (
    <View style={styles.screenContainer}>
      {/* ------------------------------------------------------------------ */}
      {/* 1. TOP HEADER & SCREEN TITLE */}
      {/* ------------------------------------------------------------------ */}
      <Animated.View
        onLayout={(e) => {
          const h = e.nativeEvent.layout.height;
          if (h > 0) setHeaderHeight(h);
        }}
        style={[
          styles.headerSection,
          {
            paddingTop: insets.top + 14,
            transform: [{ translateY: headerTranslateY }],
          },
        ]}
      >
        <Row between style={{ marginBottom: 12 }}>
          <View>
            <Text style={styles.screenTitle}>Black Book</Text>
            <Text style={styles.screenSubtitle}>
              Curated spots & wishlist in Metro Manila
            </Text>
          </View>

          {/* "+ New Spot" Action */}
          <TouchableOpacity
            style={styles.addSpotHeaderBtn}
            onPress={() => router.push("/spot/new")}
            activeOpacity={0.85}
          >
            <Row center gap={6}>
              <Octicons name="plus" size={13} color={colors.primaryText} />
              <Text style={styles.addSpotHeaderBtnText}>New Spot</Text>
            </Row>
          </TouchableOpacity>
        </Row>

        {/* Search Bar */}
        <Row gap={8} style={styles.searchBarContainer}>
          <Octicons name="search" size={14} color={colors.subtle} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search spots, coffee, dishes, neighborhood..."
            placeholderTextColor={colors.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Octicons name="x" size={14} color={colors.subtle} />
            </TouchableOpacity>
          )}
        </Row>

        {/* 2. Status Segments (All, Favorites, Wishlist, Visited) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[L.row, styles.statusSegmentRow]}
        >
          {[
            { id: "all", label: "All Spots", count: totalCount, icon: null },
            { id: "favorites", label: "Favorites", count: favoritesCount, icon: "star" },
            { id: "wishlist", label: "Wishlist", count: wishlistCount, icon: "bookmark" },
            { id: "visited", label: "Visited", count: visitedCount, icon: "checkmark" },
          ].map((seg) => {
            const isActive = selectedStatus === seg.id;
            return (
              <TouchableOpacity
                key={seg.id}
                style={[
                  styles.statusSegmentPill,
                  isActive && styles.statusSegmentPillActive,
                ]}
                onPress={() => setSelectedStatus(seg.id as any)}
              >
                <Row center gap={6}>
                  {seg.icon === "star" && (
                    <Ionicons
                      name="star"
                      size={12}
                      color={isActive ? colors.primaryText : colors.leisure}
                    />
                  )}
                  {seg.icon === "bookmark" && (
                    <Octicons
                      name="bookmark"
                      size={12}
                      color={isActive ? colors.primaryText : colors.subtle}
                    />
                  )}
                  {seg.icon === "checkmark" && (
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={13}
                      color={isActive ? colors.primaryText : colors.food}
                    />
                  )}
                  <Text
                    style={{
                      fontFamily: FontFamily.sansSemiBold,
                      fontSize: 11.5,
                      color: isActive ? colors.primaryText : colors.charcoal,
                    }}
                  >
                    {seg.label}
                  </Text>
                  <View
                    style={[
                      styles.statusSegmentBadge,
                      isActive && {
                        backgroundColor: isDark ? "#3D3D42" : "#2C2A28",
                      },
                    ]}
                  >
                    <Text
                      style={{
                        fontFamily: FontFamily.sansBold,
                        fontSize: 9.5,
                        color: isActive ? "#FFFFFF" : colors.charcoal,
                      }}
                    >
                      {seg.count}
                    </Text>
                  </View>
                </Row>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* 3. Category Filter Chips */}
        <Row gap={6} style={{ marginTop: 2 }}>
          {[
            { id: "all", label: "All Types" },
            { id: "food", label: "Food & Cafe", color: colors.food },
            { id: "leisure", label: "Leisure", color: colors.leisure },
            { id: "self_care", label: "Self-Care", color: colors.selfCare },
          ].map((cat) => {
            const isCatActive = selectedCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryChip,
                  isCatActive && {
                    backgroundColor: cat.color || colors.charcoal,
                    borderColor: cat.color || colors.charcoal,
                  },
                ]}
                onPress={() => setSelectedCategory(cat.id as any)}
              >
                <Text
                  style={{
                    fontFamily: FontFamily.sansMedium,
                    fontSize: 11,
                    color: isCatActive ? "#FFFFFF" : colors.charcoal,
                  }}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </Row>
      </Animated.View>

      {/* ------------------------------------------------------------------ */}
      {/* 2. SPOTS LIST FEED */}
      {/* ------------------------------------------------------------------ */}
      <FlatList
        data={filteredSpots}
        keyExtractor={(item) => item.id}
        renderItem={renderSpotCard}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: headerHeight + 8,
            paddingBottom: bottomClearance,
          },
        ]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <Row between style={{ marginBottom: 4 }}>
            <Text style={styles.listHeaderCount}>
              SHOWING {filteredSpots.length} OF {spots.length} SPOTS
            </Text>
            <Text style={styles.listHeaderCityTag}>Makati & Poblacion</Text>
          </Row>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Octicons name="inbox" size={32} color={colors.subtle} />
            </View>
            <Text style={styles.emptyTitle}>No spots found</Text>
            <Text style={styles.emptySubtitle}>
              Try adjusting your search query or reset the active filter tags.
            </Text>
            <TouchableOpacity
              style={styles.emptyResetBtn}
              onPress={() => {
                setSearchQuery("");
                setSelectedStatus("all");
                setSelectedCategory("all");
              }}
            >
              <Text
                style={{
                  fontFamily: FontFamily.sansSemiBold,
                  fontSize: 11.5,
                  color: colors.charcoal,
                }}
              >
                Reset Filters
              </Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}
