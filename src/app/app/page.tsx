/** Creator app: sign-in → onboard → sidebar app (per "Hiy Mockups" §3). */
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";
import SignIn from "@/components/SignIn";
import Onboard from "@/components/Onboard";
import Dashboard from "@/components/Dashboard";
import type { TwinRecord, AppStats, RecentConversation, DayCount, TopQuestion } from "@/components/dashboard/types";

export const dynamic = "force-dynamic";

const DONT_KNOW = /don'?t have that in my knowledge|I don'?t know/i;

export default async function AppPage() {
  const sb = await supabaseServer();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) {
    return (
      <div className="contents wash-dawn">
        <SignIn />
      </div>
    );
  }

  const db = supabaseAdmin();
  const { data: twin } = await db
    .from("twins")
    .select(
      "id,slug,name,role_line,bio,greeting,avatar_url,links,suggested_questions,guardrail_topics,appearance,status"
    )
    .eq("owner_id", auth.user.id)
    .maybeSingle();

  if (!twin) {
    return (
      <div className="contents wash-dawn">
        <Onboard />
      </div>
    );
  }

  // Request-time windows in a force-dynamic server component (runs per
  // request, so wall-clock reads are intentional here).
  // eslint-disable-next-line react-hooks/purity
  const since7 = new Date(Date.now() - 7 * 86_400_000).toISOString();

  const [
    { data: sources },
    { data: wiki },
    { count: sessionsTotal },
    { count: sessionsWeek },
    { count: messagesTotal },
    { data: recentSessions },
    { data: recentMessages },
  ] = await Promise.all([
    db
      .from("sources")
      .select("id,title,type,word_count,created_at")
      .eq("twin_id", twin.id)
      .order("created_at", { ascending: false }),
    db.from("wikis").select("markdown").eq("twin_id", twin.id).maybeSingle(),
    db.from("chat_sessions").select("id", { count: "exact", head: true }).eq("twin_id", twin.id),
    db
      .from("chat_sessions")
      .select("id", { count: "exact", head: true })
      .eq("twin_id", twin.id)
      .gte("created_at", since7),
    db
      .from("messages")
      .select("id, chat_sessions!inner(twin_id)", { count: "exact", head: true })
      .eq("chat_sessions.twin_id", twin.id),
    db
      .from("chat_sessions")
      .select("id,created_at")
      .eq("twin_id", twin.id)
      .order("created_at", { ascending: false })
      .limit(120),
    db
      .from("messages")
      .select("session_id,role,content,created_at, chat_sessions!inner(twin_id)")
      .eq("chat_sessions.twin_id", twin.id)
      .order("created_at", { ascending: false })
      .limit(400),
  ]);

  // sessions per day, last 14 days
  const days: DayCount[] = [];
  for (let i = 13; i >= 0; i--) {
    // eslint-disable-next-line react-hooks/purity -- request-time date, server component
    const d = new Date(Date.now() - i * 86_400_000);
    const key = d.toISOString().slice(0, 10);
    days.push({
      day: key,
      label: d.toLocaleDateString("en", { month: "short", day: "numeric" }),
      count: 0,
    });
  }
  const byDay = new Map(days.map((d) => [d.day, d]));
  for (const s of recentSessions ?? []) {
    const key = (s.created_at as string).slice(0, 10);
    const hit = byDay.get(key);
    if (hit) hit.count++;
  }

  const msgs = (recentMessages ?? []) as Array<{
    session_id: string;
    role: string;
    content: string;
    created_at: string;
  }>;

  // recent conversations: newest sessions with their first user message
  const bySession = new Map<string, { first: string; count: number; at: string }>();
  for (const m of [...msgs].reverse()) {
    const cur = bySession.get(m.session_id);
    if (!cur) {
      bySession.set(m.session_id, {
        first: m.role === "user" ? m.content : "",
        count: 1,
        at: m.created_at,
      });
    } else {
      if (!cur.first && m.role === "user") cur.first = m.content;
      cur.count++;
      cur.at = m.created_at;
    }
  }
  const recent: RecentConversation[] = [...bySession.entries()]
    .sort((a, b) => (a[1].at < b[1].at ? 1 : -1))
    .slice(0, 4)
    .map(([id, v]) => ({
      id,
      question: v.first || "(visitor hasn't asked yet)",
      messages: v.count,
      at: v.at,
    }));

  // needs review: honest "I don't know" replies (the teach-your-hiy queue)
  const dontKnows = msgs.filter((m) => m.role === "assistant" && DONT_KNOW.test(m.content));
  const needsReview: TopQuestion[] = [];
  for (const dk of dontKnows) {
    const q = msgs.find(
      (m) => m.session_id === dk.session_id && m.role === "user" && m.created_at <= dk.created_at
    );
    if (q && !needsReview.some((n) => n.question === q.content)) {
      needsReview.push({ question: q.content, count: 1 });
    }
    if (needsReview.length >= 12) break;
  }

  // top questions: naive frequency over recent user messages
  const freq = new Map<string, number>();
  for (const m of msgs) {
    if (m.role !== "user") continue;
    const key = m.content.trim().toLowerCase().slice(0, 120);
    freq.set(key, (freq.get(key) ?? 0) + 1);
  }
  const topQuestions: TopQuestion[] = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([q, count]) => ({ question: q.charAt(0).toUpperCase() + q.slice(1), count }));

  const stats: AppStats = {
    conversations: sessionsTotal ?? 0,
    conversationsWeek: sessionsWeek ?? 0,
    messages: messagesTotal ?? msgs.length,
    needsReview: needsReview.length,
    days,
    recent,
    topQuestions,
    needsReviewList: needsReview,
    trainingWords: (sources ?? []).reduce((s, r) => s + (r.word_count ?? 0), 0),
  };

  return (
    <div className="contents wash-dawn">
      <Dashboard
        twin={twin as TwinRecord}
        sources={sources ?? []}
        wiki={wiki?.markdown ?? null}
        stats={stats}
      />
    </div>
  );
}
