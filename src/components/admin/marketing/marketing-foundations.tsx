"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, Target, Search, MousePointerClick } from "lucide-react";

export function MarketingFoundations() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
      <div className="border-b pb-4 border-dashed border-gray-200">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-sm font-bold">
            1
          </span>
          Fondations Stratégiques
        </h2>
      </div>

      {/* 1.1 Market */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Search className="w-5 h-5 text-muted-foreground" />
          1.1 Analyse de Marché (France)
        </h3>
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="bg-blue-50/50 border-blue-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-700">
                TAM (Total Addressable)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-900">28M</div>
              <p className="text-xs text-blue-600/80">
                Foyers Français cuisinant &gt;3 repas/semaine
              </p>
            </CardContent>
          </Card>
          <Card className="bg-blue-50/50 border-blue-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-700">SAM (Serviceable)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-900">4.5M</div>
              <p className="text-xs text-blue-600/80">CSP+ urbains, 25-45 ans, digital natives</p>
            </CardContent>
          </Card>
          <Card className="bg-blue-50/50 border-blue-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-700">
                SOM (Obtainable - 12m)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-900">50k</div>
              <p className="text-xs text-blue-600/80">Utilisateurs actifs mensuels (Objectif Y1)</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 1.2 ICP */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Users className="w-5 h-5 text-muted-foreground" />
          1.2 Ideal Customer Profiles
        </h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          <ICPCard
            name="L'Organisateur Dévoué"
            desc="Gère les vacances entre amis, les anniversaires. Aime le contrôle mais déteste relancer."
            pain="Les excels qui ne sont pas lus, les 'qui apporte quoi' interminables sur WhatsApp."
            channel="Groupes FB/WhatsApp, Recherches Google 'Planning repas groupe'"
          />
          <ICPCard
            name="Le Parent 'Charge Mentale'"
            desc="Gère le foyer, veut optimiser les courses et déléguer sans conflit."
            pain="Devoir tout lister pour le conjoint, les oublis de courses, l'inspiration."
            channel="Instagram (Influenceurs famille), Bouche à oreille"
          />
          <ICPCard
            name="Le Millennial 'Potluck'"
            desc="Dîners improvisés, brunchs le dimanche. Veut du rapide et collaboratif."
            pain="Doublons (3 quiches, 0 boisson), remboursements compliqués."
            channel="TikTok, Events Facebook, Lien partagé par un ami"
          />
        </div>
      </div>

      {/* 1.3 UVP */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Target className="w-5 h-5 text-muted-foreground" />
          1.3 Proposition de Valeur Unique
        </h3>
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[150px]">Cible</TableHead>
                <TableHead>Message Clé</TableHead>
                <TableHead className="hidden md:table-cell">Pitch Elevator (10s)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-semibold">Pour l&apos;Organisateur</TableCell>
                <TableCell>
                  &quot;Votre événement organisé tout seul, sans relancer personne.&quot;
                </TableCell>
                <TableCell className="text-muted-foreground text-sm hidden md:table-cell">
                  CoList est le Doodle du repas de groupe. Créez, partagez, et laissez les invités
                  remplir le menu eux-mêmes.
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-semibold">Pour le Participant</TableCell>
                <TableCell>
                  &quot;C&apos;est plus simple de participer quand on sait quoi apporter.&quot;
                </TableCell>
                <TableCell className="text-muted-foreground text-sm hidden md:table-cell">
                  Fini les 50 notifs WhatsApp pour savoir qui amène le pain. Cliquez, choisissez,
                  validez.
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-semibold">Différenciateur</TableCell>
                <TableCell>
                  <Badge variant="outline" className="mr-2">
                    Zéro-Compte
                  </Badge>
                  <Badge variant="outline" className="mr-2">
                    Temps Réel
                  </Badge>
                  <Badge variant="outline">IA Utilitaires</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm hidden md:table-cell">
                  Contrairement à Tricount (finance) ou WhatsApp (messagerie), CoList est
                  verticalisé sur l&apos;opérationnel du repas.
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}

function ICPCard({
  name,
  desc,
  pain,
  channel,
}: {
  name: string;
  desc: string;
  pain: string;
  channel: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{name}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm space-y-3">
        <div>
          <span className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">
            Profil
          </span>
          <p className="mt-1 leading-snug">{desc}</p>
        </div>
        <div>
          <span className="font-semibold text-xs text-red-500/80 uppercase tracking-wider">
            Douleur
          </span>
          <p className="mt-1 leading-snug text-muted-foreground">{pain}</p>
        </div>
        <div>
          <span className="font-semibold text-xs text-green-600/80 uppercase tracking-wider">
            Canal
          </span>
          <p className="mt-1 leading-snug text-muted-foreground">{channel}</p>
        </div>
      </CardContent>
    </Card>
  );
}
