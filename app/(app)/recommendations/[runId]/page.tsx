import { RecommendationsRunLoader } from "@/components/recommendations/RecommendationsRunLoader";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ runId: string }>;
};

export default async function RecommendationsRunPage({ params }: PageProps) {
  const { runId } = await params;
  return <RecommendationsRunLoader runId={runId} />;
}
