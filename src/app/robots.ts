import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/** Welcome search AND answer engines: AEO means GPTBot, ClaudeBot,
 *  PerplexityBot, and Google-Extended can read the public site. The app
 *  and API stay out of every index. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/app", "/api/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
