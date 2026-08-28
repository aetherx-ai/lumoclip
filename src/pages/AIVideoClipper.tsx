import { Link } from "react-router-dom";

export default function AIVideoClipper() {
  return (
    <main className="min-h-screen bg-black text-white px-6 py-20">
      <div className="mx-auto max-w-5xl">

        <p className="mb-4 text-sm uppercase tracking-widest text-green-400">
          LumoClip AI
        </p>

        <h1 className="text-4xl font-bold md:text-6xl">
          AI Video Clipper That Finds Your Best Moments
        </h1>

        <p className="mt-6 max-w-3xl text-lg text-gray-400">
          LumoClip is an AI video clipper that automatically finds
          engaging moments from long videos and turns them into
          short-form content for YouTube Shorts, TikTok, and Instagram Reels.
        </p>

        <div className="mt-8">
          <Link
            to="/"
            className="rounded-xl bg-white px-6 py-3 font-semibold text-black"
          >
            Try LumoClip
          </Link>
        </div>

        <section className="mt-20">
          <h2 className="text-3xl font-bold">
            Create Short Clips With AI
          </h2>

          <p className="mt-4 text-gray-400">
            Upload a video or provide a supported video URL. LumoClip
            analyzes the content and helps identify moments that work
            well as short-form videos.
          </p>
        </section>

        <section className="mt-16">
          <h2 className="text-3xl font-bold">
            From Long Videos to Short Clips
          </h2>

          <p className="mt-4 text-gray-400">
            Turn podcasts, interviews, tutorials, and other long-form
            videos into short clips without manually searching through
            the entire video.
          </p>
        </section>

      </div>
    </main>
  );
}