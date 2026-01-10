import { getPublicCostsAction } from "@/app/actions/about-actions";
import { BehindTheScenes } from "@/features/about/components/BehindTheScenes";
import { setRequestLocale } from "next-intl/server";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default async function BehindTheScenesPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  const costs = await getPublicCostsAction();

  return (
    <div className="min-h-screen bg-surface">
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center">Chargement...</div>
        }
      >
        <BehindTheScenes costs={costs} />
      </Suspense>
    </div>
  );
}
