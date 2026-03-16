/* ════════════════════════════════════════════
   app.js  —  shared logic, language-agnostic
   Depends on: LANG (from lang/ja.js or lang/en.js)
════════════════════════════════════════════ */

const DEFAULT_ROWS = 5;

/* ── field(row, key, lang): pick localised value ──
   Tries row[key_lang] first, falls back to row[key].
   Adding a _en column to any CSV is all it takes. */
function field(row, key, lang) {
  const v = row[`${key}_${lang}`];
  return (v !== undefined && v !== '') ? v : (row[key] ?? '');
}

/* ── linkWrap(text, url): wrap text in <a> if url present ── */
function linkWrap(text, url) {
  if (!url || !url.trim()) return text;
  return `<a href="${url}" target="_blank" rel="noopener" class="td-link">${text}</a>`;
}

/* ── Data loaders ── */
function parseCSV(text) {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    const cols = []; let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') { inQ = !inQ; }
      else if (line[i] === ',' && !inQ) { cols.push(cur.trim()); cur = ''; }
      else { cur += line[i]; }
    }
    cols.push(cur.trim());
    const obj = {};
    headers.forEach((h, i) => { obj[h] = cols[i] ?? ''; });
    return obj;
  });
}
async function loadCSV(path) {
  try { const r = await fetch(path); if (!r.ok) throw 0; return parseCSV(await r.text()); } catch { return null; }
}
async function loadJSON(path) {
  try { const r = await fetch(path); if (!r.ok) throw 0; return await r.json(); } catch { return null; }
}
async function loadText(path) {
  try { const r = await fetch(path); if (!r.ok) throw 0; return await r.text(); } catch { return null; }
}

/* ── BibTeX ── */
const _bibtexCache = {};
async function fetchBibtex(bibSrc) {
  if (!bibSrc) return null;
  if (_bibtexCache[bibSrc] !== undefined) return _bibtexCache[bibSrc];
  const text = await loadText(bibSrc);
  _bibtexCache[bibSrc] = text;
  return text;
}
function extractAuthors(bibtex) {
  if (!bibtex) return null;
  const m = bibtex.match(/author\s*=\s*[{"]([\s\S]*?)["}]\s*[,}]/i);
  if (!m) return null;
  return m[1]
    .split(/\s+and\s+/i)
    .map(a => {
      a = a.trim();
      if (a.includes(',')) {
        const [last, first] = a.split(',').map(s => s.trim());
        return first ? `${first} ${last}` : last;
      }
      return a;
    })
    .join(', ');
}

/* ── BibTeX Modal ── */
function openBibtexModal(text) {
  document.getElementById('bibtexContent').textContent = text;
  document.getElementById('bibtexModal').classList.add('open');
  const btn = document.getElementById('copyBtn');
  btn.textContent = LANG.copy; btn.classList.remove('copied');
}
function closeBibtexModal(e) {
  if (e.target === document.getElementById('bibtexModal'))
    document.getElementById('bibtexModal').classList.remove('open');
}
function copyBibtex() {
  navigator.clipboard.writeText(document.getElementById('bibtexContent').textContent).then(() => {
    const btn = document.getElementById('copyBtn');
    btn.textContent = LANG.copied; btn.classList.add('copied');
    setTimeout(() => { btn.textContent = LANG.copy; btn.classList.remove('copied'); }, 2000);
  });
}
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') document.getElementById('bibtexModal').classList.remove('open');
});

/* ════════════════════════════════════════════
   THEME
   Priority: 1) user's explicit localStorage choice
             2) OS prefers-color-scheme (default)
   → First-time visitors always see their OS theme.
   → Returning visitors see what they last chose.
════════════════════════════════════════════ */
function _resolveTheme() {
  const stored = localStorage.getItem('theme');
  if (stored === 'dark' || stored === 'light') return stored;
  // No stored preference → respect OS setting
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// Called inline in <head> before render to prevent flash
(function applyStoredTheme() {
  document.documentElement.setAttribute('data-theme', _resolveTheme());
})();

function _updateToggleUI(theme) {
  const btn = document.getElementById('themeToggle');
  if (!btn) return;
  const isDark = theme === 'dark';
  btn.textContent = isDark ? '☀️' : '🌙';
  // data-mode drives CSS: light fill for ☀️ (dark bg), dark fill for 🌙 (light bg)
  btn.setAttribute('data-mode', isDark ? 'dark' : 'light');
  btn.title = isDark ? LANG.theme.switchToLight : LANG.theme.switchToDark;
  btn.setAttribute('aria-label', btn.title);
}

function toggleTheme() {
  const next = _resolveTheme() === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  _updateToggleUI(next);
}

/* ── Profile ── */
function renderProfile(p, lang) {
  if (!p) return;
  const nameMain = lang === 'en' ? (p.name_en ?? '') : (p.name_ja ?? '');
  const nameSub  = lang === 'en' ? (p.name_ja ?? '') : (p.name_en ?? '');
  document.getElementById('profileNameMain').textContent = nameMain;
  document.getElementById('profileNameSub').textContent  = nameSub;
  document.title = nameMain + ' | My Page';

  const affiliations = lang === 'en'
    ? (p.affiliations_en ?? p.affiliations ?? [])
    : (p.affiliations_ja ?? p.affiliations ?? []);
  const ad = document.getElementById('profileAffiliations');
  affiliations.forEach(a => {
    const s = document.createElement('span'); s.className = 'affil-tag'; s.textContent = a; ad.appendChild(s);
  });

  const sd = document.getElementById('profileSns');
  if (p.linkedin) sd.innerHTML += `<a class="sns-btn" href="${p.linkedin}" target="_blank" rel="noopener" title="LinkedIn"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg></a>`;
  if (p.x) sd.innerHTML += `<a class="sns-btn" href="${p.x}" target="_blank" rel="noopener" title="X (Twitter)"><svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.736-8.857L1.254 2.25H8.08l4.253 5.622 5.91-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg></a>`;
  if (p.scholar) sd.innerHTML += `<a class="sns-btn" href="${p.scholar}" target="_blank" rel="noopener" title="Google Scholar"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 24a7 7 0 1 1 0-14 7 7 0 0 1 0 14zm0-24L0 9.5l4.838 3.94A8 8 0 0 1 12 10a8 8 0 0 1 7.162 3.44L24 9.5 12 0z"/></svg></a>`;
}

/* ── QR ── */
function qrSVG() {
  return `<svg viewBox="0 0 40 40" width="48" height="48" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="15" height="15" rx="1.2" stroke="#ccc" stroke-width="1.6"/><rect x="5.5" y="5.5" width="8" height="8" rx="0.5" fill="#ccc"/><rect x="23" y="2" width="15" height="15" rx="1.2" stroke="#ccc" stroke-width="1.6"/><rect x="26.5" y="5.5" width="8" height="8" rx="0.5" fill="#ccc"/><rect x="2" y="23" width="15" height="15" rx="1.2" stroke="#ccc" stroke-width="1.6"/><rect x="5.5" y="26.5" width="8" height="8" rx="0.5" fill="#ccc"/><rect x="23" y="23" width="4" height="4" rx="0.5" fill="#ccc"/><rect x="29" y="23" width="4" height="4" rx="0.5" fill="#ccc"/><rect x="35" y="23" width="3" height="4" rx="0.5" fill="#ccc"/><rect x="23" y="29" width="4" height="4" rx="0.5" fill="#ccc"/><rect x="29" y="35" width="4" height="3" rx="0.5" fill="#ccc"/><rect x="35" y="29" width="3" height="9" rx="0.5" fill="#ccc"/></svg>`;
}
function renderQR(items, lang, dataRoot) {
  const labelEl = document.getElementById('recentLabelEl');
  if (labelEl) labelEl.textContent = LANG.recentContent;
  if (!items) return;
  const c = document.getElementById('qrContainer');
  items.forEach(res => {
    const desc = field(res, 'desc', lang);
    const g = document.createElement('div'); g.className = 'qr-group';
    const p = document.createElement('div'); p.className = 'qr-pair';
    res.items.forEach(it => {
      const typeLabel = field(it, 'type', lang);
      const imgSrc = it.qrSrc ? (dataRoot + it.qrSrc) : null;
      const el = document.createElement(it.link ? 'a' : 'div'); el.className = 'qr-item';
      if (it.link) { el.href = it.link; el.target = '_blank'; el.rel = 'noopener'; }
      el.innerHTML = `<div class="qr-box">${imgSrc ? `<img src="${imgSrc}" alt="QR: ${typeLabel}">` : qrSVG()}</div><span class="qr-type">${typeLabel}</span>`;
      p.appendChild(el);
    });
    g.appendChild(p);
    const hr = document.createElement('hr'); hr.className = 'qr-divider'; g.appendChild(hr);
    const d = document.createElement('div'); d.className = 'qr-desc'; d.innerHTML = desc.replace(/\n/g, '<br>'); g.appendChild(d);
    c.appendChild(g);
  });
}

/* ── Section toggle ── */
function initToggle(card) {
  card.querySelector('.section-header').addEventListener('click', () => card.classList.toggle('collapsed'));
}

/* ════════════════════════════════════════════
   periodToDate(str) → integer for sorting
   Handles: "2025/3", "2025/10/20", "2023/8/27-9/6", "2025/4 -"
   Returns YYYYMMDD or YYYYMM (×100 padded to same scale).
════════════════════════════════════════════ */
function periodToDate(str) {
  if (!str) return 0;
  // Extract only the START date (first date in ranges like "2023/8/27-9/6" or "2021/4 - 2025/3")
  const s = str.trim();

  // YYYY/MM/DD or YYYY/MM/DD-... (date range starting with full date)
  const mFull = s.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})/);
  if (mFull) return parseInt(mFull[1]) * 10000 + parseInt(mFull[2]) * 100 + parseInt(mFull[3]);

  // YYYY/MM (may be followed by " -", " - YYYY/MM", etc.)
  const mYM = s.match(/^(\d{4})\/(\d{1,2})/);
  if (mYM) return parseInt(mYM[1]) * 10000 + parseInt(mYM[2]) * 100;

  return 0;
}

/* ── Sort ── */
function sortTable(tbody, colIndex, getValue, state, onSorted) {
  const rows = Array.from(tbody.querySelectorAll('tr:not(.empty-row)'));
  const newDir = (state.col === colIndex && state.dir === 'desc') ? 'asc' : 'desc';
  state.col = colIndex; state.dir = newDir;
  rows.sort((a, b) => {
    const va = getValue(a), vb = getValue(b);
    if (va === vb) return 0;
    const cmp = (typeof va === 'number' && typeof vb === 'number')
      ? va - vb : String(va).localeCompare(String(vb), 'ja');
    return newDir === 'asc' ? cmp : -cmp;
  });
  rows.forEach(r => tbody.appendChild(r));
  if (onSorted) onSorted();
}
function updateSortIndicators(thead, state) {
  thead.querySelectorAll('th').forEach((th, i) => {
    th.classList.remove('sort-asc', 'sort-desc');
    if (i === state.col) th.classList.add(state.dir === 'asc' ? 'sort-asc' : 'sort-desc');
  });
}

/* ── Row limit / expand ── */
function applyRowLimit(bodyEl, footerEl, getVisibleRows) {
  const rows = getVisibleRows();
  const total = rows.length;
  const isExpanded = footerEl.dataset.expanded === 'true';
  rows.forEach((tr, i) => tr.classList.toggle('row-over-limit', !isExpanded && i >= DEFAULT_ROWS));
  const hidden = Math.max(0, total - DEFAULT_ROWS);
  const btn = footerEl.querySelector('.expand-btn');
  if (total <= DEFAULT_ROWS) { footerEl.style.display = 'none'; return; }
  footerEl.style.display = 'flex';
  btn.innerHTML = isExpanded
    ? `<span>▲ ${LANG.collapse}</span>`
    : `<span>▼ ${LANG.expand}</span><span class="row-count">${LANG.remaining(hidden)}</span>`;
}
function makeExpandFooter(id, onToggle) {
  const div = document.createElement('div');
  div.className = 'table-footer'; div.id = id; div.dataset.expanded = 'false';
  const btn = document.createElement('button'); btn.className = 'expand-btn';
  btn.onclick = () => { div.dataset.expanded = div.dataset.expanded === 'true' ? 'false' : 'true'; onToggle(); };
  div.appendChild(btn);
  return div;
}

/* ── Awards: semicolon-separated ── */
function renderAwards(awardStr) {
  if (!awardStr || !awardStr.trim()) return `<span style="color:var(--border);font-size:12px;">—</span>`;
  return `<div class="awards-cell">${awardStr.split(';').map(s => s.trim()).filter(Boolean).map(a => `<span class="badge badge-award">🏆 ${a}</span>`).join('')}</div>`;
}

/* ── Author toggle: only show when text is actually truncated ── */
function initAuthorToggles() {
  document.querySelectorAll('.td-authors').forEach(el => {
    const btn = el.nextElementSibling;
    if (!btn?.classList.contains('authors-toggle')) return;
    requestAnimationFrame(() => {
      if (el.scrollHeight > el.clientHeight + 2) btn.classList.add('visible');
    });
  });
}
function toggleAuthors(id, btn) {
  const el = document.getElementById(id);
  const expanded = el.classList.toggle('expanded');
  btn.textContent = expanded ? LANG.collapse : LANG.expand;
}

/* ── Section maker ── */
function makeSection({ id, dotClass, label, count, bodyHTML }) {
  const card = document.createElement('div');
  card.className = 'section-card'; card.id = id;
  card.innerHTML = `
    <div class="section-header">
      <div class="section-title">
        <span class="section-dot ${dotClass}"></span>
        <span class="section-label">${label}</span>
        ${count != null ? `<span class="section-count">${count}</span>` : ''}
      </div>
      <span class="section-chevron">›</span>
    </div>
    <div class="section-body">${bodyHTML}</div>`;
  initToggle(card);
  return card;
}

/* ════════════════════════════════════════════
   TABLE BUILDERS
════════════════════════════════════════════ */

/* ── Research ── */
async function buildResearchSection(data, lang, dataRoot) {
  if (!data) return `<div class="empty-state">⚠ data/research_history.csv not found</div>`;

  const bibtexTexts = await Promise.all(
    data.map(r => fetchBibtex(r.bibSrc ? (dataRoot + r.bibSrc) : ''))
  );
  data.forEach((r, i) => {
    r._bibtex = bibtexTexts[i];
    r._authors = extractAuthors(bibtexTexts[i]);
  });

  const filterBar = `<div class="filter-bar" id="researchFilters">
    <button class="filter-btn active" data-filter="all">${LANG.all}</button>
    <button class="filter-btn" data-filter="first">${LANG.firstOnly}</button>
    <button class="filter-btn" data-filter="award">${LANG.awardOnly}</button>
    <div class="filter-separator"></div>
    <button class="filter-btn" data-filter="domestic">${LANG.domestic}</button>
    <button class="filter-btn" data-filter="international">${LANG.international}</button>
  </div>`;

  const rows = data.map((r, idx) => {
    const isFirst    = r.is_first_author.trim() === 'true';
    const hasAward   = r.award && r.award.trim() !== '';
    const isDomestic = r.is_domestic.trim() === 'true';
    const hasBib     = !!r._bibtex;
    const title      = field(r, 'title', lang);
    const venue      = field(r, 'venue', lang);
    const awardStr   = field(r, 'award', lang);
    // venue_link: link on venue name
    const venueHtml  = r.venue_link ? `<a href="${r.venue_link}" target="_blank" rel="noopener" class="td-link">${venue}</a>` : venue;

    const links = [];
    if (r.paper_link)  links.push(`<a class="paper-link" href="${r.paper_link}"  target="_blank" rel="noopener">📄 ${LANG.paper}</a>`);
    if (r.slide_link)  links.push(`<a class="paper-link" href="${r.slide_link}"  target="_blank" rel="noopener">🖥 ${LANG.slides}</a>`);
    if (r.poster_link) links.push(`<a class="paper-link" href="${r.poster_link}" target="_blank" rel="noopener">🗂 ${LANG.poster}</a>`);
    if (hasBib)        links.push(`<button class="bibtex-btn" data-bib-idx="${idx}">{ } BibTeX</button>`);

    const aId = `auth-${idx}`;
    const authHtml = r._authors ? `
      <div class="td-authors" id="${aId}">${r._authors}</div>
      <button class="authors-toggle" onclick="toggleAuthors('${aId}',this)">${LANG.expand}</button>` : '';

    return `<tr class="research-row"
        data-period="${periodToDate(r.period)}"
        data-first="${isFirst}" data-award="${hasAward}" data-domestic="${isDomestic}">
      <td class="td-period">${r.period}</td>
      <td>
        <div class="td-main">${title}</div>
        ${authHtml}
        <div class="td-venue">
          <span class="badge ${isDomestic ? 'badge-domestic' : 'badge-international'}" style="margin-top:0;margin-right:4px;">${isDomestic ? LANG.domestic : LANG.international}</span>
          ${venueHtml}
        </div>
        ${links.length ? `<div class="paper-links">${links.join('')}</div>` : ''}
      </td>
      <td style="white-space:nowrap;vertical-align:top;padding-top:15px;">
        ${isFirst ? `<span class="badge badge-first">${LANG.firstAuthor}</span>` : `<span class="badge-coauthor">${LANG.coAuthor}</span>`}
      </td>
      <td style="min-width:130px;vertical-align:top;padding-top:15px;">${renderAwards(awardStr)}</td>
    </tr>`;
  }).join('');

  return `${filterBar}<div class="table-wrap"><table id="researchTable">
    <thead><tr>
      <th class="sortable">${LANG.period}</th>
      <th>${LANG.titleVenue}</th>
      <th>${LANG.authors}</th>
      <th>${LANG.award}</th>
    </tr></thead>
    <tbody id="researchBody">${rows}</tbody>
  </table></div>`;
}

function initResearchTable(data) {
  const tbody = document.getElementById('researchBody');
  const thead = document.querySelector('#researchTable thead');
  const sortState = { col: -1, dir: 'asc' };
  const excl = new Set(['domestic', 'international']);
  const activeFilters = new Set();
  const getVisibleRows = () => Array.from(tbody.querySelectorAll('tr.research-row:not(.row-hidden)'));

  const sec = document.getElementById('sec-research');
  const footer = makeExpandFooter('researchFooter', () => applyRowLimit(tbody, footer, getVisibleRows));
  sec.querySelector('.table-wrap').after(footer);
  const reapply = () => applyRowLimit(tbody, footer, getVisibleRows);

  sortTable(tbody, 0, tr => parseInt(tr.dataset.period || '0'), sortState, reapply);
  updateSortIndicators(thead, sortState);
  reapply();
  initAuthorToggles();

  thead.querySelectorAll('th.sortable').forEach((th, i) => {
    th.addEventListener('click', () => {
      sortTable(tbody, i, tr => parseInt(tr.dataset.period || '0'), sortState, reapply);
      updateSortIndicators(thead, sortState);
    });
  });

  tbody.addEventListener('click', e => {
    const btn = e.target.closest('.bibtex-btn');
    if (!btn) return;
    const idx = parseInt(btn.dataset.bibIdx);
    if (data[idx]?._bibtex) openBibtexModal(data[idx]._bibtex);
  });

  document.querySelectorAll('#researchFilters .filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const f = btn.dataset.filter;
      if (f === 'all') { activeFilters.clear(); }
      else {
        if (activeFilters.has(f)) { activeFilters.delete(f); }
        else { if (excl.has(f)) excl.forEach(g => activeFilters.delete(g)); activeFilters.add(f); }
      }
      document.querySelectorAll('#researchFilters .filter-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.filter === 'all' ? activeFilters.size === 0 : activeFilters.has(b.dataset.filter))
      );
      applyResearchFilter(activeFilters, reapply);
    });
  });
}

function applyResearchFilter(activeFilters, onDone) {
  document.querySelectorAll('.research-row').forEach(tr => {
    let show = true;
    if (activeFilters.has('first')         && tr.dataset.first    !== 'true') show = false;
    if (activeFilters.has('award')         && tr.dataset.award    !== 'true') show = false;
    if (activeFilters.has('domestic')      && tr.dataset.domestic !== 'true') show = false;
    if (activeFilters.has('international') && tr.dataset.domestic === 'true') show = false;
    tr.classList.toggle('row-hidden', !show);
  });
  const tbody = document.getElementById('researchBody');
  const visible = tbody.querySelectorAll('tr.research-row:not(.row-hidden)').length;
  let emptyRow = tbody.querySelector('.empty-row');
  if (visible === 0 && !emptyRow) {
    const tr = document.createElement('tr'); tr.className = 'empty-row';
    tr.innerHTML = `<td colspan="4" class="empty-state">${LANG.noResults}</td>`;
    tbody.appendChild(tr);
  } else if (visible > 0 && emptyRow) { emptyRow.remove(); }
  if (onDone) onDone();
}

/* ── Activities ──
   CSV columns: period, title, title_en, details, details_en, link, award, award_en
   "details" replaces old "event" — can hold anything: event name, role, org, etc.
   "link" adds an optional hyperlink on the title cell.
*/
function buildActivitiesSection(data, lang) {
  if (!data) return `<div class="empty-state">⚠ data/activities.csv not found</div>`;
  const rows = data.map(r => {
    const title    = field(r, 'title',   lang);
    const details  = field(r, 'details', lang);
    const awardStr = field(r, 'award',   lang);
    const titleHtml = linkWrap(title, r.link);
    return `<tr class="activity-row" data-period="${periodToDate(r.period)}">
      <td class="td-period">${r.period}</td>
      <td class="td-main">${titleHtml}</td>
      <td class="td-sub" style="color:var(--text);">${details}</td>
      <td style="min-width:120px;">${renderAwards(awardStr)}</td>
    </tr>`;
  }).join('');
  return `<div class="table-wrap"><table id="activitiesTable">
    <thead><tr>
      <th class="sortable">${LANG.period}</th>
      <th>${LANG.title}</th>
      <th>${LANG.details}</th>
      <th>${LANG.award}</th>
    </tr></thead>
    <tbody id="activitiesBody">${rows}</tbody>
  </table></div>`;
}
function initActivitiesTable() {
  const tbody = document.getElementById('activitiesBody');
  const thead = document.querySelector('#activitiesTable thead');
  const sortState = { col: -1, dir: 'asc' };
  const getVisibleRows = () => Array.from(tbody.querySelectorAll('tr.activity-row'));
  const sec = document.getElementById('sec-activities');
  const footer = makeExpandFooter('activitiesFooter', () => applyRowLimit(tbody, footer, getVisibleRows));
  sec.querySelector('.table-wrap').after(footer);
  const reapply = () => applyRowLimit(tbody, footer, getVisibleRows);
  sortTable(tbody, 0, tr => parseInt(tr.dataset.period || '0'), sortState, reapply);
  updateSortIndicators(thead, sortState); reapply();
  thead.querySelectorAll('th.sortable').forEach(th => {
    th.addEventListener('click', () => { sortTable(tbody, 0, tr => parseInt(tr.dataset.period || '0'), sortState, reapply); updateSortIndicators(thead, sortState); });
  });
}

/* ── Education ──
   CSV columns: ..., distinction, distinction_en
   "distinction" = valedictorian / salutatorian / honours etc.
*/
function buildEducationSection(data, lang) {
  if (!data) return `<div class="empty-state">⚠ data/education_history.csv not found</div>`;
  const rows = data.map(r => {
    const school      = field(r, 'school',      lang);
    const dept        = field(r, 'department',  lang);
    const degree      = field(r, 'degree',      lang);
    const distinction = field(r, 'distinction', lang);
    const ongoing     = r.status === '在学中' || r.status === 'ongoing';
    const statusLabel = ongoing ? LANG.ongoing : LANG.completed;
    const sb = `<span class="badge ${ongoing ? 'badge-status-ongoing' : 'badge-status-done'}">${statusLabel}</span>`;
    const db = degree ? `<span class="badge" style="background:var(--accent-lt);color:var(--accent);border:1px solid #a8dcf0;margin-right:4px;">${degree}</span>` : '';
    // distinction badge — gold-tinted
    const distBadge = distinction
      ? `<span class="badge badge-distinction" style="margin-top:4px;display:inline-flex;">🎖 ${distinction}</span>`
      : '';
    return `<tr class="education-row" data-period="${periodToDate(r.period)}" data-school="${school}">
      <td class="td-period">${r.period}</td>
      <td class="td-main">${school}</td>
      <td>${dept}</td>
      <td style="white-space:nowrap;">${db}${sb}${distBadge ? '<br>' + distBadge : ''}</td>
    </tr>`;
  }).join('');
  return `<div class="table-wrap"><table id="educationTable">
    <thead><tr>
      <th class="sortable">${LANG.period}</th>
      <th class="sortable">${LANG.school}</th>
      <th>${LANG.department}</th>
      <th>${LANG.degreeStatus}</th>
    </tr></thead>
    <tbody id="educationBody">${rows}</tbody>
  </table></div>`;
}
function initEducationTable() {
  const tbody = document.getElementById('educationBody');
  const thead = document.querySelector('#educationTable thead');
  const sortState = { col: -1, dir: 'asc' };
  const getVisibleRows = () => Array.from(tbody.querySelectorAll('tr.education-row'));
  const sec = document.getElementById('sec-education');
  const footer = makeExpandFooter('educationFooter', () => applyRowLimit(tbody, footer, getVisibleRows));
  sec.querySelector('.table-wrap').after(footer);
  const reapply = () => applyRowLimit(tbody, footer, getVisibleRows);
  const getters = [tr => parseInt(tr.dataset.period || '0'), tr => tr.dataset.school || ''];
  sortTable(tbody, 0, getters[0], sortState, reapply);
  updateSortIndicators(thead, sortState); reapply();
  thead.querySelectorAll('th.sortable').forEach((th, i) => {
    th.addEventListener('click', () => { sortTable(tbody, i, getters[i], sortState, reapply); updateSortIndicators(thead, sortState); });
  });
}

/* ── Business ── */
function buildBusinessSection(data, lang) {
  if (!data) return `<div class="empty-state">⚠ data/business_history.csv not found</div>`;
  const rows = data.map(r => {
    const company = field(r, 'company', lang);
    const role    = field(r, 'role',    lang);
    return `<tr class="business-row" data-period="${periodToDate(r.period)}" data-company="${company}">
      <td class="td-period">${r.period}</td>
      <td class="td-main">${company}</td>
      <td class="td-sub" style="color:var(--text)">${role}</td>
    </tr>`;
  }).join('');
  return `<div class="table-wrap"><table id="businessTable">
    <thead><tr>
      <th class="sortable">${LANG.period}</th>
      <th class="sortable">${LANG.organization}</th>
      <th>${LANG.role}</th>
    </tr></thead>
    <tbody id="businessBody">${rows}</tbody>
  </table></div>`;
}
function initBusinessTable() {
  const tbody = document.getElementById('businessBody');
  const thead = document.querySelector('#businessTable thead');
  const sortState = { col: -1, dir: 'asc' };
  const getVisibleRows = () => Array.from(tbody.querySelectorAll('tr.business-row'));
  const sec = document.getElementById('sec-business');
  const footer = makeExpandFooter('businessFooter', () => applyRowLimit(tbody, footer, getVisibleRows));
  sec.querySelector('.table-wrap').after(footer);
  const reapply = () => applyRowLimit(tbody, footer, getVisibleRows);
  const getters = [tr => parseInt(tr.dataset.period || '0'), tr => tr.dataset.company || ''];
  sortTable(tbody, 0, getters[0], sortState, reapply);
  updateSortIndicators(thead, sortState); reapply();
  thead.querySelectorAll('th.sortable').forEach((th, i) => {
    th.addEventListener('click', () => { sortTable(tbody, i, getters[i], sortState, reapply); updateSortIndicators(thead, sortState); });
  });
}

/* ── Skills ── */
function buildSkillsSection(data, lang) {
  if (!data) return `<div class="empty-state">⚠ data/skills.csv not found</div>`;
  const filterBar = `<div class="filter-bar" id="skillsFilters">
    <button class="filter-btn active" data-filter="all">${LANG.all}</button>
    <button class="filter-btn" data-filter="語学">${LANG.language}</button>
    <button class="filter-btn" data-filter="技術">${LANG.technical}</button>
  </div>`;
  const rows = data.map(r => {
    const skillName = field(r, 'skill',       lang);
    const desc      = field(r, 'description', lang);
    const catLabel  = r.category === '語学' ? LANG.language : LANG.technical;
    return `<tr class="skill-row" data-category="${r.category}" data-skill="${skillName}">
      <td><div class="skill-name">${skillName}</div></td>
      <td>
        <span class="badge ${r.category === '語学' ? 'badge-lang' : 'badge-tech'}" style="margin-top:0;margin-right:6px;">${catLabel}</span>
        ${desc}
      </td>
    </tr>`;
  }).join('');
  return `${filterBar}<div class="table-wrap"><table id="skillsTable">
    <thead><tr>
      <th class="sortable">${LANG.skill}</th>
      <th>${LANG.description}</th>
    </tr></thead>
    <tbody id="skillsBody">${rows}</tbody>
  </table></div>`;
}
function initSkillsTable() {
  const tbody = document.getElementById('skillsBody');
  const thead = document.querySelector('#skillsTable thead');
  const sortState = { col: -1, dir: 'asc' };
  const getVisibleRows = () => Array.from(tbody.querySelectorAll('tr.skill-row:not(.row-hidden)'));
  const sec = document.getElementById('sec-skills');
  const footer = makeExpandFooter('skillsFooter', () => applyRowLimit(tbody, footer, getVisibleRows));
  sec.querySelector('.table-wrap').after(footer);
  const reapply = () => applyRowLimit(tbody, footer, getVisibleRows);
  reapply();
  document.querySelectorAll('#skillsFilters .filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#skillsFilters .filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const f = btn.dataset.filter;
      tbody.querySelectorAll('tr.skill-row').forEach(tr => tr.classList.toggle('row-hidden', f !== 'all' && tr.dataset.category !== f));
      reapply();
    });
  });
  thead.querySelectorAll('th.sortable').forEach((th, i) => {
    th.addEventListener('click', () => { sortTable(tbody, i, tr => tr.dataset.skill || '', sortState, reapply); updateSortIndicators(thead, sortState); });
  });
}

/* ════════════════════════════════════════════
   initPage — entry point called by each HTML page
════════════════════════════════════════════ */
async function initPage(lang, dataRoot) {
  _updateToggleUI(_resolveTheme());

  const [profile, recentItems, business, education, research, activities, skills] = await Promise.all([
    loadJSON(dataRoot + 'profile/profile.json'),
    loadJSON(dataRoot + 'recent_items/items/recent.json'),
    loadCSV(dataRoot + 'data/business_history.csv'),
    loadCSV(dataRoot + 'data/education_history.csv'),
    loadCSV(dataRoot + 'data/research_history.csv'),
    loadCSV(dataRoot + 'data/activities.csv'),
    loadCSV(dataRoot + 'data/skills.csv'),
  ]);

  renderProfile(profile, lang);
  renderQR(recentItems, lang, dataRoot);

  const main = document.getElementById('mainContent');
  main.innerHTML = '';

  const researchHTML = await buildResearchSection(research, lang, dataRoot);
  const researchCard = makeSection({ id:'sec-research', dotClass:'dot-research', label:LANG.sections.research, count:research?.length??null, bodyHTML:researchHTML });
  main.appendChild(researchCard);
  initResearchTable(research);

  main.appendChild(makeSection({ id:'sec-activities', dotClass:'dot-activities', label:LANG.sections.activities, count:activities?.length??null, bodyHTML:buildActivitiesSection(activities, lang) }));
  initActivitiesTable();

  main.appendChild(makeSection({ id:'sec-education', dotClass:'dot-education', label:LANG.sections.education, count:education?.length??null, bodyHTML:buildEducationSection(education, lang) }));
  initEducationTable();

  main.appendChild(makeSection({ id:'sec-business', dotClass:'dot-business', label:LANG.sections.business, count:business?.length??null, bodyHTML:buildBusinessSection(business, lang) }));
  initBusinessTable();

  main.appendChild(makeSection({ id:'sec-skills', dotClass:'dot-skills', label:LANG.sections.skills, count:skills?.length??null, bodyHTML:buildSkillsSection(skills, lang) }));
  initSkillsTable();
}
