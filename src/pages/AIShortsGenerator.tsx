import { Link } from "react-router-dom";
import { useSEO, type FAQItem } from "../useSEO";

const FAQS: FAQItem[] = [
  {
    question: "What is an AI Shorts Generator?",
    answer:
      "An AI Shorts Generator uses artificial intelligence to help identify and create short-form video content from longer videos.",
  },
  {
    question: "Can LumoClip create Shorts from long videos?",
    answer:
      "Yes. LumoClip helps creators find potential highlights in long videos and turn them into short-form clips.",
  },
  {
    question: "What type of videos can I repurpose?",
    answer:
      "Long-form content such as podcasts, interviews, educational videos, presentations, and YouTube videos can be suitable for short-form repurposing.",
  },
  {
    question: "Where can I use the generated clips?",
    answer:
      "Short clips can be used for platforms such as YouTube Shorts, TikTok, and Instagram Reels, depending on your content and publishing strategy.",
  },
];

const STEPS = [
  {
    name: "Add your video",
    text: "Start with a long-form video that you want to repurpose into short-form content.",
  },
  {
    name: "Let AI analyze the content",
    text: "LumoClip analyzes the video and identifies potential moments that could work as short clips.",
  },
  {
    name: "Review your clips",
    text: "Review the generated clip opportunities and select the ones you want to use.",
  },
  {
    name: "Export and publish",
    text: "Download your clips and use them across your preferred short-form platforms.",
  },
];

const USE_CASES = [
  "Podcasters",
  "YouTubers",
  "Content creators",
  "Educators",
  "Businesses",
  "Social media teams",
];

const PAGE_URL = "https://lumo-clip.com/ai-shorts-generator";

// BreadcrumbList schema — helps Google show a breadcrumb trail in search results
const BREADCRUMB_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: "https://lumo-clip.com/",
    },
    {
      "@type": "ListItem",
      position: 2,
      name: "AI Shorts Generator",
      item: PAGE_URL,
    },
  ],
};

// HowTo schema — describes the 4-step workflow for potential rich results
const HOWTO_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How LumoClip's AI Shorts Generator Works",
  description:
    "Steps to generate short-form clips from a long-form video using LumoClip's AI-assisted workflow.",
  step: STEPS.map((step, index) => ({
    "@type": "HowToStep",
    position: index + 1,
    name: step.name,
    text: step.text,
  })),
};

export default function AIShortsGenerator() {
  useSEO({
    title: "AI Shorts Generator | Turn Long Videos Into Shorts | LumoClip",
    description:
      "Create Shorts from long videos with LumoClip's AI Shorts Generator. Find potential highlights, generate short-form clips, and repurpose content for YouTube Shorts, TikTok, and Instagram Reels.",
    path: "/ai-shorts-generator",
    imageAlt: "LumoClip AI Shorts Generator",
    faqs: FAQS,
  });

  return (
    <main className="min-h-screen bg-black text-white px-6 py-20">
      {/* Structured data not already covered by useSEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB_SCHEMA) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(HOWTO_SCHEMA) }}
      />

      <div className="mx-auto max-w-5xl">
        {/* Breadcrumb (visual) */}
        <nav aria-label="Breadcrumb" className="mb-10 text-sm text-gray-500">
          <ol className="flex items-center gap-2">
            <li>
              <Link to="/" className="hover:text-green-400">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-gray-300">
              AI Shorts Generator
            </li>
          </ol>
        </nav>

        {/* Hero */}
        <section aria-labelledby="hero-heading">
          <p className="mb-4 text-sm uppercase tracking-[0.25em] text-green-400">
            LumoClip AI
          </p>

          <h1 id="hero-heading" className="text-4xl font-bold tracking-tight md:text-6xl">
            AI Shorts Generator
          </h1>

          <p className="mt-6 max-w-3xl text-lg leading-8 text-gray-400">
            Turn long-form videos into engaging short-form content with
            LumoClip's AI Shorts Generator. Discover potential highlights,
            create short clips, and repurpose your videos for modern
            short-form platforms.
          </p>

          <Link
            to="/"
            aria-label="Try LumoClip"
            className="mt-8 inline-block rounded-xl bg-white px-6 py-3 font-semibold text-black transition hover:bg-gray-200"
          >
            Try LumoClip
          </Link>
        </section>

        {/* What it does */}
        <section className="mt-24" aria-labelledby="what-it-does-heading">
          <h2 id="what-it-does-heading" className="text-3xl font-bold md:text-4xl">
            Create Shorts From Long Videos
          </h2>

          <p className="mt-5 max-w-3xl text-lg leading-8 text-gray-400">
            Long videos often contain multiple moments that can work well as
            short-form content. LumoClip analyzes your video and helps you
            identify sections that can be repurposed into shorter clips.
          </p>

          <p className="mt-4 max-w-3xl text-lg leading-8 text-gray-400">
            Instead of manually searching through an entire recording,
            creators can use an AI-assisted workflow to find potential
            highlights and turn them into short videos faster.
          </p>
        </section>

        {/* Features */}
        <section id="features" className="mt-24 scroll-mt-24" aria-labelledby="features-heading">
          <h2 id="features-heading" className="text-3xl font-bold md:text-4xl">
            AI Shorts Generator Features
          </h2>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <h3 className="text-xl font-semibold">
                AI Highlight Detection
              </h3>

              <p className="mt-3 leading-7 text-gray-400">
                Identify potential highlights from longer videos so you can
                focus on the moments most suitable for short-form content.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <h3 className="text-xl font-semibold">
                Long Video Repurposing
              </h3>

              <p className="mt-3 leading-7 text-gray-400">
                Transform long-form recordings into multiple short-form
                content opportunities without manually reviewing every
                section.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <h3 className="text-xl font-semibold">
                AI-Powered Captions
              </h3>

              <p className="mt-3 leading-7 text-gray-400">
                Generate short-form videos with AI-assisted captions that
                make your clips easier to follow and publish.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <h3 className="text-xl font-semibold">
                Short-Form Content Workflow
              </h3>

              <p className="mt-3 leading-7 text-gray-400">
                Move from a long video to potential Shorts content through a
                streamlined AI-assisted workflow.
              </p>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="mt-24 scroll-mt-24" aria-labelledby="how-it-works-heading">
          <h2 id="how-it-works-heading" className="text-3xl font-bold md:text-4xl">
            How LumoClip's AI Shorts Generator Works
          </h2>

          <ol className="mt-10 space-y-6">
            {STEPS.map((step, index) => (
              <li key={step.name}>
                <h3 className="text-xl font-semibold">
                  {index + 1}. {step.name}
                </h3>

                <p className="mt-2 text-gray-400">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Use cases */}
        <section id="use-cases" className="mt-24 scroll-mt-24" aria-labelledby="use-cases-heading">
          <h2 id="use-cases-heading" className="text-3xl font-bold md:text-4xl">
            Who Can Use an AI Shorts Generator?
          </h2>

          <ul className="mt-8 grid gap-4 text-gray-300 md:grid-cols-2">
            {USE_CASES.map((useCase) => (
              <li key={useCase} className="rounded-xl border border-white/10 p-5">
                {useCase}
              </li>
            ))}
          </ul>
        </section>

        {/* Internal links */}
        <section className="mt-24" aria-labelledby="explore-tools-heading">
          <h2 id="explore-tools-heading" className="text-3xl font-bold">
            Explore More LumoClip Tools
          </h2>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <Link
              to="/ai-video-clipper"
              className="rounded-xl border border-white/10 p-5 transition hover:border-green-400/40"
            >
              <h3 className="font-semibold">AI Video Clipper</h3>
              <p className="mt-2 text-sm text-gray-400">
                Automatically find useful moments in long videos.
              </p>
            </Link>

            <Link
              to="/long-video-to-shorts"
              className="rounded-xl border border-white/10 p-5 transition hover:border-green-400/40"
            >
              <h3 className="font-semibold">Long Video to Shorts</h3>
              <p className="mt-2 text-sm text-gray-400">
                Repurpose long-form videos into short-form content.
              </p>
            </Link>

            <Link
              to="/youtube-to-shorts"
              className="rounded-xl border border-white/10 p-5 transition hover:border-green-400/40"
            >
              <h3 className="font-semibold">YouTube to Shorts</h3>
              <p className="mt-2 text-sm text-gray-400">
                Turn YouTube videos into short-form content.
              </p>
            </Link>
          </div>
        </section>

        {/* FAQ (rendered from the same FAQS array used by useSEO) */}
        <section id="faq" className="mt-24 scroll-mt-24" aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="text-3xl font-bold md:text-4xl">
            AI Shorts Generator FAQ
          </h2>

          <div className="mt-8 space-y-8">
            {FAQS.map((faq) => (
              <div key={faq.question}>
                <h3 className="text-xl font-semibold">{faq.question}</h3>
                <p className="mt-3 leading-7 text-gray-400">{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="mt-24 rounded-3xl border border-white/10 bg-white/[0.03] p-10 text-center">
          <h2 className="text-3xl font-bold md:text-4xl">
            Turn Your Long Videos Into Shorts
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-gray-400">
            Use LumoClip to discover potential highlights and speed up your
            short-form content workflow.
          </p>

          <Link
            to="/"
            aria-label="Start creating Shorts with LumoClip"
            className="mt-8 inline-block rounded-xl bg-white px-7 py-3 font-semibold text-black transition hover:bg-gray-200"
          >
            Start Creating with LumoClip
          </Link>
        </section>
      </div>
    </main>
  );
}