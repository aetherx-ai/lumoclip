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
      <div className="mx-auto max-w-5xl">
        {/* Hero */}
        <section>
          <p className="mb-4 text-sm uppercase tracking-[0.25em] text-green-400">
            LumoClip AI
          </p>

          <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
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
            className="mt-8 inline-block rounded-xl bg-white px-6 py-3 font-semibold text-black transition hover:bg-gray-200"
          >
            Try LumoClip
          </Link>
        </section>

        {/* What it does */}
        <section className="mt-24">
          <h2 className="text-3xl font-bold md:text-4xl">
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
        <section className="mt-24">
          <h2 className="text-3xl font-bold md:text-4xl">
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
        <section className="mt-24">
          <h2 className="text-3xl font-bold md:text-4xl">
            How LumoClip's AI Shorts Generator Works
          </h2>

          <div className="mt-10 space-y-6">
            <div>
              <h3 className="text-xl font-semibold">1. Add your video</h3>

              <p className="mt-2 text-gray-400">
                Start with a long-form video that you want to repurpose into
                short-form content.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold">
                2. Let AI analyze the content
              </h3>

              <p className="mt-2 text-gray-400">
                LumoClip analyzes the video and identifies potential moments
                that could work as short clips.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold">3. Review your clips</h3>

              <p className="mt-2 text-gray-400">
                Review the generated clip opportunities and select the ones
                you want to use.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold">4. Export and publish</h3>

              <p className="mt-2 text-gray-400">
                Download your clips and use them across your preferred
                short-form platforms.
              </p>
            </div>
          </div>
        </section>

        {/* Use cases */}
        <section className="mt-24">
          <h2 className="text-3xl font-bold md:text-4xl">
            Who Can Use an AI Shorts Generator?
          </h2>

          <div className="mt-8 grid gap-4 text-gray-300 md:grid-cols-2">
            <div className="rounded-xl border border-white/10 p-5">
              Podcasters
            </div>
            <div className="rounded-xl border border-white/10 p-5">
              YouTubers
            </div>
            <div className="rounded-xl border border-white/10 p-5">
              Content creators
            </div>
            <div className="rounded-xl border border-white/10 p-5">
              Educators
            </div>
            <div className="rounded-xl border border-white/10 p-5">
              Businesses
            </div>
            <div className="rounded-xl border border-white/10 p-5">
              Social media teams
            </div>
          </div>
        </section>

        {/* Internal links */}
        <section className="mt-24">
          <h2 className="text-3xl font-bold">Explore More LumoClip Tools</h2>

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
        <section className="mt-24">
          <h2 className="text-3xl font-bold md:text-4xl">
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
            className="mt-8 inline-block rounded-xl bg-white px-7 py-3 font-semibold text-black transition hover:bg-gray-200"
          >
            Start Creating with LumoClip
          </Link>
        </section>
      </div>
    </main>
  );
}