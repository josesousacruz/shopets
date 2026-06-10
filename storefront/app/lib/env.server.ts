const required = (key: string, fallback?: string) => {
  const v = process.env[key] ?? fallback;
  if (v === undefined) throw new Error(`Missing env: ${key}`);
  return v;
};

export const env = {
  apiBaseUrl: required("API_BASE_URL", "http://localhost:8000/api/v1"),
  siteUrl: required("PUBLIC_SITE_URL", "http://localhost:3000"),
  ga4Id: process.env.PUBLIC_GA4_ID ?? "",
  metaPixelId: process.env.PUBLIC_META_PIXEL_ID ?? "",
};
