"use client";

import { useState } from "react";
import Image from "next/image";
import { Download, Copy, Check, Instagram, Hash } from "lucide-react";
import { cn } from "@/lib/utils"; // Assuming utils exists, will fix if not

export function MarketingKit() {
  const [activeTab, setActiveTab] = useState<"strategyA" | "strategyB">("strategyA");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const strategyA = {
    title: "Stratégie A : L'Efficacité (Tech/Product)",
    description:
      "Focus sur la résolution du chaos, les fonctionnalités (IA, smart list) et le gain de temps. Ton : Dynamique, Direct, 'Problem Solver'.",
    posts: [
      {
        id: "post1_a",
        title: "L'Assistant Culinaire",
        format: "Reel / Carrousel",
        image: "/alt_ai_chef.png",
        caption: `🤯 Lasagnes pour 12 personnes ? \n\nJ'ai arrêté de compter sur mes doigts. J'ai juste demandé à Nawel.\n\n🍝 Il a généré la liste exacte de tous les ingrédients. \n✨ Il a ajusté les quantités pour 12.\n🛒 Il a tout mis dans la liste de courses commune.\n\nFini la charge mentale en cuisine. \n\n#MealPlanning #IA #DinnerParty #NawelApp`,
      },
      {
        id: "post2_a",
        title: "Zéro Friction",
        format: "Static Post",
        image: "/alt_guests.png",
        caption: `⛔️ "Télécharge l'app pour répondre à mon invit..." \n\nNON. \n\nAvec Nawel, vos invités reçoivent un lien. Ils cliquent. C'est tout.\nPas de compte à créer. Pas d'app à installer.\n\nParce qu'organiser un dîner ne devrait pas être une corvée administrative.\n\n#NoFriction #EventPlanner #Simple #TechForGood`,
      },
      {
        id: "post3_a",
        title: "La Liste Magique",
        format: "Story (Interactive)",
        image: "/alt_shopping.png",
        caption: `🛒 Qui achète quoi ?\n\nJulie prend le vin.\nMarc prend le dessert.\nEt Nawel additionne tout le reste pour moi.\n\nLa liste de courses est triée, collaborative et super satisfaisante à cocher.\n\nLien en bio pour tester sur votre prochain dîner ! 👇\n\n#GroceryList #Productivity #Organization #Nawel`,
      },
    ],
  };

  const strategyB = {
    title: "Stratégie B : L'Émotion (Lifestyle/Story)",
    description:
      "Focus sur l'art de recevoir, la sérénité et la beauté du moment. Ton : Inspirant, Calme, Élégant, 'Slow Hosting'.",
    posts: [
      {
        id: "post1_b",
        title: "J-7 : L'Inspiration",
        format: "Reel (Moodboard vibe)",
        image: "/story_inspiration.png",
        caption: `✨ Tout commence par une invitation.\n\nOubliez les groupes WhatsApp qui s'enterrent. Envoyez quelque chose de beau.\n\nAvec le thème Aurora, donnez tout de suite le ton de votre soirée. Parce qu'on mange aussi avec les yeux.\n\nRecevez avec élégance. Recevez avec Nawel.\n\n#ArtDeRecevoir #DinnerParty #Inspiration #SlowHosting`,
      },
      {
        id: "post2_b",
        title: "J-5 : L'Engouement",
        format: "Static Post",
        image: "/story_guests.png",
        caption: `🫶 Les amis, c'est la vie.\n\nOrganiser un repas, c'est construire des souvenirs. Ne laissez pas la logistique gâcher le plaisir.\n\nInvitez simplement. Laissez-les choisir ce qu'ils apportent. Profitez de l'excitation qui monte avant le jour J.\n\n#Friendship #Gathering #Hosting #Memories`,
      },
      {
        id: "post3_b",
        title: "J-1 : La Sérénité",
        format: "Photo (Minimalist)",
        image: "/story_shopping.png",
        caption: `🌿 L'esprit libre.\n\nTout est prêt. La liste est faite. Les rôles sont répartis. \n\nIl ne reste plus qu'à cuisiner (ou commander) et dresser la table. Quand l'organisation est fluide, l'hôte est détendu.\n\nEt un hôte détendu, c'est une soirée réussie.\n\n#Mindfulness #Organization #PeaceOfMind #Nawel`,
      },
      {
        id: "post4_b",
        title: "Le Jour J",
        format: "Reel (Atmosphere)",
        image: "/story_hero.png",
        caption: `🍷 Bon appétit.\n\nPosez le téléphone. Profitez de vos amis. \n\nNawel a géré le chaos pour que vous puissiez savourer le moment.\n\nCréez votre prochain événement maintenant (lien en bio).\n\n#DinnerTime #Cheers #GoodVibes #NawelApp`,
      },
    ],
  };

  const activeStrategy = activeTab === "strategyA" ? strategyA : strategyB;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12 font-sans text-gray-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 text-center">
          <Instagram className="mx-auto mb-4 h-12 w-12 text-pink-600" />
          <h1 className="mb-4 text-4xl font-bold text-gray-900">Kit Marketing Instagram</h1>
          <p className="mx-auto max-w-2xl text-lg text-gray-600">
            Vos plans de communication prêts à l'emploi. Textes, hashtags et visuels pour vos
            campagnes.
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-12 flex justify-center">
          <div className="inline-flex rounded-full border border-gray-200 bg-white p-1 shadow-sm">
            <button
              onClick={() => setActiveTab("strategyA")}
              className={cn(
                "rounded-full px-6 py-2 text-sm font-medium transition-all",
                activeTab === "strategyA"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-gray-600 hover:bg-gray-50"
              )}
            >
              Stratégie A : Tech & Efficacité
            </button>
            <button
              onClick={() => setActiveTab("strategyB")}
              className={cn(
                "rounded-full px-6 py-2 text-sm font-medium transition-all",
                activeTab === "strategyB"
                  ? "bg-purple-600 text-white shadow-md"
                  : "text-gray-600 hover:bg-gray-50"
              )}
            >
              Stratégie B : Lifestyle & Émotion
            </button>
          </div>
        </div>

        {/* Strategy Header */}
        <div className="mb-8 rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
          <h2 className="mb-2 text-2xl font-bold">{activeStrategy.title}</h2>
          <p className="text-gray-600">{activeStrategy.description}</p>
        </div>

        {/* Posts Grid */}
        <div className="grid gap-12">
          {activeStrategy.posts.map((post) => (
            <div
              key={post.id}
              className="flex flex-col overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-lg md:flex-row"
            >
              {/* Image Preview (Phone ratio-ish) */}
              <div className="relative min-h-[400px] border-r border-gray-100 bg-gray-100 md:w-1/3">
                <Image src={post.image} alt={post.title} fill className="object-cover" />
                <div className="absolute left-4 top-4 rounded-full bg-black/50 px-3 py-1 text-xs font-bold text-white backdrop-blur-md">
                  {post.format}
                </div>
              </div>

              {/* Content */}
              <div className="flex flex-col p-8 md:w-2/3">
                <div className="mb-6 flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900">{post.title}</h3>
                  <a
                    href={post.image}
                    download
                    className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900"
                  >
                    <Download className="h-4 w-4" />
                    Télécharger l'image
                  </a>
                </div>

                <div className="group relative mb-4 flex-grow rounded-xl border border-gray-100 bg-gray-50 p-6">
                  <div className="absolute right-4 top-4 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={() => copyToClipboard(post.caption, post.id)}
                      className="rounded-lg border border-gray-200 bg-white p-2 text-gray-600 shadow-sm transition-colors hover:bg-gray-50"
                      title="Copier la légende"
                    >
                      {copiedId === post.id ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <p className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-gray-700">
                    {post.caption}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Hash className="h-3 w-3" />
                  <span>N'oublie pas d'ajouter le lien en bio !</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
