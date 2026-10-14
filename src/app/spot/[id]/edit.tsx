import Ionicons from "@expo/vector-icons/Ionicons";
import Octicons from "@expo/vector-icons/Octicons";
import * as Crypto from "expo-crypto";
import * as Location from "expo-location";
import { eq } from "drizzle-orm";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT, Region } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { db } from "@/../db/client";
import {
  offeringsTable,
  placesTable,
} from "@/../db/schema";
import { Colors, FontFamily, useTheme } from "@/constants/theme";

interface OfferingDraft {
  id: string;
  name: string;
  price: string;
  isRecommended: boolean;
}

const PAYMENT_OPTIONS = [
  { key: "Cash" as const, label: "Cash", icon: "cash-outline" as const },
  { key: "Gcash" as const, label: "GCash", icon: "wallet-outline" as const },
  { key: "QRPH" as const, label: "QRPH", icon: "qr-code-outline" as const },
  { key: "Card" as const, label: "Card", icon: "card-outline" as const },
];

export default function EditSpotScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  const mapRef = useRef<MapView>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [category, setCategory] = useState<"food" | "leisure" | "self_care">(
    "food",
  );
  const [notes, setNotes] = useState("");

  // Map & Pin location state
  const [coords, setCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [addressText, setAddressText] = useState("");
  const [cityText, setCityText] = useState("");
  const [geocoding, setGeocoding] = useState(false);

  // Schedule state
  const [scheduleOpen, setScheduleOpen] = useState("");
  const [scheduleClose, setScheduleClose] = useState("");

  // Payment methods state
  const [paymentMethods, setPaymentMethods] = useState<
    ("Cash" | "Gcash" | "QRPH" | "Card")[]
  >(["Cash"]);

  // Contact state
  const [contactNumber, setContactNumber] = useState("");
  const [contactPerson, setContactPerson] = useState("");

  // Offerings list
  const [offerings, setOfferings] = useState<OfferingDraft[]>([]);

  // 1. Load initial spot data
  useEffect(() => {
    async function fetchSpot() {
      if (!id) return;
      try {
        const [p] = await db
          .select()
          .from(placesTable)
          .where(eq(placesTable.id, id));

        if (p) {
          setName(p.name);
          setCategory(p.category as any);
          setNotes(p.notes || "");
          setAddressText(p.address || "");
          setCityText(p.city || "Makati");
          setScheduleOpen(p.scheduleOpen || "");
          setScheduleClose(p.scheduleClose || "");
          setPaymentMethods(
            (p.paymentMethods as any) || ["Cash"],
          );
          setContactNumber(p.contactNumber || "");
          setContactPerson(p.contactPerson || "");

          if (p.latitude && p.longitude) {
            setCoords({ latitude: p.latitude, longitude: p.longitude });
          }

          // Fetch offerings
          const offs = await db
            .select()
            .from(offeringsTable)
            .where(eq(offeringsTable.placeId, id));

          if (offs.length > 0) {
            setOfferings(
              offs.map((o) => ({
                id: o.id,
                name: o.name,
                price: o.price.toString(),
                isRecommended: o.isRecommended,
              })),
            );
          } else {
            setOfferings([
              {
                id: Crypto.randomUUID(),
                name: "",
                price: "",
                isRecommended: true,
              },
            ]);
          }
        }
      } catch (err) {
        console.warn("Failed to load spot for edit:", err);
        Alert.alert("Error", "Could not load spot details.");
      } finally {
        setLoading(false);
      }
    }

    fetchSpot();
  }, [id]);

  // 2. Handle interactive pin relocation
  const handlePinRelocation = async (newCoord: {
    latitude: number;
    longitude: number;
  }) => {
    setCoords(newCoord);
    mapRef.current?.animateToRegion(
      {
        latitude: newCoord.latitude,
        longitude: newCoord.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      },
      400,
    );

    // Auto reverse-geocode new pin coordinates
    try {
      setGeocoding(true);
      const [rev] = await Location.reverseGeocodeAsync({
        latitude: newCoord.latitude,
        longitude: newCoord.longitude,
      });

      if (rev) {
        const city = rev.city || rev.subregion || rev.region || cityText;
        setCityText(city);
        const street = rev.street || rev.name || rev.district || "";
        if (street) {
          setAddressText(`${street}, ${city}`);
        }
      }
    } catch {
      // Fallback: keep previous or numeric coordinates
    } finally {
      setGeocoding(false);
    }
  };

  // 3. Snap to Live GPS
  const handleSnapToLiveGPS = async () => {
    try {
      setGeocoding(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Location access is required to snap to your live GPS.",
        );
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const newPos = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };
      await handlePinRelocation(newPos);
    } catch (err: any) {
      Alert.alert("GPS Error", err?.message || "Failed to acquire location.");
    } finally {
      setGeocoding(false);
    }
  };

  // Time change with auto-colon
  const handleTimeChange = (
    text: string,
    current: string,
    setter: (val: string) => void,
  ) => {
    const cleaned = text.replace(/[^0-9:]/g, "");
    if (
      cleaned.length === 2 &&
      !cleaned.includes(":") &&
      text.length > current.length
    ) {
      setter(`${cleaned}:`);
    } else {
      setter(cleaned);
    }
  };

  const togglePaymentMethod = (
    method: "Cash" | "Gcash" | "QRPH" | "Card",
  ) => {
    setPaymentMethods((prev) =>
      prev.includes(method)
        ? prev.filter((m) => m !== method)
        : [...prev, method],
    );
  };

  // Offerings helpers
  const addOffering = () => {
    setOfferings((prev) => [
      ...prev,
      {
        id: Crypto.randomUUID(),
        name: "",
        price: "",
        isRecommended: false,
      },
    ]);
  };

  const updateOffering = (
    idToUpdate: string,
    field: keyof OfferingDraft,
    val: any,
  ) => {
    setOfferings((prev) =>
      prev.map((o) => (o.id === idToUpdate ? { ...o, [field]: val } : o)),
    );
  };

  const removeOffering = (idToRemove: string) => {
    setOfferings((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((o) => o.id !== idToRemove);
    });
  };

  // 4. Save Changes to Database
  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Name Required", "Please enter the place name.");
      return;
    }
    if (!id) return;

    try {
      setSaving(true);

      // A. Update place record
      await db
        .update(placesTable)
        .set({
          name: name.trim(),
          category,
          latitude: coords?.latitude ?? null,
          longitude: coords?.longitude ?? null,
          address: addressText.trim() || null,
          city: cityText.trim() || "Makati",
          scheduleOpen: scheduleOpen.trim() || null,
          scheduleClose: scheduleClose.trim() || null,
          paymentMethods:
            paymentMethods.length > 0 ? paymentMethods : ["Cash"],
          contactNumber: contactNumber.trim() || null,
          contactPerson: contactPerson.trim() || null,
          notes: notes.trim() || null,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(placesTable.id, id));

      // B. Sync offerings (delete old offerings for this place, re-insert valid rows)
      await db
        .delete(offeringsTable)
        .where(eq(offeringsTable.placeId, id));

      const validOfferings = offerings.filter((o) => o.name.trim() !== "");
      for (const item of validOfferings) {
        await db.insert(offeringsTable).values({
          id: Crypto.randomUUID(),
          placeId: id,
          name: item.name.trim(),
          price: parseFloat(item.price) || 0,
          itemType: category === "self_care" ? "service" : "good",
          isRecommended: item.isRecommended,
          notes: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      router.back();
    } catch (err: any) {
      console.warn("Failed to update spot:", err);
      Alert.alert("Save Error", err?.message || "Failed to update spot.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View
        style={[
          styles.loadingCenter,
          { backgroundColor: colors.canvas, paddingTop: insets.top },
        ]}
      >
        <ActivityIndicator size="large" color={colors.copper} />
        <Text style={[styles.loadingHint, { color: colors.muted }]}>
          Loading spot for editing...
        </Text>
      </View>
    );
  }

  const initialRegion: Region = {
    latitude: coords?.latitude || 14.5547,
    longitude: coords?.longitude || 121.0244,
    latitudeDelta: 0.008,
    longitudeDelta: 0.008,
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.canvas }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* 1. MODAL HEADER */}
      <View
        style={[
          styles.headerBar,
          {
            paddingTop: insets.top + 8,
            backgroundColor: isDark
              ? "rgba(18, 18, 20, 0.96)"
              : "rgba(251, 249, 245, 0.96)",
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.cancelBtn}
        >
          <Octicons name="x" size={17} color={colors.charcoal} />
          <Text style={[styles.cancelText, { color: colors.charcoal }]}>
            Cancel
          </Text>
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: colors.charcoal }]}>
            Edit Spot
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.caption }]}>
            UPDATE PIN & DETAILS
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.saveHeaderBtn, { backgroundColor: colors.copper }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.primaryText} />
          ) : (
            <Text
              style={[styles.saveHeaderText, { color: colors.primaryText }]}
            >
              Save
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* 2. FORM BODY */}
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 40 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* A. PLACE NAME */}
        <View
          style={[
            styles.cardSection,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.fieldHeaderRow}>
            <Text style={[styles.fieldLabel, { color: colors.muted }]}>
              Place Name
            </Text>
            <View
              style={[
                styles.requiredBadge,
                {
                  backgroundColor: colors.leisureLight,
                  borderColor: `${colors.leisure}30`,
                },
              ]}
            >
              <Text
                style={[styles.requiredBadgeText, { color: colors.leisure }]}
              >
                Required
              </Text>
            </View>
          </View>

          <View style={styles.inputWithIconRow}>
            <Octicons name="pencil" size={16} color={colors.muted} />
            <TextInput
              style={[styles.nameInput, { color: colors.charcoal }]}
              placeholder="e.g., Yardstick Coffee, Commune"
              placeholderTextColor={colors.muted}
              value={name}
              onChangeText={setName}
            />
          </View>
        </View>

        {/* B. CATEGORY SELECTOR */}
        <View style={styles.sectionBlock}>
          <Text style={[styles.fieldLabel, { color: colors.muted }]}>
            Category
          </Text>
          <View
            style={[
              styles.segmentedContainer,
              { backgroundColor: colors.sandDark },
            ]}
          >
            {[
              { key: "food" as const, label: "Food & Cafe", emoji: "☕" },
              { key: "leisure" as const, label: "Leisure", emoji: "🌿" },
              { key: "self_care" as const, label: "Self-Care", emoji: "✨" },
            ].map((cat) => {
              const isActive = category === cat.key;
              return (
                <TouchableOpacity
                  key={cat.key}
                  style={[
                    styles.segmentButton,
                    isActive && [
                      styles.segmentButtonActive,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                      },
                    ],
                  ]}
                  onPress={() => setCategory(cat.key)}
                >
                  <Text style={{ fontSize: 13 }}>{cat.emoji}</Text>
                  <Text
                    style={[
                      styles.segmentText,
                      isActive
                        ? [
                            styles.segmentTextActive,
                            { color: colors.charcoal },
                          ]
                        : { color: colors.muted },
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* C. EDIT PIN LOCATION & INTERACTIVE MAP */}
        <View
          style={[
            styles.cardSection,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.fieldHeaderRow}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <Octicons name="location" size={14} color={colors.charcoal} />
              <Text style={[styles.fieldLabel, { color: colors.muted }]}>
                Pin Location (Tap or Drag Map)
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleSnapToLiveGPS}
              disabled={geocoding}
            >
              <Text
                style={[styles.snapGpsLink, { color: colors.copper }]}
              >
                {geocoding ? "Locating..." : "🎯 Snap to GPS"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Interactive MapView */}
          <View style={styles.mapContainer}>
            <MapView
              ref={mapRef}
              provider={PROVIDER_DEFAULT}
              style={styles.editMap}
              initialRegion={initialRegion}
              onPress={(e) => handlePinRelocation(e.nativeEvent.coordinate)}
            >
              {coords ? (
                <Marker
                  coordinate={coords}
                  draggable
                  onDragEnd={(e) =>
                    handlePinRelocation(e.nativeEvent.coordinate)
                  }
                >
                  <View
                    style={[
                      styles.draggablePin,
                      { backgroundColor: colors.copper },
                    ]}
                  >
                    <Ionicons name="location" size={16} color="#FFFFFF" />
                  </View>
                </Marker>
              ) : null}
            </MapView>
          </View>

          <Text style={[styles.dragPinHint, { color: colors.caption }]}>
            💡 Tap anywhere on the map or drag the pin to reposition this spot.
          </Text>

          {/* Address & City Inputs */}
          <View style={{ marginTop: 10, gap: 8 }}>
            <View
              style={[
                styles.addressInputWrap,
                {
                  backgroundColor: colors.canvas,
                  borderColor: colors.border,
                },
              ]}
            >
              <Octicons name="sign-in" size={13} color={colors.muted} />
              <TextInput
                style={[styles.addressInput, { color: colors.charcoal }]}
                placeholder="Street address (e.g. 106 Esteban St)"
                placeholderTextColor={colors.muted}
                value={addressText}
                onChangeText={setAddressText}
              />
            </View>

            <View
              style={[
                styles.addressInputWrap,
                {
                  backgroundColor: colors.canvas,
                  borderColor: colors.border,
                },
              ]}
            >
              <Octicons name="milestone" size={13} color={colors.muted} />
              <TextInput
                style={[styles.addressInput, { color: colors.charcoal }]}
                placeholder="City / District (e.g. Makati, Poblacion)"
                placeholderTextColor={colors.muted}
                value={cityText}
                onChangeText={setCityText}
              />
            </View>
          </View>
        </View>

        {/* D. OPERATING HOURS */}
        <View
          style={[
            styles.cardSection,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.fieldHeaderRow}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <Ionicons
                name="time-outline"
                size={15}
                color={colors.charcoal}
              />
              <Text style={[styles.fieldLabel, { color: colors.muted }]}>
                Operating Hours
              </Text>
            </View>
            <Text style={[styles.optionalText, { color: colors.caption }]}>
              Optional
            </Text>
          </View>

          <View style={styles.scheduleRow}>
            <View
              style={[
                styles.scheduleTimeBox,
                {
                  backgroundColor: colors.canvas,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.scheduleTimeHeader}>
                <Ionicons name="sunny-outline" size={13} color="#D97706" />
                <Text
                  style={[
                    styles.scheduleTimeLabel,
                    { color: colors.caption },
                  ]}
                >
                  Opens At
                </Text>
              </View>
              <TextInput
                style={[styles.scheduleTimeInput, { color: colors.charcoal }]}
                placeholder="08:00"
                placeholderTextColor={colors.muted}
                value={scheduleOpen}
                onChangeText={(val) =>
                  handleTimeChange(val, scheduleOpen, setScheduleOpen)
                }
                maxLength={5}
                keyboardType="numbers-and-punctuation"
              />
            </View>

            <View style={styles.scheduleDivider}>
              <Ionicons
                name="arrow-forward"
                size={14}
                color={colors.muted}
              />
            </View>

            <View
              style={[
                styles.scheduleTimeBox,
                {
                  backgroundColor: colors.canvas,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.scheduleTimeHeader}>
                <Ionicons name="moon-outline" size={13} color="#4F46E5" />
                <Text
                  style={[
                    styles.scheduleTimeLabel,
                    { color: colors.caption },
                  ]}
                >
                  Closes At
                </Text>
              </View>
              <TextInput
                style={[styles.scheduleTimeInput, { color: colors.charcoal }]}
                placeholder="22:00"
                placeholderTextColor={colors.muted}
                value={scheduleClose}
                onChangeText={(val) =>
                  handleTimeChange(val, scheduleClose, setScheduleClose)
                }
                maxLength={5}
                keyboardType="numbers-and-punctuation"
              />
            </View>
          </View>

          <View style={styles.presetsRow}>
            {[
              { label: "7am – 8pm", open: "07:00", close: "20:00" },
              { label: "8am – 10pm", open: "08:00", close: "22:00" },
              { label: "10am – 10pm", open: "10:00", close: "22:00" },
              { label: "Late (4pm–2am)", open: "16:00", close: "02:00" },
              { label: "24 Hours", open: "00:00", close: "23:59" },
            ].map((p) => {
              const isSelected =
                scheduleOpen === p.open && scheduleClose === p.close;
              return (
                <TouchableOpacity
                  key={p.label}
                  style={[
                    styles.presetChip,
                    {
                      backgroundColor: isSelected
                        ? `${colors.copper}15`
                        : colors.canvas,
                      borderColor: isSelected
                        ? colors.copper
                        : colors.border,
                    },
                  ]}
                  onPress={() => {
                    if (isSelected) {
                      setScheduleOpen("");
                      setScheduleClose("");
                    } else {
                      setScheduleOpen(p.open);
                      setScheduleClose(p.close);
                    }
                  }}
                >
                  <Text
                    style={[
                      styles.presetText,
                      {
                        color: isSelected ? colors.charcoal : colors.subtle,
                        fontWeight: isSelected ? "600" : "400",
                      },
                    ]}
                  >
                    {p.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* E. PAYMENT METHODS (2x2 Grid) */}
        <View
          style={[
            styles.cardSection,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.fieldHeaderRow}>
            <Text style={[styles.fieldLabel, { color: colors.muted }]}>
              Payment Methods
            </Text>
            <Text style={[styles.optionalText, { color: colors.caption }]}>
              Accepted Options
            </Text>
          </View>

          <View style={styles.paymentGrid}>
            {PAYMENT_OPTIONS.map((item) => {
              const isChecked = paymentMethods.includes(item.key);
              return (
                <TouchableOpacity
                  key={item.key}
                  style={[
                    styles.paymentCard,
                    {
                      backgroundColor: isChecked
                        ? isDark
                          ? "#27272A"
                          : "#FAF7F2"
                        : colors.card,
                      borderColor: isChecked ? colors.copper : colors.border,
                    },
                  ]}
                  onPress={() => togglePaymentMethod(item.key)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={isChecked ? "checkbox" : "square-outline"}
                    size={17}
                    color={isChecked ? colors.copper : colors.muted}
                    style={{ marginRight: 7 }}
                  />
                  <Ionicons
                    name={item.icon}
                    size={15}
                    color={isChecked ? colors.charcoal : colors.subtle}
                    style={{ marginRight: 5 }}
                  />
                  <Text
                    style={[
                      styles.paymentLabel,
                      {
                        color: isChecked ? colors.charcoal : colors.muted,
                        fontWeight: isChecked ? "600" : "400",
                      },
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* F. CONTACT DETAILS */}
        <View
          style={[
            styles.cardSection,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.fieldHeaderRow}>
            <Text style={[styles.fieldLabel, { color: colors.muted }]}>
              Contact Details
            </Text>
            <Text style={[styles.optionalText, { color: colors.caption }]}>
              Optional
            </Text>
          </View>

          <View style={styles.inputWithIconRow}>
            <Ionicons
              name="person-outline"
              size={15}
              color={colors.muted}
            />
            <TextInput
              style={[styles.singleLineInput, { color: colors.charcoal }]}
              placeholder="Contact person (e.g. Manager Marc)"
              placeholderTextColor={colors.muted}
              value={contactPerson}
              onChangeText={setContactPerson}
            />
          </View>

          <View
            style={[
              styles.contactDivider,
              { backgroundColor: colors.border },
            ]}
          />

          <View style={styles.inputWithIconRow}>
            <Ionicons
              name="call-outline"
              size={15}
              color={colors.muted}
            />
            <TextInput
              style={[styles.singleLineInput, { color: colors.charcoal }]}
              placeholder="Phone number (e.g. 0917-123-4567)"
              placeholderTextColor={colors.muted}
              value={contactNumber}
              onChangeText={setContactNumber}
              keyboardType="phone-pad"
            />
          </View>
        </View>

        {/* G. QUICK NOTES */}
        <View
          style={[
            styles.cardSection,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.fieldHeaderRow}>
            <Text style={[styles.fieldLabel, { color: colors.muted }]}>
              Quick Note & Vibe
            </Text>
            <Text style={[styles.optionalText, { color: colors.caption }]}>
              Optional
            </Text>
          </View>
          <TextInput
            style={[styles.notesInput, { color: colors.charcoal }]}
            placeholder="Specialty brews, seats fill early, cash tips..."
            placeholderTextColor={colors.muted}
            value={notes}
            onChangeText={setNotes}
            multiline
          />
        </View>

        {/* H. OFFERINGS & DISHES */}
        <View
          style={[
            styles.cardSection,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.fieldHeaderRow}>
            <Text style={[styles.fieldLabel, { color: colors.muted }]}>
              Offerings & Recommendations ({offerings.length})
            </Text>
            <Text style={[styles.optionalText, { color: colors.caption }]}>
              Star = Highlight
            </Text>
          </View>

          {offerings.map((item, idx) => (
            <View key={item.id} style={styles.offeringEditRow}>
              <View
                style={[
                  styles.offeringInputWrap,
                  {
                    backgroundColor: colors.canvas,
                    borderColor: colors.border,
                  },
                ]}
              >
                <TextInput
                  style={[
                    styles.offeringNameInput,
                    { color: colors.charcoal },
                  ]}
                  placeholder={`Dish #${idx + 1}`}
                  placeholderTextColor={colors.muted}
                  value={item.name}
                  onChangeText={(val) =>
                    updateOffering(item.id, "name", val)
                  }
                />
              </View>

              <View
                style={[
                  styles.offeringPriceWrap,
                  {
                    backgroundColor: colors.canvas,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.pesoPrefix, { color: colors.subtle }]}>
                  ₱
                </Text>
                <TextInput
                  style={[
                    styles.offeringPriceInput,
                    { color: colors.charcoal },
                  ]}
                  placeholder="0"
                  placeholderTextColor={colors.muted}
                  value={item.price}
                  onChangeText={(val) =>
                    updateOffering(item.id, "price", val)
                  }
                  keyboardType="numeric"
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.starToggleBtn,
                  item.isRecommended && {
                    backgroundColor: colors.leisureLight,
                    borderColor: `${colors.leisure}50`,
                  },
                ]}
                onPress={() =>
                  updateOffering(
                    item.id,
                    "isRecommended",
                    !item.isRecommended,
                  )
                }
              >
                <Text style={{ fontSize: 14 }}>
                  {item.isRecommended ? "⭐" : "☆"}
                </Text>
              </TouchableOpacity>

              {offerings.length > 1 && (
                <TouchableOpacity
                  onPress={() => removeOffering(item.id)}
                  style={{ padding: 4 }}
                >
                  <Octicons name="x" size={14} color={colors.muted} />
                </TouchableOpacity>
              )}
            </View>
          ))}

          <TouchableOpacity
            style={styles.addOfferingBtn}
            onPress={addOffering}
          >
            <Octicons name="plus" size={13} color={colors.leisure} />
            <Text
              style={[
                styles.addOfferingBtnText,
                { color: colors.leisure },
              ]}
            >
              Add another item
            </Text>
          </TouchableOpacity>
        </View>

        {/* BOTTOM SAVE BUTTON */}
        <TouchableOpacity
          style={[styles.primarySaveBtn, { backgroundColor: colors.copper }]}
          onPress={handleSave}
          disabled={saving}
        >
          <Octicons name="check" size={16} color={colors.primaryText} />
          <Text
            style={[
              styles.primarySaveBtnText,
              { color: colors.primaryText },
            ]}
          >
            {saving ? "Saving Changes..." : "Save Changes"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingHint: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 13,
    marginTop: 10,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  cancelBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  cancelText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 14.5,
  },
  headerTitleWrap: {
    alignItems: "center",
  },
  headerTitle: {
    fontFamily: FontFamily.serifSemiBold,
    fontSize: 16.5,
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontFamily: FontFamily.sansBold,
    fontSize: 9.5,
    letterSpacing: 0.8,
    marginTop: 1,
  },
  saveHeaderBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
  },
  saveHeaderText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 12.5,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },
  cardSection: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },
  sectionBlock: {
    gap: 6,
  },
  fieldHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  fieldLabel: {
    fontFamily: FontFamily.sansBold,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  requiredBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  requiredBadgeText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 9.5,
    textTransform: "uppercase",
  },
  optionalText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 10,
    textTransform: "uppercase",
  },
  inputWithIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  nameInput: {
    flex: 1,
    fontFamily: FontFamily.serifSemiBold,
    fontSize: 16,
    paddingVertical: 3,
  },
  segmentedContainer: {
    flexDirection: "row",
    padding: 4,
    borderRadius: 14,
    gap: 6,
  },
  segmentButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: 11,
    gap: 5,
  },
  segmentButtonActive: {
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  segmentText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 12,
  },
  segmentTextActive: {
    fontFamily: FontFamily.sansBold,
  },
  snapGpsLink: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 11.5,
  },
  mapContainer: {
    borderRadius: 14,
    overflow: "hidden",
    height: 160,
    marginTop: 4,
  },
  editMap: {
    width: "100%",
    height: "100%",
  },
  draggablePin: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  dragPinHint: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 11,
    marginTop: 6,
  },
  addressInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
  },
  addressInput: {
    flex: 1,
    fontFamily: FontFamily.sansRegular,
    fontSize: 12.5,
    padding: 0,
  },
  scheduleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  scheduleTimeBox: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  scheduleTimeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 4,
  },
  scheduleTimeLabel: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 10,
    textTransform: "uppercase",
  },
  scheduleTimeInput: {
    fontFamily: FontFamily.sansBold,
    fontSize: 14.5,
    paddingVertical: 1,
  },
  scheduleDivider: {
    alignItems: "center",
    justifyContent: "center",
  },
  presetsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
  },
  presetChip: {
    paddingHorizontal: 9,
    paddingVertical: 5.5,
    borderRadius: 10,
    borderWidth: 1,
  },
  presetText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 11,
  },
  paymentGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 8,
  },
  paymentCard: {
    width: "48.5%",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 11,
    borderRadius: 12,
    borderWidth: 1,
  },
  paymentLabel: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 12.5,
  },
  singleLineInput: {
    flex: 1,
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    paddingVertical: 3,
  },
  contactDivider: {
    height: 1,
    marginVertical: 8,
    marginLeft: 24,
  },
  notesInput: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    minHeight: 50,
    paddingVertical: 4,
  },
  offeringEditRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  offeringInputWrap: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  offeringNameInput: {
    fontFamily: FontFamily.serifRegular,
    fontSize: 13,
    padding: 0,
  },
  offeringPriceWrap: {
    width: 76,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  pesoPrefix: {
    fontFamily: FontFamily.sansBold,
    fontSize: 12,
    marginRight: 2,
  },
  offeringPriceInput: {
    flex: 1,
    fontFamily: FontFamily.sansBold,
    fontSize: 12.5,
    padding: 0,
  },
  starToggleBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  addOfferingBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 10,
  },
  addOfferingBtnText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 12,
  },
  primarySaveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 6,
  },
  primarySaveBtnText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 14.5,
  },
});

