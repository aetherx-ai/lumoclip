import { Link } from "react-router-dom";
import { useSEO, type FAQItem } from "../useSEO";

const FAQS: FAQItem[] = [
  {
    question: "What is an AI video clipper?",
    answer:
      "An AI video clipper is software that uses artificial intelligence to help identify useful moments from longer videos and turn them into shorter clips.",
  },
  {
    question: "Can LumoClip turn long videos into Shorts?",
    answer:
      "Yes. LumoClip is designed to help creators discover potential highlights from long-form videos and create short-form clips from selected moments.",
  },
  {
    question: "What types of videos can I clip?",
    answer:
      "Podcasts, interviews, tutorials, educational videos, presentations, and other long-form content can be suitable for AI-assisted clipping.",
  },
  {
    question: "Which platforms are supported?",
    answer:
      "Short-form clips can be used for platforms such as YouTube Shorts, TikTok, and Instagram Reels.",
  },
];

const STEPS = [
  {
    name: "Add Your Video",
    text: "Upload a supported video or provide a supported video URL containing the long-form content you want to repurpose.",
  },
  {
    name: "AI Analyzes the Content",
    text: "LumoClip analyzes the video to understand its content and identify sections that may work well as short-form clips.",
  },
  {
    name: "Discover Potential Highlights",
    text: "Review the potential highlights identified from your long-form video and choose the moments you want to use.",
  },
  {
    name: "Create Short Clips",
    text: "Turn selected moments into short-form video clips ready for your content workflow.",
  },
];

const PAGE_URL = "https://lumo-clip.com/ai-video-clipper";

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
      name: "AI Video Clipper",
      item: PAGE_URL,
    },
  ],
};

// HowTo schema — describes the 4-step workflow for potential rich results
const HOWTO_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How LumoClip's AI Video Clipper Works",
  description:
    "Steps to find potential highlights in a long-form video and turn them into short-form clips using LumoClip.",
  step: STEPS.map((step, index) => ({
    "@type": "HowToStep",
    position: index + 1,
    name: step.name,
    text: step.text,
  })),
};

export default function AIVideoClipper() {
  useSEO({
    title: "AI Video Clipper | Find Your Best Video Moments with AI | LumoClip",
    description:
      "LumoClip is an AI video clipper that finds potential highlights in long-form videos and helps turn them into short-form clips for YouTube Shorts, TikTok, and Instagram Reels.",
    path: "/ai-video-clipper",
    imageAlt: "LumoClip AI Video Clipper",
    faqs: FAQS,
  });

  return (
    <main className="min-h-screen bg-black px-6 py-20 text-white">
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
              AI Video Clipper
            </li>
          </ol>
        </nav>

        {/* Hero */}
        <section aria-labelledby="hero-heading">
          <p className="mb-4 text-sm uppercase tracking-[0.25em] text-green-400">
            LumoClip AI Video Clipper
          </p>

          <h1 id="hero-heading" className="text-4xl font-bold tracking-tight md:text-6xl">
            AI Video Clipper That Finds Your Best Moments
          </h1>

          <p className="mt-6 max-w-3xl text-lg leading-8 text-gray-400">
            LumoClip is an AI video clipper that analyzes long-form videos,
            identifies potential highlights, and helps turn them into
            engaging short-form content for YouTube Shorts, TikTok, and
            Instagram Reels.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              to="/"
              aria-label="Try LumoClip"
              className="rounded-xl bg-white px-6 py-3 font-semibold text-black transition hover:bg-gray-200"
            >
              Try LumoClip
            </Link>

            <Link
              to="/long-video-to-shorts"
              aria-label="Learn about Long Video to Shorts"
              className="rounded-xl border border-white/15 px-6 py-3 font-semibold text-white transition hover:border-green-400/50"
            >
              Long Video to Shorts
            </Link>
          </div>
        </section>

        {/* What is an AI video clipper */}
        <section className="mt-24" aria-labelledby="what-is-heading">
          <h2 id="what-is-heading" className="text-3xl font-bold md:text-4xl">
            What Is an AI Video Clipper?
          </h2>

          <p className="mt-5 max-w-3xl text-lg leading-8 text-gray-400">
            An AI video clipper is a tool that uses artificial intelligence
            to help discover useful moments inside longer videos. Instead of
            watching an entire recording and manually searching for clips,
            creators can use an AI-assisted workflow to find potential
            highlights faster.
          </p>

          <p className="mt-4 max-w-3xl text-lg leading-8 text-gray-400">
            LumoClip is built for creators who want to repurpose long-form
            content into short-form videos without spending hours searching
            through their recordings.
          </p>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="mt-24 scroll-mt-24" aria-labelledby="how-it-works-heading">
          <h2 id="how-it-works-heading" className="text-3xl font-bold md:text-4xl">
            How LumoClip's AI Video Clipper Works
          </h2>

          <ol className="mt-10 grid gap-6 md:grid-cols-2">
            {STEPS.map((step, index) => (
              <li
                key={step.name}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
              >
                <div className="text-sm font-semibold text-green-400">
                  STEP {String(index + 1).padStart(2, "0")}
                </div>
                <h3 className="mt-3 text-xl font-semibold">{step.name}</h3>
                <p className="mt-3 leading-7 text-gray-400">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Features */}
        <section id="features" className="mt-24 scroll-mt-24" aria-labelledby="features-heading">
          <h2 id="features-heading" className="text-3xl font-bold md:text-4xl">
            AI Video Clipper Features
          </h2>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 p-6">
              <h3 className="text-xl font-semibold">
                Automatic Highlight Detection
              </h3>
              <p className="mt-3 leading-7 text-gray-400">
                Find potential interesting sections from long-form videos
                without manually reviewing the entire recording.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 p-6">
              <h3 className="text-xl font-semibold">
                AI-Powered Video Analysis
              </h3>
              <p className="mt-3 leading-7 text-gray-400">
                Use AI-assisted analysis to understand video content and
                identify moments suitable for short-form repurposing.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 p-6">
              <h3 className="text-xl font-semibold">
                Short-Form Content Creation
              </h3>
              <p className="mt-3 leading-7 text-gray-400">
                Convert selected moments from long videos into short clips
                for your content publishing workflow.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 p-6">
              <h3 className="text-xl font-semibold">AI Captions</h3>
              <p className="mt-3 leading-7 text-gray-400">
                Generate AI-assisted captions for clips to make short-form
                videos easier to follow and publish.
              </p>
            </div>
          </div>
        </section>

        {/* Long form content */}
        <section className="mt-24" aria-labelledby="long-form-heading">
          <h2 id="long-form-heading" className="text-3xl font-bold md:text-4xl">
            Turn Long Videos Into Short Clips
          </h2>

          <p className="mt-5 max-w-3xl text-lg leading-8 text-gray-400">
            Long-form videos can contain dozens of moments that are useful
            for short-form content. Podcasts, interviews, tutorials,
            presentations, educational videos, and YouTube content can all
            contain sections worth repurposing.
          </p>

          <p className="mt-4 max-w-3xl text-lg leading-8 text-gray-400">
            LumoClip helps reduce the manual work involved in finding those
            moments so creators can spend more time reviewing, editing, and
            publishing their content.
          </p>
        </section>

        {/* Who is it for */}
        <section id="who-its-for" className="mt-24 scroll-mt-24" aria-labelledby="who-its-for-heading">
          <h2 id="who-its-for-heading" className="text-3xl font-bold md:text-4xl">
            Who Is LumoClip For?
          </h2>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              ["YouTubers", "Repurpose long YouTube videos into short-form content."],
              ["Podcasters", "Discover memorable moments from podcast episodes."],
              ["Content Creators", "Create more short-form content from existing videos."],
              ["Educators", "Turn longer educational recordings into shorter lessons."],
              ["Businesses", "Repurpose webinars, presentations, and interviews."],
              ["Social Media Teams", "Build a faster workflow for short-form video production."],
            ].map(([title, text]) => (
              <div key={title} className="rounded-xl border border-white/10 p-5">
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-gray-400">{text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Internal links */}
        <section className="mt-24" aria-labelledby="explore-heading">
          <h2 id="explore-heading" className="text-3xl font-bold md:text-4xl">
            Explore LumoClip
          </h2>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <Link
              to="/long-video-to-shorts"
              className="rounded-xl border border-white/10 p-6 transition hover:border-green-400/40"
            >
              <h3 className="font-semibold">Long Video to Shorts</h3>
              <p className="mt-2 text-sm text-gray-400">
                Learn how to repurpose long-form videos into Shorts.
              </p>
            </Link>

            <Link
              to="/ai-shorts-generator"
              className="rounded-xl border border-white/10 p-6 transition hover:border-green-400/40"
            >
              <h3 className="font-semibold">AI Shorts Generator</h3>
              <p className="mt-2 text-sm text-gray-400">
                Generate short-form content with an AI-assisted workflow.
              </p>
            </Link>

            <Link
              to="/youtube-to-shorts"
              className="rounded-xl border border-white/10 p-6 transition hover:border-green-400/40"
            >
              <h3 className="font-semibold">YouTube to Shorts</h3>
              <p className="mt-2 text-sm text-gray-400">
                Learn about turning YouTube videos into short-form content.
              </p>
            </Link>
          </div>
        </section>

        {/* FAQ (rendered from the same FAQS array used by useSEO) */}
        <section id="faq" className="mt-24 scroll-mt-24" aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="text-3xl font-bold md:text-4xl">
            AI Video Clipper FAQ
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
            Find Your Best Moments With AI
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-gray-400">
            Stop manually searching through hours of video. Use LumoClip to
            discover potential highlights and build short-form content
            faster.
          </p>

          <Link
            to="/"
            aria-label="Try LumoClip for free"
            className="mt-8 inline-block rounded-xl bg-white px-7 py-3 font-semibold text-black transition hover:bg-gray-200"
          >
            Try LumoClip Free
          </Link>
        </section>
      </div>
    </main>
  );
}