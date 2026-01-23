"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  createPersonAction,
  updatePersonAction,
  deletePersonAction,
  claimPersonAction,
  unclaimPersonAction,
  updatePersonStatusAction,
} from "@/app/actions";
import type { PlanData } from "@/lib/types";
import type { PersonHandlerParams } from "@/features/shared/types";
import { trackPersonAction } from "@/lib/analytics";

export function usePersonHandlers({
  plan,
  setPlan,
  slug,
  writeKey,
  readOnly,
  setSheet,
  setSuccessMessage,
  setSelectedPerson,
  session,
  refetch,
  token,
}: PersonHandlerParams) {
  const [, startTransition] = useTransition();
  const t = useTranslations("Translations");

  const handleCreatePerson = (name: string, emoji?: string | null, userId?: string) => {
    // For joining as a guest, we allow creation even in readOnly mode
    // if a writeKey (adminKey) is present, as person:create hanya requires the key.
    if (readOnly && !writeKey) {
      return;
    }
    startTransition(async () => {
      try {
        const created = await createPersonAction({
          name,
          emoji: emoji ?? undefined,
          userId,
          slug,
          key: writeKey,
        });

        // Store anonymous token if present (for guest RSVP)
        if (created.token) {
          try {
            const tokens = JSON.parse(localStorage.getItem("colist_guest_tokens") || "{}");
            tokens[created.id] = created.token;
            localStorage.setItem("colist_guest_tokens", JSON.stringify(tokens));
          } catch (e) {
            console.error("Failed to save guest token", e);
          }
        }

        setPlan((prev: PlanData) => ({
          ...prev,
          people: [...prev.people, created].sort((a, b) => a.name.localeCompare(b.name)),
        }));
        setSelectedPerson?.(created.id);
        setSheet(null);
        setSuccessMessage({ text: t("person.added", { name }), type: "success" });
        trackPersonAction("person_created", name);
      } catch (error) {
        console.error("Failed to create person:", error);
        setSuccessMessage({ text: t("person.errorAdd"), type: "error" });
      }
    });
  };

  const handleUpdatePerson = (
    id: number,
    name: string,
    emoji?: string | null,
    image?: string | null,
    updateToken?: string | null,
    closeSheet = false
  ) => {
    if (readOnly) {
      return;
    }
    startTransition(async () => {
      try {
        await updatePersonAction({
          id,
          name,
          emoji,
          image,
          slug,
          key: writeKey,
          token: (updateToken || token) ?? undefined,
        });
        setPlan((prev: PlanData) => ({
          ...prev,
          people: prev.people.map((p) =>
            p.id === id ? { ...p, name, emoji: emoji ?? null, image: image ?? null } : p
          ),
        }));

        // Trigger session refetch if the person is linked to the current user
        const updatedPerson = plan.people.find((p) => p.id === id);
        if (
          updatedPerson?.userId &&
          session?.user &&
          updatedPerson.userId === session.user.id &&
          refetch
        ) {
          await refetch();
        }
        if (closeSheet) {
          setSheet(null);
        }
        setSuccessMessage({ text: t("person.updated"), type: "success" });
        trackPersonAction("person_updated", name);
      } catch (error) {
        console.error("Failed to update person:", error);
        setSuccessMessage({ text: t("person.errorUpdate"), type: "error" });
      }
    });
  };

  const handleDeletePerson = (id: number) => {
    if (readOnly) {
      return;
    }
    const previousPlan = plan;
    const person = plan.people.find((p) => p.id === id);
    setPlan((prev: PlanData) => ({
      ...prev,
      people: prev.people.filter((p) => p.id !== id),
      meals: prev.meals.map((meal) => ({
        ...meal,
        services: meal.services.map((service) => ({
          ...service,
          items: service.items.map((item) =>
            item.personId === id ? { ...item, personId: null, person: null } : item
          ),
        })),
      })),
    }));
    setSheet(null);
    setSuccessMessage({
      text: t("person.deleted", { name: person?.name || "Convive" }),
      type: "success",
    });
    trackPersonAction("person_deleted", person?.name);

    startTransition(async () => {
      try {
        await deletePersonAction({ id, slug, key: writeKey, token: token ?? undefined });
      } catch (error) {
        console.error("Failed to delete person:", error);
        setPlan(previousPlan);
        setSuccessMessage({ text: t("person.errorDelete"), type: "error" });
      }
    });
  };

  const handleClaimPerson = (personId: number) => {
    if (readOnly) {
      return Promise.reject(new Error("Read only"));
    }
    return new Promise<{ userId: string | null; name: string; emoji: string | null }>(
      (resolve, reject) => {
        startTransition(async () => {
          try {
            const updated = await claimPersonAction({ personId, slug, key: writeKey });
            setPlan((prev: PlanData) => ({
              ...prev,
              people: prev.people.map((p) =>
                p.id === personId
                  ? {
                      ...p,
                      userId: updated.userId,
                      name: updated.name,
                      emoji: updated.emoji,
                      image: updated.image,
                    }
                  : p
              ),
            }));
            setSuccessMessage({ text: t("person.claimed"), type: "success" });
            resolve(updated);
          } catch (error) {
            console.error("Failed to claim person:", error);
            setSuccessMessage({ text: t("person.errorClaim"), type: "error" });
            reject(error);
          }
        });
      }
    );
  };

  const handleUnclaimPerson = (personId: number) => {
    if (readOnly) {
      return;
    }
    startTransition(async () => {
      try {
        await unclaimPersonAction({ personId, slug, key: writeKey, token: token ?? undefined });
        setPlan((prev: PlanData) => ({
          ...prev,
          people: prev.people.map((p) => (p.id === personId ? { ...p, userId: null } : p)),
        }));
        setSuccessMessage({ text: t("person.unclaimed"), type: "success" });
      } catch (error) {
        console.error("Failed to unclaim person:", error);
        setSuccessMessage({ text: t("person.errorUnclaim"), type: "error" });
      }
    });
  };

  const handleUpdateStatus = (
    personId: number,
    status: "confirmed" | "declined" | "maybe",
    updateToken?: string | null
  ) => {
    startTransition(async () => {
      try {
        await updatePersonStatusAction({
          slug,
          key: writeKey,
          personId,
          status,
          token: (updateToken || token) ?? undefined,
        });
        setPlan((prev: PlanData) => ({
          ...prev,
          people: prev.people.map((p) => (p.id === personId ? { ...p, status } : p)),
        }));
      } catch (error) {
        console.error("Failed to update status:", error);
        setSuccessMessage({ text: t("person.errorUpdate"), type: "error" });
      }
    });
  };

  const handleUpdateGuestCount = (
    personId: number,
    guestAdults: number,
    guestChildren: number,
    updateToken?: string | null
  ) => {
    startTransition(async () => {
      try {
        await updatePersonStatusAction({
          slug,
          key: writeKey,
          personId,
          status: "confirmed",
          guestAdults,
          guestChildren,
          token: (updateToken || token) ?? undefined,
        });
        setPlan((prev: PlanData) => ({
          ...prev,
          people: prev.people.map((p) =>
            p.id === personId
              ? {
                  ...p,
                  status: "confirmed",
                  guest_adults: guestAdults,
                  guest_children: guestChildren,
                }
              : p
          ),
        }));
      } catch (error) {
        console.error("Failed to update guest count:", error);
        setSuccessMessage({ text: t("person.errorUpdate"), type: "error" });
      }
    });
  };

  return {
    handleCreatePerson,
    handleUpdatePerson,
    handleDeletePerson,
    handleClaimPerson,
    handleUnclaimPerson,
    handleUpdateStatus,
    handleUpdateGuestCount,
  };
}
