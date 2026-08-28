import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ComponentType,
} from "react";

import { Sparkles } from "lucide-react";

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

  useEffect(() => {
    const timer = window.setInterval(() => {
      setProgress((current) => {
        if (current >= 96) return 96;
        return Math.min(current + 1.5, 96);
      });
    }, 120);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="lumoclip-loading">

      {/* =========================
          BACKGROUND
      ========================== */}

      <div className="loading-bg-glow glow-1" />
      <div className="loading-bg-glow glow-2" />

      {/* Stars / particles */}
      <div className="stars">
        <span className="star s1" />
        <span className="star s2" />
        <span className="star s3" />
        <span className="star s4" />
        <span className="star s5" />
        <span className="star s6" />
        <span className="star s7" />
        <span className="star s8" />
        <span className="star s9" />
        <span className="star s10" />
      </div>

      {/* =========================
          NEON RIBBONS
      ========================== */}

      <div className="neon-ribbon ribbon-top">
        <div />
        <div />
      </div>

      <div className="neon-ribbon ribbon-bottom">
        <div />
        <div />
      </div>

      {/* =========================
          MAIN CONTENT
      ========================== */}

      <div className="loading-content">

        {/* Logo area */}
        <div className="logo-scene">

          {/* Outer atmospheric glow */}
          <div className="logo-aura" />

          {/* Orbit */}
          <div className="orbit orbit-one">
            <span className="orbit-dot purple-dot" />
          </div>

          <div className="orbit orbit-two">
            <span className="orbit-dot cyan-dot" />
          </div>

          {/* Logo */}
          <div className="logo-holder">
            <img
              src="/lumoclip-icon.png"
              alt="LumoClip"
              className="loading-logo"
            />
          </div>

          {/* Floor reflection */}
          <div className="logo-reflection" />

        </div>

        {/* =========================
            BRAND
        ========================== */}

        <div className="brand-area">

          <div className="brand-name">
            <span className="brand-lumo">Lumo</span>
            <span className="brand-clip">Clip</span>
          </div>

          <div className="brand-subtitle">
            <span />
            <p>AI VIDEO CLIPPER</p>
            <span />
          </div>

        </div>

        {/* =========================
            PROGRESS
        ========================== */}

        <div className="progress-area">

          <div className="progress-track">
            <div
              className="progress-fill"
              style={{
                width: `${progress}%`,
              }}
            />

            <div className="progress-glow" />
          </div>

          <div className="progress-number">
            {Math.round(progress)}%
          </div>

        </div>

        {/* =========================
            STATUS
        ========================== */}

        <div className="loading-status">

          <div className="status-dots">
            <span />
            <span />
            <span />
          </div>

          <p>Preparing your workspace...</p>

        </div>

      </div>

      {/* =========================
          CSS
      ========================== */}

      <style>{`

        * {
          box-sizing: border-box;
        }

        .lumoclip-loading {
          position: fixed;
          inset: 0;
          z-index: 99999;

          overflow: hidden;

          display: flex;
          align-items: center;
          justify-content: center;

          background:
            radial-gradient(
              circle at 50% 42%,
              rgba(40, 30, 130, 0.18),
              transparent 32%
            ),
            radial-gradient(
              circle at 50% 70%,
              rgba(20, 80, 180, 0.07),
              transparent 35%
            ),
            #03040a;

          color: white;
        }

        /* =========================
           BACKGROUND GLOW
        ========================== */

        .loading-bg-glow {
          position: absolute;

          width: 500px;
          height: 500px;

          border-radius: 50%;

          filter: blur(120px);

          opacity: 0.12;

          pointer-events: none;
        }

        .glow-1 {
          top: -250px;
          left: -180px;

          background: #5424ff;
        }

        .glow-2 {
          right: -220px;
          bottom: -280px;

          background: #0077ff;
        }

        /* =========================
           STARS
        ========================== */

        .stars {
          position: absolute;
          inset: 0;

          pointer-events: none;
        }

        .star {
          position: absolute;

          width: 2px;
          height: 2px;

          border-radius: 50%;

          background: white;

          opacity: 0.55;

          animation: starPulse 3s ease-in-out infinite;
        }

        .s1 {
          left: 11%;
          top: 24%;
        }

        .s2 {
          left: 27%;
          top: 17%;
          animation-delay: .5s;
        }

        .s3 {
          left: 72%;
          top: 19%;
          animation-delay: 1s;
        }

        .s4 {
          left: 86%;
          top: 34%;
          animation-delay: 1.5s;
        }

        .s5 {
          left: 17%;
          top: 61%;
          animation-delay: .8s;
        }

        .s6 {
          left: 79%;
          top: 67%;
          animation-delay: 1.8s;
        }

        .s7 {
          left: 92%;
          top: 78%;
          animation-delay: .2s;
        }

        .s8 {
          left: 7%;
          top: 79%;
          animation-delay: 1.2s;
        }

        .s9 {
          left: 64%;
          top: 9%;
          animation-delay: 2s;
        }

        .s10 {
          left: 36%;
          top: 75%;
          animation-delay: 1.6s;
        }

        @keyframes starPulse {
          0%,
          100% {
            opacity: .15;
            transform: scale(.7);
          }

          50% {
            opacity: .8;
            transform: scale(1.8);
          }
        }

        /* =========================
           NEON RIBBONS
        ========================== */

        .neon-ribbon {
          position: absolute;

          width: 500px;
          height: 180px;

          pointer-events: none;

          opacity: .45;
        }

        .ribbon-top {
          top: -80px;
          left: -80px;

          transform: rotate(-18deg);
        }

        .ribbon-bottom {
          right: -100px;
          bottom: -100px;

          transform: rotate(-18deg);
        }

        .neon-ribbon div {
          position: absolute;

          width: 100%;
          height: 35px;

          border-radius: 50%;

          border-top: 2px solid rgba(77, 91, 255, .55);

          box-shadow:
            0 -8px 20px rgba(43, 58, 255, .25),
            0 -2px 8px rgba(180, 40, 255, .35);
        }

        .neon-ribbon div:nth-child(1) {
          top: 35px;
          left: 0;
        }

        .neon-ribbon div:nth-child(2) {
          top: 75px;
          left: 20px;

          border-top-color: rgba(210, 50, 255, .5);
        }

        /* =========================
           MAIN CONTENT
        ========================== */

        .loading-content {
          position: relative;
          z-index: 5;

          width: min(92vw, 620px);

          display: flex;
          flex-direction: column;
          align-items: center;

          animation: contentAppear 1s ease-out both;
        }

        @keyframes contentAppear {
          from {
            opacity: 0;
            transform: translateY(15px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* =========================
           LOGO SCENE
        ========================== */

        .logo-scene {
          position: relative;

          width: 300px;
          height: 280px;

          display: flex;
          align-items: center;
          justify-content: center;
        }

        .logo-aura {
          position: absolute;

          width: 190px;
          height: 190px;

          border-radius: 50%;

          background:
            radial-gradient(
              circle,
              rgba(80, 70, 255, .28),
              rgba(180, 30, 255, .12),
              transparent 70%
            );

          filter: blur(25px);

          animation: auraPulse 3s ease-in-out infinite;
        }

        @keyframes auraPulse {
          0%,
          100% {
            transform: scale(.9);
            opacity: .65;
          }

          50% {
            transform: scale(1.12);
            opacity: 1;
          }
        }

        /* =========================
           ORBITS
        ========================== */

        .orbit {
          position: absolute;

          width: 280px;
          height: 120px;

          border-radius: 50%;

          border: 1px solid rgba(120, 100, 255, .4);

          transform: rotate(-12deg);

          pointer-events: none;
        }

        .orbit-one {
          animation: orbitRotate 7s linear infinite;
        }

        .orbit-two {
          width: 250px;
          height: 105px;

          transform: rotate(42deg);

          border-color: rgba(20, 190, 255, .28);

          animation: orbitRotateReverse 9s linear infinite;
        }

        @keyframes orbitRotate {
          from {
            transform: rotate(-12deg);
          }

          to {
            transform: rotate(348deg);
          }
        }

        @keyframes orbitRotateReverse {
          from {
            transform: rotate(42deg);
          }

          to {
            transform: rotate(-318deg);
          }
        }

        .orbit-dot {
          position: absolute;

          width: 9px;
          height: 9px;

          border-radius: 50%;

          top: 50%;
          right: -4px;

          transform: translateY(-50%);
        }

        .purple-dot {
          background: #d946ff;

          box-shadow:
            0 0 8px #d946ff,
            0 0 25px #8b5cf6;
        }

        .cyan-dot {
          background: #22d3ee;

          box-shadow:
            0 0 8px #22d3ee,
            0 0 25px #06b6d4;
        }

        /* =========================
           LOGO
        ========================== */

        .logo-holder {
          position: relative;
          z-index: 4;

          width: 190px;
          height: 190px;

          display: flex;
          align-items: center;
          justify-content: center;

          animation: logoFloat 3.5s ease-in-out infinite;
        }

        .loading-logo {
          width: 180px;
          height: 180px;

          object-fit: contain;

          filter:
            drop-shadow(0 0 12px rgba(40, 80, 255, .7))
            drop-shadow(0 0 30px rgba(180, 40, 255, .35));

          animation: logoGlow 2.8s ease-in-out infinite;
        }

        @keyframes logoFloat {
          0%,
          100% {
            transform: translateY(0);
          }

          50% {
            transform: translateY(-8px);
          }
        }

        @keyframes logoGlow {
          0%,
          100% {
            filter:
              drop-shadow(0 0 10px rgba(40, 80, 255, .55))
              drop-shadow(0 0 25px rgba(180, 40, 255, .25));
          }

          50% {
            filter:
              drop-shadow(0 0 18px rgba(40, 80, 255, .85))
              drop-shadow(0 0 40px rgba(180, 40, 255, .45));
          }
        }

        /* =========================
           REFLECTION
        ========================== */

        .logo-reflection {
          position: absolute;

          bottom: 12px;

          width: 190px;
          height: 20px;

          border-radius: 50%;

          background:
            radial-gradient(
              ellipse,
              rgba(90, 70, 255, .5),
              rgba(180, 30, 255, .15),
              transparent 70%
            );

          filter: blur(8px);

          animation: reflectionPulse 3s ease-in-out infinite;
        }

        @keyframes reflectionPulse {
          0%,
          100% {
            transform: scaleX(.75);
            opacity: .45;
          }

          50% {
            transform: scaleX(1.1);
            opacity: .8;
          }
        }

        /* =========================
           BRAND
        ========================== */

        .brand-area {
          margin-top: -8px;

          text-align: center;
        }

        .brand-name {
          font-size: clamp(44px, 7vw, 72px);

          line-height: .95;

          font-weight: 900;

          letter-spacing: -4px;

          text-shadow:
            0 0 20px rgba(255,255,255,.08);
        }

        .brand-lumo {
          color: #f5f5f7;
        }

        .brand-clip {
          background:
            linear-gradient(
              90deg,
              #ec4899,
              #9333ea,
              #3b82f6,
              #22d3ee
            );

          -webkit-background-clip: text;
          background-clip: text;

          color: transparent;

          margin-left: 2px;
        }

        .brand-subtitle {
          display: flex;

          align-items: center;
          justify-content: center;

          gap: 18px;

          margin-top: 16px;
        }

        .brand-subtitle span {
          width: 70px;
          height: 1px;

          background:
            linear-gradient(
              90deg,
              transparent,
              rgba(100,120,255,.9)
            );

          box-shadow: 0 0 8px rgba(100,120,255,.7);
        }

        .brand-subtitle span:last-child {
          background:
            linear-gradient(
              90deg,
              rgba(100,120,255,.9),
              transparent
            );
        }

        .brand-subtitle p {
          margin: 0;

          font-size: 10px;

          letter-spacing: .55em;

          color: rgba(220,220,240,.6);

          font-weight: 600;
        }

        /* =========================
           PROGRESS
        ========================== */

        .progress-area {
          width: min(560px, 85vw);

          display: flex;

          align-items: center;

          gap: 15px;

          margin-top: 58px;
        }

        .progress-track {
          position: relative;

          flex: 1;

          height: 12px;

          padding: 2px;

          overflow: hidden;

          border-radius: 999px;

          background: rgba(255,255,255,.035);

          border: 1px solid rgba(100,120,255,.22);

          box-shadow:
            inset 0 0 15px rgba(0,0,0,.5),
            0 0 15px rgba(80,70,255,.08);
        }

        .progress-fill {
          position: relative;

          height: 100%;

          border-radius: 999px;

          background:
            linear-gradient(
              90deg,
              #ff4ecd,
              #9b3cff,
              #4f46e5,
              #22d3ee
            );

          box-shadow:
            0 0 10px rgba(180,50,255,.7),
            0 0 25px rgba(70,100,255,.35);

          transition: width .25s ease;
        }

        .progress-glow {
          position: absolute;

          top: 0;
          bottom: 0;

          width: 70px;

          background: rgba(255,255,255,.4);

          filter: blur(10px);

          animation: progressShine 1.7s linear infinite;
        }

        @keyframes progressShine {
          from {
            left: -80px;
          }

          to {
            left: 100%;
          }
        }

        .progress-number {
          min-width: 42px;

          font-size: 12px;

          font-weight: 700;

          color: rgba(220,220,255,.7);

          letter-spacing: .05em;
        }

        /* =========================
           STATUS
        ========================== */

        .loading-status {
          margin-top: 30px;

          display: flex;

          flex-direction: column;

          align-items: center;
        }

        .status-dots {
          display: flex;

          gap: 10px;

          margin-bottom: 13px;
        }

        .status-dots span {
          width: 7px;
          height: 7px;

          border-radius: 50%;

          animation: dotBounce 1.4s ease-in-out infinite;
        }

        .status-dots span:nth-child(1) {
          background: #6366f1;
          box-shadow: 0 0 12px #6366f1;
        }

        .status-dots span:nth-child(2) {
          background: #ec4899;
          box-shadow: 0 0 12px #ec4899;

          animation-delay: .2s;
        }

        .status-dots span:nth-child(3) {
          background: #22d3ee;
          box-shadow: 0 0 12px #22d3ee;

          animation-delay: .4s;
        }

        @keyframes dotBounce {
          0%,
          60%,
          100% {
            transform: translateY(0);
            opacity: .45;
          }

          30% {
            transform: translateY(-5px);
            opacity: 1;
          }
        }

        .loading-status p {
          margin: 0;

          font-size: 12px;

          color: rgba(210,210,225,.58);

          letter-spacing: .12em;

          font-weight: 500;
        }

        /* =========================
           MOBILE
        ========================== */

        @media (max-width: 640px) {

          .logo-scene {
            width: 260px;
            height: 235px;
          }

          .logo-holder {
            width: 155px;
            height: 155px;
          }

          .loading-logo {
            width: 150px;
            height: 150px;
          }

          .orbit {
            width: 235px;
            height: 100px;
          }

          .orbit-two {
            width: 215px;
            height: 90px;
          }

          .brand-name {
            font-size: 48px;
            letter-spacing: -3px;
          }

          .brand-subtitle {
            gap: 10px;
          }

          .brand-subtitle span {
            width: 35px;
          }

          .brand-subtitle p {
            font-size: 8px;
            letter-spacing: .4em;
          }

          .progress-area {
            margin-top: 42px;
          }

          .loading-status p {
            font-size: 10px;
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