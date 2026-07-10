import { useCallback, useEffect, useRef, useState } from 'react';
import { getFile, listCategories, listFiles, searchFiles } from './api';
import FileList from './components/FileList';
import FileViewer from './components/FileViewer';
import GitHubImport from './components/GitHubImport';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import { fetchMarkdownFromGitHub } from './github';
import { validateMarkdown, type ValidationResult } from './validation';
import type { CategoryInfo, FileEntry, FileSummary } from './types';
import './App.css';

export default function App() {
  const [files, setFiles] = useState<FileSummary[]>([]);
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileEntry | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingContent, setLoadingContent] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Load categories on mount
  useEffect(() => {
    listCategories()
      .then(setCategories)
      .catch(() => {
        // Categories are optional; fall back to empty
      });
  }, []);

  // Load files based on category and search
  const loadFiles = useCallback(
    async (category: string | null, search: string) => {
      setLoading(true);
      setError(null);
      try {
        let result: FileSummary[];
        if (search.trim()) {
          result = await searchFiles({
            query: search,
            category: category ?? undefined,
          });
        } else {
          result = await listFiles(category ?? undefined);
        }
        setFiles(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load files');
        setFiles([]);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      loadFiles(selectedCategory, searchQuery);
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [selectedCategory, searchQuery, loadFiles]);

  // Load file content when selected
  const handleSelectFile = useCallback(async (id: string) => {
    setSelectedId(id);
    setLoadingContent(true);
    try {
      const file = await getFile(id);
      setSelectedFile(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load file');
    } finally {
      setLoadingContent(false);
    }
  }, []);

  const handleSelectCategory = useCallback((category: string | null) => {
    setSelectedCategory(category);
    setSelectedId(null);
    setSelectedFile(null);
  }, []);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setSelectedId(null);
    setSelectedFile(null);
  }, []);

  const handleImport = useCallback(async (githubUrl: string, filePath: string) => {
    setImporting(true);
    setError(null);
    setValidationResult(null);

    try {
      const content = await fetchMarkdownFromGitHub(githubUrl, filePath);
      const validation = validateMarkdown(content);
      setValidationResult(validation);

      if (validation.valid) {
        // Create a temporary file entry to display the imported content
        const tempFile: FileEntry = {
          id: 'imported-temp',
          path: filePath,
          title: 'Imported from GitHub',
          category: 'imported',
          tags: [],
          content,
          version: '1.0.0',
          last_updated: new Date().toISOString().split('T')[0],
        };
        setSelectedFile(tempFile);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import file');
    } finally {
      setImporting(false);
    }
  }, []);

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-slate-200 overflow-hidden">
      <Header
        onSearch={handleSearch}
        searchQuery={searchQuery}
        totalFiles={files.length}
      />

      <div className="flex-1 flex min-h-0">
        <Sidebar
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={handleSelectCategory}
        />

        {/* File List Panel */}
        <div className="w-96 shrink-0 flex flex-col border-r border-slate-800/50 bg-slate-950/20">
          {/* Panel Header */}
          <div className="px-6 py-3 border-b border-slate-800/30">
            <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider">
              {searchQuery ? 'Search Results' : selectedCategory || 'All Files'}
            </h2>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mx-4 mt-3 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          {/* Validation Results */}
          {validationResult && (
            <div className="mx-4 mt-3 px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg">
              <p className="text-xs font-medium mb-2">
                {validationResult.valid ? (
                  <span className="text-green-400">✓ Valid format</span>
                ) : (
                  <span className="text-red-400">✗ Invalid format</span>
                )}
              </p>
              {validationResult.errors.length > 0 && (
                <ul className="text-xs text-red-400 list-disc list-inside space-y-1">
                  {validationResult.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              )}
              {validationResult.warnings.length > 0 && (
                <ul className="text-xs text-yellow-400 list-disc list-inside space-y-1 mt-2">
                  {validationResult.warnings.map((warn, i) => (
                    <li key={i}>{warn}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* GitHub Import */}
          <div className="mx-4 mt-3">
            <GitHubImport onImport={handleImport} loading={importing} />
          </div>

          <FileList
            files={files}
            selectedId={selectedId}
            onSelectFile={handleSelectFile}
            loading={loading}
          />
        </div>

        {/* File Viewer Panel */}
        <div className="flex-1 flex flex-col min-w-0">
          <FileViewer file={selectedFile} loading={loadingContent} />
        </div>
      </div>
    </div>
  );
}
