import React, { useEffect, useMemo, useState } from 'react';
import { User, UsageLog } from '../types.js';
import {
  fetchUsageLogs,
  updateProfileApi,
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
  onChange?: (value: boolean) => void;
}> = ({ checked, onChange }) => {
  return (
    <button
      type="button"
      onClick={() => onChange?.(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full p-1 transition-all duration-300 ${
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

  const [emailNotifications, setEmailNotifications] =
    useState(true);

  const [marketingEmails, setMarketingEmails] =
    useState(false);

  const [deleteModal, setDeleteModal] =
    useState(false);

  const [connectModal, setConnectModal] =
    useState<string | null>(null);

  const [connectedPlatforms, setConnectedPlatforms] =
    useState<Record<string, boolean>>({});

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

    return () => {
      mounted = false;
    };
  }, [user]);

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
     CONNECT
  ======================================================= */

  const handleConnect = (platform: string) => {
    setConnectModal(platform);
  };

  const confirmConnect = () => {
    if (!connectModal) return;

    setConnectedPlatforms((prev) => ({
      ...prev,
      [connectModal]: true,
    }));

    setConnectModal(null);
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
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          handleConnect(
                            platform.name
                          )
                        }
                        className={`mt-5 flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold transition ${
                          connected
                            ? 'border-white/[0.06] bg-white/[0.025] text-zinc-400 hover:bg-white/[0.05]'
                            : 'border-violet-500/20 bg-violet-500/10 text-violet-300 hover:bg-violet-500/15'
                        }`}
                      >
                        {connected
                          ? 'Manage connection'
                          : 'Connect account'}

                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </button>

                    </div>
                  );
                })}

              </div>

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

              <div className="space-y-4">

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
                    checked={emailNotifications}
                    onChange={setEmailNotifications}
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
                    checked={marketingEmails}
                    onChange={setMarketingEmails}
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
                      defaultValue="English"
                      className="w-full rounded-xl border border-white/[0.06] bg-zinc-900 px-3 py-2.5 text-xs text-zinc-300 outline-none focus:border-violet-500/30"
                    >
                      <option>English</option>
                      <option>বাংলা</option>
                      <option>Spanish</option>
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
                      defaultValue="Dark"
                      className="w-full rounded-xl border border-white/[0.06] bg-zinc-900 px-3 py-2.5 text-xs text-zinc-300 outline-none focus:border-violet-500/30"
                    >
                      <option>Dark</option>
                      <option>Light</option>
                      <option>System</option>
                    </select>

                  </div>

                </div>
              </div>

              <div className="mt-6 flex items-center gap-2 rounded-2xl border border-amber-500/10 bg-amber-500/[0.035] p-4">

                <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />

                <p className="text-xs text-zinc-600">
                  Preference persistence can be connected
                  to your user profile API when you are
                  ready.
                </p>

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

                  <button
                    type="button"
                    className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-xl shadow-violet-600/20 transition hover:from-violet-500 hover:to-indigo-500"
                  >
                    <Sparkles className="h-4 w-4" />
                    Upgrade plan
                    <ArrowUpRight className="h-4 w-4" />
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
                    className="inline-flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-2.5 text-xs font-semibold text-zinc-400 transition hover:bg-white/[0.05] hover:text-white"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download data
                  </button>

                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-2.5 text-xs font-semibold text-zinc-400 transition hover:bg-white/[0.05] hover:text-white"
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                    Generate API key
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
                onClick={() =>
                  setDeleteModal(true)
                }
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

              <div className="rounded-2xl border border-violet-500/10 bg-violet-500/[0.04] p-5">

                <div className="flex items-start gap-3">

                  <Shield className="mt-0.5 h-5 w-5 text-violet-400" />

                  <div>
                    <p className="text-sm font-semibold text-white">
                      Secure authorization
                    </p>

                    <p className="mt-1 text-xs leading-5 text-zinc-600">
                      You'll be redirected to authorize
                      LumoClip. Your login credentials
                      are never stored by LumoClip.
                    </p>
                  </div>

                </div>

              </div>

              <div className="mt-6 flex gap-3">

                <button
                  type="button"
                  onClick={() =>
                    setConnectModal(null)
                  }
                  className="flex-1 rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-3 text-xs font-semibold text-zinc-400 hover:bg-white/[0.05]"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={confirmConnect}
                  className="flex-1 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3 text-xs font-semibold text-white shadow-lg shadow-violet-600/20"
                >
                  Continue
                  <ExternalLink className="ml-1.5 inline h-3 w-3" />
                </button>

              </div>

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

              <div className="mt-6 flex gap-3">

                <button
                  type="button"
                  onClick={() =>
                    setDeleteModal(false)
                  }
                  className="flex-1 rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-3 text-xs font-semibold text-zinc-400 transition hover:bg-white/[0.05]"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDeleteModal(false);

                    console.warn(
                      'Delete account API not implemented yet.'
                    );
                  }}
                  className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-xs font-semibold text-white transition hover:bg-red-500"
                >
                  Delete permanently
                </button>

              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};