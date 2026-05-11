import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ThemeMode = "system" | "light" | "dark";

export interface AccentColor {
  /** Hue 0-360 */
  h: number;
  /** Saturation 0-100 (%) */
  s: number;
  /** Lightness 0-100 (%) */
  l: number;
}

interface ThemeContextValue {
  mode: ThemeMode;
  resolvedMode: "light" | "dark";
  setMode: (m: ThemeMode) => void;
  accent: AccentColor;
  setAccent: (a: AccentColor) => void;
  highContrast: boolean;
  setHighContrast: (v: boolean) => void;
}

const STORAGE_KEY = "granite.theme.v1";
const DEFAULT_ACCENT: AccentColor = { h: 258, s: 88, l: 66 };

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface PersistedTheme {
  mode: ThemeMode;
  accent: AccentColor;
  highContrast?: boolean;
}

function loadPersisted(): PersistedTheme {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { mode: "system", accent: DEFAULT_ACCENT, highContrast: false };
    const parsed = JSON.parse(raw) as Partial<PersistedTheme>;
    return {
      mode: parsed.mode ?? "system",
      accent: parsed.accent ?? DEFAULT_ACCENT,
      highContrast: parsed.highContrast ?? false,
    };
  } catch {
    return { mode: "system", accent: DEFAULT_ACCENT, highContrast: false };
  }
}

function persistTheme(state: PersistedTheme) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage may be unavailable in private mode */
  }
}

function resolveMode(mode: ThemeMode): "light" | "dark" {
  if (mode === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return mode;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [persisted] = useState(loadPersisted);
  const [mode, setMode] = useState<ThemeMode>(persisted.mode);
  const [accent, setAccentState] = useState<AccentColor>(persisted.accent);
  const [highContrast, setHighContrastState] = useState<boolean>(!!persisted.highContrast);
  const [resolvedMode, setResolvedMode] = useState<"light" | "dark">(() =>
    resolveMode(persisted.mode),
  );

  const setAccent = useCallback((a: AccentColor) => {
    setAccentState(a);
  }, []);

  const setHighContrast = useCallback((v: boolean) => {
    setHighContrastState(v);
  }, []);

  useEffect(() => {
    if (mode !== "system") {
      setResolvedMode(mode);
      return;
    }
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setResolvedMode(mql.matches ? "dark" : "light");
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [mode]);

  useEffect(() => {
    const body = document.body;
    body.classList.toggle("theme-dark", resolvedMode === "dark");
    body.classList.toggle("theme-light", resolvedMode === "light");
  }, [resolvedMode]);

  useEffect(() => {
    document.body.classList.toggle("theme-high-contrast", highContrast);
  }, [highContrast]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--accent-h", String(accent.h));
    root.style.setProperty("--accent-s", `${accent.s}%`);
    root.style.setProperty("--accent-l", `${accent.l}%`);
  }, [accent]);

  useEffect(() => {
    persistTheme({ mode, accent, highContrast });
  }, [mode, accent, highContrast]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      resolvedMode,
      setMode,
      accent,
      setAccent,
      highContrast,
      setHighContrast,
    }),
    [mode, resolvedMode, accent, setAccent, highContrast, setHighContrast],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within <ThemeProvider>");
  return ctx;
}