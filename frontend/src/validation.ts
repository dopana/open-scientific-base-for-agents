export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface Frontmatter {
  id: string;
  title: string;
  category: string;
  tags: string[];
  last_updated: string;
  version: string;
}

/**
 * Parse YAML frontmatter from markdown content
 */
export function parseFrontmatter(content: string): { frontmatter: Frontmatter; body: string } | null {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return null;
  }

  const yamlContent = match[1];
  const body = match[2];

  try {
    const frontmatter = parseYaml(yamlContent);
    return { frontmatter, body };
  } catch {
    return null;
  }
}

/**
 * Simple YAML parser for frontmatter
 * Handles basic YAML structures used in the data format
 */
function parseYaml(yaml: string): Frontmatter {
  const lines = yaml.split('\n');
  const result: Partial<Frontmatter> = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) continue;

    const key = trimmed.slice(0, colonIndex).trim();
    const value = trimmed.slice(colonIndex + 1).trim();

    switch (key) {
      case 'id':
        result.id = value.replace(/^["']|["']$/g, '');
        break;
      case 'title':
        result.title = value.replace(/^["']|["']$/g, '');
        break;
      case 'category':
        result.category = value.replace(/^["']|["']$/g, '');
        break;
      case 'last_updated':
        result.last_updated = value.replace(/^["']|["']$/g, '');
        break;
      case 'version':
        result.version = value.replace(/^["']|["']$/g, '');
        break;
      case 'tags': {
        // Parse array format: ["tag1", "tag2"]
        const arrayMatch = value.match(/^\[(.*)\]$/);
        if (arrayMatch) {
          result.tags = arrayMatch[1]
            .split(',')
            .map((tag) => tag.trim().replace(/^["']|["']$/g, ''))
            .filter(Boolean);
        }
        break;
      }
    }
  }

  return result as Frontmatter;
}

/**
 * Validate ID format: {prefix}-{number}
 */
function validateId(id: string): string[] {
  const errors: string[] = [];
  const idRegex = /^([a-z0-9]+)-(\d+)$/;

  if (!idRegex.test(id)) {
    errors.push(`Invalid id format: "${id}". Expected format: {prefix}-{number} (e.g., "phys-001")`);
  }

  return errors;
}

/**
 * Validate date format: YYYY-MM-DD
 */
function validateDate(date: string): string[] {
  const errors: string[] = [];
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

  if (!dateRegex.test(date)) {
    errors.push(`Invalid last_updated format: "${date}". Expected format: YYYY-MM-DD`);
  }

  return errors;
}

/**
 * Validate semantic version: X.Y.Z
 */
function validateVersion(version: string): string[] {
  const errors: string[] = [];
  const versionRegex = /^\d+\.\d+\.\d+$/;

  if (!versionRegex.test(version)) {
    errors.push(`Invalid version format: "${version}". Expected format: X.Y.Z (e.g., "1.0.0")`);
  }

  return errors;
}

/**
 * Validate tags array
 */
function validateTags(tags: string[]): string[] {
  const errors: string[] = [];

  if (!tags || tags.length === 0) {
    errors.push('tags must not be empty');
  }

  if (tags) {
    tags.forEach((tag, index) => {
      if (!/^[ a-z0-9-]+$/.test(tag)) {
        errors.push(`Invalid tag at index ${index}: "${tag}". Tags should use lowercase kebab-case`);
      }
    });
  }

  return errors;
}

/**
 * Validate required fields are present
 */
function validateRequiredFields(frontmatter: Partial<Frontmatter>): string[] {
  const errors: string[] = [];
  const requiredFields: (keyof Frontmatter)[] = ['id', 'title', 'category', 'tags', 'last_updated', 'version'];

  for (const field of requiredFields) {
    if (!frontmatter[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  if (frontmatter.title && frontmatter.title.trim() === '') {
    errors.push('title must not be empty');
  }

  if (frontmatter.category && frontmatter.category.trim() === '') {
    errors.push('category must not be empty');
  }

  return errors;
}

/**
 * Validate markdown content against the data format specification
 */
export function validateMarkdown(content: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if frontmatter exists
  const parsed = parseFrontmatter(content);
  if (!parsed) {
    errors.push('Missing or invalid YAML frontmatter. Content must start with ---');
    return { valid: false, errors, warnings };
  }

  const { frontmatter, body } = parsed;

  // Validate required fields
  errors.push(...validateRequiredFields(frontmatter));

  // Validate field formats if they exist
  if (frontmatter.id) {
    errors.push(...validateId(frontmatter.id));
  }

  if (frontmatter.last_updated) {
    errors.push(...validateDate(frontmatter.last_updated));
  }

  if (frontmatter.version) {
    errors.push(...validateVersion(frontmatter.version));
  }

  if (frontmatter.tags) {
    errors.push(...validateTags(frontmatter.tags));
  }

  // Check for unknown fields (warn only)
  const knownFields = ['id', 'title', 'category', 'tags', 'last_updated', 'version'];
  const allFields = Object.keys(frontmatter);
  const unknownFields = allFields.filter((field) => !knownFields.includes(field));
  if (unknownFields.length > 0) {
    warnings.push(`Unknown fields in frontmatter: ${unknownFields.join(', ')}`);
  }

  // Check if body has content
  if (!body.trim()) {
    warnings.push('File body is empty');
  }

  // Check if title in frontmatter matches H1 in body
  const h1Match = body.match(/^#\s+(.+)$/m);
  if (h1Match && frontmatter.title) {
    const h1Title = h1Match[1].trim();
    if (h1Title !== frontmatter.title) {
      warnings.push(`H1 title "${h1Title}" does not match frontmatter title "${frontmatter.title}"`);
    }
  } else if (!h1Match) {
    warnings.push('Missing H1 heading in file body');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
