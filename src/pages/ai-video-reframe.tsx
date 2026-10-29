import { useEffect } from "react";
import {
  ArrowRight,
  Check,
  ChevronRight,
  Film,
  Frame,
  Maximize2,
  Play,
  Smartphone,
  Sparkles,
  WandSparkles,
  Zap,
} from "lucide-react";

interface AIVideoReframeProps {
  onGetStarted?: () => void;
}

const SEO_TITLE =
  "AI Video Reframe | Automatic Video Reframing for Shorts | LumoClip";

const SEO_DESCRIPTION =
  "Reframe videos with AI using LumoClip. Automatically adapt your video framing for short-form content and different screen formats.";

const SEO_KEYWORDS = [
  "AI video reframe",
  "AI video reframing",
  "automatic video reframe",
  "video reframing",
  "AI video crop",
  "automatic video cropping",
  "video resize for Shorts",
  "vertical video reframing",
  "AI video editor",
  "LumoClip",
].join(", ");

const faqs = [
  {
    question: "What is AI video reframing?",
    answer:
      "AI video reframing automatically adapts the visible framing of a video so important content stays within the frame when changing formats.",
  },
  {
    question: "Can I reframe a video for Shorts?",
    answer:
      "Yes. LumoClip's AI video reframe workflow is designed to help adapt videos for short-form content and vertical viewing formats.",
  },
  {
    question: "Why is video reframing useful?",
    answer:
      "Different platforms and screen sizes use different video formats. Reframing helps adapt your existing content without manually rebuilding the entire video.",
  },
  {
    question: "Can I use AI reframing with long videos?",
    answer:
      "Yes. LumoClip is built around long-form video workflows, allowing creators to transform and prepare content for shorter formats.",
  },
  {
    question: "Is AI video reframing useful for mobile content?",
    answer:
      "Yes. Reframing is especially useful when adapting landscape video content for mobile-first and vertical viewing experiences.",
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
    icon: Zap,
  },
  {
    title: "Auto SFX",
    description: "Add sound effects to your video content.",
    href: "/ai-sound-effects",
    icon: Smartphone,
  },
];

export function AIVideoReframe({
  onGetStarted,
}: AIVideoReframeProps) {
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
      "https://lumo-clip.com/ai-video-reframe",
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

    canonical.href = "https://lumo-clip.com/ai-video-reframe";

    const existingSchema = document.getElementById(
      "lumoclip-ai-video-reframe-schema",
    );

    if (existingSchema) {
      existingSchema.remove();
    }

    const schema = document.createElement("script");

    schema.id = "lumoclip-ai-video-reframe-schema";
    schema.type = "application/ld+json";

    schema.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebPage",
          name: SEO_TITLE,
          description: SEO_DESCRIPTION,
          url: "https://lumo-clip.com/ai-video-reframe",
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
            "AI video reframing",
            "Automatic video framing",
            "Short-form video formatting",
            "Long video to shorts",
            "AI captions",
            "AI speech enhancement",
            "Auto sound effects",
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
        "lumoclip-ai-video-reframe-schema",
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
        <div className="absolute left-1/2 top-[-300px] h-[650px] w-[650px] -translate-x-1/2 rounded-full bg-cyan-500/10 blur-[140px]" />
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
          <div className="mx-auto mb-7 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/[0.07] px-4 py-2 text-sm text-cyan-200">
            <Frame className="h-4 w-4" />
            AI Video Reframe
          </div>

          <h1 className="mx-auto max-w-5xl text-4xl font-semibold leading-[1.08] tracking-[-0.04em] sm:text-5xl lg:text-7xl">
            Reframe your videos
            <span className="block bg-gradient-to-r from-white via-white to-white/50 bg-clip-text text-transparent">
              for every screen.
            </span>
          </h1>

          <p className="mx-auto mt-7 max-w-2xl text-base leading-7 text-white/55 sm:text-lg">
            Use AI to adapt your video framing for short-form and mobile-first
            content. LumoClip helps you reframe existing videos without
            rebuilding your entire edit.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              onClick={handleGetStarted}
              className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-sm font-semibold text-black transition-all hover:scale-[1.02] hover:bg-white/90 sm:w-auto"
            >
              Reframe Video
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
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
                      <Frame className="h-5 w-5" />
                    </div>

                    <div className="text-left">
                      <p className="text-sm font-medium">
                        AI Video Reframe
                      </p>
                      <p className="mt-1 text-xs text-white/40">
                        Automatic framing
                      </p>
                    </div>
                  </div>

                  <div className="rounded-full border border-emerald-400/15 bg-emerald-400/5 px-3 py-1.5 text-xs text-emerald-300">
                    Ready
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Original */}
                  <div className="rounded-2xl border border-white/[0.06] bg-black/30 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs text-white/40">
                        Original
                      </span>

                      <Maximize2 className="h-3.5 w-3.5 text-white/30" />
                    </div>

                    <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.025]">
                      <div className="h-[45%] w-[32%] rounded-xl border border-white/30 bg-white/[0.04]" />

                      <div className="absolute bottom-3 left-3 rounded-md bg-black/60 px-2 py-1 text-[10px] text-white/50">
                        16:9
                      </div>
                    </div>
                  </div>

                  {/* Reframed */}
                  <div className="rounded-2xl border border-cyan-400/10 bg-black/30 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs text-cyan-200/60">
                        Reframed
                      </span>

                      <Smartphone className="h-3.5 w-3.5 text-cyan-300/60" />
                    </div>

                    <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-xl border border-cyan-400/10 bg-cyan-400/[0.025]">
                      <div className="h-[78%] w-[24%] rounded-xl border border-cyan-300/40 bg-cyan-300/[0.04]" />

                      <div className="absolute bottom-3 left-3 rounded-md bg-black/60 px-2 py-1 text-[10px] text-cyan-200/60">
                        Vertical
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-center gap-2 text-xs text-white/35">
                  <Sparkles className="h-3.5 w-3.5" />
                  AI-assisted framing
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
                icon: Smartphone,
                title: "Mobile-ready framing",
                text: "Adapt your existing videos for vertical and mobile-first viewing.",
              },
              {
                icon: Frame,
                title: "AI-assisted reframing",
                text: "Let AI help adapt the composition instead of manually rebuilding every frame.",
              },
              {
                icon: Zap,
                title: "Faster editing",
                text: "Reduce repetitive framing work when preparing content for new formats.",
              },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.title}
                  className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6"
                >
                  <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05]">
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
            <p className="text-sm font-medium text-cyan-300">
              SIMPLE WORKFLOW
            </p>

            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              Reframe your content without the repetitive work.
            </h2>

            <p className="mt-4 text-base leading-7 text-white/45">
              Start with your existing video, apply AI reframing, and continue
              creating content for the format you need.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              {
                number: "01",
                title: "Add your video",
                text: "Start with the video you want to adapt for a different viewing format.",
              },
              {
                number: "02",
                title: "Apply AI reframe",
                text: "Use LumoClip's AI video reframe workflow to adapt the composition.",
              },
              {
                number: "03",
                title: "Create and publish",
                text: "Continue with captions, speech enhancement, Shorts creation and more.",
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
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.07] text-cyan-300">
                  <Frame className="h-5 w-5" />
                </div>

                <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  One video. More formats.
                </h2>

                <p className="mt-5 text-base leading-7 text-white/45">
                  Your original video may have been created for a wide
                  screen, but your audience can watch it on many different
                  devices. AI reframing helps adapt that content for new
                  formats.
                </p>

                <button
                  onClick={handleGetStarted}
                  className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-white/90"
                >
                  Try AI Reframe
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              <div className="grid gap-3">
                {[
                  "AI-assisted video reframing",
                  "Designed for short-form workflows",
                  "Useful for vertical video formats",
                  "Reduce repetitive manual cropping",
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
            <p className="text-sm font-medium text-cyan-300">
              BUILT FOR CREATORS
            </p>

            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              Reframe content for modern viewing.
            </h2>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "YouTube Shorts",
                text: "Adapt long-form footage into vertical short-form content.",
              },
              {
                title: "TikTok",
                text: "Prepare existing video content for mobile-first viewing.",
              },
              {
                title: "Instagram Reels",
                text: "Reframe videos for vertical social content.",
              },
              {
                title: "Podcasts",
                text: "Adapt podcast video footage into more mobile-friendly formats.",
              },
              {
                title: "Tutorials",
                text: "Keep important visual content inside the new frame.",
              },
              {
                title: "Educational videos",
                text: "Repurpose existing lessons into different video formats.",
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
              <p className="text-sm font-medium text-cyan-300">
                MORE AI VIDEO TOOLS
              </p>

              <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                Create more from every video.
              </h2>

              <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-white/45">
                Combine AI reframing with LumoClip's other working tools to
                build short-form content faster.
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
            <p className="text-sm font-medium text-cyan-300">FAQ</p>

            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              AI video reframe questions.
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
            <div className="pointer-events-none absolute left-1/2 top-0 h-48 w-96 -translate-x-1/2 rounded-full bg-cyan-500/10 blur-[100px]" />

            <div className="relative">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06]">
                <Play className="h-5 w-5 fill-white" />
              </div>

              <h2 className="mx-auto mt-7 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
                Reframe your video for the way people watch today.
              </h2>

              <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-white/45">
                Use LumoClip AI to adapt your videos for short-form and
                mobile-first content.
              </p>

              <button
                onClick={handleGetStarted}
                className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-sm font-semibold text-black transition-all hover:scale-[1.02] hover:bg-white/90"
              >
                Start Reframing
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
              href="/ai-sound-effects"
              className="transition hover:text-white/70"
            >
              Auto SFX
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

export default AIVideoReframe;