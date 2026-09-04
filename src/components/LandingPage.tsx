import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ArrowRight,
  Activity,
  BarChart3,
  CheckCheck,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Download,
  Command,
  Film,
  Gauge,
  Layers3,
  Link2,
  Globe2,
  MessageSquareText,
  MousePointer2,
  Mic2,
  Play,
  Scissors,
  Target,
  ShieldCheck,
  Sparkles,
  Subtitles,
  Smartphone,
  Upload,
  WandSparkles,
  TrendingUp,
  Zap,
  X,
} from "lucide-react";

/* ============================================================================
   TYPES
============================================================================ */

export type CaptionPosition = "top" | "center" | "bottom";
export type CaptionProcessingMode = "clips" | "full_video_caption";

export type CaptionStyleSettings = {
  preset: string;
  mode: CaptionProcessingMode;
  font: string;
  textColor: string;
  highlightColor: string;
  position: CaptionPosition;
  uppercase: boolean;
};

type LandingPageProps = {
  onGetStarted: (intent?: "enhance-speech") => void;
  onOpenPricing: () => void;
  onOpenNewProjectWithUrl: (
    url: string,
    captionStyle?: CaptionStyleSettings
  ) => void;
  onUploadFile?: (
    file: File,
    captionStyle?: CaptionStyleSettings
  ) => void;
};

const CAPTION_STYLE_PRESETS: CaptionStyleSettings[] = [
  {
    preset: "opus-punch",
    mode: "full_video_caption",
    font: "Arial",
    textColor: "#FFFFFF",
    highlightColor: "#FFD84D",
    position: "bottom",
    uppercase: true,
  },
  {
    preset: "clean-cyan",
    mode: "full_video_caption",
    font: "Inter",
    textColor: "#FFFFFF",
    highlightColor: "#67E8F9",
    position: "bottom",
    uppercase: false,
  },
  {
    preset: "creator-pop",
    mode: "full_video_caption",
    font: "Poppins",
    textColor: "#FFFFFF",
    highlightColor: "#F472B6",
    position: "center",
    uppercase: true,
  },
  {
    preset: "neon-energy",
    mode: "full_video_caption",
    font: "Impact",
    textColor: "#D9F99D",
    highlightColor: "#39FF14",
    position: "top",
    uppercase: true,
  },
  {
    preset: "minimal",
    mode: "full_video_caption",
    font: "Arial",
    textColor: "#FFFFFF",
    highlightColor: "#FFFFFF",
    position: "bottom",
    uppercase: false,
  },
];

const CAPTION_STYLE_LABELS: Record<string, string> = {
  "opus-punch": "Opus Punch",
  "clean-cyan": "Clean Cyan",
  "creator-pop": "Creator Pop",
  "neon-energy": "Neon Energy",
  minimal: "Minimal",
};

const CAPTION_STYLE_DESCRIPTIONS: Record<string, string> = {
  "opus-punch": "Bold words with a punchy highlight.",
  "clean-cyan": "Clean, readable captions for every video.",
  "creator-pop": "Centered creator-style captions with color.",
  "neon-energy": "High-energy neon captions for fast edits.",
  minimal: "Simple white captions with no distraction.",
};

const DEFAULT_CAPTION_STYLE = CAPTION_STYLE_PRESETS[0];

function cloneCaptionStyle(style: CaptionStyleSettings): CaptionStyleSettings {
  return { ...style };
}

/* ============================================================================
   SEO CONSTANTS
============================================================================ */

const SITE_URL = "https://lumo-clip.com";
const SITE_NAME = "LumoClip";

const SEO_TITLE =
  "LumoClip – AI Video Clipper | Turn Long Videos Into Shorts";

const SEO_DESCRIPTION =
  "LumoClip is an AI video clipper that finds the best moments in long videos and turns them into engaging short-form content for YouTube Shorts, TikTok, and Instagram.";

const SEO_KEYWORDS = [
  "LumoClip",
  "Lumo Clip",
  "AI video clipper",
  "AI video clipping",
  "AI clip generator",
  "long video to shorts",
  "video to shorts",
  "AI shorts generator",
  "YouTube Shorts maker",
  "TikTok clip generator",
  "Instagram Reels maker",
].join(", ");

/* ============================================================================
   DATA
============================================================================ */

const features = [
  {
    icon: Sparkles,
    eyebrow: "AI DISCOVERY",
    title: "AI finds the moments",
    text: "LumoClip understands the context of your content and identifies moments with strong short-form potential.",
  },
  {
    icon: Scissors,
    eyebrow: "AUTO CLIPPING",
    title: "Turn long videos into clips",
    text: "Stop scrubbing through timelines. Let AI surface the strongest sections automatically.",
  },
  {
    icon: WandSparkles,
    eyebrow: "CONTENT AI",
    title: "Hooks that fit your content",
    text: "Generate titles, hooks, captions and content directions based on the actual context of your video.",
  },
  {
    icon: Subtitles,
    eyebrow: "CAPTIONS",
    title: "Ready-to-publish assets",
    text: "Create structured short-form assets without rebuilding the same workflow every time.",
  },
  {
    icon: BarChart3,
    eyebrow: "INTELLIGENCE",
    title: "Content intelligence",
    text: "Understand which moments stand out and organize your content around meaningful signals.",
  },
  {
    icon: ShieldCheck,
    eyebrow: "WORKSPACE",
    title: "Everything in one place",
    text: "Projects, outputs, processing status and content assets stay organized inside your workspace.",
  },
  {
    icon: Mic2,
    eyebrow: "AUDIO AI",
    title: "Enhance speech",
    text: "Remove background noise, shape voice frequencies and normalize loudness — on your source video or any generated clip.",
  },
  {
    icon: Film,
    eyebrow: "AUTO REFRAME",
    title: "Reframe for every platform",
    text: "Automatically track the action and recompose each clip into 9:16, 1:1 or 16:9.",
  },
  {
    icon: Layers3,
    eyebrow: "LOCALIZATION",
    title: "Dub into new languages",
    text: "Turn one video into AI dubbed versions so more of your audience can watch in their language.",
  },
  {
    icon: Target,
    eyebrow: "VIRAL SCORE",
    title: "Rank clips by potential",
    text: "Surface the strongest hooks, pacing and story moments so you know what to publish first.",
  },
  {
    icon: Clock3,
    eyebrow: "SMART EDITING",
    title: "Remove dead air",
    text: "Cut repetitive pauses and low-value gaps to keep short-form content moving naturally.",
  },
  {
    icon: Smartphone,
    eyebrow: "SOCIAL PACK",
    title: "Platform-ready exports",
    text: "Prepare vertical, square and landscape outputs for the platforms you publish on most.",
  },
  {
    icon: Activity,
    eyebrow: "CONTENT SIGNALS",
    title: "Spot the hook",
    text: "See where curiosity, payoff, emotion and educational value appear inside your source video.",
  },
  {
    icon: Download,
    eyebrow: "EXPORT",
    title: "Publish-ready workflow",
    text: "Move from source video to organized outputs without rebuilding your editing process every time.",
  },
];

const faqs = [
  {
    q: "What is LumoClip?",
    a: "LumoClip is an AI video clipper and content repurposing workspace designed to transform long-form videos into short-form clips and publishing-ready content.",
  },
  {
    q: "Can I upload my own video?",
    a: "Yes. Upload supported video files directly from the LumoClip landing page and send them into your project workflow.",
  },
  {
    q: "Can I use a YouTube URL?",
    a: "Yes. Paste a supported YouTube URL into the source field and LumoClip can send it into your processing workflow.",
  },
  {
    q: "Does LumoClip automatically find clips?",
    a: "Yes. LumoClip analyzes your source video and identifies strong moments so you do not have to manually search through the entire video.",
  },
  {
    q: "Can LumoClip generate captions and hooks?",
    a: "Yes. LumoClip can generate titles, hooks, captions, descriptions and content directions alongside generated short-form content.",
  },
];

const processingSignals = [
  ["Strong hook detected", "98%"],
  ["Story moment detected", "96%"],
  ["Educational segment", "94%"],
  ["High engagement potential", "92%"],
] as const;

const outputCards = [
  {
    title: "The strongest idea",
    type: "SHORT",
    time: "00:42",
    score: "98",
  },
  {
    title: "Unexpected insight",
    type: "SHORT",
    time: "03:18",
    score: "96",
  },
  {
    title: "Key lesson",
    type: "SHORT",
    time: "07:44",
    score: "94",
  },
] as const;

/* ============================================================================
   PREMIUM LANDING DATA
============================================================================ */

const platformItems = [
  [Smartphone, "YouTube Shorts", "9:16"],
  [Smartphone, "TikTok", "9:16"],
  [Smartphone, "Instagram Reels", "9:16"],
  [Film, "YouTube", "16:9"],
  [BarChart3, "LinkedIn", "1:1"],
  [Globe2, "Everywhere", "1:1 / 16:9"],
] as const;

const creatorUseCases = [
  [Mic2, "Podcasters", "Turn long conversations into a library of short clips."],
  [WandSparkles, "YouTubers", "Find the strongest moments without watching the timeline twice."],
  [Scissors, "Agencies", "Repurpose client content faster across multiple platforms."],
  [TrendingUp, "Growth teams", "Build a repeatable short-form content engine."],
] as const;

const premiumWorkflow = [
  ["01", "Upload or paste", "Start with a video file or a supported YouTube URL."],
  ["02", "Understand", "AI reads the story, topics, speech and high-value moments."],
  ["03", "Score", "Potential clips are ranked using content and engagement signals."],
  ["04", "Package", "Generate clips, captions, hooks and platform-ready directions."],
  ["05", "Publish", "Review the best outputs and move them into your publishing workflow."],
] as const;

const trustPoints = [
  "No timeline scrubbing required",
  "Upload or start from a URL",
  "AI captions and hooks",
  "Vertical-first workflow",
  "Organized project outputs",
  "Built for creators and teams",
];

/* ============================================================================
   PERFORMANCE
============================================================================ */

const lazySectionStyle: React.CSSProperties = {
  contentVisibility: "auto",
  containIntrinsicSize: "1px 900px",
};

/* ============================================================================
   HELPERS
============================================================================ */

function Glow({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute rounded-full blur-[70px] ${className}`}
    />
  );
}

function SectionLabel({
  children,
  icon: Icon = Sparkles,
}: {
  children: React.ReactNode;
  icon?: React.ElementType;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/10 bg-cyan-300/[0.045] px-3.5 py-1.5 shadow-[0_0_30px_rgba(34,211,238,0.035)]">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-300 opacity-60" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cyan-300" />
      </span>

      <Icon
        aria-hidden="true"
        className="h-3 w-3 text-cyan-300"
      />

      <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-cyan-200">
        {children}
      </span>
    </div>
  );
}

/* ============================================================================
   REVEAL
============================================================================ */

function Reveal({
  children,
  className = "",
  delay = 0,
  immediate = false,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  immediate?: boolean;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(immediate);

  useEffect(() => {
    if (immediate) return;

    const node = ref.current;

    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.08,
      }
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [immediate]);

  return (
    <div
      ref={ref}
      className={`transition-all duration-500 ${
        visible
          ? "translate-y-0 opacity-100"
          : "translate-y-8 opacity-0"
      } ${className}`}
      style={{
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/* ============================================================================
   BUTTON
============================================================================ */

function PremiumButton({
  children,
  onClick,
  variant = "primary",
  icon = true,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary";
  icon?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group inline-flex h-12 items-center justify-center gap-2 rounded-xl px-6 text-sm font-semibold transition-all duration-200 ${
        variant === "primary"
          ? "bg-white text-black hover:bg-zinc-200 active:scale-[0.98]"
          : "border border-white/15 bg-transparent text-white hover:bg-white/5 active:scale-[0.98]"
      }`}
    >
      <span>{children}</span>

      {icon && (
        <ArrowRight
          aria-hidden="true"
          className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
        />
      )}
    </button>
  );
}

/* ============================================================================
   TOOL GRID (Opus-style small icon buttons)
============================================================================ */

type ToolGridItem = {
  icon: React.ElementType;
  label: string;
  badge?: "New";
};

const toolGridItems: ToolGridItem[] = [
  { icon: Zap, label: "Long to shorts" },
  { icon: Scissors, label: "Video editor" },
  { icon: Subtitles, label: "AI captions", badge: "New" },
  { icon: Film, label: "AI reframe", badge: "New" },
  { icon: Mic2, label: "Auto SFX", badge: "New" },
  { icon: Layers3, label: "Upscale", badge: "New" },
  { icon: WandSparkles, label: "Video dubbing", badge: "New" },
  { icon: BarChart3, label: "Enhance speech", badge: "New" },
  { icon: Target, label: "Viral score", badge: "New" },
  { icon: Clock3, label: "Remove silence", badge: "New" },
  { icon: Download, label: "Social export", badge: "New" },
];

function ToolGridButton({
  item,
  onClick,
}: {
  item: ToolGridItem;
  onClick?: () => void;
}) {
  const Icon = item.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-[84px] flex-col items-center gap-2 focus:outline-none"
    >
      <span className="relative flex h-14 w-14 items-center justify-center rounded-full border border-white/[0.06] bg-white/[0.03] transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-cyan-300/20 group-hover:bg-white/[0.06]">
        {item.badge && (
          <span className="absolute -top-1.5 rounded-full bg-cyan-300 px-1.5 py-[1px] text-[7px] font-bold uppercase tracking-wide text-black">
            {item.badge}
          </span>
        )}

        <Icon
          aria-hidden="true"
          className="h-5 w-5 text-zinc-400 transition-colors duration-200 group-hover:text-cyan-200"
        />
      </span>

      <span className="text-center text-[10px] leading-tight text-zinc-500 transition-colors duration-200 group-hover:text-zinc-300">
        {item.label}
      </span>
    </button>
  );
}

function ToolGrid({
  onSelect,
}: {
  onSelect?: (label: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-start justify-center gap-x-3 gap-y-5 sm:gap-x-5">
      {toolGridItems.map((item) => (
        <ToolGridButton
          key={item.label}
          item={item}
          onClick={() => onSelect?.(item.label)}
        />
      ))}
    </div>
  );
}

/* ============================================================================
   FLOATING SIGNAL
============================================================================ */

function FloatingSignal({
  icon: Icon,
  title,
  value,
  className = "",
}: {
  icon: React.ElementType;
  title: string;
  value: string;
  className?: string;
}) {
  return (
    <div
      className={`flex min-w-[175px] items-center gap-3 rounded-2xl border border-white/[0.08] bg-[#080b10]/80 px-3 py-2.5 shadow-[0_25px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl ${className}`}
    >
      <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-300/10 bg-cyan-400/[0.07]">
        <div className="absolute inset-0 rounded-xl bg-cyan-400/[0.08] blur-lg" />

        <Icon
          aria-hidden="true"
          className="relative h-4 w-4 text-cyan-300"
        />
      </div>

      <div className="min-w-0">
        <p className="text-[9px] font-bold text-zinc-200">
          {title}
        </p>

        <p className="mt-0.5 truncate font-mono text-[8px] text-zinc-600">
          {value}
        </p>
      </div>
    </div>
  );
}

/* ============================================================================
   PREMIUM MICRO VISUALS
============================================================================ */

function PremiumSignalCard({
  icon: Icon,
  title,
  value,
  detail,
}: {
  icon: React.ElementType;
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-[24px] border border-white/[0.07] bg-white/[0.018] p-4 transition-all duration-300 hover:-translate-y-1 hover:border-cyan-300/15 hover:bg-white/[0.03]">
      <div className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-cyan-400/[0.06] blur-2xl transition group-hover:bg-cyan-400/[0.12]" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-300/10 bg-cyan-400/[0.06]">
          <Icon className="h-4 w-4 text-cyan-300" />
        </div>
        <span className="font-mono text-[8px] text-cyan-300/80">LIVE</span>
      </div>
      <p className="mt-5 text-[9px] font-bold uppercase tracking-[0.16em] text-zinc-600">{title}</p>
      <p className="mt-1 text-2xl font-black tracking-tight text-white">{value}</p>
      <p className="mt-1 text-[9px] leading-4 text-zinc-700">{detail}</p>
    </div>
  );
}

function PlatformCard({
  icon: Icon,
  name,
  format,
}: {
  icon: React.ElementType;
  name: string;
  format: string;
}) {
  return (
    <div className="group flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.012] p-3 transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan-300/15 hover:bg-cyan-300/[0.025]">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] bg-black/20">
        <Icon className="h-4 w-4 text-zinc-500 transition group-hover:text-cyan-300" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[10px] font-bold text-zinc-300">{name}</p>
        <p className="mt-0.5 font-mono text-[8px] text-zinc-700">{format}</p>
      </div>
      <CheckCheck className="h-3.5 w-3.5 text-emerald-300/70" />
    </div>
  );
}

/* ============================================================================
   AI ORB
============================================================================ */

const AIOrb = React.memo(function AIOrb() {
  return (
    <div
      className="relative mx-auto h-[330px] w-[330px] sm:h-[460px] sm:w-[460px]"
      aria-hidden="true"
    >
      <div className="absolute inset-[18%] rounded-full bg-cyan-400/[0.10] blur-[70px]" />

      <div className="absolute inset-[25%] rounded-full bg-blue-500/[0.07] blur-[70px]" />

      <div className="absolute inset-[4%] rounded-full border border-white/[0.035]" />

      <div className="absolute inset-[10%] rounded-full border border-cyan-300/[0.08] animate-[spinCW_18s_linear_infinite] [will-change:transform]" />

      <div className="absolute inset-[17%] rounded-full border border-dashed border-blue-400/[0.10] animate-[spinCCW_12s_linear_infinite] [will-change:transform]" />

      <div className="absolute inset-[25%] rounded-full border border-cyan-300/[0.08] animate-[spinCW_9s_linear_infinite] [will-change:transform]" />

      <div className="absolute left-[5%] top-[42%] h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_30px_rgba(34,211,238,1)]" />

      <div className="absolute right-[11%] top-[25%] h-1.5 w-1.5 rounded-full bg-blue-300 shadow-[0_0_25px_rgba(96,165,250,1)]" />

      <div className="absolute bottom-[16%] left-[22%] h-1.5 w-1.5 rounded-full bg-cyan-200 shadow-[0_0_25px_rgba(103,232,249,1)]" />

      <div className="absolute inset-[24%] rounded-full bg-gradient-to-br from-cyan-300/20 via-blue-500/10 to-transparent p-px shadow-[0_0_100px_rgba(34,211,238,0.18)]">
        <div className="relative h-full w-full overflow-hidden rounded-full border border-white/[0.09] bg-[#06090e] shadow-[inset_0_0_70px_rgba(34,211,238,0.04)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,rgba(34,211,238,0.22),transparent_38%),radial-gradient(circle_at_75%_75%,rgba(59,130,246,0.19),transparent_44%)]" />

          <div className="absolute left-[20%] top-[25%] h-24 w-24 rounded-full bg-cyan-400/[0.09] blur-2xl animate-[orbFloat_5s_ease-in-out_infinite]" />

          <div className="absolute bottom-[18%] right-[18%] h-20 w-20 rounded-full bg-blue-500/[0.10] blur-2xl animate-[orbFloat2_6s_ease-in-out_infinite]" />

          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative">
              <div className="absolute -inset-10 rounded-full bg-cyan-400/[0.08] blur-3xl" />

              <div className="relative flex h-24 w-24 items-center justify-center rounded-[30px] border border-cyan-300/10 bg-gradient-to-br from-cyan-400/[0.10] to-blue-500/[0.08] shadow-[0_0_70px_rgba(34,211,238,0.12)] backdrop-blur-xl">
                <div className="absolute inset-2 rounded-[24px] border border-white/[0.04]" />

                <Sparkles className="relative h-10 w-10 text-cyan-200" />
              </div>
            </div>
          </div>

          <div className="absolute left-0 right-0 top-[28%] h-px bg-gradient-to-r from-transparent via-cyan-300/30 to-transparent animate-pulse" />

          <div className="absolute bottom-[30%] left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-300/20 to-transparent" />
        </div>
      </div>

      <div className="absolute -left-4 top-[18%] hidden animate-[floatA_5s_ease-in-out_infinite] sm:block">
        <FloatingSignal
          icon={Sparkles}
          title="AI detected"
          value="98.4% relevance"
        />
      </div>

      <div className="absolute -right-6 top-[45%] hidden animate-[floatB_6s_ease-in-out_infinite] sm:block">
        <FloatingSignal
          icon={Scissors}
          title="Best moment"
          value="00:42 — 01:18"
        />
      </div>

      <div className="absolute bottom-[7%] left-[8%] hidden animate-[floatA_6s_ease-in-out_infinite] sm:block">
        <FloatingSignal
          icon={Subtitles}
          title="Captions"
          value="Ready to generate"
        />
      </div>
    </div>
  );
});

/* ============================================================================
   PROCESSING VISUAL
============================================================================ */

const ProcessingVisual = React.memo(function ProcessingVisual() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [visible, setVisible] = useState(false);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const node = containerRef.current;

    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.15 }
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;

    const activeTimer = window.setInterval(() => {
      setActive((value) => (value + 1) % 4);
    }, 1500);

    return () => window.clearInterval(activeTimer);
  }, [visible]);

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden rounded-[32px] border border-white/[0.08] bg-[#080b10]/90 shadow-[0_40px_120px_rgba(0,0,0,0.45)] backdrop-blur-2xl"
      aria-label="LumoClip AI video analysis preview"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent" />

      <div className="flex items-center justify-between border-b border-white/[0.05] px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-300/10 bg-cyan-400/[0.06]">
            <WandSparkles className="h-4 w-4 text-cyan-300" />
          </div>

          <div>
            <p className="text-[10px] font-bold text-white">
              Lumo Intelligence
            </p>

            <p className="mt-0.5 text-[8px] text-zinc-700">
              Content understanding engine
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-full border border-emerald-300/10 bg-emerald-400/[0.04] px-2.5 py-1">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />

          <span className="text-[8px] font-bold uppercase tracking-[0.14em] text-emerald-300">
            analyzing
          </span>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        <div className="relative aspect-[16/8] overflow-hidden rounded-[22px] border border-white/[0.06] bg-gradient-to-br from-[#0e1820] via-[#090c12] to-[#06080d]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_35%,rgba(34,211,238,0.12),transparent_30%),radial-gradient(circle_at_80%_65%,rgba(59,130,246,0.10),transparent_34%)]" />

          <div className="absolute inset-0 opacity-30">
            <div className="absolute left-[10%] top-[25%] h-24 w-24 rounded-full border border-cyan-300/10" />

            <div className="absolute bottom-[18%] right-[14%] h-28 w-28 rounded-full border border-blue-300/10" />
          </div>

          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] backdrop-blur-xl">
              <Play
                aria-hidden="true"
                className="ml-0.5 h-4 w-4 fill-white text-white"
              />
            </div>
          </div>

          <div className="absolute bottom-4 left-4 right-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-mono text-[8px] text-zinc-500">
                07:24 / 18:42
              </span>

              <span className="font-mono text-[8px] text-cyan-300">
                ANALYZING
              </span>
            </div>

            <div className="h-1 overflow-hidden rounded-full bg-white/[0.07]">
              <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 animate-[progressLoop_6.5s_ease-in-out_infinite]" />
            </div>
          </div>
        </div>

        <div className="relative mt-5 flex h-20 items-center gap-[3px] overflow-hidden rounded-2xl border border-white/[0.045] bg-black/20 px-4">
          {Array.from({ length: 74 }).map((_, i) => {
            const height = 15 + ((i * 43 + 17) % 70);

            const highlight =
              i >= active * 17 &&
              i < active * 17 + 18;

            return (
              <div
                key={i}
                className={`w-1 shrink-0 rounded-full transition-all duration-700 ${
                  highlight
                    ? "bg-gradient-to-t from-cyan-500 to-cyan-100"
                    : "bg-white/[0.07]"
                }`}
                style={{
                  height: `${height}%`,
                  opacity: highlight ? 1 : 0.42,
                }}
              />
            );
          })}

          <div className="absolute bottom-0 left-[38%] top-0 w-px bg-cyan-300/30 shadow-[0_0_20px_rgba(34,211,238,0.4)]" />
        </div>

        <div className="mt-5 space-y-2">
          {processingSignals.map(([title, score], index) => (
            <div
              key={title}
              className={`flex items-center gap-3 rounded-2xl border p-3 transition-all duration-500 ${
                active === index
                  ? "translate-x-1 border-cyan-300/15 bg-cyan-300/[0.035]"
                  : "border-white/[0.045] bg-white/[0.01]"
              }`}
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                  active === index
                    ? "bg-cyan-400/10"
                    : "bg-white/[0.025]"
                }`}
              >
                {active === index ? (
                  <CheckCircle2 className="h-4 w-4 text-cyan-300" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 text-zinc-700" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-[10px] font-semibold text-zinc-300">
                  {title}
                </p>

                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.04]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-700"
                    style={{
                      width:
                        active === index ? score : "20%",
                    }}
                  />
                </div>
              </div>

              <span className="font-mono text-[9px] text-cyan-300">
                {score}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

/* ============================================================================
   OUTPUT PREVIEW
============================================================================ */

const OutputPreview = React.memo(function OutputPreview() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [visible, setVisible] = useState(false);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const node = containerRef.current;

    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.15 }
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;

    const id = window.setInterval(() => {
      setActive((value) => (value + 1) % outputCards.length);
    }, 2200);

    return () => window.clearInterval(id);
  }, [visible]);

  return (
    <div
      ref={containerRef}
      className="grid gap-4 sm:grid-cols-3"
    >
      {outputCards.map((output, index) => {
        const selected = active === index;

        return (
          <article
            key={output.title}
            className={`group relative overflow-hidden rounded-[24px] border p-3 transition-all duration-500 ${
              selected
                ? "border-cyan-300/20 bg-cyan-300/[0.035] -translate-y-1"
                : "border-white/[0.06] bg-white/[0.012]"
            }`}
          >
            <div className="relative aspect-[9/12] overflow-hidden rounded-[18px] border border-white/[0.05] bg-gradient-to-br from-[#0d1c23] via-[#0b0e14] to-[#090a0f]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(34,211,238,0.16),transparent_32%),radial-gradient(circle_at_75%_75%,rgba(59,130,246,0.13),transparent_38%)]" />

              <div className="absolute inset-x-4 top-5">
                <div className="h-1 w-14 rounded-full bg-cyan-300/50" />
                <div className="mt-2 h-1 w-24 rounded-full bg-white/10" />
              </div>

              <div className="absolute bottom-7 left-4 right-4">
                <div className="rounded-xl border border-white/[0.07] bg-black/30 p-2 backdrop-blur-md">
                  <div className="flex gap-1">
                    {Array.from({ length: 20 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-5 w-1 rounded-full bg-cyan-300/40"
                        style={{
                          height: `${8 + ((i * 11) % 20)}px`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="absolute left-3 top-3 rounded-lg border border-white/10 bg-black/30 px-2 py-1 backdrop-blur-xl">
                <span className="font-mono text-[7px] font-bold text-cyan-300">
                  {output.type}
                </span>
              </div>

              <div className="absolute bottom-3 right-3 rounded-lg border border-white/10 bg-black/30 px-2 py-1 backdrop-blur-xl">
                <span className="font-mono text-[7px] text-zinc-300">
                  {output.time}
                </span>
              </div>
            </div>

            <div className="px-1 pb-1 pt-3">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-[10px] font-bold text-zinc-300">
                  {output.title}
                </p>

                <span className="font-mono text-[8px] text-cyan-300">
                  {output.score}%
                </span>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
});

/* ============================================================================
   FEATURE CARD
============================================================================ */

const FeatureCard = React.memo(function FeatureCard({
  item,
  index,
}: {
  item: (typeof features)[number];
  index: number;
}) {
  const Icon = item.icon;

  return (
    <Reveal delay={index * 60}>
      <article className="group relative h-full overflow-hidden rounded-[28px] border border-white/[0.06] bg-white/[0.012] p-6 transition-all duration-500 hover:-translate-y-1.5 hover:border-cyan-300/15 hover:bg-white/[0.025] hover:shadow-[0_25px_80px_rgba(0,0,0,0.22)]">
        <div className="absolute -right-24 -top-24 h-56 w-56 rounded-full bg-cyan-400/[0.035] blur-3xl transition duration-500 group-hover:bg-cyan-400/[0.09]" />

        <div className="absolute bottom-0 left-0 h-px w-0 bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-500 group-hover:w-full" />

        <div className="relative">
          <div className="flex items-center justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.07] bg-gradient-to-br from-cyan-400/[0.10] to-blue-500/[0.035] transition duration-500 group-hover:scale-105 group-hover:border-cyan-300/15">
              <Icon className="h-5 w-5 text-cyan-300" />
            </div>

            <span className="font-mono text-[8px] text-zinc-800">
              0{index + 1}
            </span>
          </div>

          <p className="mt-7 text-[8px] font-bold uppercase tracking-[0.2em] text-cyan-300/70">
            {item.eyebrow}
          </p>

          <h3 className="mt-2 text-base font-bold tracking-tight text-white">
            {item.title}
          </h3>

          <p className="mt-3 text-sm leading-6 text-zinc-600">
            {item.text}
          </p>

          <div className="mt-6 flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.17em] text-zinc-800 transition group-hover:text-cyan-300">
            Explore capability

            <ArrowRight className="h-3 w-3 transition group-hover:translate-x-1" />
          </div>
        </div>
      </article>
    </Reveal>
  );
});

/* ============================================================================
   WORKFLOW
============================================================================ */

const Workflow = React.memo(function Workflow() {
  const items = [
    {
      no: "01",
      icon: Link2,
      title: "Bring your source",
      text: "Paste a URL or upload a supported video.",
    },
    {
      no: "02",
      icon: Sparkles,
      title: "AI understands it",
      text: "Lumo Intelligence analyzes topics and moments.",
    },
    {
      no: "03",
      icon: Scissors,
      title: "Generate assets",
      text: "Create clips, hooks, captions and directions.",
    },
    {
      no: "04",
      icon: Zap,
      title: "Move faster",
      text: "Review your strongest outputs and keep creating.",
    },
  ];

  return (
    <div className="relative grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <div className="absolute left-[12%] right-[12%] top-[43px] hidden h-px bg-gradient-to-r from-transparent via-cyan-300/15 to-transparent lg:block" />

      {items.map((item, index) => {
        const Icon = item.icon;

        return (
          <Reveal key={item.no} delay={index * 80}>
            <article className="group relative h-full rounded-[27px] border border-white/[0.06] bg-white/[0.012] p-6 transition-all duration-500 hover:-translate-y-1 hover:border-cyan-300/15 hover:bg-white/[0.025]">
              <div className="relative z-10">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-cyan-300">
                    {item.no}
                  </span>

                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.07] bg-black/20">
                    <Icon className="h-4 w-4 text-zinc-600 transition group-hover:text-cyan-300" />
                  </div>
                </div>

                <h3 className="mt-7 text-sm font-bold text-white">
                  {item.title}
                </h3>

                <p className="mt-2 text-xs leading-5 text-zinc-700">
                  {item.text}
                </p>
              </div>
            </article>
          </Reveal>
        );
      })}
    </div>
  );
});

/* ============================================================================
   STATS
============================================================================ */

const MiniStats = React.memo(function MiniStats() {
  const stats = [
    ["10×", "less manual work"],
    ["24/7", "AI workflow"],
    ["9:16", "short-form ready"],
    ["1", "unified workspace"],
  ];

  return (
    <div className="grid grid-cols-2 divide-x divide-y divide-white/[0.05] overflow-hidden rounded-[26px] border border-white/[0.05] bg-white/[0.012] sm:grid-cols-4 sm:divide-y-0">
      {stats.map(([value, label]) => (
        <div
          key={label}
          className="px-4 py-7 text-center transition hover:bg-white/[0.02]"
        >
          <p className="text-2xl font-black tracking-tight text-white">
            {value}
          </p>

          <p className="mt-1.5 text-[8px] font-bold uppercase tracking-[0.17em] text-zinc-700">
            {label}
          </p>
        </div>
      ))}
    </div>
  );
});

/* ============================================================================
   AI CAPTION STYLE PICKER
============================================================================ */

function CaptionStylePicker({
  style,
  open,
  onToggle,
  onChange,
}: {
  style: CaptionStyleSettings;
  open: boolean;
  onToggle: () => void;
  onChange: (next: CaptionStyleSettings) => void;
}) {
  const update = (patch: Partial<CaptionStyleSettings>) => {
    onChange({ ...style, ...patch });
  };

  return (
    <div className="mt-3 rounded-[24px] border border-cyan-300/10 bg-cyan-400/[0.025] p-3 text-left">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls="caption-style-panel"
        className="flex w-full items-center justify-between gap-3 rounded-2xl px-2 py-1 text-left transition hover:bg-white/[0.03]"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-300/10 bg-cyan-400/[0.08]">
            <Subtitles className="h-4 w-4 text-cyan-200" />
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-2 text-xs font-bold text-white">
              AI Captions
              <span className="rounded-full border border-emerald-300/15 bg-emerald-300/[0.07] px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.14em] text-emerald-200">
                AI
              </span>
            </span>
            <span className="mt-0.5 block truncate text-[10px] text-zinc-600">
              {style.mode === "full_video_caption" ? "Full video · no clips" : "Clips mode"} · {CAPTION_STYLE_LABELS[style.preset] || "Custom style"} · {style.font} · {style.position}
            </span>
          </span>
        </span>

        <ChevronDown
          className={`h-4 w-4 shrink-0 text-zinc-500 transition-transform ${open ? "rotate-180 text-cyan-300" : ""}`}
        />
      </button>

      {open && (
        <div id="caption-style-panel" className="mt-4 border-t border-white/[0.06] pt-4">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-cyan-200">
                Choose a caption style
              </p>
              <p className="mt-1 text-[10px] leading-5 text-zinc-600">
                Select a preset now. You can fine-tune the look before processing.
              </p>
            </div>
            <span className="shrink-0 rounded-lg border border-white/[0.07] bg-black/20 px-2 py-1 text-[9px] font-mono text-zinc-500">
              9:16
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {CAPTION_STYLE_PRESETS.map((preset) => {
              const selected = style.preset === preset.preset;
              const previewText = preset.uppercase ? "MAKE IT POP" : "Make it pop";

              return (
                <button
                  key={preset.preset}
                  type="button"
                  onClick={() => onChange(cloneCaptionStyle(preset))}
                  aria-pressed={selected}
                  className={`group relative overflow-hidden rounded-2xl border p-2 text-left transition-all ${
                    selected
                      ? "border-cyan-300/50 bg-cyan-300/[0.09] shadow-[0_0_28px_rgba(34,211,238,0.09)]"
                      : "border-white/[0.07] bg-black/20 hover:border-cyan-300/20 hover:bg-white/[0.035]"
                  }`}
                >
                  <span className="relative flex h-20 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-[#111827] via-[#090d14] to-black px-2">
                    <span
                      className="text-center text-[11px] font-black leading-tight tracking-tight"
                      style={{
                        color: preset.textColor,
                        fontFamily: preset.font,
                        textTransform: preset.uppercase ? "uppercase" : "none",
                        textShadow: `0 2px 14px ${preset.highlightColor}55`,
                      }}
                    >
                      {previewText.split(" ").map((word, index) => (
                        <React.Fragment key={`${preset.preset}-${word}`}>
                          {index > 0 ? " " : ""}
                          <span style={{ color: index === 1 ? preset.highlightColor : preset.textColor }}>
                            {word}
                          </span>
                        </React.Fragment>
                      ))}
                    </span>
                    <span
                      className="absolute bottom-1.5 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full"
                      style={{ backgroundColor: preset.highlightColor }}
                    />
                  </span>
                  <span className="mt-2 block truncate text-[10px] font-bold text-zinc-200">
                    {CAPTION_STYLE_LABELS[preset.preset]}
                  </span>
                  <span className="mt-0.5 block min-h-7 text-[8px] leading-3 text-zinc-600">
                    {CAPTION_STYLE_DESCRIPTIONS[preset.preset]}
                  </span>
                  {selected && (
                    <CheckCircle2 className="absolute right-2 top-2 h-4 w-4 text-cyan-200" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.14em] text-zinc-600">
                Font
              </span>
              <select
                value={style.font}
                onChange={(event) => update({ font: event.target.value, preset: "custom" })}
                className="h-10 w-full rounded-xl border border-white/[0.08] bg-[#080b10] px-3 text-xs text-zinc-200 outline-none transition focus:border-cyan-300/30"
              >
                {["Arial", "Inter", "Poppins", "Montserrat", "Impact", "Liberation Sans"].map((font) => (
                  <option key={font} value={font}>{font}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.14em] text-zinc-600">
                Position
              </span>
              <select
                value={style.position}
                onChange={(event) => update({ position: event.target.value as CaptionPosition, preset: "custom" })}
                className="h-10 w-full rounded-xl border border-white/[0.08] bg-[#080b10] px-3 text-xs text-zinc-200 outline-none transition focus:border-cyan-300/30"
              >
                <option value="top">Top</option>
                <option value="center">Center</option>
                <option value="bottom">Bottom</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.14em] text-zinc-600">
                Text case
              </span>
              <button
                type="button"
                onClick={() => update({ uppercase: !style.uppercase, preset: "custom" })}
                className={`flex h-10 w-full items-center justify-between rounded-xl border px-3 text-xs transition ${
                  style.uppercase
                    ? "border-cyan-300/25 bg-cyan-300/[0.08] text-cyan-100"
                    : "border-white/[0.08] bg-[#080b10] text-zinc-400"
                }`}
              >
                <span>{style.uppercase ? "UPPERCASE" : "Sentence case"}</span>
                <span className={`h-4 w-7 rounded-full p-0.5 transition ${style.uppercase ? "bg-cyan-300/40" : "bg-white/10"}`}>
                  <span className={`block h-3 w-3 rounded-full bg-white transition-transform ${style.uppercase ? "translate-x-3" : ""}`} />
                </span>
              </button>
            </label>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-black/20 px-3 py-2.5">
              <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-zinc-600">Text color</span>
              <input
                type="color"
                value={style.textColor}
                onChange={(event) => update({ textColor: event.target.value, preset: "custom" })}
                className="h-7 w-9 cursor-pointer rounded-md border-0 bg-transparent p-0"
                aria-label="Caption text color"
              />
            </label>
            <label className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-black/20 px-3 py-2.5">
              <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-zinc-600">Highlight</span>
              <input
                type="color"
                value={style.highlightColor}
                onChange={(event) => update({ highlightColor: event.target.value, preset: "custom" })}
                className="h-7 w-9 cursor-pointer rounded-md border-0 bg-transparent p-0"
                aria-label="Caption highlight color"
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================================
   LANDING PAGE
============================================================================ */

export function LandingPage({
  onGetStarted,
  onOpenPricing,
  onOpenNewProjectWithUrl,
  onUploadFile,
}: LandingPageProps) {
  const [url, setUrl] = useState("");
  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState("");
  const [activePremiumMetric, setActivePremiumMetric] = useState(0);

  const [captionStyle, setCaptionStyle] =
    useState<CaptionStyleSettings>(() =>
      cloneCaptionStyle(DEFAULT_CAPTION_STYLE)
    );

  const [captionPickerOpen, setCaptionPickerOpen] =
    useState(false);

  const [captionMode, setCaptionMode] =
    useState<CaptionProcessingMode>("clips");

  const [openFaq, setOpenFaq] =
    useState<number | null>(null);

  const [scrolled, setScrolled] = useState(false);

  const spotlightRef =
    useRef<HTMLDivElement | null>(null);

  const latestPointer = useRef({
    x: 50,
    y: 15,
  });

  const pointerRaf = useRef<number | null>(null);

  const normalizedUrl = useMemo(
    () => url.trim(),
    [url]
  );

  useEffect(() => {
    const id = window.setInterval(() => {
      setActivePremiumMetric((value) => (value + 1) % 4);
    }, 2400);
    return () => window.clearInterval(id);
  }, []);

  const acceptVideoFile = (file: File) => {
    if (!file.type.startsWith("video/") && !/\.(mp4|mov|webm|mkv|avi)$/i.test(file.name)) {
      setFileError("Please choose a supported video file.");
      return;
    }

    setFileError("");
    setSelectedFile(file);
    setUrl("");
  };

  /* ==========================================================================
     SEO HEAD
  ========================================================================== */

  useEffect(() => {
    document.title = SEO_TITLE;

    const setMeta = (
      name: string,
      content: string
    ) => {
      let meta = document.head.querySelector(
        `meta[name="${name}"]`
      ) as HTMLMetaElement | null;

      if (!meta) {
        meta = document.createElement("meta");
        meta.name = name;
        document.head.appendChild(meta);
      }

      meta.content = content;
    };

    const setProperty = (
      property: string,
      content: string
    ) => {
      let meta = document.head.querySelector(
        `meta[property="${property}"]`
      ) as HTMLMetaElement | null;

      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute("property", property);
        document.head.appendChild(meta);
      }

      meta.setAttribute("content", content);
    };

    setMeta("description", SEO_DESCRIPTION);

    setMeta(
      "keywords",
      SEO_KEYWORDS
    );

    setMeta(
      "robots",
      "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
    );

    setMeta(
      "googlebot",
      "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
    );

    setMeta(
      "author",
      "LumoClip"
    );

    setMeta(
      "application-name",
      SITE_NAME
    );

    setMeta(
      "theme-color",
      "#040608"
    );

    setProperty(
      "og:type",
      "website"
    );

    setProperty(
      "og:site_name",
      SITE_NAME
    );

    setProperty(
      "og:title",
      SEO_TITLE
    );

    setProperty(
      "og:description",
      SEO_DESCRIPTION
    );

    setProperty(
      "og:url",
      `${SITE_URL}/`
    );

    setProperty(
      "og:image",
      `${SITE_URL}/og-image.png`
    );

    setProperty(
      "og:image:alt",
      "LumoClip AI Video Clipper"
    );

    setProperty(
      "og:locale",
      "en_US"
    );

    setMeta(
      "twitter:card",
      "summary_large_image"
    );

    setMeta(
      "twitter:title",
      SEO_TITLE
    );

    setMeta(
      "twitter:description",
      SEO_DESCRIPTION
    );

    setMeta(
      "twitter:image",
      `${SITE_URL}/og-image.png`
    );

    setMeta(
      "twitter:image:alt",
      "LumoClip AI Video Clipper"
    );

    let canonical =
      document.head.querySelector(
        'link[rel="canonical"]'
      ) as HTMLLinkElement | null;

    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }

    canonical.href = `${SITE_URL}/`;

    let icon =
      document.head.querySelector(
        'link[rel="icon"]'
      ) as HTMLLinkElement | null;

    if (!icon) {
      icon = document.createElement("link");
      icon.rel = "icon";
      document.head.appendChild(icon);
    }

    icon.href = "/favicon.ico";

    return () => {
      /* Keep global SEO metadata intact.
         The landing page is the canonical homepage. */
    };
  }, []);

  /* ==========================================================================
     STRUCTURED DATA
  ========================================================================== */

  const organizationJsonLd = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "LumoClip",
      alternateName: "Lumo Clip",
      url: `${SITE_URL}/`,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/logo.png`,
        width: 512,
        height: 512,
      },
      description: SEO_DESCRIPTION,
    }),
    []
  );

  const websiteJsonLd = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: `${SITE_URL}/`,
      name: "LumoClip",
      alternateName: "Lumo Clip",
      description: SEO_DESCRIPTION,
      publisher: {
        "@id": `${SITE_URL}/#organization`,
      },
      inLanguage: "en-US",
    }),
    []
  );

  const softwareJsonLd = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "@id": `${SITE_URL}/#software`,
      name: "LumoClip",
      alternateName: "Lumo Clip",
      applicationCategory: "MultimediaApplication",
      applicationSubCategory:
        "AI Video Editing Software",
      operatingSystem: "Web",
      url: `${SITE_URL}/`,
      description:
        "LumoClip is an AI video clipper that turns long-form videos into engaging short-form content.",
      image: `${SITE_URL}/logo.png`,
      publisher: {
        "@id": `${SITE_URL}/#organization`,
      },
      offers: {
        "@type": "Offer",
        url: `${SITE_URL}/`,
        price: "0",
        priceCurrency: "USD",
        availability:
          "https://schema.org/InStock",
      },
    }),
    []
  );

  const faqJsonLd = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "@id": `${SITE_URL}/#faq`,
      mainEntity: faqs.map((faq) => ({
        "@type": "Question",
        name: faq.q,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.a,
        },
      })),
    }),
    []
  );

  /* ==========================================================================
     INTERACTION / PERFORMANCE
  ========================================================================== */

  useEffect(() => {
    const move = (event: MouseEvent) => {
      latestPointer.current = {
        x:
          (event.clientX /
            Math.max(window.innerWidth, 1)) *
          100,
        y:
          (event.clientY /
            Math.max(window.innerHeight, 1)) *
          100,
      };

      if (pointerRaf.current !== null) return;

      pointerRaf.current =
        window.requestAnimationFrame(() => {
          pointerRaf.current = null;

          const node = spotlightRef.current;

          if (!node) return;

          node.style.left = `${latestPointer.current.x}%`;
          node.style.top = `${latestPointer.current.y}%`;
        });
    };

    let scrollTicking = false;

    const scroll = () => {
      if (scrollTicking) return;

      scrollTicking = true;

      window.requestAnimationFrame(() => {
        scrollTicking = false;

        const next =
          window.scrollY > 300;

        setScrolled((prev) =>
          prev === next ? prev : next
        );
      });
    };

    window.addEventListener(
      "mousemove",
      move,
      { passive: true }
    );

    window.addEventListener(
      "scroll",
      scroll,
      { passive: true }
    );

    return () => {
      window.removeEventListener(
        "mousemove",
        move
      );

      window.removeEventListener(
        "scroll",
        scroll
      );

      if (
        pointerRaf.current !== null
      ) {
        window.cancelAnimationFrame(
          pointerRaf.current
        );
      }
    };
  }, []);

  const submit = () => {
    const selectedStyle = {
      ...cloneCaptionStyle(captionStyle),
      mode: captionMode,
    } as CaptionStyleSettings;

    if (selectedFile) {
      onUploadFile?.(selectedFile, selectedStyle);
      return;
    }

    if (!normalizedUrl) {
      onGetStarted();
      return;
    }

    onOpenNewProjectWithUrl(
      normalizedUrl,
      selectedStyle
    );
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#040608] text-white">
      {/* ====================================================================
          STRUCTURED DATA
      ==================================================================== */}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html:
            JSON.stringify(
              organizationJsonLd
            ),
        }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html:
            JSON.stringify(
              websiteJsonLd
            ),
        }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html:
            JSON.stringify(
              softwareJsonLd
            ),
        }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html:
            JSON.stringify(
              faqJsonLd
            ),
        }}
      />

      {/* ====================================================================
          GLOBAL BACKGROUND
      ==================================================================== */}

      <div className="pointer-events-none fixed inset-0 -z-20 overflow-hidden">
        <Glow className="left-[-18%] top-[-15%] h-[650px] w-[650px] bg-cyan-500/[0.075]" />

        <Glow className="right-[-20%] top-[5%] h-[720px] w-[720px] bg-blue-600/[0.07]" />

        <Glow className="left-[25%] top-[40%] h-[600px] w-[600px] bg-cyan-400/[0.025]" />

        <Glow className="right-[10%] top-[70%] h-[500px] w-[500px] bg-blue-500/[0.025]" />

        <div
          className="absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(34,211,238,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,.045) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
            maskImage:
              "radial-gradient(circle at 50% 4%, black, transparent 72%)",
            WebkitMaskImage:
              "radial-gradient(circle at 50% 4%, black, transparent 72%)",
          }}
        />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,transparent_0%,#040608_72%)]" />
      </div>

      {/* ====================================================================
          MAIN
      ==================================================================== */}

      <main id="top">
        {/* ==================================================================
            HERO
        ================================================================== */}

        <section
          aria-labelledby="hero-title"
          className="relative min-h-screen overflow-hidden"
        >
          <div
            ref={spotlightRef}
            aria-hidden="true"
            className="pointer-events-none absolute h-[650px] w-[650px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-300/[0.035] blur-[70px] transition-all duration-1000"
            style={{
              left: "50%",
              top: "15%",
            }}
          />

          <Glow className="left-1/2 top-[-320px] h-[700px] w-[1100px] -translate-x-1/2 bg-cyan-400/[0.065]" />

          <div className="relative mx-auto max-w-[1280px] px-5 pb-20 pt-20 sm:px-6 sm:pt-24 lg:px-8 lg:pt-28">
            <div className="mx-auto max-w-5xl text-center">
              <Reveal immediate>
                <SectionLabel>
                  AI VIDEO CLIPPER
                </SectionLabel>
              </Reveal>

              <Reveal immediate delay={80}>
                <h1
                  id="hero-title"
                  className="mt-7 text-[52px] font-black leading-[0.88] tracking-[-0.07em] sm:text-[78px] lg:text-[104px]"
                >
                  <span className="sr-only">
                    LumoClip: AI Video Clipper.{" "}
                  </span>

                  Turn Long Videos Into
                  <br />

                  <span className="relative bg-gradient-to-r from-cyan-100 via-cyan-300 to-blue-400 bg-clip-text text-transparent">
                    Shorts With AI.
                  </span>
                </h1>
              </Reveal>

              <Reveal immediate delay={150}>
                <p className="mx-auto mt-8 max-w-2xl text-sm leading-7 text-zinc-600 sm:text-base sm:leading-8">
                  LumoClip is an AI video clipper
                  that finds the best moments from
                  your long videos and turns them
                  into engaging short-form content
                  for YouTube Shorts, TikTok, and
                  Instagram Reels.
                </p>
              </Reveal>

              {/* SOURCE BOX */}

              <Reveal
                immediate
                delay={220}
                className="mx-auto mt-10 max-w-[800px]"
              >
                <div className="relative">
                  <div className="absolute -inset-4 rounded-[38px] bg-gradient-to-r from-cyan-400/[0.09] via-blue-500/[0.07] to-cyan-400/[0.09] blur-2xl" />

                  <div className="relative rounded-[30px] border border-white/[0.09] bg-[#080b10]/90 p-2 shadow-[0_40px_140px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
                    <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                      <div className="flex min-w-0 items-center gap-3 rounded-[21px] border border-white/[0.055] bg-white/[0.018] px-3 transition focus-within:border-cyan-300/20">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-300/10 bg-cyan-400/[0.06]">
                          <Link2
                            aria-hidden="true"
                            className="h-4 w-4 text-cyan-300"
                          />
                        </div>

                        <label
                          htmlFor="youtube-url"
                          className="sr-only"
                        >
                          YouTube video URL
                        </label>

                        <input
                          id="youtube-url"
                          value={url}
                          onChange={(e) => {
                            setUrl(
                              e.target.value
                            );

                            if (
                              selectedFile
                            ) {
                              setSelectedFile(
                                null
                              );
                            }
                          }}
                          onKeyDown={(e) => {
                            if (
                              e.key ===
                              "Enter"
                            ) {
                              submit();
                            }
                          }}
                          placeholder="Paste a YouTube URL..."
                          autoComplete="url"
                          inputMode="url"
                          className="h-12 min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-zinc-700"
                        />

                        {url && (
                          <button
                            type="button"
                            aria-label="Clear YouTube URL"
                            onClick={() =>
                              setUrl("")
                            }
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-700 transition hover:bg-white/[0.04] hover:text-white"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      <PremiumButton
                        onClick={submit}
                        icon
                      >
                        {captionMode === "full_video_caption"
                          ? "Create full captioned video"
                          : "Start creating"}
                      </PremiumButton>
                    </div>

                    <CaptionStylePicker
                      style={captionStyle}
                      open={captionPickerOpen}
                      onToggle={() => {
                        setCaptionPickerOpen((open) => {
                          if (!open) {
                            setCaptionMode("full_video_caption");
                          }
                          return !open;
                        });
                      }}
                      onChange={(nextStyle) => {
                        setCaptionMode("full_video_caption");
                        setCaptionStyle(nextStyle);
                      }}
                    />

                    <div className="my-2 flex items-center gap-3 px-2">
                      <div className="h-px flex-1 bg-white/[0.045]" />

                      <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-zinc-800">
                        OR
                      </span>

                      <div className="h-px flex-1 bg-white/[0.045]" />
                    </div>

                    <label
                      className={`group flex cursor-pointer items-center justify-between gap-4 rounded-[21px] border border-dashed px-4 py-3.5 transition-all duration-300 ${
                        isDragging
                          ? "border-cyan-300/50 bg-cyan-400/[0.08] shadow-[0_0_45px_rgba(34,211,238,0.08)]"
                          : "border-cyan-300/10 bg-cyan-400/[0.018] hover:border-cyan-300/25 hover:bg-cyan-400/[0.04]"
                      }`}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                      }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                        const file = e.dataTransfer.files?.[0];
                        if (file) acceptVideoFile(file);
                      }}
                    >
                      <input
                        type="file"
                        accept="video/*,.mp4,.mov,.webm,.mkv"
                        className="sr-only"
                        onChange={(e) => {
                          const file =
                            e.target.files?.[0];

                          if (!file) return;

                          acceptVideoFile(file);

                          // Keep the file selected so the user can choose
                          // a caption style before starting the job.
                        }}
                      />

                      <div className="flex min-w-0 items-center gap-3">
                        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-300/10 bg-cyan-400/[0.06] transition group-hover:scale-105">
                          <Upload className="relative h-4 w-4 text-cyan-300" />
                        </div>

                        <div className="min-w-0 text-left">
                          <p className="truncate text-xs font-bold text-zinc-200">
                            {selectedFile
                              ? selectedFile.name
                              : "Upload your video"}
                          </p>

                          <p className="mt-0.5 text-[9px] text-zinc-700">
                            {selectedFile
                              ? `${(
                                  selectedFile.size /
                                  1024 /
                                  1024
                                ).toFixed(
                                  1
                                )} MB • ready to process`
                              : "MP4, MOV, WebM and supported video formats"}
                          </p>
                        </div>
                      </div>

                      <span className="shrink-0 rounded-xl border border-white/[0.07] bg-white/[0.035] px-3 py-2 text-[9px] font-bold text-zinc-400 transition group-hover:border-cyan-300/15 group-hover:text-cyan-200">
                        {selectedFile
                          ? "Change"
                          : "Choose file"}
                      </span>
                    </label>

                    {fileError && (
                      <p className="mt-2 px-2 text-left text-[9px] font-medium text-rose-300">{fileError}</p>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-2">
                  {[
                    "AI-powered",
                    "Upload or URL",
                    "No editing expertise",
                    "Fast workflow",
                  ].map((item) => (
                    <span
                      key={item}
                      className="flex items-center gap-1.5 text-[8px] font-medium text-zinc-800"
                    >
                      <Check className="h-3 w-3 text-emerald-400/70" />

                      {item}
                    </span>
                  ))}
                </div>
              </Reveal>

              {/* TOOL GRID (Opus-style small icon buttons) */}

              <Reveal immediate delay={260} className="mt-12">
                <ToolGrid
                  onSelect={(label) =>
                    onGetStarted(
                      label === "Enhance speech"
                        ? "enhance-speech"
                        : undefined
                    )
                  }
                />
              </Reveal>
            </div>

            {/* HERO INTELLIGENCE */}

            <Reveal
              immediate
              delay={300}
              className="relative mx-auto mt-20 max-w-[1120px]"
            >
              <div className="grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="order-2 lg:order-1">
                  <SectionLabel icon={WandSparkles}>
                    AI video intelligence
                  </SectionLabel>

                  <h2 className="mt-7 text-3xl font-black tracking-[-0.055em] text-white sm:text-5xl">
                    Your content.
                    <br />

                    <span className="text-zinc-700">
                      Understood by AI.
                    </span>
                  </h2>

                  <p className="mt-5 max-w-lg text-sm leading-7 text-zinc-700">
                    LumoClip analyzes what is
                    being said, what matters and
                    what could become compelling
                    short-form content.
                  </p>

                  <div className="mt-7 grid gap-2 sm:grid-cols-2">
                    {[
                      [Mic2, "Context analysis"],
                      [Sparkles, "Moment detection"],
                      [Scissors, "Clip generation"],
                      [Subtitles, "Caption generation"],
                    ].map(([Icon, text]) => {
                      const I =
                        Icon as React.ElementType;

                      return (
                        <div
                          key={String(text)}
                          className="group flex items-center gap-3 rounded-2xl border border-white/[0.05] bg-white/[0.012] px-3 py-3 transition hover:border-cyan-300/10 hover:bg-white/[0.025]"
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-400/[0.05]">
                            <I className="h-3.5 w-3.5 text-cyan-300 transition group-hover:scale-110" />
                          </div>

                          <span className="text-[10px] font-semibold text-zinc-500">
                            {String(text)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="order-1 lg:order-2">
                  <AIOrb />
                </div>
              </div>
            </Reveal>

            <Reveal immediate delay={100}>
              <div className="mx-auto mt-6 max-w-[1000px]">
                <MiniStats />
              </div>
            </Reveal>
          </div>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-[#040608] to-transparent" />
        </section>

        {/* ==================================================================
            OUTPUT PREVIEW
        ================================================================== */}

        <section
          aria-labelledby="outputs-title"
          className="relative border-y border-white/[0.045] py-24 sm:py-32"
          style={lazySectionStyle}
        >
          <Glow className="left-1/2 top-1/2 h-[550px] w-[900px] -translate-x-1/2 -translate-y-1/2 bg-cyan-400/[0.025]" />

          <div className="relative mx-auto max-w-[1200px] px-5 sm:px-6 lg:px-8">
            <div className="grid items-center gap-12 lg:grid-cols-[0.75fr_1.25fr]">
              <Reveal>
                <SectionLabel icon={Film}>
                  AI video repurposing
                </SectionLabel>

                <h2
                  id="outputs-title"
                  className="mt-7 text-3xl font-black tracking-[-0.055em] sm:text-5xl"
                >
                  One source.
                  <br />

                  <span className="bg-gradient-to-r from-cyan-200 to-blue-400 bg-clip-text text-transparent">
                    Multiple assets.
                  </span>
                </h2>

                <p className="mt-5 max-w-lg text-sm leading-7 text-zinc-700">
                  Transform one long-form video
                  into short-form clips, AI hooks,
                  captions and content directions.
                </p>

                <div className="mt-7 space-y-3">
                  {[
                    "AI short-form clips",
                    "AI hooks & titles",
                    "Captions & descriptions",
                    "Content directions",
                  ].map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-3"
                    >
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400/10">
                        <Check className="h-3 w-3 text-emerald-300" />
                      </div>

                      <span className="text-xs text-zinc-500">
                        {item}
                      </span>
                    </div>
                  ))}
                </div>
              </Reveal>

              <Reveal delay={100}>
                <OutputPreview />
              </Reveal>
            </div>
          </div>
        </section>

        {/* ==================================================================
            FEATURES
        ================================================================== */}

        <section
          id="features"
          aria-labelledby="features-title"
          className="scroll-mt-20 py-24 sm:py-32"
          style={lazySectionStyle}
        >
          <div className="mx-auto max-w-[1200px] px-5 sm:px-6 lg:px-8">
            <Reveal>
              <div className="mx-auto max-w-2xl text-center">
                <SectionLabel>
                  AI video clipping features
                </SectionLabel>

                <h2
                  id="features-title"
                  className="mt-6 text-3xl font-black tracking-[-0.055em] sm:text-5xl"
                >
                  Everything you need to
                  <br />

                  <span className="text-zinc-700">
                    repurpose at scale.
                  </span>
                </h2>

                <p className="mt-5 text-sm leading-7 text-zinc-700">
                  A single AI workspace for
                  discovering, generating and
                  organizing your next short-form
                  content ideas.
                </p>
              </div>
            </Reveal>

            <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {features.map(
                (item, index) => (
                  <FeatureCard
                    key={item.title}
                    item={item}
                    index={index}
                  />
                )
              )}
            </div>
          </div>
        </section>

        {/* ==================================================================
            AI ENGINE
        ================================================================== */}

        <section
          aria-labelledby="intelligence-title"
          className="relative overflow-hidden border-y border-white/[0.045] py-24 sm:py-32"
          style={lazySectionStyle}
        >
          <Glow className="left-1/2 top-1/2 h-[600px] w-[900px] -translate-x-1/2 -translate-y-1/2 bg-cyan-400/[0.035]" />

          <div className="relative mx-auto max-w-[1200px] px-5 sm:px-6 lg:px-8">
            <div className="grid items-center gap-12 lg:grid-cols-[0.8fr_1.2fr]">
              <Reveal>
                <SectionLabel icon={Sparkles}>
                  Lumo Intelligence
                </SectionLabel>

                <h2
                  id="intelligence-title"
                  className="mt-7 text-3xl font-black tracking-[-0.055em] sm:text-5xl"
                >
                  Not just
                  <br />

                  <span className="bg-gradient-to-r from-cyan-200 to-blue-400 bg-clip-text text-transparent">
                    automatic.
                  </span>

                  <br />

                  <span className="text-zinc-700">
                    Intelligent.
                  </span>
                </h2>

                <p className="mt-5 max-w-lg text-sm leading-7 text-zinc-700">
                  LumoClip is designed to find
                  content worth publishing instead
                  of creating random clips.
                </p>

                <div className="mt-7 space-y-3">
                  {[
                    "Semantic content understanding",
                    "Context-aware moment detection",
                    "AI-generated hooks and captions",
                    "Organized project workflow",
                  ].map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-3"
                    >
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400/10">
                        <Check className="h-3 w-3 text-emerald-300" />
                      </div>

                      <span className="text-xs text-zinc-500">
                        {item}
                      </span>
                    </div>
                  ))}
                </div>
              </Reveal>

              <Reveal delay={120}>
                <ProcessingVisual />
              </Reveal>
            </div>
          </div>
        </section>

        {/* ==================================================================
            BIG STATEMENT
        ================================================================== */}

        <section
          className="relative overflow-hidden py-28 sm:py-40"
          style={lazySectionStyle}
        >
          <Glow className="left-1/2 top-1/2 h-[500px] w-[800px] -translate-x-1/2 -translate-y-1/2 bg-cyan-400/[0.045]" />

          <Reveal className="relative mx-auto max-w-5xl px-5 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-300/10 bg-cyan-400/[0.045] shadow-[0_0_60px_rgba(34,211,238,0.08)]">
              <WandSparkles className="h-6 w-6 text-cyan-300" />
            </div>

            <h2 className="mt-8 text-4xl font-black leading-[0.98] tracking-[-0.065em] sm:text-6xl lg:text-7xl">
              Stop searching.
              <br />

              <span className="bg-gradient-to-r from-cyan-200 via-cyan-300 to-blue-400 bg-clip-text text-transparent">
                Start creating.
              </span>
            </h2>

            <p className="mx-auto mt-7 max-w-2xl text-sm leading-7 text-zinc-700 sm:text-base">
              Your time should go into ideas,
              storytelling and creativity — not
              endless timeline scrubbing.
            </p>

            <div className="mt-9">
              <PremiumButton
                onClick={() => onGetStarted()}
              >
                Build your content engine
              </PremiumButton>
            </div>
          </Reveal>
        </section>

        {/* ==================================================================
            WORKFLOW
        ================================================================== */}

        <section
          id="workflow"
          aria-labelledby="workflow-title"
          className="scroll-mt-20 border-y border-white/[0.045] py-24 sm:py-32"
          style={lazySectionStyle}
        >
          <div className="mx-auto max-w-[1200px] px-5 sm:px-6 lg:px-8">
            <Reveal>
              <div className="mb-14 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <SectionLabel icon={Command}>
                    Simple AI workflow
                  </SectionLabel>

                  <h2
                    id="workflow-title"
                    className="mt-6 text-3xl font-black tracking-[-0.055em] sm:text-5xl"
                  >
                    Source.
                    <span className="text-zinc-700">
                      {" "}
                      Intelligence.
                    </span>
                    <br />

                    <span className="text-zinc-700">
                      Content.
                    </span>
                  </h2>
                </div>

                <p className="max-w-md text-sm leading-6 text-zinc-700">
                  Designed to remove repetitive
                  video editing work while keeping
                  you in control of what gets
                  published.
                </p>
              </div>
            </Reveal>

            <Workflow />
          </div>
        </section>

        {/* ==================================================================
            CAPABILITY GRID
        ================================================================== */}

        <section
          aria-labelledby="capability-title"
          className="py-24 sm:py-32"
          style={lazySectionStyle}
        >
          <div className="mx-auto max-w-[1200px] px-5 sm:px-6 lg:px-8">
            <div className="grid gap-4 lg:grid-cols-2">
              <Reveal>
                <article className="group relative h-full overflow-hidden rounded-[32px] border border-white/[0.07] bg-gradient-to-br from-cyan-400/[0.055] via-white/[0.012] to-transparent p-8 sm:p-10">
                  <Glow className="right-[-130px] top-[-130px] h-80 w-80 bg-cyan-400/[0.07]" />

                  <div className="relative">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/10 bg-cyan-400/[0.055]">
                      <Sparkles className="h-5 w-5 text-cyan-300" />
                    </div>

                    <h2
                      id="capability-title"
                      className="mt-7 text-2xl font-black tracking-tight sm:text-3xl"
                    >
                      One source.
                      <br />
                      Many possibilities.
                    </h2>

                    <p className="mt-4 max-w-lg text-sm leading-7 text-zinc-700">
                      Turn one long-form video
                      into multiple short-form
                      directions without rebuilding
                      your workflow every time.
                    </p>

                    <div className="mt-8 flex flex-wrap gap-2">
                      {[
                        "Short clips",
                        "AI hooks",
                        "Captions",
                        "Hashtags",
                        "Titles",
                        "Content ideas",
                      ].map((item) => (
                        <span
                          key={item}
                          className="rounded-full border border-white/[0.06] bg-white/[0.025] px-3 py-1.5 text-[9px] font-semibold text-zinc-500 transition hover:border-cyan-300/15 hover:text-cyan-200"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </article>
              </Reveal>

              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  [
                    Clock3,
                    "Save creative time",
                    "Automate repetitive video discovery tasks.",
                  ],
                  [
                    Layers3,
                    "Centralized workspace",
                    "Keep projects and video assets organized.",
                  ],
                  [
                    Command,
                    "Fast iteration",
                    "Explore more short-form content directions.",
                  ],
                  [
                    Film,
                    "Short-form ready",
                    "Designed around vertical-first content.",
                  ],
                ].map(
                  ([Icon, title, text], index) => {
                    const I =
                      Icon as React.ElementType;

                    return (
                      <Reveal
                        key={String(title)}
                        delay={index * 70}
                      >
                        <article className="group h-full rounded-[27px] border border-white/[0.06] bg-white/[0.012] p-6 transition-all duration-500 hover:-translate-y-1 hover:border-cyan-300/10 hover:bg-white/[0.022]">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.035]">
                            <I className="h-4 w-4 text-zinc-600 transition group-hover:text-cyan-300" />
                          </div>

                          <h3 className="mt-5 text-sm font-bold text-white">
                            {String(title)}
                          </h3>

                          <p className="mt-2 text-xs leading-5 text-zinc-700">
                            {String(text)}
                          </p>
                        </article>
                      </Reveal>
                    );
                  }
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ==================================================================
            CTA
        ================================================================== */}

        <section
          id="pricing"
          aria-labelledby="cta-title"
          className="scroll-mt-20 py-24 sm:py-32"
          style={lazySectionStyle}
        >
          <div className="mx-auto max-w-5xl px-5 sm:px-6">
            <Reveal>
              <div className="relative overflow-hidden rounded-[36px] border border-white/[0.08] bg-gradient-to-br from-cyan-400/[0.06] via-white/[0.015] to-blue-500/[0.045] p-8 text-center shadow-[0_40px_120px_rgba(0,0,0,0.3)] sm:p-14 lg:p-16">
                <Glow className="left-[-120px] top-[-120px] h-72 w-72 bg-cyan-400/[0.08]" />

                <Glow className="bottom-[-130px] right-[-120px] h-80 w-80 bg-blue-500/[0.08]" />

                <div className="relative">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.035]">
                    <Sparkles className="h-6 w-6 text-cyan-300" />
                  </div>

                  <p className="mt-6 text-[9px] font-bold uppercase tracking-[0.22em] text-cyan-300">
                    Your AI video content engine
                  </p>

                  <h2
                    id="cta-title"
                    className="mt-4 text-3xl font-black tracking-[-0.055em] sm:text-5xl"
                  >
                    Make every video
                    <br />

                    <span className="bg-gradient-to-r from-cyan-200 to-blue-400 bg-clip-text text-transparent">
                      work harder.
                    </span>
                  </h2>

                  <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-zinc-700">
                    Bring your content into LumoClip
                    and let AI handle the repetitive
                    work.
                  </p>

                  <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                    <PremiumButton
                      onClick={() => onGetStarted()}
                    >
                      Start creating
                    </PremiumButton>

                    <PremiumButton
                      onClick={onOpenPricing}
                      variant="secondary"
                      icon={false}
                    >
                      View pricing
                    </PremiumButton>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ==================================================================
            PREMIUM AI DASHBOARD PREVIEW
        ================================================================== */}

        <section
          aria-labelledby="premium-preview-title"
          className="relative overflow-hidden border-y border-white/[0.045] py-24 sm:py-32"
          style={lazySectionStyle}
        >
          <Glow className="left-[8%] top-[10%] h-[420px] w-[420px] bg-cyan-400/[0.025]" />
          <Glow className="right-[4%] bottom-[4%] h-[500px] w-[500px] bg-blue-500/[0.025]" />

          <div className="relative mx-auto max-w-[1200px] px-5 sm:px-6 lg:px-8">
            <Reveal>
              <div className="mx-auto max-w-3xl text-center">
                <SectionLabel icon={Gauge}>
                  Creator intelligence dashboard
                </SectionLabel>
                <h2
                  id="premium-preview-title"
                  className="mt-6 text-3xl font-black tracking-[-0.055em] sm:text-5xl"
                >
                  See the signal.
                  <br />
                  <span className="bg-gradient-to-r from-cyan-200 to-blue-400 bg-clip-text text-transparent">
                    Not just the clip.
                  </span>
                </h2>
                <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-zinc-700">
                  Give creators a clear reason to trust the output: what was detected, why it matters and which asset should be published first.
                </p>
              </div>
            </Reveal>

            <Reveal delay={90} className="mt-12">
              <div className="relative overflow-hidden rounded-[34px] border border-white/[0.08] bg-[#080b10]/90 p-4 shadow-[0_40px_120px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:p-6">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent" />
                <div className="flex flex-col gap-4 border-b border-white/[0.05] pb-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-300/10 bg-cyan-400/[0.06]">
                      <Activity className="h-4 w-4 text-cyan-300" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">AI Content Intelligence</p>
                      <p className="mt-0.5 text-[9px] text-zinc-700">Example analysis · 18:42 source video</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-emerald-300/10 bg-emerald-300/[0.05] px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.14em] text-emerald-300">Analysis complete</span>
                    <span className="rounded-full border border-white/[0.07] bg-white/[0.025] px-2.5 py-1 font-mono text-[8px] text-zinc-600">AI v1</span>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    [Target, "Viral potential", "98%", "Strong hook + payoff"],
                    [Clock3, "Best moment", "00:42", "High-value story beat"],
                    [Subtitles, "Caption ready", "100%", "Speech detected"],
                    [TrendingUp, "Publish score", "94/100", "Top output candidate"],
                  ].map(([Icon, title, value, detail], index) => (
                    <button
                      key={String(title)}
                      type="button"
                      onClick={() => setActivePremiumMetric(index)}
                      className={`text-left ${activePremiumMetric === index ? "ring-1 ring-cyan-300/20" : ""}`}
                    >
                      <PremiumSignalCard
                        icon={Icon as React.ElementType}
                        title={String(title)}
                        value={String(value)}
                        detail={String(detail)}
                      />
                    </button>
                  ))}
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
                  <div className="rounded-[26px] border border-white/[0.06] bg-black/20 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-cyan-300">Moment map</p>
                        <p className="mt-1 text-xs font-semibold text-zinc-300">Where the strongest content lives</p>
                      </div>
                      <MousePointer2 className="h-4 w-4 text-zinc-700" />
                    </div>
                    <div className="mt-5 flex h-24 items-end gap-1.5 overflow-hidden rounded-2xl border border-white/[0.05] bg-white/[0.015] px-3 pb-3 pt-4">
                      {Array.from({ length: 52 }).map((_, i) => {
                        const height = 15 + ((i * 37 + 23) % 75);
                        const hot = [6,7,8,9,10,22,23,24,25,38,39,40,41].includes(i);
                        return (
                          <div
                            key={i}
                            className={`w-full rounded-full transition-all duration-500 ${hot ? "bg-gradient-to-t from-cyan-500 to-cyan-100 shadow-[0_0_12px_rgba(34,211,238,0.25)]" : "bg-white/[0.07]"}`}
                            style={{ height: `${height}%`, opacity: hot ? 1 : 0.45 }}
                          />
                        );
                      })}
                    </div>
                    <div className="mt-3 flex justify-between font-mono text-[7px] text-zinc-800">
                      <span>00:00</span><span>06:00</span><span>12:00</span><span>18:42</span>
                    </div>
                  </div>

                  <div className="rounded-[26px] border border-white/[0.06] bg-black/20 p-5">
                    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-cyan-300">Recommended output</p>
                    <div className="mt-4 rounded-2xl border border-cyan-300/10 bg-cyan-300/[0.025] p-4">
                      <div className="flex items-center justify-between">
                        <span className="rounded-lg border border-white/[0.07] bg-black/20 px-2 py-1 font-mono text-[7px] text-cyan-300">#01</span>
                        <span className="font-mono text-[8px] text-emerald-300">98%</span>
                      </div>
                      <p className="mt-5 text-sm font-black text-white">The strongest idea</p>
                      <p className="mt-1 text-[9px] leading-4 text-zinc-700">Hook → insight → payoff. Ideal for a short-form cut.</p>
                      <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/[0.05]"><div className="h-full w-[98%] rounded-full bg-gradient-to-r from-cyan-400 to-blue-500" /></div>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-[8px] text-zinc-700"><CheckCheck className="h-3 w-3 text-emerald-300/70" /> Ready for review</div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ==================================================================
            PLATFORM READY
        ================================================================== */}

        <section
          aria-labelledby="platform-title"
          className="py-24 sm:py-32"
          style={lazySectionStyle}
        >
          <div className="mx-auto max-w-[1200px] px-5 sm:px-6 lg:px-8">
            <div className="grid items-center gap-12 lg:grid-cols-[0.8fr_1.2fr]">
              <Reveal>
                <SectionLabel icon={Smartphone}>
                  Platform-ready content
                </SectionLabel>
                <h2 id="platform-title" className="mt-6 text-3xl font-black tracking-[-0.055em] sm:text-5xl">
                  One edit.
                  <br />
                  <span className="text-zinc-700">Every format.</span>
                </h2>
                <p className="mt-5 max-w-lg text-sm leading-7 text-zinc-700">
                  Design the landing page around the outcome creators want: content that is already structured for where it will be published.
                </p>
                <div className="mt-7 grid gap-2 sm:grid-cols-2">
                  {trustPoints.slice(0, 4).map((item) => (
                    <div key={item} className="flex items-center gap-2 text-[9px] font-semibold text-zinc-500">
                      <Check className="h-3.5 w-3.5 text-emerald-300/80" />
                      {item}
                    </div>
                  ))}
                </div>
              </Reveal>
              <Reveal delay={100}>
                <div className="grid gap-3 sm:grid-cols-2">
                  {platformItems.map(([Icon, name, format]) => (
                    <PlatformCard key={name} icon={Icon} name={name} format={format} />
                  ))}
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ==================================================================
            CREATOR USE CASES
        ================================================================== */}

        <section
          aria-labelledby="use-cases-title"
          className="relative overflow-hidden border-y border-white/[0.045] py-24 sm:py-32"
          style={lazySectionStyle}
        >
          <div className="mx-auto max-w-[1200px] px-5 sm:px-6 lg:px-8">
            <Reveal>
              <div className="mx-auto max-w-2xl text-center">
                <SectionLabel icon={Globe2}>
                  Built for modern creators
                </SectionLabel>
                <h2 id="use-cases-title" className="mt-6 text-3xl font-black tracking-[-0.055em] sm:text-5xl">
                  Less editing.
                  <br />
                  <span className="bg-gradient-to-r from-cyan-200 to-blue-400 bg-clip-text text-transparent">More publishing.</span>
                </h2>
              </div>
            </Reveal>

            <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {creatorUseCases.map(([Icon, title, text], index) => (
                <Reveal key={String(title)} delay={index * 70}>
                  <article className="group h-full rounded-[27px] border border-white/[0.06] bg-white/[0.012] p-6 transition-all duration-500 hover:-translate-y-1.5 hover:border-cyan-300/15 hover:bg-white/[0.025]">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.03]">
                      <Icon className="h-5 w-5 text-cyan-300 transition group-hover:scale-110" />
                    </div>
                    <h3 className="mt-6 text-sm font-bold text-white">{title}</h3>
                    <p className="mt-2 text-xs leading-5 text-zinc-700">{text}</p>
                    <div className="mt-6 flex items-center gap-2 text-[8px] font-bold uppercase tracking-[0.17em] text-zinc-800 transition group-hover:text-cyan-300">Explore workflow <ArrowRight className="h-3 w-3" /></div>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ==================================================================
            PREMIUM WORKFLOW TIMELINE
        ================================================================== */}

        <section
          aria-labelledby="premium-workflow-title"
          className="py-24 sm:py-32"
          style={lazySectionStyle}
        >
          <div className="mx-auto max-w-[1000px] px-5 sm:px-6">
            <Reveal>
              <div className="text-center">
                <SectionLabel icon={Command}>
                  From raw video to content engine
                </SectionLabel>
                <h2 id="premium-workflow-title" className="mt-6 text-3xl font-black tracking-[-0.055em] sm:text-5xl">
                  A workflow that
                  <br />
                  <span className="text-zinc-700">gets out of your way.</span>
                </h2>
              </div>
            </Reveal>

            <div className="relative mt-14">
              <div className="absolute bottom-7 left-[18px] top-7 hidden w-px bg-gradient-to-b from-cyan-300/30 via-cyan-300/10 to-transparent sm:block" />
              <div className="space-y-4">
                {premiumWorkflow.map(([no, title, text], index) => (
                  <Reveal key={no} delay={index * 60}>
                    <article className="group relative flex gap-4 rounded-[25px] border border-white/[0.06] bg-white/[0.012] p-5 transition-all duration-300 hover:border-cyan-300/15 hover:bg-white/[0.022] sm:items-center sm:p-6">
                      <div className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-300/10 bg-[#070a0e] font-mono text-[8px] font-bold text-cyan-300">{no}</div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-bold text-white">{title}</h3>
                        <p className="mt-1 text-xs leading-5 text-zinc-700">{text}</p>
                      </div>
                      <Check className="hidden h-4 w-4 text-emerald-300/70 sm:block" />
                    </article>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ==================================================================
            FAQ
        ================================================================== */}

        <section
          id="faq"
          aria-labelledby="faq-title"
          className="border-t border-white/[0.045] py-24 sm:py-32"
          style={lazySectionStyle}
        >
          <div className="mx-auto max-w-3xl px-5 sm:px-6">
            <Reveal>
              <div className="text-center">
                <SectionLabel icon={MessageSquareText}>
                  LumoClip FAQ
                </SectionLabel>

                <h2
                  id="faq-title"
                  className="mt-6 text-3xl font-black tracking-[-0.055em] sm:text-5xl"
                >
                  Frequently asked
                  questions
                </h2>

                <p className="mt-4 text-sm text-zinc-700">
                  Learn more about LumoClip,
                  AI video clipping and
                  short-form content creation.
                </p>
              </div>
            </Reveal>

            <div className="mt-12 space-y-3">
              {faqs.map(
                (faq, index) => {
                  const open =
                    openFaq === index;

                  return (
                    <Reveal
                      key={faq.q}
                      delay={index * 50}
                    >
                      <article
                        className={`overflow-hidden rounded-2xl border transition-all duration-300 ${
                          open
                            ? "border-cyan-300/15 bg-cyan-400/[0.025] shadow-[0_15px_50px_rgba(34,211,238,0.035)]"
                            : "border-white/[0.06] bg-white/[0.012]"
                        }`}
                      >
                        <button
                          type="button"
                          aria-expanded={
                            open
                          }
                          aria-controls={`faq-answer-${index}`}
                          onClick={() =>
                            setOpenFaq(
                              open
                                ? null
                                : index
                            )
                          }
                          className="flex w-full items-center justify-between gap-5 px-5 py-5 text-left"
                        >
                          <span className="text-sm font-semibold text-zinc-300">
                            {faq.q}
                          </span>

                          <ChevronDown
                            aria-hidden="true"
                            className={`h-4 w-4 shrink-0 transition ${
                              open
                                ? "rotate-180 text-cyan-300"
                                : "text-zinc-700"
                            }`}
                          />
                        </button>

                        <div
                          id={`faq-answer-${index}`}
                          className={`grid transition-all duration-300 ${
                            open
                              ? "grid-rows-[1fr] opacity-100"
                              : "grid-rows-[0fr] opacity-0"
                          }`}
                        >
                          <div className="overflow-hidden">
                            <p className="px-5 pb-5 text-sm leading-6 text-zinc-700">
                              {faq.a}
                            </p>
                          </div>
                        </div>
                      </article>
                    </Reveal>
                  );
                }
              )}
            </div>
          </div>
        </section>

        {/* ==================================================================
            FINAL CTA
        ================================================================== */}

        <section
          aria-labelledby="final-cta-title"
          className="relative overflow-hidden py-24 sm:py-32"
          style={lazySectionStyle}
        >
          <Glow className="left-1/2 top-1/2 h-[550px] w-[800px] -translate-x-1/2 -translate-y-1/2 bg-cyan-400/[0.04]" />

          <Reveal className="relative mx-auto max-w-4xl px-5 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] border border-white/[0.08] bg-gradient-to-br from-cyan-400/[0.08] to-blue-500/[0.08]">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-300 to-blue-600 shadow-[0_0_35px_rgba(34,211,238,0.2)]">
                <span className="text-sm font-black text-white">
                  L
                </span>
              </div>
            </div>

            <h2
              id="final-cta-title"
              className="mt-7 text-4xl font-black tracking-[-0.065em] sm:text-6xl"
            >
              Your content has
              <br />

              <span className="bg-gradient-to-r from-cyan-200 to-blue-400 bg-clip-text text-transparent">
                more to say.
              </span>
            </h2>

            <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-zinc-700">
              Let LumoClip help you discover it,
              shape it and turn it into short-form
              content.
            </p>

            <div className="mt-8">
              <PremiumButton
                onClick={() => onGetStarted()}
              >
                Get started with LumoClip
              </PremiumButton>
            </div>
          </Reveal>
        </section>
      </main>

      {/* ====================================================================
          FOOTER
      ==================================================================== */}

      <footer className="border-t border-white/[0.05]">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-5 px-5 py-8 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-cyan-300/10 bg-cyan-400/[0.045]">
              <span className="text-xs font-black text-cyan-300">
                L
              </span>
            </div>

            <span className="text-sm font-bold text-zinc-400">
              Lumo
              <span className="text-cyan-300">
                Clip
              </span>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[8px] font-bold uppercase tracking-[0.18em] text-zinc-800">
            <span>
              LumoClip AI video clipper
            </span>

            <span>•</span>

            <span>
              Built for creators
            </span>

            <span>•</span>

            <span>
              AI content engine
            </span>
          </div>
        </div>
      </footer>

      {/* ====================================================================
          BACK TO TOP
      ==================================================================== */}

      <button
        type="button"
        aria-label="Back to top"
        onClick={() =>
          window.scrollTo({
            top: 0,
            behavior: "smooth",
          })
        }
        className={`fixed bottom-5 right-5 z-40 flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-[#090c10]/85 text-zinc-600 shadow-xl backdrop-blur-xl transition-all duration-300 hover:border-cyan-300/20 hover:text-cyan-300 ${
          scrolled
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-3 opacity-0"
        }`}
      >
        <ArrowRight
          aria-hidden="true"
          className="h-4 w-4 -rotate-90"
        />
      </button>

      {/* ====================================================================
          CSS
      ==================================================================== */}

      <style>{`
        html {
          scroll-behavior: smooth;
        }

        ::selection {
          background: rgba(34, 211, 238, 0.25);
          color: white;
        }

        @keyframes floatA {
          0%,
          100% {
            transform: translateY(0px);
          }

          50% {
            transform: translateY(-11px);
          }
        }

        @keyframes floatB {
          0%,
          100% {
            transform: translateY(0px);
          }

          50% {
            transform: translateY(11px);
          }
        }

        @keyframes orbFloat {
          0%,
          100% {
            transform: translate3d(0, 0, 0) scale(1);
          }

          50% {
            transform: translate3d(15px, -12px, 0) scale(1.08);
          }
        }

        @keyframes orbFloat2 {
          0%,
          100% {
            transform: translate3d(0, 0, 0) scale(1);
          }

          50% {
            transform: translate3d(-14px, 10px, 0) scale(1.1);
          }
        }

        @keyframes spinCW {
          from {
            transform: rotate(0deg);
          }

          to {
            transform: rotate(360deg);
          }
        }

        @keyframes spinCCW {
          from {
            transform: rotate(0deg);
          }

          to {
            transform: rotate(-360deg);
          }
        }

        @keyframes progressLoop {
          0% {
            width: 61%;
          }

          92% {
            width: 96%;
          }

          100% {
            width: 61%;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            scroll-behavior: auto !important;
            animation-duration: 0.001ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.001ms !important;
          }
        }
      `}</style>
    </div>
  );
}

export default LandingPage;