import { Link } from "react-router-dom";

export default function YouTubeToShorts() {
  return (
    <main className="min-h-screen bg-black text-white px-6 py-20">
      <div className="mx-auto max-w-5xl">

        <p className="mb-4 text-sm uppercase tracking-widest text-green-400">
          LumoClip
        </p>

        <h1 className="text-4xl font-bold md:text-6xl">
          Turn YouTube Videos Into Shorts With AI
        </h1>

        <p className="mt-6 max-w-3xl text-lg text-gray-400">
          Use LumoClip to repurpose supported YouTube videos into
          short-form clips. AI helps identify interesting moments
          that can be used for Shorts and other social platforms.
        </p>

        <Link
          to="/"
          className="mt-8 inline-block rounded-xl bg-white px-6 py-3 font-semibold text-black"
        >
          Create Shorts
        </Link>

        <section className="mt-20">
          <h2 className="text-3xl font-bold">
            YouTube to Shorts Workflow
          </h2>

          <p className="mt-4 text-gray-400">
            Provide a supported YouTube video URL, let LumoClip
            analyze the content, and review the generated short clips.
          </p>
        </section>

      </div>
    </main>
  );
}