import { DashboardHome } from "@/components/dashboard/DashboardHome";
import { loadDashboardOverview } from "@/lib/data/dashboard-overview";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const overview =
    user?.id != null
      ? await loadDashboardOverview(supabase, user.id)
      : { ok: false as const, message: "Session missing" };

  const geminiConfigured = Boolean(process.env.GEMINI_API_KEY?.trim());

  return <DashboardHome overview={overview} geminiConfigured={geminiConfigured} />;
}
