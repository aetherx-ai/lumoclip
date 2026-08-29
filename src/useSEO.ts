import { useEffect } from "react";

export interface FAQItem {
  question: string;
  answer: string;
}

interface SEOConfig {
  /** Page title, used for <title> and og:title / twitter:title */
  title: string;
  /** Page description, used for meta description and og/twitter description */
  description: string;
  /** Route path starting with "/", e.g. "/ai-video-clipper" or "/" for home */
  path: string;
  /** Absolute image URL for social previews. Defaults to the site logo. */
  image?: string;
  /** Alt text for the social preview image. */
  imageAlt?: string;
  /** Optional FAQ entries — when provided, an FAQPage schema is injected. */
  faqs?: FAQItem[];
}

const SITE_URL = "https://lumo-clip.com";
const DEFAULT_IMAGE = `${SITE_URL}/lumoclip-icon.png`;

// The site-wide defaults from index.html. Restored on unmount so leaving
// a page never leaves its title/meta tags stuck on the next page.
const DEFAULT_META = {
  title: "LumoClip - AI Video Clipper & Repurposing Tool",
  description:
    "LumoClip is an AI-powered video clipper that turns long videos, podcasts, and YouTube content into engaging short clips for YouTube Shorts, TikTok, and Instagram Reels.",
  image: DEFAULT_IMAGE,
  imageAlt: "LumoClip - AI Video Clipper",
  canonical: `${SITE_URL}/`,
};

/**
 * Sets a <meta> tag's content, creating the tag (with the correct
 * name/property attribute) if it doesn't already exist.
 */
function setMeta(
  attrName: "name" | "property",
  attrValue: string,
  contentValue: string
) {
  let element = document.querySelector(`meta[${attrName}="${attrValue}"]`);

  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attrName, attrValue);
    document.head.appendChild(element);
  }

  element.setAttribute("content", contentValue);
}

function applyMeta(
  title: string,
  description: string,
  canonical: string,
  image: string,
  imageAlt: string
) {
  document.title = title;

  setMeta("name", "description", description);
  setMeta(
    "name",
    "robots",
    "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
  );

  setMeta("property", "og:type", "website");
  setMeta("property", "og:url", canonical);
  setMeta("property", "og:title", title);
  setMeta("property", "og:description", description);
  setMeta("property", "og:image", image);
  setMeta("property", "og:image:alt", imageAlt);
  setMeta("property", "og:site_name", "LumoClip");
  setMeta("property", "og:locale", "en_US");

  setMeta("name", "twitter:card", "summary_large_image");
  setMeta("name", "twitter:title", title);
  setMeta("name", "twitter:description", description);
  setMeta("name", "twitter:image", image);
  setMeta("name", "twitter:image:alt", imageAlt);

  let canonicalLink = document.querySelector(
    'link[rel="canonical"]'
  ) as HTMLLinkElement | null;

  if (!canonicalLink) {
    canonicalLink = document.createElement("link");
    canonicalLink.rel = "canonical";
    document.head.appendChild(canonicalLink);
  }

  canonicalLink.href = canonical;
}

/**
 * Sets per-page SEO: title, meta description, robots, Open Graph,
 * Twitter card, canonical link, and (optionally) FAQPage schema.
 * Restores the site-wide defaults on unmount.
 *
 * NOTE: this is a client-side-only solution — it does not help
 * crawlers that don't execute JavaScript (most social link-preview
 * bots). For those, the site needs prerendering/SSR so each route's
 * tags are present in the initial HTML response.
 *
 * Usage:
 *   useSEO({
 *     title: "AI Video Clipper | ... | LumoClip",
 *     description: "...",
 *     path: "/ai-video-clipper",
 *     faqs: FAQS, // define FAQS as a module-level constant, not inline
 *   });
 */
export function useSEO({
  title,
  description,
  path,
  image = DEFAULT_IMAGE,
  imageAlt = DEFAULT_META.imageAlt,
  faqs,
}: SEOConfig) {
  useEffect(() => {
    const canonical = path === "/" ? SITE_URL + "/" : `${SITE_URL}${path}`;

    applyMeta(title, description, canonical, image, imageAlt);

    const schemaId = `faq-schema-${path.replace(/\//g, "") || "home"}`;
    let schema: HTMLElement | null = null;

    if (faqs && faqs.length > 0) {
      schema = document.getElementById(schemaId);

      if (!schema) {
        schema = document.createElement("script");
        schema.id = schemaId;
        schema.setAttribute("type", "application/ld+json");
        document.head.appendChild(schema);
      }

      schema.textContent = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.answer,
          },
        })),
      });
    }

    return () => {
      schema?.remove();

      applyMeta(
        DEFAULT_META.title,
        DEFAULT_META.description,
        DEFAULT_META.canonical,
        DEFAULT_META.image,
        DEFAULT_META.imageAlt
      );
    };
    // faqs is expected to be a stable, module-level array — if you ever
    // build it inline (e.g. faqs={[...]}) it will re-run every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, path, image, imageAlt, faqs]);
}