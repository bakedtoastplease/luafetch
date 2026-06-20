/* ═══════════════════════════════════════════════════════════════
   luafetch · script.js
   GitHub API → group scene files → sidebar → code + media viewer
   luafetch is a C+Lua 3D terminal animation & graphics engine.
   Each .lua file in /scripts is a self-contained scene definition.
═══════════════════════════════════════════════════════════════ */

const API_URL =
  'https://api.github.com/repos/bakedtoastplease/luafetch/contents/scripts';

/* Recognised media extensions for scene previews (recordings, screenshots) */
const VIDEO_EXT = ['mp4', 'webm', 'mpv'];
const IMAGE_EXT = ['png', 'jpg', 'jpeg', 'gif', 'webp'];

/* ── DOM refs ─────────────────────────────────────────────── */
const fileList       = document.getElementById('file-list');
const sidebarError   = document.getElementById('sidebar-error');
const errorMsg       = document.getElementById('error-msg');
const tabFilename    = document.getElementById('tab-filename');

const panePreview    = document.getElementById('pane-preview');
const previewPH      = document.getElementById('preview-placeholder');
const mediaContainer = document.getElementById('media-container');

const paneCode       = document.getElementById('pane-code');
const codePH         = document.getElementById('code-placeholder');
const codeViewer     = document.getElementById('code-viewer');
const codeLoading    = document.getElementById('code-loading');
const codeTable      = document.getElementById('code-table');

/* ── State ────────────────────────────────────────────────── */
let currentScene = null;   // baseName of the active scene
let activeTab    = 'preview';
let sceneGroups  = {};     // { baseName: { lua, video, image } }

/* ════════════════════════════════════════════════════════════
   1. BOOT — fetch the /scripts directory listing from GitHub API
   Each .lua file is a scene script for the luafetch engine.
   Media files (.mp4, .png …) with the same basename are
   terminal recordings / screenshots of that scene's output.
════════════════════════════════════════════════════════════ */
(async function init() {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error(`GitHub API responded with ${res.status} ${res.statusText}`);
    const files = await res.json();
    if (!Array.isArray(files)) throw new Error('Unexpected API response — expected an array.');
    buildGroups(files);
    renderSidebar();
  } catch (err) {
    showSidebarError(err.message);
  }
})();

/* ════════════════════════════════════════════════════════════
   2. GROUP files by baseName
   Example:
     cube_3d_render.lua  +  cube_3d_render.mp4  → one scene group
     matrix_rain.lua     +  matrix_rain.gif      → one scene group
     donut_3d.lua                                → one scene group (no media)
════════════════════════════════════════════════════════════ */
function buildGroups(files) {
  sceneGroups = {};

  files.forEach(file => {
    if (file.type !== 'file') return;
    const dot = file.name.lastIndexOf('.');
    if (dot === -1) return;

    const baseName = file.name.slice(0, dot).toLowerCase();
    const ext      = file.name.slice(dot + 1).toLowerCase();

    if (!sceneGroups[baseName]) {
      sceneGroups[baseName] = { lua: null, video: null, image: null };
    }

    if (ext === 'lua') {
      sceneGroups[baseName].lua = file;
    } else if (VIDEO_EXT.includes(ext)) {
      sceneGroups[baseName].video = file;
    } else if (IMAGE_EXT.includes(ext)) {
      sceneGroups[baseName].image = file;
    }
  });

  /* Only list scenes that have a corresponding .lua scene script */
  Object.keys(sceneGroups).forEach(k => {
    if (!sceneGroups[k].lua) delete sceneGroups[k];
  });
}

/* ════════════════════════════════════════════════════════════
   3. SIDEBAR — render the scene list
════════════════════════════════════════════════════════════ */
function renderSidebar() {
  fileList.innerHTML = '';
  const names = Object.keys(sceneGroups).sort();

  if (names.length === 0) {
    showSidebarError('No scene scripts found in the repository folder.');
    return;
  }

  names.forEach(name => {
    const li = document.createElement('li');
    li.className = 'file-item';
    li.dataset.name = name;

    /* Pick a glyph that hints at the scene content */
    const icon = sceneIcon(name);
    li.innerHTML = `<span class="file-icon">${icon}</span>${escapeHtml(name)}.lua`;
    li.addEventListener('click', () => selectScene(name, li));
    fileList.appendChild(li);
  });
}

/** Return a single character that visually hints at the scene type */
function sceneIcon(name) {
  if (/spark|fire|flame|plasma/i.test(name))  return '✦';
  if (/cube|box|3d|mesh|poly/i.test(name))    return '◈';
  if (/matrix|rain|fall|drop/i.test(name))    return '▓';
  if (/donut|torus|ring/i.test(name))         return '◉';
  if (/star|galaxy|space|orbit/i.test(name))  return '★';
  if (/wave|sine|ripple/i.test(name))         return '∿';
  return '▶';
}

function showSidebarError(msg) {
  fileList.innerHTML = '';
  errorMsg.textContent = msg;
  sidebarError.classList.remove('hidden');
}

/* ════════════════════════════════════════════════════════════
   4. SCENE SELECTION
════════════════════════════════════════════════════════════ */
function selectScene(name, liEl) {
  if (currentScene === name) return;
  currentScene = name;

  /* Highlight active item in sidebar */
  document.querySelectorAll('.file-item').forEach(el => el.classList.remove('active'));
  liEl.classList.add('active');

  /* Update tab bar filename */
  tabFilename.textContent = `${name}.lua`;

  /* Refresh panes */
  loadPreview(name);
  if (activeTab === 'code') loadCode(name);
  else resetCodePane();
}

/* ════════════════════════════════════════════════════════════
   5. TAB SWITCHING
════════════════════════════════════════════════════════════ */
document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    if (tab === activeTab) return;
    activeTab = tab;

    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');

    if (tab === 'preview') {
      paneCode.classList.add('hidden');
      panePreview.classList.remove('hidden');
    } else {
      panePreview.classList.add('hidden');
      paneCode.classList.remove('hidden');
      if (currentScene) loadCode(currentScene);
    }
  });
});

/* ════════════════════════════════════════════════════════════
   6. PREVIEW PANE
   Shows a terminal recording (video) or screenshot (image)
   of the scene as rendered by the luafetch C engine.
════════════════════════════════════════════════════════════ */
function loadPreview(name) {
  const group = sceneGroups[name];
  mediaContainer.innerHTML = '';

  if (group.video) {
    /* Terminal recording — autoplay looped, muted, with controls */
    const vid = document.createElement('video');
    vid.src        = group.video.download_url;
    vid.autoplay   = true;
    vid.loop       = true;
    vid.muted      = true;
    vid.controls   = true;
    vid.playsInline = true;
    mediaContainer.appendChild(vid);
    showMedia();
  } else if (group.image) {
    /* Static screenshot of the scene's terminal output */
    const img = document.createElement('img');
    img.src     = group.image.download_url;
    img.alt     = `${name} — terminal render preview`;
    img.loading = 'lazy';
    mediaContainer.appendChild(img);
    showMedia();
  } else {
    /* No media recorded yet for this scene */
    const ph = document.getElementById('preview-placeholder');
    ph.querySelector('.placeholder-glyph').textContent = '▶';
    ph.querySelector('p').textContent = 'No recording available for this scene yet.';
    showPreviewPlaceholder();
  }
}

function showMedia() {
  previewPH.classList.add('hidden');
  mediaContainer.classList.remove('hidden');
}

function showPreviewPlaceholder() {
  mediaContainer.classList.add('hidden');
  previewPH.classList.remove('hidden');
}

/* ════════════════════════════════════════════════════════════
   7. SOURCE PANE
   Fetches the raw .lua scene script from GitHub and renders
   it with line numbers and lightweight syntax highlighting.
════════════════════════════════════════════════════════════ */
async function loadCode(name) {
  const group = sceneGroups[name];
  if (!group?.lua) return;

  codePH.classList.add('hidden');
  codeViewer.classList.add('hidden');
  codeLoading.classList.remove('hidden');

  try {
    const res = await fetch(group.lua.download_url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    renderCode(text);
  } catch (err) {
    codeLoading.classList.add('hidden');
    codePH.querySelector('p').textContent = `Could not load scene source: ${err.message}`;
    codePH.classList.remove('hidden');
  }
}

function resetCodePane() {
  codeLoading.classList.add('hidden');
  codeViewer.classList.add('hidden');
  codePH.classList.remove('hidden');
}

function renderCode(text) {
  codeLoading.classList.add('hidden');
  codePH.classList.add('hidden');

  const lines = text.split('\n');
  codeTable.innerHTML = '';

  lines.forEach((line, i) => {
    const tr = document.createElement('tr');

    const tdNum = document.createElement('td');
    tdNum.className = 'line-num';
    tdNum.textContent = i + 1;

    const tdCode = document.createElement('td');
    tdCode.className = 'line-code';
    tdCode.innerHTML = highlightLua(line);

    tr.appendChild(tdNum);
    tr.appendChild(tdCode);
    codeTable.appendChild(tr);
  });

  codeViewer.classList.remove('hidden');
}

/* ════════════════════════════════════════════════════════════
   8. LUA SYNTAX HIGHLIGHT
   Lightweight regex pass — covers the patterns used in
   luafetch scene scripts: keywords, strings, comments,
   numbers, and common built-ins.
════════════════════════════════════════════════════════════ */
function highlightLua(raw) {
  const KEYWORDS = /\b(and|break|do|else|elseif|end|false|for|function|goto|if|in|local|nil|not|or|repeat|return|then|true|until|while)\b/g;
  const BUILTINS = /\b(print|tostring|tonumber|type|pairs|ipairs|next|select|unpack|table|string|math|io|os|require|pcall|xpcall|error|assert|setmetatable|getmetatable|rawget|rawset)\b/g;

  let out = escapeHtml(raw);

  /* Long strings [[ … ]] — single-line only */
  out = out.replace(/(\[\[.*?\]\])/g,
    `<span class="lua-string">$1</span>`);

  /* Quoted strings — handle HTML-escaped quotes */
  out = out.replace(/(&#34;(?:[^\\]|\\.)*?&#34;|&#39;(?:[^\\]|\\.)*?&#39;)/g,
    `<span class="lua-string">$1</span>`);

  /* Single-line comments -- … */
  out = replaceOutside(out, /--.*/g,
    m => `<span class="lua-comment">${m}</span>`);

  /* Numbers */
  out = replaceOutside(out, /\b(0x[\da-fA-F]+|\d+\.?\d*(?:[eE][+-]?\d+)?)\b/g,
    m => `<span class="lua-number">${m}</span>`);

  /* Built-ins, then keywords */
  out = replaceOutside(out, BUILTINS,
    m => `<span class="lua-builtin">${m}</span>`);
  out = replaceOutside(out, KEYWORDS,
    m => `<span class="lua-keyword">${m}</span>`);

  return out;
}

/**
 * Apply replacer only to text nodes outside existing <span> tags,
 * preventing double-wrapping.
 */
function replaceOutside(html, regex, replacer) {
  return html.replace(/(<span[^>]*>[\s\S]*?<\/span>)|([^<]+)/g,
    (full, span, text) => {
      if (span) return span;
      if (text) return text.replace(regex, replacer);
      return full;
    });
}

/* ════════════════════════════════════════════════════════════
   9. AUTO YEAR — footer copyright
════════════════════════════════════════════════════════════ */
const footerYear = document.getElementById('footer-year');
if (footerYear) footerYear.textContent = new Date().getFullYear();

/* ════════════════════════════════════════════════════════════
   10. COPY BUTTON — terminal install block
════════════════════════════════════════════════════════════ */
document.querySelectorAll('.copy-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    const el = document.getElementById(btn.dataset.target);
    if (!el) return;

    const text = el.innerText || el.textContent;
    const label = btn.querySelector('.copy-label');

    try {
      await navigator.clipboard.writeText(text);
      btn.classList.add('copied');
      label.textContent = 'copied!';
    } catch {
      /* Fallback: select the text block */
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }

    setTimeout(() => {
      btn.classList.remove('copied');
      label.textContent = 'copy';
    }, 2000);
  });
});

/* ════════════════════════════════════════════════════════════
   UTIL
════════════════════════════════════════════════════════════ */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&#34;')
    .replace(/'/g, '&#39;');
}
