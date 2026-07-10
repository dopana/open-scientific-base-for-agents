interface GitHubFileResponse {
  content: string;
  encoding: string;
  name: string;
  path: string;
  sha: string;
  size: number;
  type: string;
}

export interface ParsedGitHubUrl {
  owner: string;
  repo: string;
  branch?: string;
}

/**
 * Parse a GitHub repository URL to extract owner and repo
 * Supports formats:
 * - https://github.com/owner/repo
 * - https://github.com/owner/repo.git
 * - git@github.com:owner/repo.git
 */
export function parseGitHubUrl(url: string): ParsedGitHubUrl {
  const httpsRegex = /https?:\/\/github\.com\/([^\/]+)\/([^\/\.]+)/;
  const sshRegex = /git@github\.com:([^\/]+)\/([^\/\.]+)/;

  let match = url.match(httpsRegex);
  if (!match) {
    match = url.match(sshRegex);
  }

  if (!match) {
    throw new Error('Invalid GitHub URL format');
  }

  return {
    owner: match[1],
    repo: match[2],
  };
}

/**
 * Fetch a markdown file from GitHub using the GitHub API
 * Uses the public API (no auth required for public repos)
 */
export async function fetchGitHubFile(
  owner: string,
  repo: string,
  path: string,
  branch: string = 'main'
): Promise<string> {
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;

  const response = await fetch(apiUrl, {
    headers: {
      Accept: 'application/vnd.github.v3+json',
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`File not found: ${path} in ${owner}/${repo}`);
    }
    if (response.status === 403) {
      throw new Error('API rate limit exceeded. Please try again later.');
    }
    throw new Error(`GitHub API error: ${response.statusText}`);
  }

  const data: GitHubFileResponse = await response.json();

  if (data.type !== 'file') {
    throw new Error(`Path is not a file: ${path}`);
  }

  if (data.encoding !== 'base64') {
    throw new Error(`Unsupported encoding: ${data.encoding}`);
  }

  // Decode base64 content
  const content = atob(data.content);
  return content;
}

/**
 * Fetch a markdown file from a GitHub URL and path
 */
export async function fetchMarkdownFromGitHub(
  githubUrl: string,
  filePath: string
): Promise<string> {
  const { owner, repo } = parseGitHubUrl(githubUrl);
  return fetchGitHubFile(owner, repo, filePath);
}
