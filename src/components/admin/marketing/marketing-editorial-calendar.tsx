"use client";

import {
  CalendarDays,
  Clock,
  Hash,
  Target,
  Megaphone,
  Sun,
  Snowflake,
  Leaf,
  Flower2,
  CalendarRange,
} from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function MarketingEditorialCalendar() {
  return (
    <div className="space-y-12 mt-12">
      <div className="border-t border-white/10 pt-12">
        <SectionHeader
          title="2.1 Calendrier Éditorial"
          description="Structure de publication récurrente et temps forts saisonniers."
          icon={CalendarRange}
        />
      </div>

      <div className="space-y-8">
        <WeeklySchedule />
        <SeasonalThemes />
      </div>
    </div>
  );
}

function SectionHeader({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: any;
}) {
  return (
    <div className="border-b border-white/10 pb-4 mb-8">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500">
          <Icon className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold text-text">{title}</h2>
      </div>
      <p className="text-muted-foreground ml-14">{description}</p>
    </div>
  );
}

function WeeklySchedule() {
  const weekDays = [
    {
      day: "Lundi",
      theme: "Organisation & Meal Prep",
      time: "08h00 (Trajet boulot)",
      format: "Carrousel (Tips)",
      objective: "Éducation / Valeur",
      hashtags: "#mealprepmonday #organisationcuisine #batchcooking",
      cta: "Enregistre ce post pour dimanche prochain",
    },
    {
      day: "Mardi",
      theme: "Recette Express < 20 min",
      time: "17h30 (Avant le dîner)",
      format: "Reel (Tuto rapide)",
      objective: "Viralité (Save/Share)",
      hashtags: "#recetteexpress #dinerrapide #recettefacile",
      cta: "Identifie un ami qui a toujours faim",
    },
    {
      day: "Mercredi",
      theme: "Preuve Sociale / Success Story",
      time: "12h30 (Pause déj)",
      format: "Post Statique (Citation/Photo)",
      objective: "Confiance / Conversion",
      hashtags: "#avisclient #familleorganisee #colistfamily",
      cta: "Télécharge l'app via le lien bio",
    },
    {
      day: "Jeudi",
      theme: "Focus Fonctionnalité App",
      time: "20h00 (Détente)",
      format: "Reel (Dymo écran)",
      objective: "Éducation Produit",
      hashtags: "#appastuce #foodtech #nouveaute",
      cta: "Teste cette fonctionnalité maintenant",
    },
    {
      day: "Vendredi",
      theme: "Inspiration Weekend & Détente",
      time: "18h00 (Week-end !)",
      format: "Reel Mood / Meme",
      objective: "Engagement / Sympathie",
      hashtags: "#weekendvibes #apero #bonvivant",
      cta: "Partage en story ton programme",
    },
    {
      day: "Samedi",
      theme: "Behind The Scenes (Équipe)",
      time: "11h00 (Brunch)",
      format: "Story / Post Photo",
      objective: "Authenticité / Branding",
      hashtags: "#startuplife #teamnawel #coulisses",
      cta: "Réponds en commentaire",
    },
    {
      day: "Dimanche",
      theme: "Challenge / Motivation",
      time: "19h00 (Blues du dimanche)",
      format: "Reel Motivation",
      objective: "Engagement / Prépa semaine",
      hashtags: "#sundayreset #planification #motivation",
      cta: "Prêt pour la semaine ? Mets un 🔥",
    },
  ];

  return (
    <Card className="bg-white/60 backdrop-blur-sm border-white/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <CalendarDays className="w-5 h-5 text-orange-500" />
          Semaine Type (Recurring)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border border-white/20 overflow-hidden">
          <Table>
            <TableHeader className="bg-black/5">
              <TableRow>
                <TableHead className="w-[100px]">Jour</TableHead>
                <TableHead>Thème & Format</TableHead>
                <TableHead>Timing & Objectif</TableHead>
                <TableHead>Détails (Tags & CTA)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {weekDays.map((day) => (
                <TableRow key={day.day}>
                  <TableCell className="font-bold text-primary">{day.day}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className="font-medium">{day.theme}</span>
                      <Badge variant="outline" className="w-fit text-[10px] bg-white/50">
                        {day.format}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 text-sm">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="w-3 h-3" /> {day.time}
                      </div>
                      <div className="flex items-center gap-1 text-orange-600 font-medium text-xs">
                        <Target className="w-3 h-3" /> {day.objective}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 text-xs">
                      <span className="text-muted-foreground italic">{day.hashtags}</span>
                      <span className="text-text font-medium">CTA: "{day.cta}"</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function SeasonalThemes() {
  const seasons = [
    {
      name: "Q1 : Hiver & Résolutions",
      icon: Snowflake,
      months: [
        {
          event: "Janvier : Healthy Reset",
          angle: "Après les fêtes, on reprend le contrôle sans régime punitif.",
          ideas:
            "Challenge '30 jours de légumes', Reel 'Ma liste de courses Detox', Tuto 'Cuisiner léger'",
          hooks:
            '"3 erreurs qui ruinent ta diète", "L\'ingrédient secret détox", "Reset ton frigo !"',
        },
        {
          event: "Février : St Valentin / Mardi Gras",
          angle: "Cuisiner pour ceux qu'on aime (ou soi-même).",
          ideas: "Dîner romantique < 20€, Recette crêpes healthy, Menu 'Date Night' facile",
          hooks: '"Le dîner qui va le/la faire craquer", "Mieux que le resto ?", "Crêpes party !"',
        },
        {
          event: "Mars : Ménage de Printemps (Frigo)",
          angle: "On vide les placards et on s'organise.",
          ideas: "Avant/Après frigo organisé, Challenge 'Jeter vs Garder', Astuces conservation",
          hooks:
            '"Ton frigo te fait perdre de l\'argent", "Stop au gaspillage", "Organisation ASMR"',
        },
      ],
    },
    {
      name: "Q2 : Printemps & Vitalité",
      icon: Flower2,
      months: [
        {
          event: "Avril : Pâques / Brunch Season",
          angle: "Le retour des beaux jours et des repas conviviaux.",
          ideas: "Brunch de Pâques facile, Recettes oeufs/chocolat, Recevoir sans stress",
          hooks:
            '"Le brunch parfait n\'existe p...", "Chocovore ? Regarde ça", "Recevoir en 30min"',
        },
        {
          event: "Mai : Jours Fériés & Picnics",
          angle: "Manger dehors, cuisiner rapide pour profiter.",
          ideas: "Picnic checklist, Salades jar, Sandwichs gourmands, Apéro dînatoire",
          hooks: '"Le secret d\'un picnic réussi", "Sandwich 5 étoiles", "Apéro time !"',
        },
        {
          event: "Juin : Objectif Été (Summer Body mais cool)",
          angle: "Légèreté et hydratation avant l'été.",
          ideas: "Eaux détox, Recettes fraîches, Glaces maison express, Menu canicule",
          hooks: '"Trop chaud pour cuisiner ?", "Glace saine en 5min", "Hydratation fun"',
        },
      ],
    },
    {
      name: "Q3 : Été & Vacances",
      icon: Sun,
      months: [
        {
          event: "Juillet : Organisation Vacances",
          angle: "Gérer les repas en camping/location/roadtrip.",
          ideas: "Liste courses vacances, Cuisiner sans four, One-pot pasta camping",
          hooks: '"Cuisiner sans matos ? Facile", "Liste courses vacances", "Survival kit cuisine"',
        },
        {
          event: "Août : Plaisirs d'été & BBQ",
          angle: "Profiter des produits de saison, grillades.",
          ideas: "Marinades BBQ, Salades composées, Fruits d'été, Repas grands groupes",
          hooks: '"Le roi du BBQ c\'est toi", "Salade pas ennuyeuse", "Recevoir 10 potes facile"',
        },
        {
          event: "Septembre : Rentrée & Batch Cooking",
          angle: "Le GROS temps fort. Reprendre le rythme scolaire/boulot.",
          ideas: "Lunchbox enfants, Batch cooking dimanche, Petit-dej énergétiques",
          hooks:
            '"La rentrée sans stress ?", "Tes lunchs de la semaine", "Sauve tes soirs de semaine"',
        },
      ],
    },
    {
      name: "Q4 : Automne & Fêtes",
      icon: Leaf,
      months: [
        {
          event: "Octobre : Cozy Food & Halloween",
          angle: "Plats réconfortants, soupes, courges.",
          ideas: "Veloutés originaux, Recettes citrouille, Snacks Halloween enfants",
          hooks: '"La soupe que tout le monde aime", "Courge : mode d\'emploi", "Halloween sain ?"',
        },
        {
          event: "Novembre : Économies & Anti-Gaspillage",
          angle: "Préparer le budget fêtes, cuisiner malin.",
          ideas: "Recettes < 2€, Cuisiner les restes, Batch cooking budget",
          hooks: '"Manger roi pour 2€", "Tu jettes ça ? Stop !", "Économise 50€ cette semaine"',
        },
        {
          event: "Décembre : Fêtes de fin d'année",
          angle: "Menus de fête, cadeaux gourmands, organisation J-J.",
          ideas: "Menu Noël sans stress, Cadeaux biscuits, Organisation repas de fête",
          hooks:
            '"Noël sans passer la journée en cuisine", "Le cadeau qui se mange", "Menu wow, effort mini"',
        },
      ],
    },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Megaphone className="w-5 h-5 text-orange-500" />
        Thématiques Saisonnières (Marronniers)
      </h3>
      <Tabs defaultValue="Q1" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 bg-black/5">
          {seasons.map((season) => (
            <TabsTrigger
              key={season.name.substring(0, 2)}
              value={season.name.substring(0, 2)}
              className="data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-sm"
            >
              <season.icon className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">{season.name}</span>
              <span className="sm:hidden">{season.name.substring(0, 2)}</span>
            </TabsTrigger>
          ))}
        </TabsList>
        {seasons.map((season) => (
          <TabsContent key={season.name.substring(0, 2)} value={season.name.substring(0, 2)}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              {season.months.map((month, i) => (
                <Card key={i} className="bg-white/60 backdrop-blur-sm border-white/20 h-full">
                  <CardHeader className="p-4 pb-2">
                    <Badge
                      variant="secondary"
                      className="w-fit mb-2 bg-orange-500/10 text-orange-700 hover:bg-orange-500/20"
                    >
                      {month.event}
                    </Badge>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 text-sm space-y-3">
                    <p className="font-medium text-text leading-snug">{month.angle}</p>
                    <div>
                      <span className="text-xs font-bold text-muted-foreground uppercase">
                        Idées de posts :
                      </span>
                      <p className="text-muted-foreground text-xs mt-0.5">{month.ideas}</p>
                    </div>
                    <div className="bg-orange-500/5 p-2 rounded border border-orange-500/10">
                      <span className="text-[10px] font-bold text-orange-600 uppercase">
                        Hooks :
                      </span>
                      <p className="text-xs text-orange-800 italic mt-0.5">{month.hooks}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
