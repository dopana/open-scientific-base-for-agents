import { CATEGORIES } from '../config';
import type { CategoryInfo } from '../types';

interface SidebarProps {
  categories: CategoryInfo[];
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
}

export default function Sidebar({
  categories,
  selectedCategory,
  onSelectCategory,
}: SidebarProps) {
  const categoryCountMap = new Map(categories.map((c) => [c.name, c.count]));
  const totalFiles = categories.reduce((sum, c) => sum + c.count, 0);

  return (
    <aside className="w-64 shrink-0 border-r border-slate-800/50 bg-slate-950/30 backdrop-blur-sm">
      <nav className="p-4 space-y-1">
        {/* All Files */}
        <button
          type="button"
          onClick={() => onSelectCategory(null)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
            selectedCategory === null
              ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
          }`}
        >
          <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-slate-800/60 text-sm">
            📚
          </span>
          <span className="flex-1 text-left">All Files</span>
          <span className="text-xs text-slate-500 tabular-nums font-mono">
            {totalFiles}
          </span>
        </button>

        <div className="h-px bg-slate-800/50 my-3" />

        {/* Category Filters */}
        {CATEGORIES.map((cat) => {
          const count = categoryCountMap.get(cat.key) ?? 0;
          const isActive = selectedCategory === cat.key;

          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => onSelectCategory(cat.key)}
              disabled={count === 0}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-slate-800/60 text-slate-200 border border-slate-700/50 shadow-sm'
                  : count > 0
                    ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
                    : 'text-slate-600 cursor-not-allowed border border-transparent'
              }`}
            >
              <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-slate-800/60 text-sm">
                {cat.icon}
              </span>
              <span className="flex-1 text-left truncate">{cat.label}</span>
              <span className="text-xs text-slate-500 tabular-nums font-mono">
                {count}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-800/50">
        <div className="flex items-center gap-2 px-3 py-2 text-xs text-slate-500">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500/70 animate-pulse" />
          API connected
        </div>
      </div>
    </aside>
  );
}
