"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Video, Layers, Copy, Check } from "lucide-react";
import { useState } from "react";

export function MarketingInstagramPosts() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-900">
      <div className="border-b pb-4 border-dashed border-gray-200">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-pink-100 text-pink-700 text-sm font-bold">
            Bonus
          </span>
          5 Scripts Instagram Prêts à Poster
        </h2>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <InstaPost
          type="Reel"
          title="POV: Le chaos du Potluck"
          pillar="Humour / Viralité"
          hook="POV : T'es le seul à avoir ramené un plat fait maison..."
          script={`VISUEL:
Toi arrivant tout fier avec tes lasagnes.
Plan suivant : La table remplie uniquement de paquets de chips et de bouteilles de soda.
Toi : Regard désespéré caméra.

TEXTE ÉCRAN:
"Quand tu n'as pas utilisé CoList pour organiser."

AUDIO:
Music drôle / Trend "Oh no no no"

CAPTION:
On a tous connu ça. 😅
3 quiches, 12 paquets de chips, 0 boisson.
Arrêtez le massacre. Organisez qui amène quoi avec CoList.
Lien en bio pour sauver votre prochain dîner ! 🍝
#potluck #fail #repasentreamis #colist`}
        />

        <InstaPost
          type="Reel"
          title="Tuto: Dîner pour 12 en 30s"
          pillar="Product Education"
          hook="Organiser une raclette pour 12 personnes ? Challenge accepté."
          script={`VISUEL:
Split screen. 
Haut : Chronomètre.
Bas : Screen recording de l'app.

1. (0s-5s) Click "Créer événement" -> "Raclette Party"
2. (5s-15s) Ajout plat "Raclette". L'IA génère TOUT (fromage, charcut, patates) pour 12 pers.
3. (15s-20s) Partage du Magic Link sur WhatsApp.
4. (20s-30s) Les invités rejoignent et valident ce qu'ils amènent.

AUDIO:
Voix off rapide et dynamique + Beat lo-fi.

CAPTION:
Moins de temps à organiser, plus de temps à manger du fromage. 🧀
L'IA CoList calcule les quantités pour vous. C'est magique, c'est gratuit.
Essayez maintenant !
#raclette #organisation #hack #app`}
        />

        <InstaPost
          type="Carousel"
          title="Vacances : Les Red Flags"
          pillar="Valeur / Tips"
          hook="5 signes que l'orga de vos vacances va être un enfer."
          script={`SLIDE 1:
Titre : 5 signes que vos vacances entre potes vont mal finir 🚩

SLIDE 2:
🚩 Le groupe WhatsApp s'appelle "Vacances 2026" et il y a déjà 450 messages non lus sur le menu.

SLIDE 3:
🚩 Quelqu'un a dit "Tkt on verra sur place pour les courses" (Spoiler: vous allez manger des pâtes 7j/7).

SLIDE 4:
🚩 Vous avez acheté tout en double parce que personne ne savait ce qu'il y avait dans le frigo.

SLIDE 5:
🚩 Le fichier Excel de compte fait 12 onglets et personne ne le remplit.

SLIDE 6:
La solution ? CoList.
✅ Menus partagés
✅ Liste de courses auto
✅ Zéro compte requis

CAPTION:
Identifie le pote qui dit toujours "on verra sur place" 👇
Ne laissez pas l'intendance gâcher les vacances.
#vacances #potes #organisation #voyage`}
        />

        <InstaPost
          type="Reel"
          title="La Charge Mentale"
          pillar="Empathie / Pain Point"
          hook="Ce que 'je gère les courses' veut vraiment dire..."
          script={`VISUEL:
Plan séquence rapide (Fast cuts).
1. Ouvrir le frigo vide. S'énerver.
2. Faire une liste sur un papier.
3. Se rendre compte qu'on a oublié si y'a du beurre.
4. SMS au conjoint "Tu peux regarder si..."
5. Au supermarché, rayon bondé.
6. Retour maison, on a oublié le sel.

TEXTE ÉCRAN:
"STOP."

Cut sur l'app CoList :
Tout est là. Trié par rayon. Coché en temps réel.

AUDIO:
Son stressant (bruit ville, horloge) -> Silence apaisant quand on passe sur l'app.

CAPTION:
La charge mentale des courses, c'est fini.
Libérez-vous l'esprit. 🧘‍♀️
#chargementale #stress #courses #colist`}
        />

        <InstaPost
          type="Carousel"
          title="Checklist Brunch"
          pillar="Inspiration"
          hook="La checklist ultime pour un Brunch sans faute."
          script={`SLIDE 1:
La Checklist Brunch Parfait 🥞
(Save ce post pour dimanche !)

SLIDE 2:
Le Salé 🥓
- Oeufs (compter 2/pers)
- Bacon / Saumon (l'option végé !)
- Avocats (beaucoup)
- Fromage frais

SLIDE 3:
Le Sucré 🍓
- Pancakes (la base)
- Sirop d'érable
- Fruits ROUGES (pour la couleur)

SLIDE 4:
Les Boissons ☕️
- Jus d'orange (pressé, svp)
- Café (en quantité industrielle)
- Mimosas (si c'est festif 🥂)

SLIDE 5:
L'astuce Pro :
Ne faites pas tout seul !
Créez une liste "Brunch Dimanche" sur CoList et envoyez le lien.
Chacun ramène un truc.

CAPTION:
Team Salé ou Team Sucré ? 🥓🍓
Organisez votre prochain brunch en 2 clics avec CoList.
#brunch #dimanche #foodie #recette`}
        />
      </div>
    </div>
  );
}

function InstaPost({
  type,
  title,
  pillar,
  hook,
  script,
}: {
  type: string;
  title: string;
  pillar: string;
  hook: string;
  script: string;
}) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    const text = `titre: ${title}\nTYPE: ${type}\nHOOK: ${hook}\n\n${script}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-3 space-y-2">
        <div className="flex justify-between items-start">
          <Badge variant={type === "Reel" ? "default" : "secondary"} className="mb-2">
            {type === "Reel" ? (
              <Video className="w-3 h-3 mr-1" />
            ) : (
              <Layers className="w-3 h-3 mr-1" />
            )}
            {type}
          </Badge>
          <Badge variant="outline" className="text-xs text-muted-foreground font-normal">
            {pillar}
          </Badge>
        </div>
        <CardTitle className="text-lg leading-tight">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col space-y-4">
        <div>
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Hook
          </span>
          <p className="text-sm font-medium mt-1 text-primary">{hook}</p>
        </div>
        <div className="bg-muted/30 p-3 rounded-md border text-xs font-mono whitespace-pre-wrap flex-1 max-h-[200px] overflow-y-auto">
          {script}
        </div>
        <button
          onClick={copyToClipboard}
          className="w-full mt-auto flex items-center justify-center gap-2 text-xs font-medium py-2 rounded-md border hover:bg-muted transition-colors"
        >
          {copied ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
          {copied ? "Copié !" : "Copier le script"}
        </button>
      </CardContent>
    </Card>
  );
}
