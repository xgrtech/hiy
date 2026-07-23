import type { MetadataRoute } from "next";
import { supabaseAdmin } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

/** Static pages + every live public twin. Draft/ephemeral twins stay out. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/pricing`, changeFrequency: "monthly", priority: 0.8 },
  ];

  try {
    const { data: twins } = await supabaseAdmin()
      .from("twins")
      .select("slug, updated_at")
      .eq("status", "live")
      .eq("is_ephemeral", false)
      .limit(5000);
    const twinPages: MetadataRoute.Sitemap = (twins ?? []).map((t) => ({
      url: `${SITE_URL}/${t.slug}`,
      lastModified: t.updated_at ?? undefined,
      changeFrequency: "daily",
      priority: 0.7,
    }));
    return [...staticPages, ...twinPages];
  } catch {
    return staticPages; // missing service key etc. — static pages still index
  }
}
