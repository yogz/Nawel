export default function Loading() {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-gray-50">
            <div className="flex flex-col items-center gap-4">
                <div className="relative h-16 w-16">
                    <div className="absolute inset-0 animate-ping rounded-full bg-red-200 opacity-75"></div>
                    <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-3xl">
                        🎄
                    </div>
                </div>
                <p className="animate-pulse text-sm font-medium text-gray-500">Chargement de Noël...</p>
            </div>
        </div>
    );
}
