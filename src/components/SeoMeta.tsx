import { Helmet } from "react-helmet-async";

const BASE_URL = "https://archmind.ai";
const OG_IMAGE = `${BASE_URL}/og-image.png`;
const TWITTER_HANDLE = "@ArchMindAI";

interface SeoMetaProps {
  title?: string;
  description?: string;
  canonicalPath?: string;
  ogImage?: string;
  ogType?: string;
  noIndex?: boolean;
}

/**
 * Per-page SEO meta tags using react-helmet-async.
 * Defaults to the site-wide values — each page overrides only what it needs.
 */
export function SeoMeta({
  title = "ArchMind AI – Architecture Intelligence Platform",
  description = "AI-powered reviews for your software architecture. Upload diagrams, get expert analysis on scalability, security, reliability, performance, cost, and more.",
  canonicalPath = "/",
  ogImage = OG_IMAGE,
  ogType = "website",
  noIndex = false,
}: SeoMetaProps) {
  const canonicalUrl = `${BASE_URL}${canonicalPath}`;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content="ArchMind AI" />
      <meta property="og:locale" content="en_US" />

      {/* Twitter/X */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content={TWITTER_HANDLE} />
      <meta name="twitter:creator" content={TWITTER_HANDLE} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  );
}
