// Barrel for profile-screen building blocks.
export { StatBlock, type StatBlockProps } from "./StatBlock";
export { SettingsRow, type SettingsRowProps } from "./SettingsRow";
export { EventMiniCard, type MiniEvent } from "./EventMiniCard";
export { ProfileHeaderButtons } from "./ProfileHeaderButtons";
export { useFollow, type FollowEntityType } from "./useFollow";
export {
  loadPrefs,
  saveMode,
  saveEventTheming,
  saveAccent,
  ACCENT_OPTIONS,
  DEFAULT_PREFS,
  type Prefs,
  type ModePref,
} from "./settingsStore";
