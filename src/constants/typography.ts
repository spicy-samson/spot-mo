/**
 * Typography System for Spot Mo
 * Pairing: Lora (Editorial Literary Serif) + Inter (Crisp Modern Sans)
 */

export const FontFamily = {
  // Editorial Serif (Lora)
  serifRegular: "Lora_400Regular",
  serifMedium: "Lora_500Medium",
  serifSemiBold: "Lora_600SemiBold",
  serifBold: "Lora_700Bold",
  serifItalic: "Lora_400Regular_Italic",

  // Modern Grotesque Sans (Inter)
  sansRegular: "Inter_400Regular",
  sansMedium: "Inter_500Medium",
  sansSemiBold: "Inter_600SemiBold",
  sansBold: "Inter_700Bold",
} as const;

export const Typography = {
  fontFamily: FontFamily,

  // Editorial Preset Styles
  greetingTitle: {
    fontFamily: FontFamily.serifSemiBold,
    fontSize: 12.5,
    letterSpacing: -0.2,
  },
  greetingSubtext: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 9.5,
  },
  spotTitle: {
    fontFamily: FontFamily.serifSemiBold,
    fontSize: 18,
    letterSpacing: -0.2,
  },
  spotTitleModal: {
    fontFamily: FontFamily.serifSemiBold,
    fontSize: 22,
    letterSpacing: -0.3,
  },
  dishHighlight: {
    fontFamily: FontFamily.serifItalic,
    fontSize: 13,
  },
  priceTag: {
    fontFamily: FontFamily.sansBold,
    fontSize: 12.5,
    letterSpacing: 0.1,
  },
  filterPill: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 11,
    letterSpacing: 0.2,
  },
  categoryBadge: {
    fontFamily: FontFamily.sansBold,
    fontSize: 10,
    letterSpacing: 0.4,
  },
  markerName: {
    fontFamily: FontFamily.sansBold,
    fontSize: 11,
  },
  sectionTitle: {
    fontFamily: FontFamily.serifSemiBold,
    fontSize: 15,
    letterSpacing: -0.1,
  },
  budgetHeadline: {
    fontFamily: FontFamily.serifSemiBold,
    fontSize: 14,
    letterSpacing: -0.1,
  },
  budgetSubtext: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 12,
  },
  body: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
  },
} as const;

