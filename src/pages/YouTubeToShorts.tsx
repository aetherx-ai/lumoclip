import { Link } from "react-router-dom";
import { useSEO, type FAQItem } from "../useSEO";

const FAQS: FAQItem[] = [
  {
    question: "How can I turn a YouTube video into a Short?",
    answer:
      "Provide a supported YouTube video URL, analyze the content with an AI-assisted workflow, review potential highlights, and create short-form clips from the selected moments.",
  },
  {
    question: "Can LumoClip find highlights from YouTube videos?",
    answer:
      "LumoClip uses AI-assisted video analysis to identify potential highlights from supported long-form videos.",
  },
  {
    question: "Can I use the Shorts on other platforms?",
    answer:
      "Short-form clips can be used as part of your content strategy for platforms such as YouTube Shorts, TikTok, and Instagram Reels.",
  },
  {
    question: "What YouTube videos work best for repurposing?",
    answer:
      "Podcasts, interviews, tutorials, educational videos, webinars, and commentary can contain sections that may work well as short-form content.",
  },
];

export default function YouTubeToShorts() {
  useSEO({
    title: "YouTube to Shorts AI | Turn YouTube Videos Into Shorts | LumoClip",
    description:
      "Turn YouTube videos into Shorts with LumoClip AI. Find potential highlights from long-form videos and create short-form content for YouTube Shorts, TikTok, and Instagram Reels.",
    path: "/youtube-to-shorts",
    imageAlt: "LumoClip YouTube to Shorts AI",
    faqs: FAQS,
  });

  return (
    <main className="min-h-screen bg-black px-6 py-20 text-white">
      <div className="mx-auto max-w-5xl">
        {/* Hero */}
        <section>
          <p className="mb-4 text-sm uppercase tracking-[0.25em] text-green-400">
            LumoClip AI
          </p>

          <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
            Turn YouTube Videos Into Shorts With AI
          </h1>

          <p className="mt-6 max-w-3xl text-lg leading-8 text-gray-400">
            Repurpose supported YouTube videos into short-form clips with
            LumoClip. Use an AI-assisted workflow to discover potential
            highlights from longer videos and create content for YouTube
            Shorts, TikTok, and Instagram Reels.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              to="/"
              className="rounded-xl bg-white px-6 py-3 font-semibold text-black transition hover:bg-gray-200"
            >
              Create Shorts
            </Link>

            <Link
              to="/ai-video-clipper"
              className="rounded-xl border border-white/15 px-6 py-3 font-semibold text-white transition hover:border-green-400/50"
            >
              AI Video Clipper
            </Link>
          </div>
        </section>

        {/* What It Does */}
        <section className="mt-24">
          <h2 className="text-3xl font-bold md:text-4xl">
            Turn YouTube Content Into Short-Form Videos
          </h2>

          <p className="mt-5 max-w-3xl text-lg leading-8 text-gray-400">
            Long YouTube videos can contain many useful moments that are
            suitable for short-form content. Instead of manually searching
            through an entire video, LumoClip helps you discover potential
            highlights through an AI-assisted workflow.
          </p>

          <p className="mt-4 max-w-3xl text-lg leading-8 text-gray-400">
            This makes it easier to repurpose interviews, podcasts,
            educational videos, tutorials, commentary, and other supported
            long-form YouTube content.
          </p>
        </section>

        {/* How It Works */}
        <section className="mt-24">
          <h2 className="text-3xl font-bold md:text-4xl">
            How YouTube to Shorts Works
          </h2>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <span className="text-sm font-semibold text-green-400">
                STEP 01
              </span>
              <h3 className="mt-3 text-xl font-semibold">
                Add a YouTube Video
              </h3>
              <p className="mt-3 leading-7 text-gray-400">
                Start by providing a supported YouTube video URL containing
                the long-form content you want to repurpose.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <span className="text-sm font-semibold text-green-400">
                STEP 02
              </span>
              <h3 className="mt-3 text-xl font-semibold">
                AI Analyzes the Video
              </h3>
              <p className="mt-3 leading-7 text-gray-400">
                LumoClip analyzes the content and searches for potential
                moments that may work well as short-form clips.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <span className="text-sm font-semibold text-green-400">
                STEP 03
              </span>
              <h3 className="mt-3 text-xl font-semibold">
                Review Potential Clips
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
                Export Your Shorts
              </h3>
              <p className="mt-3 leading-7 text-gray-400">
                Create short-form clips from your selected moments and
                continue with your editing and publishing workflow.
              </p>
            </div>
          </div>
        </section>

        {/* Use Cases */}
        <section className="mt-24">
          <h2 className="text-3xl font-bold md:text-4xl">
            What YouTube Videos Can You Repurpose?
          </h2>

          <p className="mt-5 max-w-3xl text-lg leading-8 text-gray-400">
            Different types of long-form YouTube content can contain
            moments worth turning into Shorts. LumoClip can help creators
            discover those opportunities faster.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              ["Podcasts", "Find memorable conversations and discussion moments."],
              ["Interviews", "Discover useful answers, quotes, and discussion segments."],
              ["Tutorials", "Turn useful sections of longer tutorials into short clips."],
              ["Educational Content", "Repurpose explanations and educational moments."],
              ["Commentary", "Find interesting sections from longer commentary videos."],
              ["Webinars", "Repurpose useful sections from longer presentations."],
            ].map(([title, description]) => (
              <div key={title} className="rounded-xl border border-white/10 p-5">
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-gray-400">{description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Benefits */}
        <section className="mt-24">
          <h2 className="text-3xl font-bold md:text-4xl">
            Why Convert YouTube Videos Into Shorts?
          </h2>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {[
              [
                "Save Time",
                "Finding useful moments manually can take significant time. An AI-assisted workflow can make the initial discovery process faster.",
              ],
              [
                "Repurpose Existing Content",
                "Create additional short-form content from videos you have already published or recorded.",
              ],
              [
                "Build a Short-Form Workflow",
                "Turn long-form YouTube content into a repeatable source of short-form video ideas and clips.",
              ],
              [
                "Reach More Platforms",
                "Use selected short clips as part of your content strategy across YouTube Shorts, TikTok, and Instagram Reels.",
              ],
            ].map(([title, description]) => (
              <div key={title} className="rounded-2xl border border-white/10 p-6">
                <h3 className="text-xl font-semibold">{title}</h3>
                <p className="mt-3 leading-7 text-gray-400">{description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Internal Links */}
        <section className="mt-24">
          <h2 className="text-3xl font-bold md:text-4xl">
            Explore More LumoClip Tools
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
              to="/long-video-to-shorts"
              className="rounded-xl border border-white/10 p-6 transition hover:border-green-400/40"
            >
              <h3 className="font-semibold">Long Video to Shorts</h3>
              <p className="mt-2 text-sm text-gray-400">
                Repurpose long videos into short-form content.
              </p>
            </Link>

            <Link
              to="/ai-shorts-generator"
              className="rounded-xl border border-white/10 p-6 transition hover:border-green-400/40"
            >
              <h3 className="font-semibold">AI Shorts Generator</h3>
              <p className="mt-2 text-sm text-gray-400">
                Create Shorts with an AI-assisted workflow.
              </p>
            </Link>
          </div>
        </section>

        {/* FAQ (rendered from the same FAQS array used by useSEO) */}
        <section className="mt-24">
          <h2 className="text-3xl font-bold md:text-4xl">
            YouTube to Shorts FAQ
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
            Turn Your YouTube Videos Into Shorts
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-gray-400">
            Discover potential highlights from supported YouTube videos and
            build your short-form content workflow with LumoClip.
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