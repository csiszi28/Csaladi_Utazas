export const BRAND = {
  shortName: "F.A.M.",
  fullName: "Family Adventure Manager",
  taglineHu: "Családi Utazástervező",
  description: "Családi utazások tervezése és követése",
  themeColor: "#1a365d",
  accentColor: "#ffb866",
} as const;

export const BRAND_TITLE_DEFAULT = BRAND.shortName;
export const BRAND_TITLE_TEMPLATE = `%s · ${BRAND.shortName}`;
