"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Hash, Video, FileText, Search, LayoutGrid } from "lucide-react";

export function MarketingContentStrategy() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-400">
      <div className="border-b pb-4 border-dashed border-gray-200">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-pink-100 text-pink-700 text-sm font-bold">
            4
          </span>
          Stratégie de Contenu
        </h2>
      </div>

      <Tabs defaultValue="pillars" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="pillars">Piliers Éditoriaux</TabsTrigger>
          <TabsTrigger value="seo">Stratégie SEO</TabsTrigger>
          <TabsTrigger value="social">Social Media</TabsTrigger>
        </TabsList>

        <TabsContent value="pillars" className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="bg-pink-50/30 border-pink-100">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-4 h-4 text-pink-600" />
                  L&apos;Organisation Sereine
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p className="mb-2">
                  <strong>Objectif :</strong> Autorité
                </p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Tips meal prep</li>
                  <li>Checklists vacances</li>
                  <li>Témoignages "Avant/Après CoList"</li>
                </ul>
              </CardContent>
            </Card>
            <Card className="bg-pink-50/30 border-pink-100">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4 text-pink-600" />
                  La Convivialité
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p className="mb-2">
                  <strong>Objectif :</strong> Viralité
                </p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Idées thèmes soirée</li>
                  <li>Recettes pour groupes</li>
                  <li>Humour "Fail d'organisation"</li>
                </ul>
              </CardContent>
            </Card>
            <Card className="bg-pink-50/30 border-pink-100">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Video className="w-4 h-4 text-pink-600" />
                  Product Education
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p className="mb-2">
                  <strong>Objectif :</strong> Activation
                </p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Démos fonctionnalités</li>
                  <li>Astuces cachées</li>
                  <li>Nouveautés</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="seo" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <Search className="w-4 h-4" /> Keywords Transactionnels (Priorité 1)
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">app liste de courses partagée</Badge>
                    <Badge variant="secondary">organiser repas groupe</Badge>
                    <Badge variant="secondary">planificateur menu semaine famille</Badge>
                    <Badge variant="secondary">logiciel gestion potluck</Badge>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <Search className="w-4 h-4" /> Keywords Informationnels (Priorité 2)
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">idée repas 15 personnes</Badge>
                    <Badge variant="outline">quantité nourriture par personne buffet</Badge>
                    <Badge variant="outline">organisation vacances amis</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="social" className="space-y-4">
          <Card>
            <CardContent className="pt-6 grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
                    Instagram
                  </Badge>
                  Prioritaire
                </h4>
                <ul className="space-y-3 text-sm">
                  <li className="flex justify-between border-b pb-2">
                    <span>Fréquence</span>
                    <span className="font-semibold">3 Reels + 5 Stories / sem</span>
                  </li>
                  <li className="flex justify-between border-b pb-2">
                    <span>Format Star</span>
                    <span className="font-semibold">Reels POV ("Point of View")</span>
                  </li>
                  <li className="text-muted-foreground text-xs pt-1">
                    Exemple: "POV: T'es le seul à avoir ramené un truc à boire mais tout le monde a
                    ramené des chips."
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <Badge className="bg-black hover:bg-gray-800">TikTok</Badge>
                  Secondaire
                </h4>
                <ul className="space-y-3 text-sm">
                  <li className="flex justify-between border-b pb-2">
                    <span>Fréquence</span>
                    <span className="font-semibold">Repost Reels + 1 exclu / sem</span>
                  </li>
                  <li className="flex justify-between border-b pb-2">
                    <span>Ton</span>
                    <span className="font-semibold">Authentique, brut, humoristique</span>
                  </li>
                  <li className="text-muted-foreground text-xs pt-1">
                    Focus sur la Gen Z qui organise des soirées en appart/vacances.
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
