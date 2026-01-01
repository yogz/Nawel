"use client";

import { useState, useTransition } from "react";
import {
  type AdminUser,
  toggleUserBanAdminAction,
  deleteUserAdminAction,
} from "@/app/actions/admin-actions";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import {
  Users,
  Calendar,
  User as UserIcon,
  Trash2,
  Ban,
  CheckCircle2,
  Shield,
  Mail,
  Clock,
} from "lucide-react";

export function UserList({ initialUsers }: { initialUsers: AdminUser[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [banningUser, setBanningUser] = useState<AdminUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<AdminUser | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleToggleBan = async () => {
    if (!banningUser) {
      return;
    }

    const newBannedStatus = !banningUser.banned;

    startTransition(async () => {
      try {
        await toggleUserBanAdminAction({
          id: banningUser.id,
          banned: newBannedStatus,
        });

        setUsers((prev) =>
          prev.map((u) => (u.id === banningUser.id ? { ...u, banned: newBannedStatus } : u))
        );
        setBanningUser(null);
      } catch (error) {
        alert(error instanceof Error ? error.message : "Erreur lors de l'opération");
      }
    });
  };

  const handleDelete = async () => {
    if (!deletingUser) {
      return;
    }

    startTransition(async () => {
      try {
        await deleteUserAdminAction({ id: deletingUser.id });
        setUsers((prev) => prev.filter((u) => u.id !== deletingUser.id));
        setDeletingUser(null);
      } catch (error) {
        alert(error instanceof Error ? error.message : "Erreur lors de la suppression");
      }
    });
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  if (users.length === 0) {
    return (
      <div className="rounded-2xl border border-white/20 bg-white/80 p-8 text-center shadow-lg backdrop-blur-sm">
        <p className="text-muted-foreground">Aucun utilisateur trouvé.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4">
        {users.map((user) => (
          <div
            key={user.id}
            className="rounded-2xl border border-white/20 bg-white/80 p-4 shadow-lg backdrop-blur-sm sm:p-6"
          >
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <h3 className="truncate text-lg font-semibold text-text">{user.name}</h3>
                  {user.role === "admin" && (
                    <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      <Shield className="h-3 w-3" />
                      Admin
                    </span>
                  )}
                  {user.banned && (
                    <span className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">
                      <Ban className="h-3 w-3" />
                      Banni
                    </span>
                  )}
                </div>
                <div className="mb-3 flex flex-col gap-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {user.email}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Inscrit le {formatDate(user.createdAt)}
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    <strong>{user.eventsCount}</strong> événement{user.eventsCount > 1 ? "s" : ""}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <UserIcon className="h-4 w-4" />
                    <strong>{user.peopleCount}</strong> profil{user.peopleCount > 1 ? "s" : ""} lié
                    {user.peopleCount > 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 sm:flex-col">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBanningUser(user)}
                  disabled={user.role === "admin"}
                  className={
                    user.banned
                      ? "text-green-600 hover:text-green-700"
                      : "text-orange-600 hover:text-orange-700"
                  }
                >
                  {user.banned ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Débannir</span>
                    </>
                  ) : (
                    <>
                      <Ban className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Bannir</span>
                    </>
                  )}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeletingUser(user)}
                  disabled={user.role === "admin"}
                >
                  <Trash2 className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Supprimer</span>
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Ban Confirmation Modal */}
      <Drawer open={!!banningUser} onOpenChange={(open) => !open && setBanningUser(null)}>
        <DrawerContent className="px-4">
          <DrawerHeader className="px-1 text-left">
            <DrawerTitle>
              {banningUser?.banned ? "Réactiver l'utilisateur" : "Bannir l'utilisateur"}
            </DrawerTitle>
          </DrawerHeader>
          <div className="space-y-4 pb-8">
            <p className="text-muted-foreground">
              {banningUser?.banned
                ? `Souhaitez-vous vraiment réactiver le compte de ${banningUser?.name} ?`
                : `Êtes-vous sûr de vouloir bannir ${banningUser?.name} ? Il ne pourra plus se connecter à l'application.`}
            </p>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setBanningUser(null)}
                disabled={isPending}
              >
                Annuler
              </Button>
              <Button
                type="button"
                className={`flex-1 ${
                  banningUser?.banned
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-orange-600 hover:bg-orange-700"
                }`}
                onClick={handleToggleBan}
                disabled={isPending}
              >
                {isPending ? "Traitement..." : banningUser?.banned ? "Réactiver" : "Bannir"}
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Delete Confirmation Modal */}
      <Drawer open={!!deletingUser} onOpenChange={(open) => !open && setDeletingUser(null)}>
        <DrawerContent className="px-4">
          <DrawerHeader className="px-1 text-left">
            <DrawerTitle>Supprimer l'utilisateur</DrawerTitle>
          </DrawerHeader>
          <div className="space-y-4 pb-8">
            <p className="text-muted-foreground">
              Êtes-vous sûr de vouloir supprimer définitivement l'utilisateur{" "}
              <strong className="text-text">{deletingUser?.name}</strong> ? Cette action est
              irréversible. Les événements dont il est propriétaire seront conservés mais n'auront
              plus de propriétaire.
            </p>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setDeletingUser(null)}
                disabled={isPending}
              >
                Annuler
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="flex-1"
                onClick={handleDelete}
                disabled={isPending}
              >
                {isPending ? "Suppression..." : "Supprimer"}
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
