import { Link } from "react-router-dom";
import { useSEO, type FAQItem } from "../useSEO";

const FAQS: FAQItem[] = [
  {
    question: "How can I turn a long video into Shorts?",
    answer:
      "Add your long-form video to an AI-assisted clipping workflow, identify useful moments, review the selected sections, and create short clips from them.",
  },
  {
    question: "Can LumoClip find highlights automatically?",
    answer:
      "LumoClip uses AI-assisted video analysis to identify potential highlights from long-form content.",
  },
  {
    question: "What type of long videos can I repurpose?",
    answer:
      "Podcasts, interviews, tutorials, educational videos, webinars, and other long-form recordings can be suitable for short-form repurposing.",
  },
  {
    question: "Where can I publish the Shorts?",
    answer:
      "Short-form videos can be used on platforms such as YouTube Shorts, TikTok, and Instagram Reels.",
  },
];

export default function LongVideoToShorts() {
  useSEO({
    title: "Long Video to Shorts | Turn Long Videos Into Shorts | LumoClip",
    description:
      "Turn long videos into Shorts with LumoClip. Find potential highlights with AI-assisted video analysis and repurpose long-form content for YouTube Shorts, TikTok, and Instagram Reels.",
    path: "/long-video-to-shorts",
    imageAlt: "LumoClip Long Video to Shorts",
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
            Turn Long Videos Into Shorts With AI
          </h1>

          <p className="mt-6 max-w-3xl text-lg leading-8 text-gray-400">
            Turn long videos into engaging short-form clips with LumoClip.
            Our AI-assisted workflow helps identify potential highlights
            from long-form content and repurpose them for YouTube Shorts,
            TikTok, and Instagram Reels.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              to="/"
              className="rounded-xl bg-white px-6 py-3 font-semibold text-black transition hover:bg-gray-200"
            >
              Start Creating
            </Link>

            <Link
              to="/ai-video-clipper"
              className="rounded-xl border border-white/15 px-6 py-3 font-semibold text-white transition hover:border-green-400/50"
            >
              AI Video Clipper
            </Link>
          </div>
        </section>

        {/* What is long video to shorts */}
        <section className="mt-24">
          <h2 className="text-3xl font-bold md:text-4xl">
            What Does Long Video to Shorts Mean?
          </h2>

          <p className="mt-5 max-w-3xl text-lg leading-8 text-gray-400">
            Long video to Shorts is the process of taking longer content
            and turning useful sections into short-form videos. A single
            podcast, interview, tutorial, or YouTube video can contain
            multiple moments that may work as standalone short clips.
          </p>

          <p className="mt-4 max-w-3xl text-lg leading-8 text-gray-400">
            LumoClip helps simplify this process by using AI-assisted video
            analysis to discover potential highlights, reducing the amount
            of time spent manually searching through long recordings.
          </p>
        </section>

        {/* How it works */}
        <section className="mt-24">
          <h2 className="text-3xl font-bold md:text-4xl">
            How to Turn a Long Video Into Shorts
          </h2>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <span className="text-sm font-semibold text-green-400">
                STEP 01
              </span>
              <h3 className="mt-3 text-xl font-semibold">
                Upload or Add Your Video
              </h3>
              <p className="mt-3 leading-7 text-gray-400">
                Start with the long-form video you want to repurpose into
                short-form content.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <span className="text-sm font-semibold text-green-400">
                STEP 02
              </span>
              <h3 className="mt-3 text-xl font-semibold">
                Let AI Analyze the Video
              </h3>
              <p className="mt-3 leading-7 text-gray-400">
                LumoClip analyzes your content and searches for sections
                that may work well as short-form clips.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <span className="text-sm font-semibold text-green-400">
                STEP 03
              </span>
              <h3 className="mt-3 text-xl font-semibold">
                Review Potential Highlights
              </h3>
              <p className="mt-3 leading-7 text-gray-400">
                Review the moments identified by the AI-assisted workflow
                and choose the clips that fit your content strategy.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <span className="text-sm font-semibold text-green-400">
                STEP 04
              </span>
              <h3 className="mt-3 text-xl font-semibold">
                Create and Export Shorts
              </h3>
              <p className="mt-3 leading-7 text-gray-400">
                Turn selected moments into short-form clips and continue
                with your editing and publishing workflow.
              </p>
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="mt-24">
          <h2 className="text-3xl font-bold md:text-4xl">
            Why Turn Long Videos Into Shorts?
          </h2>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 p-6">
              <h3 className="text-xl font-semibold">
                Save Time Finding Clips
              </h3>
              <p className="mt-3 leading-7 text-gray-400">
                Searching through a long recording manually can take a lot
                of time. AI-assisted discovery can make the initial search
                much faster.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 p-6">
              <h3 className="text-xl font-semibold">
                Get More From Existing Content
              </h3>
              <p className="mt-3 leading-7 text-gray-400">
                One long-form video can provide multiple opportunities for
                short-form content across different platforms.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 p-6">
              <h3 className="text-xl font-semibold">
                Build a Consistent Content Workflow
              </h3>
              <p className="mt-3 leading-7 text-gray-400">
                Create a repeatable workflow for discovering, reviewing,
                and producing short clips from your existing videos.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 p-6">
              <h3 className="text-xl font-semibold">
                Repurpose Multiple Content Types
              </h3>
              <p className="mt-3 leading-7 text-gray-400">
                Podcasts, interviews, tutorials, webinars, educational
                recordings, and other long-form videos can be repurposed
                into short-form content.
              </p>
            </div>
          </div>
        </section>

        {/* Content types */}
        <section className="mt-24">
          <h2 className="text-3xl font-bold md:text-4xl">
            What Long Videos Can You Turn Into Shorts?
          </h2>

          <p className="mt-5 max-w-3xl text-lg leading-8 text-gray-400">
            Long-form content often contains several sections that can be
            useful as standalone short videos. LumoClip can be useful for
            creators working with many different types of content.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-white/10 p-5">
              Podcasts
            </div>
            <div className="rounded-xl border border-white/10 p-5">
              YouTube Videos
            </div>
            <div className="rounded-xl border border-white/10 p-5">
              Interviews
            </div>
            <div className="rounded-xl border border-white/10 p-5">
              Tutorials
            </div>
            <div className="rounded-xl border border-white/10 p-5">
              Educational Videos
            </div>
            <div className="rounded-xl border border-white/10 p-5">
              Webinars
            </div>
          </div>
        </section>

        {/* Internal links */}
        <section className="mt-24">
          <h2 className="text-3xl font-bold md:text-4xl">
            More LumoClip Tools
          </h2>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <Link
              to="/ai-video-clipper"
              className="rounded-xl border border-white/10 p-6 transition hover:border-green-400/40"
            >
              <h3 className="font-semibold">AI Video Clipper</h3>
              <p className="mt-2 text-sm text-gray-400">
                Find potential highlights from long-form videos.
              </p>
            </Link>

            <Link
              to="/ai-shorts-generator"
              className="rounded-xl border border-white/10 p-6 transition hover:border-green-400/40"
            >
              <h3 className="font-semibold">AI Shorts Generator</h3>
              <p className="mt-2 text-sm text-gray-400">
                Create short-form content with an AI-assisted workflow.
              </p>
            </Link>

            <Link
              to="/youtube-to-shorts"
              className="rounded-xl border border-white/10 p-6 transition hover:border-green-400/40"
            >
              <h3 className="font-semibold">YouTube to Shorts</h3>
              <p className="mt-2 text-sm text-gray-400">
                Repurpose YouTube videos into short-form content.
              </p>
            </Link>
          </div>
        </section>

        {/* FAQ (rendered from the same FAQS array used by useSEO) */}
        <section className="mt-24">
          <h2 className="text-3xl font-bold md:text-4xl">
            Long Video to Shorts FAQ
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
            Discover potential highlights from your long-form videos and
            build short-form content faster with LumoClip.
          </p>

          <Link
            to="/"
            className="mt-8 inline-block rounded-xl bg-white px-7 py-3 font-semibold text-black transition hover:bg-gray-200"
          >
            Start Creating With LumoClip
          </Link>
        </section>
      </div>
    </main>
  );
}