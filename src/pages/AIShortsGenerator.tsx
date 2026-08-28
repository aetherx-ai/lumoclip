import { Link } from "react-router-dom";

export default function AIShortsGenerator() {
  return (
    <main className="min-h-screen bg-black text-white px-6 py-20">
      <div className="mx-auto max-w-5xl">

        <p className="mb-4 text-sm uppercase tracking-widest text-green-400">
          LumoClip AI
        </p>

        <h1 className="text-4xl font-bold md:text-6xl">
          AI Shorts Generator
        </h1>

        <p className="mt-6 max-w-3xl text-lg text-gray-400">
          Create short-form video clips from long videos with
          LumoClip's AI-powered workflow. Find potential highlights
          and repurpose your content for short-form platforms.
        </p>

        <Link
          to="/"
          className="mt-8 inline-block rounded-xl bg-white px-6 py-3 font-semibold text-black"
        >
          Try LumoClip
        </Link>

        <section className="mt-20">
          <h2 className="text-3xl font-bold">
            Generate Shorts From Long Videos
          </h2>

          <p className="mt-4 text-gray-400">
            LumoClip helps identify interesting sections of long-form
            videos that can be turned into short clips.
          </p>
        </section>

      </div>
    </main>
  );
}