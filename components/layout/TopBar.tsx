// Top bar — placeholder, will be implemented in layout step
export function TopBar({ title }: { title: string }) {
  return (
    <header className="h-12 border-b border-zinc-200 flex items-center px-6">
      <h1 className="text-sm font-semibold text-zinc-700">{title}</h1>
    </header>
  );
}
