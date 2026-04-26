"use client";

import { useEffect, useState } from "react";
import { getGuestEventsAction } from "@/app/actions";
import { getAllGuestTokens } from "@/lib/guest-token";
import { EventList } from "./event-list";

type Meal = {
  id: number;
  date: string;
  time?: string | null;
  address?: string | null;
};

type Event = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  createdAt: Date | null;
  adminKey: string | null;
  ownerId: string | null;
  adults: number;
  children: number;
  meals?: Meal[];
};

export function GuestEventList() {
  const [events, setEvents] = useState<Event[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const pairs = getAllGuestTokens();
      if (pairs.length === 0) {
        if (!cancelled) {
          setEvents([]);
        }
        return;
      }
      try {
        const result = await getGuestEventsAction({ pairs });
        if (!cancelled) {
          setEvents(result as Event[]);
        }
      } catch {
        if (!cancelled) {
          setEvents([]);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  if (events === null) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  return <EventList events={events} writeEnabled />;
}
