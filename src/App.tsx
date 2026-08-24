import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ComponentType,
} from "react";

import {
  Activity,
  Check,
  CheckCircle2,
  Cpu,
  Database,
  Layers3,
  Sparkles,
  Zap,
} from "lucide-react";

import { supabase } from "./lib/supabase";

import type {
  User,
  Project,
  Clip,
  Subscription,
} from "./types.js";

import {
  fetchMe,
  fetchProjects,
  fetchProjectDetails,
  deleteProjectApi,
  processVideoApi,
} from "./services/api.js";

import { Navbar } from "./components/Navbar.js";
const LandingPage = lazy(() =>
  import("./components/LandingPage.js").then((m) => ({
    default: m.LandingPage,
  })),
);

const DashboardView = lazy(() =>
  import("./components/DashboardView.js").then((m) => ({
    default: m.DashboardView,
  })),
);

const ProjectDetailView = lazy(() =>
  import("./components/ProjectDetailView.js").then((m) => ({
    default: m.ProjectDetailView,
  })),
);

const PricingView = lazy(() =>
  import("./components/PricingView.js").then((m) => ({
    default: m.PricingView,
  })),
);

const SettingsView = lazy(() =>
  import("./components/SettingsView.js").then((m) => ({
    default: m.SettingsView,
  })),
);
const AuthModal = lazy(() =>
  import("./components/AuthModal.js").then((m) => ({
    default: m.AuthModal,
  })),
);

const NewProjectModal = lazy(() =>
  import("./components/NewProjectModal.js").then((m) => ({
    default: m.NewProjectModal,
  })),
);

/* =========================================================
   NEW PROJECT MODAL TYPE
========================================================= */

type NewProjectModalProps =
  ComponentProps<typeof NewProjectModal> & {
    initialUrl?: string;
  };

const NewProjectModalWithInitialUrl =
  NewProjectModal as ComponentType<NewProjectModalProps>;

/* =========================================================
   ACTIVE TAB
========================================================= */

type ActiveTab =
  | "landing"
  | "dashboard"
  | "projects"
  | "pricing"
  | "settings";

/* =========================================================
   YOUTUBE URL NORMALIZER
========================================================= */

const normalizeYouTubeUrl = (value: string): string => {
  const raw = value.trim();

  if (!raw) {
    return "";
  }

  try {
    const url = new URL(raw);

    const host = url.hostname
      .toLowerCase()
      .replace(/^www\./, "")
      .replace(/^m\./, "");

    if (host === "youtu.be") {
      const videoId = url.pathname
        .replace(/^\/+/, "")
        .split("/")[0];

      if (videoId) {
        return `https://www.youtube.com/watch?v=${videoId}`;
      }
    }

    if (
      host === "youtube.com" ||
      host === "youtube-nocookie.com"
    ) {
      const videoId = url.searchParams.get("v");

      if (videoId) {
        return `https://www.youtube.com/watch?v=${videoId}`;
      }

      const shortsMatch = url.pathname.match(
        /^\/shorts\/([^/?#]+)/
      );

      if (shortsMatch?.[1]) {
        return `https://www.youtube.com/watch?v=${shortsMatch[1]}`;
      }

      const embedMatch = url.pathname.match(
        /^\/embed\/([^/?#]+)/
      );

      if (embedMatch?.[1]) {
        return `https://www.youtube.com/watch?v=${embedMatch[1]}`;
      }
    }

    return raw;
  } catch {
    return raw;
  }
};

/* =========================================================
   COMPACT PREMIUM LOADING SCREEN
========================================================= */

function PremiumLoadingScreen() {
  const [progress, setProgress] = useState(8);
  const [step, setStep] = useState(0);

  const steps = [
    {
      label: "AI Engine",
      text: "Initializing intelligence",
      icon: Cpu,
    },
    {
      label: "Workspace",
      text: "Securing your session",
      icon: Database,
    },
    {
      label: "Projects",
      text: "Syncing your content",
      icon: Layers3,
    },
    {
      label: "Ready",
      text: "Preparing workspace",
      icon: Sparkles,
    },
  ];

  useEffect(() => {
    const progressTimer = window.setInterval(() => {
      setProgress((value) => {
        if (value >= 96) return 96;

        if (value < 30) return Math.min(value + 4, 96);
        if (value < 60) return Math.min(value + 3, 96);
        if (value < 82) return Math.min(value + 2, 96);

        return Math.min(value + 1, 96);
      });
    }, 280);

    const stepTimer = window.setInterval(() => {
      setStep((value) =>
        Math.min(value + 1, steps.length - 1)
      );
    }, 1150);

    return () => {
      window.clearInterval(progressTimer);
      window.clearInterval(stepTimer);
    };
  }, []);

  const CurrentIcon = steps[step].icon;

  const particles = [
    ["8%", "18%", "2px", "4s", "0s"],
    ["17%", "72%", "2px", "5s", "1s"],
    ["27%", "32%", "1px", "4.5s", "1.5s"],
    ["39%", "82%", "2px", "5.5s", ".5s"],
    ["53%", "15%", "2px", "4.2s", "1.2s"],
    ["67%", "87%", "1px", "5.2s", ".8s"],
    ["78%", "25%", "2px", "4.8s", "1.7s"],
    ["91%", "68%", "2px", "5.8s", ".2s"],
  ];

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#030306] px-4 text-white">

      {/* =====================================================
          BACKGROUND
      ===================================================== */}

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(124,58,237,.13),transparent_34%),radial-gradient(circle_at_10%_20%,rgba(99,102,241,.07),transparent_28%),radial-gradient(circle_at_90%_80%,rgba(139,92,246,.07),transparent_30%)]" />

      {/* Aurora */}

      <div className="pointer-events-none absolute -left-40 -top-40 h-[420px] w-[420px] rounded-full bg-violet-700/[0.08] blur-[60px] animate-[auroraOne_9s_ease-in-out_infinite]" />

      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[440px] w-[440px] rounded-full bg-indigo-600/[0.08] blur-[70px] animate-[auroraTwo_11s_ease-in-out_infinite]" />

      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[360px] w-[360px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/[0.07] blur-[60px] animate-[corePulse_4s_ease-in-out_infinite]" />

      {/* Grid */}

      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage: `
            linear-gradient(
              rgba(139,92,246,.12) 1px,
              transparent 1px
            ),
            linear-gradient(
              90deg,
              rgba(139,92,246,.12) 1px,
              transparent 1px
            )
          `,
          backgroundSize: "70px 70px",
          maskImage:
            "radial-gradient(ellipse at center, black, transparent 70%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, black, transparent 70%)",
        }}
      />

      {/* Particles */}

      {particles.map(
        ([left, top, size, duration, delay], index) => (
          <span
            key={index}
            className="pointer-events-none absolute rounded-full bg-violet-300"
            style={{
              left,
              top,
              width: size,
              height: size,
              animation: `particleFloat ${duration} ease-in-out ${delay} infinite`,
              boxShadow:
                "0 0 10px rgba(167,139,250,.75)",
            }}
          />
        )
      )}

      {/* Scanline */}

      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-300/70 to-transparent shadow-[0_0_18px_rgba(139,92,246,.7)] animate-[scanline_5s_linear_infinite]" />

      {/* =====================================================
          MAIN
      ===================================================== */}

      <div className="relative z-10 w-full max-w-[390px]">

        {/* ===================================================
            BRAND
        =================================================== */}

        <div className="mb-6 text-center">

          <div className="relative mx-auto mb-4 h-[76px] w-[76px]">

            {/* Glow */}

            <div className="absolute -inset-6 rounded-[28px] bg-violet-600/10 blur-2xl animate-[logoGlow_3s_ease-in-out_infinite]" />

            {/* Orbit */}

            <div className="absolute -inset-3 rounded-[25px] border border-violet-400/15 animate-[orbitSpin_8s_linear_infinite]" />

            <div className="absolute -inset-1 rounded-[23px] border border-indigo-300/[0.08] [transform:rotateX(60deg)] animate-[orbitTilt_6s_linear_infinite]" />

            {/* Orbit dot */}

            <span className="absolute left-1/2 top-[-5px] h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-violet-300 shadow-[0_0_12px_rgba(167,139,250,.95)]" />

            {/* Logo */}

            <div className="relative flex h-[70px] w-[70px] items-center justify-center rounded-[22px] border border-white/[0.13] bg-gradient-to-br from-violet-500 via-purple-600 to-indigo-900 shadow-[0_0_55px_rgba(124,58,237,.28),inset_0_1px_0_rgba(255,255,255,.22)] animate-[logoFloat_3.5s_ease-in-out_infinite]">

              {/* Shine */}

              <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[21px]">
                <div className="absolute -left-1/2 top-[-30%] h-[160%] w-[38%] rotate-[28deg] bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[logoSweep_3.5s_ease-in-out_infinite]" />
              </div>

              <div className="relative flex h-9 w-9 items-center justify-center rounded-[13px] border border-white/15 bg-black/20 shadow-inner">
                <span className="text-xl font-black tracking-[-0.08em] text-white">
                  L
                </span>
              </div>

              {/* Online */}

              <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-[#030306] bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,.7)]">
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
                <span className="absolute h-3 w-3 rounded-full border border-white/60 animate-ping" />
              </span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-1.5">
            <h1 className="text-[22px] font-black tracking-[-0.055em]">
              LumoClip
            </h1>

            <span className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-indigo-400 bg-clip-text text-[22px] font-black tracking-[-0.055em] text-transparent">
              AI
            </span>

            <span className="rounded-full border border-emerald-400/15 bg-emerald-400/[0.05] px-1.5 py-0.5 text-[6px] font-black uppercase tracking-[0.15em] text-emerald-300/80">
              Online
            </span>
          </div>

          <p className="mt-1.5 text-[10px] font-medium text-zinc-600">
            AI-powered content repurposing
          </p>
        </div>

        {/* ===================================================
            LOADING CARD
        =================================================== */}

        <div className="relative rounded-[22px] p-[1px]">

          {/* Animated border */}

          <div className="pointer-events-none absolute inset-0 rounded-[22px] bg-[conic-gradient(from_0deg,transparent,rgba(139,92,246,.7),transparent_25%,transparent_55%,rgba(99,102,241,.55),transparent_80%)] animate-[borderSpin_5s_linear_infinite]" />

          <div className="relative overflow-hidden rounded-[21px] border border-white/[0.07] bg-[#08080d]/95 p-4 shadow-[0_25px_80px_rgba(0,0,0,.55)] backdrop-blur-xl">

            {/* Top beam */}

            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-300/70 to-transparent" />

            {/* Card glow */}

            <div className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full bg-violet-500/10 blur-2xl" />

            {/* Current status */}

            <div className="relative flex items-center gap-3">

              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border border-violet-400/15 bg-violet-500/[0.08]">

                <div className="absolute inset-0 rounded-[14px] border border-violet-400/10 animate-[iconPulse_2s_ease-in-out_infinite]" />

                <div className="absolute -inset-2 rounded-[18px] bg-violet-500/5 blur-lg" />

                <CurrentIcon
                  key={step}
                  className="relative h-[17px] w-[17px] text-violet-300 animate-[iconEnter_.35s_ease-out]"
                />

                <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-violet-300 shadow-[0_0_8px_rgba(167,139,250,.9)]" />
              </div>

              <div className="min-w-0 flex-1">

                <div className="flex items-center justify-between gap-3">

                  <div className="min-w-0">
                    <p
                      key={step}
                      className="truncate text-[11px] font-bold text-zinc-100 animate-[textEnter_.3s_ease-out]"
                    >
                      {steps[step].text}
                    </p>

                    <p className="mt-0.5 text-[8px] font-medium text-zinc-600">
                      {steps[step].label}
                    </p>
                  </div>

                  <span className="rounded-md border border-violet-400/10 bg-violet-400/[0.05] px-1.5 py-1 font-mono text-[8px] font-bold text-violet-300">
                    {progress}%
                  </span>
                </div>

                {/* Progress */}

                <div className="relative mt-2.5 h-1 overflow-hidden rounded-full bg-white/[0.05]">

                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-violet-500/30 blur-sm transition-all duration-500"
                    style={{
                      width: `${progress}%`,
                    }}
                  />

                  <div
                    className="relative h-full rounded-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-indigo-400 transition-[width] duration-500 ease-out"
                    style={{
                      width: `${progress}%`,
                    }}
                  >
                    <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-r from-transparent via-white/60 to-transparent blur-[2px] animate-[progressShine_1.2s_linear_infinite]" />
                  </div>
                </div>
              </div>
            </div>

            {/* =================================================
                STEPS
            ================================================= */}

            <div className="mt-4 grid grid-cols-4 gap-1">

              {steps.map((item, index) => {
                const completed = index < step;
                const active = index === step;

                const StepIcon = completed
                  ? Check
                  : item.icon;

                return (
                  <div
                    key={item.label}
                    className={`rounded-lg border px-1.5 py-2 transition-all duration-500 ${
                      active
                        ? "border-violet-400/20 bg-violet-400/[0.07]"
                        : completed
                          ? "border-emerald-400/10 bg-emerald-400/[0.025]"
                          : "border-white/[0.04] bg-white/[0.015]"
                    }`}
                  >
                    <div className="flex items-center gap-1">

                      <span
                        className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded ${
                          completed
                            ? "bg-emerald-400/10 text-emerald-300"
                            : active
                              ? "bg-violet-400/10 text-violet-300"
                              : "bg-white/[0.03] text-zinc-700"
                        }`}
                      >
                        <StepIcon className="h-2 w-2" />
                      </span>

                      <span
                        className={`truncate text-[6px] font-black uppercase tracking-[0.06em] ${
                          completed
                            ? "text-emerald-400/70"
                            : active
                              ? "text-violet-300/90"
                              : "text-zinc-700"
                        }`}
                      >
                        {item.label}
                      </span>
                    </div>

                    <div className="mt-1 flex items-center gap-1">
                      <span
                        className={`h-1 w-1 rounded-full ${
                          completed
                            ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,.7)]"
                            : active
                              ? "bg-violet-400 shadow-[0_0_6px_rgba(167,139,250,.7)] animate-pulse"
                              : "bg-zinc-800"
                        }`}
                      />

                      <span className="text-[6px] text-zinc-600">
                        {completed
                          ? "Done"
                          : active
                            ? "Active"
                            : "Queued"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* =================================================
                SYSTEM
            ================================================= */}

            <div className="mt-3 flex items-center justify-between border-t border-white/[0.045] pt-3">

              <div className="flex items-center gap-1.5">

                <span className="relative flex h-4 w-4 items-center justify-center rounded-full border border-emerald-400/10 bg-emerald-400/[0.04]">
                  <span className="h-1 w-1 rounded-full bg-emerald-400 shadow-[0_0_7px_rgba(52,211,153,.8)]" />
                  <span className="absolute inset-0 rounded-full border border-emerald-400/10 animate-ping" />
                </span>

                <div>
                  <p className="text-[6px] font-black uppercase tracking-[0.15em] text-zinc-600">
                    System
                  </p>

                  <p className="text-[7px] font-semibold text-zinc-400">
                    All services operational
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 text-[7px] font-bold text-zinc-700">
                <Activity className="h-2.5 w-2.5 text-violet-400/60" />
                Live
              </div>
            </div>
          </div>
        </div>

        {/* ===================================================
            FOOTER
        =================================================== */}

        <div className="mt-4 flex items-center justify-center gap-1.5">

          <Sparkles className="h-3 w-3 text-violet-400 animate-[sparklePulse_2s_ease-in-out_infinite]" />

          <span className="text-[8px] font-medium text-zinc-600">
            {step === 0
              ? "Warming up your AI engine"
              : step === 1
                ? "Securing your workspace"
                : step === 2
                  ? "Syncing your content"
                  : "Finalizing your workspace"}
          </span>

          <span className="flex">
            <span className="animate-bounce text-zinc-600">
              .
            </span>
            <span className="animate-bounce [animation-delay:150ms] text-zinc-600">
              .
            </span>
            <span className="animate-bounce [animation-delay:300ms] text-zinc-600">
              .
            </span>
          </span>
        </div>

        <div className="mt-3 flex items-center justify-center gap-1.5 text-[6px] font-bold uppercase tracking-[0.2em] text-zinc-800">
          <Zap className="h-2.5 w-2.5 text-violet-500/50" />
          Lumo Intelligence
          <span className="h-0.5 w-0.5 rounded-full bg-zinc-800" />
          Secure Session
          <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500/40" />
        </div>
      </div>

      {/* =====================================================
          ANIMATIONS
      ===================================================== */}

      <style>{`
        @keyframes scanline {
          0% {
            transform: translateY(-10vh);
            opacity: 0;
          }

          10% {
            opacity: .8;
          }

          50% {
            opacity: .5;
          }

          90% {
            opacity: .8;
          }

          100% {
            transform: translateY(110vh);
            opacity: 0;
          }
        }

        @keyframes particleFloat {
          0%,
          100% {
            transform: translate3d(0, 0, 0) scale(1);
            opacity: .15;
          }

          50% {
            transform: translate3d(8px, -20px, 0) scale(1.4);
            opacity: .7;
          }
        }

        @keyframes auroraOne {
          0%,
          100% {
            transform: translate3d(0, 0, 0) scale(1);
          }

          50% {
            transform: translate3d(40px, 30px, 0) scale(1.1);
          }
        }

        @keyframes auroraTwo {
          0%,
          100% {
            transform: translate3d(0, 0, 0) scale(1);
          }

          50% {
            transform: translate3d(-35px, -25px, 0) scale(1.1);
          }
        }

        @keyframes corePulse {
          0%,
          100% {
            opacity: .45;
            transform: translate(-50%, -50%) scale(.9);
          }

          50% {
            opacity: .9;
            transform: translate(-50%, -50%) scale(1.08);
          }
        }

        @keyframes logoGlow {
          0%,
          100% {
            opacity: .35;
            transform: scale(.9);
          }

          50% {
            opacity: .85;
            transform: scale(1.08);
          }
        }

        @keyframes logoFloat {
          0%,
          100% {
            transform: translateY(0);
          }

          50% {
            transform: translateY(-4px);
          }
        }

        @keyframes logoSweep {
          0%,
          25% {
            transform: translateX(-160%) rotate(28deg);
            opacity: 0;
          }

          45% {
            opacity: .8;
          }

          75%,
          100% {
            transform: translateX(300%) rotate(28deg);
            opacity: 0;
          }
        }

        @keyframes orbitSpin {
          from {
            transform: rotate(0deg);
          }

          to {
            transform: rotate(360deg);
          }
        }

        @keyframes orbitTilt {
          from {
            transform: rotateX(60deg) rotateZ(0deg);
          }

          to {
            transform: rotateX(60deg) rotateZ(360deg);
          }
        }

        @keyframes borderSpin {
          from {
            transform: rotate(0deg);
          }

          to {
            transform: rotate(360deg);
          }
        }

        @keyframes iconPulse {
          0%,
          100% {
            opacity: .2;
            transform: scale(1);
          }

          50% {
            opacity: .9;
            transform: scale(1.08);
          }
        }

        @keyframes iconEnter {
          from {
            opacity: 0;
            transform: scale(.65) rotate(-10deg);
          }

          to {
            opacity: 1;
            transform: scale(1) rotate(0);
          }
        }

        @keyframes textEnter {
          from {
            opacity: 0;
            transform: translateY(3px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes progressShine {
          0% {
            transform: translateX(-60px);
            opacity: 0;
          }

          20% {
            opacity: 1;
          }

          100% {
            transform: translateX(100px);
            opacity: 0;
          }
        }

        @keyframes sparklePulse {
          0%,
          100% {
            opacity: .4;
            transform: scale(.9) rotate(0deg);
          }

          50% {
            opacity: 1;
            transform: scale(1.15) rotate(8deg);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            animation-duration: .01ms !important;
            animation-iteration-count: 1 !important;
            scroll-behavior: auto !important;
          }
        }
      `}</style>
    </div>
  );
}

/* =========================================================
   APP
========================================================= */

export default function App() {
  /* =======================================================
     STATE
  ======================================================= */

  const [user, setUser] =
    useState<User | null>(null);

  const [subscription, setSubscription] =
    useState<Subscription | null>(null);

  const [activeTab, setActiveTab] =
    useState<ActiveTab>("landing");

  const [projects, setProjects] =
    useState<Project[]>([]);

  const [selectedProject, setSelectedProject] =
    useState<Project | null>(null);

  const [selectedClips, setSelectedClips] =
    useState<Clip[]>([]);

  const [isNewProjectModalOpen, setIsNewProjectModalOpen] =
    useState(false);

  const [isAuthModalOpen, setIsAuthModalOpen] =
    useState(false);

  const [newProjectInitialUrl, setNewProjectInitialUrl] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const appInitialized =
    useRef(false);

  /* =======================================================
     AUTH PENDING URL
  ======================================================= */

  const pendingProjectUrlRef =
    useRef("");

  /* =======================================================
     POLLING
  ======================================================= */

  const pollingTimers =
    useRef<Record<string, number | undefined>>({});

  const pollingActive =
    useRef<Record<string, boolean>>({});

  /* =======================================================
     LOAD AUTHENTICATED USER
  ======================================================= */

  const loadAuthenticatedUser =
    async (): Promise<boolean> => {
      try {
        const authRes = await fetchMe();

        if (!authRes?.user) {
          setUser(null);
          setSubscription(null);
          setProjects([]);
          setSelectedProject(null);
          setSelectedClips([]);
          setActiveTab("landing");

          return false;
        }

        setUser(authRes.user);

        setSubscription(
          authRes.subscription ?? null
        );

        try {
          const list = await fetchProjects();

          setProjects(
            Array.isArray(list)
              ? list
              : []
          );
        } catch (error) {
          console.error(
            "Failed to load projects:",
            error
          );

          setProjects([]);
        }

        return true;
      } catch (error) {
        console.error(
          "Failed to load authenticated user:",
          error
        );

        setUser(null);
        setSubscription(null);
        setProjects([]);
        setSelectedProject(null);
        setSelectedClips([]);
        setActiveTab("landing");

        return false;
      }
    };

  /* =======================================================
     STOP PROJECT POLLING
  ======================================================= */

  const stopProjectPolling =
    (projectId: string) => {
      pollingActive.current[projectId] = false;

      const timer =
        pollingTimers.current[projectId];

      if (timer !== undefined) {
        window.clearTimeout(timer);
      }

      delete pollingTimers.current[projectId];
      delete pollingActive.current[projectId];
    };

  /* =======================================================
     STOP ALL POLLING
  ======================================================= */

  const stopAllPolling = () => {
    Object.keys(
      pollingActive.current
    ).forEach((projectId) => {
      stopProjectPolling(projectId);
    });
  };

  /* =======================================================
     PROJECT PROCESSING POLLING
  ======================================================= */

  const pollProjectProcessing =
    async (projectId: string) => {
      if (
        pollingActive.current[projectId]
      ) {
        return;
      }

      pollingActive.current[projectId] = true;

      const MAX_ATTEMPTS = 600;

      let attempts = 0;

      const poll = async () => {
        if (
          !pollingActive.current[projectId]
        ) {
          return;
        }

        try {
          const details =
            await fetchProjectDetails(projectId);

          if (
            !pollingActive.current[projectId]
          ) {
            return;
          }

          if (!details?.project) {
            throw new Error(
              "Project details unavailable"
            );
          }

          const updatedProject =
            details.project;

          const updatedClips =
            Array.isArray(details.clips)
              ? details.clips
              : [];

          setSelectedProject(
            updatedProject
          );

          setSelectedClips(
            updatedClips
          );

          setProjects(
            (previous) =>
              previous.map(
                (project) =>
                  project.id === projectId
                    ? {
                        ...project,
                        ...updatedProject,
                      }
                    : project
              )
          );

          if (
            String(updatedProject.status) ===
            "completed"
          ) {
            try {
              const latestProjects =
                await fetchProjects();

              if (
                Array.isArray(latestProjects)
              ) {
                setProjects(
                  latestProjects
                );
              }
            } catch (error) {
              console.warn(
                "Final project list refresh failed:",
                error
              );
            }

            try {
              const finalDetails =
                await fetchProjectDetails(
                  projectId
                );

              setSelectedProject(
                finalDetails.project
              );

              setSelectedClips(
                Array.isArray(
                  finalDetails.clips
                )
                  ? finalDetails.clips
                  : []
              );
            } catch (error) {
              console.warn(
                "Final detail refresh failed:",
                error
              );
            }

            setActiveTab("projects");

            stopProjectPolling(projectId);

            return;
          }

          if (
            String(updatedProject.status) ===
            "failed"
          ) {
            setActiveTab("projects");

            stopProjectPolling(projectId);

            return;
          }

          attempts++;

          if (
            attempts >= MAX_ATTEMPTS
          ) {
            stopProjectPolling(projectId);
            return;
          }

          pollingTimers.current[projectId] =
            window.setTimeout(
              poll,
              1500
            );
        } catch (error) {
          console.error(
            "Project polling failed:",
            error
          );

          attempts++;

          if (
            attempts >= MAX_ATTEMPTS
          ) {
            stopProjectPolling(projectId);
            return;
          }

          pollingTimers.current[projectId] =
            window.setTimeout(
              poll,
              2000
            );
        }
      };

      poll();
    };

  /* =======================================================
     INITIALIZATION
  ======================================================= */

  useEffect(() => {
    let mounted = true;

    const initializeApp =
      async () => {
        try {
          const {
            data: { session },
          } =
            await supabase.auth.getSession();

          if (!mounted) {
            return;
          }

          if (session?.user) {
            await loadAuthenticatedUser();

            if (!mounted) {
              return;
            }

            setActiveTab("landing");

            try {
              const list =
                await fetchProjects();

              if (
                mounted &&
                Array.isArray(list)
              ) {
                setProjects(list);

                list
                  .filter(
                    (project) =>
                      String(
                        project.status
                      ) === "processing"
                  )
                  .forEach(
                    (project) => {
                      pollProjectProcessing(
                        project.id
                      );
                    }
                  );
              }
            } catch (error) {
              console.warn(
                "Failed to check processing projects:",
                error
              );
            }
          } else {
            setUser(null);
            setSubscription(null);
            setProjects([]);
            setSelectedProject(null);
            setSelectedClips([]);
            setActiveTab("landing");
          }
        } catch (error) {
          console.error(
            "Initial app load failed:",
            error
          );

          if (mounted) {
            setUser(null);
            setSubscription(null);
            setProjects([]);
            setSelectedProject(null);
            setSelectedClips([]);
            setActiveTab("landing");
          }
        } finally {
          if (mounted) {
            appInitialized.current = true;
            setLoading(false);
          }
        }
      };

    initializeApp();

    const {
      data: {
        subscription:
          authSubscription,
      },
    } =
      supabase.auth.onAuthStateChange(
        async (
          event,
          session
        ) => {
          if (!mounted) {
            return;
          }

          if (
            event === "SIGNED_IN" &&
            session?.user
          ) {
            const wasInitialized =
              appInitialized.current;

            const userLoaded =
              await loadAuthenticatedUser();

            if (!mounted) {
              return;
            }

            if (!userLoaded) {
              return;
            }

            setIsAuthModalOpen(false);

            const pendingUrl =
              pendingProjectUrlRef.current;

            if (pendingUrl) {
              setNewProjectInitialUrl(
                pendingUrl
              );

              setIsNewProjectModalOpen(
                true
              );

              pendingProjectUrlRef.current =
                "";

              return;
            }

            if (!wasInitialized) {
              setActiveTab("landing");
            }

            return;
          }

          if (
            event ===
            "INITIAL_SESSION"
          ) {
            return;
          }

          if (
            event ===
              "TOKEN_REFRESHED" &&
            session?.user
          ) {
            return;
          }

          if (
            event === "SIGNED_OUT"
          ) {
            stopAllPolling();

            setUser(null);
            setSubscription(null);
            setProjects([]);
            setSelectedProject(null);
            setSelectedClips([]);
            setActiveTab("landing");

            setIsNewProjectModalOpen(
              false
            );

            setIsAuthModalOpen(false);

            setNewProjectInitialUrl("");

            pendingProjectUrlRef.current =
              "";
          }
        }
      );

    return () => {
      mounted = false;

      stopAllPolling();

      authSubscription.unsubscribe();
    };
  }, []);

  /* =======================================================
     SELECT PROJECT
  ======================================================= */

  const handleSelectProject =
    async (
      project: Project
    ) => {
      try {
        const details =
          await fetchProjectDetails(
            project.id
          );

        setSelectedProject(
          details.project
        );

        setSelectedClips(
          Array.isArray(
            details.clips
          )
            ? details.clips
            : []
        );

        setActiveTab("projects");

        const status =
          String(
            details.project.status
          );

        if (
          status !== "completed" &&
          status !== "failed"
        ) {
          pollProjectProcessing(
            project.id
          );
        }
      } catch (error) {
        console.error(
          "Failed to open project:",
          error
        );
      }
    };

  /* =======================================================
     DELETE PROJECT
  ======================================================= */

  const handleDeleteProject =
    async (id: string) => {
      try {
        stopProjectPolling(id);

        await deleteProjectApi(id);

        setProjects(
          (previous) =>
            previous.filter(
              (project) =>
                project.id !== id
            )
        );

        if (
          selectedProject?.id === id
        ) {
          setSelectedProject(null);
          setSelectedClips([]);
          setActiveTab("dashboard");
        }
      } catch (error) {
        console.error(
          "Delete project failed:",
          error
        );
      }
    };

  /* =======================================================
     LOGOUT
  ======================================================= */

  const handleLogout =
    async () => {
      try {
        stopAllPolling();

        const { error } =
          await supabase.auth.signOut();

        if (error) {
          console.error(
            "Logout failed:",
            error
          );

          return;
        }

        setUser(null);
        setSubscription(null);
        setProjects([]);
        setSelectedProject(null);
        setSelectedClips([]);
        setActiveTab("landing");

        setIsNewProjectModalOpen(
          false
        );

        setIsAuthModalOpen(false);

        setNewProjectInitialUrl("");

        pendingProjectUrlRef.current =
          "";
      } catch (error) {
        console.error(
          "Logout error:",
          error
        );
      }
    };

  /* =======================================================
     PROCESS YOUTUBE
  ======================================================= */

  const handleProcessYouTube =
    async (url: string) => {
      const cleanUrl =
        normalizeYouTubeUrl(url);

      if (!cleanUrl) {
        throw new Error(
          "Please enter a YouTube URL."
        );
      }

      const duplicateProject =
        projects.find(
          (project) => {
            const projectData =
              project as Project & {
                source_url?: string;
                youtube_url?: string;
                url?: string;
              };

            const projectUrl =
              projectData.source_url ??
              projectData.youtube_url ??
              projectData.url ??
              "";

            return (
              normalizeYouTubeUrl(
                projectUrl
              ) === cleanUrl &&
              String(
                project.status
              ) === "processing"
            );
          }
        );

      if (duplicateProject) {
        setSelectedProject(
          duplicateProject
        );

        setSelectedClips([]);

        setActiveTab("projects");

        pollProjectProcessing(
          duplicateProject.id
        );

        return;
      }

      try {
        const data =
          await processVideoApi({
            name: "YouTube Project",
            sourceType: "youtube",
            sourceUrl: cleanUrl,
          });

        if (!data?.project) {
          throw new Error(
            "Project was not created."
          );
        }

        const project =
          data.project;

        setProjects(
          (previous) => [
            project,
            ...previous.filter(
              (item) =>
                item.id !==
                project.id
            ),
          ]
        );

        if (data.user) {
          setUser(data.user);
        }

        setSelectedProject(
          project
        );

        setSelectedClips([]);

        setActiveTab("projects");

        pollProjectProcessing(
          project.id
        );
      } catch (error) {
        console.error(
          "Direct YouTube processing failed:",
          error
        );

        throw error;
      }
    };

  /* =======================================================
     OPEN NEW PROJECT
  ======================================================= */

  const openNewProject =
    (url = "") => {
      const cleanUrl =
        normalizeYouTubeUrl(url);

      if (!cleanUrl) {
        setNewProjectInitialUrl("");

        pendingProjectUrlRef.current =
          "";

        setIsNewProjectModalOpen(
          true
        );

        return;
      }

      const duplicateProject =
        projects.find(
          (project) => {
            const projectData =
              project as Project & {
                source_url?: string;
                youtube_url?: string;
                url?: string;
              };

            const projectUrl =
              projectData.source_url ??
              projectData.youtube_url ??
              projectData.url ??
              "";

            return (
              normalizeYouTubeUrl(
                projectUrl
              ) === cleanUrl &&
              String(
                project.status
              ) === "processing"
            );
          }
        );

      if (duplicateProject) {
        setSelectedProject(
          duplicateProject
        );

        setSelectedClips([]);

        setActiveTab("projects");

        pollProjectProcessing(
          duplicateProject.id
        );

        return;
      }

      setNewProjectInitialUrl(
        cleanUrl
      );

      if (!user) {
        pendingProjectUrlRef.current =
          cleanUrl;

        setIsAuthModalOpen(true);

        return;
      }

      pendingProjectUrlRef.current =
        "";

      setIsNewProjectModalOpen(true);
    };

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return <PremiumLoadingScreen />;
  }

  /* =======================================================
     MAIN APPLICATION
  ======================================================= */

  return (
    <div className="min-h-screen bg-[#050507] text-white">

      {/* =====================================================
          NAVBAR
      ===================================================== */}

      <Navbar
        user={user}
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (tab !== "projects") {
            setSelectedProject(null);
            setSelectedClips([]);
          }

          setActiveTab(
            tab as ActiveTab
          );
        }}
        onOpenNewProject={() => {
          openNewProject();
        }}
        onOpenAuth={() => {
          setIsAuthModalOpen(true);
        }}
        onLogout={handleLogout}
      />

      {/* =====================================================
          MAIN
      ===================================================== */}

      <main className="flex-1 animate-[appEnter_0.6s_ease-out]">

        {/* LANDING */}

        {activeTab === "landing" && (
          <LandingPage
            onGetStarted={() => {
              openNewProject();
            }}
            onOpenPricing={() => {
              setActiveTab("pricing");
            }}
            onOpenNewProjectWithUrl={(
              url: string
            ) => {
              openNewProject(url);
            }}
          />
        )}

        {/* DASHBOARD */}

        {activeTab === "dashboard" && (
          <DashboardView
            user={user}
            projects={projects}
            onSelectProject={
              handleSelectProject
            }
            onOpenNewProject={() => {
              openNewProject();
            }}
            onProcessYouTube={
              handleProcessYouTube
            }
            onDeleteProject={
              handleDeleteProject
            }
            onOpenPricing={() => {
              setActiveTab("pricing");
            }}
          />
        )}

        {/* PROJECT DETAILS */}

        {activeTab === "projects" &&
          selectedProject && (
            <ProjectDetailView
              project={
                selectedProject
              }
              clips={selectedClips}
              onBack={() => {
                setSelectedProject(
                  null
                );

                setSelectedClips([]);

                setActiveTab(
                  "dashboard"
                );
              }}
              onDeleteProject={
                handleDeleteProject
              }
            />
          )}

        {/* PRICING */}

        {activeTab === "pricing" && (
          <PricingView
            user={user}
            subscription={
              subscription
            }
            onUpgradeSuccess={(
              updatedUser,
              updatedSubscription
            ) => {
              setUser(
                updatedUser
              );

              setSubscription(
                updatedSubscription
              );
            }}
          />
        )}

        {/* SETTINGS */}

        {activeTab === "settings" && (
          <SettingsView
            user={user}
            onUserUpdated={(
              updatedUser
            ) => {
              setUser(
                updatedUser
              );
            }}
          />
        )}
      </main>

      {/* =====================================================
          FOOTER
      ===================================================== */}

      <footer className="border-t border-white/[0.06] bg-[#050507] py-8">

        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 text-xs text-zinc-500 sm:flex-row sm:px-6 lg:px-8">

          <div className="flex items-center gap-2">

            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-600/20">
              <Sparkles className="h-3.5 w-3.5 text-violet-400" />
            </div>

            <span>
              <span className="font-bold text-zinc-300">
                LumoClip AI
              </span>{" "}
              • Turn Long Videos
              into Viral 9:16
              Short Clips
            </span>
          </div>

          <div className="flex gap-6">

            <button
              type="button"
              onClick={() =>
                setActiveTab(
                  "landing"
                )
              }
              className="transition hover:text-white"
            >
              Home
            </button>

            <button
              type="button"
              onClick={() =>
                setActiveTab(
                  "dashboard"
                )
              }
              className="transition hover:text-white"
            >
              Dashboard
            </button>

            <button
              type="button"
              onClick={() =>
                setActiveTab(
                  "pricing"
                )
              }
              className="transition hover:text-white"
            >
              Pricing
            </button>

            <button
              type="button"
              onClick={() =>
                setActiveTab(
                  "settings"
                )
              }
              className="transition hover:text-white"
            >
              Settings
            </button>
          </div>
        </div>
      </footer>

      {/* =====================================================
          AUTH MODAL
      ===================================================== */}

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          setIsAuthModalOpen(false);
        }}
      />

      {/* =====================================================
          NEW PROJECT MODAL
      ===================================================== */}

      <NewProjectModalWithInitialUrl
        isOpen={
          isNewProjectModalOpen
        }
        onClose={() => {
          setIsNewProjectModalOpen(
            false
          );

          setNewProjectInitialUrl("");

          pendingProjectUrlRef.current =
            "";
        }}
        credits={
          user?.credits ?? 0
        }
        initialUrl={
          newProjectInitialUrl
        }
        onSuccess={(data: any) => {

          if (data?.project) {
            const project =
              data.project;

            setProjects(
              (previous) => [
                project,
                ...previous.filter(
                  (p) =>
                    p.id !==
                    project.id
                ),
              ]
            );

            setSelectedProject(
              project
            );

            setSelectedClips(
              Array.isArray(
                data.clips
              )
                ? data.clips
                : []
            );

            setActiveTab(
              "projects"
            );

            pollProjectProcessing(
              project.id
            );
          }

          if (data?.user) {
            setUser(data.user);
          }

          setNewProjectInitialUrl("");

          pendingProjectUrlRef.current =
            "";

          setIsNewProjectModalOpen(
            false
          );
        }}
      />

      {/* =====================================================
          APP ANIMATION
      ===================================================== */}

      <style>{`
        @keyframes appEnter {
          from {
            opacity: 0;
            transform: translateY(6px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}