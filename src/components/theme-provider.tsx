import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Theme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_PREFIX = "cs-controller:theme:";
const LAST_USER_KEY = `${STORAGE_PREFIX}last-user`;

function isTheme(value: string | null): value is Theme {
  return value === "light" || value === "dark";
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

export function ThemeProvider({
  children,
  userId,
  authLoading,
}: {
  children: ReactNode;
  userId: string;
  authLoading: boolean;
}) {
  const [theme, setThemeState] = useState<Theme>("light");

  useLayoutEffect(() => {
    if (authLoading) return;

    const storedTheme = userId ? localStorage.getItem(`${STORAGE_PREFIX}${userId}`) : null;
    const nextTheme = isTheme(storedTheme) ? storedTheme : "light";

    setThemeState(nextTheme);
    applyTheme(nextTheme);
    if (userId) localStorage.setItem(LAST_USER_KEY, userId);
  }, [authLoading, userId]);

  const setTheme = useCallback(
    (nextTheme: Theme) => {
      setThemeState(nextTheme);
      applyTheme(nextTheme);
      if (userId) {
        localStorage.setItem(`${STORAGE_PREFIX}${userId}`, nextTheme);
        localStorage.setItem(LAST_USER_KEY, userId);
      }
    },
    [userId],
  );

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [setTheme, theme]);

  const value = useMemo(() => ({ theme, setTheme, toggleTheme }), [setTheme, theme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// O hook e o provider precisam compartilhar a mesma instancia de contexto.
// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
