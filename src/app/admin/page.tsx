import { auth } from "@/lib/auth-config";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAllEventsAction } from "@/app/actions/admin-actions";
import { AdminHeader } from "@/components/admin/admin-header";
import { EventList } from "@/components/admin/event-list";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface p-4">
        <div className="rounded-2xl border border-white/20 bg-white/80 p-8 text-center shadow-lg backdrop-blur-sm">
          <h1 className="mb-2 text-xl font-bold text-red-600">Accès refusé</h1>
          <p className="text-muted-foreground">Vous n&apos;avez pas les droits administrateur.</p>
        </div>
      </div>
    );
  }

  const events = await getAllEventsAction();

  return (
    <div className="min-h-screen bg-surface">
      <AdminHeader user={session.user} />
      <main className="mx-auto max-w-6xl p-4 sm:p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text">Gestion des événements</h1>
          <p className="text-muted-foreground">
            {events.length} événement{events.length > 1 ? "s" : ""} au total
          </p>
        </div>
        <EventList initialEvents={events} />
      </main>
    </div>
  );
}
