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
      <div className="min-h-screen flex items-center justify-center bg-surface p-4">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-8 border border-white/20 text-center">
          <h1 className="text-xl font-bold text-red-600 mb-2">Accès refusé</h1>
          <p className="text-muted-foreground">
            Vous n&apos;avez pas les droits administrateur.
          </p>
        </div>
      </div>
    );
  }

  const events = await getAllEventsAction();

  return (
    <div className="min-h-screen bg-surface">
      <AdminHeader user={session.user} />
      <main className="max-w-6xl mx-auto p-4 sm:p-6">
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
