export const themes = [
  {
    id: "default",
    name: "Uvend Default",
    detail: "Navy sidebar and blue actions",
    sidebar: "#0b1c3d",
    canvas: "#f4f7fb",
    accent: "#2f6bff",
    themeColor: "#0b1c3d",
  },
  {
    id: "night",
    name: "Uvend NightOwl",
    detail: "Dark purple for late work",
    sidebar: "#100b1c",
    canvas: "#140e22",
    accent: "#8b5cf6",
    themeColor: "#100b1c",
  },
  {
    id: "finance",
    name: "Uvend Finance",
    detail: "Green sidebar and cream pages",
    sidebar: "#0f3d32",
    canvas: "#f3f1e8",
    accent: "#1c8f5a",
    themeColor: "#0f3d32",
  },
] as const;

export type ThemeId = (typeof themes)[number]["id"];

export const themeStorageKey = "uvend-theme";
export const themeEvent = "uvend-theme";

export function isThemeId(value: string | null): value is ThemeId {
  return themes.some((theme) => theme.id === value);
}

export function readTheme(): ThemeId {
  if (typeof window === "undefined") {
    return "default";
  }

  try {
    const stored = window.localStorage.getItem(themeStorageKey);
    return isThemeId(stored) ? stored : "default";
  } catch {
    return "default";
  }
}

export function applyTheme(theme: ThemeId) {
  document.documentElement.dataset.theme = theme;
  try {
    window.localStorage.setItem(themeStorageKey, theme);
  } catch {
    // The theme still applies for this page when storage is blocked.
  }
  const color = themes.find((item) => item.id === theme)?.themeColor ?? "#0b1c3d";
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", color);
  window.dispatchEvent(new Event(themeEvent));
}

export function mapStyleForTheme(theme: ThemeId = readTheme()) {
  return theme === "night" ? "standardDark" : "standardLight";
}
