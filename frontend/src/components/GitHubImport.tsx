import { useState } from 'react';

interface GitHubImportProps {
  onImport: (url: string, path: string) => Promise<void>;
  loading: boolean;
}

export default function GitHubImport({ onImport, loading }: GitHubImportProps) {
  const [githubUrl, setGithubUrl] = useState('');
  const [filePath, setFilePath] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!githubUrl.trim()) {
      setError('GitHub URL is required');
      return;
    }

    if (!filePath.trim()) {
      setError('File path is required');
      return;
    }

    try {
      await onImport(githubUrl.trim(), filePath.trim());
      setGithubUrl('');
      setFilePath('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import file');
    }
  };

  return (
    <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-4">
      <h3 className="text-sm font-medium text-slate-300 mb-3">Import from GitHub</h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="github-url" className="block text-xs text-slate-400 mb-1">
            GitHub Repository URL
          </label>
          <input
            id="github-url"
            type="text"
            value={githubUrl}
            onChange={(e) => setGithubUrl(e.target.value)}
            placeholder="https://github.com/owner/repo"
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
            disabled={loading}
          />
        </div>
        <div>
          <label htmlFor="file-path" className="block text-xs text-slate-400 mb-1">
            Markdown File Path
          </label>
          <input
            id="file-path"
            type="text"
            value={filePath}
            onChange={(e) => setFilePath(e.target.value)}
            placeholder="docs/example.md"
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
            disabled={loading}
          />
        </div>
        {error && (
          <p className="text-xs text-red-400">{error}</p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-md transition-colors"
        >
          {loading ? 'Importing...' : 'Import & Validate'}
        </button>
      </form>
    </div>
  );
}
