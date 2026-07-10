// ============================================================
// YAML Frontmatter Parser
// Validates and parses YAML frontmatter from Markdown files
// Used to validate Agent inputs before writes (Phase 2)
// ============================================================

use serde::{Deserialize, Serialize};
use std::path::Path;

/// The strict frontmatter schema that every knowledge file must follow.
///
/// Mirrors the YAML block between `---` delimiters at the top of each `.md` file.
/// Uses `deny_unknown_fields` to reject unexpected keys — any unknown YAML field
/// will cause a parse error, ensuring agent submissions are strictly validated.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Frontmatter {
    /// Unique identifier: `{category-short}-{number}` (e.g. `phys-001`)
    pub id: String,

    /// Human-readable title
    pub title: String,

    /// Scientific category (must match a known category)
    pub category: String,

    /// Relevant search tags
    pub tags: Vec<String>,

    /// ISO-8601 date string (YYYY-MM-DD)
    pub last_updated: String,

    /// Semantic version string (X.Y.Z)
    pub version: String,
}

/// The parsed result of a markdown file with frontmatter.
#[derive(Debug, Clone)]
pub struct ParsedFile {
    /// Parsed and validated frontmatter metadata
    pub frontmatter: Frontmatter,

    /// The raw markdown content after the frontmatter (body only)
    pub body: String,

    /// The full original file content (frontmatter + body)
    pub raw: String,

    /// Relative file path from the repository root
    pub path: String,
}

/// Parse and validate the YAML frontmatter from a markdown string.
///
/// Returns `(Frontmatter, body_content)` on success.
/// The markdown must start with `---` and have a closing `---`.
pub fn parse_frontmatter(content: &str) -> Result<(Frontmatter, &str), FrontmatterError> {
    let trimmed = content.trim_start();

    if !trimmed.starts_with("---") {
        return Err(FrontmatterError::MissingDelimiter);
    }

    // Find the closing `---` after the opening one
    let after_opening = &trimmed[3..];
    let close_pos = after_opening
        .find("\n---")
        .or_else(|| after_opening.find("\n---\r"))
        .ok_or(FrontmatterError::UnclosedDelimiter)?;

    let yaml_str = &after_opening[..close_pos];
    let body = after_opening[close_pos + 4..].trim_start();

    // Parse with strict validation — serde_yaml fails on unknown fields
    let frontmatter: Frontmatter = serde_yaml::from_str(yaml_str)
        .map_err(|e| FrontmatterError::ParseError(e.to_string()))?;

    // Validate the parsed frontmatter
    frontmatter.validate()?;

    Ok((frontmatter, body))
}

/// Parse a markdown file from disk and return the full parsed result.
/// Validates that the YAML `category` field matches the parent directory name.
pub fn parse_file(path: &Path) -> Result<ParsedFile, FrontmatterError> {
    let raw = std::fs::read_to_string(path)
        .map_err(|e| FrontmatterError::IoError(e.to_string()))?;

    let (frontmatter, body) = parse_frontmatter(&raw)?;

    // Derive the expected category from the parent directory name
    // e.g., `data/physics/quantum-mechanics.md` → category must be `physics`
    if let Some(parent_dir) = path.parent() {
        if let Some(dir_name) = parent_dir.file_name() {
            let expected_category = dir_name.to_string_lossy();
            if frontmatter.category != expected_category.as_ref() {
                return Err(FrontmatterError::ValidationError(format!(
                    "Category mismatch in '{}': frontmatter says '{}' but file is in the '{}' directory",
                    path.display(),
                    frontmatter.category,
                    expected_category
                )));
            }
        }
    }

    Ok(ParsedFile {
        frontmatter,
        body: body.to_string(),
        raw,
        path: path.to_string_lossy().to_string(),
    })
}

/// Recursively discover all markdown files in a directory.
pub fn discover_files(dir: &Path) -> Result<Vec<ParsedFile>, FrontmatterError> {
    let mut files = Vec::new();

    if !dir.exists() {
        return Err(FrontmatterError::IoError(format!(
            "Data directory not found: {}",
            dir.display()
        )));
    }

    visit_dirs(dir, &mut files)?;
    Ok(files)
}

fn visit_dirs(dir: &Path, files: &mut Vec<ParsedFile>) -> Result<(), FrontmatterError> {
    let entries = std::fs::read_dir(dir)
        .map_err(|e| FrontmatterError::IoError(e.to_string()))?;

    for entry in entries {
        let entry = entry.map_err(|e| FrontmatterError::IoError(e.to_string()))?;
        let path = entry.path();

        if path.is_dir() {
            visit_dirs(&path, files)?;
        } else if path.extension().map_or(false, |ext| ext == "md") {
            match parse_file(&path) {
                Ok(parsed) => files.push(parsed),
                Err(e) => {
                    eprintln!(
                        "⚠️  Skipping {}: {}",
                        path.display(),
                        e
                    );
                }
            }
        }
    }

    Ok(())
}

// ============================================================
// Error Type
// ============================================================

#[derive(Debug)]
pub enum FrontmatterError {
    /// File does not start with `---`
    MissingDelimiter,
    /// Opening `---` has no matching close
    UnclosedDelimiter,
    /// YAML parse failure (invalid syntax, wrong types, unknown fields)
    ParseError(String),
    /// Semantic validation failure (e.g., bad ID format)
    ValidationError(String),
    /// Filesystem I/O error
    IoError(String),
}

impl std::fmt::Display for FrontmatterError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            FrontmatterError::MissingDelimiter => {
                write!(f, "Missing opening `---` frontmatter delimiter")
            }
            FrontmatterError::UnclosedDelimiter => {
                write!(f, "Unclosed `---` frontmatter delimiter")
            }
            FrontmatterError::ParseError(msg) => {
                write!(f, "Frontmatter YAML parse error: {}", msg)
            }
            FrontmatterError::ValidationError(msg) => {
                write!(f, "Frontmatter validation error: {}", msg)
            }
            FrontmatterError::IoError(msg) => {
                write!(f, "I/O error: {}", msg)
            }
        }
    }
}

impl std::error::Error for FrontmatterError {}

// ============================================================
// Validation Logic
// ============================================================

impl Frontmatter {
    /// Validate the frontmatter fields for correctness.
    ///
    /// Checks:
    /// - `id` follows `{prefix}-{number}` convention
    /// - `version` is semver X.Y.Z
    /// - `last_updated` is a valid ISO date
    /// - `title` is non-empty
    /// - `category` is non-empty
    /// - `tags` is non-empty (for findability)
    pub fn validate(&self) -> Result<(), FrontmatterError> {
        if self.title.trim().is_empty() {
            return Err(FrontmatterError::ValidationError(
                "`title` must not be empty".into(),
            ));
        }

        if self.category.trim().is_empty() {
            return Err(FrontmatterError::ValidationError(
                "`category` must not be empty".into(),
            ));
        }

        // Validate ID format: `{prefix}-{number}`
        let id_parts: Vec<&str> = self.id.splitn(2, '-').collect();
        if id_parts.len() != 2 || id_parts[0].is_empty() || id_parts[1].is_empty() {
            return Err(FrontmatterError::ValidationError(format!(
                "Invalid `id` format: '{}'. Expected `{{prefix}}-{{number}}` (e.g. `phys-001`)",
                self.id
            )));
        }
        if !id_parts[1].chars().all(|c| c.is_ascii_digit()) {
            return Err(FrontmatterError::ValidationError(format!(
                "Invalid `id` number part: '{}'. Must be numeric",
                id_parts[1]
            )));
        }

        // Validate version is semver
        let version_parts: Vec<&str> = self.version.splitn(3, '.').collect();
        if version_parts.len() != 3
            || version_parts
                .iter()
                .any(|p| p.is_empty() || !p.chars().all(|c| c.is_ascii_digit()))
        {
            return Err(FrontmatterError::ValidationError(format!(
                "Invalid `version` format: '{}'. Expected semver `X.Y.Z`",
                self.version
            )));
        }

        // Validate last_updated is ISO date (YYYY-MM-DD)
        let date_parts: Vec<&str> = self.last_updated.splitn(3, '-').collect();
        if date_parts.len() != 3
            || date_parts[0].len() != 4
            || date_parts[1].len() != 2
            || date_parts[2].len() != 2
            || !date_parts
                .iter()
                .all(|p| p.chars().all(|c| c.is_ascii_digit()))
        {
            return Err(FrontmatterError::ValidationError(format!(
                "Invalid `last_updated` format: '{}'. Expected `YYYY-MM-DD`",
                self.last_updated
            )));
        }

        if self.tags.is_empty() {
            return Err(FrontmatterError::ValidationError(
                "`tags` must not be empty (at least one tag required for discoverability)".into(),
            ));
        }

        Ok(())
    }

    /// Validate that the category matches one of the provided known categories.
    /// Called by consumers like the update handler to validate against the current taxonomy.
    pub fn validate_category(&self, known_categories: &[String]) -> Result<(), FrontmatterError> {
        if !known_categories.contains(&self.category) {
            return Err(FrontmatterError::ValidationError(format!(
                "Unknown category '{}'. Must be one of: {}",
                self.category,
                known_categories.join(", ")
            )));
        }
        Ok(())
    }
}

// ============================================================
// Tests
// ============================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_valid_frontmatter() {
        let content = r#"---
id: phys-001
title: Test Physics
category: physics
tags: ["quantum", "mechanics"]
last_updated: 2026-07-11
version: 1.0.0
---

# Content here"#;

        let (fm, body) = parse_frontmatter(content).unwrap();
        assert_eq!(fm.id, "phys-001");
        assert_eq!(fm.title, "Test Physics");
        assert_eq!(fm.category, "physics");
        assert_eq!(fm.tags, vec!["quantum", "mechanics"]);
        assert_eq!(fm.version, "1.0.0");
        assert_eq!(body.trim(), "# Content here");
    }

    #[test]
    fn test_missing_delimiter() {
        let content = "no frontmatter here";
        assert!(matches!(
            parse_frontmatter(content),
            Err(FrontmatterError::MissingDelimiter)
        ));
    }

    #[test]
    fn test_invalid_id_format() {
        let content = r#"---
id: badformat
title: Test
category: physics
tags: ["test"]
last_updated: 2026-07-11
version: 1.0.0
---"#;

        assert!(matches!(
            parse_frontmatter(content),
            Err(FrontmatterError::ValidationError(_))
        ));
    }

    #[test]
    fn test_invalid_version() {
        let content = r#"---
id: phys-001
title: Test
category: physics
tags: ["test"]
last_updated: 2026-07-11
version: 1.0
---"#;

        assert!(matches!(
            parse_frontmatter(content),
            Err(FrontmatterError::ParseError(_))
        ));
    }

    #[test]
    fn test_empty_tags() {
        let content = r#"---
id: phys-001
title: Test
category: physics
tags: []
last_updated: 2026-07-11
version: 1.0.0
---"#;

        assert!(matches!(
            parse_frontmatter(content),
            Err(FrontmatterError::ValidationError(_))
        ));
    }
}
