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