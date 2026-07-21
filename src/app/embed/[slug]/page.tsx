/** Iframe target for the inline embed: chat only, minimal chrome. */
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/server";
import TwinChat from "@/components/TwinChat";

export const dynamic = "force-dynamic";

export default async function EmbedPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const db = supabaseAdmin();
  const { data: twin } = await db
    .from("twins")
    .select("slug,name,suggested_questions,status")
    .eq("slug", slug)
    .single();
  if (!twin || twin.status !== "live") notFound();

  return (
    <main className="p-3">
      <div className="mb-2 flex items-center gap-2.5">
        <div className="orb h-8 w-8" />
        <div>
          <p className="text-sm font-semibold leading-tight">{twin.name}&apos;s twin</p>
          <p className="text-[10px] text-inkfaint">AI twin — not the real person</p>
        </div>
      </div>
      <TwinChat
        slug={twin.slug}
        name={twin.name}
        suggested={((twin.suggested_questions as string[]) ?? []).slice(0, 2)}
        compact
      />
      <p className="mt-2 text-center text-[10px] text-inkfaint">
        Powered by <a href="https://hiy.ai" target="_blank" className="font-semibold">hiy.ai</a>
      </p>
    </main>
  );
}
