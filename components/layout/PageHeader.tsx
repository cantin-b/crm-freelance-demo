import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: React.ReactNode;
  /** Right-aligned actions (buttons, etc.) */
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Shared page header — consistent title / subtitle / actions row across
 * every top-level page. Keeps typography and spacing uniform.
 */
export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4",
        className
      )}
    >
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-950 md:text-2xl">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-zinc-500 mt-1.5">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
