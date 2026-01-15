"use client";

import { useState, useTransition } from "react";
import { type AdminFeedback, deleteFeedbackAdminAction } from "@/app/actions/admin-actions";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Trash2, User, Globe, MessageSquare, Clock, ExternalLink } from "lucide-react";

export function AdminFeedbackList({ initialFeedback }: { initialFeedback: AdminFeedback[] }) {
  const [feedbackList, setFeedbackList] = useState(initialFeedback);
  const [deletingFeedback, setDeletingFeedback] = useState<AdminFeedback | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleDelete = async () => {
    if (!deletingFeedback) return;

    startTransition(async () => {
      try {
        await deleteFeedbackAdminAction({ id: deletingFeedback.id });
        setFeedbackList((prev) => prev.filter((f) => f.id !== deletingFeedback.id));
        setDeletingFeedback(null);
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

  if (feedbackList.length === 0) {
    return (
      <div className="rounded-2xl border border-white/20 bg-white/80 p-8 text-center shadow-lg backdrop-blur-sm">
        <p className="text-muted-foreground">Aucun feedback pour le moment.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4">
        {feedbackList.map((feedback) => (
          <div
            key={feedback.id}
            className="rounded-2xl border border-white/20 bg-white/80 p-4 shadow-lg backdrop-blur-sm sm:p-6"
          >
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div className="min-w-0 flex-1">
                <div className="mb-3 flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                    <User className="h-4 w-4" />
                    <span>{feedback.user?.name || "Utilisateur inconnu"}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{feedback.user?.email}</span>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{formatDate(feedback.createdAt)}</span>
                  </div>
                </div>

                <div className="mb-4 rounded-xl bg-black/5 p-4">
                  <div className="mb-2 flex items-center gap-2 text-primary">
                    <MessageSquare className="h-4 w-4" />
                    <span className="text-sm font-semibold uppercase tracking-wider">Message</span>
                  </div>
                  <p className="whitespace-pre-wrap text-text">{feedback.content}</p>
                </div>

                <div className="space-y-2">
                  {feedback.url && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Globe className="h-4 w-4 shrink-0" />
                      <span className="font-medium">URL :</span>
                      <a
                        href={feedback.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 truncate transition-colors hover:text-primary"
                      >
                        {feedback.url}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                  {feedback.userAgent && (
                    <div className="flex items-start gap-2 text-xs text-muted-foreground">
                      <span className="shrink-0 font-medium">UA:</span>
                      <span className="break-all">{feedback.userAgent}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex shrink-0">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeletingFeedback(feedback)}
                >
                  <Trash2 className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Supprimer</span>
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Delete Confirmation Modal */}
      <Drawer open={!!deletingFeedback} onOpenChange={(open) => !open && setDeletingFeedback(null)}>
        <DrawerContent className="px-4">
          <DrawerHeader className="px-1 text-left">
            <DrawerTitle>Supprimer le feedback</DrawerTitle>
          </DrawerHeader>
          <div className="space-y-4 pb-8">
            <p className="text-muted-foreground">
              Êtes-vous sûr de vouloir supprimer ce feedback ? Cette action est irréversible.
            </p>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setDeletingFeedback(null)}
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
