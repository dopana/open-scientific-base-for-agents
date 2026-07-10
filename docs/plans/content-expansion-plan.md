# Content Expansion Plan

> **Status:** 9 files across 5 categories established; growth planned
> **Updated:** 2026-07-11

## Current Content Inventory

| Category | Files | Coverage | Quality |
|----------|-------|----------|---------|
| Physics | 2 | Quantum mechanics, special relativity | ✅ Complete |
| Biology | 2 | CRISPR gene editing, evolutionary biology | ✅ Complete |
| Chemistry | 1 | Organic chemistry basics | ✅ Complete |
| Computer Science | 2 | Transformer architecture, quantum algorithms | ✅ Complete |
| Mathematics | 2 | Linear algebra, statistical methods | ✅ Complete |
| **Total** | **9** | **5 categories** | **All vetted** |

## Expansion Targets

### Short-term (Next 30 Days)

**Target:** 25 files across 7 categories

| Category | Current | Target | New Topics |
|----------|---------|--------|------------|
| Physics | 2 | 4 | Thermodynamics, Electromagnetism |
| Biology | 2 | 4 | Cell biology, Genetics fundamentals |
| Chemistry | 1 | 3 | Inorganic chemistry, Biochemistry intro |
| Computer Science | 2 | 5 | Data structures, OS fundamentals, Network protocols |
| Mathematics | 2 | 4 | Calculus, Discrete mathematics |
| **Neuroscience** | 0 | 3 | Neural plasticity, Brain anatomy, Neurotransmitters |
| **Earth Science** | 0 | 2 | Climate science, Geology basics |

### Medium-term (90 Days)

**Target:** 75 files across 12 categories

| New Category | Topics |
|-------------|--------|
| Astronomy | Solar system, Stellar evolution, Cosmology, Exoplanets |
| Engineering | Signal processing, Control theory, Materials science |
| Medicine | Immunology, Pharmacology, Epidemiology |
| Ecology | Ecosystems, Biodiversity, Conservation biology |
| Linguistics | Syntax, Phonology, Language acquisition |

### Long-term (1 Year)

**Target:** 200+ files across 20+ categories

- Sub-specializations within each category
- Multi-file series (e.g., "Quantum Mechanics Part 1-5")
- Cross-referenced tag networks
- Interactive diagrams and visualizations
- Translated versions (future consideration)

## Topic Selection Criteria

Priority for new topics:

1. **Fundamental knowledge** — Core scientific concepts that underpin other topics
2. **High search demand** — Topics frequently queried by AI agents
3. **Gap filling** — Missing prerequisite knowledge for existing content
4. **Emerging research** — Cutting-edge topics with growing importance
5. **Interdisciplinary** — Topics that bridge multiple categories

## Content Quality Standards

### Required Elements

Every knowledge file must include:

- [ ] YAML frontmatter with all 6 required fields
- [ ] Overview section (2-3 paragraphs)
- [ ] At least 3 substantive sections with headings
- [ ] Code examples where applicable (formatted in ` ``` ` blocks)
- [ ] "Further Reading" section with 3+ authoritative references
- [ ] At least 3 relevant tags
- [ ] Version `1.0.0` for initial creation

### Quality Checklist

- [ ] Factually accurate — verified against authoritative sources
- [ ] Citations provided — peer-reviewed papers or textbooks
- [ ] Clear language — appropriate for undergraduate-level understanding
- [ ] Well-structured — logical flow from overview to details
- [ ] No errors — grammar, spelling, formatting
- [ ] Cross-references — links to related files in the knowledge base

## Content Creation Workflow

```
1. IDENTIFY GAP
   └── Agent or human identifies missing topic
        │
2. ASSIGN TOPIC
   └── Create file with category + sequential ID
        │
3. DRAFT CONTENT
   └── Write markdown with frontmatter, sections, references
        │
4. VALIDATE
   └── Check frontmatter passes API validation
        │
5. SUBMIT
   └── POST /api/files/update with full content
        │
6. VERIFY
   └── GET /api/files/{id} confirms content stored
        │
7. COMMIT (if manual)
   └── Git commit with message: "Add {category}: {title}"
```

### For AI Agents

```python
# Agent workflow for adding new content
new_file = {
    "id": "phys-003",
    "title": "Thermodynamics",
    "content": """---
id: phys-003
title: Thermodynamics
category: physics
tags: ["thermodynamics", "heat", "entropy", "laws-of-thermodynamics"]
last_updated: 2026-07-11
version: 1.0.0
---

# Thermodynamics

## Overview

Thermodynamics is a branch of physics...""",
    "tags": ["thermodynamics", "heat", "entropy"]
}

response = requests.post(f"{API}/api/files/update", json=new_file)
if response.ok:
    print(f"Created {response.json()['id']} v{response.json()['version']}")
```

## ID Allocation

| Range | Category | Allocated | Available |
|-------|----------|-----------|-----------|
| phys-001 to phys-099 | Physics | 2 | 97 |
| bio-001 to bio-099 | Biology | 2 | 97 |
| chem-001 to chem-099 | Chemistry | 1 | 98 |
| cs-001 to cs-099 | Computer Science | 2 | 97 |
| math-001 to math-099 | Mathematics | 2 | 97 |
| neuro-001 to neuro-099 | Neuroscience | 0 | 99 |
| earth-001 to earth-099 | Earth Science | 0 | 99 |

## Tag Taxonomy

Tags should follow a consistent hierarchy for cross-referencing:

```
Domain Tags:    physics, biology, chemistry, cs, math
Topic Tags:     quantum, thermodynamics, evolution, calculus
Concept Tags:   entropy, natural-selection, matrix, algorithm
Method Tags:    pcr, spectroscopy, monte-carlo, gradient-descent
Reference Tags: feynman, darwin, einstein, turing
```

## Performance Considerations

| Scale | Files | D1 Size | Search Performance |
|-------|-------|---------|-------------------|
| Current | 9 | <100 KB | Instant |
| Short-term | 25 | <500 KB | Instant |
| Medium-term | 75 | <2 MB | <10ms |
| Long-term | 200 | <5 MB | <50ms |
| Maximum | 100,000 | <1 GB | D1 limit |
