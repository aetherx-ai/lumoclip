import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  AlertCircle,
  Bell,
  Check,
  ChevronDown,
  CreditCard,
  FolderOpen,
  Home,
  LogOut,
  Menu,
  Plus,
  Settings,
  Sparkles,
  UserRound,
  Video,
  X,
  Zap,
  LayoutDashboard,
  ArrowUpRight,
  Command,
  Circle,
  Layers3,
} from "lucide-react";

import type { User } from "../types.js";

import { supabase } from "../lib/supabase";

import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type Notification,
} from "../services/api";

/* =========================================================
   TYPES
========================================================= */

type ActiveTab =
  | "landing"
  | "dashboard"
  | "projects"
  | "pricing"
  | "settings";

interface NavbarProps {
  user: User | null;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenNewProject: () => void;
  onOpenAuth: () => void;
  onLogout: () => void;
}

/* =========================================================
   HELPERS
========================================================= */

const getInitials = (
  name?: string | null
): string => {
  if (!name?.trim()) return "U";

  return (
    name
      .trim()
      .split(/\s+/)
      .map((part) => part.charAt(0))
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U"
  );
};

const getPlanLabel = (
  plan?: string | null
): string => {
  return plan?.trim()
    ? plan.toUpperCase()
    : "FREE";
};

/* =========================================================
   AVATAR
========================================================= */

interface AvatarProps {
  name?: string | null;
  avatar?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
}

const Avatar: React.FC<AvatarProps> = ({
  name,
  avatar,
  size = "md",
}) => {
  const [failed, setFailed] =
    useState(false);

  const sizeClass = {
    xs: "h-7 w-7 text-[8px]",
    sm: "h-8 w-8 text-[9px]",
    md: "h-10 w-10 text-[10px]",
    lg: "h-12 w-12 text-xs",
  }[size];

  if (avatar && !failed) {
    return (
      <img
        src={avatar}
        alt={
          name
            ? `${name} avatar`
            : "User avatar"
        }
        onError={() => setFailed(true)}
        referrerPolicy="no-referrer"
        className={`
          ${sizeClass}
          shrink-0
          rounded-full
          object-cover
          ring-1
          ring-white/15
          shadow-[0_0_30px_rgba(34,211,238,.18)]
        `}
      />
    );
  }

  return (
    <div
      className={`
        ${sizeClass}
        relative
        flex
        shrink-0
        items-center
        justify-center
        overflow-hidden
        rounded-full
        bg-gradient-to-br
        from-cyan-300
        via-sky-500
        to-blue-700
        font-black
        text-white
        shadow-[0_0_30px_rgba(14,165,233,.28)]
        ring-1
        ring-white/15
      `}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,.35),transparent_35%)]" />
      <span className="relative z-10">
        {getInitials(name)}
      </span>
    </div>
  );
};

/* =========================================================
   NAV ITEM
========================================================= */

interface NavItemProps {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({
  label,
  icon,
  active,
  onClick,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={
        active ? "page" : undefined
      }
      className={`
        group
        relative
        flex
        items-center
        gap-2
        rounded-xl
        px-3.5
        py-2.5
        text-[11px]
        font-bold
        tracking-[-0.01em]
        transition-all
        duration-300
        ${
          active
            ? `
              bg-white/[0.075]
              text-white
              shadow-[inset_0_1px_0_rgba(255,255,255,.07)]
            `
            : `
              text-zinc-500
              hover:bg-white/[0.045]
              hover:text-zinc-200
            `
        }
      `}
    >
      {active && (
        <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
          <span className="absolute -left-10 top-0 h-full w-8 rotate-[20deg] bg-white/10 blur-md animate-[navShine_4s_ease-in-out_infinite]" />
        </span>
      )}

      <span
        className={`
          relative
          z-10
          transition-all
          duration-300
          ${
            active
              ? "scale-105 text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,.5)]"
              : "text-zinc-600 group-hover:text-cyan-300"
          }
        `}
      >
        {icon}
      </span>

      <span className="relative z-10">
        {label}
      </span>

      {active && (
        <>
          <span className="absolute bottom-0 left-1/2 h-[2px] w-7 -translate-x-1/2 rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 shadow-[0_0_14px_rgba(34,211,238,.9)]" />

          <span className="absolute -bottom-1 left-1/2 h-2 w-12 -translate-x-1/2 rounded-full bg-cyan-400/20 blur-md" />
        </>
      )}
    </button>
  );
};

/* =========================================================
   DROPDOWN ITEM
========================================================= */

interface DropdownItemProps {
  icon: React.ReactNode;
  label: string;
  description?: string;
  onClick: () => void;
  danger?: boolean;
}

const DropdownItem: React.FC<
  DropdownItemProps
> = ({
  icon,
  label,
  description,
  onClick,
  danger = false,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        group
        flex
        w-full
        items-center
        gap-3
        rounded-xl
        px-3
        py-2.5
        text-left
        transition-all
        duration-200
        ${
          danger
            ? "text-red-400 hover:bg-red-500/[0.08]"
            : "text-zinc-300 hover:bg-white/[0.045] hover:text-white"
        }
      `}
    >
      <span
        className={`
          flex
          h-9
          w-9
          shrink-0
          items-center
          justify-center
          rounded-xl
          border
          transition-all
          ${
            danger
              ? "border-red-500/10 bg-red-500/[0.07] text-red-400"
              : "border-white/[0.05] bg-white/[0.035] text-zinc-500 group-hover:border-cyan-500/15 group-hover:bg-cyan-500/10 group-hover:text-cyan-300"
          }
        `}
      >
        {icon}
      </span>

      <span className="min-w-0">
        <span className="block text-[11px] font-bold">
          {label}
        </span>

        {description && (
          <span className="mt-0.5 block truncate text-[9px] text-zinc-600">
            {description}
          </span>
        )}
      </span>

      {!danger && (
        <ArrowUpRight className="ml-auto h-3.5 w-3.5 text-zinc-700 opacity-0 transition group-hover:opacity-100 group-hover:text-cyan-400" />
      )}
    </button>
  );
};

/* =========================================================
   MAIN NAVBAR
========================================================= */

export const Navbar: React.FC<
  NavbarProps
> = ({
  user,
  activeTab,
  setActiveTab,
  onOpenNewProject,
  onOpenAuth,
  onLogout,
}) => {
  const [profileOpen, setProfileOpen] =
    useState(false);

  const [mobileOpen, setMobileOpen] =
    useState(false);

  const [
    notificationsOpen,
    setNotificationsOpen,
  ] = useState(false);

  const [
    notifications,
    setNotifications,
  ] = useState<Notification[]>([]);

  const [
    notificationsLoading,
    setNotificationsLoading,
  ] = useState(false);

  const [
    notificationAction,
    setNotificationAction,
  ] = useState<string | null>(null);

  const dropdownRef =
    useRef<HTMLDivElement | null>(null);

  const notificationRef =
    useRef<HTMLDivElement | null>(null);

  /* =======================================================
     REALTIME NOTIFICATIONS
  ======================================================= */

  useEffect(() => {
    if (!user?.id) {
      setNotifications([]);
      return;
    }

    let active = true;

    const loadNotifications =
      async () => {
        try {
          setNotificationsLoading(true);

          const items =
            await fetchNotifications();

          if (active) {
            setNotifications(items);
          }
        } catch (error) {
          console.error(
            "Failed to load notifications:",
            error
          );

          if (active) {
            setNotifications([]);
          }
        } finally {
          if (active) {
            setNotificationsLoading(false);
          }
        }
      };

    void loadNotifications();

    const channel = supabase
      .channel(
        `lumoclip-notifications:${user.id}`
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          void loadNotifications();
        }
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(
        channel
      );
    };
  }, [user?.id]);

  /* =======================================================
     COUNTS
  ======================================================= */

  const unreadCount =
    notifications.reduce(
      (count, notification) =>
        count +
        (notification.read ? 0 : 1),
      0
    );

  const planLabel = getPlanLabel(
    user?.plan
  );

  const dashboardActive =
    activeTab === "dashboard" ||
    activeTab === "projects";

  /* =======================================================
     NOTIFICATION HELPERS
  ======================================================= */

  const getNotificationIcon = (
    type: string
  ) => {
    if (
      type === "project_completed"
    ) {
      return (
        <Check className="h-4 w-4 text-emerald-400" />
      );
    }

    if (type === "project_failed") {
      return (
        <AlertCircle className="h-4 w-4 text-red-400" />
      );
    }

    if (
      type === "credits_refunded"
    ) {
      return (
        <Zap className="h-4 w-4 text-amber-400" />
      );
    }

    return (
      <Sparkles className="h-4 w-4 text-cyan-400" />
    );
  };

  const getNotificationBg = (
    type: string
  ) => {
    if (
      type === "project_completed"
    ) {
      return "bg-emerald-500/10";
    }

    if (type === "project_failed") {
      return "bg-red-500/10";
    }

    if (
      type === "credits_refunded"
    ) {
      return "bg-amber-500/10";
    }

    return "bg-cyan-500/10";
  };

  const formatTime = (
    value: string
  ) => {
    const timestamp =
      new Date(value).getTime();

    const seconds = Math.max(
      0,
      Math.floor(
        (Date.now() - timestamp) /
          1000
      )
    );

    if (seconds < 60)
      return "Just now";

    const minutes = Math.floor(
      seconds / 60
    );

    if (minutes < 60)
      return `${minutes}m ago`;

    const hours = Math.floor(
      minutes / 60
    );

    if (hours < 24)
      return `${hours}h ago`;

    return `${Math.floor(hours / 24)}d ago`;
  };

  /* =======================================================
     NOTIFICATION ACTIONS
  ======================================================= */

  const handleNotificationClick =
    async (
      notification: Notification
    ) => {
      if (
        notification.read ||
        notificationAction
      ) {
        return;
      }

      setNotificationAction(
        notification.id
      );

      setNotifications(
        (current) =>
          current.map((item) =>
            item.id ===
            notification.id
              ? {
                  ...item,
                  read: true,
                }
              : item
          )
      );

      try {
        await markNotificationRead(
          notification.id
        );
      } catch (error) {
        console.error(
          "Failed to mark notification:",
          error
        );

        setNotifications(
          (current) =>
            current.map((item) =>
              item.id ===
              notification.id
                ? {
                    ...item,
                    read: false,
                  }
                : item
            )
        );
      } finally {
        setNotificationAction(null);
      }
    };

  const handleMarkAllRead =
    async () => {
      if (
        unreadCount === 0 ||
        notificationAction ===
          "all"
      ) {
        return;
      }

      setNotificationAction("all");

      const previous =
        notifications;

      setNotifications(
        (current) =>
          current.map((item) => ({
            ...item,
            read: true,
          }))
      );

      try {
        await markAllNotificationsRead();
      } catch (error) {
        console.error(
          "Failed to mark all:",
          error
        );

        setNotifications(previous);
      } finally {
        setNotificationAction(null);
      }
    };

  /* =======================================================
     OUTSIDE CLICK
  ======================================================= */

  useEffect(() => {
    const handleOutside = (
      event: MouseEvent
    ) => {
      const target =
        event.target as Node;

      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(
          target
        )
      ) {
        setProfileOpen(false);
      }

      if (
        notificationRef.current &&
        !notificationRef.current.contains(
          target
        )
      ) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutside
      );
    };
  }, []);

  /* =======================================================
     ESC
  ======================================================= */

  useEffect(() => {
    const handleEscape = (
      event: KeyboardEvent
    ) => {
      if (event.key === "Escape") {
        setProfileOpen(false);
        setNotificationsOpen(false);
        setMobileOpen(false);
      }
    };

    document.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, []);

  /* =======================================================
     MOBILE BODY LOCK
  ======================================================= */

  useEffect(() => {
    document.body.style.overflow =
      mobileOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  /* =======================================================
     NAVIGATION
  ======================================================= */

  const goTo = (
    tab: ActiveTab
  ) => {
    setActiveTab(tab);
    setProfileOpen(false);
    setNotificationsOpen(false);
    setMobileOpen(false);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleNewProject = () => {
    setProfileOpen(false);
    setNotificationsOpen(false);
    setMobileOpen(false);

    onOpenNewProject();
  };

  const handleLogout = () => {
    setProfileOpen(false);
    setNotificationsOpen(false);
    setMobileOpen(false);

    onLogout();
  };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <>
      <header
        className="
          sticky
          top-0
          z-[80]
          w-full
          border-b
          border-white/[0.055]
          bg-[#050609]/75
          backdrop-blur-2xl
        "
      >
        {/* =================================================
            TOP AURORA
        ================================================= */}

        <div
          className="
            pointer-events-none
            absolute
            inset-x-0
            top-0
            h-[1px]
            overflow-hidden
          "
        >
          <div
            className="
              absolute
              left-[-20%]
              top-0
              h-px
              w-[140%]
              bg-gradient-to-r
              from-transparent
              via-cyan-400
              to-transparent
              opacity-70
              blur-[1px]
              animate-[navbarLine_7s_linear_infinite]
            "
          />
        </div>

        {/* =================================================
            AMBIENT GLOW
        ================================================= */}

        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-24 top-[-120px] h-56 w-56 rounded-full bg-cyan-500/[0.055] blur-[70px]" />

          <div className="absolute left-1/2 top-[-150px] h-64 w-64 -translate-x-1/2 rounded-full bg-sky-500/[0.035] blur-[100px]" />

          <div className="absolute -right-24 top-[-100px] h-52 w-52 rounded-full bg-blue-600/[0.045] blur-[600px]" />
        </div>

        {/* =================================================
            NAV CONTENT
        ================================================= */}

        <div
          className="
            relative
            mx-auto
            flex
            h-[74px]
            max-w-[1500px]
            items-center
            justify-between
            px-4
            sm:px-6
            lg:px-8
          "
        >
          {/* =================================================
              BRAND
          ================================================= */}

          <button
            type="button"
            onClick={() =>
              goTo("landing")
            }
            className="
              group
              flex
              shrink-0
              items-center
              gap-3
            "
          >
            {/* LOGO */}

            <div className="relative">
              {/* aura */}

              <div
                className="
                  absolute
                  -inset-3
                  rounded-2xl
                  bg-cyan-400/10
                  blur-xl
                  opacity-70
                  transition-all
                  duration-500
                  group-hover:bg-cyan-400/20
                  group-hover:opacity-100
                "
              />

              {/* rotating ring */}

              <div
                className="
                  absolute
                  -inset-[1px]
                  rounded-[14px]
                  bg-[conic-gradient(from_0deg,transparent,rgba(34,211,238,.9),rgba(59,130,246,.7),transparent)]
                  animate-[spin_7s_linear_infinite]
                  group-hover:animate-[spin_2.5s_linear_infinite]
                "
              />

              {/* surface */}

              <div
                className="
                  relative
                  flex
                  h-10
                  w-10
                  items-center
                  justify-center
                  overflow-hidden
                  rounded-[13px]
                  border
                  border-white/[0.08]
                  bg-[#080c12]
                  shadow-[0_8px_30px_rgba(0,0,0,.35)]
                "
              >
                {/* shine */}

                <div
                  className="
                    pointer-events-none
                    absolute
                    -left-8
                    top-[-20%]
                    h-[140%]
                    w-6
                    rotate-[25deg]
                    bg-white/15
                    blur-md
                    animate-[logoShine_3.8s_ease-in-out_infinite]
                  "
                />

                {/* center glow */}

                <div className="absolute h-6 w-6 rounded-full bg-cyan-400/15 blur-lg" />

                <Video
                  className="
                    relative
                    z-10
                    h-[18px]
                    w-[18px]
                    text-cyan-300
                    drop-shadow-[0_0_10px_rgba(34,211,238,.7)]
                    transition-all
                    duration-500
                    group-hover:scale-110
                    group-hover:text-cyan-200
                  "
                />
              </div>
            </div>

            {/* WORDMARK */}

            <div className="flex items-center">
              <span
                className="
                  text-[18px]
                  font-black
                  tracking-[-0.07em]
                  text-white
                "
              >
                Lumo
              </span>

              <span
                className="
                  bg-gradient-to-r
                  from-cyan-300
                  via-sky-400
                  to-blue-500
                  bg-clip-text
                  text-[18px]
                  font-black
                  tracking-[-0.07em]
                  text-transparent
                "
              >
                Clip
              </span>
            </div>

            {/* AI BADGE */}

            <span
              className="
                hidden
                rounded-full
                border
                border-cyan-400/15
                bg-cyan-400/[0.035]
                px-2
                py-1
                text-[7px]
                font-black
                uppercase
                tracking-[0.2em]
                text-cyan-400/70
                transition-all
                group-hover:border-cyan-400/30
                group-hover:bg-cyan-400/[0.08]
                group-hover:text-cyan-300
                lg:block
              "
            >
              AI
            </span>
          </button>

          {/* =================================================
              DESKTOP NAV
          ================================================= */}

          <nav
            className="
              hidden
              items-center
              gap-1
              rounded-2xl
              border
              border-white/[0.045]
              bg-white/[0.015]
              p-1
              shadow-[inset_0_1px_0_rgba(255,255,255,.025)]
              md:flex
            "
          >
            <NavItem
              label="Home"
              icon={
                <Home className="h-3.5 w-3.5" />
              }
              active={
                activeTab === "landing"
              }
              onClick={() =>
                goTo("landing")
              }
            />

            <NavItem
              label="Workspace"
              icon={
                <Layers3 className="h-3.5 w-3.5" />
              }
              active={dashboardActive}
              onClick={() =>
                goTo("dashboard")
              }
            />

            <NavItem
              label="Pricing"
              icon={
                <CreditCard className="h-3.5 w-3.5" />
              }
              active={
                activeTab === "pricing"
              }
              onClick={() =>
                goTo("pricing")
              }
            />

            <NavItem
              label="Settings"
              icon={
                <Settings className="h-3.5 w-3.5" />
              }
              active={
                activeTab === "settings"
              }
              onClick={() =>
                goTo("settings")
              }
            />
          </nav>

          {/* =================================================
              RIGHT SIDE
          ================================================= */}

          <div className="flex items-center gap-2">
            {user ? (
              <>
                {/* CREDITS */}

                <button
                  type="button"
                  onClick={() =>
                    goTo("pricing")
                  }
                  className="
                    group
                    hidden
                    h-11
                    items-center
                    gap-2
                    rounded-xl
                    border
                    border-white/[0.07]
                    bg-white/[0.025]
                    px-3
                    transition-all
                    hover:border-cyan-400/20
                    hover:bg-cyan-400/[0.045]
                    sm:flex
                  "
                >
                  <span
                    className="
                      flex
                      h-7
                      w-7
                      items-center
                      justify-center
                      rounded-lg
                      border
                      border-cyan-400/10
                      bg-cyan-400/[0.07]
                    "
                  >
                    <Zap className="h-3.5 w-3.5 text-cyan-300 drop-shadow-[0_0_7px_rgba(34,211,238,.6)]" />
                  </span>

                  <span className="flex flex-col items-start leading-none">
                    <span className="text-[11px] font-black text-white">
                      {user.credits ??
                        0}
                    </span>

                    <span className="mt-1 text-[7px] font-bold uppercase tracking-[0.12em] text-zinc-600">
                      credits
                    </span>
                  </span>

                  <Plus className="ml-1 h-3 w-3 text-zinc-600 transition group-hover:text-cyan-300" />
                </button>

                {/* NEW PROJECT */}

                <button
                  type="button"
                  onClick={
                    handleNewProject
                  }
                  className="
                    group
                    relative
                    flex
                    h-11
                    items-center
                    gap-2
                    overflow-hidden
                    rounded-xl
                    bg-gradient-to-r
                    from-cyan-400
                    via-sky-500
                    to-blue-600
                    px-4
                    text-[10px]
                    font-black
                    text-white
                    shadow-[0_10px_35px_rgba(14,165,233,.22)]
                    transition-all
                    duration-300
                    hover:-translate-y-[1px]
                    hover:shadow-[0_15px_45px_rgba(14,165,233,.4)]
                    active:scale-[.97]
                  "
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-120%] transition-transform duration-700 group-hover:translate-x-[120%]" />

                  <Plus
                    className="
                      relative
                      z-10
                      h-4
                      w-4
                      transition-transform
                      duration-300
                      group-hover:rotate-90
                    "
                  />

                  <span className="relative z-10 hidden sm:inline">
                    New Project
                  </span>
                </button>

                {/* NOTIFICATIONS */}

                <div
                  ref={notificationRef}
                  className="relative"
                >
                  <button
                    type="button"
                    aria-label="Notifications"
                    aria-expanded={
                      notificationsOpen
                    }
                    onClick={() => {
                      setNotificationsOpen(
                        (v) => !v
                      );

                      setProfileOpen(
                        false
                      );
                    }}
                    className={`
                      relative
                      flex
                      h-11
                      w-11
                      items-center
                      justify-center
                      rounded-xl
                      border
                      transition-all
                      ${
                        notificationsOpen
                          ? "border-cyan-400/25 bg-cyan-400/10 text-white"
                          : "border-white/[0.07] bg-white/[0.025] text-zinc-500 hover:border-white/[0.13] hover:bg-white/[0.045] hover:text-white"
                      }
                    `}
                  >
                    <Bell
                      className={`
                        h-[17px]
                        w-[17px]
                        ${
                          unreadCount
                            ? "animate-[bellPulse_2s_ease-in-out_infinite]"
                            : ""
                        }
                      `}
                    />

                    {unreadCount >
                      0 && (
                      <>
                        <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-red-400 shadow-[0_0_9px_rgba(248,113,113,.9)]" />

                        <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-[#050609] bg-red-500 px-1 text-[7px] font-black text-white shadow-[0_0_14px_rgba(239,68,68,.45)]">
                          {unreadCount >
                          9
                            ? "9+"
                            : unreadCount}
                        </span>
                      </>
                    )}
                  </button>

                  {/* NOTIFICATION PANEL */}

                  {notificationsOpen && (
                    <div
                      className="
                        absolute
                        right-0
                        top-full
                        mt-3
                        w-[360px]
                        max-w-[calc(100vw-24px)]
                        overflow-hidden
                        rounded-2xl
                        border
                        border-white/[0.09]
                        bg-[#090a0f]/95
                        shadow-[0_30px_100px_rgba(0,0,0,.8)]
                        backdrop-blur-2xl
                        animate-[dropdownIn_.18s_ease-out]
                      "
                    >
                      <div className="relative overflow-hidden border-b border-white/[0.06] p-4">
                        <div className="absolute -right-12 -top-16 h-32 w-32 rounded-full bg-cyan-400/10 blur-3xl" />

                        <div className="relative flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-cyan-400/10 bg-cyan-400/[0.07]">
                                <Bell className="h-3.5 w-3.5 text-cyan-300" />
                              </div>

                              <div>
                                <p className="text-xs font-black text-white">
                                  Activity
                                </p>

                                <p className="text-[8px] text-zinc-600">
                                  Workspace updates
                                </p>
                              </div>
                            </div>
                          </div>

                          {unreadCount >
                            0 && (
                            <span className="rounded-full border border-cyan-400/15 bg-cyan-400/[0.07] px-2 py-1 text-[7px] font-black tracking-[0.12em] text-cyan-300">
                              {
                                unreadCount
                              }{" "}
                              NEW
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="max-h-[370px] overflow-y-auto">
                        {notificationsLoading &&
                        notifications.length ===
                          0 ? (
                          <div className="px-4 py-12 text-center">
                            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-cyan-400/15 border-t-cyan-400" />

                            <p className="mt-3 text-[9px] text-zinc-600">
                              Loading activity...
                            </p>
                          </div>
                        ) : notifications.length ===
                          0 ? (
                          <div className="px-4 py-12 text-center">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.025]">
                              <Bell className="h-4 w-4 text-zinc-700" />
                            </div>

                            <p className="mt-3 text-xs font-bold text-zinc-400">
                              All caught up
                            </p>

                            <p className="mt-1 text-[9px] text-zinc-700">
                              New activity will appear here.
                            </p>
                          </div>
                        ) : (
                          notifications.map(
                            (
                              notification
                            ) => (
                              <button
                                key={
                                  notification.id
                                }
                                type="button"
                                onClick={() =>
                                  void handleNotificationClick(
                                    notification
                                  )
                                }
                                className={`
                                  group
                                  flex
                                  w-full
                                  gap-3
                                  border-b
                                  border-white/[0.04]
                                  px-4
                                  py-3.5
                                  text-left
                                  transition-all
                                  hover:bg-white/[0.035]
                                  ${
                                    !notification.read
                                      ? "bg-cyan-400/[0.015]"
                                      : "opacity-60"
                                  }
                                `}
                              >
                                <div
                                  className={`
                                    flex
                                    h-9
                                    w-9
                                    shrink-0
                                    items-center
                                    justify-center
                                    rounded-xl
                                    ${getNotificationBg(
                                      notification.type
                                    )}
                                  `}
                                >
                                  {getNotificationIcon(
                                    notification.type
                                  )}
                                </div>

                                <div className="min-w-0 flex-1">
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="text-[11px] font-bold text-zinc-200">
                                      {
                                        notification.title
                                      }
                                    </p>

                                    {!notification.read && (
                                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,.8)]" />
                                    )}
                                  </div>

                                  <p className="mt-1 line-clamp-2 text-[9px] leading-4 text-zinc-600">
                                    {
                                      notification.message
                                    }
                                  </p>

                                  <p className="mt-1.5 text-[8px] text-zinc-700">
                                    {formatTime(
                                      notification.created_at
                                    )}
                                  </p>
                                </div>
                              </button>
                            )
                          )
                        )}
                      </div>

                      {unreadCount >
                        0 && (
                        <button
                          type="button"
                          disabled={
                            notificationAction ===
                            "all"
                          }
                          onClick={() =>
                            void handleMarkAllRead()
                          }
                          className="flex w-full items-center justify-center border-t border-white/[0.06] py-3 text-[8px] font-black uppercase tracking-[0.14em] text-cyan-400 transition hover:bg-cyan-400/[0.035] hover:text-cyan-300 disabled:opacity-50"
                        >
                          {notificationAction ===
                          "all"
                            ? "Updating..."
                            : "Mark all as read"}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* PROFILE */}

                <div
                  ref={dropdownRef}
                  className="relative"
                >
                  <button
                    type="button"
                    aria-label="Profile"
                    aria-expanded={
                      profileOpen
                    }
                    onClick={() => {
                      setProfileOpen(
                        (v) => !v
                      );

                      setNotificationsOpen(
                        false
                      );
                    }}
                    className={`
                      group
                      flex
                      h-11
                      items-center
                      gap-2
                      rounded-xl
                      border
                      p-1
                      pr-2
                      transition-all
                      ${
                        profileOpen
                          ? "border-cyan-400/25 bg-white/[0.06]"
                          : "border-white/[0.07] bg-white/[0.025] hover:border-white/[0.13] hover:bg-white/[0.045]"
                      }
                    `}
                  >
                    <div className="relative">
                      <Avatar
                        name={user.name}
                        avatar={
                          user.avatar
                        }
                        size="sm"
                      />

                      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#08090d] bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,.75)]" />
                    </div>

                    <div className="hidden min-w-0 text-left lg:block">
                      <p className="max-w-[90px] truncate text-[10px] font-black text-zinc-200">
                        {user.name ||
                          "User"}
                      </p>

                      <p className="mt-0.5 text-[7px] font-black uppercase tracking-[0.12em] text-cyan-400/70">
                        {planLabel}
                      </p>
                    </div>

                    <ChevronDown
                      className={`
                        hidden
                        h-3.5
                        w-3.5
                        text-zinc-600
                        transition-transform
                        sm:block
                        ${
                          profileOpen
                            ? "rotate-180 text-cyan-400"
                            : ""
                        }
                      `}
                    />
                  </button>

                  {/* PROFILE PANEL */}

                  {profileOpen && (
                    <div
                      className="
                        absolute
                        right-0
                        top-full
                        mt-3
                        w-[310px]
                        overflow-hidden
                        rounded-2xl
                        border
                        border-white/[0.09]
                        bg-[#090a0f]/95
                        shadow-[0_30px_100px_rgba(0,0,0,.82)]
                        backdrop-blur-2xl
                        animate-[dropdownIn_.18s_ease-out]
                      "
                    >
                      {/* PROFILE HEADER */}

                      <div className="relative overflow-hidden border-b border-white/[0.06] bg-gradient-to-br from-cyan-950/35 via-[#090a0f] to-blue-950/20 p-4">
                        <div className="absolute -right-14 -top-14 h-36 w-36 rounded-full bg-cyan-400/10 blur-3xl" />

                        <div className="relative flex items-center gap-3">
                          <div className="relative">
                            <Avatar
                              name={
                                user.name
                              }
                              avatar={
                                user.avatar
                              }
                              size="lg"
                            />

                            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#090a0f] bg-emerald-400" />
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-white">
                              {user.name ||
                                "User"}
                            </p>

                            <p className="mt-0.5 truncate text-[9px] text-zinc-600">
                              {user.email ||
                                "No email"}
                            </p>

                            <div className="mt-2 flex items-center gap-1.5">
                              <span className="rounded-md border border-cyan-400/15 bg-cyan-400/[0.07] px-1.5 py-0.5 text-[7px] font-black uppercase tracking-[0.1em] text-cyan-300">
                                {
                                  planLabel
                                }
                              </span>

                              <span className="flex items-center gap-1 text-[7px] font-bold text-emerald-400">
                                <Circle className="h-1.5 w-1.5 fill-current" />
                                Active
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* STATS */}

                        <div className="relative mt-4 grid grid-cols-2 gap-2">
                          <div className="rounded-xl border border-white/[0.055] bg-white/[0.025] p-2.5">
                            <p className="text-[7px] font-black uppercase tracking-[0.15em] text-zinc-600">
                              Plan
                            </p>

                            <p className="mt-1 text-[11px] font-black text-cyan-300">
                              {
                                planLabel
                              }
                            </p>
                          </div>

                          <div className="rounded-xl border border-amber-400/10 bg-amber-400/[0.035] p-2.5">
                            <p className="text-[7px] font-black uppercase tracking-[0.15em] text-zinc-600">
                              Credits
                            </p>

                            <p className="mt-1 flex items-center gap-1 text-[11px] font-black text-amber-300">
                              <Zap className="h-3 w-3" />
                              {user.credits ??
                                0}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* MENU */}

                      <div className="p-1.5">
                        <DropdownItem
                          icon={
                            <UserRound className="h-4 w-4" />
                          }
                          label="My Profile"
                          description="Manage your account"
                          onClick={() =>
                            goTo(
                              "settings"
                            )
                          }
                        />

                        <DropdownItem
                          icon={
                            <FolderOpen className="h-4 w-4" />
                          }
                          label="Projects"
                          description="View your video projects"
                          onClick={() =>
                            goTo(
                              "projects"
                            )
                          }
                        />

                        <DropdownItem
                          icon={
                            <CreditCard className="h-4 w-4" />
                          }
                          label="Billing & Credits"
                          description="Manage plan and usage"
                          onClick={() =>
                            goTo(
                              "pricing"
                            )
                          }
                        />

                        <DropdownItem
                          icon={
                            <Settings className="h-4 w-4" />
                          }
                          label="Settings"
                          description="Preferences and account"
                          onClick={() =>
                            goTo(
                              "settings"
                            )
                          }
                        />
                      </div>

                      {/* CREATE */}

                      <div className="border-t border-white/[0.06] p-2">
                        <button
                          type="button"
                          onClick={
                            handleNewProject
                          }
                          className="group relative flex w-full items-center justify-between overflow-hidden rounded-xl border border-cyan-400/10 bg-gradient-to-r from-cyan-400/[0.08] to-blue-500/[0.045] px-3 py-2.5 transition hover:border-cyan-400/20 hover:bg-cyan-400/[0.1]"
                        >
                          <div className="flex items-center gap-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-400/10 bg-cyan-400/[0.08]">
                              <Sparkles className="h-4 w-4 text-cyan-300" />
                            </span>

                            <span className="text-left">
                              <span className="block text-[10px] font-black text-white">
                                Create new project
                              </span>

                              <span className="block text-[8px] text-zinc-600">
                                Turn a video into clips
                              </span>
                            </span>
                          </div>

                          <Plus className="h-4 w-4 text-cyan-400 transition group-hover:rotate-90" />
                        </button>
                      </div>

                      {/* LOGOUT */}

                      <div className="border-t border-white/[0.06] p-1.5">
                        <DropdownItem
                          icon={
                            <LogOut className="h-4 w-4" />
                          }
                          label="Logout"
                          description="Sign out of LumoClip"
                          danger
                          onClick={
                            handleLogout
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* MOBILE */}

                <button
                  type="button"
                  aria-label={
                    mobileOpen
                      ? "Close menu"
                      : "Open menu"
                  }
                  aria-expanded={
                    mobileOpen
                  }
                  onClick={() =>
                    setMobileOpen(
                      (v) => !v
                    )
                  }
                  className="
                    flex
                    h-11
                    w-11
                    items-center
                    justify-center
                    rounded-xl
                    border
                    border-white/[0.07]
                    bg-white/[0.025]
                    text-zinc-400
                    transition
                    hover:border-cyan-400/20
                    hover:bg-cyan-400/[0.05]
                    hover:text-white
                    md:hidden
                  "
                >
                  {mobileOpen ? (
                    <X className="h-5 w-5" />
                  ) : (
                    <Menu className="h-5 w-5" />
                  )}
                </button>
              </>
            ) : (
              <>
                {/* SIGN IN */}

                <button
                  type="button"
                  onClick={onOpenAuth}
                  className="
                    hidden
                    h-11
                    items-center
                    gap-2
                    rounded-xl
                    border
                    border-white/[0.08]
                    bg-white/[0.025]
                    px-4
                    text-[10px]
                    font-bold
                    text-zinc-300
                    transition
                    hover:border-cyan-400/20
                    hover:bg-cyan-400/[0.05]
                    hover:text-white
                    sm:flex
                  "
                >
                  <Command className="h-3.5 w-3.5 text-cyan-400" />
                  Sign in
                </button>

                {/* START */}

                <button
                  type="button"
                  onClick={onOpenAuth}
                  className="
                    group
                    relative
                    flex
                    h-11
                    items-center
                    gap-2
                    overflow-hidden
                    rounded-xl
                    bg-gradient-to-r
                    from-cyan-400
                    via-sky-500
                    to-blue-600
                    px-4
                    text-[10px]
                    font-black
                    text-white
                    shadow-[0_10px_35px_rgba(14,165,233,.25)]
                    transition-all
                    hover:-translate-y-[1px]
                    hover:shadow-[0_15px_45px_rgba(14,165,233,.4)]
                    active:scale-[.97]
                  "
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-120%] transition-transform duration-700 group-hover:translate-x-[120%]" />

                  <Sparkles className="relative z-10 h-3.5 w-3.5" />

                  <span className="relative z-10 hidden sm:inline">
                    Get Started
                  </span>

                  <span className="relative z-10 sm:hidden">
                    Start
                  </span>
                </button>

                {/* MOBILE */}

                <button
                  type="button"
                  aria-label={
                    mobileOpen
                      ? "Close menu"
                      : "Open menu"
                  }
                  onClick={() =>
                    setMobileOpen(
                      (v) => !v
                    )
                  }
                  className="
                    flex
                    h-11
                    w-11
                    items-center
                    justify-center
                    rounded-xl
                    border
                    border-white/[0.07]
                    bg-white/[0.025]
                    text-zinc-400
                    transition
                    hover:border-cyan-400/20
                    hover:bg-cyan-400/[0.05]
                    hover:text-white
                    md:hidden
                  "
                >
                  {mobileOpen ? (
                    <X className="h-5 w-5" />
                  ) : (
                    <Menu className="h-5 w-5" />
                  )}
                </button>
              </>
            )}
          </div>
        </div>

        {/* =================================================
            MOBILE MENU
        ================================================= */}

        {mobileOpen && (
          <div
            className="
              relative
              border-t
              border-white/[0.055]
              bg-[#06070b]/96
              px-4
              pb-6
              pt-4
              shadow-[0_30px_100px_rgba(0,0,0,.8)]
              backdrop-blur-2xl
              md:hidden
            "
          >
            {/* ambient */}

            <div className="pointer-events-none absolute -left-20 top-0 h-40 w-40 rounded-full bg-cyan-400/[0.05] blur-3xl" />

            <div className="relative mx-auto max-w-[1480px]">
              <div className="rounded-2xl border border-white/[0.055] bg-white/[0.018] p-1.5">
                <NavItem
                  label="Home"
                  icon={
                    <Home className="h-4 w-4" />
                  }
                  active={
                    activeTab ===
                    "landing"
                  }
                  onClick={() =>
                    goTo("landing")
                  }
                />

                <NavItem
                  label="Workspace"
                  icon={
                    <Layers3 className="h-4 w-4" />
                  }
                  active={
                    dashboardActive
                  }
                  onClick={() =>
                    goTo("dashboard")
                  }
                />

                <NavItem
                  label="Pricing"
                  icon={
                    <CreditCard className="h-4 w-4" />
                  }
                  active={
                    activeTab ===
                    "pricing"
                  }
                  onClick={() =>
                    goTo("pricing")
                  }
                />

                <NavItem
                  label="Settings"
                  icon={
                    <Settings className="h-4 w-4" />
                  }
                  active={
                    activeTab ===
                    "settings"
                  }
                  onClick={() =>
                    goTo("settings")
                  }
                />
              </div>

              {/* MOBILE ACTIONS */}

              {user && (
                <>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={
                        handleNewProject
                      }
                      className="flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-600 text-[10px] font-black text-white shadow-[0_10px_30px_rgba(14,165,233,.2)]"
                    >
                      <Plus className="h-4 w-4" />
                      New Project
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        goTo(
                          "pricing"
                        )
                      }
                      className="flex h-12 items-center justify-center gap-2 rounded-xl border border-cyan-400/15 bg-cyan-400/[0.05] text-[10px] font-black text-cyan-300"
                    >
                      <Zap className="h-4 w-4" />

                      {user.credits ??
                        0}

                      <span className="text-[8px] text-cyan-500">
                        credits
                      </span>
                    </button>
                  </div>

                  {/* MOBILE PROFILE */}

                  <div className="mt-3 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="relative">
                          <Avatar
                            name={
                              user.name
                            }
                            avatar={
                              user.avatar
                            }
                            size="md"
                          />

                          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#08090d] bg-emerald-400" />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-xs font-black text-white">
                              {user.name ||
                                "User"}
                            </p>

                            <span className="rounded-md bg-cyan-400/[0.08] px-1.5 py-0.5 text-[7px] font-black text-cyan-300">
                              {
                                planLabel
                              }
                            </span>
                          </div>

                          <p className="mt-0.5 truncate text-[9px] text-zinc-600">
                            {user.email ||
                              "No email"}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={
                          handleLogout
                        }
                        aria-label="Logout"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-500/[0.07] text-red-400 transition hover:bg-red-500/10"
                      >
                        <LogOut className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* =====================================================
          NAVBAR ANIMATION KEYFRAMES
      ===================================================== */}

      <style>
        {`
          @keyframes navbarLine {
            0% {
              transform: translateX(-30%);
            }

            50% {
              transform: translateX(30%);
            }

            100% {
              transform: translateX(-30%);
            }
          }

          @keyframes logoShine {
            0% {
              transform: translateX(-25px) rotate(25deg);
              opacity: 0;
            }

            25% {
              opacity: .8;
            }

            50% {
              transform: translateX(70px) rotate(25deg);
              opacity: 0;
            }

            100% {
              transform: translateX(70px) rotate(25deg);
              opacity: 0;
            }
          }

          @keyframes navShine {
            0% {
              transform: translateX(-30px) rotate(20deg);
              opacity: 0;
            }

            35% {
              opacity: .7;
            }

            65% {
              opacity: 0;
            }

            100% {
              transform: translateX(160px) rotate(20deg);
              opacity: 0;
            }
          }

          @keyframes bellPulse {
            0%, 100% {
              transform: rotate(0deg);
            }

            10% {
              transform: rotate(10deg);
            }

            20% {
              transform: rotate(-10deg);
            }

            30% {
              transform: rotate(7deg);
            }

            40% {
              transform: rotate(0deg);
            }
          }

          @keyframes dropdownIn {
            from {
              opacity: 0;
              transform: translateY(-6px) scale(.98);
            }

            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
        `}
      </style>
    </>
  );
};

export default Navbar;