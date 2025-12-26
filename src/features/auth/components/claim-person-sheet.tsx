"use client";

import { BottomSheet } from "@/components/ui/bottom-sheet";
import { User, Plus } from "lucide-react";
import { type Person } from "@/lib/types";
import { getPersonEmoji } from "@/lib/utils";

export function ClaimPersonSheet({
  open,
  onClose,
  unclaimed,
  onClaim,
  onJoinNew,
}: {
  open: boolean;
  onClose: () => void;
  unclaimed: Person[];
  onClaim: (personId: number) => void;
  onJoinNew: () => void;
}) {
  return (
    <BottomSheet open={open} onClose={onClose} title="C'est vous ?">
      <div className="space-y-6 py-6 transition-all duration-300">
        <div className="space-y-2 px-4 text-center">
          <p className="text-gray-600">
            Des convives sont déjà inscrits. Si votre nom est dans cette liste, vous pouvez y lier
            votre compte.
          </p>
        </div>

        <div className="grid gap-3 px-4">
          <div className="custom-scrollbar max-h-60 space-y-2 overflow-y-auto pr-1">
            {unclaimed.map((p) => (
              <button
                key={p.id}
                onClick={() => onClaim(p.id)}
                className="flex w-full items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 transition-all hover:border-accent/30 hover:bg-accent/5 active:scale-95"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50 text-2xl shadow-sm">
                  {getPersonEmoji(
                    p.name,
                    unclaimed.map((up) => up.name),
                    p.emoji
                  )}
                </div>
                <div className="flex-1 text-left">
                  <div className="text-base font-bold text-gray-900">{p.name}</div>
                  <div className="text-xs font-medium text-gray-500">
                    Lier mon compte à ce profil
                  </div>
                </div>
                <User className="h-5 w-5 text-gray-300" />
              </button>
            ))}
          </div>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-100" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-widest">
              <span className="bg-white px-3 font-bold text-gray-300">Ou bien</span>
            </div>
          </div>

          <button
            onClick={onJoinNew}
            className="flex w-full items-center gap-4 rounded-2xl bg-zinc-900 p-4 text-white shadow-lg shadow-zinc-900/10 transition-all hover:scale-[1.02] active:scale-95"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
              <Plus className="h-6 w-6" />
            </div>
            <div className="text-left">
              <div className="text-base font-bold">Créer un nouveau profil</div>
              <div className="text-xs text-white/60">Je ne suis pas dans la liste ci-dessus</div>
            </div>
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
