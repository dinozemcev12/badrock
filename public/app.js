/* Bedrock Notes — frontend application */
'use strict';

/* ==========================================================================
   Tiny DOM + utility helpers
   ========================================================================== */

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
const APP = $('#app');

const ICONS = {
  gem: '<path d="M12 2.5 3 9.5 12 21.5 21 9.5Z"/><path d="M3 9.5h18"/><path d="m7.8 9.5 4.2 12 4.2-12"/>',
  'pencil-plus': '<path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/>',
  graph: '<circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="7" r="2.5"/><circle cx="12" cy="18" r="2.5"/><path d="M8.5 6.4 15.5 7M7.2 8.2l3.6 7.5M16.6 9.1l-3.3 6.7"/>',
  calendar: '<rect x="3" y="4.5" width="18" height="16" rx="2"/><path d="M8 2.5v4M16 2.5v4M3 9.5h18"/>',
  shuffle: '<path d="M3 6h3.5c1.6 0 2.7.8 3.6 2l4.8 8c.9 1.2 2 2 3.6 2H21"/><path d="M3 18h3.5c1.6 0 2.7-.8 3.6-2l4.8-8c.9-1.2 2-2 3.6-2H21"/><path d="m18 3 3 3-3 3M18 15l3 3-3 3"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 1-1 1.7v.5"/><path d="M12 17.5h.01"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>',
  files: '<path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H10l2 2h5.5A2.5 2.5 0 0 1 20 8.5v9A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5Z"/>',
  cloud: '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>',
  file: '<path d="M14 2.5H7a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7.5Z"/><path d="M14 2.5v5h5"/>',
  folder: '<path d="M3.5 7A2.5 2.5 0 0 1 6 4.5h3.2l2 2H18A2.5 2.5 0 0 1 20.5 9v8A2.5 2.5 0 0 1 18 19.5H6A2.5 2.5 0 0 1 3.5 17Z"/>',
  'folder-open': '<path d="M3.5 7A2.5 2.5 0 0 1 6 4.5h3.2l2 2H18A2.5 2.5 0 0 1 20.5 9v1"/><path d="M3.5 10.5h17l-2.2 7.2a2 2 0 0 1-1.9 1.3H5.4a2 2 0 0 1-1.9-1.3Z"/>',
  'folder-plus': '<path d="M3.5 7A2.5 2.5 0 0 1 6 4.5h3.2l2 2H18A2.5 2.5 0 0 1 20.5 9v8A2.5 2.5 0 0 1 18 19.5H6A2.5 2.5 0 0 1 3.5 17Z"/><path d="M12 10.5v5M9.5 13h5"/>',
  'chevron-down': '<path d="m6 9 6 6 6-6"/>',
  'chevron-right': '<path d="m9 6 6 6-6 6"/>',
  'chevron-up': '<path d="m6 15 6-6 6 6"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9Z"/>',
  more: '<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>',
  'panel-left': '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>',
  'panel-right': '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M15 4v16"/>',
  link: '<path d="M10 13.5a4 4 0 0 0 5.7 0l2.8-2.8a4 4 0 1 0-5.7-5.7L11.5 6.3"/><path d="M14 10.5a4 4 0 0 0-5.7 0l-2.8 2.8a4 4 0 1 0 5.7 5.7l1.3-1.3"/>',
  tag: '<path d="M3.5 12.5V5A1.5 1.5 0 0 1 5 3.5h7.5l8 8-8.5 8.5Z"/><circle cx="8" cy="8" r="1.2"/>',
  command: '<path d="M9 9v6M15 9v6M9 9H7.5a2.5 2.5 0 1 1 2.5-2.5V9M15 9h1.5a2.5 2.5 0 1 0-2.5-2.5V9M9 15H7.5a2.5 2.5 0 1 0 2.5 2.5V15M15 15h1.5a2.5 2.5 0 1 1-2.5 2.5V15"/>',
  trash: '<path d="M4 7h16M9 7V4.5h6V7M6 7l1 13h10l1-13M10 11v5M14 11v5"/>',
  edit: '<path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 20h16"/>',
  check: '<path d="m4 12 5 5L20 6"/>',
  refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
  sort: '<path d="M8 6h12M8 12h9M8 18h6"/><path d="M4 5v14M2 17l2 2 2-2"/>',
  collapse: '<path d="m7 20 5-5 5 5M7 4l5 5 5-5"/>',
  'zoom-in': '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6M11 8v6M8 11h6"/>',
  'zoom-out': '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6M8 11h6"/>',
  maximize: '<path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"/>',
  type: '<path d="M4 6h16M9 6v14M15 6v14"/>',
  columns: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 4v16"/>',
  book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5Z"/><path d="M4 18.5A2.5 2.5 0 0 1 6.5 16H20"/>',
  pencil: '<path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M20 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5"/>',
  'arrow-left': '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  'arrow-right': '<path d="M5 12h14M13 6l6 6-6 6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.5h.01"/>',
  alert: '<path d="M12 3 2.5 20h19Z"/><path d="M12 9v4M12 17h.01"/>',
  list: '<path d="M9 6h12M9 12h12M9 18h12"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>',
  'file-plus': '<path d="M14 2.5H7a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7.5Z"/><path d="M14 2.5v5h5M12 11v6M9 14h6"/>',
  locate: '<circle cx="12" cy="12" r="7"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="2"/>',
  save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/><path d="M7 3v6h9M7 21v-7h10v7"/>',
  history: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/><path d="M12 8v4l3 2"/>',
  hash: '<path d="M9 3 7 21M17 3l-2 18M4 8h17M3 16h17"/>',
};

function icon(name, cls = '') {
  const body = ICONS[name] || ICONS.file;
  return `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

function mountIcons(root = document) {
  $$('[data-icon]', root).forEach((node) => {
    const name = node.getAttribute('data-icon');
    if (name) node.innerHTML = icon(name);
  });
}

function esc(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[ch]);
}
const attr = esc;

function debounce(fn, delay) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function plural(n, one, few, many) {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (last > 1 && last < 5) return few;
  if (last === 1) return one;
  return many;
}

function formatDate(iso) {
  if (!iso) return '—';
  try {
    const date = new Date(iso);
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return '—';
  }
}

function relativeTime(iso) {
  if (!iso) return '—';
  const timestamp = new Date(iso).getTime();
  if (!Number.isFinite(timestamp)) return '—';
  const diff = Date.now() - timestamp;
  if (diff < 60 * 1000) return 'только что';
  if (diff < 60 * 60 * 1000) {
    const minutes = Math.round(diff / 60000);
    return `${minutes} ${plural(minutes, 'минуту', 'минуты', 'минут')} назад`;
  }
  if (diff < 24 * 60 * 60 * 1000) {
    const hours = Math.round(diff / 3600000);
    return `${hours} ${plural(hours, 'час', 'часа', 'часов')} назад`;
  }
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    const days = Math.round(diff / 86400000);
    return `${days} ${plural(days, 'день', 'дня', 'дней')} назад`;
  }
  return formatDate(iso);
}

function bytesLabel(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 Б';
  const units = ['Б', 'КБ', 'МБ', 'ГБ'];
  let index = 0;
  let value = bytes;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value >= 10 || index === 0 ? Math.round(value) : value.toFixed(1)} ${units[index]}`;
}

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage may be unavailable */
  }
}

function isImagePath(value) {
  return /\.(png|jpe?g|gif|svg|webp|bmp|avif)$/i.test(String(value).split('#')[0].split('|')[0]);
}

function fileUrl(path) {
  return `/api/file?path=${encodeURIComponent(path)}`;
}

function splitFrontmatterClient(raw) {
  const match = String(raw).match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/);
  if (!match) return { has: false, frontmatterRaw: '', body: String(raw) };
  return { has: true, frontmatterRaw: match[1], body: String(raw).slice(match[0].length) };
}

function countWords(text) {
  const { body } = splitFrontmatterClient(text);
  const trimmed = body.trim();
  return trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0;
}

function slugifyHeading(text, used) {
  let base = String(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-');
  if (!base) base = 'heading';
  let slug = base;
  let i = 2;
  while (used.has(slug)) {
    slug = `${base}-${i}`;
    i += 1;
  }
  used.add(slug);
  return slug;
}

function makeSlugger() {
  const used = new Set();
  return (text) => slugifyHeading(text, used);
}

function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand('copy');
  } finally {
    textarea.remove();
  }
  return Promise.resolve();
}

function toast(message, kind = '') {
  const host = $('#toasts');
  const node = document.createElement('div');
  node.className = `toast ${kind}`;
  node.textContent = message;
  host.appendChild(node);
  setTimeout(() => {
    node.classList.add('leaving');
    setTimeout(() => node.remove(), 180);
  }, kind === 'error' ? 5200 : 3000);
}

/* ==========================================================================
   Settings + state
   ========================================================================== */

const DEFAULT_SETTINGS = {
  theme: 'dark',
  accent: 'gray',
  fontSize: 16,
  readable: true,
  autoSave: 800,
  spellcheck: true,
  sort: 'name',
  mode: 'edit',
  leftOpen: true,
  rightOpen: false,
  rightTab: 'backlinks',
  leftWidth: 264,
  rightWidth: 300,
  graphLabels: true,
};

let settings = { ...DEFAULT_SETTINGS, ...loadJSON('bedrock.settings', {}) };

const state = {
  vault: null,
  vaultKey: '',
  tree: [],
  treeIndex: new Map(),
  linkIndex: new Map(),
  noteList: [],
  stats: { notes: 0, folders: 0, tags: 0, words: 0 },
  tabs: [],
  activeId: null,
  panel: 'files',
  filter: '',
  sort: settings.sort,
  collapsed: new Set(),
  bookmarks: [],
  recent: [],
  savedTabs: [],
  savedActive: null,
  search: { query: '', results: [], seq: 0 },
  tags: [],
  activeRight: settings.rightTab,
  graphTabId: null,
  graph: null,
  closedTabs: [],
  backlinksSeq: 0,
  modal: null,
  suggest: null,
  palette: { open: false, mode: 'all', items: [], index: 0, query: '' },
  restoring: false,
  saveTimers: new Map(),
  editorRenderQueued: false,
  readingTimer: null,
};

/* ==========================================================================
   API client
   ========================================================================== */

async function request(url, options = {}) {
  const response = await fetch(url, options);
  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  if (!response.ok) {
    throw new Error((data && data.error) || `Ошибка ${response.status}`);
  }
  return data;
}

const jsonOptions = (method, body) => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

const api = {
  info: () => request('/api/vault/info'),
  selectVault: (path) => request('/api/vault/select', jsonOptions('POST', { path })),
  tree: () => request('/api/vault/tree'),
  note: (path) => request(`/api/note?path=${encodeURIComponent(path)}`),
  write: (path, content) => request('/api/note/write', jsonOptions('POST', { path, content })),
  create: (path, content) => request('/api/note/create', jsonOptions('POST', { path, content })),
  rename: (path, newPath, updateLinks) =>
    request('/api/note/rename', jsonOptions('POST', { path, newPath, updateLinks })),
  remove: (path) => request('/api/note/delete', jsonOptions('POST', { path })),
  duplicate: (path) => request('/api/note/duplicate', jsonOptions('POST', { path })),
  daily: (date) => request('/api/note/daily', jsonOptions('POST', { date })),
  createFolder: (path) => request('/api/folder/create', jsonOptions('POST', { path })),
  renameFolder: (path, newPath) =>
    request('/api/folder/rename', jsonOptions('POST', { path, newPath })),
  removeFolder: (path) => request('/api/folder/delete', jsonOptions('POST', { path })),
  search: (q) => request(`/api/search?q=${encodeURIComponent(q)}`),
  tags: () => request('/api/tags'),
  backlinks: (path) => request(`/api/backlinks?path=${encodeURIComponent(path)}`),
  graph: () => request('/api/graph'),
  resolve: (target) => request(`/api/resolve?target=${encodeURIComponent(target)}`),
  random: () => request('/api/random'),
  syncStatus: () => request('/api/sync/status'),
  syncConfig: (cfg) => request('/api/sync/config', jsonOptions('POST', cfg)),
  syncAuthUrl: (port) => request(`/api/sync/auth-url${port ? `?port=${port}` : ''}`),
  syncRun: () => request('/api/sync/run', jsonOptions('POST', {})),
  syncDisconnect: () => request('/api/sync/disconnect', jsonOptions('POST', {})),
};

/* ==========================================================================
   Appearance
   ========================================================================== */

function resolvedTheme() {
  if (settings.theme === 'system') {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }
  return settings.theme;
}

let graphThemeCache = null;

function applySettings() {
  graphThemeCache = null;
  const root = document.documentElement;
  root.dataset.theme = resolvedTheme();
  root.dataset.accent = settings.accent;
  root.style.setProperty('--content-size', `${settings.fontSize}px`);
  root.style.setProperty('--left-width', `${settings.leftWidth}px`);
  root.style.setProperty('--right-width', `${settings.rightWidth}px`);
  root.classList.toggle('no-readable', !settings.readable);

  APP.classList.toggle('left-collapsed', !settings.leftOpen);
  APP.classList.toggle('right-open', Boolean(settings.rightOpen));

  const editor = $('#editor');
  if (editor) editor.spellcheck = Boolean(settings.spellcheck);

  const themeButtonIcon = $('[data-action="toggle-theme"] [data-icon]');
  if (themeButtonIcon) themeButtonIcon.innerHTML = icon(resolvedTheme() === 'dark' ? 'sun' : 'moon');

  $$('.right-tab').forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.right === state.activeRight);
  });

  scheduleEditorResize();
}

function saveSettings() {
  saveJSON('bedrock.settings', settings);
}

function toggleTheme() {
  const next = resolvedTheme() === 'dark' ? 'light' : 'dark';
  settings.theme = next;
  applySettings();
  saveSettings();
  if (state.activeRight === 'properties') renderRightPane();
}

/* ==========================================================================
   Vault UI state
   ========================================================================== */

function uiStorageKey() {
  return `bedrock.ui:${state.vaultKey}`;
}

function loadVaultUi() {
  const ui = loadJSON(uiStorageKey(), {});
  state.collapsed = new Set(Array.isArray(ui.collapsed) ? ui.collapsed : []);
  state.bookmarks = Array.isArray(ui.bookmarks) ? ui.bookmarks : [];
  state.recent = Array.isArray(ui.recent) ? ui.recent : [];
  state.savedTabs = Array.isArray(ui.tabs) ? ui.tabs : [];
  state.savedActive = typeof ui.active === 'string' ? ui.active : null;
  state.activeRight = ui.rightTab || settings.rightTab || 'backlinks';
  state.sort = ui.sort || settings.sort || 'name';
  if (typeof ui.leftOpen === 'boolean') settings.leftOpen = ui.leftOpen;
  if (typeof ui.rightOpen === 'boolean') settings.rightOpen = ui.rightOpen;
}

function saveVaultUi() {
  if (!state.vaultKey) return;
  const active = activeTab();
  saveJSON(uiStorageKey(), {
    collapsed: [...state.collapsed],
    bookmarks: state.bookmarks,
    recent: state.recent,
    tabs: state.tabs.filter((tab) => tab.type === 'note').map((tab) => tab.path),
    active: active && active.type === 'note' ? active.path : null,
    rightTab: state.activeRight,
    leftOpen: Boolean(settings.leftOpen),
    rightOpen: Boolean(settings.rightOpen),
    sort: state.sort,
  });
}

/* ==========================================================================
   File tree
   ========================================================================== */

function rebuildTreeIndex() {
  state.treeIndex.clear();
  state.linkIndex.clear();
  state.noteList = [];

  const walk = (nodes) => {
    for (const node of nodes) {
      if (node.type === 'folder') {
        walk(node.children || []);
      } else {
        state.noteList.push(node);
        state.treeIndex.set(node.path, node);
        const keys = [
          node.path,
          node.path.replace(/\.md$/i, ''),
          node.name,
          node.title,
          ...(node.aliases || []),
        ];
        for (const key of keys) {
          if (!key) continue;
          const normalized = String(key).trim().replace(/\.md$/i, '').toLowerCase();
          if (normalized && !state.linkIndex.has(normalized)) {
            state.linkIndex.set(normalized, node);
          }
        }
      }
    }
  };
  walk(state.tree);
  state.noteList.sort((a, b) => a.path.localeCompare(b.path, 'ru', { numeric: true }));
}

function resolveNote(target) {
  const raw = String(target || '').trim().replace(/^!?\[\[|\]\]$/g, '');
  if (!raw) return null;
  const key = raw.split('|')[0].split('#')[0].trim().replace(/\.md$/i, '').toLowerCase();
  if (!key) return null;
  if (state.linkIndex.has(key)) return state.linkIndex.get(key);
  if (key.includes('/')) {
    const base = key.split('/').pop();
    if (state.linkIndex.has(base)) return state.linkIndex.get(base);
  }
  return null;
}

function allFolders() {
  const folders = [{ path: '', name: 'Корень хранилища' }];
  const walk = (nodes) => {
    for (const node of nodes) {
      if (node.type === 'folder') {
        folders.push({ path: node.path, name: node.path });
        walk(node.children || []);
      }
    }
  };
  walk(state.tree);
  return folders;
}

function folderOptions(selected) {
  return allFolders()
    .map(
      (folder) =>
        `<option value="${attr(folder.path)}" ${folder.path === selected ? 'selected' : ''}>${esc(
          folder.name
        )}</option>`
    )
    .join('');
}

function folderParent(path) {
  const index = path.lastIndexOf('/');
  return index > 0 ? path.slice(0, index) : '';
}

function folderName(path) {
  return path.split('/').pop();
}

function isDescendantPath(path, parent) {
  return path === parent || path.startsWith(`${parent}/`);
}

function expandFolderPath(path) {
  let current = '';
  for (const part of String(path || '').split('/')) {
    if (!part) continue;
    current = current ? `${current}/${part}` : part;
    state.collapsed.delete(current);
  }
}

function renderTree() {
  const container = $('#fileTree');
  if (!container) return;
  if (!state.tree.length) {
    container.innerHTML = '<div class="tree-empty">Хранилище пустое.<br>Создайте первую заметку.</div>';
    return;
  }
  const filter = state.filter.trim().toLowerCase();
  const result = renderTreeNodes(state.tree, 0, filter);
  container.innerHTML =
    result.html || `<div class="tree-empty">Ничего не найдено по запросу «${esc(state.filter)}»</div>`;
}

function renderTreeNodes(nodes, depth, filter) {
  let html = '';
  let hasMatch = false;

  for (const node of nodes) {
    if (node.type === 'folder') {
      const selfMatch = !filter || node.name.toLowerCase().includes(filter) || node.path.toLowerCase().includes(filter);
      const children = filter ? renderTreeNodes(node.children, depth + 1, filter) : null;
      if (filter && !selfMatch && !children.hasMatch) continue;
      const collapsed = !filter && state.collapsed.has(node.path);
      hasMatch = true;
      html += `<div class="tree-row folder" data-type="folder" data-path="${attr(node.path)}" style="--depth:${depth}" title="${attr(node.path)}" role="treeitem" aria-expanded="${!collapsed}">
        <button class="tree-arrow" data-toggle-folder="${attr(node.path)}" tabindex="-1">${icon(
        collapsed ? 'chevron-right' : 'chevron-down'
      )}</button>
        <span class="tree-icon">${icon(collapsed ? 'folder' : 'folder-open')}</span>
        <span class="tree-label">${esc(node.name)}</span>
        <button class="tree-more" data-menu-path="${attr(node.path)}" data-menu-type="folder" title="Действия">${icon(
        'more'
      )}</button>
      </div>`;
      if (!collapsed) {
        const inner = filter ? children.html : renderTreeNodes(node.children, depth + 1, '').html;
        html += `<div class="tree-children">${inner}</div>`;
      }
    } else {
      if (
        filter &&
        !node.name.toLowerCase().includes(filter) &&
        !node.path.toLowerCase().includes(filter) &&
        !(node.aliases || []).some((alias) => alias.toLowerCase().includes(filter))
      ) {
        continue;
      }
      hasMatch = true;
      const active = activeTab() && activeTab().type === 'note' && activeTab().path === node.path;
      html += `<div class="tree-row note ${active ? 'active' : ''}" data-type="note" data-path="${attr(
        node.path
      )}" style="--depth:${depth}" title="${attr(node.path)}" role="treeitem">
        <span class="tree-arrow blank"></span>
        <span class="tree-icon">${icon('file')}</span>
        <span class="tree-label">${esc(node.name)}</span>
        <button class="tree-more" data-menu-path="${attr(node.path)}" data-menu-type="note" title="Действия">${icon(
        'more'
      )}</button>
      </div>`;
    }
  }
  return { html, hasMatch };
}

function toggleFolder(path, force) {
  if (state.collapsed.has(path)) {
    if (force === false) return;
    state.collapsed.delete(path);
  } else {
    if (force === true) return;
    state.collapsed.add(path);
  }
  renderTree();
  saveVaultUi();
}

async function refreshTree({ silent = false } = {}) {
  try {
    const data = await api.tree();
    state.vault = data.vault;
    state.tree = sortTree(data.tree || []);
    state.stats = data.stats;
    rebuildTreeIndex();

    const name = data.vault.name;
    $('#vaultName').textContent = name;
    $('#statusVault').textContent = name;
    $('#sidebarFooter').textContent = `${data.stats.notes} ${plural(
      data.stats.notes,
      'заметка',
      'заметки',
      'заметок'
    )} · ${data.stats.folders} ${plural(data.stats.folders, 'папка', 'папки', 'папок')}`;
    document.title = `${name} — Badrock`;

    renderTree();
    renderTags();
    renderBookmarks();
    updateTreeActiveState();
    if (!state.tabs.length) renderMain();
    loadTags();
    if (state.tabs.some((tab) => tab.type === 'graph')) refreshGraphData();
    return data;
  } catch (err) {
    if (!silent) toast(`Не удалось загрузить хранилище: ${err.message}`, 'error');
    throw err;
  }
}

function updateTreeActiveState() {
  const tab = activeTab();
  $$('.tree-row.note').forEach((row) => {
    row.classList.toggle('active', Boolean(tab && tab.type === 'note' && row.dataset.path === tab.path));
  });
}

/* ==========================================================================
   Tabs
   ========================================================================== */

function activeTab() {
  return state.tabs.find((tab) => tab.id === state.activeId) || null;
}

function tabForPath(path) {
  return state.tabs.find((tab) => tab.type === 'note' && tab.path === path) || null;
}

function makeNoteTab(path) {
  const node = state.treeIndex.get(path);
  const savedMode = activeTab() && activeTab().type === 'note' ? activeTab().mode : settings.mode;
  return {
    id: `note:${path}`,
    type: 'note',
    path,
    title: node ? node.name : path.split('/').pop().replace(/\.md$/i, ''),
    content: '',
    savedContent: '',
    meta: null,
    loaded: false,
    loading: false,
    dirty: false,
    saving: false,
    pendingSave: false,
    mode: savedMode || 'edit',
    scrollTop: 0,
    readScrollTop: 0,
    selection: 0,
    backlinks: null,
    backlinksLoaded: false,
    headings: [],
    loadError: null,
  };
}

async function openNote(path, options = {}) {
  const { activate = true, newTab = false } = options;
  if (!path) return;

  const existing = tabForPath(path);
  if (existing && !newTab) {
    if (activate) activateTab(existing.id);
    return existing;
  }
  if (existing && newTab) {
    if (activate) activateTab(existing.id);
    return existing;
  }

  if (!state.treeIndex.has(path)) {
    toast(`Заметка не найдена: ${path}`, 'error');
    return null;
  }

  const tab = makeNoteTab(path);
  state.tabs.push(tab);

  if (activate) {
    flushCurrentTab();
    state.activeId = tab.id;
    renderTabs();
    renderMain();
    renderTree();
  }

  if (!state.restoring) {
    state.recent = [path, ...state.recent.filter((item) => item !== path)].slice(0, 12);
    saveVaultUi();
  }
  await loadTab(tab);
  return tab;
}

async function loadTab(tab) {
  if (tab.loaded || tab.loading) return;
  tab.loading = true;
  try {
    const data = await api.note(tab.path);
    tab.content = data.raw;
    tab.savedContent = data.raw;
    tab.meta = data;
    tab.title = data.name;
    tab.loaded = true;
    tab.loadError = null;
    tab.backlinks = null;
    tab.backlinksLoaded = false;
    if (state.activeId === tab.id) {
      populateActiveNote();
      renderTabs();
      renderTree();
    }
  } catch (err) {
    tab.loadError = err.message;
    toast(`Не удалось открыть заметку: ${err.message}`, 'error');
    closeTab(tab.id, { force: true });
  } finally {
    tab.loading = false;
  }
}

function activateTab(id) {
  if (state.activeId === id) return;
  closeSuggest();
  flushCurrentTab();
  state.activeId = id;
  renderTabs();
  renderMain();
  updateTreeActiveState();
  saveVaultUi();
}

function flushCurrentTab() {
  const tab = activeTab();
  if (!tab || tab.type !== 'note') return;
  if (tab.dirty) saveTab(tab);
}

async function closeTab(id, options = {}) {
  const index = state.tabs.findIndex((tab) => tab.id === id);
  if (index === -1) return;
  const tab = state.tabs[index];
  closeSuggest();

  if (tab.type === 'note' && tab.dirty && !options.force) {
    await saveTab(tab);
  }

  state.closedTabs.push({ type: tab.type, path: tab.path });
  if (state.closedTabs.length > 15) state.closedTabs.shift();

  state.tabs.splice(index, 1);
  if (state.activeId === id) {
    const next = state.tabs[Math.max(0, index - 1)] || state.tabs[0] || null;
    state.activeId = next ? next.id : null;
    if (next) {
      renderTabs();
      renderMain();
      updateTreeActiveState();
    } else {
      renderTabs();
      renderMain();
      renderTree();
    }
  } else {
    renderTabs();
  }
  saveVaultUi();
}

async function closeActiveTab() {
  const tab = activeTab();
  if (!tab) return;
  await closeTab(tab.id);
}

function cycleTab(direction) {
  if (state.tabs.length < 2) return;
  const index = state.tabs.findIndex((tab) => tab.id === state.activeId);
  const next = (index + direction + state.tabs.length) % state.tabs.length;
  activateTab(state.tabs[next].id);
}

function reopenClosedTab() {
  const last = state.closedTabs.pop();
  if (!last) return;
  if (last.type === 'graph') {
    openGraph();
  } else if (last.path && state.treeIndex.has(last.path)) {
    openNote(last.path);
  } else {
    toast('Заметка больше не существует', 'error');
  }
}

function renderTabs() {
  const host = $('#tabs');
  if (!host) return;

  host.innerHTML = state.tabs
    .map((tab) => {
      const active = tab.id === state.activeId;
      if (tab.type === 'graph') {
        return `<div class="tab ${active ? 'active' : ''}" data-tab-id="${attr(tab.id)}" title="Граф связей">
          ${icon('graph')}
          <span class="tab-title">Граф связей</span>
          <button class="tab-close" data-close-tab="${attr(tab.id)}" title="Закрыть">${icon('x')}</button>
        </div>`;
      }
      return `<div class="tab ${active ? 'active' : ''} ${tab.dirty ? 'dirty' : ''}" data-tab-id="${attr(
        tab.id
      )}" title="${attr(tab.path)}">
        ${icon('file')}
        <span class="tab-title">${esc(tab.title)}</span>
        <span class="tab-dirty" title="Есть несохранённые изменения"></span>
        <button class="tab-close" data-close-tab="${attr(tab.id)}" title="Закрыть">${icon('x')}</button>
      </div>`;
    })
    .join('');

  const activeElement = host.querySelector('.tab.active');
  if (activeElement) activeElement.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

function updateTabDirtyState(tab) {
  const element = $(`.tab[data-tab-id="${CSS.escape(tab.id)}"]`);
  if (!element) return;
  element.classList.toggle('dirty', Boolean(tab.dirty));
  element.classList.toggle('saving', Boolean(tab.saving));
}

/* ==========================================================================
   Main view switching
   ========================================================================== */

function renderMain() {
  const noteView = $('#noteView');
  const graphView = $('#graphView');
  const emptyView = $('#emptyView');
  const tab = activeTab();

  if (!tab) {
    noteView.classList.add('hidden');
    graphView.classList.add('hidden');
    emptyView.classList.remove('hidden');
    $('#viewActions').classList.add('hidden');
    stopGraphLoop();
    renderBreadcrumbs(null);
    renderEmptyView();
    updateStatus();
    return;
  }

  $('#viewActions').classList.toggle('hidden', tab.type === 'graph');
  emptyView.classList.add('hidden');

  if (tab.type === 'graph') {
    noteView.classList.add('hidden');
    graphView.classList.remove('hidden');
    renderBreadcrumbs(tab);
    startGraphIfNeeded();
    updateStatus();
    return;
  }

  noteView.classList.remove('hidden');
  graphView.classList.add('hidden');
  stopGraphLoop();

  noteView.dataset.mode = tab.mode;
  $$('#modeSwitch button').forEach((button) => {
    button.classList.toggle('active', button.dataset.mode === tab.mode);
  });
  renderBreadcrumbs(tab);
  populateActiveNote();
}

function renderBreadcrumbs(tab) {
  const host = $('#breadcrumbs');
  if (!host) return;
  if (!tab) {
    host.innerHTML = '<span class="crumb current">Badrock</span>';
    return;
  }
  if (tab.type === 'graph') {
    host.innerHTML = `<span class="crumb current">${icon('graph')} Граф связей</span>`;
    return;
  }
  const parts = tab.path.split('/');
  host.innerHTML = parts
    .map((part, index) => {
      const current = index === parts.length - 1;
      const label = current ? part.replace(/\.md$/i, '') : part;
      return `${index > 0 ? `<span class="crumb-sep">${icon('chevron-right')}</span>` : ''}${
        current
          ? `<span class="crumb current">${esc(label)}</span>`
          : `<span class="crumb">${esc(label)}</span>`
      }`;
    })
    .join('');
}

function renderEmptyView() {
  const host = $('#emptyView');
  if (!host) return;

  const existingRecent = state.recent
    .map((path) => state.treeIndex.get(path))
    .filter(Boolean)
    .slice(0, 5);
  const recent = existingRecent.length ? existingRecent : state.noteList.slice(0, 5);

  const recentHtml = recent.length
    ? `<div class="empty-recent">
        <div class="empty-recent-title">Последние заметки</div>
        ${recent
          .map(
            (note) => `<div class="recent-row" data-path="${attr(note.path)}">
              ${icon('file')}
              <span>${esc(note.name)}</span>
              <span class="recent-path">${esc(note.path.split('/').slice(0, -1).join('/'))}</span>
            </div>`
          )
          .join('')}
      </div>`
    : '';

  host.innerHTML = `<div class="empty-inner">
    <div class="empty-gem"><img src="/icon.png" alt="Badrock" style="width:64px;height:64px;object-fit:contain;margin-bottom:8px;" /></div>
    <h1>Badrock</h1>
    <p>Локальное хранилище Markdown-заметок с графом связей, обратными ссылками и палитрой команд — в духе Obsidian.</p>
    <div class="empty-actions">
      <button class="btn primary" data-action="new-note">${icon('plus')} Новая заметка</button>
      <button class="btn" data-action="daily">${icon('calendar')} Ежедневная</button>
      <button class="btn" data-action="graph">${icon('graph')} Граф связей</button>
      <button class="btn" data-action="vault">${icon('folder')} Другое хранилище</button>
    </div>
    ${recentHtml}
    <div class="empty-hint">
      <kbd>Ctrl+P</kbd> — палитра команд · <kbd>Ctrl+O</kbd> — быстрый переход · <kbd>Ctrl+N</kbd> — новая заметка
    </div>
  </div>`;
}

/* ==========================================================================
   Editor
   ========================================================================== */

const editor = $('#editor');
const highlightLayer = $('#highlightLayer');
const editorScroll = $('#editorScroll');
const readingScroll = $('#readingScroll');
const readingView = $('#readingView');

function populateActiveNote() {
  const tab = activeTab();
  if (!tab || tab.type !== 'note') return;

  if (!tab.loaded) {
    editor.value = '';
    highlightLayer.innerHTML = '';
    readingView.innerHTML = tab.loadError
      ? `<p class="empty-note">Не удалось открыть заметку: ${esc(tab.loadError)}</p>`
      : '<p class="empty-note">Загрузка заметки…</p>';
    renderRightPane();
    updateStatus();
    return;
  }

  editor.value = tab.content;
  const caret = Math.min(tab.selection || 0, tab.content.length);
  try {
    editor.setSelectionRange(caret, caret);
  } catch {
    /* ignore */
  }
  renderHighlightNow();
  resizeEditorNow();

  const savedEditorScroll = tab.scrollTop;
  const savedReadingScroll = tab.readScrollTop;
  editorScroll.scrollTop = savedEditorScroll;
  readingScroll.scrollTop = savedReadingScroll;

  renderReadingView();
  renderOutline();
  renderProperties();
  loadBacklinks(tab);
  updateBookmarkButton();
  updateStatus();

  requestAnimationFrame(() => {
    if (tab.mode !== 'read') editorScroll.scrollTop = savedEditorScroll;
    if (tab.mode !== 'edit') readingScroll.scrollTop = savedReadingScroll;
  });
}

function makeProtector() {
  const tokens = [];
  return {
    put(html) {
      tokens.push(html);
      return `\uE100${String.fromCharCode(0xE200 + tokens.length - 1)}\uE101`;
    },
    restore(text) {
      return text.replace(/\uE100([\uE200-\uF8FF])\uE101/g, (match, code) => {
        const index = code.charCodeAt(0) - 0xE200;
        return tokens[index] == null ? '' : tokens[index];
      });
    },
  };
}

function highlightInline(line) {
  let text = esc(line);
  const protector = makeProtector();

  text = text.replace(/`[^`\n]+`/g, (match) =>
    protector.put(`<span class="hl-inline-code">${match}</span>`)
  );
  text = text.replace(/!?\[\[[^\]\n]+?\]\]/g, (match) =>
    protector.put(`<span class="hl-wikilink">${match}</span>`)
  );
  text = text.replace(/!?\[[^\]\n]*\]\([^)\n]+\)/g, (match) =>
    protector.put(`<span class="hl-mdlink">${match}</span>`)
  );
  text = text.replace(/(^|[\s(])(\[[ xX]\])/g, (match, prefix, box) => {
    const done = /x/i.test(box);
    return `${prefix}<span class="hl-checkbox ${done ? 'done' : ''}">${box}</span>`;
  });
  text = text.replace(/(\*\*|__)(.+?)\1/g, (match) =>
    protector.put(`<span class="hl-bold">${match}</span>`)
  );
  text = text.replace(/(^|[^*])\*([^*\n]+)\*/g, (match) =>
    protector.put(match.replace(/\*(.+)\*/, '<span class="hl-em">*$1*</span>'))
  );
  text = text.replace(/~~(.+?)~~/g, (match) =>
    protector.put(`<span class="hl-strike">${match}</span>`)
  );
  text = text.replace(/==(.+?)==/g, (match) => protector.put(`<span class="hl-mark">${match}</span>`));
  text = text.replace(/(^|\s)(#[\p{L}\p{N}_/-]+)/gu, (match, prefix, tag) => {
    return `${prefix}<span class="hl-tag">${tag}</span>`;
  });
  text = text.replace(/^(\s*)([-*+]|\d+\.)(\s)/, (match, indent, marker, space) => {
    return `${indent}<span class="hl-list-marker">${marker}</span>${space}`;
  });
  text = text.replace(/(https?:\/\/[^\s<]+)/g, '<span class="hl-url">$1</span>');

  return protector.restore(text);
}

function highlightFrontmatterLine(line) {
  let text = esc(line);
  text = text.replace(/^([^:\n]+)(:)(.*)$/, '<span class="hl-fm-key">$1</span>$2$3');
  return text;
}

function highlightMarkdown(text) {
  const lines = String(text).split('\n');
  const output = [];
  let inFence = false;
  let fenceMarker = '';
  let inFrontmatter = false;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const isFirst = index === 0 && /^---[ \t]*$/.test(line);

    if (isFirst) {
      inFrontmatter = true;
      output.push(`<div class="hl-line hl-fm">${highlightFrontmatterLine(line)}</div>`);
      continue;
    }
    if (inFrontmatter) {
      if (/^---[ \t]*$/.test(line)) {
        inFrontmatter = false;
        output.push(`<div class="hl-line hl-fm">${highlightFrontmatterLine(line)}</div>`);
      } else {
        output.push(`<div class="hl-line hl-fm">${highlightFrontmatterLine(line)}</div>`);
      }
      continue;
    }

    const fence = line.match(/^(\s*)(`{3,}|~{3,})(.*)$/);
    if (inFence) {
      if (
        fence &&
        fence[2][0] === fenceMarker[0] &&
        fence[2].length >= fenceMarker.length &&
        !fence[3].trim()
      ) {
        inFence = false;
        output.push(`<div class="hl-line hl-fence">${esc(line)}</div>`);
      } else {
        output.push(`<div class="hl-line hl-code-line">${esc(line)}</div>`);
      }
      continue;
    }
    if (fence) {
      inFence = true;
      fenceMarker = fence[2];
      output.push(`<div class="hl-line hl-fence">${esc(line)}</div>`);
      continue;
    }

    let cls = '';
    const heading = line.match(/^(#{1,6})\s/);
    if (heading) cls = `hl-h${heading[1].length}`;
    else if (/^\s*>/.test(line)) cls = 'hl-quote';
    else if (/^\s*([-*+]|\d+\.)\s/.test(line)) cls = 'hl-list';
    else if (/^\s*([-*_])\1{2,}\s*$/.test(line)) cls = 'hl-hr';

    output.push(`<div class="hl-line ${cls}">${highlightInline(line)}</div>`);
  }
  return output.join('');
}

function renderHighlightNow() {
  const tab = activeTab();
  if (!tab || tab.type !== 'note') {
    highlightLayer.innerHTML = '';
    return;
  }
  highlightLayer.innerHTML = highlightMarkdown(tab.content || '');
}

function queueHighlight() {
  if (state.editorRenderQueued) return;
  state.editorRenderQueued = true;
  requestAnimationFrame(() => {
    state.editorRenderQueued = false;
    renderHighlightNow();
  });
}

function resizeEditorNow() {
  if (!editor) return;
  editor.style.height = 'auto';
  const minHeight = Math.max(editorScroll.clientHeight || 0, 0);
  const height = Math.max(editor.scrollHeight, minHeight);
  editor.style.height = `${height}px`;
  highlightLayer.style.height = `${height}px`;
  highlightLayer.style.minHeight = `${height}px`;
}

const scheduleEditorResize = debounce(() => resizeEditorNow(), 30);

function onEditorInput() {
  const tab = activeTab();
  if (!tab || tab.type !== 'note') return;

  tab.content = editor.value;
  tab.selection = editor.selectionStart;
  tab.dirty = tab.content !== tab.savedContent;

  updateTabDirtyState(tab);
  queueHighlight();
  scheduleEditorResize();
  scheduleSave(tab);
  updateStatus();

  if (tab.mode === 'split') {
    clearTimeout(state.readingTimer);
    state.readingTimer = setTimeout(() => {
      if (activeTab() === tab) renderReadingView();
    }, 140);
  }

  clearTimeout(tab.outlineTimer);
  tab.outlineTimer = setTimeout(() => {
    if (activeTab() !== tab) return;
    renderOutline();
    renderProperties();
  }, 280);

  updateWikiSuggest();
}

/* ==========================================================================
   Saving
   ========================================================================== */

function setSaveState(kind, label) {
  const element = $('#statusSave');
  if (!element) return;
  element.className = `status-item save-state ${kind || ''}`.trim();
  element.innerHTML = `<span class="save-dot"></span><span>${esc(label)}</span>`;
}

function scheduleSave(tab, delay) {
  if (!tab || tab.type !== 'note') return;
  const wait = delay == null ? settings.autoSave : delay;
  clearTimeout(state.saveTimers.get(tab.id));
  if (!settings.autoSave && wait === settings.autoSave) {
    if (state.activeId === tab.id) setSaveState('dirty', 'Не сохранено');
    return;
  }
  const timer = setTimeout(() => saveTab(tab), Math.max(120, wait));
  state.saveTimers.set(tab.id, timer);
}

async function saveTab(tab) {
  if (!tab || tab.type !== 'note' || !tab.loaded) return;
  if (tab.saving) {
    tab.pendingSave = true;
    return;
  }
  if (!tab.dirty) return;

  clearTimeout(state.saveTimers.get(tab.id));
  tab.saving = true;
  if (state.activeId === tab.id) setSaveState('saving', 'Сохранение…');
  const contentToSave = tab.content;

  try {
    await api.write(tab.path, contentToSave);
    tab.savedContent = contentToSave;
    tab.dirty = tab.content !== tab.savedContent;
    tab.saving = false;
    updateTabDirtyState(tab);
    if (state.activeId === tab.id) {
      if (tab.dirty) setSaveState('dirty', 'Не сохранено');
      else setSaveState('saved', 'Сохранено');
      updateStatus();
    }
    if (tab.backlinksLoaded) {
      clearTimeout(tab.backlinksTimer);
      tab.backlinksTimer = setTimeout(() => loadBacklinks(tab, true), 900);
    }
  } catch (err) {
    tab.saving = false;
    if (state.activeId === tab.id) setSaveState('error', 'Ошибка сохранения');
    toast(`Не удалось сохранить заметку: ${err.message}`, 'error');
  } finally {
    if (tab.pendingSave) {
      tab.pendingSave = false;
      scheduleSave(tab, 180);
    }
  }
}

async function saveActiveNow() {
  const tab = activeTab();
  if (!tab || tab.type !== 'note') return;
  await saveTab(tab);
  if (!tab.dirty) setSaveState('saved', 'Сохранено');
}

/* ==========================================================================
   Status bar and mode
   ========================================================================== */

function updateStatus() {
  const tab = activeTab();
  const wordsElement = $('#statusWords');
  const charsElement = $('#statusChars');
  const backlinksElement = $('#statusBacklinks');
  const modeElement = $('#statusMode');

  if (!tab) {
    wordsElement.textContent = '0 слов';
    charsElement.textContent = '0 символов';
    backlinksElement.textContent = '0 ссылок';
    modeElement.textContent = 'Редактор';
    setSaveState('', 'Готово');
    return;
  }

  if (tab.type === 'graph') {
    const nodeCount = state.graph ? state.graph.nodes.length : 0;
    const edgeCount = state.graph ? state.graph.edges.length : 0;
    wordsElement.textContent = `${nodeCount} ${plural(nodeCount, 'заметка', 'заметки', 'заметок')}`;
    charsElement.textContent = `${edgeCount} ${plural(edgeCount, 'связь', 'связи', 'связей')}`;
    backlinksElement.textContent = 'Граф связей';
    modeElement.textContent = 'Граф';
    setSaveState('', 'Локально');
    return;
  }

  const words = countWords(tab.content);
  const chars = tab.content.length;
  wordsElement.textContent = `${words} ${plural(words, 'слово', 'слова', 'слов')}`;
  charsElement.textContent = `${chars} ${plural(chars, 'символ', 'символа', 'символов')}`;

  const count = tab.backlinks ? tab.backlinks.backlinks.length : 0;
  backlinksElement.textContent = `${count} ${plural(count, 'ссылка', 'ссылки', 'ссылок')}`;

  modeElement.textContent =
    tab.mode === 'read' ? 'Чтение' : tab.mode === 'split' ? 'Разделённый вид' : 'Редактор';

  if (tab.saving) setSaveState('saving', 'Сохранение…');
  else if (tab.dirty) setSaveState('dirty', 'Не сохранено');
  else setSaveState('saved', 'Сохранено');
}

function setMode(mode) {
  const tab = activeTab();
  if (!tab || tab.type !== 'note') return;

  if (mode === 'toggle') mode = tab.mode === 'read' ? 'edit' : 'read';
  if (!['edit', 'read', 'split'].includes(mode)) return;
  if (mode !== 'edit') closeSuggest();

  tab.mode = mode;
  settings.mode = mode;
  saveSettings();

  const noteView = $('#noteView');
  noteView.dataset.mode = mode;
  $$('#modeSwitch button').forEach((button) => {
    button.classList.toggle('active', button.dataset.mode === mode);
  });

  if (mode !== 'edit') renderReadingView();
  if (mode === 'edit') editor.focus();

  requestAnimationFrame(() => {
    if (mode !== 'read') editorScroll.scrollTop = tab.scrollTop;
    if (mode !== 'edit') readingScroll.scrollTop = tab.readScrollTop;
  });
  updateStatus();
}

function updateBookmarkButton() {
  const tab = activeTab();
  const button = $('#btnBookmark');
  if (!button) return;
  const bookmarked = Boolean(tab && tab.type === 'note' && state.bookmarks.includes(tab.path));
  button.classList.toggle('active', bookmarked);
  button.title = bookmarked ? 'Убрать из закладок' : 'Добавить в закладки';
  button.innerHTML = icon('star');
}

/* ==========================================================================
   Markdown renderer
   ========================================================================== */

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function renderFrontmatterCard(meta) {
  if (!meta || !Array.isArray(meta.properties) || !meta.properties.length) return '';
  const rows = meta.properties
    .map((property) => {
      const key = property.key;
      let value = '';
      if (Array.isArray(property.value)) {
        const list = property.value.map((item) => String(item));
        if (key === 'tags') {
          value = list
            .map((item) => `<span class="tag" data-tag="${attr(item)}">${esc(item)}</span>`)
            .join('');
        } else {
          value = esc(list.join(', '));
        }
      } else if (typeof property.value === 'boolean') {
        value = property.value ? 'да' : 'нет';
      } else {
        value = esc(String(property.value));
      }
      return `<div class="fm-row"><span class="fm-key">${esc(key)}</span><span class="fm-value">${value}</span></div>`;
    })
    .join('');
  return `<div class="frontmatter-card">${rows}</div>`;
}

function renderWikiLink(inner) {
  const pipe = inner.indexOf('|');
  let target = pipe >= 0 ? inner.slice(0, pipe) : inner;
  const alias = pipe >= 0 ? inner.slice(pipe + 1) : '';
  const hash = target.indexOf('#');
  const heading = hash >= 0 ? target.slice(hash + 1).trim() : '';
  if (hash >= 0) target = target.slice(0, hash);
  target = target.trim();

  const note = resolveNote(target);
  const label = (alias || (note ? note.name : target) || inner).trim();
  const cls = note ? 'internal-link' : 'internal-link unresolved';
  return `<a class="${cls}" data-target="${attr(target)}" ${
    heading ? `data-heading="${attr(heading)}"` : ''
  } href="#">${esc(label)}</a>`;
}

function renderImage(src, alt) {
  const path = String(src || '').trim();
  if (!path) return '';
  if (/^(https?:|data:)/i.test(path)) {
    return `<span class="image-embed"><img src="${attr(path)}" alt="${attr(alt || '')}" loading="lazy"></span>`;
  }
  let relative = path.replace(/^\.\//, '');
  const tab = activeTab();
  if (tab && tab.type === 'note' && !relative.includes('/')) {
    const dir = tab.path.split('/').slice(0, -1).join('/');
    if (dir) relative = `${dir}/${relative}`;
  }
  return `<span class="image-embed"><img src="${attr(fileUrl(relative))}" alt="${attr(
    alt || ''
  )}" loading="lazy"></span>`;
}

function renderEmbed(inner) {
  const pipe = inner.indexOf('|');
  const target = (pipe >= 0 ? inner.slice(0, pipe) : inner).trim();
  if (isImagePath(target)) return renderImage(target, '');
  return renderWikiLink(inner);
}

function renderMarkdownLink(label, href) {
  const clean = href.trim();
  if (!/^https?:|^mailto:|^#/i.test(clean) && /\.md(?:#|$)/i.test(clean)) {
    const [path, heading] = clean.split('#');
    return `<a class="internal-link" data-target="${attr(
      path.replace(/\.md$/i, '')
    )}" ${heading ? `data-heading="${attr(heading)}"` : ''} href="#">${
      label || esc(path)
    }</a>`;
  }
  return `<a class="external-link" href="${attr(clean)}" target="_blank" rel="noopener noreferrer">${
    label || esc(clean)
  }</a>`;
}

function inlineMarkdown(line) {
  let text = esc(line);
  const protector = makeProtector();

  text = text.replace(/`([^`\n]+)`/g, (match, code) =>
    protector.put(`<code>${code}</code>`)
  );
  text = text.replace(/!\[([^\]\n]*)\]\(([^)\n]+)\)/g, (match, alt, src) =>
    protector.put(renderImage(src, alt))
  );
  text = text.replace(/!\[\[([^\]\n]+?)\]\]/g, (match, inner) =>
    protector.put(renderEmbed(inner))
  );
  text = text.replace(/\[\[([^\]\n]+?)\]\]/g, (match, inner) =>
    protector.put(renderWikiLink(inner))
  );
  text = text.replace(/\[([^\]\n]*)\]\(([^)\n]+)\)/g, (match, label, href) =>
    protector.put(renderMarkdownLink(label, href))
  );
  text = text.replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, (match, prefix, url) =>
    `${prefix}${protector.put(
      `<a class="external-link" href="${attr(url)}" target="_blank" rel="noopener noreferrer">${url}</a>`
    )}`
  );

  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  text = text.replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  text = text.replace(/(^|[\s(])_([^_\n]+)_/g, '$1<em>$2</em>');
  text = text.replace(/~~([^~]+)~~/g, '<del>$1</del>');
  text = text.replace(/==([^=]+)==/g, '<mark>$1</mark>');

  text = text.replace(/(^|[\s(])#([\p{L}\p{N}_][\p{L}\p{N}_/-]*)/gu, (match, prefix, tag) => {
    return `${prefix}<span class="tag" data-tag="${attr(tag)}">#${tag}</span>`;
  });

  return protector.restore(text);
}

function splitTableRow(line) {
  let value = line.trim();
  if (value.startsWith('|')) value = value.slice(1);
  if (value.endsWith('|') && !value.endsWith('\\|')) value = value.slice(0, -1);
  const cells = [];
  let current = '';
  for (let i = 0; i < value.length; i += 1) {
    const ch = value[i];
    if (ch === '\\' && value[i + 1] === '|') {
      current += '|';
      i += 1;
    } else if (ch === '|') {
      cells.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  cells.push(current.trim());
  return cells;
}

function parseTableAlignments(line) {
  return splitTableRow(line).map((cell) => {
    const value = cell.trim();
    const left = value.startsWith(':');
    const right = value.endsWith(':');
    if (left && right) return 'center';
    if (right) return 'right';
    if (left) return 'left';
    return '';
  });
}

function isTableSeparator(line) {
  return /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/.test(line);
}

const CALLOUT_LABELS = {
  note: 'Заметка',
  tip: 'Совет',
  success: 'Успех',
  warning: 'Внимание',
  danger: 'Опасность',
  info: 'Информация',
  question: 'Вопрос',
  quote: 'Цитата',
  example: 'Пример',
  todo: 'Задача',
  bug: 'Ошибка',
  abstract: 'Кратко',
  important: 'Важно',
  caution: 'Осторожно',
  failure: 'Провал',
};

const CALLOUT_GLYPHS = {
  note: '✎',
  tip: '✦',
  success: '✓',
  warning: '⚠',
  danger: '⚡',
  info: 'ⓘ',
  question: '?',
  quote: '❝',
  example: '≡',
  todo: '☑',
  bug: '✕',
  abstract: '≡',
  important: '!',
  caution: '⚠',
  failure: '✕',
};

function isBlockStart(line, next) {
  return (
    /^\s*(#{1,6}\s|>|`{3,}|~{3,}|([-*+]|\d+\.)\s)/.test(line) ||
    /^\s*([-*_])\1{2,}\s*$/.test(line) ||
    (line.includes('|') && next && isTableSeparator(next))
  );
}

function parseListBlocks(lines, start, slugger, lineOffset) {
  const first = lines[start].match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
  if (!first) return null;

  const baseIndent = first[1].length;
  const ordered = /\d+\./.test(first[2]);
  const items = [];
  let index = start;

  while (index < lines.length) {
    const line = lines[index];
    if (/^\s*$/.test(line)) {
      const next = lines[index + 1];
      const nextMatch = next && next.match(/^(\s*)([-*+]|\d+\.)\s+/);
      if (nextMatch && nextMatch[1].length >= baseIndent) {
        index += 1;
        continue;
      }
      break;
    }

    const match = line.match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
    if (!match) break;
    const indent = match[1].length;
    if (indent < baseIndent) break;

    if (indent > baseIndent) {
      const nested = parseListBlocks(lines, index, slugger, lineOffset);
      if (nested && items.length) {
        items[items.length - 1].nested += nested.html;
        index = nested.next;
        continue;
      }
      break;
    }

    const content = match[3];
    const task = content.match(/^\[([ xX])\]\s+(.*)$/);
    const item = {
      text: task ? task[2] : content,
      task: Boolean(task),
      checked: Boolean(task && /x/i.test(task[1])),
      nested: '',
      line: lineOffset + index,
    };
    items.push(item);
    index += 1;

    while (index < lines.length) {
      const continuation = lines[index];
      if (/^\s*$/.test(continuation)) break;
      if (/^(\s*)([-*+]|\d+\.)\s+/.test(continuation)) break;
      const indentMatch = continuation.match(/^(\s*)/);
      if (indentMatch[1].length > baseIndent) {
        item.text += ` ${continuation.trim()}`;
        index += 1;
      } else {
        break;
      }
    }
  }

  const hasTasks = items.some((item) => item.task);
  const tag = ordered ? 'ol' : 'ul';
  let html = `<${tag}${hasTasks ? ' class="contains-task-list"' : ''}>`;
  for (const item of items) {
    if (item.task) {
      html += `<li class="task-item ${item.checked ? 'done' : ''}"><input type="checkbox" class="task-checkbox" data-line="${
        item.line
      }" ${item.checked ? 'checked' : ''}><span class="task-text">${inlineMarkdown(
        item.text
      )}</span>${item.nested}</li>`;
    } else {
      html += `<li>${inlineMarkdown(item.text)}${item.nested}</li>`;
    }
  }
  html += `</${tag}>`;
  return { html, next: index };
}

function blocksToHtml(lines, slugger = makeSlugger(), lineOffset = 0) {
  const output = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (/^\s*$/.test(line)) {
      index += 1;
      continue;
    }

    const fence = line.match(/^(\s*)(`{3,}|~{3,})\s*([\w+#.-]*)\s*$/);
    if (fence) {
      const marker = fence[2];
      const lang = fence[3] || '';
      const codeLines = [];
      index += 1;
      while (index < lines.length) {
        const current = lines[index];
        const trimmed = current.trim();
        if (
          trimmed.startsWith(marker[0].repeat(marker.length)) &&
          trimmed.replace(/[`~]/g, '') === ''
        ) {
          index += 1;
          break;
        }
        codeLines.push(current);
        index += 1;
      }
      output.push(renderCodeBlock(codeLines.join('\n'), lang));
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (heading) {
      const level = heading[1].length;
      const rawText = heading[2];
      const slug = slugger(rawText.replace(/[*_`~[\]]/g, ''));
      output.push(
        `<h${level} id="${attr(slug)}">${inlineMarkdown(
          rawText
        )}<a class="heading-anchor" href="#${attr(slug)}" data-anchor="${attr(
          slug
        )}" title="Ссылка на заголовок">#</a></h${level}>`
      );
      index += 1;
      continue;
    }

    if (/^\s*([-*_])(?:\s*\1){2,}\s*$/.test(line)) {
      output.push('<hr>');
      index += 1;
      continue;
    }

    if (/^\s*>/.test(line)) {
      const quoteLines = [];
      while (index < lines.length && /^\s*>/.test(lines[index])) {
        quoteLines.push(lines[index].replace(/^\s*>\s?/, ''));
        index += 1;
      }
      const firstLine = quoteLines[0] || '';
      const callout = firstLine.match(/^\[!([\w-]+)\]([+-]?)\s*(.*)$/);
      if (callout) {
        const type = callout[1].toLowerCase();
        const known = CALLOUT_LABELS[type] ? type : 'note';
        const title = callout[3].trim() || CALLOUT_LABELS[known];
        output.push(
          `<div class="callout callout-${known}"><div class="callout-title"><span class="callout-icon">${
            CALLOUT_GLYPHS[known] || 'ⓘ'
          }</span>${inlineMarkdown(title)}</div><div class="callout-content">${blocksToHtml(
            quoteLines.slice(1),
            slugger,
            lineOffset + index - quoteLines.length + 1
          )}</div></div>`
        );
      } else {
        output.push(
          `<blockquote>${blocksToHtml(
            quoteLines,
            slugger,
            lineOffset + index - quoteLines.length
          )}</blockquote>`
        );
      }
      continue;
    }

    if (line.includes('|') && index + 1 < lines.length && isTableSeparator(lines[index + 1])) {
      const headers = splitTableRow(line);
      const alignments = parseTableAlignments(lines[index + 1]);
      index += 2;
      const rows = [];
      while (index < lines.length && lines[index].includes('|') && !/^\s*$/.test(lines[index])) {
        rows.push(splitTableRow(lines[index]));
        index += 1;
      }
      let table = '<table><thead><tr>';
      headers.forEach((header, cellIndex) => {
        const align = alignments[cellIndex];
        table += `<th${align ? ` style="text-align:${align}"` : ''}>${inlineMarkdown(
          header
        )}</th>`;
      });
      table += '</tr></thead><tbody>';
      for (const row of rows) {
        table += '<tr>';
        headers.forEach((header, cellIndex) => {
          const align = alignments[cellIndex];
          table += `<td${align ? ` style="text-align:${align}"` : ''}>${inlineMarkdown(
            row[cellIndex] || ''
          )}</td>`;
        });
        table += '</tr>';
      }
      table += '</tbody></table>';
      output.push(table);
      continue;
    }

    if (/^\s*([-*+]|\d+\.)\s+/.test(line)) {
      const list = parseListBlocks(lines, index, slugger, lineOffset);
      if (list) {
        output.push(list.html);
        index = list.next;
        continue;
      }
    }

    const paragraph = [line];
    index += 1;
    while (
      index < lines.length &&
      !/^\s*$/.test(lines[index]) &&
      !isBlockStart(lines[index], lines[index + 1])
    ) {
      paragraph.push(lines[index]);
      index += 1;
    }
    output.push(`<p>${paragraph.map((item) => inlineMarkdown(item)).join('<br>')}</p>`);
  }

  return output.join('\n');
}

function markdownToHtml(raw, meta) {
  const { body } = splitFrontmatterClient(raw);
  const bodyStart = String(raw).length - body.length;
  const prefix = String(raw).slice(0, bodyStart);
  const lineOffset = (prefix.match(/\n/g) || []).length;
  const content = blocksToHtml(body.split(/\r?\n/), makeSlugger(), lineOffset);
  const frontmatter = renderFrontmatterCard(meta);
  return `${frontmatter}${content || '<p class="empty-note">Заметка пуста. Переключитесь в режим редактора и начните печатать.</p>'}`;
}

/* ==========================================================================
   Syntax highlighting
   ========================================================================== */

const CODE_KEYWORDS = {
  js: 'const let var function return if else for while do switch case break continue class extends new this typeof instanceof in of try catch finally throw async await yield import from export default null undefined true false delete void static get set super',
  javascript: 'const let var function return if else for while do switch case break continue class extends new this typeof instanceof in of try catch finally throw async await yield import from export default null undefined true false delete void static get set super',
  ts: 'const let var function return if else for while do switch case break continue class extends new this typeof instanceof in of try catch finally throw async await yield import from export default null undefined true false interface type enum implements public private protected readonly namespace declare as satisfies abstract keyof infer never unknown any string number boolean',
  typescript: 'const let var function return if else for while do switch case break continue class extends new this typeof instanceof in of try catch finally throw async await yield import from export default null undefined true false interface type enum implements public private protected readonly namespace declare as satisfies abstract keyof infer never unknown any string number boolean',
  python: 'def class return if elif else for while in not and or is None True False import from as try except finally raise with lambda pass break continue yield async await global nonlocal assert del print',
  py: 'def class return if elif else for while in not and or is None True False import from as try except finally raise with lambda pass break continue yield async await global nonlocal assert del print',
  rust: 'fn let mut pub use mod struct enum impl trait for while loop if else match return self Self crate super async await move ref where dyn const static type unsafe extern as in',
  rs: 'fn let mut pub use mod struct enum impl trait for while loop if else match return self Self crate super async await move ref where dyn const static type unsafe extern as in',
  java: 'public private protected class interface extends implements static final void int long double float boolean char String new return if else for while do switch case break continue try catch finally throw throws import package this super null true false',
  csharp: 'public private protected internal class interface struct enum static readonly const void int long double float bool string var new return if else for foreach while do switch case break continue try catch finally throw namespace using this base null true false async await',
  go: 'package import func var const type struct interface map chan go defer return if else for range switch case break continue select nil true false',
  bash: 'if then else elif fi for while do done case esac function in export echo cd ls rm cp mv cat sudo exit return local set unset source',
  sh: 'if then else elif fi for while do done case esac function in export echo cd ls rm cp mv cat sudo exit return local set unset source',
  sql: 'select from where and or not insert into values update set delete create table drop alter join left right inner outer on group by order having limit offset as distinct count sum avg min max null true false',
  json: 'true false null',
  yaml: 'true false null',
  yml: 'true false null',
  css: '',
  html: '',
  xml: '',
};

function highlightCode(code, lang) {
  const language = String(lang || '').toLowerCase();
  const keywords = CODE_KEYWORDS[language];
  if (!language) return esc(code);

  const protector = makeProtector();
  let text = String(code);

  const commentPattern =
    /^(py|python|bash|sh|yaml|yml)$/.test(language) ? /#[^\n]*/g :
    /^(html|xml)$/.test(language) ? /<!--[\s\S]*?-->/g :
    /^(sql)$/.test(language) ? /--[^\n]*/g :
    /\/\/[^\n]*|\/\*[\s\S]*?\*\//g;
  text = text.replace(commentPattern, (match) =>
    protector.put(`<span class="tok-comment">${esc(match)}</span>`)
  );

  text = text.replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`/g, (match) =>
    protector.put(`<span class="tok-string">${esc(match)}</span>`)
  );

  text = text.replace(/\b(?:0x[\da-fA-F]+|\d+(?:\.\d+)?)\b/g, (match) =>
    protector.put(`<span class="tok-number">${match}</span>`)
  );

  if (keywords) {
    const wordList = keywords.split(/\s+/).filter(Boolean);
    if (wordList.length) {
      const keywordPattern = new RegExp(`\\b(?:${wordList.map(escapeRegExp).join('|')})\\b`, 'g');
      text = text.replace(keywordPattern, (match) =>
        protector.put(`<span class="tok-keyword">${match}</span>`)
      );
    }
  }

  text = text.replace(/\b([A-Za-z_$][\w$]*)(?=\s*\()/g, (match) =>
    protector.put(`<span class="tok-fn">${match}</span>`)
  );
  text = text.replace(/\b([A-Z][A-Za-z0-9_$]*)\b/g, (match) =>
    protector.put(`<span class="tok-type">${match}</span>`)
  );

  return protector.restore(esc(text));
}

function renderCodeBlock(code, lang) {
  return `<div class="code-block"><div class="code-block-header"><span>${esc(
    lang || 'текст'
  )}</span><button class="copy-code" data-copy-code title="Скопировать код">Копировать</button></div><pre><code>${highlightCode(
    code,
    lang
  )}</code></pre></div>`;
}

function renderReadingView() {
  const tab = activeTab();
  if (!tab || tab.type !== 'note') return;
  const scrollTop = readingScroll.scrollTop;
  if (!tab.loaded) {
    readingView.innerHTML = '<p class="empty-note">Загрузка заметки…</p>';
    return;
  }
  readingView.innerHTML = markdownToHtml(tab.content, tab.meta);
  readingScroll.scrollTop = scrollTop;
}

function toggleTaskLine(lineIndex) {
  const tab = activeTab();
  if (!tab || tab.type !== 'note') return;
  const lines = tab.content.split('\n');
  const line = lines[lineIndex];
  if (line == null) return;

  if (/\[ \]/.test(line)) {
    lines[lineIndex] = line.replace('[ ]', '[x]');
  } else if (/\[[xX]\]/.test(line)) {
    lines[lineIndex] = line.replace(/\[[xX]\]/, '[ ]');
  } else {
    return;
  }

  tab.content = lines.join('\n');
  tab.dirty = tab.content !== tab.savedContent;
  editor.value = tab.content;
  queueHighlight();
  scheduleSave(tab);
  updateTabDirtyState(tab);
  renderReadingView();
  updateStatus();
}

/* ==========================================================================
   Outline, backlinks, properties
   ========================================================================== */

function extractHeadings(tab) {
  if (!tab || tab.type !== 'note') return [];
  const raw = tab.content || '';
  const { body } = splitFrontmatterClient(raw);
  const bodyStart = raw.length - body.length;
  const lineOffset = (raw.slice(0, bodyStart).match(/\n/g) || []).length;
  const lines = body.split(/\r?\n/);
  const headings = [];
  const slugger = makeSlugger();
  let inFence = false;

  lines.forEach((line, index) => {
    if (/^\s*(`{3,}|~{3,})/.test(line)) {
      inFence = !inFence;
      return;
    }
    if (inFence) return;
    const match = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (match) {
      const text = match[2].replace(/[*_`~[\]]/g, '');
      headings.push({
        level: match[1].length,
        text,
        line: lineOffset + index,
        slug: slugger(text),
      });
    }
  });
  return headings;
}

function renderOutline() {
  const tab = activeTab();
  if (!tab || tab.type !== 'note') return;
  tab.headings = extractHeadings(tab);
  if (settings.rightOpen && state.activeRight === 'outline') renderRightPane();
}

function headingLineHtml(tab) {
  const headings = tab.headings || [];
  if (!headings.length) {
    return '<div class="prop-empty">В этой заметке нет заголовков.</div>';
  }
  return `<div class="right-section">
    <div class="right-section-head"><span>Структура</span><span class="count">${headings.length}</span></div>
    ${headings
      .map(
        (heading) => `<button class="outline-item" data-line="${heading.line}" data-slug="${attr(
          heading.slug
        )}" style="--level:${heading.level - 1}">${esc(heading.text)}</button>`
      )
      .join('')}
  </div>`;
}

function highlightTerms(text, terms) {
  let html = esc(text);
  const unique = [...new Set(terms.filter((term) => term && String(term).length > 1))].sort(
    (a, b) => String(b).length - String(a).length
  );
  for (const term of unique) {
    const pattern = new RegExp(escapeRegExp(String(term)), 'gi');
    html = html.replace(pattern, (match) => `<mark>${match}</mark>`);
  }
  return html;
}

function renderBacklinksPane(tab) {
  if (!tab.backlinksLoaded) {
    return `<div class="right-section"><div class="loading-line"></div><div class="loading-line" style="width:70%"></div><div class="loading-line" style="width:85%"></div></div>`;
  }
  const data = tab.backlinks || { backlinks: [], unlinked: [], outgoing: [] };
  const terms = [tab.name, tab.title, ...((tab.meta && tab.meta.aliases) || [])];
  const sections = [];

  if (data.backlinks.length) {
    sections.push(`<div class="right-section">
      <div class="right-section-head"><span>Обратные ссылки</span><span class="count">${
        data.backlinks.length
      }</span></div>
      ${data.backlinks
        .map(
          (item) => `<div class="backlink-item" data-path="${attr(item.path)}">
            <div class="backlink-title">${icon('file')}<span>${esc(item.title || item.name)}</span></div>
            <div class="backlink-path">${esc(item.path)}</div>
            ${
              item.context
                ? `<div class="backlink-context">${highlightTerms(item.context, terms)}</div>`
                : ''
            }
          </div>`
        )
        .join('')}
    </div>`);
  }

  if (data.unlinked.length) {
    sections.push(`<div class="right-section">
      <div class="right-section-head"><span>Упоминания без ссылки</span><span class="count">${
        data.unlinked.length
      }</span></div>
      ${data.unlinked
        .map(
          (item) => `<div class="backlink-item" data-path="${attr(item.path)}">
            <div class="backlink-title">${icon('file')}<span>${esc(item.title || item.name)}</span></div>
            <div class="backlink-context">${highlightTerms(item.context, terms)}</div>
          </div>`
        )
        .join('')}
    </div>`);
  }

  if (data.outgoing.length) {
    sections.push(`<div class="right-section">
      <div class="right-section-head"><span>Исходящие ссылки</span><span class="count">${
        data.outgoing.length
      }</span></div>
      ${data.outgoing
        .map(
          (item) => `<div class="outgoing-item ${item.exists ? '' : 'unresolved'}" ${
            item.path ? `data-path="${attr(item.path)}"` : ''
          }>
            <div class="outgoing-title">${icon(item.exists ? 'file' : 'alert')}<span>${esc(
            item.name || item.target
          )}</span></div>
          </div>`
        )
        .join('')}
    </div>`);
  }

  if (!sections.length) {
    return `<div class="prop-empty">На эту заметку пока никто не ссылается.<br><br>Добавьте ссылку вида <b>[[${esc(
      tab.name
    )}]]</b> в другую заметку — она появится здесь.</div>`;
  }
  return sections.join('');
}

function propertiesPane(tab) {
  if (!tab.loaded) return '<div class="loading-line"></div>';
  const meta = tab.meta || {};
  const tags = meta.tags || [];
  const aliases = meta.aliases || [];
  const words = countWords(tab.content);
  const chars = tab.content.length;
  const outgoing = meta.links ? meta.links.length : 0;
  const backlinks = tab.backlinks ? tab.backlinks.backlinks.length : 0;

  const rows = [];
  const row = (label, value, mono = false) =>
    `<div class="prop-row"><div class="prop-label">${esc(
      label
    )}</div><div class="prop-value ${mono ? 'mono' : ''}">${value}</div></div>`;

  rows.push(row('Путь', esc(tab.path), true));
  if (tags.length) {
    rows.push(
      row(
        'Теги',
        tags
          .map((tag) => `<span class="tag" data-tag="${attr(tag)}">${esc(tag)}</span>`)
          .join('')
      )
    );
  }
  if (aliases.length) rows.push(row('Псевдонимы', esc(aliases.join(', '))));
  if (meta.ctime) rows.push(row('Создано', `${formatDate(meta.ctime)} · ${relativeTime(meta.ctime)}`));
  if (meta.mtime) rows.push(row('Изменено', `${relativeTime(meta.mtime)}`));
  if (meta.size) rows.push(row('Размер', bytesLabel(meta.size)));
  rows.push(row('Статистика', `${words} слов · ${chars} символов`));
  rows.push(row('Связи', `${outgoing} исходящих · ${backlinks} обратных`));

  return `<div class="right-section">${rows.join('')}</div>`;
}

function renderRightPane() {
  if (!settings.rightOpen) return;
  const host = $('#rightContent');
  if (!host) return;

  $$('.right-tab').forEach((button) => {
    button.classList.toggle('active', button.dataset.right === state.activeRight);
  });

  const tab = activeTab();
  if (!tab) {
    host.innerHTML =
      '<div class="prop-empty">Откройте заметку, чтобы увидеть обратные ссылки, структуру и свойства.</div>';
    return;
  }
  if (tab.type === 'graph') {
    const nodes = state.graph ? state.graph.nodes.length : 0;
    const edges = state.graph ? state.graph.edges.length : 0;
    host.innerHTML = `<div class="right-section">
      <div class="right-section-head"><span>Граф связей</span></div>
      <div class="prop-row"><div class="prop-label">Заметки</div><div class="prop-value">${nodes}</div></div>
      <div class="prop-row"><div class="prop-label">Связи</div><div class="prop-value">${edges}</div></div>
      <div class="prop-empty">Нажмите на узел, чтобы открыть заметку. Колесо мыши — масштаб, перетаскивание — перемещение.</div>
    </div>`;
    return;
  }

  if (state.activeRight === 'outline') host.innerHTML = headingLineHtml(tab);
  else if (state.activeRight === 'properties') host.innerHTML = propertiesPane(tab);
  else host.innerHTML = renderBacklinksPane(tab);
}

function renderProperties() {
  if (settings.rightOpen && state.activeRight === 'properties') renderRightPane();
}

async function loadBacklinks(tab, force = false) {
  if (!tab || tab.type !== 'note' || !tab.loaded) return;
  if (tab.backlinksLoaded && !force) return;
  const sequence = ++state.backlinksSeq;
  try {
    const data = await api.backlinks(tab.path);
    if (sequence !== state.backlinksSeq) return;
    tab.backlinks = data;
    tab.backlinksLoaded = true;
    if (activeTab() === tab) {
      if (settings.rightOpen && state.activeRight === 'backlinks') renderRightPane();
      updateStatus();
    }
  } catch (err) {
    tab.backlinksLoaded = true;
    tab.backlinks = { backlinks: [], unlinked: [], outgoing: [] };
    if (state.activeId === tab.id && settings.rightOpen && state.activeRight === 'backlinks') {
      renderRightPane();
      toast(`Не удалось загрузить ссылки: ${err.message}`, 'error');
    }
  }
}

function navigateHeading(heading) {
  const tab = activeTab();
  if (!tab || tab.type !== 'note' || !heading) return;

  if (tab.mode === 'read' || tab.mode === 'split') {
    const element = document.getElementById(heading.slug);
    if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  if (tab.mode === 'edit' || tab.mode === 'split') {
    const lines = tab.content.split('\n');
    let position = 0;
    for (let i = 0; i < heading.line && i < lines.length; i += 1) {
      position += lines[i].length + 1;
    }
    editor.focus();
    editor.setSelectionRange(position, position);
    const lineHeight = parseFloat(getComputedStyle(editor).lineHeight) || 24;
    editorScroll.scrollTop = Math.max(0, heading.line * lineHeight - 70);
    tab.scrollTop = editorScroll.scrollTop;
  }
}

async function openInternalLink(target, heading, newTab = false) {
  const note = resolveNote(target);
  if (!note) {
    openNewNoteModal(target);
    return;
  }
  const tab = await openNote(note.path, { newTab });
  if (!tab || !heading) return;
  const wanted = String(heading).toLowerCase().trim();
  const headings = extractHeadings(tab);
  const match =
    headings.find((item) => item.text.toLowerCase() === wanted) ||
    headings.find((item) => item.slug === wanted);
  if (match) {
    tab.headings = headings;
    setTimeout(() => navigateHeading(match), 80);
  }
}

/* ==========================================================================
   Sidebar panels
   ========================================================================== */

function setPanel(panel, options = {}) {
  state.panel = panel;
  $$('.panel-tab').forEach((button) => {
    button.classList.toggle('active', button.dataset.panel === panel);
  });
  $$('.panel-view').forEach((view) => {
    view.classList.toggle('hidden', view.dataset.panelView !== panel);
  });

  if (panel === 'search') {
    loadSearchFromInput();
    if (options.focus) {
      setTimeout(() => {
        const input = $('#searchInput');
        input.focus();
        input.select();
      }, 30);
    }
  } else if (panel === 'tags') {
    loadTags();
  } else if (panel === 'bookmarks') {
    renderBookmarks();
  }
}

function focusSearchPanel() {
  settings.leftOpen = true;
  applySettings();
  saveSettings();
  setPanel('search', { focus: true });
}

function loadSearchFromInput() {
  const input = $('#searchInput');
  const value = input ? input.value : '';
  updateFieldClearButtons();
  if (!value.trim()) {
    state.search.results = [];
    state.search.query = '';
    $('#searchResults').innerHTML = '';
    $('#searchInfo').textContent = 'Введите запрос или #тег. Поиск идёт по всем заметкам хранилища.';
    return;
  }
  runSearch(value);
}

async function runSearch(query) {
  const sequence = ++state.search.seq;
  state.search.query = query;
  $('#searchInfo').textContent = 'Поиск…';
  try {
    const data = await api.search(query);
    if (sequence !== state.search.seq) return;
    state.search.results = data.results || [];
    renderSearchResults(query);
  } catch (err) {
    if (sequence !== state.search.seq) return;
    $('#searchInfo').textContent = 'Ошибка поиска';
    $('#searchResults').innerHTML = `<div class="tree-empty">${esc(err.message)}</div>`;
  }
}

function renderSearchResults(query) {
  const results = state.search.results;
  const info = $('#searchInfo');
  const host = $('#searchResults');
  const count = results.length;
  info.textContent = count
    ? `${count} ${plural(count, 'результат', 'результата', 'результатов')} по запросу «${query}»`
    : `Ничего не найдено по запросу «${query}»`;

  if (!count) {
    host.innerHTML = '<div class="tree-empty">Попробуйте другой запрос, например имя заметки или #тег.</div>';
    return;
  }

  const terms = query.replace(/^#/, '').split(/\s+/).filter(Boolean);
  host.innerHTML = results
    .map(
      (result) => `<div class="search-result" data-path="${attr(result.path)}" title="${attr(
        result.path
      )}">
        <div class="search-result-title">${icon('file')}<span class="title-text">${highlightTerms(
        result.name,
        terms
      )}</span>${result.matches > 1 ? `<span class="search-result-count">${result.matches}</span>` : ''}</div>
        <div class="search-result-path">${esc(result.path)}</div>
        ${
          result.snippet
            ? `<div class="search-result-snippet">${highlightTerms(result.snippet, terms)}</div>`
            : ''
        }
      </div>`
    )
    .join('');
}

function updateFieldClearButtons() {
  const fileFilter = $('#fileFilter');
  const searchInput = $('#searchInput');
  const fileClear = $('.field-clear[data-action="clear-file-filter"]');
  const searchClear = $('.field-clear[data-action="clear-search"]');
  if (fileFilter && fileClear) fileClear.classList.toggle('hidden', !fileFilter.value);
  if (searchInput && searchClear) searchClear.classList.toggle('hidden', !searchInput.value);
}

async function loadTags() {
  try {
    const data = await api.tags();
    state.tags = data.tags || [];
    renderTags();
  } catch {
    /* ignore tags errors */
  }
}

function renderTags() {
  const host = $('#tagsList');
  const info = $('#tagsInfo');
  if (!host) return;
  const tags = state.tags || [];
  if (info) {
    info.textContent = tags.length
      ? `${tags.length} ${plural(tags.length, 'тег', 'тега', 'тегов')} в хранилище`
      : 'Тегов пока нет. Добавьте #тег в заметку или tags во frontmatter.';
  }
  host.innerHTML = tags
    .map(
      (item) => `<div class="tag-row" data-tag="${attr(item.tag)}" title="Искать заметки с #${attr(
        item.tag
      )}">
        ${icon('hash')}<span class="tag-name">${esc(item.tag)}</span><span class="tag-count">${
        item.count
      }</span>
      </div>`
    )
    .join('');
}

function searchForTag(tag) {
  settings.leftOpen = true;
  applySettings();
  saveSettings();
  setPanel('search');
  const input = $('#searchInput');
  input.value = `#${tag}`;
  input.focus();
  input.select();
  updateFieldClearButtons();
  runSearch(input.value);
}

function renderBookmarks() {
  const host = $('#bookmarksList');
  const info = $('#bookmarksInfo');
  if (!host) return;
  const notes = state.bookmarks.map((path) => state.treeIndex.get(path)).filter(Boolean);
  if (info) {
    info.textContent = notes.length
      ? `${notes.length} ${plural(notes.length, 'закладка', 'закладки', 'закладок')}`
      : 'Закладок пока нет. Нажмите ★ в шапке заметки.';
  }
  host.innerHTML = notes
    .map(
      (note) => `<div class="bookmark-row" data-path="${attr(note.path)}" title="${attr(note.path)}">
        <span class="bookmark-like">${icon('star')}</span>
        <span class="bookmark-name">${esc(note.name)}</span>
        <span class="bookmark-path">${esc(note.path)}</span>
        <button class="tree-more" data-remove-bookmark="${attr(note.path)}" title="Убрать из закладок">${icon(
        'x'
      )}</button>
      </div>`
    )
    .join('');
}

function toggleBookmark() {
  const tab = activeTab();
  if (!tab || tab.type !== 'note') return;
  const index = state.bookmarks.indexOf(tab.path);
  if (index >= 0) {
    state.bookmarks.splice(index, 1);
    toast('Убрано из закладок');
  } else {
    state.bookmarks.push(tab.path);
    toast('Добавлено в закладки', 'success');
  }
  saveVaultUi();
  renderBookmarks();
  updateBookmarkButton();
}

/* ==========================================================================
   Sorting and collapse
   ========================================================================== */

function sortTree(nodes) {
  const collator = new Intl.Collator('ru', { numeric: true, sensitivity: 'base' });
  const copy = nodes.map((node) => ({ ...node }));
  copy.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
    if (state.sort === 'modified' && a.type === 'note' && b.type === 'note') {
      return (b.mtime || 0) - (a.mtime || 0) || collator.compare(a.name, b.name);
    }
    return collator.compare(a.name, b.name);
  });
  for (const node of copy) {
    if (node.type === 'folder') node.children = sortTree(node.children || []);
  }
  return copy;
}

function allFolderPaths() {
  const paths = [];
  const walk = (nodes) => {
    for (const node of nodes) {
      if (node.type === 'folder') {
        paths.push(node.path);
        walk(node.children || []);
      }
    }
  };
  walk(state.tree);
  return paths;
}

function toggleCollapseAll() {
  if (state.collapsed.size > 0) {
    state.collapsed.clear();
  } else {
    for (const path of allFolderPaths()) state.collapsed.add(path);
  }
  renderTree();
  saveVaultUi();
}

function toggleSort() {
  state.sort = state.sort === 'name' ? 'modified' : 'name';
  settings.sort = state.sort;
  saveSettings();
  saveVaultUi();
  renderTree();
  toast(state.sort === 'name' ? 'Сортировка по имени' : 'Сортировка по дате изменения');
}

/* ==========================================================================
   Sidebar toggles
   ========================================================================== */

function toggleLeftSidebar(force) {
  settings.leftOpen = typeof force === 'boolean' ? force : !settings.leftOpen;
  applySettings();
  saveSettings();
  saveVaultUi();
  if (settings.leftOpen) renderTree();
}

function toggleRightSidebar(force) {
  settings.rightOpen = typeof force === 'boolean' ? force : !settings.rightOpen;
  applySettings();
  saveSettings();
  saveVaultUi();
  if (settings.rightOpen) renderRightPane();
}

/* ==========================================================================
   Simple note actions
   ========================================================================== */

async function createDailyNote() {
  try {
    const result = await api.daily();
    await refreshTree({ silent: true });
    await openNote(result.path);
    if (result.created) toast('Создана ежедневная заметка', 'success');
  } catch (err) {
    toast(`Не удалось создать ежедневную заметку: ${err.message}`, 'error');
  }
}

async function openRandomNote() {
  try {
    const result = await api.random();
    await openNote(result.path);
  } catch (err) {
    toast(err.message, 'error');
  }
}

function exportNote(path) {
  const tab = tabForPath(path);
  const note = state.treeIndex.get(path);
  if (!note) return;
  const content = tab && tab.loaded ? tab.content : null;
  const run = (text) => {
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${note.name}.md`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast('Заметка экспортирована', 'success');
  };
  if (content != null) {
    run(content);
  } else {
    api
      .note(path)
      .then((data) => run(data.raw))
      .catch((err) => toast(err.message, 'error'));
  }
}

async function duplicateNoteAction(path) {
  try {
    const existing = tabForPath(path);
    if (existing && existing.dirty) await saveTab(existing);
    const result = await api.duplicate(path);
    await refreshTree({ silent: true });
    await openNote(result.path);
    toast('Создана копия заметки', 'success');
  } catch (err) {
    toast(`Не удалось создать копию: ${err.message}`, 'error');
  }
}

async function copyPathAction(path) {
  try {
    await copyToClipboard(path);
    toast('Путь скопирован');
  } catch {
    toast('Не удалось скопировать путь', 'error');
  }
}

/* ==========================================================================
   Context menus
   ========================================================================== */

let contextMenuCloser = null;

function closeContextMenu() {
  const menu = $('#contextMenu');
  if (!menu) return;
  menu.classList.add('hidden');
  menu.innerHTML = '';
  if (contextMenuCloser) {
    contextMenuCloser();
    contextMenuCloser = null;
  }
}

function showContextMenu(x, y, items) {
  closeContextMenu();
  const menu = $('#contextMenu');
  menu.innerHTML = items
    .map((item, index) => {
      if (item.sep) return '<div class="ctx-sep"></div>';
      return `<div class="ctx-item ${item.danger ? 'danger' : ''}" data-ctx-index="${index}">
        <span class="ctx-icon">${icon(item.icon || 'chevron-right')}</span>
        <span>${esc(item.label)}</span>
        ${item.hint ? `<kbd>${esc(item.hint)}</kbd>` : ''}
      </div>`;
    })
    .join('');
  menu.classList.remove('hidden');
  menu.style.left = '0px';
  menu.style.top = '0px';
  const rect = menu.getBoundingClientRect();
  menu.style.left = `${Math.max(6, Math.min(x, window.innerWidth - rect.width - 8))}px`;
  menu.style.top = `${Math.max(6, Math.min(y, window.innerHeight - rect.height - 8))}px`;

  const onPointerDown = (event) => {
    if (!menu.contains(event.target)) closeContextMenu();
  };
  const onBlur = () => closeContextMenu();
  setTimeout(() => document.addEventListener('mousedown', onPointerDown, true), 0);
  window.addEventListener('blur', onBlur);
  contextMenuCloser = () => {
    document.removeEventListener('mousedown', onPointerDown, true);
    window.removeEventListener('blur', onBlur);
  };

  menu.querySelectorAll('[data-ctx-index]').forEach((element) => {
    element.addEventListener('click', () => {
      const item = items[Number(element.dataset.ctxIndex)];
      closeContextMenu();
      if (item && item.action) item.action();
    });
  });
}

function showNoteContextMenu(path, x, y) {
  const note = state.treeIndex.get(path);
  if (!note) return;
  showContextMenu(x, y, [
    { label: 'Открыть', icon: 'file', action: () => openNote(path) },
    { label: 'Открыть в новой вкладке', icon: 'plus', action: () => openNote(path, { newTab: true }) },
    { label: 'Открыть в разделённом виде', icon: 'columns', action: () => { openNote(path); setTimeout(() => setMode('split'), 60); } },
    { sep: true },
    { label: 'Переименовать', icon: 'edit', hint: 'F2', action: () => openRenameModal('note', path) },
    { label: 'Дублировать', icon: 'copy', action: () => duplicateNoteAction(path) },
    { label: 'Добавить в закладки', icon: 'star', action: () => {
      const index = state.bookmarks.indexOf(path);
      if (index >= 0) state.bookmarks.splice(index, 1);
      else state.bookmarks.push(path);
      saveVaultUi();
      renderBookmarks();
      updateBookmarkButton();
    } },
    { label: 'Копировать путь', icon: 'link', action: () => copyPathAction(path) },
    { label: 'Экспортировать .md', icon: 'download', action: () => exportNote(path) },
    { sep: true },
    { label: 'Удалить', icon: 'trash', danger: true, action: () => openDeleteModal('note', path) },
  ]);
}

function showFolderContextMenu(path, x, y) {
  showContextMenu(x, y, [
    { label: 'Новая заметка', icon: 'file-plus', action: () => openNewNoteModal('', path) },
    { label: 'Новая папка', icon: 'folder-plus', action: () => openNewFolderModal(path) },
    { sep: true },
    { label: 'Переименовать папку', icon: 'edit', action: () => openRenameModal('folder', path) },
    { label: 'Копировать путь', icon: 'link', action: () => copyPathAction(path) },
    { sep: true },
    { label: 'Удалить папку', icon: 'trash', danger: true, action: () => openDeleteModal('folder', path) },
  ]);
}

function openActiveNoteMenu(event) {
  const tab = activeTab();
  if (!tab) return;
  const button = $('#btnMore');
  const rect = button ? button.getBoundingClientRect() : { left: 200, bottom: 60 };
  if (tab.type === 'graph') {
    showContextMenu(rect.left, rect.bottom + 4, [
      { label: 'Обновить граф', icon: 'refresh', action: () => refreshGraphData() },
      { label: 'Показать всё', icon: 'maximize', action: () => graphFit() },
      { label: 'Закрыть вкладку', icon: 'x', action: () => closeActiveTab() },
    ]);
    return;
  }
  showNoteContextMenu(tab.path, rect.left, rect.bottom + 4);
}

/* ==========================================================================
   Note templates + modals
   ========================================================================== */

const NOTE_TEMPLATES = [
  {
    id: 'blank',
    name: 'Пустая заметка',
    content: () => '',
  },
  {
    id: 'outline',
    name: 'Заголовок и разделы',
    content: (title) => `# ${title}\n\n## Обзор\n\n\n## Детали\n\n\n## Следующие шаги\n\n- [ ] \n`,
  },
  {
    id: 'meeting',
    name: 'Встреча',
    content: (title) => `---\ntags: [встреча]\n---\n\n# ${title}\n\n**Дата:** \n**Участники:** \n\n## Повестка\n\n- \n\n## Заметки\n\n\n## Решения\n\n- \n\n## Задачи\n\n- [ ] \n`,
  },
  {
    id: 'project',
    name: 'Проект',
    content: (title) => `---\ntags: [проект]\n---\n\n# ${title}\n\n## Цель\n\n\n## Задачи\n\n- [ ] \n\n## Ресурсы\n\n\n## Заметки\n\n\n`,
  },
  {
    id: 'daily',
    name: 'Ежедневная заметка',
    content: (title) => `# ${title}\n\n## Фокус дня\n\n\n## Заметки\n\n\n## Итоги\n\n- [ ] \n`,
  },
];

let modalReturnFocus = null;

function openModal(options = {}) {
  closeModal();
  const { title = '', subtitle = '', body = '', footer = '', wide = false, onAction, onMount } = options;
  modalReturnFocus = document.activeElement;

  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.innerHTML = `<div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${attr(
    title
  )}">
    <div class="modal-header">
      <div>
        <h2 class="modal-title">${esc(title)}</h2>
        ${subtitle ? `<p class="modal-subtitle">${esc(subtitle)}</p>` : ''}
      </div>
      <button class="icon-btn modal-close" data-modal-close title="Закрыть">${icon('x')}</button>
    </div>
    <div class="modal-body">${body}</div>
    ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
  </div>`;
  $('#modalRoot').appendChild(overlay);
  state.modal = { overlay, onAction };

  overlay.addEventListener('mousedown', (event) => {
    if (event.target === overlay) closeModal();
  });
  overlay.querySelectorAll('[data-modal-close]').forEach((button) => {
    button.addEventListener('click', closeModal);
  });
  overlay.querySelectorAll('[data-modal-action]').forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.dataset.modalAction;
      if (action === 'close') {
        closeModal();
        return;
      }
      if (onAction) onAction(action, overlay);
    });
  });
  overlay.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' || event.shiftKey) return;
    const target = event.target;
    if (!target || !['INPUT', 'SELECT'].includes(target.tagName)) return;
    event.preventDefault();
    if (onAction) onAction('submit', overlay);
  });

  if (onMount) onMount(overlay);

  const focusTarget =
    overlay.querySelector('[data-autofocus]') ||
    overlay.querySelector('.modal-body input, .modal-body select, .modal-body textarea') ||
    overlay.querySelector('.modal-footer .btn.primary') ||
    overlay.querySelector('button');
  if (focusTarget) {
    setTimeout(() => {
      try {
        focusTarget.focus();
        if (focusTarget.tagName === 'INPUT' && focusTarget.type === 'text') focusTarget.select();
      } catch {
        /* ignore */
      }
    }, 30);
  }
  return overlay;
}

function closeModal() {
  if (!state.modal) return;
  const { overlay } = state.modal;
  state.modal = null;
  overlay.remove();
  if (modalReturnFocus && modalReturnFocus.isConnected) {
    try {
      modalReturnFocus.focus();
    } catch {
      /* ignore */
    }
  }
  modalReturnFocus = null;
}

function modalError(overlay, message) {
  const node = overlay.querySelector('.form-error');
  if (node) node.textContent = message || '';
  if (message) toast(message, 'error');
}

function setModalBusy(overlay, busy) {
  overlay.dataset.busy = busy ? '1' : '0';
  overlay.querySelectorAll('[data-modal-action]').forEach((button) => {
    if (button.dataset.modalAction !== 'close') button.disabled = Boolean(busy);
  });
}

function currentFolder() {
  const tab = activeTab();
  return tab && tab.type === 'note' ? folderParent(tab.path) : '';
}

function cleanNoteName(value) {
  return String(value || '')
    .trim()
    .replace(/\.md$/i, '')
    .replace(/[<>:"|?*\u0000-\u001f]/g, '')
    .replace(/\s+/g, ' ');
}

function openNewNoteModal(name = '', folder = '') {
  let initialName = String(name || '');
  let initialFolder = String(folder || '');
  const slash = initialName.lastIndexOf('/');
  if (slash >= 0) {
    initialFolder = initialName.slice(0, slash);
    initialName = initialName.slice(slash + 1);
  }
  if (!initialFolder) initialFolder = currentFolder();

  const templateOptions = NOTE_TEMPLATES.map(
    (template, index) =>
      `<option value="${attr(template.id)}" ${index === 0 ? 'selected' : ''}>${esc(template.name)}</option>`
  ).join('');

  const overlay = openModal({
    title: 'Новая заметка',
    subtitle: 'Заметка будет создана в выбранной папке хранилища.',
    body: `<div class="form-group">
        <label for="newNoteName">Название</label>
        <input id="newNoteName" class="form-input" data-autofocus type="text" value="${attr(
          initialName
        )}" placeholder="Например, Идеи для проекта" autocomplete="off" spellcheck="false" />
        <div class="form-hint">Можно указать подпапку через слэш — например, «Проекты/Новый проект».</div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="newNoteFolder">Папка</label>
          <select id="newNoteFolder" class="form-select">${folderOptions(initialFolder)}</select>
        </div>
        <div class="form-group">
          <label for="newNoteTemplate">Шаблон</label>
          <select id="newNoteTemplate" class="form-select">${templateOptions}</select>
        </div>
      </div>
      <div class="form-error"></div>`,
    footer: `<button class="btn" data-modal-action="close">Отмена</button>
      <button class="btn primary" data-modal-action="submit">Создать</button>`,
    onAction: async (action, root) => {
      if (action !== 'submit' || root.dataset.busy === '1') return;
      const input = root.querySelector('#newNoteName');
      const folderSelect = root.querySelector('#newNoteFolder');
      const templateSelect = root.querySelector('#newNoteTemplate');
      const title = cleanNoteName(input.value);
      if (!title) {
        modalError(root, 'Введите название заметки');
        input.focus();
        return;
      }
      const targetFolder = folderSelect.value;
      const relative = targetFolder ? `${targetFolder}/${title}` : title;
      const template = NOTE_TEMPLATES.find((item) => item.id === templateSelect.value);
      const content = template ? template.content(title.split('/').pop()) : '';
      setModalBusy(root, true);
      try {
        const result = await api.create(relative, content);
        if (targetFolder) expandFolderPath(targetFolder);
        await refreshTree({ silent: true });
        closeModal();
        await openNote(result.path);
        toast('Заметка создана', 'success');
      } catch (err) {
        setModalBusy(root, false);
        modalError(root, err.message);
      }
    },
  });
  return overlay;
}

function openNewFolderModal(parent = '') {
  const baseFolder = parent || currentFolder();
  openModal({
    title: 'Новая папка',
    subtitle: 'Папки помогают упорядочить заметки в хранилище.',
    body: `<div class="form-group">
        <label for="newFolderName">Название папки</label>
        <input id="newFolderName" class="form-input" data-autofocus type="text" placeholder="Например, Проекты" autocomplete="off" spellcheck="false" />
      </div>
      <div class="form-group">
        <label for="newFolderParent">Расположить в</label>
        <select id="newFolderParent" class="form-select">${folderOptions(baseFolder)}</select>
      </div>
      <div class="form-error"></div>`,
    footer: `<button class="btn" data-modal-action="close">Отмена</button>
      <button class="btn primary" data-modal-action="submit">Создать</button>`,
    onAction: async (action, root) => {
      if (action !== 'submit' || root.dataset.busy === '1') return;
      const input = root.querySelector('#newFolderName');
      const parentSelect = root.querySelector('#newFolderParent');
      const name = String(input.value || '').trim().replace(/^[\\/]+|[\\/]+$/g, '');
      if (!name) {
        modalError(root, 'Введите название папки');
        input.focus();
        return;
      }
      if (/[<>:"|?*\u0000-\u001f]/.test(name)) {
        modalError(root, 'Название содержит недопустимые символы');
        return;
      }
      const relative = parentSelect.value ? `${parentSelect.value}/${name}` : name;
      setModalBusy(root, true);
      try {
        await api.createFolder(relative);
        expandFolderPath(parentSelect.value);
        await refreshTree({ silent: true });
        closeModal();
        toast('Папка создана', 'success');
      } catch (err) {
        setModalBusy(root, false);
        modalError(root, err.message);
      }
    },
  });
}

function remapPrefix(path, oldPrefix, newPrefix) {
  return isDescendantPath(path, oldPrefix) ? newPrefix + path.slice(oldPrefix.length) : path;
}

function handleNoteRenamed(oldPath, newPath) {
  const oldId = `note:${oldPath}`;
  const tab = tabForPath(oldPath);
  if (tab) {
    const wasActive = state.activeId === oldId;
    tab.path = newPath;
    tab.id = `note:${newPath}`;
    tab.title = newPath.split('/').pop().replace(/\.md$/i, '');
    if (wasActive) {
      state.activeId = tab.id;
      renderMain();
    }
    renderTabs();
  }
  state.bookmarks = state.bookmarks.map((path) => (path === oldPath ? newPath : path));
  state.recent = state.recent.map((path) => (path === oldPath ? newPath : path));
  saveVaultUi();
}

function handleFolderRenamed(oldPath, newPath) {
  for (const tab of state.tabs) {
    if (tab.type !== 'note' || !isDescendantPath(tab.path, oldPath)) continue;
    const wasActive = state.activeId === tab.id;
    tab.path = remapPrefix(tab.path, oldPath, newPath);
    tab.id = `note:${tab.path}`;
    if (wasActive) state.activeId = tab.id;
  }
  state.bookmarks = state.bookmarks.map((path) => remapPrefix(path, oldPath, newPath));
  state.recent = state.recent.map((path) => remapPrefix(path, oldPath, newPath));
  state.collapsed = new Set(
    [...state.collapsed].map((path) => remapPrefix(path, oldPath, newPath))
  );
  renderTabs();
  saveVaultUi();
}

function removePathsFromState(path, isFolder) {
  const matches = (value) => value === path || (isFolder && value.startsWith(`${path}/`));
  state.tabs = state.tabs.filter((tab) => !(tab.type === 'note' && matches(tab.path)));
  if (!state.tabs.some((tab) => tab.id === state.activeId)) {
    state.activeId = state.tabs[0] ? state.tabs[0].id : null;
  }
  state.bookmarks = state.bookmarks.filter((value) => !matches(value));
  state.recent = state.recent.filter((value) => !matches(value));
  for (const value of [...state.collapsed]) {
    if (matches(value)) state.collapsed.delete(value);
  }
  renderTabs();
  renderMain();
  saveVaultUi();
}

function openRenameModal(kind, path) {
  if (!path) {
    toast('Сначала выберите заметку или папку', 'error');
    return;
  }
  const isNote = kind === 'note';
  const node = isNote ? state.treeIndex.get(path) : null;
  if (isNote && !node) return;

  const name = isNote ? node.name : folderName(path);
  const parent = folderParent(path);
  const folderChoices = allFolders().filter((folder) => {
    if (!isNote && (folder.path === path || isDescendantPath(folder.path, path))) return false;
    return true;
  });
  const options = folderChoices
    .map(
      (folder) =>
        `<option value="${attr(folder.path)}" ${folder.path === parent ? 'selected' : ''}>${esc(
          folder.name
        )}</option>`
    )
    .join('');

  openModal({
    title: isNote ? 'Переименовать заметку' : 'Переименовать папку',
    subtitle: path,
    body: `<div class="form-group">
        <label for="renameName">Новое название</label>
        <input id="renameName" class="form-input" data-autofocus type="text" value="${attr(
          name
        )}" autocomplete="off" spellcheck="false" />
        <div class="form-hint">${
          isNote ? 'Расширение .md добавляется автоматически.' : 'Можно переместить папку в другое место.'
        }</div>
      </div>
      <div class="form-group">
        <label for="renameFolder">Расположить в</label>
        <select id="renameFolder" class="form-select">${options}</select>
      </div>
      ${
        isNote
          ? `<label class="check-row">
              <input type="checkbox" id="renameLinks" checked />
              <span>Обновить ссылки [[...]] в других заметках
                <span class="check-description">Ссылки, указывающие на старое имя, будут изменены.</span>
              </span>
            </label>`
          : ''
      }
      <div class="form-error"></div>`,
    footer: `<button class="btn" data-modal-action="close">Отмена</button>
      <button class="btn primary" data-modal-action="submit">Переименовать</button>`,
    onAction: async (action, root) => {
      if (action !== 'submit' || root.dataset.busy === '1') return;
      const input = root.querySelector('#renameName');
      const folderSelect = root.querySelector('#renameFolder');
      const nextName = cleanNoteName(input.value).replace(/[\\/]/g, '-');
      if (!nextName) {
        modalError(root, 'Введите новое название');
        input.focus();
        return;
      }
      const nextFolder = folderSelect.value;
      const nextPath = nextFolder
        ? `${nextFolder}/${nextName}${isNote ? '.md' : ''}`
        : `${nextName}${isNote ? '.md' : ''}`;
      if (nextPath === path) {
        closeModal();
        return;
      }
      setModalBusy(root, true);
      try {
        if (isNote) {
          const open = tabForPath(path);
          if (open && open.dirty) await saveTab(open);
          const updateLinks = root.querySelector('#renameLinks').checked;
          const result = await api.rename(path, nextPath, updateLinks);
          handleNoteRenamed(path, result.path);
          await refreshTree({ silent: true });
          closeModal();
          await openNote(result.path);
          toast('Заметка переименована', 'success');
        } else {
          const result = await api.renameFolder(path, nextPath);
          handleFolderRenamed(path, result.path);
          await refreshTree({ silent: true });
          closeModal();
          renderMain();
          toast('Папка переименована', 'success');
        }
      } catch (err) {
        setModalBusy(root, false);
        modalError(root, err.message);
      }
    },
  });
}

function openDeleteModal(kind, path) {
  if (!path) return;
  const isNote = kind === 'note';
  const node = isNote ? state.treeIndex.get(path) : null;
  const name = isNote ? (node ? node.name : folderName(path)) : folderName(path);

  let affected = 1;
  if (!isNote) {
    const walk = (nodes) => {
      for (const entry of nodes) {
        if (entry.type === 'folder') walk(entry.children || []);
        else affected += 1;
      }
    };
    const folderNode = findFolderNode(state.tree, path);
    affected = 0;
    if (folderNode) walk(folderNode.children || []);
    else affected = 1;
  }

  openModal({
    title: isNote ? 'Удалить заметку?' : 'Удалить папку?',
    body: `<div class="delete-warning">
        <span class="delete-icon">${icon('trash')}</span>
        <div>
          <p class="delete-title">${esc(name)}</p>
          <p class="delete-text">${
            isNote
              ? 'Заметка будет перемещена в папку <b>.trash</b> внутри хранилища. Открытые вкладки закроются.'
              : `Будет перемещено в <b>.trash</b>: ${affected} ${plural(
                  affected,
                  'заметка',
                  'заметки',
                  'заметок'
                )}. Открытые вкладки закроются.`
          }</p>
        </div>
      </div>
      <div class="form-error"></div>`,
    footer: `<button class="btn" data-autofocus data-modal-action="close">Отмена</button>
      <button class="btn danger" data-modal-action="submit">Удалить</button>`,
    onAction: async (action, root) => {
      if (action !== 'submit' || root.dataset.busy === '1') return;
      setModalBusy(root, true);
      try {
        if (isNote) await api.remove(path);
        else await api.removeFolder(path);
        removePathsFromState(path, !isNote);
        closeModal();
        await refreshTree({ silent: true });
        toast('Перемещено в корзину', 'success');
      } catch (err) {
        setModalBusy(root, false);
        modalError(root, err.message);
      }
    },
  });
}

function findFolderNode(nodes, path) {
  for (const node of nodes) {
    if (node.type !== 'folder') continue;
    if (node.path === path) return node;
    const found = findFolderNode(node.children || [], path);
    if (found) return found;
  }
  return null;
}

/* ==========================================================================
   Vault switching
   ========================================================================== */

function recentVaults() {
  const list = loadJSON('bedrock.vaults', []);
  return Array.isArray(list) ? list.filter((item) => item && item.path) : [];
}

function rememberVault(info) {
  if (!info || !info.path) return;
  const list = recentVaults().filter((item) => item.path !== info.path);
  list.unshift({ path: info.path, name: info.name || folderName(info.path), at: Date.now() });
  saveJSON('bedrock.vaults', list.slice(0, 8));
}

function openVaultModal() {
  const current = state.vault || { path: '', name: 'Badrock', isDefault: true };
  const recents = recentVaults().filter((item) => item.path !== current.path);
  const recentHtml = recents.length
    ? `<div class="settings-section">
        <h3 class="settings-section-title">Недавние хранилища</h3>
        ${recents
          .map(
            (item) => `<button class="vault-recent" data-vault-path="${attr(item.path)}">
              <span class="vault-recent-icon">${icon('folder')}</span>
              <span class="vault-recent-text">
                <span class="vault-recent-name">${esc(item.name || folderName(item.path))}</span>
                <span class="vault-recent-path">${esc(item.path)}</span>
              </span>
            </button>`
          )
          .join('')}
      </div>`
    : '';

  openModal({
    title: 'Хранилище',
    subtitle: 'Badrock хранит заметки обычными Markdown-файлами на диске.',
    body: `<div class="vault-current">
        <span class="vault-current-icon"><img src="/icon.png" alt="Badrock" style="width:24px;height:24px;vertical-align:middle;border-radius:3px;" /></span>
        <div class="vault-current-text">
          <div class="vault-current-name">${esc(current.name)}</div>
          <div class="vault-current-path">${esc(current.path)}</div>
        </div>
        ${
          current.isDefault
            ? '<span class="vault-badge">демо</span>'
            : '<span class="vault-badge">активно</span>'
        }
      </div>
      <div class="form-group">
        <label for="vaultPath">Путь к папке хранилища</label>
        <input id="vaultPath" class="form-input" data-autofocus type="text" value="${attr(
          current.path
        )}" placeholder="D:\\Заметки" autocomplete="off" spellcheck="false" />
        <div class="form-hint">Укажите абсолютный путь к существующей папке. Заметки в ней остаются обычными .md файлами.</div>
      </div>
      ${recentHtml}
      <div class="form-error"></div>`,
    footer: `<button class="btn ghost" data-modal-action="demo">Демо-хранилище</button>
      <span class="spacer"></span>
      <button class="btn" data-modal-action="close">Отмена</button>
      <button class="btn primary" data-modal-action="submit">Открыть</button>`,
    onMount: (root) => {
      root.querySelectorAll('[data-vault-path]').forEach((button) => {
        button.addEventListener('click', () => {
          const input = root.querySelector('#vaultPath');
          input.value = button.dataset.vaultPath;
          input.focus();
        });
      });
    },
    onAction: async (action, root) => {
      if (action === 'demo') {
        const input = root.querySelector('#vaultPath');
        input.value = current.defaultPath || '';
        input.focus();
        return;
      }
      if (action !== 'submit' || root.dataset.busy === '1') return;
      const input = root.querySelector('#vaultPath');
      const value = String(input.value || '').trim();
      if (!value) {
        modalError(root, 'Укажите путь к папке');
        input.focus();
        return;
      }
      setModalBusy(root, true);
      try {
        const info = await api.selectVault(value);
        closeModal();
        await applyVault(info);
        toast(`Хранилище: ${info.name}`, 'success');
      } catch (err) {
        setModalBusy(root, false);
        modalError(root, err.message);
      }
    },
  });
}

async function applyVault(info) {
  stopGraphLoop();
  for (const timer of state.saveTimers.values()) clearTimeout(timer);
  state.saveTimers.clear();

  state.tabs = [];
  state.activeId = null;
  state.closedTabs = [];
  state.savedTabs = [];
  state.savedActive = null;
  state.tree = [];
  state.treeIndex.clear();
  state.linkIndex.clear();
  state.noteList = [];
  state.bookmarks = [];
  state.recent = [];
  state.tags = [];
  state.collapsed = new Set();
  state.graphTabId = null;
  if (state.graph) {
    state.graph.data = null;
    state.graph.nodes = [];
    state.graph.edges = [];
    state.graph.hoverId = null;
    state.graph.drag = null;
    state.graph.panning = null;
    state.graph.view = { x: 0, y: 0, k: 1 };
    state.graph.fitted = false;
    state.graph.alpha = 0;
  }
  graphThemeCache = null;

  state.vault = info;
  state.vaultKey = info.path;
  rememberVault(info);
  loadVaultUi();
  applySettings();
  renderTabs();
  await refreshTree();
  await loadTags();
  await restoreSession();
  setPanel('files');
}

/* ==========================================================================
   Google Drive Sync Modal
   ========================================================================== */

async function openSyncModal() {
  let status = { configured: false, authorized: false, client_id: '', has_secret: false, auto_sync: false, last_sync: null, last_status: null };
  try {
    status = await api.syncStatus();
  } catch (err) {
    console.error('Failed to get sync status', err);
  }

  const authorizedBadge = status.authorized
    ? `<span style="display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:12px;background:rgba(34,197,94,0.15);color:#4ade80;font-size:12px;font-weight:500;">● Подключено к Google Диску</span>`
    : `<span style="display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:12px;background:rgba(156,163,175,0.15);color:#9ca3af;font-size:12px;font-weight:500;">○ Не авторизовано</span>`;

  const body = `
    <div class="settings-section">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
        <h3 class="settings-section-title" style="margin:0;">Статус Google Диска</h3>
        ${authorizedBadge}
      </div>

      <div class="settings-row" style="margin-bottom:12px;">
        <div>
          <div class="settings-row-label">Последняя синхронизация</div>
          <div class="settings-row-description">${esc(status.last_sync || 'Никогда')}</div>
        </div>
        <div class="settings-row-control">
          ${status.authorized ? `<button class="btn primary small" id="btnSyncNow">Синхронизировать сейчас</button>` : ''}
        </div>
      </div>

      ${status.last_status ? `
      <div style="font-size:12px;color:var(--text-muted);padding:8px 12px;background:var(--bg-secondary);border-radius:6px;margin-bottom:14px;border:1px solid var(--border);">
        ${esc(status.last_status)}
      </div>` : ''}

      <div class="settings-row">
        <div>
          <div class="settings-row-label">Папка в облаке</div>
          <div class="settings-row-description">Все заметки хранятся в папке «Badrock Notes» в вашем Google Диске</div>
        </div>
      </div>
    </div>

    <div class="settings-section">
      <h3 class="settings-section-title">Авторизация Google API</h3>
      <p style="font-size:12px;color:var(--text-muted);line-height:1.5;margin-bottom:12px;">
        Для прямой синхронизации через Google Drive API укажите OAuth Client ID из консоли Google Cloud или используйте прямой токен доступа.
      </p>

      <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:14px;">
        <div>
          <label style="font-size:12px;color:var(--text-muted);display:block;margin-bottom:4px;">Google Client ID</label>
          <input id="syncClientId" type="text" class="form-input" style="width:100%;font-size:13px;" placeholder="xxxx.apps.googleusercontent.com" value="${esc(status.client_id || '')}" />
        </div>
        <div>
          <label style="font-size:12px;color:var(--text-muted);display:block;margin-bottom:4px;">Google Client Secret</label>
          <input id="syncClientSecret" type="password" class="form-input" style="width:100%;font-size:13px;" placeholder="${status.has_secret ? '••••••••••••••••' : 'Секретный ключ клиента'}" />
        </div>
      </div>

      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
        <button class="btn" id="btnSaveSyncConfig">Сохранить ключи</button>
        <button class="btn primary" id="btnGoogleLogin">Войти через Google</button>
        ${status.authorized ? `<button class="btn ghost danger" id="btnDisconnectSync" style="margin-left:auto;color:#f87171;">Отключить аккаунт</button>` : ''}
      </div>

      <details style="margin-top:16px;">
        <summary style="font-size:12px;color:var(--text-muted);cursor:pointer;">Прямой ввод Access Token (для разработчиков)</summary>
        <div style="margin-top:8px;">
          <input id="syncDirectToken" type="password" class="form-input" style="width:100%;font-size:12px;" placeholder="Вставьте токен доступа Google API (Bearer ...)" />
          <button class="btn small" id="btnApplyToken" style="margin-top:6px;">Применить токен</button>
        </div>
      </details>
    </div>
  `;

  openModal({
    title: 'Google Диск',
    subtitle: 'Синхронизация заметок с вашим Google Диском',
    wide: true,
    body,
    footer: `<button class="btn primary" data-modal-action="close">Закрыть</button>`,
    onMount: (modalRoot) => {
      const btnSyncNow = modalRoot.querySelector('#btnSyncNow');
      if (btnSyncNow) {
        btnSyncNow.addEventListener('click', async () => {
          btnSyncNow.disabled = true;
          btnSyncNow.textContent = 'Синхронизация...';
          try {
            const res = await api.syncRun();
            toast(res.message || 'Синхронизация завершена!');
            await loadTree();
            closeModal();
            openSyncModal();
          } catch (err) {
            toast(`Ошибка: ${err.message}`);
            btnSyncNow.disabled = false;
            btnSyncNow.textContent = 'Повторить синхронизацию';
          }
        });
      }

      const btnSaveSyncConfig = modalRoot.querySelector('#btnSaveSyncConfig');
      if (btnSaveSyncConfig) {
        btnSaveSyncConfig.addEventListener('click', async () => {
          const clientId = modalRoot.querySelector('#syncClientId').value.trim();
          const clientSecret = modalRoot.querySelector('#syncClientSecret').value.trim();
          try {
            await api.syncConfig({ clientId, clientSecret });
            toast('Настройки Google API сохранены');
          } catch (err) {
            toast(`Ошибка: ${err.message}`);
          }
        });
      }

      const btnGoogleLogin = modalRoot.querySelector('#btnGoogleLogin');
      if (btnGoogleLogin) {
        btnGoogleLogin.addEventListener('click', async () => {
          const clientId = modalRoot.querySelector('#syncClientId').value.trim();
          const clientSecret = modalRoot.querySelector('#syncClientSecret').value.trim();
          if (!clientId) {
            toast('Сначала введите Google Client ID');
            return;
          }
          try {
            await api.syncConfig({ clientId, clientSecret });
            const port = window.location.port ? parseInt(window.location.port, 10) : 5176;
            const res = await api.syncAuthUrl(port);
            if (res && res.url) {
              window.open(res.url, '_blank', 'width=600,height=700');
              toast('Открыта страница авторизации Google. Подтвердите доступ.');
            }
          } catch (err) {
            toast(`Ошибка: ${err.message}`);
          }
        });
      }

      const btnDisconnectSync = modalRoot.querySelector('#btnDisconnectSync');
      if (btnDisconnectSync) {
        btnDisconnectSync.addEventListener('click', async () => {
          if (!confirm('Отключить синхронизацию с Google Диском?')) return;
          try {
            await api.syncDisconnect();
            toast('Аккаунт Google Диска отключен');
            closeModal();
            openSyncModal();
          } catch (err) {
            toast(`Ошибка: ${err.message}`);
          }
        });
      }

      const btnApplyToken = modalRoot.querySelector('#btnApplyToken');
      if (btnApplyToken) {
        btnApplyToken.addEventListener('click', async () => {
          const token = modalRoot.querySelector('#syncDirectToken').value.trim();
          if (!token) return;
          try {
            await api.syncConfig({ token });
            toast('Токен сохранен');
            closeModal();
            openSyncModal();
          } catch (err) {
            toast(`Ошибка: ${err.message}`);
          }
        });
      }
    },
  });
}

/* ==========================================================================
   Settings + help modals
   ========================================================================== */

const ACCENT_CHOICES = ['gray', 'purple', 'blue', 'cyan', 'green', 'orange', 'pink', 'red'];

function openSettingsModal() {
  const autosaveValues = [
    ['0', 'Выключено'],
    ['300', 'Через 0,3 сек'],
    ['800', 'Через 0,8 сек'],
    ['1500', 'Через 1,5 сек'],
    ['3000', 'Через 3 сек'],
  ];

  const themeCard = (value, label, cls = '') =>
    `<button class="theme-card ${settings.theme === value ? 'selected' : ''}" data-theme-choice="${value}">
      <span class="theme-preview ${cls}"></span>
      <span>${label}</span>
    </button>`;

  const swatches = ACCENT_CHOICES.map(
    (accent) =>
      `<button class="swatch ${settings.accent === accent ? 'selected' : ''}" data-accent-choice="${accent}" title="${accent}" aria-label="${accent}"></button>`
  ).join('');

  openModal({
    title: 'Настройки',
    subtitle: 'Внешний вид и поведение приложения',
    wide: true,
    body: `<div class="settings-section">
        <h3 class="settings-section-title">Внешний вид</h3>
        <div class="theme-cards">
          ${themeCard('dark', 'Тёмная')}
          ${themeCard('light', 'Светлая', 'light')}
          ${themeCard('system', 'Системная', 'system')}
        </div>
        <div class="settings-row">
          <div>
            <div class="settings-row-label">Акцентный цвет</div>
            <div class="settings-row-description">Цвет ссылок, кнопок и активных элементов</div>
          </div>
          <div class="settings-row-control"><div class="accent-swatches">${swatches}</div></div>
        </div>
        <div class="settings-row">
          <div>
            <div class="settings-row-label">Размер текста</div>
            <div class="settings-row-description">В редакторе и режиме чтения</div>
          </div>
          <div class="settings-row-control">
            <div class="range-control">
              <input id="setFontSize" type="range" min="13" max="22" step="1" value="${settings.fontSize}" />
              <span class="range-value" id="setFontSizeValue">${settings.fontSize}px</span>
            </div>
          </div>
        </div>
        <div class="settings-row">
          <div>
            <div class="settings-row-label">Ограничивать ширину текста</div>
            <div class="settings-row-description">Комфортная длина строки для чтения</div>
          </div>
          <div class="settings-row-control">
            <input id="setReadable" type="checkbox" ${settings.readable ? 'checked' : ''} />
          </div>
        </div>
      </div>

      <div class="settings-section">
        <h3 class="settings-section-title">Редактор</h3>
        <div class="settings-row">
          <div>
            <div class="settings-row-label">Автосохранение</div>
            <div class="settings-row-description">Записывать изменения на диск автоматически</div>
          </div>
          <div class="settings-row-control">
            <select id="setAutoSave" class="form-select" style="width:170px">
              ${autosaveValues
                .map(
                  ([value, label]) =>
                    `<option value="${value}" ${Number(value) === Number(settings.autoSave) ? 'selected' : ''}>${label}</option>`
                )
                .join('')}
            </select>
          </div>
        </div>
        <div class="settings-row">
          <div>
            <div class="settings-row-label">Проверка орфографии</div>
            <div class="settings-row-description">Встроенная проверка браузера в редакторе</div>
          </div>
          <div class="settings-row-control">
            <input id="setSpellcheck" type="checkbox" ${settings.spellcheck ? 'checked' : ''} />
          </div>
        </div>
      </div>

      <div class="settings-section">
        <h3 class="settings-section-title">Файлы и граф</h3>
        <div class="settings-row">
          <div>
            <div class="settings-row-label">Сортировка файлов</div>
            <div class="settings-row-description">Порядок заметок в дереве хранилища</div>
          </div>
          <div class="settings-row-control">
            <select id="setSort" class="form-select" style="width:170px">
              <option value="name" ${state.sort === 'name' ? 'selected' : ''}>По имени</option>
              <option value="modified" ${state.sort === 'modified' ? 'selected' : ''}>По дате изменения</option>
            </select>
          </div>
        </div>
        <div class="settings-row">
          <div>
            <div class="settings-row-label">Подписи на графе</div>
            <div class="settings-row-description">Показывать названия заметок рядом с узлами</div>
          </div>
          <div class="settings-row-control">
            <input id="setGraphLabels" type="checkbox" ${settings.graphLabels ? 'checked' : ''} />
          </div>
        </div>
      </div>

      <div class="settings-section">
        <h3 class="settings-section-title">Хранилище</h3>
        <div class="settings-row">
          <div>
            <div class="settings-row-label">Текущее хранилище</div>
            <div class="settings-row-description">${esc(state.vault ? state.vault.path : '—')}</div>
          </div>
          <div class="settings-row-control">
            <button class="btn small" data-settings-action="vault">Сменить</button>
          </div>
        </div>
        <div class="settings-row">
          <div>
            <div class="settings-row-label">Синхронизация Google Диск</div>
            <div class="settings-row-description">Двухсторонняя синхронизация заметок с вашим Google Диском</div>
          </div>
          <div class="settings-row-control">
            <button class="btn small" data-settings-action="sync">Настроить</button>
          </div>
        </div>
        <div class="settings-row">
          <div>
            <div class="settings-row-label">Версия</div>
            <div class="settings-row-description">Badrock · Obsidian-подобный интерфейс</div>
          </div>
          <div class="settings-row-control"><span class="vault-badge">1.0</span></div>
        </div>
      </div>`,
    footer: `<button class="btn ghost" data-modal-action="reset">Сбросить настройки</button>
      <span class="spacer"></span>
      <button class="btn primary" data-modal-action="close">Готово</button>`,
    onMount: (root) => {
      const refreshSelected = (selector, attribute, value) => {
        root.querySelectorAll(selector).forEach((element) => {
          element.classList.toggle('selected', element.dataset[attribute] === value);
        });
      };

      root.querySelectorAll('[data-theme-choice]').forEach((button) => {
        button.addEventListener('click', () => {
          settings.theme = button.dataset.themeChoice;
          applySettings();
          saveSettings();
          refreshSelected('[data-theme-choice]', 'themeChoice', settings.theme);
        });
      });

      root.querySelectorAll('[data-accent-choice]').forEach((button) => {
        button.addEventListener('click', () => {
          settings.accent = button.dataset.accentChoice;
          applySettings();
          saveSettings();
          refreshSelected('[data-accent-choice]', 'accentChoice', settings.accent);
        });
      });

      const fontRange = root.querySelector('#setFontSize');
      const fontValue = root.querySelector('#setFontSizeValue');
      fontRange.addEventListener('input', () => {
        settings.fontSize = Number(fontRange.value);
        fontValue.textContent = `${settings.fontSize}px`;
        applySettings();
      });
      fontRange.addEventListener('change', saveSettings);

      root.querySelector('#setReadable').addEventListener('change', (event) => {
        settings.readable = event.target.checked;
        applySettings();
        saveSettings();
      });

      root.querySelector('#setAutoSave').addEventListener('change', (event) => {
        settings.autoSave = Number(event.target.value);
        saveSettings();
        if (settings.autoSave > 0) {
          for (const tab of state.tabs) {
            if (tab.type === 'note' && tab.dirty) scheduleSave(tab);
          }
        }
      });

      root.querySelector('#setSpellcheck').addEventListener('change', (event) => {
        settings.spellcheck = event.target.checked;
        applySettings();
        saveSettings();
      });

      root.querySelector('#setSort').addEventListener('change', (event) => {
        state.sort = event.target.value;
        settings.sort = state.sort;
        saveSettings();
        saveVaultUi();
        renderTree();
      });

      root.querySelector('#setGraphLabels').addEventListener('change', (event) => {
        settings.graphLabels = event.target.checked;
        saveSettings();
        graphDraw();
      });

      root.querySelector('[data-settings-action="vault"]').addEventListener('click', () => {
        closeModal();
        openVaultModal();
      });

      const syncSettingsBtn = root.querySelector('[data-settings-action="sync"]');
      if (syncSettingsBtn) {
        syncSettingsBtn.addEventListener('click', () => {
          closeModal();
          openSyncModal();
        });
      }
    },
    onAction: async (action, root) => {
      if (action !== 'reset') return;
      settings = { ...DEFAULT_SETTINGS, sort: state.sort };
      saveSettings();
      applySettings();
      renderTree();
      closeModal();
      openSettingsModal();
      toast('Настройки сброшены');
    },
  });
}

const SHORTCUTS = [
  ['Палитра команд', ['Ctrl', 'P']],
  ['Быстрый переход', ['Ctrl', 'O']],
  ['Новая заметка', ['Ctrl', 'N']],
  ['Новая папка', ['Ctrl', 'Shift', 'N']],
  ['Сохранить', ['Ctrl', 'S']],
  ['Редактор / чтение', ['Ctrl', 'E']],
  ['Разделённый вид', ['Ctrl', 'Shift', 'E']],
  ['Закрыть вкладку', ['Ctrl', 'W']],
  ['Восстановить вкладку', ['Ctrl', 'Shift', 'T']],
  ['Следующая вкладка', ['Ctrl', 'Tab']],
  ['Поиск по хранилищу', ['Ctrl', 'Shift', 'F']],
  ['Граф связей', ['Ctrl', 'G']],
  ['Ежедневная заметка', ['Ctrl', 'D']],
  ['Добавить в закладки', ['Ctrl', 'Shift', 'B']],
  ['Настройки', ['Ctrl', ',']],
  ['Переименовать', ['F2']],
  ['Свернуть панель', ['Ctrl', 'Shift', 'L']],
  ['Справка', ['?']],
];

function openHelpModal() {
  const rows = SHORTCUTS.map(
    ([label, keys]) => `<div class="shortcut-row">
      <span>${esc(label)}</span>
      <span class="shortcut-keys">${keys.map((key) => `<kbd>${esc(key)}</kbd>`).join('')}</span>
    </div>`
  ).join('');

  openModal({
    title: 'Горячие клавиши',
    subtitle: 'Всё управление доступно с клавиатуры',
    wide: true,
    body: `<div class="shortcuts-grid">${rows}</div>
      <div class="form-hint" style="margin-top:14px">
        Совет: нажмите <kbd>Ctrl</kbd>+<kbd>P</kbd>, чтобы найти любую команду, или введите <kbd>[[</kbd> в редакторе для быстрой ссылки на заметку.
      </div>`,
    footer: `<button class="btn primary" data-modal-action="close">Понятно</button>`,
  });
}
/* ==========================================================================
   Command palette + quick switcher
   ========================================================================== */

function setRightTab(name) {
  state.activeRight = name;
  settings.rightOpen = true;
  settings.rightTab = name;
  saveSettings();
  saveVaultUi();
  applySettings();
  renderRightPane();
}

function paletteCommands() {
  const tab = activeTab();
  const isNote = Boolean(tab && tab.type === 'note');
  const notePath = isNote ? tab.path : null;
  const bookmarked = Boolean(isNote && state.bookmarks.includes(notePath));

  const commands = [
    {
      id: 'new-note',
      title: 'Создать заметку',
      icon: 'pencil-plus',
      hint: 'Ctrl+N',
      group: 'Создать',
      run: () => openNewNoteModal(),
    },
    {
      id: 'new-folder',
      title: 'Создать папку',
      icon: 'folder-plus',
      hint: 'Ctrl+Shift+N',
      group: 'Создать',
      run: () => openNewFolderModal(),
    },
    {
      id: 'daily-note',
      title: 'Открыть ежедневную заметку',
      icon: 'calendar',
      hint: 'Ctrl+D',
      group: 'Создать',
      run: () => createDailyNote(),
    },
    {
      id: 'quick-switcher',
      title: 'Быстрый переход к заметке',
      icon: 'search',
      hint: 'Ctrl+O',
      group: 'Навигация',
      run: () => openCommandPalette('notes'),
    },
    {
      id: 'search-vault',
      title: 'Поиск по хранилищу',
      icon: 'search',
      hint: 'Ctrl+Shift+F',
      group: 'Навигация',
      run: () => focusSearchPanel(),
    },
    {
      id: 'random-note',
      title: 'Открыть случайную заметку',
      icon: 'shuffle',
      group: 'Навигация',
      run: () => openRandomNote(),
    },
    {
      id: 'graph',
      title: 'Открыть граф связей',
      icon: 'graph',
      hint: 'Ctrl+G',
      group: 'Навигация',
      run: () => openGraph(),
    },
    {
      id: 'refresh-vault',
      title: 'Обновить дерево хранилища',
      icon: 'refresh',
      group: 'Навигация',
      run: async () => {
        await refreshTree();
        await loadTags();
        toast('Хранилище обновлено');
      },
    },
    {
      id: 'toggle-mode',
      title: 'Переключить редактор / чтение',
      icon: 'book',
      hint: 'Ctrl+E',
      group: 'Вид',
      available: isNote,
      run: () => setMode('toggle'),
    },
    {
      id: 'edit-mode',
      title: 'Режим редактирования',
      icon: 'pencil',
      group: 'Вид',
      available: isNote,
      run: () => setMode('edit'),
    },
    {
      id: 'read-mode',
      title: 'Режим чтения',
      icon: 'book',
      group: 'Вид',
      available: isNote,
      run: () => setMode('read'),
    },
    {
      id: 'split-mode',
      title: 'Разделённый вид',
      icon: 'columns',
      hint: 'Ctrl+Shift+E',
      group: 'Вид',
      available: isNote,
      run: () => setMode('split'),
    },
    {
      id: 'toggle-left',
      title: settings.leftOpen ? 'Скрыть левую панель' : 'Показать левую панель',
      icon: 'panel-left',
      group: 'Вид',
      run: () => toggleLeftSidebar(),
    },
    {
      id: 'toggle-right',
      title: settings.rightOpen ? 'Скрыть правую панель' : 'Показать правую панель',
      icon: 'panel-right',
      group: 'Вид',
      run: () => toggleRightSidebar(),
    },
    {
      id: 'toggle-theme',
      title: 'Переключить тёмную / светлую тему',
      icon: resolvedTheme() === 'dark' ? 'sun' : 'moon',
      group: 'Вид',
      run: () => toggleTheme(),
    },
    {
      id: 'backlinks',
      title: 'Показать обратные ссылки',
      icon: 'link',
      group: 'Вид',
      run: () => setRightTab('backlinks'),
    },
    {
      id: 'outline',
      title: 'Показать структуру заметки',
      icon: 'list',
      group: 'Вид',
      run: () => setRightTab('outline'),
    },
    {
      id: 'properties',
      title: 'Показать свойства заметки',
      icon: 'info',
      group: 'Вид',
      run: () => setRightTab('properties'),
    },
    {
      id: 'save',
      title: 'Сохранить заметку',
      icon: 'save',
      hint: 'Ctrl+S',
      group: 'Заметка',
      available: isNote,
      run: () => saveActiveNow(),
    },
    {
      id: 'rename',
      title: 'Переименовать заметку',
      icon: 'edit',
      hint: 'F2',
      group: 'Заметка',
      available: isNote,
      run: () => openRenameModal('note', notePath),
    },
    {
      id: 'duplicate',
      title: 'Создать копию заметки',
      icon: 'copy',
      group: 'Заметка',
      available: isNote,
      run: () => duplicateNoteAction(notePath),
    },
    {
      id: 'bookmark',
      title: bookmarked ? 'Убрать из закладок' : 'Добавить в закладки',
      icon: 'star',
      hint: 'Ctrl+Shift+B',
      group: 'Заметка',
      available: isNote,
      run: () => toggleBookmark(),
    },
    {
      id: 'copy-path',
      title: 'Скопировать путь заметки',
      icon: 'link',
      group: 'Заметка',
      available: isNote,
      run: () => copyPathAction(notePath),
    },
    {
      id: 'export',
      title: 'Экспортировать заметку в .md',
      icon: 'download',
      group: 'Заметка',
      available: isNote,
      run: () => exportNote(notePath),
    },
    {
      id: 'delete',
      title: 'Удалить заметку',
      icon: 'trash',
      group: 'Заметка',
      available: isNote,
      run: () => openDeleteModal('note', notePath),
    },
    {
      id: 'close-tab',
      title: 'Закрыть текущую вкладку',
      icon: 'x',
      hint: 'Ctrl+W',
      group: 'Вкладки',
      available: Boolean(tab),
      run: () => closeActiveTab(),
    },
    {
      id: 'reopen-tab',
      title: 'Восстановить закрытую вкладку',
      icon: 'history',
      hint: 'Ctrl+Shift+T',
      group: 'Вкладки',
      run: () => reopenClosedTab(),
    },
    {
      id: 'sort',
      title: state.sort === 'name' ? 'Сортировать по дате изменения' : 'Сортировать по имени',
      icon: 'sort',
      group: 'Файлы',
      run: () => toggleSort(),
    },
    {
      id: 'collapse',
      title: state.collapsed.size ? 'Развернуть все папки' : 'Свернуть все папки',
      icon: 'collapse',
      group: 'Файлы',
      run: () => toggleCollapseAll(),
    },
    {
      id: 'vault',
      title: 'Сменить хранилище',
      icon: 'folder',
      group: 'Приложение',
      run: () => openVaultModal(),
    },
    {
      id: 'settings',
      title: 'Открыть настройки',
      icon: 'settings',
      hint: 'Ctrl+,',
      group: 'Приложение',
      run: () => openSettingsModal(),
    },
    {
      id: 'help',
      title: 'Горячие клавиши и справка',
      icon: 'help',
      group: 'Приложение',
      run: () => openHelpModal(),
    },
  ];

  return commands.filter((command) => command.available !== false);
}

function fuzzyMatch(query, text) {
  const q = String(query || '').toLowerCase();
  if (!q) return { score: 0, positions: [] };
  const t = String(text || '').toLowerCase();
  let score = 0;
  let pos = 0;
  let last = -1;
  const positions = [];

  for (const ch of q) {
    const index = t.indexOf(ch, pos);
    if (index === -1) return null;
    let bonus = 1;
    if (index === last + 1) bonus += 6;
    if (index === 0 || /[\s/_.-]/.test(t[index - 1] || '')) bonus += 5;
    if (index === 0) bonus += 4;
    score += bonus;
    positions.push(index);
    last = index;
    pos = index + 1;
  }

  if (t.startsWith(q)) score += 22;
  if (t === q) score += 32;
  score -= Math.min(8, (t.length - q.length) / 12);
  return { score, positions };
}

function markPositions(text, positions) {
  if (!positions || !positions.length) return esc(text);
  const value = String(text);
  const sorted = [...new Set(positions)].sort((a, b) => a - b);
  let html = '';
  let last = 0;
  for (const index of sorted) {
    if (index < last || index >= value.length) continue;
    html += esc(value.slice(last, index));
    html += `<mark>${esc(value[index])}</mark>`;
    last = index + 1;
  }
  html += esc(value.slice(last));
  return html;
}

function paletteNoteItems(query) {
  const trimmed = query.trim();
  const items = [];
  const seen = new Set();

  if (!trimmed) {
    for (const path of state.recent) {
      const note = state.treeIndex.get(path);
      if (!note || seen.has(path)) continue;
      seen.add(path);
      items.push({ kind: 'note', note, group: 'Недавние' });
    }
    for (const note of state.noteList) {
      if (seen.has(note.path)) continue;
      items.push({ kind: 'note', note, group: 'Все заметки' });
    }
    return items.slice(0, 80);
  }

  const scored = [];
  for (const note of state.noteList) {
    const nameMatch = fuzzyMatch(trimmed, note.name);
    const pathMatch = fuzzyMatch(trimmed, note.path.replace(/\.md$/i, ''));
    if (!nameMatch && !pathMatch) continue;
    const useName = nameMatch && (!pathMatch || nameMatch.score >= pathMatch.score - 2);
    const match = useName ? nameMatch : pathMatch;
    let score = match.score;
    if ((note.aliases || []).some((alias) => alias.toLowerCase().includes(trimmed.toLowerCase()))) {
      score += 10;
    }
    scored.push({ note, score, positions: useName ? match.positions : [] });
  }
  scored.sort((a, b) => b.score - a.score || a.note.name.localeCompare(b.note.name, 'ru'));

  const exact = state.noteList.some(
    (note) => note.name.toLowerCase() === trimmed.toLowerCase() && !seen.has(note.path)
  );
  if (!exact && trimmed.length < 80) {
    items.push({ kind: 'create', name: trimmed });
  }

  for (const result of scored.slice(0, 60)) {
    if (seen.has(result.note.path)) continue;
    items.push({
      kind: 'note',
      note: result.note,
      positions: result.positions,
    });
  }
  return items;
}

function buildPaletteItems() {
  const { mode, query } = state.palette;
  if (mode === 'notes') return paletteNoteItems(query);

  const commands = paletteCommands();
  const trimmed = query.trim();
  if (!trimmed) return commands.map((command) => ({ kind: 'command', command }));

  const scored = [];
  for (const command of commands) {
    const match = fuzzyMatch(trimmed, command.title) || fuzzyMatch(trimmed, command.group || '');
    if (!match) continue;
    scored.push({ kind: 'command', command, score: match.score, positions: match.positions });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored;
}

function renderPalette() {
  const host = $('#cmdList');
  if (!host) return;
  const palette = state.palette;
  const items = buildPaletteItems();
  palette.items = items;
  if (palette.index >= items.length) palette.index = Math.max(0, items.length - 1);
  if (palette.index < 0) palette.index = 0;

  if (!items.length) {
    host.innerHTML = `<div class="cmd-empty">${
      palette.mode === 'notes' ? 'Заметки не найдены' : 'Команды не найдены'
    }</div>`;
    return;
  }

  let html = '';
  let lastGroup = '';
  items.forEach((item, index) => {
    const group = item.group || (item.kind === 'command' ? item.command.group : '');
    if (!palette.query.trim() && group && group !== lastGroup) {
      html += `<div class="cmd-group-label">${esc(group)}</div>`;
      lastGroup = group;
    }
    if (item.kind === 'note') {
      const note = item.note;
      html += `<div class="cmd-item ${index === palette.index ? 'selected' : ''}" data-palette-index="${index}">
        <span class="cmd-icon">${icon('file')}</span>
        <span class="cmd-text">
          <span class="cmd-title">${markPositions(note.name, item.positions)}</span>
          <span class="cmd-sub">${esc(note.path)}</span>
        </span>
      </div>`;
    } else if (item.kind === 'create') {
      html += `<div class="cmd-item ${index === palette.index ? 'selected' : ''}" data-palette-index="${index}">
        <span class="cmd-icon">${icon('plus')}</span>
        <span class="cmd-text">
          <span class="cmd-title">Создать заметку «${esc(item.name)}»</span>
          <span class="cmd-sub">Будет создана новая заметка</span>
        </span>
      </div>`;
    } else {
      const command = item.command;
      html += `<div class="cmd-item ${index === palette.index ? 'selected' : ''}" data-palette-index="${index}">
        <span class="cmd-icon">${icon(command.icon || 'command')}</span>
        <span class="cmd-text">
          <span class="cmd-title">${markPositions(command.title, item.positions)}</span>
          ${command.group ? `<span class="cmd-sub">${esc(command.group)}</span>` : ''}
        </span>
        ${command.hint ? `<span class="cmd-hint">${esc(command.hint)}</span>` : ''}
      </div>`;
    }
  });
  host.innerHTML = html;
}

function updatePaletteSelection() {
  $$('#cmdList .cmd-item').forEach((element) => {
    element.classList.toggle('selected', Number(element.dataset.paletteIndex) === state.palette.index);
  });
  const selected = $('#cmdList .cmd-item.selected');
  if (selected) selected.scrollIntoView({ block: 'nearest' });
}

function openCommandPalette(mode = 'commands') {
  closeContextMenu();
  const overlay = $('#cmdOverlay');
  const input = $('#cmdInput');
  if (!overlay || !input) return;

  state.palette.open = true;
  state.palette.mode = mode === 'notes' ? 'notes' : 'commands';
  state.palette.query = '';
  state.palette.index = 0;
  state.palette.items = [];

  input.value = '';
  input.placeholder = mode === 'notes' ? 'Найти заметку…' : 'Введите команду…';
  overlay.classList.remove('hidden');
  renderPalette();
  requestAnimationFrame(() => {
    input.focus();
    input.select();
  });
}

function closePalette() {
  const overlay = $('#cmdOverlay');
  if (overlay) overlay.classList.add('hidden');
  state.palette.open = false;
  state.palette.items = [];
  state.palette.index = 0;
  state.palette.query = '';
}

function movePaletteSelection(delta) {
  const count = state.palette.items.length;
  if (!count) return;
  state.palette.index = (state.palette.index + delta + count) % count;
  updatePaletteSelection();
}

function runPaletteItem(item) {
  if (!item) return;
  closePalette();
  try {
    if (item.kind === 'note') {
      openNote(item.note.path);
      return;
    }
    if (item.kind === 'create') {
      openNewNoteModal(item.name, currentFolder());
      return;
    }
    if (item.kind === 'command') {
      const result = item.command.run();
      if (result && typeof result.catch === 'function') {
        result.catch((err) => toast(err.message || String(err), 'error'));
      }
    }
  } catch (err) {
    toast(err.message || String(err), 'error');
  }
}

function runPaletteSelection() {
  const item = state.palette.items[state.palette.index];
  runPaletteItem(item);
}

function onPaletteInput(event) {
  state.palette.query = event.target.value;
  state.palette.index = 0;
  renderPalette();
}

function onPaletteKeydown(event) {
  if (!state.palette.open) return;
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    movePaletteSelection(1);
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    movePaletteSelection(-1);
  } else if (event.key === 'PageDown') {
    event.preventDefault();
    movePaletteSelection(8);
  } else if (event.key === 'PageUp') {
    event.preventDefault();
    movePaletteSelection(-8);
  } else if (event.key === 'Enter') {
    event.preventDefault();
    runPaletteSelection();
  } else if (event.key === 'Tab') {
    event.preventDefault();
    movePaletteSelection(event.shiftKey ? -1 : 1);
  } else if (event.key === 'Escape') {
    event.preventDefault();
    closePalette();
  }
}
/* ==========================================================================
   Graph view
   ========================================================================== */

function ensureGraph() {
  if (state.graph) return state.graph;
  state.graph = {
    canvas: null,
    ctx: null,
    raf: null,
    data: null,
    nodes: [],
    edges: [],
    view: { x: 0, y: 0, k: 1 },
    hoverId: null,
    drag: null,
    panning: null,
    width: 0,
    height: 0,
    dpr: 1,
    alpha: 0,
    last: 0,
    bound: false,
    loading: false,
    fitted: false,
  };
  return state.graph;
}

function graphTheme() {
  if (!graphThemeCache) {
    const styles = getComputedStyle(document.documentElement);
    const read = (name, fallback) => styles.getPropertyValue(name).trim() || fallback;
    graphThemeCache = {
      accent: read('--accent', '#9ca3af'),
      bg: read('--bg-primary', '#1e1e1e'),
      textMuted: read('--text-muted', '#a3a3a3'),
      textFaint: read('--text-faint', '#777777'),
      dotColor: read('--border-strong', '#444444'),
      fontFamily: read('--font-text', 'Inter, sans-serif'),
    };
  }
  return graphThemeCache;
}

function graphTagHue(tag) {
  let hash = 0;
  const value = String(tag || '');
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) % 360;
  }
  return hash;
}

function graphNodeRadius(node) {
  return 5 + Math.min(11, Math.sqrt(Math.max(0, node.degree || 0)) * 3.1);
}

function graphNodeColor(node, accent) {
  if (node.unresolved) return 'hsl(220 9% 52%)';
  const tags = node.tags || [];
  if (tags.length) return `hsl(${graphTagHue(tags[0])} 62% 58%)`;
  return accent || '#9ca3af';
}

function openGraph() {
  let tab = state.tabs.find((item) => item.type === 'graph');
  if (!tab) {
    tab = { id: 'graph', type: 'graph', title: 'Граф связей' };
    state.tabs.push(tab);
    state.graphTabId = tab.id;
  }
  activateTab(tab.id);
  requestAnimationFrame(() => {
    initGraphCanvas();
    resizeGraphCanvas();
    if (!state.graph || !state.graph.data) refreshGraphData();
    else startGraphLoop();
    graphDraw();
  });
}

function initGraphCanvas() {
  const graph = ensureGraph();
  if (graph.canvas && graph.bound) return graph.canvas;
  const canvas = $('#graphCanvas');
  if (!canvas) return null;
  graph.canvas = canvas;
  graph.ctx = canvas.getContext('2d');
  graph.bound = true;

  canvas.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    const point = graphEventPoint(graph, event);
    const node = graphFindNode(graph, point.x, point.y);
    canvas.setPointerCapture(event.pointerId);
    if (node) {
      graph.drag = {
        node,
        dx: node.x - point.x,
        dy: node.y - point.y,
        startX: event.clientX,
        startY: event.clientY,
        moved: false,
      };
      node.fixed = true;
    } else {
      graph.panning = {
        startX: event.clientX,
        startY: event.clientY,
        viewX: graph.view.x,
        viewY: graph.view.y,
        moved: false,
      };
    }
    graph.alpha = Math.max(graph.alpha, 0.25);
    startGraphLoop();
  });

  canvas.addEventListener('pointermove', (event) => {
    const point = graphEventPoint(graph, event);
    if (graph.drag) {
      const node = graph.drag.node;
      node.x = point.x + graph.drag.dx;
      node.y = point.y + graph.drag.dy;
      node.vx = 0;
      node.vy = 0;
      graph.alpha = Math.max(graph.alpha, 0.55);
      if (
        Math.abs(event.clientX - graph.drag.startX) > 3 ||
        Math.abs(event.clientY - graph.drag.startY) > 3
      ) {
        graph.drag.moved = true;
      }
      graphDraw();
      return;
    }
    if (graph.panning) {
      graph.view.x = graph.panning.viewX + (event.clientX - graph.panning.startX);
      graph.view.y = graph.panning.viewY + (event.clientY - graph.panning.startY);
      if (
        Math.abs(event.clientX - graph.panning.startX) > 3 ||
        Math.abs(event.clientY - graph.panning.startY) > 3
      ) {
        graph.panning.moved = true;
      }
      graphDraw();
      return;
    }
    const node = graphFindNode(graph, point.x, point.y);
    const nextHover = node ? node.id : null;
    if (nextHover !== graph.hoverId) {
      graph.hoverId = nextHover;
      canvas.style.cursor = node ? 'pointer' : 'grab';
      graphDraw();
    }
  });

  const finishPointer = (event) => {
    const point = graphEventPoint(graph, event);
    if (graph.drag) {
      const drag = graph.drag;
      const node = drag.node;
      node.fixed = false;
      graph.drag = null;
      if (!drag.moved) {
        if (node.path) openNote(node.path);
        else openNewNoteModal(node.name);
      }
      graph.alpha = Math.max(graph.alpha, 0.2);
      startGraphLoop();
    }
    if (graph.panning) {
      const wasMoved = graph.panning.moved;
      graph.panning = null;
      if (!wasMoved && event.button === 0) {
        const hit = graphFindNode(graph, point.x, point.y);
        if (hit) {
          if (hit.path) openNote(hit.path);
          else openNewNoteModal(hit.name);
        }
      }
    }
  };
  canvas.addEventListener('pointerup', finishPointer);
  canvas.addEventListener('pointercancel', () => {
    if (graph.drag) graph.drag.node.fixed = false;
    graph.drag = null;
    graph.panning = null;
    startGraphLoop();
  });

  canvas.addEventListener('pointerleave', () => {
    if (graph.hoverId) {
      graph.hoverId = null;
      canvas.style.cursor = 'grab';
      graphDraw();
    }
  });

  canvas.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const factor = Math.exp(-event.deltaY * 0.0014);
      graphZoomAt(graph, factor, event.clientX - rect.left, event.clientY - rect.top);
    },
    { passive: false }
  );

  canvas.addEventListener('dblclick', () => graphFit());
  canvas.style.cursor = 'grab';
  return canvas;
}

function graphEventPoint(graph, event) {
  const rect = graph.canvas.getBoundingClientRect();
  const sx = event.clientX - rect.left;
  const sy = event.clientY - rect.top;
  return {
    x: (sx - graph.width / 2 - graph.view.x) / graph.view.k,
    y: (sy - graph.height / 2 - graph.view.y) / graph.view.k,
    sx,
    sy,
  };
}

function graphFindNode(graph, x, y) {
  for (let i = graph.nodes.length - 1; i >= 0; i -= 1) {
    const node = graph.nodes[i];
    const radius = node.r + 4 / Math.max(0.2, graph.view.k);
    const dx = x - node.x;
    const dy = y - node.y;
    if (dx * dx + dy * dy <= radius * radius) return node;
  }
  return null;
}

function resizeGraphCanvas() {
  const graph = ensureGraph();
  if (!graph.canvas) return;
  const canvas = graph.canvas;
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width || canvas.parentElement.clientWidth || 1));
  const height = Math.max(1, Math.round(rect.height || canvas.parentElement.clientHeight || 1));
  const dpr = window.devicePixelRatio || 1;
  graph.width = width;
  graph.height = height;
  graph.dpr = dpr;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
}

function graphZoomAt(graph, factor, sx, sy) {
  const beforeX = (sx - graph.width / 2 - graph.view.x) / graph.view.k;
  const beforeY = (sy - graph.height / 2 - graph.view.y) / graph.view.k;
  const next = Math.min(4.5, Math.max(0.12, graph.view.k * factor));
  graph.view.k = next;
  graph.view.x = sx - graph.width / 2 - beforeX * next;
  graph.view.y = sy - graph.height / 2 - beforeY * next;
  graphDraw();
}

function graphZoom(factor) {
  const graph = ensureGraph();
  if (!graph.canvas) return;
  graphZoomAt(graph, factor, graph.width / 2, graph.height / 2);
}

function graphFit() {
  const graph = ensureGraph();
  if (!graph.nodes.length || !graph.canvas) return;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const node of graph.nodes) {
    minX = Math.min(minX, node.x - node.r);
    minY = Math.min(minY, node.y - node.r);
    maxX = Math.max(maxX, node.x + node.r);
    maxY = Math.max(maxY, node.y + node.r);
  }
  const width = Math.max(40, maxX - minX);
  const height = Math.max(40, maxY - minY);
  const pad = 90;
  const next = Math.min((graph.width - pad) / width, (graph.height - pad) / height, 2.1);
  graph.view.k = Math.min(2.1, Math.max(0.12, Number.isFinite(next) ? next : 1));
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  graph.view.x = -cx * graph.view.k;
  graph.view.y = -cy * graph.view.k;
  graphDraw();
}

function graphLabels() {
  settings.graphLabels = !settings.graphLabels;
  saveSettings();
  toast(settings.graphLabels ? 'Подписи включены' : 'Подписи скрыты');
  graphDraw();
}

function refreshGraphData() {
  const graph = ensureGraph();
  if (graph.loading) return Promise.resolve();
  graph.loading = true;
  return api
    .graph()
    .then((data) => {
      applyGraphData(graph, data);
    })
    .catch((err) => {
      toast(`Не удалось построить граф: ${err.message}`, 'error');
    })
    .finally(() => {
      graph.loading = false;
    });
}

function applyGraphData(graph, data) {
  const previous = new Map(graph.nodes.map((node) => [node.id, node]));
  const incoming = Array.isArray(data && data.nodes) ? data.nodes : [];
  const count = incoming.length;
  const initialRadius = 60 + Math.sqrt(Math.max(1, count)) * 38;

  graph.nodes = incoming.map((node, index) => {
    const old = previous.get(node.id);
    const angle = index * 2.399963229728653;
    const radius = initialRadius * (0.55 + ((index * 37) % 100) / 180);
    const x = old ? old.x : Math.cos(angle) * radius;
    const y = old ? old.y : Math.sin(angle) * radius;
    return {
      ...node,
      x,
      y,
      vx: old ? old.vx * 0.4 : 0,
      vy: old ? old.vy * 0.4 : 0,
      r: graphNodeRadius(node),
      fixed: false,
    };
  });

  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  graph.edges = (Array.isArray(data && data.edges) ? data.edges : [])
    .map((edge) => ({ a: byId.get(edge.from), b: byId.get(edge.to) }))
    .filter((edge) => edge.a && edge.b);

  graph.data = data;
  graph.alpha = 1;
  graph.last = 0;

  const legend = $('#graphLegend');
  if (legend) {
    legend.innerHTML = `<span>${graph.nodes.length} ${plural(
      graph.nodes.length,
      'заметка',
      'заметки',
      'заметок'
    )}</span><span>${graph.edges.length} ${plural(
      graph.edges.length,
      'связь',
      'связи',
      'связей'
    )}</span>`;
  }
  const empty = $('#graphEmpty');
  if (empty) empty.classList.toggle('hidden', graph.nodes.length > 0);

  initGraphCanvas();
  resizeGraphCanvas();
  if (!graph.fitted && graph.nodes.length) {
    graph.fitted = true;
    setTimeout(() => graphFit(), 80);
  }
  startGraphLoop();
  graphDraw();
}

function startGraphIfNeeded() {
  const tab = activeTab();
  if (!tab || tab.type !== 'graph') return;
  initGraphCanvas();
  resizeGraphCanvas();
  if (!ensureGraph().data) refreshGraphData();
  startGraphLoop();
}

function startGraphLoop() {
  const graph = ensureGraph();
  if (graph.raf != null) return;
  graph.last = 0;
  graph.raf = requestAnimationFrame(graphTick);
}

function stopGraphLoop() {
  const graph = state.graph;
  if (!graph) return;
  if (graph.raf != null) cancelAnimationFrame(graph.raf);
  graph.raf = null;
  graph.last = 0;
}
function graphTick(now) {
  const graph = state.graph;
  if (!graph) return;
  const tab = activeTab();
  if (!tab || tab.type !== 'graph') {
    graph.raf = null;
    graph.last = 0;
    return;
  }
  const delta = graph.last ? Math.min(34, Math.max(7, now - graph.last)) / 16.667 : 1;
  graph.last = now;

  const interacting = Boolean(graph.drag || graph.panning);
  if (graph.alpha > 0.004 || interacting) {
    if (graph.alpha > 0.004) {
      graphPhysics(graph, delta);
      graph.alpha *= 0.984;
    }
    graphDraw();
    graph.raf = requestAnimationFrame(graphTick);
  } else {
    graph.raf = null;
    graphDraw();
  }
}

function graphPhysics(graph, delta) {
  const nodes = graph.nodes;
  const alpha = graph.alpha;
  for (const node of nodes) {
    node.fx = 0;
    node.fy = 0;
    node.fx -= node.x * 0.0022 * alpha;
    node.fy -= node.y * 0.0022 * alpha;
  }

  for (let i = 0; i < nodes.length; i += 1) {
    const a = nodes[i];
    for (let j = i + 1; j < nodes.length; j += 1) {
      const b = nodes[j];
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      let distance2 = dx * dx + dy * dy;
      if (distance2 < 1) {
        dx = (Math.random() - 0.5) * 2;
        dy = (Math.random() - 0.5) * 2;
        distance2 = 1;
      }
      const distance = Math.sqrt(distance2);
      const force = Math.min(10, 2400 / Math.max(320, distance2)) * alpha;
      const fx = (dx / distance) * force;
      const fy = (dy / distance) * force;
      a.fx -= fx;
      a.fy -= fy;
      b.fx += fx;
      b.fy += fy;
    }
  }

  for (const edge of graph.edges) {
    const dx = edge.b.x - edge.a.x;
    const dy = edge.b.y - edge.a.y;
    const distance = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    const force = (distance - 130) * 0.0032 * alpha;
    const fx = (dx / distance) * force;
    const fy = (dy / distance) * force;
    edge.a.fx += fx;
    edge.a.fy += fy;
    edge.b.fx -= fx;
    edge.b.fy -= fy;
  }

  for (const node of nodes) {
    if (node.fixed) {
      node.vx = 0;
      node.vy = 0;
      continue;
    }
    node.vx = (node.vx + node.fx * delta) * 0.82;
    node.vy = (node.vy + node.fy * delta) * 0.82;
    const speed = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
    if (speed > 9) {
      node.vx = (node.vx / speed) * 9;
      node.vy = (node.vy / speed) * 9;
    }
    node.x += node.vx * delta;
    node.y += node.vy * delta;
    if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) {
      node.x = (Math.random() - 0.5) * 200;
      node.y = (Math.random() - 0.5) * 200;
      node.vx = 0;
      node.vy = 0;
    }
  }
}

function graphDraw() {
  const graph = state.graph;
  if (!graph || !graph.ctx || !graph.canvas) return;
  if (!graph.width || !graph.height) resizeGraphCanvas();

  const ctx = graph.ctx;
  const width = graph.width;
  const height = graph.height;
  const scale = graph.view.k;
  const theme = graphTheme();
  const accent = theme.accent;
  const bg = theme.bg;
  const textMuted = theme.textMuted;
  const textFaint = theme.textFaint;
  const dotColor = theme.dotColor;
  const fontFamily = theme.fontFamily;

  ctx.setTransform(graph.dpr, 0, 0, graph.dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  ctx.fillStyle = dotColor;
  ctx.globalAlpha = 0.32;
  for (let x = 18; x < width; x += 38) {
    for (let y = 18; y < height; y += 38) {
      ctx.beginPath();
      ctx.arc(x, y, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  ctx.save();
  ctx.translate(width / 2 + graph.view.x, height / 2 + graph.view.y);
  ctx.scale(scale, scale);

  const hover = graph.hoverId;
  for (const edge of graph.edges) {
    const highlighted = hover && (edge.a.id === hover || edge.b.id === hover);
    ctx.beginPath();
    ctx.moveTo(edge.a.x, edge.a.y);
    ctx.lineTo(edge.b.x, edge.b.y);
    ctx.strokeStyle = highlighted ? accent : textFaint;
    ctx.globalAlpha = highlighted ? 0.8 : 0.2;
    ctx.lineWidth = (highlighted ? 1.7 : 1) / scale;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  const tab = activeTab();
  const activePath = tab && tab.type === 'note' ? tab.path : null;

  for (const node of graph.nodes) {
    const hovered = node.id === hover;
    const isActive = activePath && node.path === activePath;

    if (hovered || isActive) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.r + 6 / scale, 0, Math.PI * 2);
      ctx.fillStyle = accent;
      ctx.globalAlpha = hovered ? 0.22 : 0.14;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.beginPath();
    ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
    ctx.fillStyle = graphNodeColor(node, accent);
    ctx.globalAlpha = node.unresolved ? 0.55 : 0.92;
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.beginPath();
    ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
    if (node.unresolved) {
      ctx.setLineDash([3 / scale, 3 / scale]);
      ctx.strokeStyle = textFaint;
      ctx.lineWidth = 1.2 / scale;
    } else {
      ctx.setLineDash([]);
      ctx.strokeStyle = hovered || isActive ? accent : bg;
      ctx.lineWidth = (hovered || isActive ? 2.2 : 1.4) / scale;
    }
    ctx.stroke();
    ctx.setLineDash([]);

    const showLabel =
      hovered ||
      isActive ||
      (settings.graphLabels && scale >= 0.38 && (node.degree > 0 || graph.nodes.length <= 40));
    if (showLabel) {
      const label = node.name.length > 30 ? `${node.name.slice(0, 29)}…` : node.name;
      ctx.font = `${11 / scale}px ${fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.lineWidth = 3 / scale;
      ctx.strokeStyle = bg;
      ctx.globalAlpha = 0.85;
      ctx.strokeText(label, node.x, node.y + node.r + 5 / scale);
      ctx.globalAlpha = 1;
      ctx.fillStyle = hovered || isActive ? textMuted : textFaint;
      ctx.fillText(label, node.x, node.y + node.r + 5 / scale);
    }
  }

  ctx.restore();

  const labelsButton = $('[data-action="graph-labels"]');
  if (labelsButton) labelsButton.classList.toggle('active', Boolean(settings.graphLabels));
}
/* ==========================================================================
   Wiki-link suggestions
   ========================================================================== */

function closeSuggest() {
  const popup = $('#suggestPopup');
  if (popup) {
    popup.classList.add('hidden');
    popup.innerHTML = '';
  }
  state.suggest = null;
}

function suggestTarget(note) {
  const base = note.name;
  const duplicates = state.noteList.filter((item) => item.name === base).length;
  return duplicates > 1 ? note.path.replace(/\.md$/i, '') : base;
}

function caretScreenPoint(index) {
  const mirror = $('#caretMirror');
  if (!mirror || !editor) return null;
  const style = getComputedStyle(editor);
  const rect = editor.getBoundingClientRect();
  mirror.style.position = 'fixed';
  mirror.style.left = `${rect.left}px`;
  mirror.style.top = `${rect.top}px`;
  mirror.style.width = `${editor.clientWidth}px`;
  mirror.style.visibility = 'hidden';
  mirror.style.padding = style.padding;
  mirror.style.fontFamily = style.fontFamily;
  mirror.style.fontSize = style.fontSize;
  mirror.style.lineHeight = style.lineHeight;
  mirror.style.letterSpacing = style.letterSpacing;
  mirror.style.tabSize = style.tabSize;
  mirror.textContent = editor.value.slice(0, index);
  const marker = document.createElement('span');
  marker.textContent = '\u200b';
  mirror.appendChild(marker);
  const markerRect = marker.getBoundingClientRect();
  const point = {
    left: markerRect.left,
    top: markerRect.top - editor.scrollTop,
    height: markerRect.height || 18,
  };
  mirror.style.left = '-9999px';
  mirror.style.top = '-9999px';
  mirror.textContent = '';
  return point;
}

function positionSuggestPopup() {
  const popup = $('#suggestPopup');
  const suggest = state.suggest;
  if (!popup || !suggest) return;
  const point = caretScreenPoint(suggest.end);
  if (!point) return;
  const rect = popup.getBoundingClientRect();
  const width = rect.width || 288;
  const height = rect.height || 200;
  let left = point.left;
  let top = point.top + point.height + 6;
  if (top + height > window.innerHeight - 8) top = point.top - height - 6;
  if (top < 8) top = 8;
  left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
  popup.style.left = `${left}px`;
  popup.style.top = `${top}px`;
}

function renderSuggest() {
  const popup = $('#suggestPopup');
  const suggest = state.suggest;
  if (!popup || !suggest) return;

  popup.innerHTML = suggest.items
    .map((item, index) => {
      const label = item.create ? `Создать «${item.name}»` : item.note.name;
      const path = item.create ? 'Новая заметка' : item.note.path;
      const html = item.positions ? markPositions(label, item.positions) : esc(label);
      return `<div class="suggest-item ${index === suggest.index ? 'selected' : ''}" data-suggest-index="${index}">
        ${icon(item.create ? 'plus' : 'file')}
        <span class="suggest-name">${html}</span>
        <span class="suggest-path">${esc(path)}</span>
      </div>`;
    })
    .join('');

  popup.classList.remove('hidden');
  const selected = popup.querySelector('.suggest-item.selected');
  if (selected) selected.scrollIntoView({ block: 'nearest' });
  positionSuggestPopup();
}

function updateWikiSuggest() {
  const tab = activeTab();
  if (!tab || tab.type !== 'note' || tab.mode === 'read' || document.activeElement !== editor) {
    closeSuggest();
    return;
  }

  const caret = editor.selectionStart;
  if (caret !== editor.selectionEnd) {
    closeSuggest();
    return;
  }
  const before = editor.value.slice(0, caret);
  const match = /(!?)\[\[([^[\]\n]*)$/.exec(before);
  if (!match) {
    closeSuggest();
    return;
  }

  const query = match[2];
  if (query.length > 90) {
    closeSuggest();
    return;
  }

  const scored = [];
  for (const note of state.noteList) {
    const nameMatch = fuzzyMatch(query, note.name);
    const pathMatch = fuzzyMatch(query, note.path.replace(/\.md$/i, ''));
    if (!nameMatch && !pathMatch) continue;
    const useName = nameMatch && (!pathMatch || nameMatch.score >= pathMatch.score - 2);
    const found = useName ? nameMatch : pathMatch;
    let score = found.score;
    if (query && note.name.toLowerCase().startsWith(query.toLowerCase())) score += 18;
    scored.push({ note, score, positions: useName ? found.positions : [] });
  }
  scored.sort((a, b) => b.score - a.score || a.note.name.localeCompare(b.note.name, 'ru'));

  const items = scored.slice(0, 8).map((entry) => ({
    note: entry.note,
    positions: entry.positions,
  }));

  const trimmed = query.trim();
  if (trimmed) {
    const exact = state.noteList.some((note) => note.name.toLowerCase() === trimmed.toLowerCase());
    if (!exact) items.unshift({ create: true, name: trimmed });
  }

  if (!items.length) {
    closeSuggest();
    return;
  }

  state.suggest = {
    start: caret - query.length - 2 - (match[1] ? 1 : 0),
    end: caret,
    query,
    embed: Boolean(match[1]),
    items,
    index: 0,
  };
  renderSuggest();
}

function moveSuggest(delta) {
  const suggest = state.suggest;
  if (!suggest) return;
  suggest.index = (suggest.index + delta + suggest.items.length) % suggest.items.length;
  const popup = $('#suggestPopup');
  if (!popup) return;
  popup.querySelectorAll('.suggest-item').forEach((element) => {
    element.classList.toggle('selected', Number(element.dataset.suggestIndex) === suggest.index);
  });
  const selected = popup.querySelector('.suggest-item.selected');
  if (selected) selected.scrollIntoView({ block: 'nearest' });
}

function chooseSuggestion(index) {
  const suggest = state.suggest;
  if (!suggest) return;
  const item = suggest.items[index];
  if (!item) return;
  const target = item.create ? item.name : suggestTarget(item.note);
  const text = `${suggest.embed ? '!' : ''}[[${target}]]`;
  if (!item.create && item.note && item.note.name.toLowerCase() === target.toLowerCase()) {
    // Keep the shorter form for ordinary links; full paths are only used for duplicates.
  }
  editor.setRangeText(text, suggest.start, suggest.end, 'end');
  closeSuggest();
  editor.dispatchEvent(new Event('input', { bubbles: true }));
  editor.focus();
}
/* ==========================================================================
   Actions + global events
   ========================================================================== */

const actions = {
  'new-note': () => openNewNoteModal(),
  'new-folder': () => openNewFolderModal(),
  search: () => focusSearchPanel(),
  graph: () => openGraph(),
  daily: () => createDailyNote(),
  random: () => openRandomNote(),
  sync: () => openSyncModal(),
  'toggle-theme': () => toggleTheme(),
  help: () => openHelpModal(),
  settings: () => openSettingsModal(),
  vault: () => openVaultModal(),
  'collapse-all': () => toggleCollapseAll(),
  sort: () => toggleSort(),
  'toggle-left': () => toggleLeftSidebar(),
  'toggle-right': () => toggleRightSidebar(),
  more: () => openActiveNoteMenu(),
  bookmark: () => toggleBookmark(),
  'show-backlinks': () => setRightTab('backlinks'),
  'toggle-mode': () => setMode('toggle'),
  'clear-file-filter': () => {
    const input = $('#fileFilter');
    if (input) input.value = '';
    state.filter = '';
    renderTree();
    updateFieldClearButtons();
  },
  'clear-search': () => {
    const input = $('#searchInput');
    if (input) input.value = '';
    state.search.query = '';
    state.search.results = [];
    const results = $('#searchResults');
    if (results) results.innerHTML = '';
    const info = $('#searchInfo');
    if (info) info.textContent = '';
    updateFieldClearButtons();
  },
  'graph-zoom-in': () => graphZoom(1.25),
  'graph-zoom-out': () => graphZoom(0.8),
  'graph-fit': () => graphFit(),
  'graph-labels': () => graphLabels(),
  'graph-refresh': () => {
    refreshGraphData().then(() => toast('Граф обновлён'));
  },
};

function onDocumentClick(event) {
  const actionElement = event.target.closest('[data-action]');
  if (actionElement) {
    const handler = actions[actionElement.dataset.action];
    if (handler) {
      event.preventDefault();
      handler(actionElement, event);
      return;
    }
  }

  const removeBookmark = event.target.closest('[data-remove-bookmark]');
  if (removeBookmark) {
    event.preventDefault();
    event.stopPropagation();
    const path = removeBookmark.dataset.removeBookmark;
    state.bookmarks = state.bookmarks.filter((item) => item !== path);
    saveVaultUi();
    renderBookmarks();
    updateBookmarkButton();
    return;
  }

  const closeButton = event.target.closest('[data-close-tab]');
  if (closeButton) {
    event.preventDefault();
    event.stopPropagation();
    closeTab(closeButton.dataset.closeTab);
    return;
  }

  const tabElement = event.target.closest('.tab');
  if (tabElement && tabElement.dataset.tabId) {
    activateTab(tabElement.dataset.tabId);
    return;
  }

  const folderArrow = event.target.closest('[data-toggle-folder]');
  if (folderArrow) {
    event.preventDefault();
    toggleFolder(folderArrow.dataset.toggleFolder);
    return;
  }

  const treeMore = event.target.closest('[data-menu-path]');
  if (treeMore) {
    event.preventDefault();
    const rect = treeMore.getBoundingClientRect();
    if (treeMore.dataset.menuType === 'folder') {
      showFolderContextMenu(treeMore.dataset.menuPath, rect.left, rect.bottom + 3);
    } else {
      showNoteContextMenu(treeMore.dataset.menuPath, rect.left, rect.bottom + 3);
    }
    return;
  }

  const treeRow = event.target.closest('.tree-row');
  if (treeRow) {
    const path = treeRow.dataset.path;
    if (treeRow.dataset.type === 'folder') toggleFolder(path);
    else openNote(path);
    return;
  }

  const panelTab = event.target.closest('.panel-tab');
  if (panelTab) {
    setPanel(panelTab.dataset.panel);
    return;
  }

  const rightTab = event.target.closest('.right-tab');
  if (rightTab) {
    setRightTab(rightTab.dataset.right);
    return;
  }

  const modeButton = event.target.closest('#modeSwitch button');
  if (modeButton) {
    setMode(modeButton.dataset.mode);
    return;
  }

  const suggestItem = event.target.closest('[data-suggest-index]');
  if (suggestItem) {
    event.preventDefault();
    chooseSuggestion(Number(suggestItem.dataset.suggestIndex));
    return;
  }

  const paletteItem = event.target.closest('[data-palette-index]');
  if (paletteItem) {
    state.palette.index = Number(paletteItem.dataset.paletteIndex);
    runPaletteSelection();
    return;
  }

  const searchResult = event.target.closest('.search-result[data-path]');
  if (searchResult) {
    openNote(searchResult.dataset.path);
    return;
  }

  const tag = event.target.closest('[data-tag]');
  if (tag) {
    searchForTag(tag.dataset.tag);
    return;
  }

  const bookmarkRow = event.target.closest('.bookmark-row[data-path]');
  if (bookmarkRow) {
    openNote(bookmarkRow.dataset.path);
    return;
  }

  const recentRow = event.target.closest('.recent-row[data-path]');
  if (recentRow) {
    openNote(recentRow.dataset.path);
    return;
  }

  const outlineItem = event.target.closest('.outline-item');
  if (outlineItem) {
    const tab = activeTab();
    const heading =
      tab && tab.headings
        ? tab.headings.find((item) => item.line === Number(outlineItem.dataset.line))
        : null;
    if (heading) navigateHeading(heading);
    return;
  }

  const refRow = event.target.closest('.backlink-item[data-path], .outgoing-item[data-path]');
  if (refRow) {
    openNote(refRow.dataset.path);
    return;
  }

  const internalLink = event.target.closest('a[data-target]');
  if (internalLink) {
    event.preventDefault();
    openInternalLink(
      internalLink.dataset.target,
      internalLink.dataset.heading || '',
      event.ctrlKey || event.metaKey
    );
    return;
  }

  const headingAnchor = event.target.closest('[data-anchor]');
  if (headingAnchor) {
    event.preventDefault();
    const element = document.getElementById(headingAnchor.dataset.anchor);
    if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }

  const copyCode = event.target.closest('[data-copy-code]');
  if (copyCode) {
    event.preventDefault();
    const block = copyCode.closest('.code-block');
    const code = block ? block.querySelector('code') : null;
    if (code) {
      copyToClipboard(code.textContent)
        .then(() => toast('Код скопирован', 'success'))
        .catch(() => toast('Не удалось скопировать код', 'error'));
    }
  }
}

function onDocumentMouseDown(event) {
  if (state.suggest) {
    const popup = $('#suggestPopup');
    if (!popup || !popup.contains(event.target)) closeSuggest();
  }
}

function onDocumentContextMenu(event) {
  const row = event.target.closest('.tree-row');
  if (!row) return;
  event.preventDefault();
  const rect = row.getBoundingClientRect();
  if (row.dataset.type === 'folder') showFolderContextMenu(row.dataset.path, rect.left + 20, rect.top + 6);
  else showNoteContextMenu(row.dataset.path, rect.left + 20, rect.top + 6);
}

function onFileFilterInput(event) {
  state.filter = event.target.value;
  updateFieldClearButtons();
  renderTree();
}

let searchDebounce = null;

function onSearchInput(event) {
  const value = event.target.value;
  updateFieldClearButtons();
  if (!value.trim()) {
    state.search.query = '';
    state.search.results = [];
    const results = $('#searchResults');
    if (results) results.innerHTML = '';
    const info = $('#searchInfo');
    if (info) info.textContent = '';
    return;
  }
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => runSearch(value.trim()), 180);
}

function getEventKey(event) {
  if (event.code && event.code.startsWith('Key')) {
    return event.code.slice(3).toLowerCase();
  }
  if (event.code === 'Comma') return ',';
  if (event.code === 'Period') return '.';
  return (event.key || '').toLowerCase();
}

function editorKeydown(event) {
  if (state.suggest) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveSuggest(1);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveSuggest(-1);
      return;
    }
    if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault();
      chooseSuggestion(state.suggest.index);
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      closeSuggest();
      return;
    }
  }

  const mod = event.ctrlKey || event.metaKey;
  const key = getEventKey(event);

  if (event.key === 'Tab' && !mod && !event.altKey) {
    event.preventDefault();
    insertEditorText('  ');
    return;
  }

  if (event.key === 'Enter' && !event.shiftKey && !mod && !event.altKey) {
    if (continueListOnEnter()) {
      event.preventDefault();
      return;
    }
  }

  if (mod && key === 'b') {
    event.preventDefault();
    wrapEditorSelection('**', '**');
    return;
  }
  if (mod && key === 'i') {
    event.preventDefault();
    wrapEditorSelection('*', '*');
    return;
  }
  if (mod && key === 'k') {
    event.preventDefault();
    wrapEditorSelection('[[', ']]');
    return;
  }
}

function insertEditorText(text) {
  editor.setRangeText(text, editor.selectionStart, editor.selectionEnd, 'end');
  editor.dispatchEvent(new Event('input', { bubbles: true }));
}

function wrapEditorSelection(prefix, suffix) {
  const start = editor.selectionStart;
  const end = editor.selectionEnd;
  const selected = editor.value.slice(start, end);
  const insert = `${prefix}${selected}${suffix}`;
  editor.setRangeText(insert, start, end, 'end');
  if (start === end) {
    const caret = start + prefix.length;
    editor.setSelectionRange(caret, caret);
  } else {
    editor.setSelectionRange(start + prefix.length, end + prefix.length);
  }
  editor.dispatchEvent(new Event('input', { bubbles: true }));
}

function continueListOnEnter() {
  const value = editor.value;
  const caret = editor.selectionStart;
  if (caret !== editor.selectionEnd) return false;
  const lineStart = value.lastIndexOf('\n', caret - 1) + 1;
  const line = value.slice(lineStart, caret);
  const match = line.match(/^(\s*)([-*+]|\d+[.)])(\s+)(\[[ xX]\]\s+)?(.*)$/);
  if (!match) return false;

  if (!match[5].trim()) {
    editor.setRangeText('', lineStart, caret, 'end');
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }

  let marker = match[2];
  if (/^\d/.test(marker)) {
    const number = parseInt(marker, 10);
    marker = `${number + 1}${marker.slice(-1)}`;
  }
  const task = match[4] ? '[ ] ' : '';
  const insert = `\n${match[1]}${marker} ${task}`;
  editor.setRangeText(insert, caret, caret, 'end');
  editor.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
}

function onEditorScroll() {
  const tab = activeTab();
  if (tab && tab.type === 'note') tab.scrollTop = editorScroll.scrollTop;
  if (state.suggest) positionSuggestPopup();
}

function onReadingScroll() {
  const tab = activeTab();
  if (tab && tab.type === 'note') tab.readScrollTop = readingScroll.scrollTop;
}

function onReadingChange(event) {
  if (!event.target.classList.contains('task-checkbox')) return;
  toggleTaskLine(Number(event.target.dataset.line));
}

let searchTimer = null;

function onGlobalKeydown(event) {
  if (state.palette.open) return;

  if (state.modal) {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeModal();
    }
    return;
  }

  if (event.key === 'Escape') {
    if (state.suggest) {
      event.preventDefault();
      closeSuggest();
      return;
    }
    const menu = $('#contextMenu');
    if (menu && !menu.classList.contains('hidden')) {
      event.preventDefault();
      closeContextMenu();
      return;
    }
  }

  const mod = event.ctrlKey || event.metaKey;
  const key = getEventKey(event);
  const target = event.target;
  const typing =
    target &&
    (target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.isContentEditable);

  if (mod) {
    if (key === 'p') {
      event.preventDefault();
      openCommandPalette('commands');
      return;
    }
    if (key === 'o') {
      event.preventDefault();
      openCommandPalette('notes');
      return;
    }
    if (key === 'n' && event.shiftKey) {
      event.preventDefault();
      openNewFolderModal();
      return;
    }
    if (key === 'n') {
      event.preventDefault();
      openNewNoteModal();
      return;
    }
    if (key === 's') {
      event.preventDefault();
      saveActiveNow();
      return;
    }
    if (key === 'e' && event.shiftKey) {
      event.preventDefault();
      setMode('split');
      return;
    }
    if (key === 'e') {
      event.preventDefault();
      setMode('toggle');
      return;
    }
    if (key === 'w') {
      event.preventDefault();
      closeActiveTab();
      return;
    }
    if (key === 't' && event.shiftKey) {
      event.preventDefault();
      reopenClosedTab();
      return;
    }
    if (key === 'tab') {
      event.preventDefault();
      cycleTab(event.shiftKey ? -1 : 1);
      return;
    }
    if (key === 'f') {
      event.preventDefault();
      focusSearchPanel();
      return;
    }
    if (key === 'g') {
      event.preventDefault();
      openGraph();
      return;
    }
    if (key === 'd') {
      event.preventDefault();
      createDailyNote();
      return;
    }
    if (key === 'b' && event.shiftKey) {
      event.preventDefault();
      toggleBookmark();
      return;
    }
    if (key === 'l' && event.shiftKey) {
      event.preventDefault();
      toggleLeftSidebar();
      return;
    }
    if (key === ',') {
      event.preventDefault();
      openSettingsModal();
      return;
    }
  } else {
    if (event.key === 'F2') {
      const tab = activeTab();
      if (tab && tab.type === 'note') {
        event.preventDefault();
        openRenameModal('note', tab.path);
        return;
      }
    }
    if (event.key === '?' && !typing) {
      event.preventDefault();
      openHelpModal();
      return;
    }
  }
}

function initResizers() {
  $$('.resize-handle').forEach((handle) => {
    handle.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      const side = handle.dataset.resize;
      const startX = event.clientX;
      const startWidth = side === 'left' ? settings.leftWidth : settings.rightWidth;
      handle.classList.add('dragging');
      document.body.classList.add('is-resizing');

      const onMove = (moveEvent) => {
        const delta = moveEvent.clientX - startX;
        const raw = side === 'left' ? startWidth + delta : startWidth - delta;
        const next = Math.max(210, Math.min(560, raw));
        if (side === 'left') settings.leftWidth = next;
        else settings.rightWidth = next;
        applySettings();
      };

      const onUp = () => {
        handle.classList.remove('dragging');
        document.body.classList.remove('is-resizing');
        window.removeEventListener('pointermove', onMove);
        saveSettings();
        saveVaultUi();
        resizeEditorNow();
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp, { once: true });
    });
  });
}

function bindEvents() {
  document.addEventListener('click', onDocumentClick);
  document.addEventListener('mousedown', onDocumentMouseDown, true);
  document.addEventListener('contextmenu', onDocumentContextMenu);
  document.addEventListener('keydown', onGlobalKeydown);

  const fileFilter = $('#fileFilter');
  if (fileFilter) fileFilter.addEventListener('input', onFileFilterInput);

  const searchInput = $('#searchInput');
  if (searchInput) searchInput.addEventListener('input', onSearchInput);

  const cmdInput = $('#cmdInput');
  if (cmdInput) {
    cmdInput.addEventListener('input', onPaletteInput);
    cmdInput.addEventListener('keydown', onPaletteKeydown);
  }

  const cmdOverlay = $('#cmdOverlay');
  if (cmdOverlay) {
    cmdOverlay.addEventListener('mousedown', (event) => {
      if (event.target === cmdOverlay) closePalette();
    });
  }

  const cmdList = $('#cmdList');
  if (cmdList) {
    cmdList.addEventListener('mouseover', (event) => {
      const item = event.target.closest('[data-palette-index]');
      if (!item) return;
      const index = Number(item.dataset.paletteIndex);
      if (index === state.palette.index) return;
      state.palette.index = index;
      updatePaletteSelection();
    });
  }

  const suggestPopup = $('#suggestPopup');
  if (suggestPopup) {
    suggestPopup.addEventListener('mousedown', (event) => event.preventDefault());
  }

  if (editor) {
    editor.addEventListener('input', onEditorInput);
    editor.addEventListener('keydown', editorKeydown);
    editor.addEventListener('click', () => updateWikiSuggest());
  }

  if (editorScroll) editorScroll.addEventListener('scroll', onEditorScroll);
  if (readingScroll) readingScroll.addEventListener('scroll', onReadingScroll);
  if (readingView) readingView.addEventListener('change', onReadingChange);

  window.addEventListener('resize', debounce(() => {
    const tab = activeTab();
    if (tab && tab.type === 'graph') {
      resizeGraphCanvas();
      graphDraw();
    } else {
      resizeEditorNow();
    }
  }, 80));

  window.addEventListener('beforeunload', flushAllNotes);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushCurrentTab();
      saveVaultUi();
    }
  });

  initResizers();
}

function flushAllNotes() {
  saveVaultUi();
  for (const tab of state.tabs) {
    if (tab.type !== 'note' || !tab.loaded || !tab.dirty) continue;
    try {
      const payload = JSON.stringify({ path: tab.path, content: tab.content });
      navigator.sendBeacon('/api/note/write', new Blob([payload], { type: 'application/json' }));
    } catch {
      /* ignore */
    }
  }
}

/* ==========================================================================
   Boot
   ========================================================================== */

async function loadVault() {
  const info = await api.info();
  state.vault = info;
  state.vaultKey = info.path;
  rememberVault(info);
  loadVaultUi();
  applySettings();
  await refreshTree();
  await loadTags();
  setPanel('files');
}

async function restoreSession() {
  const saved = state.savedTabs.filter((path) => state.treeIndex.has(path)).slice(0, 14);
  if (!saved.length) {
    renderMain();
    updateTreeActiveState();
    return;
  }

  state.restoring = true;
  try {
    for (const path of saved) {
      try {
        await openNote(path, { activate: false });
      } catch {
        /* skip unreadable notes */
      }
    }
    const preferred =
      (state.savedActive && tabForPath(state.savedActive)) || state.tabs[0] || null;
    state.activeId = preferred ? preferred.id : null;
    renderTabs();
    renderMain();
    updateTreeActiveState();
  } finally {
    state.restoring = false;
  }
}

async function boot() {
  mountIcons();
  applySettings();
  bindEvents();
  try {
    await loadVault();
    await restoreSession();
  } catch (err) {
    const host = $('#emptyView');
    if (host) {
      host.classList.remove('hidden');
      host.innerHTML = `<div class="empty-inner"><div class="empty-gem">${icon('alert')}</div>
        <h1>Не удалось открыть хранилище</h1>
        <p>${esc(err.message)}</p>
        <div class="empty-actions"><button class="btn primary" data-action="vault">${icon(
          'folder'
        )} Выбрать хранилище</button></div></div>`;
    }
    toast(`Ошибка запуска: ${err.message}`, 'error');
  }
}

boot();




