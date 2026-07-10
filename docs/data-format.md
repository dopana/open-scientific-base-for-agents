# Data Format Specification

## File Format

Every knowledge file in the Open Scientific Base is a **Markdown file** (`.md`) with **YAML frontmatter**. The frontmatter block is enclosed by `---` delimiters at the top of the file.

```markdown
---
id: phys-001
title: Introduction to Quantum Mechanics
category: physics
tags: ["quantum", "mechanics", "wave-function", "schrödinger"]
last_updated: 2026-07-11
version: 1.1.0
---

# Introduction to Quantum Mechanics

## Overview

Quantum mechanics is a fundamental theory in physics...

## Key Principles

### Wave-Particle Duality

Particles exhibit both wave-like and particle-like properties...

## Further Reading

1. Feynman, R. P. (1965). *The Feynman Lectures on Physics, Vol. III*
2. Griffiths, D. J. (2018). *Introduction to Quantum Mechanics*
```

## Frontmatter Schema

### Required Fields

| Field | Type | Example | Description |
|-------|------|---------|-------------|
| `id` | `string` | `phys-001` | Unique identifier — see [ID Convention](#id-convention) |
| `title` | `string` | `Introduction to Quantum Mechanics` | Human-readable title |
| `category` | `string` | `physics` | Scientific category — must match parent directory name |
| `tags` | `string[]` | `["quantum", "mechanics"]` | Search tags — at least 1 required |
| `last_updated` | `string` (date) | `2026-07-11` | ISO-8601 date (YYYY-MM-DD) |
| `version` | `string` (semver) | `1.1.0` | Semantic version (X.Y.Z) |

### Strict Validation

The system uses `#[serde(deny_unknown_fields)]` on the `Frontmatter` struct, meaning **any YAML key not in the schema above will cause a parse error**. This prevents typos and ensures consistency.

### Validation Rules

| Field | Rule | Error Example |
|-------|------|---------------|
| `id` | Must match `{prefix}-{number}`. Prefix must not be empty. Number part must be numeric. | `bad-format` → Invalid `id` format |
| `title` | Must not be empty | `""` → `title` must not be empty |
| `category` | Must not be empty. Must match parent directory name (when loaded from disk). | `""` → `category` must not be empty |
| `tags` | Must have at least 1 element | `[]` → `tags` must not be empty |
| `last_updated` | Must be `YYYY-MM-DD` format | `07-11-2026` → Invalid `last_updated` format |
| `version` | Must be semver `X.Y.Z` (all numeric parts) | `1.0` → Invalid `version` format |

## ID Convention

The `id` field follows a strict naming convention based on scientific category:

| Category | ID Prefix | Example File |
|----------|-----------|--------------|
| Physics | `phys` | `phys-001`, `phys-002` |
| Biology | `bio` | `bio-001`, `bio-002` |
| Chemistry | `chem` | `chem-001` |
| Computer Science | `cs` | `cs-001`, `cs-002` |
| Mathematics | `math` | `math-001`, `math-002` |

The ID format is: **`{prefix}-{number}`**

- `{prefix}` is a lowercase, alphanumeric abbreviation of the category (no hyphens allowed)
- `{number}` is a zero-padded sequential number (e.g., `001`, `002`)
- The separator is a single hyphen (`-`)

### Adding New Files

When creating a new file, choose the next available number in the sequence:

```markdown
---
id: phys-003                    # Third physics file
title: Thermodynamics
category: physics
tags: ["thermodynamics", "heat", "entropy"]
last_updated: 2026-07-11
version: 1.0.0
---
```

## Category Convention

The `category` field **must match the parent directory name** of the file. For example:

```
data/physics/quantum-mechanics.md        → category: physics
data/biology/crispr-gene-editing.md      → category: biology
data/chemistry/organic-chemistry-basics.md → category: chemistry
```

The API validates this when loading files from disk. If the `category` field doesn't match the directory, the file is rejected with a clear error message:

```
Category mismatch in 'data/physics/some-file.md':
frontmatter says 'biology' but file is in the 'physics' directory
```

## Versioning Convention

The `version` field follows **semantic versioning** (`MAJOR.MINOR.PATCH`):

| Change | Increment | Example |
|--------|-----------|---------|
| Initial creation | Start at `1.0.0` | `1.0.0` |
| Minor content edits (typos, clarifications) | Patch `Z` → `Z+1` | `1.0.0` → `1.0.1` |
| Significant content additions | Minor `Y` → `Y+1`, reset patch | `1.0.0` → `1.1.0` |
| Major restructuring or rewrite | Major `X` → `X+1`, reset minor & patch | `1.0.0` → `2.0.0` |

The API **automatically increments** the patch version on each update via `POST /api/files/update`. Agents should set `version` in the frontmatter when submitting, but the server will override it to the incremented value.

## Tags Convention

Tags are used for **cross-referencing and discoverability**. Follow these guidelines:

- **Minimum 1 tag** (validation enforces this)
- **No maximum**, but 3–6 is recommended
- Use **lowercase kebab-case** (e.g., `wave-function`, `gene-editing`)
- Include the **main topic** as the first tag
- Include **related concepts** as additional tags
- Avoid subjective or inconsistent tags

### Good Tags

```yaml
tags: ["quantum", "mechanics", "wave-function", "schrödinger"]
tags: ["crispr", "gene-editing", "biotechnology", "dna"]
tags: ["deep-learning", "transformer", "attention", "nlp"]
```

### Bad Tags

```yaml
tags: []                        # Empty — validation fails
tags: ["cool stuff"]            # Subjective, not searchable
tags: ["quantum", "Quantum"]    # Inconsistent casing
```

## File Organization

Files are organized in a **category-based directory structure**:

```
data/
├── physics/
│   ├── quantum-mechanics.md
│   └── special-relativity.md
├── biology/
│   ├── crispr-gene-editing.md
│   └── evolutionary-biology.md
├── chemistry/
│   └── organic-chemistry-basics.md
├── computer-science/
│   ├── transformer-architecture.md
│   └── quantum-algorithms.md
└── mathematics/
    ├── linear-algebra-foundations.md
    └── statistical-methods.md
```

Each directory corresponds to a scientific category. The directory name **is** the category.

## Content Guidelines

### Structure

Every knowledge file should follow this structure:

```markdown
---
# Frontmatter (as specified above)
---

# Title (must match frontmatter title)

## Overview

Brief summary of the topic (2–3 paragraphs).

## Main Sections

### Section 1 Title

Content with scientific explanations, formulas, and references.

### Section 2 Title

More content...

## Further Reading

1. Author, A. (Year). *Title of Work*
2. Author, B. (Year). *Title of Work*
```

### Markdown Features

The viewer supports the following Markdown features:

| Feature | Syntax | Example |
|---------|--------|---------|
| **Bold** | `**text**` | `**important**` |
| **Inline Code** | `` `code` `` | `` `println!("hello")` `` |
| **Links** | `[text](url)` | `[Wikipedia](https://.../)` |
| **Headings** | `# H1`, `## H2`, `### H3` | `## Key Principles` |
| **Code Blocks** | ```` ``` ```` | ```` ```rust ```` |
| **Lists (ordered)** | `1. item` | `1. First step` |
| **Lists (unordered)** | `- item` | `- Option A` |
| **Blockquotes** | `> text` | `> Important note` |
| **Horizontal Rules** | `---` or `***` | `---` |

### Content Quality Standards

1. **Accuracy**: Information must be factually correct. Include citations where possible.
2. **Clarity**: Use clear, concise scientific language appropriate for the target audience.
3. **Structure**: Use hierarchical headings (H1 → H2 → H3) for logical organization.
4. **Completeness**: Cover the topic thoroughly with key principles, applications, and references.
5. **Citations**: Include a "Further Reading" section with authoritative references.
6. **Focus**: Each file should cover a single topic or closely related set of concepts.
