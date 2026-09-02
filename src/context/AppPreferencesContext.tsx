import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "../lib/supabase";
import {
  fetchPreferencesApi,
  updatePreferencesApi,
  type UserPreferences,
} from "../services/api.js";

export type AppLanguage = "English" | "বাংলা" | "Spanish";
export type AppAppearance = "dark" | "light" | "system";

const STORAGE_KEY = "lumoclip_preferences";

const DEFAULT_PREFERENCES: UserPreferences = {
  email_notifications: true,
  marketing_emails: false,
  language: "English",
  appearance: "dark",
};

const translations: Record<AppLanguage, Record<string, string>> = {
  English: {
    Settings: "Settings",
    Profile: "Profile",
    "Social Accounts": "Social Accounts",
    Preferences: "Preferences",
    Billing: "Billing",
    "Usage History": "Usage History",
    Workspace: "Workspace",
    "Personal information": "Personal information",
    "Connected platforms": "Connected platforms",
    "Customize LumoClip": "Customize LumoClip",
    "Plan & credits": "Plan & credits",
    "Credit activity": "Credit activity",
    Customization: "Customization",
    "All systems operational": "All systems operational",
    Language: "Language",
    Appearance: "Appearance",
    Dark: "Dark",
    Light: "Light",
    System: "System",
    "Email notifications": "Email notifications",
    "Product updates": "Product updates",
    "Danger zone": "Danger zone",
    "Delete account": "Delete account",
    "Account security": "Account security",
  },
  "বাংলা": {
    Settings: "সেটিংস",
    Profile: "প্রোফাইল",
    "Social Accounts": "সোশ্যাল অ্যাকাউন্ট",
    Preferences: "পছন্দসমূহ",
    Billing: "বিলিং",
    "Usage History": "ব্যবহারের ইতিহাস",
    Workspace: "ওয়ার্কস্পেস",
    "Personal information": "ব্যক্তিগত তথ্য",
    "Connected platforms": "সংযুক্ত প্ল্যাটফর্ম",
    "Customize LumoClip": "LumoClip কাস্টমাইজ করুন",
    "Plan & credits": "প্ল্যান ও ক্রেডিট",
    "Credit activity": "ক্রেডিট কার্যক্রম",
    Customization: "কাস্টমাইজেশন",
    "All systems operational": "সব সিস্টেম সচল",
    Language: "ভাষা",
    Appearance: "অ্যাপিয়ারেন্স",
    Dark: "ডার্ক",
    Light: "লাইট",
    System: "সিস্টেম",
    "Email notifications": "ইমেইল নোটিফিকেশন",
    "Product updates": "প্রোডাক্ট আপডেট",
    "Danger zone": "ঝুঁকিপূর্ণ এলাকা",
    "Delete account": "অ্যাকাউন্ট ডিলিট করুন",
    "Account security": "অ্যাকাউন্ট নিরাপত্তা",
  },
  Spanish: {
    Settings: "Configuración",
    Profile: "Perfil",
    "Social Accounts": "Cuentas sociales",
    Preferences: "Preferencias",
    Billing: "Facturación",
    "Usage History": "Historial de uso",
    Workspace: "Espacio de trabajo",
    "Personal information": "Información personal",
    "Connected platforms": "Plataformas conectadas",
    "Customize LumoClip": "Personalizar LumoClip",
    "Plan & credits": "Plan y créditos",
    "Credit activity": "Actividad de créditos",
    Customization: "Personalización",
    "All systems operational": "Todos los sistemas operativos",
    Language: "Idioma",
    Appearance: "Apariencia",
    Dark: "Oscuro",
    Light: "Claro",
    System: "Sistema",
    "Email notifications": "Notificaciones por correo",
    "Product updates": "Actualizaciones del producto",
    "Danger zone": "Zona peligrosa",
    "Delete account": "Eliminar cuenta",
    "Account security": "Seguridad de la cuenta",
  },
};

function normalizeLanguage(value: unknown): AppLanguage {
  if (value === "বাংলা") return "বাংলা";
  if (value === "Spanish") return "Spanish";
  return "English";
}

function normalizeAppearance(value: unknown): AppAppearance {
  if (value === "light") return "light";
  if (value === "system") return "system";
  return "dark";
}

function normalizePreferences(
  value?: Partial<UserPreferences> | null,
): UserPreferences {
  return {
    ...DEFAULT_PREFERENCES,
    ...(value || {}),
    language: normalizeLanguage(value?.language),
    appearance: normalizeAppearance(value?.appearance),
  };
}

function readStoredPreferences(): UserPreferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw
      ? normalizePreferences(JSON.parse(raw))
      : DEFAULT_PREFERENCES;
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function writeStoredPreferences(
  preferences: UserPreferences,
): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(preferences),
    );
  } catch {
    // Ignore storage failures.
  }
}

function systemTheme(): "dark" | "light" {
  if (typeof window === "undefined") return "dark";

  return window.matchMedia(
    "(prefers-color-scheme: dark)",
  ).matches
    ? "dark"
    : "light";
}

interface AppPreferencesContextValue {
  preferences: UserPreferences;
  language: AppLanguage;
  appearance: AppAppearance;
  resolvedTheme: "dark" | "light";
  loading: boolean;
  saving: boolean;
  setLanguage: (language: AppLanguage) => Promise<void>;
  setAppearance: (appearance: AppAppearance) => Promise<void>;
  updatePreference: <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K],
  ) => Promise<void>;
  refreshPreferences: () => Promise<void>;
  t: (key: string) => string;
}

const AppPreferencesContext =
  createContext<AppPreferencesContextValue | null>(null);

export const AppPreferencesProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [preferences, setPreferences] =
    useState<UserPreferences>(readStoredPreferences);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [systemIsDark, setSystemIsDark] = useState(
    () => systemTheme() === "dark",
  );

  const language = normalizeLanguage(preferences.language);
  const appearance = normalizeAppearance(preferences.appearance);
  const resolvedTheme =
    appearance === "system"
      ? systemIsDark
        ? "dark"
        : "light"
      : appearance;

  useEffect(() => {
    let mounted = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setAuthenticated(Boolean(data.session?.user));
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (mounted) {
          setAuthenticated(Boolean(session?.user));
        }
      },
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const media = window.matchMedia(
      "(prefers-color-scheme: dark)",
    );

    const onChange = (event: MediaQueryListEvent) => {
      setSystemIsDark(event.matches);
    };

    setSystemIsDark(media.matches);
    media.addEventListener?.("change", onChange);

    return () => {
      media.removeEventListener?.("change", onChange);
    };
  }, []);

  const refreshPreferences = useCallback(async () => {
    if (!authenticated) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const result = await fetchPreferencesApi();

      if (result?.preferences) {
        const next = normalizePreferences(
          result.preferences,
        );

        setPreferences(next);
        writeStoredPreferences(next);
      }
    } catch (error) {
      console.warn(
        "Failed to load LumoClip preferences:",
        error,
      );
    } finally {
      setLoading(false);
    }
  }, [authenticated]);

  useEffect(() => {
    void refreshPreferences();
  }, [refreshPreferences]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const root = document.documentElement;
    const body = document.body;

    root.dataset.theme = resolvedTheme;
    root.dataset.appearance = appearance;
    root.dataset.language = language;
    root.lang =
      language === "বাংলা"
        ? "bn"
        : language === "Spanish"
          ? "es"
          : "en";
    root.style.colorScheme = resolvedTheme;

    body.dataset.theme = resolvedTheme;
    body.classList.toggle(
      "lumoclip-light",
      resolvedTheme === "light",
    );
    body.classList.toggle(
      "lumoclip-dark",
      resolvedTheme === "dark",
    );
  }, [resolvedTheme, appearance, language]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const id = "lumoclip-preferences-theme";
    let style = document.getElementById(id) as HTMLStyleElement | null;

    if (!style) {
      style = document.createElement("style");
      style.id = id;
      document.head.appendChild(style);
    }

    style.textContent = `
      html, body { min-height: 100%; }
      body { transition: background-color .18s ease, color .18s ease; }

      html[data-theme="light"],
      body[data-theme="light"] {
        background: #f6f7fb;
        color: #18181b;
      }

      html[data-theme="light"] [class~="bg-[#050507]"] {
        background-color: #f6f7fb !important;
      }

      html[data-theme="light"] [class~="bg-zinc-950"] {
        background-color: #ffffff !important;
      }

      html[data-theme="light"] [class~="bg-zinc-950/70"] {
        background-color: rgba(255,255,255,.9) !important;
      }

      html[data-theme="light"] [class~="bg-zinc-900"] {
        background-color: #f1f2f5 !important;
      }

      html[data-theme="light"] [class~="bg-zinc-800"] {
        background-color: #e5e7eb !important;
      }

      html[data-theme="light"] [class~="bg-white/[0.02]"] {
        background-color: rgba(0,0,0,.025) !important;
      }

      html[data-theme="light"] [class~="bg-white/[0.025]"] {
        background-color: rgba(0,0,0,.03) !important;
      }

      html[data-theme="light"] [class~="bg-white/[0.035]"] {
        background-color: rgba(0,0,0,.04) !important;
      }

      html[data-theme="light"] [class~="bg-white/[0.04]"] {
        background-color: rgba(0,0,0,.045) !important;
      }

      html[data-theme="light"] [class~="bg-white/[0.05]"] {
        background-color: rgba(0,0,0,.055) !important;
      }

      html[data-theme="light"] [class~="text-white"] {
        color: #18181b !important;
      }

      html[data-theme="light"] [class~="text-zinc-200"] {
        color: #27272a !important;
      }

      html[data-theme="light"] [class~="text-zinc-300"] {
        color: #3f3f46 !important;
      }

      html[data-theme="light"] [class~="text-zinc-400"] {
        color: #52525b !important;
      }

      html[data-theme="light"] [class~="text-zinc-500"] {
        color: #71717a !important;
      }

      html[data-theme="light"] [class~="text-zinc-600"] {
        color: #71717a !important;
      }

      html[data-theme="light"] [class~="text-zinc-700"] {
        color: #a1a1aa !important;
      }

      html[data-theme="light"] [class~="border-white/[0.05]"] {
        border-color: rgba(0,0,0,.07) !important;
      }

      html[data-theme="light"] [class~="border-white/[0.06]"] {
        border-color: rgba(0,0,0,.08) !important;
      }

      html[data-theme="light"] [class~="border-white/[0.07]"] {
        border-color: rgba(0,0,0,.10) !important;
      }

      html[data-theme="light"] [class~="border-white/[0.08]"] {
        border-color: rgba(0,0,0,.11) !important;
      }

      html[data-theme="light"] input,
      html[data-theme="light"] textarea,
      html[data-theme="light"] select {
        color: #18181b;
      }

      html[data-theme="light"] input::placeholder,
      html[data-theme="light"] textarea::placeholder {
        color: #a1a1aa;
      }

      html[data-theme="light"] [class~="bg-black/20"] {
        background-color: rgba(0,0,0,.04) !important;
      }

      html[data-theme="light"] [class~="bg-black/30"] {
        background-color: rgba(0,0,0,.05) !important;
      }
    `;
  }, []);

  const updatePreference = useCallback(
    async <K extends keyof UserPreferences>(
      key: K,
      value: UserPreferences[K],
    ) => {
      const previous = preferences;

      const next = normalizePreferences({
        ...previous,
        [key]: value,
      });

      setPreferences(next);
      writeStoredPreferences(next);

      try {
        setSaving(true);

        const result = await updatePreferencesApi({
          [key]: value,
        } as Partial<UserPreferences>);

        if (result?.preferences) {
          const server = normalizePreferences(
            result.preferences,
          );

          setPreferences(server);
          writeStoredPreferences(server);
        }
      } catch (error) {
        setPreferences(previous);
        writeStoredPreferences(previous);
        throw error;
      } finally {
        setSaving(false);
      }
    },
    [preferences],
  );

  const setLanguage = useCallback(
    async (value: AppLanguage) => {
      await updatePreference("language", value);
    },
    [updatePreference],
  );

  const setAppearance = useCallback(
    async (value: AppAppearance) => {
      await updatePreference("appearance", value);
    },
    [updatePreference],
  );

  const t = useCallback(
    (key: string) =>
      translations[language]?.[key] ??
      translations.English?.[key] ??
      key,
    [language],
  );

  const value = useMemo(
    () => ({
      preferences,
      language,
      appearance,
      resolvedTheme,
      loading,
      saving,
      setLanguage,
      setAppearance,
      updatePreference,
      refreshPreferences,
      t,
    }),
    [
      preferences,
      language,
      appearance,
      resolvedTheme,
      loading,
      saving,
      setLanguage,
      setAppearance,
      updatePreference,
      refreshPreferences,
      t,
    ],
  );

  return (
    <AppPreferencesContext.Provider value={value}>
      {children}
    </AppPreferencesContext.Provider>
  );
};

export function useAppPreferences(): AppPreferencesContextValue {
  const context = useContext(AppPreferencesContext);

  if (!context) {
    throw new Error(
      "useAppPreferences must be used inside AppPreferencesProvider.",
    );
  }

  return context;
}
