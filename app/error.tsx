"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-3 p-6 text-center">
      <AlertTriangle className="w-8 h-8 text-red-300" />
      <h2 className="text-base font-semibold text-zinc-900">Something went wrong</h2>
      <p className="text-sm text-zinc-500 max-w-xs">
        An unexpected error occurred. You can try again or refresh the page.
      </p>
      {error.digest && (
        <p className="text-xs text-zinc-400 font-mono">digest: {error.digest}</p>
      )}
      <Button variant="outline" size="sm" onClick={reset} className="mt-2">
        Try again
      </Button>
    </div>
  );
}
