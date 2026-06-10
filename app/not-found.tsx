import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-3 p-6 text-center">
      <p className="text-5xl font-bold text-zinc-200">404</p>
      <h2 className="text-base font-semibold text-zinc-900">Page not found</h2>
      <p className="text-sm text-zinc-500 max-w-xs">
        The page you&apos;re looking for doesn&apos;t exist or may have been moved.
      </p>
      <Button asChild variant="outline" size="sm" className="mt-2 gap-1.5">
        <Link href="/prospects">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to prospects
        </Link>
      </Button>
    </div>
  );
}
