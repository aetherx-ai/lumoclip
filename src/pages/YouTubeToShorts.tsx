
import { Link } from "react-router-dom";

export default function YouTubeToShorts() {
  return (
    <main className="min-h-screen bg-black text-white px-6 py-20">
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

        {/* What it does */}
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

        {/* How it works */}
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
                Review the moments identified by the AI-assisted workflow and
                choose the clips that fit your content strategy.
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

        {/* Use cases */}
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

            <div className="rounded-xl border border-white/10 p-5">
              <h3 className="font-semibold">
                Podcasts
              </h3>
              <p className="mt-2 text-sm text-gray-400">
                Find memorable conversations and discussion moments.
              </p>
            </div>

            <div className="rounded-xl border border-white/10 p-5">
              <h3 className="font-semibold">
                Interviews
              </h3>
              <p className="mt-2 text-sm text-gray-400">
                Discover useful answers, quotes, and discussion segments.
              </p>
            </div>

            <div className="rounded-xl border border-white/10 p-5">
              <h3 className="font-semibold">
                Tutorials
              </h3>
              <p className="mt-2 text-sm text-gray-400">
                Turn useful sections of longer tutorials into short clips.
              </p>
            </div>

            <div className="rounded-xl border border-white/10 p-5">
              <h3 className="font-semibold">
                Educational Content
              </h3>
              <p className="mt-2 text-sm text-gray-400">
                Repurpose explanations and educational moments.
              </p>
            </div>

            <div className="rounded-xl border border-white/10 p-5">
              <h3 className="font-semibold">
                Commentary
              </h3>
              <p className="mt-2 text-sm text-gray-400">
                Find interesting sections from longer commentary videos.
              </p>
            </div>

            <div className="rounded-xl border border-white/10 p-5">
              <h3 className="font-semibold">
                Webinars
              </h3>
              <p className="mt-2 text-sm text-gray-400">
                Repurpose useful sections from longer presentations.
              </p>
            </div>

          </div>
        </section>

        {/* Benefits */}
        <section className="mt-24">
          <h2 className="text-3xl font-bold md:text-4xl">
            Why Convert YouTube Videos Into Shorts?
          </h2>

          <div className="mt-10 grid gap-6 md:grid-cols-2">

            <div className="rounded-2xl border border-white/10 p-6">
              <h3 className="text-xl font-semibold">
                Save Time
              </h3>

              <p className="mt-3 leading-7 text-gray-400">
                Finding useful moments manually can take significant time.
                An AI-assisted workflow can make the initial discovery
                process faster.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 p-6">
              <h3 className="text-xl font-semibold">
                Repurpose Existing Content
              </h3>

              <p className="mt-3 leading-7 text-gray-400">
                Create additional short-form content from videos you have
                already published or recorded.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 p-6">
              <h3 className="text-xl font-semibold">
                Build a Short-Form Workflow
              </h3>

              <p className="mt-3 leading-7 text-gray-400">
                Turn long-form YouTube content into a repeatable source of
                short-form video ideas and clips.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 p-6">
              <h3 className="text-xl font-semibold">
                Reach More Platforms
              </h3>

              <p className="mt-3 leading-7 text-gray-400">
                Use selected short clips as part of your content strategy
                across YouTube Shorts, TikTok, and Instagram Reels.
              </p>
            </div>

          </div>
        </section>

        {/* Internal links */}
        <section className="mt-24">
          <h2 className="text-3xl font-bold md:text-4xl">
            Explore More LumoClip Tools
          </h2>

          <div className="mt-8 grid gap-4 md:grid-cols-3">

            <Link
              to="/ai-video-clipper"
              className="rounded-xl border border-white/10 p-6 transition hover:border-green-400/40"
            >
              <h3 className="font-semibold">
                AI Video Clipper
              </h3>

              <p className="mt-2 text-sm text-gray-400">
                Find potential highlights from long-form videos.
              </p>
            </Link>

            <Link
              to="/long-video-to-shorts"
              className="rounded-xl border border-white/10 p-6 transition hover:border-green-400/40"
            >
              <h3 className="font-semibold">
                Long Video to Shorts
              </h3>

              <p className="mt-2 text-sm text-gray-400">
                Repurpose long videos into short-form content.
              </p>
            </Link>

            <Link
              to="/ai-shorts-generator"
              className="rounded-xl border border-white/10 p-6 transition hover:border-green-400/40"
            >
              <h3 className="font-semibold">
                AI Shorts Generator
              </h3>

              <p className="mt-2 text-sm text-gray-400">
                Create Shorts with an AI-assisted workflow.
              </p>
            </Link>

          </div>
        </section>

        {/* FAQ */}
        <section className="mt-24">
          <h2 className="text-3xl font-bold md:text-4xl">
            YouTube to Shorts FAQ
          </h2>

          <div className="mt-8 space-y-8">

            <div>
              <h3 className="text-xl font-semibold">
                How can I turn a YouTube video into a Short?
              </h3>

              <p className="mt-3 leading-7 text-gray-400">
                Provide a supported YouTube video URL, analyze the content
                with an AI-assisted workflow, review potential highlights,
                and create short-form clips from the selected moments.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold">
                Can LumoClip find highlights from YouTube videos?
              </h3>

              <p className="mt-3 leading-7 text-gray-400">
                LumoClip uses AI-assisted video analysis to identify
                potential highlights from supported long-form videos.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold">
                Can I use the Shorts on other platforms?
              </h3>

              <p className="mt-3 leading-7 text-gray-400">
                Short-form clips can be used as part of your content strategy
                for platforms such as YouTube Shorts, TikTok, and Instagram
                Reels.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold">
                What YouTube videos work best for repurposing?
              </h3>

              <p className="mt-3 leading-7 text-gray-400">
                Podcasts, interviews, tutorials, educational videos,
                webinars, and commentary can all contain sections that may
                work well as short-form content.
              </p>
            </div>

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