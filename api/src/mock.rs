// ============================================================
// Mock Data Store: In-memory file storage for development/testing
// Replace with Cloudflare D1 bindings for production deployment
// ============================================================

use std::path::PathBuf;
use std::sync::RwLock;
use crate::frontmatter;
use crate::models::*;
use chrono::Utc;

/// Thread-safe in-memory data store
/// Mimics the D1 database interface for local development
pub struct DataStore {
    files: RwLock<Vec<FileEntry>>,
}

impl DataStore {
    pub fn new() -> Self {
        // Try loading from data directory first, fall back to embedded mock data
        let files = Self::load_from_disk().unwrap_or_else(|_| {
            tracing::warn!("Could not load files from data/ directory, using embedded mock data");
            load_mock_data()
        });
        DataStore {
            files: RwLock::new(files),
        }
    }

    /// Load files from the `data/` directory using the YAML frontmatter parser.
    /// This is the production path — reads real markdown files from disk.
    pub fn load_from_disk() -> Result<Vec<FileEntry>, String> {
        let data_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .parent()
            .ok_or("Cannot find project root")?
            .join("data");

        let parsed = frontmatter::discover_files(&data_dir)
            .map_err(|e| format!("Failed to load data directory: {}", e))?;

        Ok(parsed
            .into_iter()
            .map(|pf| {
                // Use relative path from the project root for API responses
                let relative_path = pf
                    .path
                    .strip_prefix(
                        &PathBuf::from(env!("CARGO_MANIFEST_DIR"))
                            .parent()
                            .unwrap(),
                    )
                    .unwrap_or(&pf.path)
                    .to_string_lossy()
                    .to_string();

                FileEntry {
                    id: pf.frontmatter.id,
                    path: relative_path,
                    title: pf.frontmatter.title,
                    category: pf.frontmatter.category,
                    tags: pf.frontmatter.tags,
                    content: pf.raw,
                    version: pf.frontmatter.version,
                    last_updated: pf.frontmatter.last_updated,
                }
            })
            .collect())
    }

    /// List all files, optionally filtered by category
    pub fn list(&self, category: Option<&str>) -> Vec<FileSummary> {
        let files = self.files.read().expect("lock poisoned");
        files
            .iter()
            .filter(|f| {
                category
                    .map(|c| f.category == c)
                    .unwrap_or(true)
            })
            .cloned()
            .map(FileSummary::from)
            .collect()
    }

    /// List unique categories with file counts
    pub fn categories(&self) -> Vec<CategoryInfo> {
        let files = self.files.read().expect("lock poisoned");
        let mut counts: std::collections::HashMap<String, usize> =
            std::collections::HashMap::new();
        for file in files.iter() {
            *counts.entry(file.category.clone()).or_insert(0) += 1;
        }
        let mut result: Vec<CategoryInfo> = counts
            .into_iter()
            .map(|(name, count)| CategoryInfo { name, count })
            .collect();
        result.sort_by(|a, b| a.name.cmp(&b.name));
        result
    }

    /// Full-text search across file titles and content
    pub fn search(&self, query: &str, category: Option<&str>) -> Vec<FileSummary> {
        let files = self.files.read().expect("lock poisoned");
        let query_lower = query.to_lowercase();
        let terms: Vec<&str> = query_lower.split_whitespace().collect();

        files
            .iter()
            .filter(|f| {
                // Apply category filter if specified
                if let Some(cat) = category {
                    if f.category != cat {
                        return false;
                    }
                }

                // Simple term matching (will be replaced by D1 FTS5 in production)
                let title_lower = f.title.to_lowercase();
                let content_lower = f.content.to_lowercase();
                let tags_lower: String = f.tags.join(" ").to_lowercase();

                terms.iter().all(|term| {
                    title_lower.contains(term)
                        || content_lower.contains(term)
                        || tags_lower.contains(term)
                })
            })
            .cloned()
            .map(FileSummary::from)
            .collect()
    }

    /// Get a single file by ID
    pub fn get(&self, id: &str) -> Option<FileEntry> {
        let files = self.files.read().expect("lock poisoned");
        files.iter().find(|f| f.id == id).cloned()
    }

    /// Update file metadata and/or content
    pub fn update(&self, req: UpdateRequest) -> Result<FileEntry, String> {
        let mut files = self.files.write().expect("lock poisoned");
        let file = files
            .iter_mut()
            .find(|f| f.id == req.id)
            .ok_or_else(|| format!("File '{}' not found", req.id))?;

        if let Some(title) = req.title {
            file.title = title;
        }
        if let Some(content) = req.content {
            file.content = content;
        }
        if let Some(tags) = req.tags {
            file.tags = tags;
        }

        file.last_updated = Utc::now().format("%Y-%m-%d").to_string();
        file.version = increment_version(&file.version);

        Ok(file.clone())
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct CategoryInfo {
    pub name: String,
    pub count: usize,
}

fn increment_version(version: &str) -> String {
    let parts: Vec<&str> = version.split('.').collect();
    if parts.len() == 3 {
        let patch: u32 = parts[2].parse().unwrap_or(0);
        format!("{}.{}.{}", parts[0], parts[1], patch + 1)
    } else {
        "1.0.1".to_string()
    }
}

/// Load embedded mock data from the data/ directory
fn load_mock_data() -> Vec<FileEntry> {
    vec![
        FileEntry {
            id: "phys-001".into(),
            path: "data/physics/quantum-mechanics.md".into(),
            title: "Introduction to Quantum Mechanics".into(),
            category: "physics".into(),
            tags: vec![
                "quantum".into(),
                "mechanics".into(),
                "wave-function".into(),
                "schrödinger".into(),
            ],
            content: include_str!("../../data/physics/quantum-mechanics.md").into(),
            version: "1.1.0".into(),
            last_updated: "2026-07-11".into(),
        },
        FileEntry {
            id: "phys-002".into(),
            path: "data/physics/special-relativity.md".into(),
            title: "Special Relativity".into(),
            category: "physics".into(),
            tags: vec![
                "relativity".into(),
                "einstein".into(),
                "spacetime".into(),
                "lorentz".into(),
            ],
            content: include_str!("../../data/physics/special-relativity.md").into(),
            version: "1.0.0".into(),
            last_updated: "2026-07-10".into(),
        },
        FileEntry {
            id: "bio-001".into(),
            path: "data/biology/crispr-gene-editing.md".into(),
            title: "CRISPR-Cas9 Gene Editing".into(),
            category: "biology".into(),
            tags: vec![
                "crispr".into(),
                "gene-editing".into(),
                "biotechnology".into(),
                "dna".into(),
            ],
            content: include_str!("../../data/biology/crispr-gene-editing.md").into(),
            version: "1.2.0".into(),
            last_updated: "2026-07-09".into(),
        },
        FileEntry {
            id: "bio-002".into(),
            path: "data/biology/evolutionary-biology.md".into(),
            title: "Principles of Evolutionary Biology".into(),
            category: "biology".into(),
            tags: vec![
                "evolution".into(),
                "natural-selection".into(),
                "darwin".into(),
                "genetics".into(),
            ],
            content: include_str!("../../data/biology/evolutionary-biology.md").into(),
            version: "1.0.0".into(),
            last_updated: "2026-07-08".into(),
        },
        FileEntry {
            id: "cs-001".into(),
            path: "data/computer-science/transformer-architecture.md".into(),
            title: "Transformer Neural Network Architecture".into(),
            category: "computer-science".into(),
            tags: vec![
                "deep-learning".into(),
                "transformer".into(),
                "attention".into(),
                "nlp".into(),
            ],
            content: include_str!("../../data/computer-science/transformer-architecture.md")
                .into(),
            version: "2.0.0".into(),
            last_updated: "2026-07-11".into(),
        },
        FileEntry {
            id: "cs-002".into(),
            path: "data/computer-science/quantum-algorithms.md".into(),
            title: "Quantum Algorithms: Shor and Grover".into(),
            category: "computer-science".into(),
            tags: vec![
                "quantum-computing".into(),
                "algorithms".into(),
                "shor".into(),
                "grover".into(),
            ],
            content: include_str!("../../data/computer-science/quantum-algorithms.md").into(),
            version: "1.0.0".into(),
            last_updated: "2026-07-07".into(),
        },
        FileEntry {
            id: "chem-001".into(),
            path: "data/chemistry/organic-chemistry-basics.md".into(),
            title: "Fundamentals of Organic Chemistry".into(),
            category: "chemistry".into(),
            tags: vec![
                "organic-chemistry".into(),
                "carbon".into(),
                "bonds".into(),
                "functional-groups".into(),
            ],
            content: include_str!("../../data/chemistry/organic-chemistry-basics.md").into(),
            version: "1.1.0".into(),
            last_updated: "2026-07-06".into(),
        },
        FileEntry {
            id: "math-001".into(),
            path: "data/mathematics/linear-algebra-foundations.md".into(),
            title: "Linear Algebra Foundations".into(),
            category: "mathematics".into(),
            tags: vec![
                "linear-algebra".into(),
                "vectors".into(),
                "matrices".into(),
                "eigenvalues".into(),
            ],
            content: include_str!("../../data/mathematics/linear-algebra-foundations.md").into(),
            version: "1.0.0".into(),
            last_updated: "2026-07-05".into(),
        },
        FileEntry {
            id: "math-002".into(),
            path: "data/mathematics/statistical-methods.md".into(),
            title: "Statistical Methods for Research".into(),
            category: "mathematics".into(),
            tags: vec![
                "statistics".into(),
                "probability".into(),
                "hypothesis-testing".into(),
                "bayesian".into(),
            ],
            content: include_str!("../../data/mathematics/statistical-methods.md").into(),
            version: "1.0.0".into(),
            last_updated: "2026-07-04".into(),
        },
    ]
}
