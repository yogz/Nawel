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
import { Calendar, TrendingUp, Globe, Megaphone } from "lucide-react";

export function MarketingAcquisition() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
      <div className="border-b pb-4 border-dashed border-gray-200">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-700 text-sm font-bold">
            3
          </span>
          Plan d&apos;Acquisition (12 Mois)
        </h2>
      </div>

      <div className="relative border-l-2 border-green-200 ml-4 space-y-10 pl-6 py-2">
        {/* Phase 1 */}
        <div className="relative">
          <div className="absolute -left-[33px] top-0 flex h-8 w-8 items-center justify-center rounded-full bg-green-600 text-white shadow-sm ring-4 ring-white">
            <Megaphone className="h-4 w-4" />
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold text-green-900">
                Phase 1 : Lancement Radical (Mois 1-3)
              </h3>
              <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-none">
                Focus: Beta Users
              </Badge>
            </div>
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[150px]">Tactique</TableHead>
                    <TableHead>Action Concrète</TableHead>
                    <TableHead className="w-[100px] text-right">Budget</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Cold Outreach</TableCell>
                    <TableCell>
                      DM Instagram ciblés vers 100 micro-influenceurs &quot;Organisation/Maman&quot;
                      pour beta-test gratuit.
                    </TableCell>
                    <TableCell className="text-right">0 €</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Communities</TableCell>
                    <TableCell>
                      Lancement sur Product Hunt + Posts sur groupes Facebook locaux (Paris/Lyon).
                    </TableCell>
                    <TableCell className="text-right">0 €</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">SEO Technique</TableCell>
                    <TableCell>
                      Mise en place Landing Pages programmatiques : &quot;Organiser raclette&quot;,
                      &quot;Liste courses barbecue&quot;.
                    </TableCell>
                    <TableCell className="text-right">Dev Time</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Card>
          </div>
        </div>

        {/* Phase 2 */}
        <div className="relative">
          <div className="absolute -left-[33px] top-0 flex h-8 w-8 items-center justify-center rounded-full bg-white border-2 border-green-600 text-green-600 shadow-sm ring-4 ring-white">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold text-green-900">
                Phase 2 : Traction & Contenu (Mois 4-8)
              </h3>
              <Badge variant="outline">Focus: Organic Growth</Badge>
            </div>
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[150px]">Tactique</TableHead>
                    <TableHead>Action Concrète</TableHead>
                    <TableHead className="w-[100px] text-right">Budget</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Content Factory</TableCell>
                    <TableCell>
                      2 Reels/semaine (Recettes virales &gt; Lien en bio pour la liste de courses).
                    </TableCell>
                    <TableCell className="text-right">500€/m</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">SEO Contenu</TableCell>
                    <TableCell>
                      Blog : &quot;Top 10 des recettes pour 10 personnes&quot;, etc.
                    </TableCell>
                    <TableCell className="text-right">300€/m</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Referral</TableCell>
                    <TableCell>
                      Programme parrainage : &quot;Invitez un ami hôte = 1 mois Premium
                      offert&quot;.
                    </TableCell>
                    <TableCell className="text-right">Dev</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Card>
          </div>
        </div>

        {/* Phase 3 */}
        <div className="relative">
          <div className="absolute -left-[33px] top-0 flex h-8 w-8 items-center justify-center rounded-full bg-white border-2 border-green-600 text-green-600 shadow-sm ring-4 ring-white">
            <Globe className="h-4 w-4" />
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold text-green-900">
                Phase 3 : Scale & Paid (Mois 9-12)
              </h3>
              <Badge variant="outline">Focus: Expansion</Badge>
            </div>
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[150px]">Tactique</TableHead>
                    <TableHead>Action Concrète</TableHead>
                    <TableHead className="w-[100px] text-right">Budget</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Paid Social</TableCell>
                    <TableCell>
                      Instagram/TikTok Ads Retargeting sur les visiteurs du site.
                    </TableCell>
                    <TableCell className="text-right">1k€/m</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Partenariats</TableCell>
                    <TableCell>Intégration avec Drive Intermarché/Leclerc (Affiliation).</TableCell>
                    <TableCell className="text-right">Biz Dev</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
