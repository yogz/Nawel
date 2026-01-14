"use client";

import {
  Smartphone,
  Star,
  HelpCircle,
  Gift,
  Newspaper,
  ChefHat,
  MessageCircle,
  Play,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function MarketingStories() {
  return (
    <div className="space-y-12 mt-12 pb-20">
      <div className="border-t border-white/10 pt-12">
        <SectionHeader
          title="2.3 Stories & Highlights"
          description="Séquences d'engagement quotidien et architecture de profil."
          icon={Smartphone}
        />
      </div>

      <DailyStories />
      <HighlightsArchitecture />
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
        <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
          <Icon className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold text-text">{title}</h2>
      </div>
      <p className="text-muted-foreground ml-14">{description}</p>
    </div>
  );
}

function DailyStories() {
  const sequences = [
    {
      day: "Lundi : Motivation",
      steps: [
        {
          type: "Sondage",
          text: "Team Batch Cooking ou Team Impro ?",
          option1: "Organisé 🤓",
          option2: "Au feeling 🎨",
        },
        { type: "Question", text: "C'est quoi ton objectif cette semaine ?" },
        { type: "Photo", text: "Photo petit déj sain + 'Let's go !'" },
      ],
    },
    {
      day: "Mardi : Astuce",
      steps: [
        {
          type: "Quiz",
          text: "Combien de temps on garde du riz cuit ?",
          option1: "2 jours",
          option2: "5 jours (non!)",
        },
        { type: "Vidéo", text: "Explication rapide conservation." },
        { type: "Lien", text: "Lien vers article/post." },
      ],
    },
    {
      day: "Mercredi : Q&A",
      steps: [
        { type: "Question", text: "Posez-moi vos questions sur l'app !" },
        { type: "Réponse", text: "Réponse vidéo à 3 questions." },
        { type: "Slider", text: "Ça vous aide ce format ?" },
      ],
    },
    {
      day: "Vendredi : Détente",
      steps: [
        { type: "Meme", text: "Meme 'Moi qui attends le livreur' vs 'Moi qui cuisine'." },
        { type: "Compte à rebours", text: "Weekend dans h-4 !" },
        { type: "Question", text: "Tu cuisines quoi ce weekend ?" },
      ],
    },
  ];

  return (
    <div className="space-y-4 mb-12">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Play className="w-5 h-5 text-purple-500" />
        Séquences Stories (Exemples)
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {sequences.map((seq, i) => (
          <Card key={i} className="bg-white/60 backdrop-blur-sm border-white/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-purple-700">{seq.day}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {seq.steps.map((step, j) => (
                <div
                  key={j}
                  className="flex gap-2 text-sm bg-white/50 p-2 rounded border border-white/20"
                >
                  <div className="mt-0.5">
                    {j === 0 && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-100 text-[10px] font-bold text-purple-600">
                        1
                      </span>
                    )}
                    {j === 1 && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-100 text-[10px] font-bold text-purple-600">
                        2
                      </span>
                    )}
                    {j === 2 && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-100 text-[10px] font-bold text-purple-600">
                        3
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-muted-foreground uppercase block">
                      {step.type}
                    </span>
                    <span className="text-text leading-tight">{step.text}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function HighlightsArchitecture() {
  const highlights = [
    { name: "Nouveautés", emoji: "✨", icon: Star, desc: "Updates App, Patch notes" },
    {
      name: "Témoignages",
      emoji: "💬",
      icon: MessageCircle,
      desc: "Reposts avis clients, DM love",
    },
    { name: "Tutoriels", emoji: "📚", icon: HelpCircle, desc: "How-to rapides, Astuces cachées" },
    { name: "FAQ", emoji: "❓", icon: HelpCircle, desc: "Réponses aux questions fréquentes" },
    { name: "Recettes", emoji: "🍽️", icon: ChefHat, desc: "Idées repas, Reposts food" },
    { name: "Équipe", emoji: "👥", icon: MessageCircle, desc: "Behind the scenes, Présentations" },
    { name: "Offres", emoji: "🎁", icon: Gift, desc: "Codes promo, Soldes" },
    { name: "Presse", emoji: "📰", icon: Newspaper, desc: "Articles, Passages TV/Radio" },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Star className="w-5 h-5 text-purple-500" />
        Highlights Stratégiques (À la Une)
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
        {highlights.map((hl, i) => (
          <div key={i} className="flex flex-col items-center gap-2 group cursor-pointer">
            <div className="h-16 w-16 rounded-full border-2 border-purple-200 bg-gradient-to-tr from-purple-50 to-white flex items-center justify-center shadow-sm group-hover:border-purple-500 transition-colors">
              <span className="text-2xl">{hl.emoji}</span>
            </div>
            <div className="text-center">
              <p className="text-xs font-bold text-text">{hl.name}</p>
              <p className="text-[9px] text-muted-foreground leading-tight max-w-[80px] mt-0.5 hidden sm:block">
                {hl.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
