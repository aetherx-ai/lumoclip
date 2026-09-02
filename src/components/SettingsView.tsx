import React, { useEffect, useMemo, useState } from 'react';
import { User, UsageLog } from '../types.js';
import { supabase } from '../lib/supabase';
import {
  fetchUsageLogs,
  updateProfileApi,
  connectYouTubeApi,
  fetchYouTubeStatusApi,
  disconnectYouTubeApi,
  fetchPreferencesApi,
  updatePreferencesApi,
  checkoutStripeApi,
  exportAccountDataApi,
  generateApiKeyApi,
  deleteAccountApi,
  UserPreferences,
} from '../services/api.js';

import {
  User as UserIcon,
  Zap,
  History,
  Save,
  ArrowUpRight,
  CreditCard,
  Link2,
  Settings,
  Trash2,
  Sparkles,
  Shield,
  Check,
  ChevronRight,
  Bell,
  Globe,
  Palette,
  Lock,
  Download,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  X,
  Crown,
  Clock3,
  Activity,
  CircleDollarSign,
  Youtube,
  Music2,
  Instagram,
  Copy,
} from 'lucide-react';

interface SettingsViewProps {
  user: User | null;
  onUserUpdated: (user: User) => void;
}

/* =========================================================
   TYPES
========================================================= */

type SectionId =
  | 'profile'
  | 'social'
  | 'preferences'
  | 'billing'
  | 'usage';

const DEFAULT_PREFERENCES: UserPreferences = {
  email_notifications: true,
  marketing_emails: false,
  language: 'English',
  appearance: 'dark',
};

/* =========================================================
   AVATAR FALLBACK
========================================================= */

const AvatarFallback: React.FC<{
  name?: string | null;
  size?: 'sm' | 'lg';
}> = ({ name, size = 'lg' }) => {
  const initials =
    (name || 'User')
      .trim()
      .split(/\s+/)
      .map((part) => part.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'U';

  const sizeClass =
    size === 'sm'
      ? 'h-9 w-9 text-xs'
      : 'h-24 w-24 text-3xl';

  return (
    <div
      className={`flex ${sizeClass} items-center justify-center rounded-3xl bg-gradient-to-br from-violet-500 via-purple-600 to-indigo-600 font-bold text-white shadow-2xl shadow-violet-600/30 ring-4 ring-violet-500/10`}
    >
      {initials}
    </div>
  );
};

/* =========================================================
   TOGGLE
========================================================= */

const Toggle: React.FC<{
  checked: boolean;
  disabled?: boolean;
  onChange?: (value: boolean) => void;
}> = ({ checked, disabled, onChange }) => {
  return (
    <button
      type="button"
      onClick={() => onChange?.(!checked)}
      disabled={disabled}
      className={`relative h-7 w-12 shrink-0 rounded-full p-1 transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50 ${
        checked
          ? 'bg-violet-600 shadow-lg shadow-violet-600/30'
          : 'bg-zinc-700'
      }`}
      aria-pressed={checked}
    >
      <span
        className={`block h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-300 ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
};

/* =========================================================
   STAT CARD
========================================================= */

const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  description?: string;
}> = ({ icon, label, value, description }) => {
  return (
    <div className="group rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4 transition-all duration-300 hover:border-violet-500/20 hover:bg-white/[0.04]">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
          {icon}
        </div>

        <Activity className="h-4 w-4 text-zinc-700 transition group-hover:text-violet-400" />
      </div>

      <p className="text-xs font-medium text-zinc-500">
        {label}
      </p>

      <p className="mt-1 text-xl font-bold tracking-tight text-white">
        {value}
      </p>

      {description && (
        <p className="mt-1 text-[11px] text-zinc-600">
          {description}
        </p>
      )}
    </div>
  );
};

/* =========================================================
   SECTION HEADER
========================================================= */

const SectionHeader: React.FC<{
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  description: string;
}> = ({
  icon,
  eyebrow,
  title,
  description,
}) => {
  return (
    <div className="mb-7 flex items-start gap-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/10 text-violet-400">
        {icon}
      </div>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-400">
          {eyebrow}
        </p>

        <h2 className="mt-1 text-xl font-bold tracking-tight text-white">
          {title}
        </h2>

        <p className="mt-1 text-sm leading-6 text-zinc-500">
          {description}
        </p>
      </div>
    </div>
  );
};

/* =========================================================
   SETTINGS VIEW
========================================================= */

export const SettingsView: React.FC<SettingsViewProps> = ({
  user,
  onUserUpdated,
}) => {
  const [name, setName] = useState(user?.name || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');

  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const [activeSection, setActiveSection] =
    useState<SectionId>('profile');

  const [deleteModal, setDeleteModal] =
    useState(false);

  const [connectModal, setConnectModal] =
    useState<string | null>(null);

  const [connectedPlatforms, setConnectedPlatforms] =
    useState<Record<string, boolean>>({});

  const [youtubeAccount, setYouTubeAccount] = useState<{
    id: string;
    name: string;
    avatar: string;
  } | null>(null);

  const [youtubeLoading, setYouTubeLoading] = useState(true);
  const [youtubeBusy, setYouTubeBusy] = useState(false);
  const [socialMessage, setSocialMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  /* =======================================================
     PREFERENCES STATE
  ======================================================= */

  const [preferences, setPreferences] =
    useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [prefsLoading, setPrefsLoading] = useState(true);
  const [prefsSavingKey, setPrefsSavingKey] =
    useState<keyof UserPreferences | null>(null);
  const [prefsMessage, setPrefsMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  /* =======================================================
     BILLING / ACCOUNT TOOLS STATE
  ======================================================= */

  const [upgrading, setUpgrading] = useState(false);
  const [billingMessage, setBillingMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const [exportingData, setExportingData] = useState(false);
  const [generatingKey, setGeneratingKey] = useState(false);
  const [apiKeyModal, setApiKeyModal] = useState<string | null>(null);
  const [apiKeyCopied, setApiKeyCopied] = useState(false);

  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  /* =======================================================
     LOAD USER / USAGE
  ======================================================= */

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setAvatar(user.avatar || '');
    }

    let mounted = true;

    fetchUsageLogs()
      .then((res) => {
        if (!mounted) return;

        setLogs(
          Array.isArray(res.logs)
            ? res.logs
            : []
        );
      })
      .catch((err) => {
        if (!mounted) return;

        console.error(
          'Failed to load usage logs:',
          err
        );
      });

    const loadYouTubeStatus = async () => {
      try {
        setYouTubeLoading(true);
        const status = await fetchYouTubeStatusApi();

        if (!mounted) return;

        setConnectedPlatforms((prev) => ({
          ...prev,
          YouTube: Boolean(status.connected),
        }));

        setYouTubeAccount(status.connected ? status.account || null : null);
      } catch (err) {
        if (!mounted) return;
        console.error('Failed to load YouTube status:', err);
      } finally {
        if (mounted) setYouTubeLoading(false);
      }
    };

    const loadPreferences = async () => {
      try {
        setPrefsLoading(true);
        const res = await fetchPreferencesApi();

        if (!mounted) return;

        setPreferences({
          ...DEFAULT_PREFERENCES,
          ...res.preferences,
        });
      } catch (err) {
        if (!mounted) return;
        console.error('Failed to load preferences:', err);
      } finally {
        if (mounted) setPrefsLoading(false);
      }
    };

    if (user) {
      void loadYouTubeStatus();
      void loadPreferences();
    } else {
      setYouTubeLoading(false);
      setPrefsLoading(false);
    }

    return () => {
      mounted = false;
    };
  }, [user]);

  /* =======================================================
     HANDLE YOUTUBE OAUTH RETURN
  ======================================================= */

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const youtubeResult = params.get('youtube');
    const reason = params.get('reason');

    if (!youtubeResult) return;

    setActiveSection('social');

    if (youtubeResult === 'connected') {
      setSocialMessage({
        type: 'success',
        text: 'YouTube account connected successfully.',
      });
    } else if (youtubeResult === 'error') {
      setSocialMessage({
        type: 'error',
        text: reason
          ? `YouTube connection failed: ${reason}`
          : 'YouTube connection failed. Please try again.',
      });
    }

    const cleanUrl = `${window.location.pathname}${window.location.hash || ''}`;
    window.history.replaceState({}, document.title, cleanUrl);
  }, []);

  /* =======================================================
     SAVE PROFILE
  ======================================================= */

  const handleSaveProfile = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (saving) return;

    setSaving(true);
    setSaveMessage('');

    try {
      const res = await updateProfileApi(
        name.trim(),
        avatar.trim()
      );

      onUserUpdated(res.user);

      setSaveMessage(
        'Profile updated successfully!'
      );

      window.setTimeout(() => {
        setSaveMessage('');
      }, 3000);
    } catch (err) {
      console.error(
        'Profile update failed:',
        err
      );

      setSaveMessage(
        'Failed to update profile.'
      );
    } finally {
      setSaving(false);
    }
  };

  /* =======================================================
     PREFERENCES: SAVE (optimistic, with rollback)
  ======================================================= */

  const savePreference = async <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => {
    const previous = preferences;

    setPreferences((prev) => ({ ...prev, [key]: value }));
    setPrefsSavingKey(key);
    setPrefsMessage(null);

    try {
      const res = await updatePreferencesApi({ [key]: value } as Partial<UserPreferences>);

      setPreferences((prev) => ({
        ...prev,
        ...res.preferences,
      }));
    } catch (err: any) {
      console.error('Failed to save preference:', err);

      setPreferences(previous);
      setPrefsMessage({
        type: 'error',
        text: err?.message || 'Failed to save preference.',
      });
    } finally {
      setPrefsSavingKey(null);
    }
  };

  /* =======================================================
     BILLING: UPGRADE PLAN
  ======================================================= */

  const handleUpgrade = async () => {
    if (upgrading) return;

    setUpgrading(true);
    setBillingMessage(null);

    try {
      const res = await checkoutStripeApi('pro');

      if (!res?.url) {
        throw new Error('Checkout URL was not returned.');
      }

      window.location.href = res.url;
    } catch (err: any) {
      console.error('Failed to start checkout:', err);

      setBillingMessage({
        type: 'error',
        text: err?.message || 'Failed to start checkout.',
      });

      setUpgrading(false);
    }
  };

  /* =======================================================
     ACCOUNT TOOLS: DOWNLOAD DATA
  ======================================================= */

  const handleExportData = async () => {
    if (exportingData) return;

    setExportingData(true);
    setBillingMessage(null);

    try {
      const data = await exportAccountDataApi();

      const blob = new Blob(
        [JSON.stringify(data, null, 2)],
        { type: 'application/json' }
      );

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = url;
      link.download = `lumoclip-account-data-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Failed to export data:', err);

      setBillingMessage({
        type: 'error',
        text: err?.message || 'Failed to export account data.',
      });
    } finally {
      setExportingData(false);
    }
  };

  /* =======================================================
     ACCOUNT TOOLS: GENERATE API KEY
  ======================================================= */

  const handleGenerateApiKey = async () => {
    if (generatingKey) return;

    setGeneratingKey(true);
    setBillingMessage(null);
    setApiKeyCopied(false);

    try {
      const res = await generateApiKeyApi();
      setApiKeyModal(res.apiKey);
    } catch (err: any) {
      console.error('Failed to generate API key:', err);

      setBillingMessage({
        type: 'error',
        text: err?.message || 'Failed to generate API key.',
      });
    } finally {
      setGeneratingKey(false);
    }
  };

  const handleCopyApiKey = async () => {
    if (!apiKeyModal) return;

    try {
      await navigator.clipboard.writeText(apiKeyModal);
      setApiKeyCopied(true);
      window.setTimeout(() => setApiKeyCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy API key:', err);
    }
  };

  /* =======================================================
     DANGER ZONE: DELETE ACCOUNT
  ======================================================= */

  const handleDeleteAccount = async () => {
    if (deleting) return;

    setDeleting(true);
    setDeleteError('');

    try {
      await deleteAccountApi();
      await supabase.auth.signOut();

      window.location.href = '/';
    } catch (err: any) {
      console.error('Failed to delete account:', err);

      setDeleteError(
        err?.message || 'Failed to delete account. Please try again.'
      );
      setDeleting(false);
    }
  };

  /* =======================================================
     SECTIONS
  ======================================================= */

  const sections = [
    {
      id: 'profile' as SectionId,
      label: 'Profile',
      description: 'Personal information',
      icon: UserIcon,
    },
    {
      id: 'social' as SectionId,
      label: 'Social Accounts',
      description: 'Connected platforms',
      icon: Link2,
    },
    {
      id: 'preferences' as SectionId,
      label: 'Preferences',
      description: 'Customize LumoClip',
      icon: Settings,
    },
    {
      id: 'billing' as SectionId,
      label: 'Billing',
      description: 'Plan & credits',
      icon: CreditCard,
    },
    {
      id: 'usage' as SectionId,
      label: 'Usage History',
      description: 'Credit activity',
      icon: History,
    },
  ];

  /* =======================================================
     USAGE
  ======================================================= */

  const totalUsed = useMemo(() => {
    return logs.reduce(
      (total, log) =>
        total + Number(log.credits_used || 0),
      0
    );
  }, [logs]);

  const currentCredits =
    Number(user?.credits || 0);

  const initialCredits =
    currentCredits + totalUsed;

  const usagePercent =
    initialCredits > 0
      ? Math.min(
          100,
          Math.round(
            (totalUsed / initialCredits) * 100
          )
        )
      : 0;

  /* =======================================================
     SOCIAL PLATFORMS
  ======================================================= */

  const platforms = [
    {
      name: 'YouTube',
      desc: 'Upload Shorts directly',
      icon: Youtube,
      iconClass: 'text-red-500',
      bg: 'bg-red-500/10',
      border: 'hover:border-red-500/30',
    },
    {
      name: 'TikTok',
      desc: 'Publish short-form videos',
      icon: Music2,
      iconClass: 'text-white',
      bg: 'bg-white/[0.06]',
      border: 'hover:border-white/20',
    },
    {
      name: 'Instagram',
      desc: 'Publish Instagram Reels',
      icon: Instagram,
      iconClass: 'text-pink-500',
      bg: 'bg-pink-500/10',
      border: 'hover:border-pink-500/30',
    },
    {
      name: 'Google',
      desc: 'Google integrations',
      icon: Globe,
      iconClass: 'text-blue-500',
      bg: 'bg-blue-500/10',
      border: 'hover:border-blue-500/30',
    },
  ];

  /* =======================================================
     CONNECT (unchanged — TikTok / Instagram / Google
     remain "coming soon" as requested)
  ======================================================= */

  const handleConnect = (platform: string) => {
    setSocialMessage(null);
    setConnectModal(platform);
  };

  const startYouTubeConnection = async () => {
    if (youtubeBusy) return;

    setYouTubeBusy(true);
    setSocialMessage(null);

    try {
      await connectYouTubeApi();
    } catch (err: any) {
      console.error('YouTube connection failed:', err);
      setSocialMessage({
        type: 'error',
        text: err?.message || 'Failed to connect YouTube.',
      });
      setYouTubeBusy(false);
    }
  };

  const handleDisconnectYouTube = async () => {
    if (youtubeBusy) return;

    setYouTubeBusy(true);
    setSocialMessage(null);

    try {
      await disconnectYouTubeApi();

      setConnectedPlatforms((prev) => ({
        ...prev,
        YouTube: false,
      }));
      setYouTubeAccount(null);
      setConnectModal(null);
      setSocialMessage({
        type: 'success',
        text: 'YouTube account disconnected successfully.',
      });
    } catch (err: any) {
      console.error('YouTube disconnect failed:', err);
      setSocialMessage({
        type: 'error',
        text: err?.message || 'Failed to disconnect YouTube.',
      });
    } finally {
      setYouTubeBusy(false);
    }
  };

  const confirmConnect = async () => {
    if (!connectModal) return;

    if (connectModal === 'YouTube') {
      await startYouTubeConnection();
      return;
    }

    setConnectModal(null);
    setSocialMessage({
      type: 'error',
      text: `${connectModal} integration is coming soon.`,
    });
  };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="min-h-full pb-16 text-white">

      {/* =================================================
          PAGE HEADER
      ================================================= */}

      <div className="mb-8">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">

          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-medium text-zinc-500">
              <span>Workspace</span>
              <ChevronRight className="h-3 w-3" />
              <span className="text-zinc-300">
                Settings
              </span>
            </div>

            <h1 className="text-3xl font-bold tracking-[-0.03em] text-white sm:text-4xl">
              Settings
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-500">
              Manage your LumoClip account,
              connected platforms, preferences
              and subscription.
            </p>
          </div>

          <div className="hidden items-center gap-2 rounded-2xl border border-emerald-500/10 bg-emerald-500/[0.04] px-4 py-2.5 sm:flex">
            <div className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </div>

            <span className="text-xs font-medium text-emerald-400">
              All systems operational
            </span>
          </div>

        </div>
      </div>

      {/* =================================================
          MAIN LAYOUT
      ================================================= */}

      <div className="grid gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">

        {/* =================================================
            SIDEBAR
        ================================================= */}

        <aside>
          <div className="sticky top-24 rounded-3xl border border-white/[0.06] bg-zinc-950/70 p-2 shadow-2xl shadow-black/20 backdrop-blur-xl">

            {/* ACCOUNT MINI CARD */}

            <div className="mb-2 rounded-2xl border border-white/[0.05] bg-white/[0.025] p-3">
              <div className="flex items-center gap-3">

                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name || 'Profile'}
                    className="h-10 w-10 rounded-xl object-cover ring-2 ring-violet-500/20"
                    onError={(e) => {
                      e.currentTarget.style.display =
                        'none';
                    }}
                  />
                ) : (
                  <AvatarFallback
                    name={user?.name}
                    size="sm"
                  />
                )}

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">
                    {user?.name || 'User'}
                  </p>

                  <p className="truncate text-[11px] text-zinc-500">
                    {user?.email || ''}
                  </p>
                </div>

              </div>
            </div>

            {/* NAV */}

            <nav className="space-y-1">
              {sections.map((section) => {
                const Icon = section.icon;
                const active =
                  activeSection === section.id;

                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() =>
                      setActiveSection(section.id)
                    }
                    className={`group relative flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-all duration-200 ${
                      active
                        ? 'bg-gradient-to-r from-violet-600/15 to-indigo-600/10 text-white'
                        : 'text-zinc-500 hover:bg-white/[0.035] hover:text-zinc-200'
                    }`}
                  >
                    {active && (
                      <span className="absolute left-0 top-2.5 h-7 w-0.5 rounded-full bg-violet-400 shadow-lg shadow-violet-500" />
                    )}

                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition ${
                        active
                          ? 'bg-violet-500/15 text-violet-400'
                          : 'bg-white/[0.025] text-zinc-600 group-hover:text-zinc-300'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold">
                        {section.label}
                      </p>

                      <p
                        className={`mt-0.5 truncate text-[10px] ${
                          active
                            ? 'text-zinc-500'
                            : 'text-zinc-700'
                        }`}
                      >
                        {section.description}
                      </p>
                    </div>

                    {active && (
                      <ChevronRight className="h-3.5 w-3.5 text-violet-400" />
                    )}
                  </button>
                );
              })}
            </nav>

            {/* SECURITY */}

            <div className="mt-3 border-t border-white/[0.05] pt-3">
              <div className="rounded-2xl bg-white/[0.02] p-3">

                <div className="mb-2 flex items-center gap-2">
                  <Shield className="h-3.5 w-3.5 text-emerald-400" />

                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    Account security
                  </span>
                </div>

                <p className="text-[10px] leading-4 text-zinc-600">
                  Your account data is protected
                  with secure authentication.
                </p>

              </div>
            </div>

          </div>
        </aside>

        {/* =================================================
            CONTENT
        ================================================= */}

        <main className="min-w-0 space-y-6">

          {/* =================================================
              PROFILE
          ================================================= */}

          {activeSection === 'profile' && (
            <>
              <section className="relative overflow-hidden rounded-3xl border border-white/[0.07] bg-gradient-to-br from-violet-950/40 via-zinc-950 to-zinc-950">

                <div className="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full bg-violet-600/10 blur-3xl" />

                <div className="pointer-events-none absolute -bottom-32 -left-24 h-72 w-72 rounded-full bg-indigo-600/[0.08] blur-3xl" />

                <div className="relative p-6 sm:p-8">

                  <div className="flex flex-col gap-6 sm:flex-row sm:items-center">

                    <div className="relative shrink-0">
                      {avatar ? (
                        <img
                          src={avatar}
                          alt={user?.name || 'Profile'}
                          className="h-24 w-24 rounded-3xl object-cover shadow-2xl ring-4 ring-violet-500/10"
                          onError={(e) => {
                            e.currentTarget.style.display =
                              'none';
                          }}
                        />
                      ) : (
                        <AvatarFallback
                          name={user?.name}
                        />
                      )}

                      <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-xl border-4 border-zinc-950 bg-emerald-500">
                        <Check className="h-3.5 w-3.5 text-white" />
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">

                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-2xl font-bold tracking-tight text-white">
                          {user?.name || 'User'}
                        </h2>

                        <span className="inline-flex items-center gap-1 rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-violet-300">
                          <Sparkles className="h-3 w-3" />
                          {user?.plan || 'Free'}
                        </span>
                      </div>

                      <p className="mt-1 text-sm text-zinc-500">
                        {user?.email || ''}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2">

                        <span className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/10 bg-amber-500/[0.06] px-3 py-1.5 text-xs font-semibold text-amber-300">
                          <Zap className="h-3.5 w-3.5" />
                          {currentCredits} credits
                        </span>

                        <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/10 bg-emerald-500/[0.05] px-3 py-1.5 text-xs font-semibold text-emerald-400">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Account active
                        </span>

                      </div>

                    </div>
                  </div>
                </div>
              </section>

              <div className="grid gap-3 sm:grid-cols-3">

                <StatCard
                  icon={<Zap className="h-4 w-4" />}
                  label="Available Credits"
                  value={String(currentCredits)}
                  description="Ready to use"
                />

                <StatCard
                  icon={<Activity className="h-4 w-4" />}
                  label="Credits Used"
                  value={String(totalUsed)}
                  description="All-time usage"
                />

                <StatCard
                  icon={<Shield className="h-4 w-4" />}
                  label="Account Status"
                  value="Active"
                  description="Everything looks good"
                />

              </div>

              <section className="rounded-3xl border border-white/[0.06] bg-zinc-950/70 p-6 shadow-xl shadow-black/10 sm:p-8">

                <SectionHeader
                  icon={<UserIcon className="h-5 w-5" />}
                  eyebrow="Account"
                  title="Personal information"
                  description="Update the information associated with your LumoClip account."
                />

                <form
                  onSubmit={handleSaveProfile}
                  className="max-w-2xl space-y-6"
                >

                  {saveMessage && (
                    <div
                      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm ${
                        saveMessage.includes('success')
                          ? 'border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-400'
                          : 'border-red-500/20 bg-red-500/[0.06] text-red-400'
                      }`}
                    >
                      {saveMessage.includes(
                        'success'
                      ) ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <AlertCircle className="h-4 w-4" />
                      )}

                      {saveMessage}
                    </div>
                  )}

                  <div className="grid gap-5 sm:grid-cols-2">

                    <div>
                      <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                        Full name
                      </label>

                      <input
                        type="text"
                        value={name}
                        onChange={(e) =>
                          setName(e.target.value)
                        }
                        placeholder="Your name"
                        className="w-full rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-violet-500/40 focus:bg-violet-500/[0.02] focus:ring-4 focus:ring-violet-500/[0.06]"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                        Email address
                      </label>

                      <div className="relative">
                        <input
                          type="email"
                          value={user?.email || ''}
                          disabled
                          className="w-full cursor-not-allowed rounded-2xl border border-white/[0.05] bg-white/[0.015] px-4 py-3.5 pr-11 text-sm text-zinc-600 outline-none"
                        />

                        <Lock className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-700" />
                      </div>

                      <p className="mt-2 text-[10px] text-zinc-700">
                        Email cannot be changed here.
                      </p>
                    </div>

                  </div>

                  <div>
                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                      Avatar URL
                    </label>

                    <input
                      type="url"
                      value={avatar}
                      onChange={(e) =>
                        setAvatar(e.target.value)
                      }
                      placeholder="https://example.com/avatar.jpg"
                      className="w-full rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-violet-500/40 focus:ring-4 focus:ring-violet-500/[0.06]"
                    />

                    <p className="mt-2 text-[10px] text-zinc-700">
                      Use a public image URL. Leave empty
                      to use your initials.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 border-t border-white/[0.05] pt-5 sm:flex-row sm:items-center">

                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-xl shadow-violet-600/20 transition-all hover:from-violet-500 hover:to-indigo-500 hover:shadow-violet-500/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {saving ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          Save changes
                        </>
                      )}
                    </button>

                    <span className="text-[11px] text-zinc-700">
                      Changes are saved securely.
                    </span>

                  </div>
                </form>
              </section>
            </>
          )}

          {/* =================================================
              SOCIAL
          ================================================= */}

          {activeSection === 'social' && (
            <section className="rounded-3xl border border-white/[0.06] bg-zinc-950/70 p-6 shadow-xl shadow-black/10 sm:p-8">

              <SectionHeader
                icon={<Link2 className="h-5 w-5" />}
                eyebrow="Integrations"
                title="Connected accounts"
                description="Connect your social platforms and publish your clips without leaving LumoClip."
              />

              <div className="grid gap-4 sm:grid-cols-2">

                {platforms.map((platform) => {
                  const Icon = platform.icon;

                  const connected =
                    connectedPlatforms[
                      platform.name
                    ];

                  const isYouTube =
                    platform.name === 'YouTube';

                  const isLoading =
                    isYouTube && youtubeLoading;

                  return (
                    <div
                      key={platform.name}
                      className={`group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/[0.035] ${platform.border}`}
                    >

                      <div className="flex items-start justify-between">

                        <div
                          className={`flex h-12 w-12 items-center justify-center rounded-2xl ${platform.bg}`}
                        >
                          <Icon
                            className={`h-6 w-6 ${platform.iconClass}`}
                          />
                        </div>

                        {connected ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/10 bg-emerald-500/[0.05] px-2.5 py-1 text-[10px] font-bold text-emerald-400">
                            <Check className="h-3 w-3" />
                            Connected
                          </span>
                        ) : (
                          <span className="rounded-full border border-white/[0.05] bg-white/[0.02] px-2.5 py-1 text-[10px] font-medium text-zinc-600">
                            Not connected
                          </span>
                        )}

                      </div>

                      <div className="mt-5">
                        <h3 className="font-semibold text-white">
                          {platform.name}
                        </h3>

                        <p className="mt-1 text-xs text-zinc-600">
                          {platform.desc}
                        </p>

                        {isYouTube && connected && youtubeAccount && (
                          <div className="mt-4 flex items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
                            {youtubeAccount.avatar ? (
                              <img
                                src={youtubeAccount.avatar}
                                alt={youtubeAccount.name}
                                className="h-9 w-9 rounded-xl object-cover ring-1 ring-red-500/20"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/10 text-xs font-bold text-red-400">
                                {(youtubeAccount.name || 'YT')
                                  .slice(0, 2)
                                  .toUpperCase()}
                              </div>
                            )}

                            <div className="min-w-0">
                              <p className="truncate text-xs font-semibold text-zinc-200">
                                {youtubeAccount.name}
                              </p>
                              <p className="mt-0.5 text-[10px] text-zinc-600">
                                YouTube channel
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          handleConnect(
                            platform.name
                          )
                        }
                        disabled={isLoading || (isYouTube && youtubeBusy)}
                        className={`mt-5 flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold transition ${
                          connected
                            ? 'border-white/[0.06] bg-white/[0.025] text-zinc-400 hover:bg-white/[0.05]'
                            : 'border-violet-500/20 bg-violet-500/10 text-violet-300 hover:bg-violet-500/15'
                        }`}
                      >
                        {isLoading
                          ? 'Checking connection…'
                          : connected
                            ? 'Manage connection'
                            : 'Connect account'}

                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </button>

                    </div>
                  );
                })}

              </div>

              {socialMessage && (
                <div
                  className={`mt-6 flex items-start gap-3 rounded-2xl border p-4 ${
                    socialMessage.type === 'success'
                      ? 'border-emerald-500/15 bg-emerald-500/[0.04] text-emerald-400'
                      : 'border-red-500/15 bg-red-500/[0.04] text-red-400'
                  }`}
                >
                  {socialMessage.type === 'success' ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  ) : (
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  )}
                  <p className="text-xs leading-5">
                    {socialMessage.text}
                  </p>
                </div>
              )}

              <div className="mt-6 flex items-start gap-3 rounded-2xl border border-blue-500/10 bg-blue-500/[0.035] p-4">

                <Shield className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />

                <p className="text-xs leading-5 text-zinc-600">
                  LumoClip only uses connected accounts
                  for actions you explicitly authorize.
                  Your passwords are never stored.
                </p>

              </div>

            </section>
          )}

          {/* =================================================
              PREFERENCES
          ================================================= */}

          {activeSection === 'preferences' && (
            <section className="rounded-3xl border border-white/[0.06] bg-zinc-950/70 p-6 shadow-xl shadow-black/10 sm:p-8">

              <SectionHeader
                icon={<Settings className="h-5 w-5" />}
                eyebrow="Customization"
                title="Preferences"
                description="Control how LumoClip communicates with you and how your workspace behaves."
              />

              {prefsMessage && (
                <div
                  className={`mb-5 flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm ${
                    prefsMessage.type === 'success'
                      ? 'border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-400'
                      : 'border-red-500/20 bg-red-500/[0.06] text-red-400'
                  }`}
                >
                  {prefsMessage.type === 'success' ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  {prefsMessage.text}
                </div>
              )}

              <div className={`space-y-4 ${prefsLoading ? 'opacity-60' : ''}`}>

                <div className="flex items-center justify-between gap-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">

                  <div className="flex items-start gap-4">

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
                      <Bell className="h-4 w-4" />
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-white">
                        Email notifications
                      </p>

                      <p className="mt-1 text-xs leading-5 text-zinc-600">
                        Get notified when your clips
                        finish processing or exporting.
                      </p>
                    </div>

                  </div>

                  <Toggle
                    checked={preferences.email_notifications}
                    disabled={prefsLoading || prefsSavingKey === 'email_notifications'}
                    onChange={(value) =>
                      savePreference('email_notifications', value)
                    }
                  />

                </div>

                <div className="flex items-center justify-between gap-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">

                  <div className="flex items-start gap-4">

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                      <Sparkles className="h-4 w-4" />
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-white">
                        Product updates
                      </p>

                      <p className="mt-1 text-xs leading-5 text-zinc-600">
                        Receive new feature announcements,
                        tips and product updates.
                      </p>
                    </div>

                  </div>

                  <Toggle
                    checked={preferences.marketing_emails}
                    disabled={prefsLoading || prefsSavingKey === 'marketing_emails'}
                    onChange={(value) =>
                      savePreference('marketing_emails', value)
                    }
                  />

                </div>

                <div className="grid gap-4 pt-2 sm:grid-cols-2">

                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">

                    <div className="mb-3 flex items-center gap-2">
                      <Globe className="h-4 w-4 text-violet-400" />

                      <label className="text-xs font-semibold text-white">
                        Language
                      </label>
                    </div>

                    <select
                      value={preferences.language}
                      disabled={prefsLoading || prefsSavingKey === 'language'}
                      onChange={(e) =>
                        savePreference('language', e.target.value)
                      }
                      className="w-full rounded-xl border border-white/[0.06] bg-zinc-900 px-3 py-2.5 text-xs text-zinc-300 outline-none focus:border-violet-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <option value="English">English</option>
                      <option value="বাংলা">বাংলা</option>
                      <option value="Spanish">Spanish</option>
                    </select>

                  </div>

                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">

                    <div className="mb-3 flex items-center gap-2">
                      <Palette className="h-4 w-4 text-violet-400" />

                      <label className="text-xs font-semibold text-white">
                        Appearance
                      </label>
                    </div>

                    <select
                      value={preferences.appearance}
                      disabled={prefsLoading || prefsSavingKey === 'appearance'}
                      onChange={(e) =>
                        savePreference(
                          'appearance',
                          e.target.value as UserPreferences['appearance']
                        )
                      }
                      className="w-full rounded-xl border border-white/[0.06] bg-zinc-900 px-3 py-2.5 text-xs text-zinc-300 outline-none focus:border-violet-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <option value="dark">Dark</option>
                      <option value="light">Light</option>
                      <option value="system">System</option>
                    </select>

                  </div>

                </div>
              </div>

            </section>
          )}

          {/* =================================================
              BILLING
          ================================================= */}

          {activeSection === 'billing' && (
            <div className="space-y-6">

              <section className="relative overflow-hidden rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-950/50 via-zinc-950 to-zinc-950 p-6 sm:p-8">

                <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-violet-600/15 blur-3xl" />

                <div className="relative">

                  <div className="flex flex-col justify-between gap-6 sm:flex-row">

                    <div>

                      <div className="flex items-center gap-2">
                        <Crown className="h-4 w-4 text-violet-400" />

                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-300">
                          Current plan
                        </p>
                      </div>

                      <h2 className="mt-3 text-4xl font-bold capitalize tracking-tight text-white">
                        {user?.plan || 'Free'}
                      </h2>

                      <p className="mt-2 text-sm text-zinc-500">
                        Your LumoClip subscription
                      </p>

                    </div>

                    <span className="h-fit rounded-full border border-emerald-500/10 bg-emerald-500/[0.06] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                      Active
                    </span>

                  </div>

                  <div className="mt-8 rounded-2xl border border-white/[0.06] bg-black/20 p-5">

                    <div className="flex items-center justify-between">

                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-amber-400" />

                        <span className="text-sm font-semibold text-white">
                          Credit balance
                        </span>
                      </div>

                      <span className="text-sm font-bold text-amber-300">
                        {currentCredits}
                      </span>

                    </div>

                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.05]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all"
                        style={{
                          width: `${Math.max(
                            5,
                            100 - usagePercent
                          )}%`,
                        }}
                      />
                    </div>

                    <div className="mt-2 flex justify-between text-[10px] text-zinc-700">
                      <span>{totalUsed} used</span>
                      <span>{currentCredits} remaining</span>
                    </div>

                  </div>

                  {billingMessage && (
                    <div
                      className={`mt-5 flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm ${
                        billingMessage.type === 'success'
                          ? 'border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-400'
                          : 'border-red-500/20 bg-red-500/[0.06] text-red-400'
                      }`}
                    >
                      {billingMessage.type === 'success' ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <AlertCircle className="h-4 w-4" />
                      )}
                      {billingMessage.text}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleUpgrade}
                    disabled={upgrading}
                    className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-xl shadow-violet-600/20 transition hover:from-violet-500 hover:to-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {upgrading ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Redirecting to checkout…
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Upgrade plan
                        <ArrowUpRight className="h-4 w-4" />
                      </>
                    )}
                  </button>

                </div>
              </section>

              <section className="grid gap-4 sm:grid-cols-3">

                <div className="rounded-2xl border border-white/[0.06] bg-zinc-950/70 p-5">
                  <Zap className="h-5 w-5 text-amber-400" />

                  <p className="mt-4 text-xs text-zinc-600">
                    Credits
                  </p>

                  <p className="mt-1 text-lg font-bold text-white">
                    {currentCredits}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/[0.06] bg-zinc-950/70 p-5">
                  <Clock3 className="h-5 w-5 text-violet-400" />

                  <p className="mt-4 text-xs text-zinc-600">
                    Billing cycle
                  </p>

                  <p className="mt-1 text-lg font-bold text-white">
                    Monthly
                  </p>
                </div>

                <div className="rounded-2xl border border-white/[0.06] bg-zinc-950/70 p-5">
                  <CircleDollarSign className="h-5 w-5 text-emerald-400" />

                  <p className="mt-4 text-xs text-zinc-600">
                    Status
                  </p>

                  <p className="mt-1 text-lg font-bold text-emerald-400">
                    Active
                  </p>
                </div>

              </section>

              <section className="rounded-3xl border border-white/[0.06] bg-zinc-950/70 p-6">

                <h3 className="text-sm font-bold text-white">
                  Account tools
                </h3>

                <p className="mt-1 text-xs text-zinc-600">
                  Manage your account data and developer
                  access.
                </p>

                <div className="mt-5 flex flex-wrap gap-3">

                  <button
                    type="button"
                    onClick={handleExportData}
                    disabled={exportingData}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-2.5 text-xs font-semibold text-zinc-400 transition hover:bg-white/[0.05] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {exportingData ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                    {exportingData ? 'Preparing export…' : 'Download data'}
                  </button>

                  <button
                    type="button"
                    onClick={handleGenerateApiKey}
                    disabled={generatingKey}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-2.5 text-xs font-semibold text-zinc-400 transition hover:bg-white/[0.05] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {generatingKey ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <KeyRound className="h-3.5 w-3.5" />
                    )}
                    {generatingKey ? 'Generating…' : 'Generate API key'}
                  </button>

                </div>
              </section>

            </div>
          )}

          {/* =================================================
              USAGE
          ================================================= */}

          {activeSection === 'usage' && (
            <div className="space-y-6">

              <section className="rounded-3xl border border-white/[0.06] bg-zinc-950/70 p-6 sm:p-8">

                <SectionHeader
                  icon={<History className="h-5 w-5" />}
                  eyebrow="Analytics"
                  title="Credit usage"
                  description="Track how your LumoClip credits are being consumed."
                />

                <div className="grid gap-4 sm:grid-cols-3">

                  <StatCard
                    icon={<Zap className="h-4 w-4" />}
                    label="Remaining"
                    value={String(currentCredits)}
                  />

                  <StatCard
                    icon={<Activity className="h-4 w-4" />}
                    label="Used"
                    value={String(totalUsed)}
                  />

                  <StatCard
                    icon={<History className="h-4 w-4" />}
                    label="Activities"
                    value={String(logs.length)}
                  />

                </div>

                <div className="mt-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">

                  <div className="flex items-center justify-between">

                    <span className="text-xs font-semibold text-zinc-400">
                      Credit consumption
                    </span>

                    <span className="text-xs font-bold text-violet-400">
                      {usagePercent}%
                    </span>

                  </div>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.05]">

                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500"
                      style={{
                        width: `${usagePercent}%`,
                      }}
                    />

                  </div>

                </div>

              </section>

              <section className="overflow-hidden rounded-3xl border border-white/[0.06] bg-zinc-950/70 shadow-xl shadow-black/10">

                <div className="border-b border-white/[0.05] p-6">

                  <div className="flex items-center justify-between">

                    <div>
                      <h3 className="text-sm font-bold text-white">
                        Recent activity
                      </h3>

                      <p className="mt-1 text-xs text-zinc-600">
                        Your latest credit transactions.
                      </p>
                    </div>

                    <span className="rounded-full border border-amber-500/10 bg-amber-500/[0.05] px-3 py-1 text-[10px] font-bold text-amber-400">
                      {currentCredits} left
                    </span>

                  </div>

                </div>

                <div className="overflow-x-auto">

                  <table className="w-full min-w-[550px] text-left">

                    <thead className="border-b border-white/[0.05] bg-white/[0.015]">
                      <tr className="text-[10px] uppercase tracking-[0.15em] text-zinc-700">

                        <th className="px-6 py-4 font-bold">
                          Date
                        </th>

                        <th className="px-6 py-4 font-bold">
                          Action
                        </th>

                        <th className="px-6 py-4 text-right font-bold">
                          Credits
                        </th>

                      </tr>
                    </thead>

                    <tbody className="divide-y divide-white/[0.04]">

                      {logs.length === 0 ? (
                        <tr>
                          <td
                            colSpan={3}
                            className="px-6 py-20 text-center"
                          >

                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-400">
                              <History className="h-6 w-6" />
                            </div>

                            <p className="mt-4 text-sm font-semibold text-white">
                              No usage yet
                            </p>

                            <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-zinc-600">
                              Generate your first AI clip
                              and your credit activity
                              will appear here.
                            </p>

                          </td>
                        </tr>
                      ) : (
                        logs.map((log) => (
                          <tr
                            key={log.id}
                            className="group transition hover:bg-white/[0.02]"
                          >

                            <td className="px-6 py-4 text-xs text-zinc-600">
                              {new Date(
                                log.created_at
                              ).toLocaleDateString(
                                undefined,
                                {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                }
                              )}
                            </td>

                            <td className="px-6 py-4">

                              <div className="flex items-center gap-3">

                                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/10">
                                  <Zap className="h-3.5 w-3.5 text-violet-400" />
                                </div>

                                <span className="text-xs font-semibold text-zinc-300">
                                  {log.action}
                                </span>

                              </div>

                            </td>

                            <td className="px-6 py-4 text-right">

                              <span className="rounded-lg bg-red-500/[0.05] px-2.5 py-1 text-xs font-bold text-red-400">
                                −{log.credits_used}
                              </span>

                            </td>

                          </tr>
                        ))
                      )}

                    </tbody>
                  </table>

                </div>
              </section>

            </div>
          )}

          {/* =================================================
              DANGER ZONE
          ================================================= */}

          <section className="rounded-3xl border border-red-500/10 bg-gradient-to-br from-red-950/20 to-zinc-950 p-6">

            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

              <div className="flex items-start gap-4">

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10">
                  <Trash2 className="h-4 w-4 text-red-400" />
                </div>

                <div>
                  <h3 className="text-sm font-bold text-red-400">
                    Danger zone
                  </h3>

                  <p className="mt-1 max-w-lg text-xs leading-5 text-zinc-600">
                    Permanently delete your account,
                    projects, clips and associated data.
                    This action cannot be undone.
                  </p>
                </div>

              </div>

              <button
                type="button"
                onClick={() => {
                  setDeleteError('');
                  setDeleteModal(true);
                }}
                className="shrink-0 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-2.5 text-xs font-semibold text-red-400 transition hover:bg-red-500/10"
              >
                Delete account
              </button>

            </div>

          </section>

        </main>
      </div>

      {/* =================================================
          CONNECT MODAL
      ================================================= */}

      {connectModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">

          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-white/[0.08] bg-zinc-950 shadow-2xl shadow-black/50">

            <div className="flex items-center justify-between border-b border-white/[0.05] p-5">

              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-400">
                  Integration
                </p>

                <h3 className="mt-1 text-lg font-bold text-white">
                  Connect {connectModal}
                </h3>
              </div>

              <button
                type="button"
                onClick={() =>
                  setConnectModal(null)
                }
                className="rounded-xl p-2 text-zinc-600 transition hover:bg-white/[0.05] hover:text-white"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>

            </div>

            <div className="p-6">

              {connectModal === 'YouTube' && connectedPlatforms.YouTube ? (
                <>
                  <div className="rounded-2xl border border-emerald-500/10 bg-emerald-500/[0.04] p-5">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white">
                          YouTube is connected
                        </p>
                        <p className="mt-1 truncate text-xs text-zinc-600">
                          {youtubeAccount?.name || 'Connected YouTube channel'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setConnectModal(null)}
                      className="flex-1 rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-3 text-xs font-semibold text-zinc-400 transition hover:bg-white/[0.05]"
                    >
                      Close
                    </button>

                    <button
                      type="button"
                      onClick={handleDisconnectYouTube}
                      disabled={youtubeBusy}
                      className="flex-1 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-xs font-semibold text-red-400 transition hover:bg-red-500/[0.1] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {youtubeBusy ? 'Disconnecting…' : 'Disconnect'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="rounded-2xl border border-violet-500/10 bg-violet-500/[0.04] p-5">
                    <div className="flex items-start gap-3">
                      <Shield className="mt-0.5 h-5 w-5 text-violet-400" />
                      <div>
                        <p className="text-sm font-semibold text-white">
                          Secure authorization
                        </p>

                        <p className="mt-1 text-xs leading-5 text-zinc-600">
                          {connectModal === 'YouTube'
                            ? "You'll be redirected to Google to authorize LumoClip. Your Google password is never stored by LumoClip."
                            : `${connectModal} publishing is not connected yet. This integration will be available soon.`}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setConnectModal(null)}
                      className="flex-1 rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-3 text-xs font-semibold text-zinc-400 transition hover:bg-white/[0.05]"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={confirmConnect}
                      disabled={youtubeBusy || connectModal !== 'YouTube'}
                      className="flex-1 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3 text-xs font-semibold text-white shadow-lg shadow-violet-600/20 transition hover:from-violet-500 hover:to-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {youtubeBusy ? 'Connecting…' : connectModal === 'YouTube' ? 'Continue' : 'Coming soon'}
                      {connectModal === 'YouTube' && !youtubeBusy && (
                        <ExternalLink className="ml-1.5 inline h-3 w-3" />
                      )}
                    </button>
                  </div>
                </>
              )}

            </div>
          </div>
        </div>
      )}

      {/* =================================================
          API KEY MODAL
      ================================================= */}

      {apiKeyModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">

          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-white/[0.08] bg-zinc-950 shadow-2xl shadow-black/50">

            <div className="flex items-center justify-between border-b border-white/[0.05] p-5">

              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-400">
                  Developer access
                </p>

                <h3 className="mt-1 text-lg font-bold text-white">
                  Your new API key
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setApiKeyModal(null)}
                className="rounded-xl p-2 text-zinc-600 transition hover:bg-white/[0.05] hover:text-white"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>

            </div>

            <div className="p-6">

              <div className="flex items-start gap-3 rounded-2xl border border-amber-500/10 bg-amber-500/[0.04] p-4">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <p className="text-xs leading-5 text-zinc-500">
                  Copy this key now — for security reasons
                  it won't be shown again.
                </p>
              </div>

              <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/[0.07] bg-black/30 p-3">
                <code className="flex-1 overflow-x-auto whitespace-nowrap text-xs text-zinc-300">
                  {apiKeyModal}
                </code>

                <button
                  type="button"
                  onClick={handleCopyApiKey}
                  className="shrink-0 rounded-lg border border-white/[0.07] bg-white/[0.03] p-2 text-zinc-400 transition hover:bg-white/[0.06] hover:text-white"
                  aria-label="Copy API key"
                >
                  {apiKeyCopied ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>

              <button
                type="button"
                onClick={() => setApiKeyModal(null)}
                className="mt-6 w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3 text-xs font-semibold text-white shadow-lg shadow-violet-600/20 transition hover:from-violet-500 hover:to-indigo-500"
              >
                Done
              </button>

            </div>
          </div>
        </div>
      )}

      {/* =================================================
          DELETE MODAL
      ================================================= */}

      {deleteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">

          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-red-500/10 bg-zinc-950 shadow-2xl shadow-black/50">

            <div className="p-6">

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10">
                <Trash2 className="h-5 w-5 text-red-400" />
              </div>

              <h3 className="mt-5 text-xl font-bold text-white">
                Delete your account?
              </h3>

              <p className="mt-2 text-sm leading-6 text-zinc-500">
                This will permanently remove your
                LumoClip account and associated data.
                This action cannot be reversed.
              </p>

              {deleteError && (
                <div className="mt-4 flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-xs text-red-400">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {deleteError}
                </div>
              )}

              <div className="mt-6 flex gap-3">

                <button
                  type="button"
                  onClick={() => setDeleteModal(false)}
                  disabled={deleting}
                  className="flex-1 rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-3 text-xs font-semibold text-zinc-400 transition hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-xs font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {deleting ? 'Deleting…' : 'Delete permanently'}
                </button>

              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};