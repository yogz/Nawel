"use client";

import { useEffect } from "react";
import { isDatabaseError } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { ShieldAlert, RefreshCcw, Home } from "lucide-react";
import Link from "next/link";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const isDbError = isDatabaseError(error);

    useEffect(() => {
        // Log the error to an error reporting service if needed
        console.error("Application Error:", error);
    }, [error]);

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-surface p-4 text-center">
            <div className="max-w-md space-y-6">
                <div className="flex justify-center">
                    <div className="rounded-full bg-amber-100 p-6 text-amber-600">
                        <ShieldAlert size={48} />
                    </div>
                </div>

                <div className="space-y-2">
                    <h1 className="text-2xl font-black tracking-tight text-text sm:text-3xl">
                        {isDbError ? "Oups ! Connexion impossible" : "Quelque chose s'est mal passé"}
                    </h1>
                    <p className="text-gray-500">
                        {isDbError
                            ? "Désolé, nous ne parvenons pas à contacter notre base de données. Cela peut être dû à un problème de connexion internet ou à une maintenance temporaire."
                            : "Une erreur inattendue est survenue. Nos lutins travaillent déjà à la résolution du problème !"}
                    </p>
                </div>

                {isDbError && (
                    <div className="rounded-2xl bg-gray-50 p-4 border border-gray-100 text-left text-sm text-gray-600">
                        <p className="font-bold mb-1">Actions suggérées :</p>
                        <ul className="list-disc list-inside space-y-1">
                            <li>Vérifiez votre connexion internet.</li>
                            <li>Vérifiez si l'adresse de la base de données est accessible.</li>
                            <li>Réessayez dans quelques instants.</li>
                        </ul>
                    </div>
                )}

                <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                    <Button
                        onClick={() => reset()}
                        className="flex items-center gap-2 px-8"
                    >
                        <RefreshCcw size={18} />
                        Réessayer
                    </Button>
                    <Link href="/">
                        <Button variant="outline" className="flex w-full items-center gap-2 px-8">
                            <Home size={18} />
                            Retour à l'accueil
                        </Button>
                    </Link>
                </div>

                <p className="text-[10px] text-gray-400 font-mono italic">
                    Error ID: {error.digest || "N/A"}
                </p>
            </div>
        </div>
    );
}
