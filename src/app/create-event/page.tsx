"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { EventForm } from "@/features/events/components/event-form";
import { createEventAction } from "@/app/actions";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function CreateEventPage() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleCreateEvent = async (
    slug: string,
    name: string,
    description?: string,
    creationMode?: "total" | "classique" | "apero" | "zero",
    date?: string,
    key?: string,
    adults?: number,
    children?: number
  ) => {
    setError(null);
    startTransition(async () => {
      try {
        const result = await createEventAction({
          slug,
          name,
          description,
          key: key,
          creationMode,
          date,
          adults: adults ?? 0,
          children: children ?? 0,
        });
        router.push(`/event/${result.slug}?key=${result.adminKey}&new=true`);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Une erreur est survenue";
        setError(message);
      }
    });
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col px-6 py-12">
      <Link
        href="/login?mode=user"
        className="mb-8 flex items-center gap-2 text-sm font-medium text-gray-500 transition-colors hover:text-accent"
      >
        <ArrowLeft size={16} />
        Retour à la connexion
      </Link>

      <div className="mb-10 space-y-4">
        <h1 className="text-3xl font-bold text-gray-900">Créer un événement</h1>
        <p className="text-gray-600">
          Organisez votre événement rapidement, sans avoir à créer de compte.
        </p>
      </div>

      <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-xl shadow-gray-200/50">
        <EventForm
          onSubmit={handleCreateEvent}
          onClose={() => router.push("/login?mode=user")}
          isPending={isPending}
          error={error}
          inline
          showWarnings
        />
      </div>
    </main>
  );
}
