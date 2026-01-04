import { fetchPlan } from "@/lib/queries";
import { isWriteKeyValid } from "@/lib/auth";
import { notFound } from "next/navigation";
import { ShoppingPage } from "@/components/planning/shopping-page";
import type { Metadata } from "next";

export const revalidate = 30;

type Props = {
  params: Promise<{ slug: string; personId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const plan = await fetchPlan(params.slug);
  const person = plan.people.find((p) => p.id === parseInt(params.personId));

  return {
    title: person ? `Courses - ${person.name}` : "Courses",
    description: person
      ? `Liste de courses de ${person.name} pour ${plan.event?.name || params.slug}`
      : "Liste de courses",
  };
}

export default async function Page(props: Props) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const plan = await fetchPlan(params.slug);

  const personId = parseInt(params.personId);
  const person = plan.people.find((p) => p.id === personId);

  if (!person) {
    notFound();
  }

  const key = typeof searchParams?.key === "string" ? searchParams.key : undefined;
  const writeEnabled = isWriteKeyValid(key, plan.event?.adminKey ?? null);

  return (
    <ShoppingPage
      initialPlan={plan}
      person={person}
      slug={params.slug}
      writeKey={key}
      writeEnabled={writeEnabled}
    />
  );
}
