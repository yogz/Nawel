"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  testModelsAction,
  AVAILABLE_FREE_MODELS,
  type ModelTestResult,
} from "@/app/actions/admin-actions";
import { getDefaultSystemPrompt, getDefaultUserPrompt } from "@/lib/openrouter";
import { Play, Loader2, CheckCircle, XCircle, Clock, ChefHat } from "lucide-react";
import clsx from "clsx";

export function ModelComparison() {
  const [dishName, setDishName] = useState("Boeuf bourguignon");
  const [guestCount, setGuestCount] = useState("4 personnes");
  const [systemPrompt, setSystemPrompt] = useState(getDefaultSystemPrompt("4 personnes"));
  const [userPrompt, setUserPrompt] = useState(getDefaultUserPrompt("Boeuf bourguignon"));
  const [selectedModels, setSelectedModels] = useState<string[]>([...AVAILABLE_FREE_MODELS]);
  const [results, setResults] = useState<ModelTestResult[]>([]);
  const [isPending, startTransition] = useTransition();

  const handleDishNameChange = (value: string) => {
    setDishName(value);
    setUserPrompt(getDefaultUserPrompt(value));
  };

  const handleGuestCountChange = (value: string) => {
    setGuestCount(value);
    setSystemPrompt(getDefaultSystemPrompt(value));
  };

  const toggleModel = (model: string) => {
    setSelectedModels((prev) =>
      prev.includes(model) ? prev.filter((m) => m !== model) : [...prev, model]
    );
  };

  const selectAllModels = () => setSelectedModels([...AVAILABLE_FREE_MODELS]);
  const deselectAllModels = () => setSelectedModels([]);

  const runComparison = () => {
    if (selectedModels.length === 0) return;

    startTransition(async () => {
      try {
        const testResults = await testModelsAction(selectedModels, systemPrompt, userPrompt);
        // Sort by response time
        setResults(testResults.sort((a, b) => a.responseTimeMs - b.responseTimeMs));
      } catch (error) {
        console.error("Test failed:", error);
      }
    });
  };

  const getModelShortName = (model: string) => {
    return model.replace(":free", "").split("/").pop() || model;
  };

  return (
    <div className="space-y-6">
      {/* Configuration */}
      <div className="rounded-2xl border border-white/20 bg-white/80 p-6 backdrop-blur-sm">
        <h2 className="mb-4 text-lg font-semibold text-text">Configuration du test</h2>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="dishName">Nom du plat</Label>
            <Input
              id="dishName"
              value={dishName}
              onChange={(e) => handleDishNameChange(e.target.value)}
              placeholder="Ex: Boeuf bourguignon"
            />
          </div>
          <div>
            <Label htmlFor="guestCount">Nombre de convives</Label>
            <Input
              id="guestCount"
              value={guestCount}
              onChange={(e) => handleGuestCountChange(e.target.value)}
              placeholder="Ex: 4 personnes"
            />
          </div>
        </div>

        <div className="mt-4">
          <Label htmlFor="systemPrompt">System Prompt</Label>
          <Textarea
            id="systemPrompt"
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={8}
            className="font-mono text-sm"
          />
        </div>

        <div className="mt-4">
          <Label htmlFor="userPrompt">User Prompt</Label>
          <Textarea
            id="userPrompt"
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            rows={2}
            className="font-mono text-sm"
          />
        </div>
      </div>

      {/* Model Selection */}
      <div className="rounded-2xl border border-white/20 bg-white/80 p-6 backdrop-blur-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text">
            Modèles à tester ({selectedModels.length}/{AVAILABLE_FREE_MODELS.length})
          </h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={selectAllModels}>
              Tous
            </Button>
            <Button variant="outline" size="sm" onClick={deselectAllModels}>
              Aucun
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {AVAILABLE_FREE_MODELS.map((model) => (
            <button
              key={model}
              onClick={() => toggleModel(model)}
              className={clsx(
                "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                selectedModels.includes(model)
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              {getModelShortName(model)}
            </button>
          ))}
        </div>

        <div className="mt-6">
          <Button onClick={runComparison} disabled={isPending || selectedModels.length === 0}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Test en cours...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Lancer le test ({selectedModels.length} modèles)
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="rounded-2xl border border-white/20 bg-white/80 p-6 backdrop-blur-sm">
          <h2 className="mb-4 text-lg font-semibold text-text">Résultats (triés par vitesse)</h2>

          <div className="space-y-4">
            {results.map((result, index) => (
              <div
                key={result.model}
                className={clsx(
                  "rounded-xl border p-4",
                  result.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-bold">
                      #{index + 1}
                    </span>
                    <div>
                      <h3 className="font-semibold text-text">{getModelShortName(result.model)}</h3>
                      <p className="text-xs text-muted-foreground">{result.model}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="font-mono font-semibold">
                        {(result.responseTimeMs / 1000).toFixed(2)}s
                      </span>
                    </div>
                    {result.success ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                  </div>
                </div>

                {result.error && (
                  <div className="mt-3 rounded-lg bg-red-100 p-3 text-sm text-red-700">
                    {result.error}
                  </div>
                )}

                {result.success && result.ingredients.length > 0 && (
                  <div className="mt-4">
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium text-text">
                      <ChefHat className="h-4 w-4" />
                      {result.ingredients.length} ingrédients
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {result.ingredients.map((ing, i) => (
                        <span key={i} className="rounded-full bg-white px-3 py-1 text-sm shadow-sm">
                          {ing.name} <span className="text-muted-foreground">({ing.quantity})</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {result.rawResponse && (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm text-muted-foreground hover:text-text">
                      Voir la réponse brute
                    </summary>
                    <pre className="mt-2 overflow-auto rounded-lg bg-gray-900 p-3 text-xs text-green-400">
                      {JSON.stringify(JSON.parse(result.rawResponse), null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="mt-6 rounded-xl bg-gray-100 p-4">
            <h3 className="mb-2 font-semibold text-text">Résumé</h3>
            <div className="grid gap-2 text-sm md:grid-cols-3">
              <div>
                <span className="text-muted-foreground">Succès:</span>{" "}
                <span className="font-semibold text-green-600">
                  {results.filter((r) => r.success).length}/{results.length}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Plus rapide:</span>{" "}
                <span className="font-semibold">
                  {getModelShortName(results[0]?.model || "")} (
                  {((results[0]?.responseTimeMs || 0) / 1000).toFixed(2)}s)
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Temps moyen:</span>{" "}
                <span className="font-semibold">
                  {(
                    results.reduce((sum, r) => sum + r.responseTimeMs, 0) /
                    results.length /
                    1000
                  ).toFixed(2)}
                  s
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
