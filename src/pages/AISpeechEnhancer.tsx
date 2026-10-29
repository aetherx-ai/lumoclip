import { useEffect } from "react";
import {
  ArrowRight,
  Check,
  ChevronRight,
  Film,
  Mic,
  Play,
  Sparkles,
  Volume2,
  WandSparkles,
  Zap,
} from "lucide-react";

interface AISpeechEnhancerProps {
  onGetStarted?: () => void;
}

const SEO_TITLE =
  "AI Speech Enhancer for Video | Improve Voice Clarity | LumoClip";

const SEO_DESCRIPTION =
  "Enhance speech in videos with LumoClip AI. Improve spoken audio clarity and make voice-focused video content easier to edit and publish.";

const SEO_KEYWORDS = [
  "AI speech enhancer",
  "speech enhancement",
  "AI voice enhancer",
  "enhance speech in video",
  "voice clarity",
  "video audio enhancer",
  "spoken audio enhancement",
  "AI audio enhancement",
  "LumoClip",
].join(", ");

const faqs = [
  {
    question: "What is an AI speech enhancer?",
    answer:
      "An AI speech enhancer improves spoken audio so voices can sound clearer and more suitable for video content.",
  },
  {
    question: "Can I enhance speech in a video?",
    answer:
      "Yes. LumoClip lets you use AI speech enhancement as part of your video workflow, helping improve the clarity of spoken audio.",
  },
  {
    question: "Who can use an AI speech enhancer?",
    answer:
      "Creators, YouTubers, podcasters, educators, and anyone working with voice-focused video can benefit from speech enhancement.",
  },
  {
    question: "Does LumoClip work with long videos?",
    answer:
      "LumoClip is designed for long-form video workflows, including turning long videos into shorter content and enhancing spoken audio.",
  },
  {
    question: "Why should I enhance speech in my videos?",
    answer:
      "Clear spoken audio makes voice-focused content easier to understand and can create a better viewing experience.",
  },
];

const relatedTools = [
  {
    title: "Long Video to Shorts",
    description: "Turn long videos into engaging short-form clips.",
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
    title: "AI Video Reframe",
    description: "Adapt video framing for different platforms.",
    href: "/ai-video-reframe",
    icon: Zap,
  },
  {
    title: "Auto SFX",
    description: "Add sound effects to make your content more engaging.",
    href: "/ai-sound-effects",
    icon: Volume2,
  },
];

export function AISpeechEnhancer({
  onGetStarted,
}: AISpeechEnhancerProps) {
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
    setMeta("property", "og:url", "https://lumo-clip.com/ai-speech-enhancer");
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

    canonical.href = "https://lumo-clip.com/ai-speech-enhancer";

    const existingSchema = document.getElementById(
      "lumoclip-ai-speech-enhancer-schema",
    );

    if (existingSchema) {
      existingSchema.remove();
    }

    const schema = document.createElement("script");
    schema.id = "lumoclip-ai-speech-enhancer-schema";
    schema.type = "application/ld+json";

    schema.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebPage",
          name: SEO_TITLE,
          description: SEO_DESCRIPTION,
          url: "https://lumo-clip.com/ai-speech-enhancer",
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
            "AI speech enhancement",
            "Voice clarity improvement",
            "Long video to shorts",
            "AI captions",
            "AI video reframing",
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
        "lumoclip-ai-speech-enhancer-schema",
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
        <div className="absolute left-1/2 top-[-300px] h-[650px] w-[650px] -translate-x-1/2 rounded-full bg-violet-600/10 blur-[140px]" />
        <div className="absolute bottom-[-300px] right-[-150px] h-[500px] w-[500px] rounded-full bg-blue-600/10 blur-[130px]" />
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
          <div className="mx-auto mb-7 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-400/[0.07] px-4 py-2 text-sm text-violet-200">
            <Mic className="h-4 w-4" />
            AI Speech Enhancement
          </div>

          <h1 className="mx-auto max-w-5xl text-4xl font-semibold leading-[1.08] tracking-[-0.04em] sm:text-5xl lg:text-7xl">
            Make your video voice
            <span className="block bg-gradient-to-r from-white via-white to-white/50 bg-clip-text text-transparent">
              clearer with AI.
            </span>
          </h1>

          <p className="mx-auto mt-7 max-w-2xl text-base leading-7 text-white/55 sm:text-lg">
            Enhance spoken audio in your videos with LumoClip AI. Improve
            voice clarity and create a cleaner experience for viewers without
            adding a complicated audio-editing workflow.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              onClick={handleGetStarted}
              className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-sm font-semibold text-black transition-all hover:scale-[1.02] hover:bg-white/90 sm:w-auto"
            >
              Enhance Speech
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
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
                      <Mic className="h-5 w-5" />
                    </div>

                    <div className="text-left">
                      <p className="text-sm font-medium">
                        Speech Enhancement
                      </p>
                      <p className="mt-1 text-xs text-white/40">
                        AI audio processing
                      </p>
                    </div>
                  </div>

                  <div className="rounded-full border border-emerald-400/15 bg-emerald-400/5 px-3 py-1.5 text-xs text-emerald-300">
                    Ready
                  </div>
                </div>

                <div className="rounded-2xl border border-white/[0.06] bg-black/30 p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-xs font-medium text-white/45">
                      Voice clarity
                    </span>

                    <Volume2 className="h-4 w-4 text-white/40" />
                  </div>

                  <div className="flex h-24 items-center justify-center gap-1 overflow-hidden rounded-xl bg-white/[0.025] px-4">
                    {Array.from({ length: 80 }).map((_, index) => {
                      const height =
                        18 +
                        Math.abs(Math.sin(index * 0.72)) * 48 +
                        Math.abs(Math.cos(index * 0.31)) * 20;

                      return (
                        <div
                          key={index}
                          className="w-[2px] shrink-0 rounded-full bg-white/25"
                          style={{ height: `${Math.min(height, 82)}%` }}
                        />
                      );
                    })}
                  </div>

                  <div className="mt-5 flex items-center justify-between text-xs text-white/35">
                    <span>Spoken audio</span>
                    <span>AI enhanced</span>
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
                icon: Volume2,
                title: "Clearer spoken audio",
                text: "Improve the clarity of voice-focused video content.",
              },
              {
                icon: Zap,
                title: "Fast workflow",
                text: "Use AI speech enhancement without a complicated audio workflow.",
              },
              {
                icon: Film,
                title: "Built for video",
                text: "Enhance speech as part of your complete video creation workflow.",
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

                  <h2 className="text-base font-semibold">{item.title}</h2>

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
            <p className="text-sm font-medium text-violet-300">
              SIMPLE WORKFLOW
            </p>

            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              Enhance speech in a few simple steps.
            </h2>

            <p className="mt-4 text-base leading-7 text-white/45">
              Keep the process focused on your content. LumoClip brings speech
              enhancement into the same workflow you already use for video.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              {
                number: "01",
                title: "Add your video",
                text: "Start with the video containing the spoken audio you want to improve.",
              },
              {
                number: "02",
                title: "Enhance speech",
                text: "Use LumoClip's AI speech enhancement workflow to process the spoken audio.",
              },
              {
                number: "03",
                title: "Create your content",
                text: "Continue editing, captioning, reframing or turning your video into Shorts.",
              },
            ].map((step) => (
              <div
                key={step.number}
                className="relative rounded-2xl border border-white/[0.07] bg-white/[0.025] p-7"
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

        {/* Features */}
        <section className="border-y border-white/[0.06] bg-white/[0.015]">
          <div className="mx-auto max-w-6xl px-5 py-24 lg:px-8 lg:py-32">
            <div className="grid items-start gap-14 lg:grid-cols-[0.9fr_1.1fr]">
              <div>
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-400/15 bg-violet-400/[0.07] text-violet-300">
                  <Mic className="h-5 w-5" />
                </div>

                <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  Better speech for voice-first content.
                </h2>

                <p className="mt-5 text-base leading-7 text-white/45">
                  Whether you're creating tutorials, commentary, interviews,
                  educational videos or Shorts, clear spoken audio is an
                  important part of the viewing experience.
                </p>

                <button
                  onClick={handleGetStarted}
                  className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-white/90"
                >
                  Try Speech Enhancement
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              <div className="grid gap-3">
                {[
                  "AI-powered speech enhancement workflow",
                  "Designed for spoken video content",
                  "Voice clarity focused processing",
                  "Works alongside your video creation workflow",
                  "Useful for both long-form and short-form content",
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

        {/* Related tools */}
        <section className="mx-auto max-w-6xl px-5 py-24 lg:px-8 lg:py-32">
          <div className="text-center">
            <p className="text-sm font-medium text-violet-300">
              MORE AI VIDEO TOOLS
            </p>

            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              Build more from every video.
            </h2>

            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-white/45">
              Speech enhancement is only one part of the LumoClip workflow.
              Explore the other tools available for your content.
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
        </section>

        {/* FAQ */}
        <section className="border-y border-white/[0.06] bg-white/[0.015]">
          <div className="mx-auto max-w-4xl px-5 py-24 lg:px-8 lg:py-32">
            <div className="text-center">
              <p className="text-sm font-medium text-violet-300">FAQ</p>

              <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                AI speech enhancer questions.
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
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-5xl px-5 py-24 text-center lg:px-8 lg:py-32">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035] px-6 py-16 sm:px-12">
            <div className="pointer-events-none absolute left-1/2 top-0 h-48 w-96 -translate-x-1/2 rounded-full bg-violet-500/10 blur-[100px]" />

            <div className="relative">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06]">
                <Play className="h-5 w-5 fill-white" />
              </div>

              <h2 className="mx-auto mt-7 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
                Give your spoken video content a clearer voice.
              </h2>

              <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-white/45">
                Use LumoClip to enhance speech and continue building your
                content with AI-powered video tools.
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
              href="/ai-video-reframe"
              className="transition hover:text-white/70"
            >
              AI Reframe
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

export default AISpeechEnhancer;