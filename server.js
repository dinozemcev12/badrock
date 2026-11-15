// Bedrock Notes — a local-first Markdown notes server.
// Clean-room implementation: no Obsidian code or assets are used.

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const DEFAULT_VAULT = path.join(ROOT, 'vault');
const CONFIG_PATH = path.join(ROOT, 'bedrock.config.json');
const PORT = Number(process.env.PORT) || 5176;
const HOST = process.env.HOST || '127.0.0.1';

const IGNORED_DIRS = new Set(['.obsidian', '.git', '.trash', 'node_modules', '.idea', '.vscode']);
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.bmp': 'image/bmp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.pdf': 'application/pdf',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
};

let vaultDir = null;
let indexCache = { vault: null, at: 0, notes: [] };

// ============================
// Small helpers
// ============================

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function isDir(p) {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function pathExists(p) {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

function toPosix(p) {
  return p.split(path.sep).join('/');
}

function timestampSlug() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function uniqueName(rel) {
  const ext = path.posix.extname(rel);
  const base = rel.slice(0, rel.length - ext.length);
  let candidate = rel;
  let i = 1;
  while (pathExists(resolveVaultPath(candidate))) {
    candidate = `${base} ${i}${ext}`;
    i += 1;
  }
  return candidate;
}

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'Cache-Control': 'no-store',
  });
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > 32 * 1024 * 1024) {
        reject(httpError(413, 'Request body is too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function readJson(req) {
  const raw = await readBody(req);
  if (!raw.trim()) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw httpError(400, 'Invalid JSON body');
  }
}

// ============================
// Vault configuration
// ============================

function loadConfig() {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveConfig(patch) {
  const config = { ...loadConfig(), ...patch };
  try {
    fs.writeFileSync(CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
  } catch (err) {
    console.warn('Cannot save configuration:', err.message);
  }
}

function initVault() {
  const config = loadConfig();
  let candidate = typeof config.vault === 'string' ? config.vault : null;
  if (!candidate || !isDir(candidate)) candidate = DEFAULT_VAULT;
  vaultDir = path.resolve(candidate);
  fs.mkdirSync(vaultDir, { recursive: true });
  if (vaultDir === path.resolve(DEFAULT_VAULT)) seedDemoVault();
}

function vaultInfo() {
  return {
    path: vaultDir,
    name: path.basename(vaultDir),
    isDefault: path.resolve(vaultDir) === path.resolve(DEFAULT_VAULT),
    defaultPath: DEFAULT_VAULT,
  };
}

function relativeToVault(abs) {
  return toPosix(path.relative(vaultDir, abs));
}

function resolveVaultPath(rel) {
  const base = path.resolve(vaultDir);
  const normalized = String(rel == null ? '' : rel).replace(/\\/g, '/').replace(/^\/+/, '');
  const target = path.resolve(base, normalized);
  if (target !== base && !target.startsWith(base + path.sep)) {
    throw httpError(400, 'Path is outside the vault');
  }
  return target;
}

function invalidateIndex() {
  indexCache.at = 0;
  indexCache.notes = [];
}

function writeAtomic(abs, content) {
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  const tmp = path.join(
    path.dirname(abs),
    `.${path.basename(abs)}.bedrock-${process.pid}-${Date.now()}.tmp`
  );
  fs.writeFileSync(tmp, content, 'utf8');
  fs.renameSync(tmp, abs);
}

// ============================
// Frontmatter and links
// ============================

function splitFrontmatter(raw) {
  const match = raw.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/);
  if (!match) return { hasFrontmatter: false, frontmatterRaw: '', body: raw };
  return {
    hasFrontmatter: true,
    frontmatterRaw: match[1],
    body: raw.slice(match[0].length),
  };
}

function unquote(value) {
  const text = String(value).trim();
  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith("'") && text.endsWith("'"))
  ) {
    return text.slice(1, -1);
  }
  return text;
}

function parseSimpleYaml(source) {
  const data = {};
  if (!source.trim()) return data;
  let currentKey = null;

  for (const line of source.split(/\r?\n/)) {
    if (!line.trim() || /^\s*#/.test(line)) continue;

    const listItem = line.match(/^\s*-\s+(.*)$/);
    if (listItem && currentKey) {
      if (!Array.isArray(data[currentKey])) data[currentKey] = [];
      data[currentKey].push(unquote(listItem[1]));
      continue;
    }

    const pair = line.match(/^([^:\n]+):\s*(.*)$/);
    if (!pair) continue;

    const key = pair[1].trim();
    const rawValue = pair[2].trim();
    currentKey = key;

    if (!rawValue) {
      data[key] = [];
      continue;
    }
    if (rawValue.startsWith('[') && rawValue.endsWith(']')) {
      data[key] = rawValue
        .slice(1, -1)
        .split(',')
        .map((item) => unquote(item))
        .filter(Boolean);
      continue;
    }
    if (/^(true|false)$/i.test(rawValue)) {
      data[key] = rawValue.toLowerCase() === 'true';
      continue;
    }
    if (/^-?\d+(\.\d+)?$/.test(rawValue)) {
      data[key] = Number(rawValue);
      continue;
    }
    data[key] = unquote(rawValue);
  }
  return data;
}

function asStringArray(value) {
  if (Array.isArray(value)) return value.map((item) => String(item)).filter(Boolean);
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
}

function normalizeTags(value) {
  return asStringArray(value)
    .flatMap((tag) => tag.split(/[,\s]+/))
    .map((tag) => tag.replace(/^#+/, '').trim())
    .filter(Boolean);
}

function stripCode(body) {
  return body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/~~~[\s\S]*?~~~/g, ' ')
    .replace(/`[^`\n]*`/g, ' ');
}

function extractInlineTags(body) {
  const clean = stripCode(body);
  const tags = [];
  const re = /(^|[\s(])#([\p{L}\p{N}_][\p{L}\p{N}_/-]*)/gu;
  let match;
  while ((match = re.exec(clean))) tags.push(match[2]);
  return tags;
}

function extractLinkTargets(body) {
  const clean = stripCode(body);
  const targets = [];
  const re = /!?\[\[([^\]\n]+?)\]\]/g;
  let match;
  while ((match = re.exec(clean))) {
    const inner = match[1];
    const notePart = inner.split('|')[0].split('#')[0].trim();
    if (notePart) targets.push(notePart);
  }
  return targets;
}

// ============================
// Vault index
// ============================

function inferTitle(body, fallback) {
  const heading = body.match(/^#\s+(.+?)\s*$/m);
  return heading ? heading[1].replace(/\s+#+\s*$/, '').trim() : fallback;
}

function readNoteFile(abs, rel) {
  const stat = fs.statSync(abs);
  const raw = fs.readFileSync(abs, 'utf8');
  const { hasFrontmatter, frontmatterRaw, body } = splitFrontmatter(raw);
  const data = parseSimpleYaml(frontmatterRaw);
  const name = path.basename(abs, path.extname(abs));
  const title = typeof data.title === 'string' && data.title.trim() ? data.title.trim() : inferTitle(body, name);
  const aliases = asStringArray(data.aliases);
  const tags = [...new Set([...normalizeTags(data.tags), ...extractInlineTags(body)])];
  const links = extractLinkTargets(body);
  const properties = Object.entries(data).map(([key, value]) => ({ key, value }));
  return {
    path: rel,
    abs,
    name,
    title,
    raw,
    body,
    aliases,
    tags,
    links,
    properties,
    hasFrontmatter,
    frontmatterRaw,
    size: stat.size,
    mtime: stat.mtime.toISOString(),
    mtimeMs: stat.mtimeMs,
    ctime: stat.birthtime.toISOString(),
  };
}

function walkNoteFiles(dir, relBase, out) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.name.startsWith('.') || IGNORED_DIRS.has(entry.name)) continue;
    const abs = path.join(dir, entry.name);
    const rel = relBase ? `${relBase}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      walkNoteFiles(abs, rel, out);
    } else if (entry.isFile() && /\.md$/i.test(entry.name)) {
      out.push({ abs, rel });
    }
  }
}

function getIndex(force = false) {
  const now = Date.now();
  if (
    !force &&
    indexCache.vault === vaultDir &&
    indexCache.notes.length > 0 &&
    now - indexCache.at < 600
  ) {
    return indexCache.notes;
  }

  const files = [];
  walkNoteFiles(vaultDir, '', files);
  const notes = [];
  for (const file of files) {
    try {
      notes.push(readNoteFile(file.abs, file.rel));
    } catch (err) {
      console.warn(`Cannot read note ${file.rel}:`, err.message);
    }
  }
  notes.sort((a, b) => a.path.localeCompare(b.path, 'ru', { numeric: true }));
  indexCache = { vault: vaultDir, at: now, notes };
  return notes;
}

function resolveTarget(target, index = getIndex()) {
  const clean = String(target || '').trim().replace(/^!?\[\[|\]\]$/g, '');
  if (!clean) return null;
  const notePart = clean.split('|')[0].split('#')[0].trim();
  const key = notePart.replace(/\.md$/i, '').replace(/^\/+/, '').toLowerCase();
  if (!key) return null;

  const direct = index.find((note) => {
    const noExt = note.path.replace(/\.md$/i, '').toLowerCase();
    return (
      noExt === key ||
      note.name.toLowerCase() === key ||
      note.title.toLowerCase() === key ||
      note.aliases.some((alias) => alias.toLowerCase() === key)
    );
  });
  if (direct) return direct;

  return (
    index.find((note) => {
      const noExt = note.path.replace(/\.md$/i, '').toLowerCase();
      return noExt.endsWith(`/${key}`) || note.name.toLowerCase().endsWith(`/${key}`);
    }) || null
  );
}

function noteSummary(note) {
  return {
    path: note.path,
    name: note.name,
    title: note.title,
    aliases: note.aliases,
    tags: note.tags,
    mtime: note.mtimeMs,
    size: note.size,
  };
}

// ============================
// File tree
// ============================

function buildTree() {
  const notes = getIndex();
  const byPath = new Map(notes.map((note) => [note.path, note]));

  function walk(dir, relBase) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return [];
    }
    const folders = [];
    const files = [];
    for (const entry of entries) {
      if (entry.name.startsWith('.') || IGNORED_DIRS.has(entry.name)) continue;
      const rel = relBase ? `${relBase}/${entry.name}` : entry.name;
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        folders.push({
          type: 'folder',
          name: entry.name,
          path: rel,
          children: walk(abs, rel),
        });
      } else if (entry.isFile() && /\.md$/i.test(entry.name)) {
        const note = byPath.get(rel);
        if (note) {
          files.push({ type: 'note', ...noteSummary(note) });
        } else {
          files.push({
            type: 'note',
            path: rel,
            name: entry.name.replace(/\.md$/i, ''),
            title: entry.name.replace(/\.md$/i, ''),
            aliases: [],
            tags: [],
            mtime: 0,
            size: 0,
          });
        }
      }
    }
    const collator = new Intl.Collator('ru', { numeric: true, sensitivity: 'base' });
    folders.sort((a, b) => collator.compare(a.name, b.name));
    files.sort((a, b) => collator.compare(a.name, b.name));
    return [...folders, ...files];
  }

  return walk(vaultDir, '');
}

function countFolders(nodes) {
  let count = 0;
  for (const node of nodes) {
    if (node.type === 'folder') count += 1 + countFolders(node.children);
  }
  return count;
}

// ============================
// Search
// ============================

function countOccurrences(haystack, needle) {
  if (!needle) return 0;
  let count = 0;
  let index = 0;
  while ((index = haystack.indexOf(needle, index)) !== -1) {
    count += 1;
    index += needle.length;
  }
  return count;
}

function collapseWhitespace(text) {
  return String(text).replace(/\s+/g, ' ').trim();
}

function makeSnippet(text, index, length = 180) {
  const start = Math.max(0, index - Math.floor(length * 0.35));
  const end = Math.min(text.length, start + length);
  let snippet = collapseWhitespace(text.slice(start, end));
  if (start > 0) snippet = `…${snippet}`;
  if (end < text.length) snippet = `${snippet}…`;
  return snippet;
}

function searchVault(query) {
  const q = String(query || '').trim();
  if (!q) return [];

  const notes = getIndex();

  if (q.startsWith('#') || /^tag:/i.test(q)) {
    const tag = q.replace(/^tag:/i, '').replace(/^#/, '').trim().toLowerCase();
    if (!tag) return [];
    return notes
      .filter((note) => note.tags.some((item) => item.toLowerCase() === tag))
      .map((note) => {
        const line =
          note.body
            .split(/\r?\n/)
            .find((row) => new RegExp(`#${escapeRegExp(tag)}\\b`, 'i').test(row)) || '';
        return {
          path: note.path,
          name: note.name,
          title: note.title,
          snippet: collapseWhitespace(line).slice(0, 180) || `#${tag}`,
          score: 100,
          matches: 1,
          mtime: note.mtimeMs,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  }

  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  const results = [];

  for (const note of notes) {
    const haystack = note.raw.toLowerCase();
    let total = 0;
    let allPresent = true;
    for (const term of terms) {
      const count = countOccurrences(haystack, term);
      if (!count) {
        allPresent = false;
        break;
      }
      total += count;
    }
    if (!allPresent) continue;

    const titleHaystack = `${note.name} ${note.title} ${note.aliases.join(' ')}`.toLowerCase();
    let score = total;
    for (const term of terms) {
      if (titleHaystack.includes(term)) score += 14;
      if (note.name.toLowerCase() === term) score += 40;
    }

    const bodyLower = note.body.toLowerCase();
    let firstIndex = -1;
    for (const term of terms) {
      const idx = bodyLower.indexOf(term);
      if (idx !== -1 && (firstIndex === -1 || idx < firstIndex)) firstIndex = idx;
    }
    const snippet = firstIndex >= 0 ? makeSnippet(note.body, firstIndex) : makeSnippet(note.body, 0);

    results.push({
      path: note.path,
      name: note.name,
      title: note.title,
      snippet,
      score,
      matches: total,
      mtime: note.mtimeMs,
    });
  }

  results.sort(
    (a, b) => b.score - a.score || a.name.localeCompare(b.name, 'ru', { numeric: true })
  );
  return results.slice(0, 100);
}

// ============================
// Tags, backlinks, graph
// ============================

function collectTags() {
  const counts = new Map();
  for (const note of getIndex()) {
    for (const tag of new Set(note.tags)) {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'ru'));
}

function contextLine(body, needle) {
  const lowerNeedle = needle.toLowerCase();
  for (const line of body.split(/\r?\n/)) {
    if (line.toLowerCase().includes(lowerNeedle)) {
      return collapseWhitespace(line).slice(0, 220);
    }
  }
  return '';
}

function backlinksFor(rel) {
  const notes = getIndex();
  const target = notes.find((note) => note.path === rel);
  if (!target) throw httpError(404, 'Note not found');

  const backlinks = [];
  const unlinked = [];
  const targetNames = [target.name, target.title, ...target.aliases]
    .map((item) => item.toLowerCase())
    .filter(Boolean);

  for (const note of notes) {
    if (note.path === target.path) continue;

    const resolvedLinks = note.links.map((link) => resolveTarget(link, notes)).filter(Boolean);
    const linked = resolvedLinks.some((item) => item.path === target.path);

    if (linked) {
      const needle =
        note.links.find((link) => {
          const resolved = resolveTarget(link, notes);
          return resolved && resolved.path === target.path;
        }) || target.name;
      backlinks.push({
        path: note.path,
        name: note.name,
        title: note.title,
        tags: note.tags,
        context: contextLine(note.body, `[[${needle}`) || contextLine(note.body, needle),
      });
      continue;
    }

    const bodyLower = note.body.toLowerCase();
    const mention = targetNames.find((name) => name.length > 2 && bodyLower.includes(name));
    if (mention && !linked) {
      const line = contextLine(note.body, mention);
      if (line && !line.includes('[[')) {
        unlinked.push({
          path: note.path,
          name: note.name,
          title: note.title,
          context: line,
        });
      }
    }
  }

  const outgoing = target.links.map((rawLink) => {
    const resolved = resolveTarget(rawLink, notes);
    return {
      target: rawLink,
      path: resolved ? resolved.path : null,
      name: resolved ? resolved.name : rawLink,
      exists: Boolean(resolved),
    };
  });

  return {
    backlinks: backlinks.slice(0, 60),
    unlinked: unlinked.slice(0, 20),
    outgoing: outgoing.slice(0, 100),
  };
}

function buildGraph() {
  const notes = getIndex();
  const nodes = new Map();
  const edges = new Map();

  for (const note of notes) {
    nodes.set(`note:${note.path}`, {
      id: `note:${note.path}`,
      path: note.path,
      name: note.name,
      title: note.title,
      tags: note.tags,
      degree: 0,
      unresolved: false,
    });
  }

  for (const note of notes) {
    const from = `note:${note.path}`;
    for (const rawLink of note.links) {
      const resolved = resolveTarget(rawLink, notes);
      let to;
      if (resolved) {
        to = `note:${resolved.path}`;
      } else {
        const label = rawLink.trim();
        if (!label) continue;
        to = `ghost:${label.toLowerCase()}`;
        if (!nodes.has(to)) {
          nodes.set(to, {
            id: to,
            path: null,
            name: label,
            title: label,
            tags: [],
            degree: 0,
            unresolved: true,
          });
        }
      }
      if (from === to) continue;
      const key = `${from}->${to}`;
      if (edges.has(key)) continue;
      edges.set(key, { from, to });
      nodes.get(from).degree += 1;
      nodes.get(to).degree += 1;
    }
  }

  return { nodes: [...nodes.values()], edges: [...edges.values()] };
}

// ============================
// Note mutations
// ============================

function sanitizeRelative(rel, { addMarkdown = false } = {}) {
  let value = String(rel || '').replace(/\\/g, '/').trim();
  value = value.replace(/^\/+/, '');
  if (!value) throw httpError(400, 'A file name is required');
  if (value.startsWith('.') || value.includes('/./') || value.startsWith('../')) {
    throw httpError(400, 'Invalid path');
  }
  const parts = value.split('/');
  if (parts.some((part) => !part || part === '.' || part === '..')) {
    throw httpError(400, 'Invalid path');
  }
  if (/[<>:"|?*\u0000-\u001f]/.test(value)) {
    throw httpError(400, 'The name contains characters that are not allowed');
  }
  if (addMarkdown && !/\.md$/i.test(value)) value += '.md';
  return value;
}

function createNote(rel, content) {
  const relative = uniqueName(sanitizeRelative(rel, { addMarkdown: true }));
  const abs = resolveVaultPath(relative);
  const body =
    typeof content === 'string'
      ? content
      : `# ${path.basename(relative, '.md')}\n\n`;
  writeAtomic(abs, body);
  invalidateIndex();
  return { path: relative, name: path.basename(relative, '.md') };
}

function writeNote(rel, content) {
  const relative = sanitizeRelative(rel);
  const abs = resolveVaultPath(relative);
  if (!pathExists(abs) || !fs.statSync(abs).isFile()) throw httpError(404, 'Note not found');
  writeAtomic(abs, String(content));
  invalidateIndex();
  return { path: relative };
}

function replaceLinksInNote(raw, resolver) {
  return raw.replace(/\[\[([^\]\n]+)\]\]/g, (full, inner) => {
    const pipe = inner.indexOf('|');
    const targetPart = pipe >= 0 ? inner.slice(0, pipe) : inner;
    const aliasPart = pipe >= 0 ? inner.slice(pipe) : '';
    const hash = targetPart.indexOf('#');
    const notePart = hash >= 0 ? targetPart.slice(0, hash) : targetPart;
    const headingPart = hash >= 0 ? targetPart.slice(hash) : '';
    const resolved = resolver(notePart);
    if (!resolved) return full;
    const replacement = `${resolved}${headingPart}${aliasPart}`;
    return `[[${replacement}]]`;
  });
}

function renameNote(oldRel, newRel, updateLinks) {
  const source = sanitizeRelative(oldRel);
  let target = sanitizeRelative(newRel, { addMarkdown: true });
  const sourceAbs = resolveVaultPath(source);
  if (!pathExists(sourceAbs)) throw httpError(404, 'Note not found');
  if (source === target) return { path: target };

  target = uniqueName(target);
  const targetAbs = resolveVaultPath(target);
  fs.mkdirSync(path.dirname(targetAbs), { recursive: true });
  fs.renameSync(sourceAbs, targetAbs);

  if (updateLinks) {
    const oldKey = source.replace(/\.md$/i, '');
    const newKey = target.replace(/\.md$/i, '');
    const notes = getIndex(true);
    for (const note of notes) {
      const next = replaceLinksInNote(note.raw, (notePart) => {
        const clean = notePart.trim().replace(/\.md$/i, '');
        if (clean.toLowerCase() === oldKey.toLowerCase()) return newKey;
        return null;
      });
      if (next !== note.raw) {
        try {
          writeAtomic(note.abs, next);
        } catch (err) {
          console.warn(`Cannot update links in ${note.path}:`, err.message);
        }
      }
    }
  }

  invalidateIndex();
  return { path: target };
}

function containsNotes(dir) {
  let found = false;
  (function walk(current) {
    if (found) return;
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith('.') || IGNORED_DIRS.has(entry.name)) continue;
      if (entry.isFile() && /\.md$/i.test(entry.name)) {
        found = true;
        return;
      }
      if (entry.isDirectory()) walk(path.join(current, entry.name));
    }
  })(dir);
  return found;
}

function sendToTrash(rel) {
  const relative = sanitizeRelative(rel);
  const source = resolveVaultPath(relative);
  if (!pathExists(source)) throw httpError(404, 'File not found');
  const stamp = timestampSlug();
  const destination = path.join(vaultDir, '.trash', stamp, relative);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.renameSync(source, destination);
  invalidateIndex();
  return { path: relative, trashedTo: toPosix(path.relative(vaultDir, destination)) };
}

function createFolder(rel) {
  const relative = sanitizeRelative(rel);
  const abs = resolveVaultPath(relative);
  if (pathExists(abs)) throw httpError(409, 'A folder with this name already exists');
  fs.mkdirSync(abs, { recursive: true });
  invalidateIndex();
  return { path: relative };
}

function renameFolder(oldRel, newRel) {
  const source = sanitizeRelative(oldRel);
  let target = sanitizeRelative(newRel);
  const sourceAbs = resolveVaultPath(source);
  if (!isDir(sourceAbs)) throw httpError(404, 'Folder not found');
  target = uniqueName(target);
  const targetAbs = resolveVaultPath(target);
  if (target.startsWith(`${source}/`)) throw httpError(400, 'Cannot move a folder inside itself');
  fs.mkdirSync(path.dirname(targetAbs), { recursive: true });
  fs.renameSync(sourceAbs, targetAbs);

  // Links that contain an explicit folder path are updated to the new location.
  const oldPrefix = source.replace(/\.md$/i, '');
  const newPrefix = target.replace(/\.md$/i, '');
  const notes = getIndex(true);
  for (const note of notes) {
    const next = replaceLinksInNote(note.raw, (notePart) => {
      const clean = notePart.trim().replace(/^\/+/, '');
      if (clean.toLowerCase().startsWith(`${oldPrefix.toLowerCase()}/`)) {
        return newPrefix + clean.slice(oldPrefix.length);
      }
      return null;
    });
    if (next !== note.raw) {
      try {
        writeAtomic(note.abs, next);
      } catch (err) {
        console.warn(`Cannot update links in ${note.path}:`, err.message);
      }
    }
  }

  invalidateIndex();
  return { path: target };
}

function duplicateNote(rel) {
  const source = sanitizeRelative(rel);
  const sourceAbs = resolveVaultPath(source);
  if (!pathExists(sourceAbs)) throw httpError(404, 'Note not found');
  const raw = fs.readFileSync(sourceAbs, 'utf8');
  const ext = path.posix.extname(source);
  const base = source.slice(0, source.length - ext.length);
  const relative = uniqueName(`${base} 1${ext}`);
  writeAtomic(resolveVaultPath(relative), raw);
  invalidateIndex();
  return { path: relative, name: path.basename(relative, ext) };
}

function createDailyNote(dateInput) {
  let date = new Date();
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    const [year, month, day] = dateInput.split('-').map(Number);
    date = new Date(year, month - 1, day);
  }
  const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
  const relative = `${iso}.md`;
  const abs = resolveVaultPath(relative);
  if (pathExists(abs)) return { path: relative, created: false };

  let label = iso;
  try {
    label = date.toLocaleDateString('ru-RU', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    label = label.charAt(0).toUpperCase() + label.slice(1);
  } catch {
    // Keep the ISO date when Intl is unavailable.
  }

  const content = `---
created: ${iso}
tags: [daily]
---

# ${label}

## Задачи
- [ ] 

## Заметки

## Итоги дня
- 
`;
  writeAtomic(abs, content);
  invalidateIndex();
  return { path: relative, created: true };
}

// ============================
// Demo vault
// ============================

function seedDemoVault() {
  if (containsNotes(vaultDir)) return;

  const files = {
    'Добро пожаловать.md': `---
title: Добро пожаловать
tags: [start, гайд]
aliases: [Начало, Welcome]
created: 2026-11-15
---

# Добро пожаловать в Bedrock Notes

**Bedrock Notes** — локальное приложение для заметок, вдохновлённое Obsidian. Все заметки хранятся у вас на диске в обычных Markdown-файлах.

> [!tip] Быстрый старт
> - \`Ctrl+P\` — палитра команд
> - \`Ctrl+O\` — быстрый переход между заметками
> - \`Ctrl+N\` — новая заметка
> - \`Ctrl+E\` — переключить режим чтения
> - \`Ctrl+G\` — граф связей

## С чего начать

- [x] Открыть хранилище
- [x] Прочитать [[Руководство по Markdown]]
- [ ] Записать первую идею в [[Идеи]]
- [ ] Посмотреть [[Проекты/План проекта|план проекта]]

## Возможности

| Возможность | Где найти |
| --- | --- |
| Дерево файлов | Левая панель |
| Поиск по хранилищу | \`Ctrl+Shift+F\` |
| Обратные ссылки | Правая панель |
| Граф связей | \`Ctrl+G\` |
| Ежедневная заметка | \`Ctrl+D\` |

## Полезные ссылки

- [[Заметки/Список книг]]
- [Сайт Obsidian](https://obsidian.md)

#start #гайд
`,
    'Руководство по Markdown.md': `---
title: Руководство по Markdown
tags: [markdown, справка]
aliases: [Markdown, Шпаргалка]
---

# Руководство по Markdown

Всё, что вы видите ниже, можно набирать в редакторе.

## Заголовки

Заголовки создаются символами \`#\`:

# Заголовок первого уровня
## Заголовок второго уровня
### Заголовок третьего уровня

## Форматирование

**Жирный текст**, *курсив*, ~~зачёркнутый текст~~, ==выделенный текст== и \`код в строке\`.

## Списки

- Обычный пункт
  - Вложенный пункт
  - Ещё один вложенный пункт
- Второй пункт

1. Первый шаг
2. Второй шаг
3. Третий шаг

- [ ] Задача, которую ещё нужно сделать
- [x] Выполненная задача

## Код

\`\`\`js
function greet(name) {
  return 'Привет, ' + name + '!';
}
console.log(greet('мир'));
\`\`\`

## Цитаты и callout-блоки

> Обычная цитата выглядит так.

> [!note] Заметка
> Callout-блоки помогают выделить важное.

> [!warning] Важно
> Не забывайте делать резервные копии.

## Таблицы

| Клавиша | Действие |
| --- | --- |
| \`Ctrl+P\` | Палитра команд |
| \`Ctrl+O\` | Быстрый переход |
| \`Ctrl+E\` | Режим чтения |

## Ссылки

- Внутренние: [[Добро пожаловать]], [[Идеи]], [[Проекты/План проекта]]
- Внешние: [obsidian.md](https://obsidian.md)

#markdown #справка
`,
    'Идеи.md': `---
tags: [идеи]
aliases: [Идея]
---

# Идеи

Список того, что хочется попробовать в Bedrock Notes.

- [ ] Горячие клавиши как в [[Руководство по Markdown|Obsidian]]
- [ ] Плагины и пользовательские темы
- [x] Граф связей
- [ ] Ежедневные заметки
- [ ] Синхронизация между устройствами

## Связанное

- [[Добро пожаловать]]
- [[Проекты/План проекта]]
- [[Заметки/Список книг]]

#идеи
`,
    'Проекты/План проекта.md': `---
title: План проекта
tags: [проект, работа]
---

# План проекта

Цель — довести Bedrock Notes до повседневного инструмента для заметок.

## Этапы

| Этап | Статус |
| --- | --- |
| Редактор с подсветкой | Готово |
| Поиск по хранилищу | Готово |
| Граф связей | Готово |
| Обратные ссылки | Готово |
| Синхронизация | В планах |

## Задачи

- [x] Сделать интерфейс похожим на Obsidian
- [x] Добавить вкладки и палитру команд
- [ ] Проверить на большом хранилище
- [ ] Написать документацию

## См. также

- [[Идеи]]
- [[Добро пожаловать]]

#проект #работа
`,
    'Заметки/Список книг.md': `---
tags: [книги]
---

# Список книг

## Читаю сейчас

- «Поток» — Михай Чиксентмихайи

## Хочу прочитать

- [ ] «Атомные привычки» — Джеймс Клир
- [ ] «Думай медленно… решай быстро» — Даниэль Канеман
- [ ] «Чистый код» — Роберт Мартин

## Прочитано

- [x] «Пиши, сокращай» — Максим Ильяхов

#книги
`,
  };

  for (const [relative, content] of Object.entries(files)) {
    try {
      writeAtomic(resolveVaultPath(relative), content);
    } catch (err) {
      console.warn(`Cannot create demo note ${relative}:`, err.message);
    }
  }
  invalidateIndex();
}

// ============================
// HTTP API
// ============================

async function handleApi(req, res, pathname, searchParams) {
  const method = (req.method || 'GET').toUpperCase();

  if (pathname === '/api/vault/info' && method === 'GET') {
    const notes = getIndex();
    return sendJson(res, 200, {
      ...vaultInfo(),
      noteCount: notes.length,
    });
  }

  if (pathname === '/api/vault/select' && method === 'POST') {
    const body = await readJson(req);
    let candidate = String(body.path || '').trim().replace(/^"(.*)"$/, '$1');
    if (!candidate) throw httpError(400, 'Укажите путь к папке');
    candidate = path.resolve(candidate);
    if (!isDir(candidate)) throw httpError(400, `Папка не найдена: ${candidate}`);
    vaultDir = candidate;
    indexCache = { vault: null, at: 0, notes: [] };
    saveConfig({ vault: vaultDir });
    const notes = getIndex(true);
    return sendJson(res, 200, { ...vaultInfo(), noteCount: notes.length });
  }

  if (pathname === '/api/vault/tree' && method === 'GET') {
    const tree = buildTree();
    const notes = getIndex();
    return sendJson(res, 200, {
      vault: vaultInfo(),
      tree,
      stats: {
        notes: notes.length,
        folders: countFolders(tree),
        tags: collectTags().length,
        words: notes.reduce((sum, note) => sum + note.body.trim().split(/\s+/).filter(Boolean).length, 0),
      },
    });
  }

  if (pathname === '/api/note' && method === 'GET') {
    const rel = sanitizeRelative(searchParams.get('path'));
    const abs = resolveVaultPath(rel);
    if (!pathExists(abs)) throw httpError(404, 'Заметка не найдена');
    const note = readNoteFile(abs, rel);
    return sendJson(res, 200, {
      path: note.path,
      name: note.name,
      title: note.title,
      raw: note.raw,
      body: note.body,
      aliases: note.aliases,
      tags: note.tags,
      properties: note.properties,
      frontmatter: {
        has: note.hasFrontmatter,
        raw: note.frontmatterRaw,
      },
      links: note.links,
      size: note.size,
      mtime: note.mtime,
      ctime: note.ctime,
    });
  }

  if ((pathname === '/api/note/write' || pathname === '/api/note') && method === 'POST') {
    const body = await readJson(req);
    return sendJson(res, 200, writeNote(body.path, body.content));
  }

  if (pathname === '/api/note/create' && method === 'POST') {
    const body = await readJson(req);
    const created = createNote(body.path || body.name, body.content);
    return sendJson(res, 200, created);
  }

  if (pathname === '/api/note/rename' && method === 'POST') {
    const body = await readJson(req);
    const result = renameNote(body.path, body.newPath, Boolean(body.updateLinks));
    return sendJson(res, 200, result);
  }

  if (pathname === '/api/note/delete' && method === 'POST') {
    const body = await readJson(req);
    return sendJson(res, 200, sendToTrash(body.path));
  }

  if (pathname === '/api/note/duplicate' && method === 'POST') {
    const body = await readJson(req);
    return sendJson(res, 200, duplicateNote(body.path));
  }

  if (pathname === '/api/note/daily' && method === 'POST') {
    const body = await readJson(req);
    return sendJson(res, 200, createDailyNote(body.date));
  }

  if (pathname === '/api/folder/create' && method === 'POST') {
    const body = await readJson(req);
    return sendJson(res, 200, createFolder(body.path));
  }

  if (pathname === '/api/folder/rename' && method === 'POST') {
    const body = await readJson(req);
    return sendJson(res, 200, renameFolder(body.path, body.newPath));
  }

  if (pathname === '/api/folder/delete' && method === 'POST') {
    const body = await readJson(req);
    return sendJson(res, 200, sendToTrash(body.path));
  }

  if (pathname === '/api/search' && method === 'GET') {
    return sendJson(res, 200, { results: searchVault(searchParams.get('q')) });
  }

  if (pathname === '/api/tags' && method === 'GET') {
    return sendJson(res, 200, { tags: collectTags() });
  }

  if (pathname === '/api/backlinks' && method === 'GET') {
    const rel = sanitizeRelative(searchParams.get('path'));
    return sendJson(res, 200, backlinksFor(rel));
  }

  if (pathname === '/api/graph' && method === 'GET') {
    return sendJson(res, 200, buildGraph());
  }

  if (pathname === '/api/resolve' && method === 'GET') {
    const note = resolveTarget(searchParams.get('target'));
    return sendJson(res, 200, { note: note ? noteSummary(note) : null });
  }

  if (pathname === '/api/random' && method === 'GET') {
    const notes = getIndex();
    if (!notes.length) throw httpError(404, 'В хранилище нет заметок');
    const note = notes[Math.floor(Math.random() * notes.length)];
    return sendJson(res, 200, { path: note.path });
  }

  if (pathname === '/api/file' && method === 'GET') {
    const rel = sanitizeRelative(searchParams.get('path'));
    const abs = resolveVaultPath(rel);
    if (!pathExists(abs) || !fs.statSync(abs).isFile()) throw httpError(404, 'Файл не найден');
    const ext = path.extname(abs).toLowerCase();
    const data = fs.readFileSync(abs);
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Length': data.length,
      'Cache-Control': 'private, max-age=3600',
      'Content-Disposition': 'inline',
    });
    return res.end(data);
  }

  throw httpError(404, 'Неизвестный API-метод');
}

// ============================
// Static files and request routing
// ============================

function serveStatic(req, res, pathname) {
  let relative = decodeURIComponent(pathname);
  if (relative === '/' || relative === '') relative = '/index.html';
  const abs = path.normalize(path.join(PUBLIC_DIR, relative.replace(/^\/+/, '')));
  if (abs !== PUBLIC_DIR && !abs.startsWith(PUBLIC_DIR + path.sep)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Forbidden');
  }
  if (!pathExists(abs) || !fs.statSync(abs).isFile()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Not found');
  }
  const ext = path.extname(abs).toLowerCase();
  const data = fs.readFileSync(abs);
  res.writeHead(200, {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Content-Length': data.length,
    'Cache-Control': 'no-cache',
  });
  res.end(data);
}

async function handleRequest(req, res) {
  const method = (req.method || 'GET').toUpperCase();
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return res.end();
  }

  let parsed;
  try {
    parsed = new URL(req.url || '/', 'http://localhost');
  } catch {
    return sendJson(res, 400, { error: 'Некорректный URL' });
  }

  try {
    if (parsed.pathname.startsWith('/api/')) {
      return await handleApi(req, res, parsed.pathname, parsed.searchParams);
    }
    return serveStatic(req, res, parsed.pathname);
  } catch (err) {
    const status = err && err.status ? err.status : 500;
    if (status >= 500) console.error(err);
    return sendJson(res, status, { error: err && err.message ? err.message : String(err) });
  }
}

initVault();

const server = http.createServer(handleRequest);

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Порт ${PORT} уже занят. Закройте другое окно Bedrock Notes.`);
    process.exit(1);
  }
  throw err;
});

server.listen(PORT, HOST, () => {
  console.log('');
  console.log('  Bedrock Notes');
  console.log(`  http://${HOST}:${PORT}/`);
  console.log(`  Хранилище: ${vaultDir}`);
  console.log('');
});

module.exports = { server, getVaultDir: () => vaultDir };



