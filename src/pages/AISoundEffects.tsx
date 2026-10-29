import { useEffect } from "react";
import {
  ArrowRight,
  Check,
  ChevronRight,
  Film,
  Music2,
  Play,
  Sparkles,
  WandSparkles,
  Volume2,
  Zap,
} from "lucide-react";

interface AISoundEffectsProps {
  onGetStarted?: () => void;
}

const SEO_TITLE =
  "AI Sound Effects Generator | Auto SFX for Videos | LumoClip";

const SEO_DESCRIPTION =
  "Add sound effects to videos with LumoClip AI. Automatically enhance your video workflow with AI-powered sound effects for Shorts and social content.";

const SEO_KEYWORDS = [
  "AI sound effects",
  "AI sound effects generator",
  "AI SFX generator",
  "automatic sound effects",
  "auto SFX",
  "sound effects for videos",
  "AI video sound effects",
  "video sound effects generator",
  "automatic SFX",
  "LumoClip",
].join(", ");

const faqs = [
  {
    question: "What is an AI sound effects generator?",
    answer:
      "An AI sound effects generator helps creators add suitable sound effects to video content using an AI-powered workflow instead of manually searching for every effect.",
  },
  {
    question: "Can LumoClip add sound effects to videos?",
    answer:
      "Yes. LumoClip includes an Auto SFX feature designed to help creators add sound effects as part of their video editing workflow.",
  },
  {
    question: "Who can use Auto SFX?",
    answer:
      "Creators making Shorts, social videos, tutorials, commentary, entertainment content and other video formats can use Auto SFX to enhance their edits.",
  },
  {
    question: "Can I use Auto SFX for short-form videos?",
    answer:
      "Yes. Auto SFX is particularly useful when creating short-form videos where sound can help make moments feel more engaging.",
  },
  {
    question: "Why add sound effects to videos?",
    answer:
      "Sound effects can help emphasize moments, transitions and actions, giving video edits additional audio detail and making important moments stand out.",
  },
];

const relatedTools = [
  {
    title: "Long Video to Shorts",
    description: "Turn long-form videos into engaging short-form clips.",
    href: "/long-video-to-shorts",
    icon: Film,
  },
  {
    title: "AI Captions",
    description: "Generate captions and subtitles for your videos.",
    href: "/ai-captions",
    icon: WandSparkles,
  },
  {
    title: "AI Speech Enhancer",
    description: "Improve spoken audio clarity in your videos.",
    href: "/ai-speech-enhancer",
    icon: Volume2,
  },
  {
    title: "AI Video Reframe",
    description: "Adapt video framing for short-form and mobile content.",
    href: "/ai-video-reframe",
    icon: Zap,
  },
];

export function AISoundEffects({
  onGetStarted,
}: AISoundEffectsProps) {
  useEffect(() => {
    document.title = SEO_TITLE;

    const setMeta = (
      attribute: "name" | "property",
      key: string,
      content: string,
    ) => {
      let element = document.head.querySelector(
        `meta[${attribute}="${key}"]`,
      ) as HTMLMetaElement | null;

      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attribute, key);
        document.head.appendChild(element);
      }

      element.setAttribute("content", content);
    };

    setMeta("name", "description", SEO_DESCRIPTION);
    setMeta("name", "keywords", SEO_KEYWORDS);

    setMeta("property", "og:title", SEO_TITLE);
    setMeta("property", "og:description", SEO_DESCRIPTION);
    setMeta("property", "og:type", "website");
    setMeta(
      "property",
      "og:url",
      "https://lumo-clip.com/ai-sound-effects",
    );
    setMeta("property", "og:site_name", "LumoClip");

    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", SEO_TITLE);
    setMeta("name", "twitter:description", SEO_DESCRIPTION);

    let canonical = document.head.querySelector(
      'link[rel="canonical"]',
    ) as HTMLLinkElement | null;

    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }

    canonical.href = "https://lumo-clip.com/ai-sound-effects";

    const existingSchema = document.getElementById(
      "lumoclip-ai-sound-effects-schema",
    );

    if (existingSchema) {
      existingSchema.remove();
    }

    const schema = document.createElement("script");

    schema.id = "lumoclip-ai-sound-effects-schema";
    schema.type = "application/ld+json";

    schema.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebPage",
          name: SEO_TITLE,
          description: SEO_DESCRIPTION,
          url: "https://lumo-clip.com/ai-sound-effects",
          isPartOf: {
            "@type": "WebSite",
            name: "LumoClip",
            url: "https://lumo-clip.com/",
          },
        },
        {
          "@type": "SoftwareApplication",
          name: "LumoClip",
          applicationCategory: "MultimediaApplication",
          operatingSystem: "Web",
          description: SEO_DESCRIPTION,
          url: "https://lumo-clip.com/",
          keywords: SEO_KEYWORDS,
          featureList: [
            "AI sound effects",
            "Automatic sound effects",
            "Auto SFX",
            "Long video to shorts",
            "AI captions",
            "AI speech enhancement",
            "AI video reframing",
          ],
        },
        {
          "@type": "FAQPage",
          mainEntity: faqs.map((faq) => ({
            "@type": "Question",
            name: faq.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: faq.answer,
            },
          })),
        },
      ],
    });

    document.head.appendChild(schema);

    return () => {
      const currentSchema = document.getElementById(
        "lumoclip-ai-sound-effects-schema",
      );

      if (currentSchema) {
        currentSchema.remove();
      }
    };
  }, []);

  const handleGetStarted = () => {
    if (onGetStarted) {
      onGetStarted();
      return;
    }

    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-300px] h-[650px] w-[650px] -translate-x-1/2 -translate-y-0 rounded-full bg-fuchsia-500/10 blur-[140px]" />
        <div className="absolute bottom-[-250px] right-[-150px] h-[500px] w-[500px] rounded-full bg-violet-600/10 blur-[130px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/[0.06] bg-black/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <a
            href="/"
            className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-black">
              <Sparkles className="h-4 w-4" />
            </div>

            <span className="text-lg font-semibold tracking-tight">
              LumoClip
            </span>
          </a>

          <button
            onClick={handleGetStarted}
            className="group flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-medium transition-all hover:border-white/20 hover:bg-white/10"
          >
            Get Started
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </header>

      <main className="relative z-10">
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-5 pb-24 pt-20 text-center lg:px-8 lg:pb-32 lg:pt-28">
          <div className="mx-auto mb-7 inline-flex items-center gap-2 rounded-full border border-fuchsia-400/20 bg-fuchsia-400/[0.07] px-4 py-2 text-sm text-fuchsia-200">
            <Music2 className="h-4 w-4" />
            AI Sound Effects
          </div>

          <h1 className="mx-auto max-w-5xl text-4xl font-semibold leading-[1.08] tracking-[-0.04em] sm:text-5xl lg:text-7xl">
            Add sound that makes
            <span className="block bg-gradient-to-r from-white via-white to-white/50 bg-clip-text text-transparent">
              your videos stand out.
            </span>
          </h1>

          <p className="mx-auto mt-7 max-w-2xl text-base leading-7 text-white/55 sm:text-lg">
            Use LumoClip Auto SFX to add sound effects to your videos as part
            of a faster AI-powered editing workflow.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              onClick={handleGetStarted}
              className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-sm font-semibold text-black transition-all hover:scale-[1.02] hover:bg-white/90 sm:w-auto"
            >
              Try Auto SFX
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>

            <a
              href="/"
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-3.5 text-sm font-medium text-white/80 transition-all hover:bg-white/[0.08] sm:w-auto"
            >
              Explore LumoClip
              <ChevronRight className="h-4 w-4" />
            </a>
          </div>

          {/* Hero visual */}
          <div className="mx-auto mt-16 max-w-4xl">
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035] p-2 shadow-2xl shadow-black/40">
              <div className="rounded-[22px] border border-white/[0.06] bg-[#0b0b0d] p-6 sm:p-8">
                <div className="mb-7 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-fuchsia-400/10 text-fuchsia-300">
                      <Music2 className="h-5 w-5" />
                    </div>

                    <div className="text-left">
                      <p className="text-sm font-medium">
                        Auto SFX
                      </p>

                      <p className="mt-1 text-xs text-white/40">
                        AI sound effects workflow
                      </p>
                    </div>
                  </div>

                  <div className="rounded-full border border-emerald-400/15 bg-emerald-400/5 px-3 py-1.5 text-xs text-emerald-300">
                    Ready
                  </div>
                </div>

                <div className="rounded-2xl border border-white/[0.06] bg-black/30 p-5">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-white/50">
                        Video timeline
                      </p>

                      <p className="mt-1 text-[11px] text-white/25">
                        AI-assisted sound effects
                      </p>
                    </div>

                    <Volume2 className="h-4 w-4 text-white/30" />
                  </div>

                  <div className="relative h-24 overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02]">
                    <div className="absolute inset-x-0 top-1/2 h-px bg-white/[0.06]" />

                    {[
                      {
                        left: "10%",
                        width: "13%",
                        label: "Impact",
                      },
                      {
                        left: "30%",
                        width: "17%",
                        label: "Whoosh",
                      },
                      {
                        left: "56%",
                        width: "12%",
                        label: "Click",
                      },
                      {
                        left: "76%",
                        width: "14%",
                        label: "Transition",
                      },
                    ].map((effect) => (
                      <div
                        key={effect.label}
                        className="absolute top-7 h-10 rounded-lg border border-fuchsia-400/20 bg-fuchsia-400/[0.08] px-3"
                        style={{
                          left: effect.left,
                          width: effect.width,
                        }}
                      >
                        <div className="flex h-full items-center gap-2">
                          <Music2 className="h-3 w-3 shrink-0 text-fuchsia-300/70" />

                          <span className="truncate text-[10px] text-fuchsia-100/60">
                            {effect.label}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 flex items-center justify-between text-xs text-white/30">
                    <span>Video</span>
                    <span>Auto SFX enabled</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="border-y border-white/[0.06] bg-white/[0.015]">
          <div className="mx-auto grid max-w-6xl gap-5 px-5 py-16 sm:grid-cols-3 lg:px-8">
            {[
              {
                icon: Music2,
                title: "More engaging edits",
                text: "Add extra audio detail to important moments in your videos.",
              },
              {
                icon: WandSparkles,
                title: "AI-powered workflow",
                text: "Use Auto SFX as part of a streamlined AI video editing process.",
              },
              {
                icon: Zap,
                title: "Less manual work",
                text: "Spend less time manually searching through effects for every edit.",
              },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.title}
                  className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6"
                >
                  <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05]"
                  >
                    <Icon className="h-4 w-4 text-white/70" />
                  </div>

                  <h2 className="text-base font-semibold">
                    {item.title}
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-white/45">
                    {item.text}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Workflow */}
        <section className="mx-auto max-w-6xl px-5 py-24 lg:px-8 lg:py-32">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-fuchsia-300">
              SIMPLE WORKFLOW
            </p>

            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              Add sound effects without slowing down your edit.
            </h2>

            <p className="mt-4 text-base leading-7 text-white/45">
              Keep your creative workflow simple. Use Auto SFX to add sound
              effects while working on your video instead of treating audio as
              a completely separate process.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              {
                number: "01",
                title: "Add your video",
                text: "Start with the video you want to enhance with additional sound effects.",
              },
              {
                number: "02",
                title: "Use Auto SFX",
                text: "Let LumoClip's Auto SFX workflow help add sound effects to your edit.",
              },
              {
                number: "03",
                title: "Finish your content",
                text: "Combine SFX with captions, reframing, speech enhancement and Shorts creation.",
              },
            ].map((step) => (
              <div
                key={step.number}
                className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-7"
              >
                <span className="text-xs font-semibold tracking-widest text-white/25">
                  {step.number}
                </span>

                <h3 className="mt-7 text-lg font-semibold">
                  {step.title}
                </h3>

                <p className="mt-3 text-sm leading-6 text-white/45">
                  {step.text}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Feature section */}
        <section className="border-y border-white/[0.06] bg-white/[0.015]">
          <div className="mx-auto max-w-6xl px-5 py-24 lg:px-8 lg:py-32">
            <div className="grid items-start gap-14 lg:grid-cols-[0.9fr_1.1fr]">
              <div>
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-fuchsia-400/15 bg-fuchsia-400/[0.07] text-fuchsia-300">
                  <Music2 className="h-5 w-5" />
                </div>

                <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  Give your edits more audio detail.
                </h2>

                <p className="mt-5 text-base leading-7 text-white/45">
                  Small sound details can help emphasize actions, transitions
                  and moments in your video. Auto SFX brings that process into
                  your LumoClip workflow.
                </p>

                <button
                  onClick={handleGetStarted}
                  className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-white/90"
                >
                  Try Auto SFX
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              <div className="grid gap-3">
                {[
                  "AI-powered sound effects workflow",
                  "Designed for video creators",
                  "Useful for short-form content",
                  "Add audio detail to important moments",
                  "Works alongside LumoClip's other video tools",
                ].map((feature) => (
                  <div
                    key={feature}
                    className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] px-5 py-4"
                  >
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/[0.07]">
                      <Check className="h-3.5 w-3.5 text-white/70" />
                    </div>

                    <span className="text-sm text-white/65">
                      {feature}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Use cases */}
        <section className="mx-auto max-w-6xl px-5 py-24 lg:px-8 lg:py-32">
          <div className="text-center">
            <p className="text-sm font-medium text-fuchsia-300">
              USE CASES
            </p>

            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              Sound effects for different types of content.
            </h2>

            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-white/45">
              Auto SFX can fit naturally into many creator workflows where
              additional sound helps emphasize the edit.
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "YouTube Shorts",
                text: "Add sound details to fast-paced short-form edits.",
              },
              {
                title: "TikTok videos",
                text: "Enhance mobile-first content with additional audio moments.",
              },
              {
                title: "Instagram Reels",
                text: "Add effects to transitions and important moments.",
              },
              {
                title: "Tutorials",
                text: "Use sound effects to emphasize actions and changes.",
              },
              {
                title: "Commentary",
                text: "Add audio details around reactions and key moments.",
              },
              {
                title: "Entertainment",
                text: "Give short-form edits additional audio personality.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6"
              >
                <h3 className="text-base font-semibold">
                  {item.title}
                </h3>

                <p className="mt-2 text-sm leading-6 text-white/40">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Related tools */}
        <section className="border-y border-white/[0.06] bg-white/[0.015]">
          <div className="mx-auto max-w-6xl px-5 py-24 lg:px-8 lg:py-32">
            <div className="text-center">
              <p className="text-sm font-medium text-fuchsia-300">
                MORE AI VIDEO TOOLS
              </p>

              <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                Build more from every video.
              </h2>

              <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-white/45">
                Combine Auto SFX with LumoClip's other working tools to create
                more polished short-form content.
              </p>
            </div>

            <div className="mt-12 grid gap-4 sm:grid-cols-2">
              {relatedTools.map((tool) => {
                const Icon = tool.icon;

                return (
                  <a
                    key={tool.href}
                    href={tool.href}
                    className="group rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6 transition-all hover:-translate-y-0.5 hover:border-white/15 hover:bg-white/[0.045]"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05]">
                        <Icon className="h-4 w-4 text-white/65" />
                      </div>

                      <ArrowRight className="h-4 w-4 text-white/25 transition-transform group-hover:translate-x-1 group-hover:text-white/60" />
                    </div>

                    <h3 className="mt-6 text-base font-semibold">
                      {tool.title}
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-white/40">
                      {tool.description}
                    </p>
                  </a>
                );
              })}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto max-w-4xl px-5 py-24 lg:px-8 lg:py-32">
          <div className="text-center">
            <p className="text-sm font-medium text-fuchsia-300">
              FAQ
            </p>

            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              AI sound effects questions.
            </h2>
          </div>

          <div className="mt-12 space-y-3">
            {faqs.map((faq) => (
              <details
                key={faq.question}
                className="group rounded-2xl border border-white/[0.07] bg-white/[0.025]"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-5 px-6 py-5 text-sm font-medium text-white/80">
                  <span>{faq.question}</span>

                  <ChevronRight className="h-4 w-4 shrink-0 text-white/30 transition-transform group-open:rotate-90" />
                </summary>

                <div className="px-6 pb-6 text-sm leading-7 text-white/45">
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-5xl px-5 pb-24 lg:px-8 lg:pb-32">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035] px-6 py-16 text-center sm:px-12">
            <div className="pointer-events-none absolute left-1/2 top-0 h-48 w-96 -translate-x-1/2 rounded-full bg-fuchsia-500/10 blur-[100px]" />

            <div className="relative">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06]">
                <Play className="h-5 w-5 fill-white" />
              </div>

              <h2 className="mx-auto mt-7 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
                Make every important moment sound better.
              </h2>

              <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-white/45">
                Use LumoClip Auto SFX to add sound effects and keep your
                video workflow moving.
              </p>

              <button
                onClick={handleGetStarted}
                className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-sm font-semibold text-black transition-all hover:scale-[1.02] hover:bg-white/90"
              >
                Start Creating
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.06]">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <a
            href="/"
            className="flex items-center gap-2 text-sm font-semibold"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-black">
              <Sparkles className="h-3.5 w-3.5" />
            </div>

            LumoClip
          </a>

          <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-white/35">
            <a
              href="/long-video-to-shorts"
              className="transition hover:text-white/70"
            >
              Long to Shorts
            </a>

            <a
              href="/ai-captions"
              className="transition hover:text-white/70"
            >
              AI Captions
            </a>

            <a
              href="/ai-speech-enhancer"
              className="transition hover:text-white/70"
            >
              Speech Enhancer
            </a>

            <a
              href="/ai-video-reframe"
              className="transition hover:text-white/70"
            >
              AI Reframe
            </a>
          </div>

          <span className="text-xs text-white/25">
            © {new Date().getFullYear()} LumoClip
          </span>
        </div>
      </footer>
    </div>
  );
}

export default AISoundEffects;