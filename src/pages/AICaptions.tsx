import { useEffect } from "react";
import {
  ArrowRight,
  Check,
  ChevronRight,
  Captions,
  Film,
  Languages,
  Play,
  Sparkles,
  Subtitles,
  WandSparkles,
  Zap,
} from "lucide-react";

type AICaptionsProps = {
  onGetStarted?: () => void;
};

const SITE_URL = "https://lumo-clip.com";

const SEO_TITLE =
  "AI Caption Generator | Automatic Video Captions & Subtitles | LumoClip";

const SEO_DESCRIPTION =
  "Generate captions for videos with AI using LumoClip. Create automatic video captions and subtitles for short-form and long-form content with a fast creator workflow.";

const SEO_KEYWORDS = [
  "AI captions",
  "AI caption generator",
  "automatic video captions",
  "AI subtitle generator",
  "automatic subtitles",
  "video caption generator",
  "captions for videos",
  "AI subtitles",
  "video captions",
  "LumoClip",
].join(", ");

const faqs = [
  {
    question: "What is an AI caption generator?",
    answer:
      "An AI caption generator automatically creates text captions from spoken content in a video. It can save time compared with manually transcribing and timing every line.",
  },
  {
    question: "Can LumoClip automatically caption videos?",
    answer:
      "Yes. LumoClip includes an AI caption workflow designed to generate captions from video content without requiring creators to manually type every spoken word.",
  },
  {
    question: "Can I use AI captions for short-form videos?",
    answer:
      "Yes. AI captions are particularly useful for short-form content such as YouTube Shorts, TikTok videos and Instagram Reels because viewers can follow the spoken content through on-screen text.",
  },
  {
    question: "Does LumoClip support full-video captions?",
    answer:
      "LumoClip's caption workflow supports full-video caption processing, allowing captions to be generated for an entire video rather than only selected clips.",
  },
  {
    question: "Why are captions useful for videos?",
    answer:
      "Captions make spoken content easier to follow when viewers cannot or do not want to listen to audio. They also provide a text layer that helps communicate the video's message visually.",
  },
];

const relatedTools = [
  {
    href: "/long-video-to-shorts",
    title: "Long Video to Shorts",
    description:
      "Turn long-form videos into short-form content.",
  },
  {
    href: "/ai-video-reframe",
    title: "AI Video Reframe",
    description:
      "Adapt video framing for different formats.",
  },
  {
    href: "/ai-speech-enhancer",
    title: "AI Speech Enhancer",
    description:
      "Improve spoken audio in your videos.",
  },
  {
    href: "/ai-sound-effects",
    title: "AI Sound Effects",
    description:
      "Add automatic sound effects to your content.",
  },
];

export function AICaptions({
  onGetStarted,
}: AICaptionsProps) {
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

      meta.content = content;
    };

    setMeta(
      "description",
      SEO_DESCRIPTION
    );

    setMeta(
      "keywords",
      SEO_KEYWORDS
    );

    setMeta(
      "robots",
      "index, follow"
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
      `${SITE_URL}/ai-captions`
    );

    setProperty(
      "og:type",
      "website"
    );

    setProperty(
      "og:image",
      `${SITE_URL}/og-image.png`
    );

    setProperty(
      "og:image:alt",
      "LumoClip AI Caption Generator"
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

    let canonical =
      document.head.querySelector(
        'link[rel="canonical"]'
      ) as HTMLLinkElement | null;

    if (!canonical) {
      canonical = document.createElement(
        "link"
      );

      canonical.rel = "canonical";

      document.head.appendChild(
        canonical
      );
    }

    canonical.href =
      `${SITE_URL}/ai-captions`;

    const oldSchema =
      document.getElementById(
        "ai-captions-schema"
      );

    if (oldSchema) {
      oldSchema.remove();
    }

    const schema = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id":
        `${SITE_URL}/ai-captions#webpage`,
      url:
        `${SITE_URL}/ai-captions`,
      name: SEO_TITLE,
      description: SEO_DESCRIPTION,
      inLanguage: "en-US",
      isPartOf: {
        "@type": "WebSite",
        name: "LumoClip",
        url: SITE_URL,
      },
      about: {
        "@type": "Thing",
        name: "AI Video Captions",
      },
      mainEntity: {
        "@type": "SoftwareApplication",
        name: "LumoClip",
        applicationCategory:
          "MultimediaApplication",
        operatingSystem: "Web",
        url: SITE_URL,
      },
    };

    const script =
      document.createElement("script");

    script.id =
      "ai-captions-schema";

    script.type =
      "application/ld+json";

    script.textContent =
      JSON.stringify(schema);

    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, []);

  const startCreating = () => {
    if (onGetStarted) {
      onGetStarted();
      return;
    }

    window.location.href = "/";
  };

  return (
    <div className="min-h-screen overflow-hidden bg-[#050507] text-white">
      {/* Background */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0"
      >
        <div className="absolute left-1/2 top-[-260px] h-[650px] w-[900px] -translate-x-1/2 rounded-full bg-violet-500/[0.10] blur-[140px]" />

        <div className="absolute bottom-[-220px] right-[-120px] h-[500px] w-[500px] rounded-full bg-fuchsia-500/[0.06] blur-[130px]" />

        <div className="absolute left-[-180px] top-[35%] h-[400px] w-[400px] rounded-full bg-indigo-500/[0.05] blur-[120px]" />
      </div>

      {/* Header */}
      <header className="relative z-20 border-b border-white/[0.06] bg-[#050507]/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-6 lg:px-8">
          <a
            href="/"
            className="flex items-center gap-2.5"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-violet-300/15 bg-violet-400/[0.07]">
              <span className="text-sm font-black text-violet-300">
                L
              </span>
            </div>

            <span className="text-base font-black tracking-tight">
              Lumo
              <span className="text-violet-300">
                Clip
              </span>
            </span>
          </a>

          <button
            type="button"
            onClick={startCreating}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-black transition hover:scale-[1.02] hover:bg-zinc-200"
          >
            Start creating
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      <main className="relative z-10">
        {/* Breadcrumb */}
        <div className="mx-auto max-w-7xl px-5 pt-8 sm:px-6 lg:px-8">
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-2 text-[11px] font-medium text-zinc-600"
          >
            <a
              href="/"
              className="transition hover:text-white"
            >
              LumoClip
            </a>

            <ChevronRight className="h-3 w-3" />

            <span className="text-zinc-400">
              AI Captions
            </span>
          </nav>
        </div>

        {/* Hero */}
        <section className="relative px-5 pb-20 pt-20 sm:px-6 sm:pb-28 sm:pt-28 lg:px-8">
          <div className="mx-auto max-w-5xl text-center">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-violet-300/10 bg-violet-400/[0.06] px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-violet-300">
              <Captions className="h-3.5 w-3.5" />
              AI Video Caption Generator
            </div>

            <h1 className="mt-7 text-5xl font-black leading-[0.92] tracking-[-0.065em] sm:text-7xl lg:text-[88px]">
              Add Captions
              <br />

              <span className="bg-gradient-to-r from-violet-200 via-violet-300 to-fuchsia-400 bg-clip-text text-transparent">
                To Videos With AI.
              </span>
            </h1>

            <p className="mx-auto mt-7 max-w-2xl text-sm leading-7 text-zinc-500 sm:text-base sm:leading-8">
              Generate automatic video captions and
              subtitles with LumoClip. Turn spoken words
              into an on-screen text layer and speed up
              your video editing workflow.
            </p>

            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={startCreating}
                className="group inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white px-6 text-sm font-bold text-black shadow-[0_20px_70px_rgba(255,255,255,0.08)] transition hover:-translate-y-0.5 hover:bg-zinc-200"
              >
                Generate AI Captions
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </button>

              <a
                href="/"
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.025] px-6 text-sm font-semibold text-zinc-300 transition hover:border-violet-300/20 hover:bg-white/[0.045] hover:text-white"
              >
                Explore LumoClip
              </a>
            </div>
          </div>
        </section>

        {/* Caption workflow */}
        <section className="border-y border-white/[0.05] bg-white/[0.012] px-5 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-2xl">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-300">
                AI caption workflow
              </div>

              <h2 className="mt-5 text-3xl font-black tracking-[-0.05em] sm:text-5xl">
                From spoken words
                <br />
                <span className="text-zinc-500">
                  to readable captions.
                </span>
              </h2>

              <p className="mt-5 text-sm leading-7 text-zinc-600">
                LumoClip turns the repetitive captioning
                process into an AI-assisted workflow built
                for creators.
              </p>
            </div>

            <div className="mt-12 grid gap-4 md:grid-cols-3">
              {[
                {
                  icon: Film,
                  number: "01",
                  title: "Add your video",
                  text: "Start with your video and prepare it for the caption workflow.",
                },
                {
                  icon: WandSparkles,
                  number: "02",
                  title: "AI processes speech",
                  text: "LumoClip analyzes spoken content and prepares the caption text.",
                },
                {
                  icon: Subtitles,
                  number: "03",
                  title: "Create captions",
                  text: "Generate captions for your video without manually typing every line.",
                },
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <article
                    key={item.number}
                    className="rounded-[26px] border border-white/[0.07] bg-[#080b10]/80 p-6"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-violet-300/10 bg-violet-400/[0.06]">
                        <Icon className="h-5 w-5 text-violet-300" />
                      </div>

                      <span className="font-mono text-[10px] text-zinc-700">
                        {item.number}
                      </span>
                    </div>

                    <h3 className="mt-7 text-base font-bold">
                      {item.title}
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-zinc-600">
                      {item.text}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="px-5 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.025] px-3 py-2 text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                  <Zap className="h-3.5 w-3.5 text-violet-300" />
                  Built for video creators
                </div>

                <h2 className="mt-6 text-3xl font-black tracking-[-0.05em] sm:text-5xl">
                  Captions without
                  <br />
                  <span className="text-zinc-500">
                    the repetitive work.
                  </span>
                </h2>

                <p className="mt-5 text-sm leading-7 text-zinc-600">
                  Use AI captions as part of your larger
                  LumoClip editing workflow.
                </p>

                <button
                  type="button"
                  onClick={startCreating}
                  className="mt-7 inline-flex items-center gap-2 rounded-xl bg-violet-500 px-5 py-3 text-xs font-bold text-white transition hover:bg-violet-400"
                >
                  Try AI Captions
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  {
                    icon: Captions,
                    title: "Automatic video captions",
                    text: "Create captions from spoken video content.",
                  },
                  {
                    icon: Subtitles,
                    title: "AI subtitles",
                    text: "Convert speech into a readable subtitle layer.",
                  },
                  {
                    icon: Languages,
                    title: "Creator-friendly workflow",
                    text: "Reduce manual transcription and captioning work.",
                  },
                  {
                    icon: Sparkles,
                    title: "Short-form ready",
                    text: "Use captions as part of your Shorts and social workflow.",
                  },
                ].map((item) => {
                  const Icon = item.icon;

                  return (
                    <article
                      key={item.title}
                      className="rounded-2xl border border-white/[0.06] bg-white/[0.015] p-5"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-300/10 bg-violet-400/[0.05]">
                        <Icon className="h-4 w-4 text-violet-300" />
                      </div>

                      <h3 className="mt-5 text-sm font-bold text-white">
                        {item.title}
                      </h3>

                      <p className="mt-2 text-xs leading-5 text-zinc-600">
                        {item.text}
                      </p>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Related tools */}
        <section className="border-y border-white/[0.05] bg-white/[0.012] px-5 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="text-center">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-300">
                More AI video tools
              </div>

              <h2 className="mt-5 text-3xl font-black tracking-[-0.05em] sm:text-5xl">
                One AI workspace.
                <br />
                <span className="text-zinc-500">
                  More ways to edit.
                </span>
              </h2>
            </div>

            <div className="mt-12 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              {relatedTools.map((tool) => (
                <a
                  key={tool.href}
                  href={tool.href}
                  className="group rounded-[23px] border border-white/[0.06] bg-[#080b10]/70 p-5 transition hover:-translate-y-1 hover:border-violet-300/15"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-300/10 bg-violet-400/[0.05]">
                      <Sparkles className="h-4 w-4 text-violet-300" />
                    </div>

                    <ArrowRight className="h-4 w-4 text-zinc-700 transition group-hover:translate-x-1 group-hover:text-violet-300" />
                  </div>

                  <h3 className="mt-6 text-sm font-bold text-white">
                    {tool.title}
                  </h3>

                  <p className="mt-2 text-xs leading-5 text-zinc-600">
                    {tool.description}
                  </p>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="px-5 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <div className="text-center">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-300">
                FAQ
              </div>

              <h2 className="mt-5 text-3xl font-black tracking-[-0.05em] sm:text-5xl">
                AI Caption Generator
                <br />
                <span className="text-zinc-500">
                  questions.
                </span>
              </h2>
            </div>

            <div className="mt-12 space-y-3">
              {faqs.map((faq) => (
                <details
                  key={faq.question}
                  className="group rounded-2xl border border-white/[0.06] bg-white/[0.012] p-5"
                >
                  <summary className="cursor-pointer list-none text-sm font-bold text-zinc-300 marker:hidden">
                    <div className="flex items-center justify-between gap-5">
                      <span>{faq.question}</span>

                      <ChevronRight className="h-4 w-4 shrink-0 text-zinc-600 transition group-open:rotate-90" />
                    </div>
                  </summary>

                  <p className="mt-4 pr-8 text-sm leading-7 text-zinc-600">
                    {faq.answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-5 pb-24 sm:px-6 sm:pb-32 lg:px-8">
          <div className="mx-auto max-w-5xl overflow-hidden rounded-[32px] border border-white/[0.08] bg-gradient-to-br from-violet-400/[0.08] via-white/[0.015] to-fuchsia-500/[0.06] px-6 py-14 text-center sm:px-12 sm:py-20">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-300/10 bg-violet-400/[0.07]">
              <Captions className="h-5 w-5 text-violet-300" />
            </div>

            <h2 className="mt-7 text-3xl font-black tracking-[-0.05em] sm:text-5xl">
              Make your videos
              <br />
              <span className="bg-gradient-to-r from-violet-200 to-fuchsia-400 bg-clip-text text-transparent">
                easier to follow.
              </span>
            </h2>

            <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-zinc-600">
              Generate AI captions and make captioning
              part of your LumoClip video workflow.
            </p>

            <button
              type="button"
              onClick={startCreating}
              className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-sm font-bold text-black transition hover:bg-zinc-200"
            >
              Generate AI Captions
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.05]">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 text-xs text-zinc-700 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div>
            © {new Date().getFullYear()} LumoClip
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <a
              href="/"
              className="transition hover:text-zinc-300"
            >
              AI Video Editor
            </a>

            <a
              href="/long-video-to-shorts"
              className="transition hover:text-zinc-300"
            >
              Long Video to Shorts
            </a>

            <a
              href="/ai-video-reframe"
              className="transition hover:text-zinc-300"
            >
              AI Reframe
            </a>

            <a
              href="/ai-speech-enhancer"
              className="transition hover:text-zinc-300"
            >
              Enhance Speech
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default AICaptions;