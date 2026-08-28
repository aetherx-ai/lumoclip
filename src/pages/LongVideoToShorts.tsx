import { Link } from "react-router-dom";

export default function LongVideoToShorts() {
  return (
    <main className="min-h-screen bg-black text-white px-6 py-20">
      <div className="mx-auto max-w-5xl">

        <p className="mb-4 text-sm uppercase tracking-widest text-green-400">
          LumoClip
        </p>

        <h1 className="text-4xl font-bold md:text-6xl">
          Turn Long Videos Into Shorts With AI
        </h1>

        <p className="mt-6 max-w-3xl text-lg text-gray-400">
          Convert long videos into engaging short-form clips with
          LumoClip AI. Find interesting moments and create content
          for YouTube Shorts, TikTok, and Instagram Reels.
        </p>

        <Link
          to="/"
          className="mt-8 inline-block rounded-xl bg-white px-6 py-3 font-semibold text-black"
        >
          Start Creating
        </Link>

        <section className="mt-20">
          <h2 className="text-3xl font-bold">
            How Long Video to Shorts Works
          </h2>

          <p className="mt-4 text-gray-400">
            LumoClip analyzes your long-form video and identifies
            moments that can work as short-form clips. This makes it
            easier to repurpose podcasts, interviews, educational
            videos, and other long content.
          </p>
        </section>

        <section className="mt-16">
          <h2 className="text-3xl font-bold">
            Repurpose Your Long-Form Content
          </h2>

          <p className="mt-4 text-gray-400">
            Instead of manually searching through a long recording,
            use AI-assisted clipping to discover potential Shorts
            faster.
          </p>
        </section>

      </div>
    </main>
  );
}