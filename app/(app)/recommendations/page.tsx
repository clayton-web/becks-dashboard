import { RecommendationsHub } from "@/components/recommendations/RecommendationsHub";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ trackId?: string; crateId?: string }>;
};

export default async function RecommendationsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  return (
    <RecommendationsHub
      initialTrackId={sp.trackId?.trim() ?? null}
      initialCrateId={sp.crateId?.trim() ?? null}
    />
  );
}
