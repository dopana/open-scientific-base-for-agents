import { CATEGORY_MAP, formatDate } from '../config';
import type { FileSummary } from '../types';

interface FileListProps {
  files: FileSummary[];
  selectedId: string | null;
  onSelectFile: (id: string) => void;
  loading: boolean;
}

export default function FileList({
  files,
  selectedId,
  onSelectFile,
  loading,
}: FileListProps) {
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-400 rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Loading files...</p>
        </div>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-slate-300 font-medium">No files found</p>
          <p className="text-sm text-slate-500 mt-1">
            Try a different search term or category filter.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="divide-y divide-slate-800/30">
        {files.map((file) => {
          const cat = CATEGORY_MAP.get(file.category);
          const isSelected = selectedId === file.id;

          return (
            <button
              key={file.id}
              type="button"
              onClick={() => onSelectFile(file.id)}
              className={`w-full text-left px-6 py-4 transition-all duration-200 hover:bg-slate-800/30 ${
                isSelected
                  ? 'bg-indigo-500/5 border-l-2 border-indigo-400'
                  : 'border-l-2 border-transparent'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h3
                    className={`font-medium truncate ${
                      isSelected ? 'text-indigo-300' : 'text-slate-200'
                    }`}
                  >
                    {file.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-1.5">
                    {cat && (
                      <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                        <span>{cat.icon}</span>
                        <span>{cat.label}</span>
                      </span>
                    )}
                    <span className="text-xs text-slate-600">·</span>
                    <span className="text-xs text-slate-500">
                      v{file.version}
                    </span>
                    <span className="text-xs text-slate-600">·</span>
                    <span className="text-xs text-slate-500">
                      {formatDate(file.last_updated)}
                    </span>
                  </div>
                  {/* Tags */}
                  {file.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {file.tags.slice(0, 4).map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium text-slate-400 bg-slate-800/60 rounded-full border border-slate-700/40"
                        >
                          {tag}
                        </span>
                      ))}
                      {file.tags.length > 4 && (
                        <span className="text-[10px] text-slate-500 self-center">
                          +{file.tags.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <span className="shrink-0 text-slate-600 mt-1">
                  <svg
                    className={`w-4 h-4 transition-transform duration-200 ${
                      isSelected ? 'translate-x-0.5 text-indigo-400' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    role="img"
                    aria-label="Open file"
                  >
                    <title>Open file</title>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
