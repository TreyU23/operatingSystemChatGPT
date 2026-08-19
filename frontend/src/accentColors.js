export const DEFAULT_ACCENT_COLOR = "#1685FF";

export const ACCENT_PRESETS = [
  { id: "blue", label: "Blue", color: DEFAULT_ACCENT_COLOR },
  { id: "red", label: "Red", color: "#EF4444" },
  { id: "green", label: "Green", color: "#22C55E" },
  { id: "purple", label: "Purple", color: "#A855F7" },
  { id: "black", label: "Black", color: "#000000" },
];

export function normalizeHexColor(value) {
  const candidate = String(value || "").trim();
  if (!/^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(candidate)) {
    throw new Error("Enter a hex color such as #1685FF or #F0A.");
  }

  const digits = candidate.slice(1);
  const expanded = digits.length === 3
    ? digits.split("").map((digit) => `${digit}${digit}`).join("")
    : digits;
  return `#${expanded.toUpperCase()}`;
}

export function accentSoftColor(value, alpha = 0.16) {
  const color = normalizeHexColor(value);
  const channels = [1, 3, 5].map((start) => Number.parseInt(color.slice(start, start + 2), 16));
  return `rgba(${channels.join(", ")}, ${alpha})`;
}

export function effectiveAccentColor(value, darkMode) {
  const color = normalizeHexColor(value);
  return darkMode && color === "#000000" ? "#FFFFFF" : color;
}

export function accentForegroundColor(value) {
  return normalizeHexColor(value) === "#FFFFFF" ? "#000000" : "#FFFFFF";
}

export function readAccentColor(storage, key) {
  try {
    return normalizeHexColor(storage.getItem(key) || DEFAULT_ACCENT_COLOR);
  } catch {
    return DEFAULT_ACCENT_COLOR;
  }
}
