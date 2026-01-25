"use client";

import { PersonForm } from "@/features/people/components/person-form";
import { PersonEditForm } from "@/features/people/components/person-edit-form";
import type { PlanData, Sheet } from "@/lib/types";

interface PersonSheetContentProps {
  sheet?: Extract<Sheet, { type: "person" }>;
  readOnly?: boolean;
  currentUserId?: string;
  currentUserImage?: string | null;
  handleCreatePerson: (name: string, emoji?: string, userId?: string) => void;
}

export function PersonSheetContent({
  sheet,
  readOnly,
  currentUserId,
  currentUserImage,
  handleCreatePerson,
}: PersonSheetContentProps) {
  return (
    <PersonForm
      readOnly={readOnly}
      onSubmit={handleCreatePerson}
      currentUserId={currentUserId}
      currentUserImage={currentUserImage}
      isJoin={sheet?.context === "join"}
    />
  );
}

interface PersonEditSheetContentProps {
  sheet: Extract<Sheet, { type: "person-edit" }>;
  plan: PlanData;
  readOnly?: boolean;
  currentUserId?: string;
  handleUpdatePerson: (
    id: number,
    name: string,
    emoji: string | null,
    image?: string | null,
    token?: string | null
  ) => void;
  handleDeletePerson: (id: number) => void;
}

export function PersonEditSheetContent({
  sheet,
  plan,
  readOnly,
  currentUserId,
  handleUpdatePerson,
  handleDeletePerson,
}: PersonEditSheetContentProps) {
  return (
    <PersonEditForm
      person={sheet.person}
      allPeople={plan.people}
      readOnly={readOnly}
      onSubmit={(name: string, emoji: string | null, image?: string | null) =>
        handleUpdatePerson(sheet.person.id, name, emoji, image, sheet.token)
      }
      onDelete={() => handleDeletePerson(sheet.person.id)}
      currentUserId={currentUserId}
    />
  );
}
