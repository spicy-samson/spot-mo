import Ionicons from "@expo/vector-icons/Ionicons";
import Octicons from "@expo/vector-icons/Octicons";
import * as Crypto from "expo-crypto";
import * as Location from "expo-location";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
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

import { db } from "@/../db/client";
import { offeringsTable, placesTable } from "@/../db/schema";
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

export default function NewSpotModal() {
  const { colors, isDark } = useTheme();
  const params = useLocalSearchParams<{
    lat?: string;
    lng?: string;
    address?: string;
  }>();

  const [name, setName] = useState("");
  const [category, setCategory] = useState<"food" | "leisure" | "self_care">(
    "food",
  );
  const [notes, setNotes] = useState("");
  const [transportMode, setTransportMode] = useState<
    "walk" | "motorcycle" | "car" | "transit"
  >("walk");

  // Payment Methods & Contact state
  const [paymentMethods, setPaymentMethods] = useState<
    ("Cash" | "Gcash" | "QRPH" | "Card")[]
  >(["Cash"]);
  const [contactNumber, setContactNumber] = useState("");
  const [contactPerson, setContactPerson] = useState("");

  // Schedule state (24h "HH:mm")
  const [scheduleOpen, setScheduleOpen] = useState("");
  const [scheduleClose, setScheduleClose] = useState("");

  const handleTimeChange = (
    text: string,
    current: string,
    setter: (val: string) => void,
  ) => {
    const cleaned = text.replace(/[^0-9:]/g, "");
    if (cleaned.length === 2 && !cleaned.includes(":") && text.length > current.length) {
      setter(`${cleaned}:`);
    } else {
      setter(cleaned);
    }
  };

  const togglePaymentMethod = (method: "Cash" | "Gcash" | "QRPH" | "Card") => {
    setPaymentMethods((prev) =>
      prev.includes(method)
        ? prev.filter((m) => m !== method)
        : [...prev, method],
    );
  };

  // Offerings list
  const [offerings, setOfferings] = useState<OfferingDraft[]>([
    {
      id: "1",
      name: "",
      price: "",
      isRecommended: true,
    },
  ]);

  // Location state
  const [locationLoading, setLocationLoading] = useState(true);
  const [coords, setCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [addressText, setAddressText] = useState("Acquiring GPS...");
  const [cityText, setCityText] = useState("");

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (params.lat && params.lng) {
      const lat = parseFloat(params.lat);
      const lng = parseFloat(params.lng);
      setCoords({ latitude: lat, longitude: lng });
      if (params.address) {
        setAddressText(params.address);
      }
      Location.reverseGeocodeAsync({ latitude: lat, longitude: lng })
        .then(([rev]) => {
          if (rev) {
            const city = rev.city || rev.subregion || rev.region || "";
            setCityText(city);
            if (!params.address) {
              const street = rev.street || rev.name || rev.district || "";
              setAddressText(
                street
                  ? (city ? `${street}, ${city}` : street)
                  : (city ? `Selected Pin (${city})` : "Selected Pin"),
              );
            }
          }
        })
        .catch(() => {
          if (!params.address) {
            setAddressText(`Pin (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
          }
        })
        .finally(() => {
          setLocationLoading(false);
        });
    } else {
      fetchCurrentLocation();
    }
  }, [params.lat, params.lng]);

  async function fetchCurrentLocation() {
    try {
      setLocationLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setAddressText("Location permission denied (Manual entry)");
        setLocationLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setCoords({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      // Reverse geocode to get street & city
      const [rev] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      if (rev) {
        const city = rev.city || rev.subregion || rev.region || "";
        const street = rev.street || rev.name || rev.district || "";
        setCityText(city);
        setAddressText(
          street
            ? (city ? `${street}, ${city}` : street)
            : (city ? `Current GPS (${city})` : "Current GPS"),
        );
      } else {
        setAddressText(
          `GPS (${loc.coords.latitude.toFixed(4)}, ${loc.coords.longitude.toFixed(4)})`,
        );
      }
    } catch {
      setAddressText("Unable to fetch GPS. You can still save!");
    } finally {
      setLocationLoading(false);
    }
  }

  const addOffering = () => {
    setOfferings((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        name: "",
        price: "",
        isRecommended: false,
      },
    ]);
  };

  const updateOffering = (
    id: string,
    field: keyof OfferingDraft,
    value: string | boolean,
  ) => {
    setOfferings((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  };

  const removeOffering = (id: string) => {
    if (offerings.length <= 1) return;
    setOfferings((prev) => prev.filter((item) => item.id !== id));
  };

  const calculateTotalPreview = () => {
    return offerings.reduce((sum, item) => {
      const p = parseFloat(item.price);
      return sum + (isNaN(p) ? 0 : p);
    }, 0);
  };

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert("Name Required", "Please enter the place name.");
      return;
    }

    try {
      setSaving(true);
      const placeId = Crypto.randomUUID();

      // 1. Insert place
      await db.insert(placesTable).values({
        id: placeId,
        name: name.trim(),
        category,
        latitude: coords?.latitude ?? null,
        longitude: coords?.longitude ?? null,
        address: addressText,
        city: cityText.trim() || null,
        paymentMethods: paymentMethods.length > 0 ? paymentMethods : ["Cash"],
        scheduleOpen: scheduleOpen.trim() || null,
        scheduleClose: scheduleClose.trim() || null,
        contactNumber: contactNumber.trim() || null,
        contactPerson: contactPerson.trim() || null,
        notes: notes.trim() || null,
        isFavorite: false,
        isArchived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // 2. Insert non-empty offerings
      const validOfferings = offerings.filter((o) => o.name.trim() !== "");
      for (const item of validOfferings) {
        await db.insert(offeringsTable).values({
          id: Crypto.randomUUID(),
          placeId,
          name: item.name.trim(),
          price: parseFloat(item.price) || 0,
          itemType: category === "self_care" ? "service" : "good",
          isRecommended: item.isRecommended,
          notes: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/(tabs)");
      }
    } catch (err: any) {
      Alert.alert(
        "Error Saving Spot",
        err?.message || "Failed to save to database",
      );
    } finally {
      setSaving(false);
    }
  }

  const handleCancel = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)");
    }
  };

  const total = calculateTotalPreview();

  return (
    <KeyboardAvoidingView
      style={[styles.keyboardContainer, { backgroundColor: colors.canvas }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.sheetContainer, { backgroundColor: colors.canvas }]}>
        {/* Drag Handle Indicator */}
        <View style={styles.dragHandleWrapper}>
          <View
            style={[
              styles.dragHandle,
              { backgroundColor: isDark ? "#3F3F46" : "#D1D8D4" },
            ]}
          />
        </View>

        {/* Modal Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            onPress={handleCancel}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={{ flexDirection: "row", alignItems: "center" }}
          >
            <Octicons
              name="x"
              size={17}
              color={colors.charcoal}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.cancelText, { color: colors.charcoal }]}>
              Cancel
            </Text>
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <Text style={[styles.headerTitle, { color: colors.charcoal }]}>
              New Spot
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.caption }]}>
              QUICK PIN
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.saveHeaderButton,
              { backgroundColor: colors.copper },
            ]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.primaryText} />
            ) : (
              <Text
                style={[styles.saveHeaderText, { color: colors.primaryText }]}
              >
                Save Pin
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Scrollable Form Body */}
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* 1. Place Name Field */}
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
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: colors.canvasMuted },
                ]}
              >
                <Octicons name="location" size={16} color={colors.charcoal} />
              </View>
              <TextInput
                style={[styles.largeTextInput, { color: colors.charcoal }]}
                placeholder="e.g., Kanto Freestyle, Cafe Agapita"
                placeholderTextColor={colors.muted}
                value={name}
                onChangeText={setName}
                autoFocus
              />
            </View>
          </View>

          {/* 2. Category Selector */}
          <View style={styles.sectionBlock}>
            <View style={styles.fieldHeaderRow}>
              <Text style={[styles.fieldLabel, { color: colors.muted }]}>
                Category
              </Text>
              <Text style={[styles.fieldHelpText, { color: colors.caption }]}>
                Smart tags auto-fit
              </Text>
            </View>

            <View
              style={[
                styles.segmentedContainer,
                { backgroundColor: colors.canvasMuted },
              ]}
            >
              {/* Food */}
              <TouchableOpacity
                style={[
                  styles.segmentButton,
                  category === "food" && [
                    styles.segmentButtonActive,
                    {
                      backgroundColor: colors.food,
                      borderColor: colors.food,
                    },
                  ],
                ]}
                onPress={() => setCategory("food")}
              >
                <Ionicons
                  name="restaurant-outline"
                  size={16}
                  color={category === "food" ? "#FFFFFF" : colors.food}
                  style={{ marginBottom: 2 }}
                />
                <Text
                  style={[
                    styles.segmentText,
                    category === "food"
                      ? styles.segmentTextActiveWhite
                      : { color: colors.muted },
                  ]}
                >
                  Food
                </Text>
              </TouchableOpacity>

              {/* Leisure */}
              <TouchableOpacity
                style={[
                  styles.segmentButton,
                  category === "leisure" && [
                    styles.segmentButtonActive,
                    {
                      backgroundColor: colors.leisure,
                      borderColor: colors.leisure,
                    },
                  ],
                ]}
                onPress={() => setCategory("leisure")}
              >
                <Ionicons
                  name="compass-outline"
                  size={16}
                  color={category === "leisure" ? "#FFFFFF" : colors.leisure}
                  style={{ marginBottom: 2 }}
                />
                <Text
                  style={[
                    styles.segmentText,
                    category === "leisure"
                      ? styles.segmentTextActiveWhite
                      : { color: colors.muted },
                  ]}
                >
                  Leisure
                </Text>
              </TouchableOpacity>

              {/* Self-care */}
              <TouchableOpacity
                style={[
                  styles.segmentButton,
                  category === "self_care" && [
                    styles.segmentButtonActive,
                    {
                      backgroundColor: colors.selfCare,
                      borderColor: colors.selfCare,
                    },
                  ],
                ]}
                onPress={() => setCategory("self_care")}
              >
                <Ionicons
                  name="leaf-outline"
                  size={16}
                  color={category === "self_care" ? "#FFFFFF" : colors.selfCare}
                  style={{ marginBottom: 2 }}
                />
                <Text
                  style={[
                    styles.segmentText,
                    category === "self_care"
                      ? styles.segmentTextActiveWhite
                      : { color: colors.muted },
                  ]}
                >
                  Self-care
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 3. Location Card */}
          <View style={styles.sectionBlock}>
            <Text style={[styles.fieldLabel, { color: colors.muted }]}>
              Location
            </Text>
            <View
              style={[
                styles.locationCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.locationInfoLeft}>
                <View
                  style={[
                    styles.gpsActiveCircle,
                    { backgroundColor: colors.mossLight },
                  ]}
                >
                  <Octicons name="check" size={14} color={colors.moss} />
                </View>
                <View style={styles.locationTextColumn}>
                  <Text
                    style={[styles.locationTitle, { color: colors.charcoal }]}
                    numberOfLines={1}
                  >
                    {addressText}
                  </Text>
                  <Text
                    style={[styles.locationSubtitle, { color: colors.caption }]}
                  >
                    {locationLoading
                      ? "Acquiring GPS fix..."
                      : "Accurate to 8 meters • Local coordinate"}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.locationEditButton,
                  {
                    backgroundColor: colors.canvasMuted,
                    borderColor: colors.border,
                  },
                ]}
                onPress={fetchCurrentLocation}
              >
                <Text
                  style={[styles.locationEditText, { color: colors.charcoal }]}
                >
                  Refresh GPS
                </Text>
              </TouchableOpacity>
            </View>

            {/* City / Municipality (Editable) */}
            <View
              style={[
                styles.cityInputWrapper,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <Octicons name="milestone" size={13} color={colors.muted} />
              <TextInput
                style={[styles.cityInputField, { color: colors.charcoal }]}
                placeholder="City / Municipality (e.g. Dasmariñas, Teresa, Makati)"
                placeholderTextColor={colors.muted}
                value={cityText}
                onChangeText={setCityText}
              />
            </View>
          </View>

          {/* 4. "What's good here?" (Offerings) */}
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
              <View style={styles.rowCentered}>
                <Text style={{ fontSize: 13, marginRight: 4 }}>★</Text>
                <Text
                  style={[styles.sectionHeading, { color: colors.charcoal }]}
                >
                  What's good here?
                </Text>
              </View>
              <Text style={[styles.fieldHelpText, { color: colors.caption }]}>
                {category === "food"
                  ? "Must-order dishes & drinks"
                  : category === "leisure"
                  ? "Must-try activities & highlights"
                  : "Must-try treatments & services"}
              </Text>
            </View>

            {offerings.map((item, index) => (
              <View key={item.id} style={styles.offeringRow}>
                {/* Offering Name */}
                <View
                  style={[
                    styles.offeringNameWrapper,
                    {
                      backgroundColor: colors.canvasMuted,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <TextInput
                    style={[
                      styles.offeringNameInput,
                      { color: colors.charcoal },
                    ]}
                    placeholder={
                      index === 0
                        ? category === "food"
                          ? "e.g. Tapa Special, Cold Brew"
                          : category === "leisure"
                          ? "e.g. Sunset Kayak, Day Pass"
                          : "e.g. Full Body Massage, Facial"
                        : category === "food"
                        ? `Dish #${index + 1}`
                        : category === "leisure"
                        ? `Activity #${index + 1}`
                        : `Service #${index + 1}`
                    }
                    placeholderTextColor={colors.muted}
                    value={item.name}
                    onChangeText={(val) => updateOffering(item.id, "name", val)}
                  />
                </View>

                {/* Offering Price */}
                <View
                  style={[
                    styles.offeringPriceWrapper,
                    {
                      backgroundColor: colors.canvasMuted,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.pesoSign, { color: colors.subtle }]}>
                    ₱
                  </Text>
                  <TextInput
                    style={[
                      styles.offeringPriceInput,
                      { color: colors.charcoal },
                    ]}
                    placeholder="160"
                    placeholderTextColor={colors.muted}
                    keyboardType="numeric"
                    value={item.price}
                    onChangeText={(val) =>
                      updateOffering(item.id, "price", val)
                    }
                  />
                </View>

                {/* Favorite Star Toggle */}
                <TouchableOpacity
                  style={[
                    styles.starToggle,
                    {
                      backgroundColor: colors.canvasMuted,
                      borderColor: colors.border,
                    },
                    item.isRecommended && {
                      backgroundColor: colors.leisureLight,
                      borderColor: colors.leisure,
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
                  <Text
                    style={[
                      styles.starIcon,
                      {
                        color: item.isRecommended
                          ? colors.leisure
                          : colors.muted,
                      },
                    ]}
                  >
                    ★
                  </Text>
                </TouchableOpacity>

                {/* Delete button if more than 1 item */}
                {offerings.length > 1 && (
                  <TouchableOpacity
                    onPress={() => removeOffering(item.id)}
                    style={styles.removeRowButton}
                  >
                    <Octicons name="x" size={14} color={colors.muted} />
                  </TouchableOpacity>
                )}
              </View>
            ))}

            {/* + Add Another Recommendation */}
            <TouchableOpacity
              style={styles.addOfferingButton}
              onPress={addOffering}
            >
              <Octicons name="plus" size={14} color={colors.leisure} />
              <Text style={[styles.addOfferingText, { color: colors.leisure }]}>
                + Add {category === "food" ? "Dish" : category === "leisure" ? "Activity" : "Service"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* 4. Schedule / Operating Hours */}
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
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
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

            {/* Side-by-side Open & Close inputs */}
            <View style={styles.scheduleRow}>
              {/* Opens At */}
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

              {/* Arrow separator */}
              <View style={styles.scheduleDivider}>
                <Ionicons
                  name="arrow-forward"
                  size={14}
                  color={colors.muted}
                />
              </View>

              {/* Closes At */}
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

            {/* Quick Presets */}
            <View style={styles.schedulePresetsRow}>
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
                      styles.schedulePresetChip,
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
                        styles.schedulePresetText,
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

          {/* 5. Payment Methods section (2x2 Checkbox Grid) */}
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
                      styles.paymentCheckboxCard,
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
                      size={18}
                      color={isChecked ? colors.copper : colors.muted}
                      style={{ marginRight: 8 }}
                    />
                    <Ionicons
                      name={item.icon}
                      size={16}
                      color={isChecked ? colors.charcoal : colors.subtle}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={[
                        styles.paymentCheckboxLabel,
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

          {/* 5. Contact Details (Person & Number) */}
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
                Contact Information
              </Text>
              <Text style={[styles.optionalText, { color: colors.caption }]}>
                Optional
              </Text>
            </View>

            <View style={styles.inputWithIconRow}>
              <Ionicons
                name="person-outline"
                size={16}
                color={colors.muted}
                style={{ marginLeft: 4 }}
              />
              <TextInput
                style={[styles.noteInput, { color: colors.charcoal }]}
                placeholder="Contact person (e.g., Manager, Barista Marc)"
                placeholderTextColor={colors.muted}
                value={contactPerson}
                onChangeText={setContactPerson}
              />
            </View>

            <View
              style={[styles.contactDivider, { backgroundColor: colors.border }]}
            />

            <View style={styles.inputWithIconRow}>
              <Ionicons
                name="call-outline"
                size={16}
                color={colors.muted}
                style={{ marginLeft: 4 }}
              />
              <TextInput
                style={[styles.noteInput, { color: colors.charcoal }]}
                placeholder="Contact number (e.g., 0917-123-4567)"
                placeholderTextColor={colors.muted}
                value={contactNumber}
                onChangeText={setContactNumber}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* 6. Quick Note Field */}
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
                Quick Note
              </Text>
              <Text style={[styles.optionalText, { color: colors.caption }]}>
                Optional
              </Text>
            </View>

            <View style={styles.inputWithIconRow}>
              <Octicons
                name="pencil"
                size={14}
                color={colors.muted}
                style={{ marginLeft: 4 }}
              />
              <TextInput
                style={[styles.noteInput, { color: colors.charcoal }]}
                placeholder="Notes (e.g., cash only, seats fill by 12pm)"
                placeholderTextColor={colors.muted}
                value={notes}
                onChangeText={setNotes}
              />
            </View>
          </View>

          {/* 6. "How did you get here?" (Transport Pills) */}
          <View style={styles.sectionBlock}>
            <View style={styles.fieldHeaderRow}>
              <Text style={[styles.fieldLabel, { color: colors.muted }]}>
                How did you get here?
              </Text>
              <Text style={[styles.fieldHelpText, { color: colors.caption }]}>
                Calculates commute radar
              </Text>
            </View>

            <View style={styles.transportChipsRow}>
              {[
                { key: "walk", label: "Walk", icon: "walk-outline" as const },
                {
                  key: "motorcycle",
                  label: "Moto / Angkas",
                  icon: "bicycle-outline" as const,
                },
                {
                  key: "car",
                  label: "Car / Grab",
                  icon: "car-outline" as const,
                },
                {
                  key: "transit",
                  label: "Transit",
                  icon: "bus-outline" as const,
                },
              ].map((t) => {
                const isSelected = transportMode === t.key;
                return (
                  <TouchableOpacity
                    key={t.key}
                    style={[
                      styles.transportChip,
                      {
                        backgroundColor: isSelected
                          ? colors.copper
                          : colors.card,
                        borderColor: isSelected ? colors.copper : colors.border,
                      },
                    ]}
                    onPress={() => setTransportMode(t.key as any)}
                  >
                    <Ionicons
                      name={t.icon}
                      size={14}
                      color={isSelected ? colors.primaryText : colors.subtle}
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      style={[
                        styles.transportLabel,
                        {
                          color: isSelected
                            ? colors.primaryText
                            : colors.charcoal,
                          fontWeight: isSelected ? "600" : "500",
                        },
                      ]}
                    >
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* 7. Bottom Action Button */}
          <View style={styles.bottomCtaSection}>
            <TouchableOpacity
              style={[
                styles.primarySaveButton,
                {
                  backgroundColor: colors.copper,
                  shadowColor: colors.copper,
                },
              ]}
              onPress={handleSave}
              disabled={saving}
            >
              <Octicons name="bookmark" size={16} color={colors.primaryText} />
              <Text
                style={[
                  styles.primarySaveButtonText,
                  { color: colors.primaryText },
                ]}
              >
                {saving
                  ? "Saving..."
                  : `Save Spot ${total > 0 ? `& Log (₱${total})` : ""}`}
              </Text>
            </TouchableOpacity>

            <Text style={[styles.bottomSyncHint, { color: colors.caption }]}>
              Syncs directly to your Daily Budget & Nearby Places radar
            </Text>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: Colors.canvas,
  },
  sheetContainer: {
    flex: 1,
    backgroundColor: Colors.canvas,
  },
  dragHandleWrapper: {
    width: "100%",
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 4,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D8D4",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  cancelText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 15,
    color: Colors.copper,
  },
  headerTitleContainer: {
    alignItems: "center",
  },
  headerTitle: {
    fontFamily: FontFamily.serifSemiBold,
    fontSize: 17,
    letterSpacing: -0.2,
    color: Colors.charcoal,
  },
  headerSubtitle: {
    fontFamily: FontFamily.sansBold,
    fontSize: 10,
    color: Colors.caption,
    letterSpacing: 0.8,
    marginTop: 2,
  },
  saveHeaderButton: {
    backgroundColor: Colors.terracotta,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  saveHeaderText: {
    fontFamily: FontFamily.sansBold,
    color: "#FFFFFF",
    fontSize: 13,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  cardSection: {
    backgroundColor: Colors.card,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
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
    color: Colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  fieldHelpText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 11,
    color: Colors.caption,
  },
  optionalText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 10,
    color: Colors.caption,
    textTransform: "uppercase",
  },
  requiredBadge: {
    backgroundColor: Colors.terracottaLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: `${Colors.terracotta}25`,
  },
  requiredBadgeText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 10,
    color: Colors.terracotta,
    textTransform: "uppercase",
  },
  inputWithIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.canvasMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  largeTextInput: {
    flex: 1,
    fontFamily: FontFamily.serifSemiBold,
    fontSize: 17,
    letterSpacing: -0.2,
    color: Colors.charcoal,
  },
  segmentedContainer: {
    flexDirection: "row",
    backgroundColor: Colors.canvasMuted,
    padding: 4,
    borderRadius: 16,
    gap: 6,
  },
  segmentButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  segmentButtonActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryEmoji: {
    fontSize: 14,
  },
  segmentText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 12.5,
    color: Colors.muted,
  },
  segmentTextActive: {
    fontFamily: FontFamily.sansBold,
    color: Colors.charcoal,
  },
  segmentTextActiveWhite: {
    fontFamily: FontFamily.sansBold,
    color: "#FFFFFF",
  },
  locationCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  locationInfoLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  gpsActiveCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.mossLight,
    alignItems: "center",
    justifyContent: "center",
  },
  locationTextColumn: {
    flex: 1,
  },
  locationTitle: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 13.5,
    color: Colors.charcoal,
  },
  locationSubtitle: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 11,
    color: Colors.caption,
    marginTop: 1,
  },
  locationEditButton: {
    backgroundColor: Colors.canvasMuted,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    marginLeft: 8,
  },
  locationEditText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 11.5,
    color: Colors.charcoal,
  },
  cityInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
  },
  cityInputField: {
    flex: 1,
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    padding: 0,
  },
  rowCentered: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionHeading: {
    fontFamily: FontFamily.serifSemiBold,
    fontSize: 14,
    letterSpacing: -0.1,
    color: Colors.charcoal,
  },
  offeringRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  offeringNameWrapper: {
    flex: 1,
    backgroundColor: Colors.canvas,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  offeringNameInput: {
    fontFamily: FontFamily.serifMedium,
    fontSize: 13.5,
    color: Colors.charcoal,
  },
  offeringPriceWrapper: {
    width: 84,
    backgroundColor: Colors.canvas,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: "row",
    alignItems: "center",
  },
  pesoSign: {
    fontFamily: FontFamily.sansBold,
    fontSize: 12.5,
    color: "#78716C",
    marginRight: 2,
  },
  offeringPriceInput: {
    flex: 1,
    fontFamily: FontFamily.sansBold,
    fontSize: 13.5,
    color: Colors.charcoal,
  },
  starToggle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#F5F5F4",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  starToggleActive: {
    backgroundColor: Colors.terracottaLight,
    borderColor: `${Colors.terracotta}40`,
  },
  starIcon: {
    fontSize: 16,
    color: "#A8A29E",
  },
  starIconActive: {
    color: Colors.terracotta,
  },
  removeRowButton: {
    padding: 6,
  },
  addOfferingButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },
  addOfferingText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 12,
    color: Colors.terracotta,
  },
  noteInput: {
    flex: 1,
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    color: Colors.charcoal,
    paddingVertical: 4,
  },
  scheduleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  scheduleTimeBox: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  scheduleTimeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 4,
  },
  scheduleTimeLabel: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 10.5,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  scheduleTimeInput: {
    fontFamily: FontFamily.sansBold,
    fontSize: 15,
    paddingVertical: 2,
  },
  scheduleDivider: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  schedulePresetsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
  },
  schedulePresetChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  schedulePresetText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 11.5,
  },
  paymentGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10,
  },
  paymentCheckboxCard: {
    width: "48.5%",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  paymentCheckboxLabel: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 13,
  },
  contactDivider: {
    height: 1,
    marginVertical: 10,
    marginLeft: 26,
  },
  transportChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  transportChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 6,
  },
  transportChipSelected: {
    backgroundColor: Colors.terracotta,
    borderColor: Colors.terracotta,
  },
  transportIcon: {
    fontSize: 13,
  },
  transportLabel: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 12,
    color: Colors.charcoal,
  },
  transportLabelSelected: {
    fontFamily: FontFamily.sansBold,
    color: "#FFFFFF",
  },
  bottomCtaSection: {
    marginTop: 4,
    gap: 8,
  },
  primarySaveButton: {
    backgroundColor: Colors.terracotta,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
    shadowColor: Colors.terracotta,
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  primarySaveButtonText: {
    fontFamily: FontFamily.sansBold,
    color: "#FFFFFF",
    fontSize: 14.5,
  },
  bottomSyncHint: {
    textAlign: "center",
    fontFamily: FontFamily.sansMedium,
    fontSize: 11,
    color: Colors.caption,
  },
});
