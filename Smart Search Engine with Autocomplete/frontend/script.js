// Determine Backend Base API URL
const API_BASE = (window.location.protocol === 'file:') ? 'http://localhost:8080' : window.location.origin;

// DOM Elements
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const clearInputBtn = document.getElementById('clearInputBtn');
const suggestionsDropdown = document.getElementById('suggestionsDropdown');
const popularTagsContainer = document.getElementById('popularTags');
const historyTagsContainer = document.getElementById('historyTags');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const resultsSection = document.getElementById('resultsSection');
const resultsHeader = document.getElementById('resultsHeader');
const resultsCount = document.getElementById('resultsCount');
const resultsQuery = document.getElementById('resultsQuery');
const resultsLatency = document.getElementById('resultsLatency');
const resultsContainer = document.getElementById('resultsContainer');
const loadingIndicator = document.getElementById('loadingIndicator');
const emptyState = document.getElementById('emptyState');
const sortSelect = document.getElementById('sortSelect');
const themeToggleBtn = document.getElementById('themeToggleBtn');
const iconMoon = document.querySelector('.icon-moon');
const iconSun = document.querySelector('.icon-sun');

let debounceTimer = null;
let activeSuggestionIndex = -1;
let currentSuggestions = [];
let currentResults = [];

// ==========================================================================
// Theme Management (Dark & Light Mode)
// ==========================================================================
function initTheme() {
  const savedTheme = localStorage.getItem('smartsearch-theme');
  const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initialTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
  applyTheme(initialTheme);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('smartsearch-theme', theme);

  if (theme === 'light') {
    if (iconMoon) iconMoon.style.display = 'none';
    if (iconSun) iconSun.style.display = 'block';
  } else {
    if (iconMoon) iconMoon.style.display = 'block';
    if (iconSun) iconSun.style.display = 'none';
  }
}

if (themeToggleBtn) {
  themeToggleBtn.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
  });
}

// ==========================================================================
// Global Keyboard Shortcuts (Ctrl+K or '/')
// ==========================================================================
document.addEventListener('keydown', (e) => {
  // Focus search with Ctrl+K or Cmd+K
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    searchInput.focus();
    searchInput.select();
  }
  // Focus search with '/' when not typing in an input
  else if (e.key === '/' && document.activeElement !== searchInput) {
    e.preventDefault();
    searchInput.focus();
  }
});

// ==========================================================================
// Autocomplete Handling (Trie Prefix Engine)
// ==========================================================================
function debounce(func, delay = 150) {
  return (...args) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => func(...args), delay);
  };
}

async function fetchSuggestions(prefix) {
  if (!prefix || prefix.trim().length === 0) {
    hideSuggestions();
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/suggest?q=${encodeURIComponent(prefix.trim())}`);
    if (!res.ok) throw new Error('Failed to fetch suggestions');
    const suggestions = await res.json();
    currentSuggestions = suggestions;
    renderSuggestions(suggestions, prefix.trim());
  } catch (err) {
    console.warn('[Autocomplete] Error fetching Trie suggestions:', err);
    hideSuggestions();
  }
}

function renderSuggestions(suggestions, prefix) {
  suggestionsDropdown.innerHTML = '';
  activeSuggestionIndex = -1;

  if (!suggestions || suggestions.length === 0) {
    hideSuggestions();
    return;
  }

  // Header hint in dropdown
  const hintItem = document.createElement('li');
  hintItem.className = 'dropdown-header-hint';
  hintItem.innerHTML = `<span>// Context-Aware Autocomplete [${suggestions.length} suggestions]</span><span>ESC to exit</span>`;
  suggestionsDropdown.appendChild(hintItem);

  suggestions.forEach((rawItem, index) => {
    const li = document.createElement('li');
    li.className = 'suggestion-item';
    li.setAttribute('role', 'option');

    const itemText = (typeof rawItem === 'object' && rawItem !== null) ? rawItem.text : String(rawItem);
    const itemType = (typeof rawItem === 'object' && rawItem !== null) ? (rawItem.type || 'phrase') : 'phrase';

    // Badge styling mapping
    let badgeClass = 'badge-phrase';
    let badgeLabel = 'Phrase';
    if (itemType === 'history') {
      badgeClass = 'badge-history';
      badgeLabel = 'History';
    } else if (itemType === 'exact_phrase') {
      badgeClass = 'badge-exact';
      badgeLabel = 'Exact';
    } else if (itemType === 'context_match') {
      badgeClass = 'badge-context';
      badgeLabel = 'Context';
    } else if (itemType === 'word_completion') {
      badgeClass = 'badge-trie';
      badgeLabel = 'Trie';
    }

    // Highlight matching prefix part in suggestion
    let highlightedText = escapeHtml(itemText);
    const lowerItem = itemText.toLowerCase();
    const lowerPrefix = prefix.toLowerCase();
    if (lowerItem.startsWith(lowerPrefix)) {
      const matchPart = itemText.substring(0, prefix.length);
      const restPart = itemText.substring(prefix.length);
      highlightedText = `<span class="suggestion-prefix">${escapeHtml(matchPart)}</span>${escapeHtml(restPart)}`;
    }

    li.innerHTML = `
      <div style="display:flex; align-items:center; gap:10px; flex:1; min-width:0;">
        <span style="color:var(--syn-function); font-family:var(--font-mono);">&gt;</span>
        <span class="suggestion-text" style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${highlightedText}</span>
      </div>
      <div style="display:flex; align-items:center; gap:6px;">
        <span class="suggestion-badge ${badgeClass}">${badgeLabel}</span>
        <button class="refine-btn" title="Refine query in search box" aria-label="Refine query">&#8598;</button>
      </div>
    `;

    li.addEventListener('mousedown', (e) => {
      if (e.target.closest('.refine-btn')) {
        e.preventDefault();
        e.stopPropagation();
        searchInput.value = itemText;
        clearInputBtn.style.display = 'block';
        searchInput.focus();
        fetchSuggestions(itemText);
        return;
      }
      e.preventDefault();
      selectSuggestion(itemText);
    });

    suggestionsDropdown.appendChild(li);
  });

  suggestionsDropdown.style.display = 'block';
}

function hideSuggestions() {
  suggestionsDropdown.style.display = 'none';
  currentSuggestions = [];
  activeSuggestionIndex = -1;
}

function selectSuggestion(text) {
  searchInput.value = text;
  clearInputBtn.style.display = 'block';
  hideSuggestions();
  executeSearch(text);
}

// Keyboard navigation in suggestions list
searchInput.addEventListener('keydown', (e) => {
  const items = suggestionsDropdown.querySelectorAll('.suggestion-item');
  if (items.length === 0) {
    if (e.key === 'Enter') {
      e.preventDefault();
      executeSearch(searchInput.value);
    }
    return;
  }

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    activeSuggestionIndex = (activeSuggestionIndex + 1) % items.length;
    updateActiveSuggestion(items);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    activeSuggestionIndex = (activeSuggestionIndex - 1 + items.length) % items.length;
    updateActiveSuggestion(items);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (activeSuggestionIndex >= 0 && activeSuggestionIndex < currentSuggestions.length) {
      const selected = currentSuggestions[activeSuggestionIndex];
      const selectedText = (typeof selected === 'object' && selected !== null) ? selected.text : selected;
      selectSuggestion(selectedText);
    } else {
      hideSuggestions();
      executeSearch(searchInput.value);
    }
  } else if (e.key === 'Escape') {
    hideSuggestions();
  }
});

function updateActiveSuggestion(items) {
  items.forEach((item, idx) => {
    if (idx === activeSuggestionIndex) {
      item.classList.add('active');
      const selected = currentSuggestions[idx];
      const selectedText = (typeof selected === 'object' && selected !== null) ? selected.text : selected;
      searchInput.value = selectedText;
    } else {
      item.classList.remove('active');
    }
  });
}

// ==========================================================================
// Real-Time Live Search & Autocomplete Pipeline
// ==========================================================================
let suggestionTimer = null;
let liveSearchTimer = null;
let liveSearchRequestId = 0;

function clearResults() {
  resultsContainer.innerHTML = '';
  resultsHeader.style.display = 'none';
  loadingIndicator.style.display = 'none';
  emptyState.style.display = 'none';
  currentResults = [];
}

searchInput.addEventListener('input', () => {
  const query = searchInput.value;
  clearInputBtn.style.display = query.length > 0 ? 'block' : 'none';

  if (!query || query.trim().length === 0) {
    clearTimeout(suggestionTimer);
    clearTimeout(liveSearchTimer);
    liveSearchRequestId++;
    hideSuggestions();
    clearResults();
    return;
  }

  // 1. Fast Context-Aware Autocomplete (40ms debounce)
  clearTimeout(suggestionTimer);
  suggestionTimer = setTimeout(() => {
    fetchSuggestions(query);
  }, 40);

  // 2. Instant Real-Time Search (75ms debounce)
  clearTimeout(liveSearchTimer);
  liveSearchTimer = setTimeout(() => {
    executeLiveSearch(query);
  }, 75);
});

clearInputBtn.addEventListener('click', () => {
  searchInput.value = '';
  clearInputBtn.style.display = 'none';
  clearTimeout(suggestionTimer);
  clearTimeout(liveSearchTimer);
  liveSearchRequestId++;
  hideSuggestions();
  clearResults();
  searchInput.focus();
});

document.addEventListener('click', (e) => {
  if (!searchInput.contains(e.target) && !suggestionsDropdown.contains(e.target)) {
    hideSuggestions();
  }
});

// ==========================================================================
// Search Execution & Results Rendering
// ==========================================================================
searchBtn.addEventListener('click', () => {
  executeSearch(searchInput.value);
});

async function executeLiveSearch(query) {
  const cleanQuery = query.trim();
  if (!cleanQuery) return;

  const currentReqId = ++liveSearchRequestId;
  const startTime = performance.now();

  try {
    const res = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(cleanQuery)}&live=1`);
    if (!res.ok) return;
    const data = await res.json();

    // Guard against stale out-of-order responses
    if (currentReqId !== liveSearchRequestId) return;

    const duration = (performance.now() - startTime).toFixed(1);
    currentResults = data.results || [];
    renderSearchResults(data, duration, true);
  } catch (err) {
    if (currentReqId === liveSearchRequestId) {
      console.warn('[LiveSearch] Live search skipped:', err);
    }
  }
}

async function executeSearch(query) {
  if (!query || query.trim().length === 0) {
    return;
  }

  clearTimeout(suggestionTimer);
  clearTimeout(liveSearchTimer);
  const currentReqId = ++liveSearchRequestId;

  hideSuggestions();
  const cleanQuery = query.trim();
  searchInput.value = cleanQuery;
  clearInputBtn.style.display = 'block';

  loadingIndicator.style.display = 'block';
  emptyState.style.display = 'none';

  const startTime = performance.now();

  try {
    const res = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(cleanQuery)}`);
    if (!res.ok) throw new Error('Search request failed');
    const data = await res.json();
    const duration = (performance.now() - startTime).toFixed(1);

    if (currentReqId !== liveSearchRequestId) return;

    loadingIndicator.style.display = 'none';
    currentResults = data.results || [];
    renderSearchResults(data, duration, false);

    // Refresh history and popular pills
    loadHistory();
    loadPopular();
  } catch (err) {
    loadingIndicator.style.display = 'none';
    console.error('[Search] Error querying backend:', err);
    resultsContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">[!] Connection Error</div>
        <h3>Failed to connect to C++ backend</h3>
        <p>Ensure the WinSock2 server is active at <code>http://localhost:8080</code>.</p>
      </div>
    `;
  }
}

function sortResults(results, criterion) {
  const sorted = [...results];
  if (criterion === 'popularity') {
    sorted.sort((a, b) => (b.document.popularity || 0) - (a.document.popularity || 0));
  } else if (criterion === 'id') {
    sorted.sort((a, b) => a.document.id - b.document.id);
  } else {
    // Default: relevance score
    sorted.sort((a, b) => b.score - a.score);
  }
  return sorted;
}

if (sortSelect) {
  sortSelect.addEventListener('change', () => {
    if (currentResults.length > 0) {
      renderCards(sortResults(currentResults, sortSelect.value));
    }
  });
}

function renderSearchResults(data, latencyMs, isLive = false) {
  resultsHeader.style.display = 'flex';
  resultsCount.textContent = data.count || 0;
  resultsQuery.textContent = `"${data.query}"`;
  if (resultsLatency) {
    resultsLatency.textContent = `${latencyMs}ms`;
  }

  const liveBadge = resultsHeader.querySelector('.live-pulse-badge');
  if (liveBadge) {
    if (isLive) {
      liveBadge.innerHTML = '<span class="pulse-dot"></span> Live Instant';
      liveBadge.style.opacity = '1';
    } else {
      liveBadge.innerHTML = '<span class="pulse-dot" style="animation:none; opacity:0.8;"></span> Results';
      liveBadge.style.opacity = '0.9';
    }
  }

  if (!data.results || data.results.length === 0) {
    emptyState.style.display = 'block';
    resultsContainer.innerHTML = '';
    return;
  }

  emptyState.style.display = 'none';
  const sorted = sortResults(data.results, sortSelect ? sortSelect.value : 'relevance');
  renderCards(sorted);
}

function renderCards(resultsList) {
  resultsContainer.innerHTML = '';

  const maxScore = resultsList.length > 0 ? Math.max(...resultsList.map(r => r.score), 100) : 100;

  resultsList.forEach((item, index) => {
    const card = document.createElement('article');
    card.className = 'result-card';

    const doc = item.document;
    const scoreFormatted = Number(item.score).toFixed(1);
    const scorePercent = Math.min(100, Math.max(10, Math.round((item.score / maxScore) * 100)));

    // Render keyword pills
    const kwHtml = (doc.keywords || []).map(kw => {
      return `<button class="kw-tag" data-kw="${escapeHtml(kw)}">#${escapeHtml(kw)}</button>`;
    }).join('');

    const docUrl = doc.url || `https://docs.smartsearch.internal/ref/doc_${doc.id}`;
    let displayUrl = docUrl;
    try {
      const parsed = new URL(docUrl);
      displayUrl = `${parsed.hostname} › ${parsed.pathname.split('/').filter(Boolean).slice(0, 2).join(' › ')}`;
    } catch (_) {
      displayUrl = docUrl;
    }

    card.innerHTML = `
      <div class="card-terminal-bar">
        <div class="terminal-dots">
          <span class="t-dot t-dot-red"></span>
          <span class="t-dot t-dot-yellow"></span>
          <span class="t-dot t-dot-green"></span>
        </div>
        <span>document_${doc.id}.cpp</span>
        <span>rank: #${index + 1}</span>
      </div>
      <div class="card-content-body">
        <div class="card-url-breadcrumb">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
          <a href="${escapeHtml(docUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(displayUrl)}</a>
          <span class="category-pill">${escapeHtml(doc.category || 'Computer Science')}</span>
        </div>
        <div class="card-top">
          <a href="${escapeHtml(docUrl)}" target="_blank" rel="noopener noreferrer" class="card-title-link">
            <h3 class="card-title">${item.highlightedTitle || escapeHtml(doc.title)}</h3>
            <svg class="ext-link-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
          </a>
          <div class="score-badge-wrap">
            <span class="score-pill">${scoreFormatted} pts</span>
            <div class="score-bar-track" title="Relevance: ${scorePercent}%">
              <div class="score-bar-fill" style="width: ${scorePercent}%"></div>
            </div>
          </div>
        </div>
        <p class="card-desc">${item.highlightedDescription || escapeHtml(doc.description)}</p>
        <div class="card-footer">
          <div class="card-keywords">${kwHtml}</div>
          <div class="card-meta">
            <span>id: 0x${doc.id.toString(16).padStart(2, '0')}</span>
            <span>&bull;</span>
            <span>popularity: ${doc.popularity}%</span>
          </div>
        </div>
      </div>
    `;

    // Keyword tag click listener
    card.querySelectorAll('.kw-tag').forEach(btn => {
      btn.addEventListener('click', () => {
        const kw = btn.getAttribute('data-kw');
        if (kw) {
          searchInput.value = kw;
          clearInputBtn.style.display = 'block';
          executeSearch(kw);
        }
      });
    });

    resultsContainer.appendChild(card);
  });
}

// ==========================================================================
// Popular & History Sections
// ==========================================================================
async function loadPopular() {
  try {
    const res = await fetch(`${API_BASE}/api/popular`);
    if (!res.ok) return;
    const popular = await res.json();

    popularTagsContainer.innerHTML = '';
    if (!popular || popular.length === 0) {
      popularTagsContainer.innerHTML = '<span class="empty-hint">// no popular queries yet</span>';
      return;
    }

    popular.forEach(item => {
      const chip = document.createElement('button');
      chip.className = 'tag-chip';
      chip.innerHTML = `<span>${escapeHtml(item.query)}</span><span class="tag-count">${item.count}</span>`;
      chip.addEventListener('click', () => {
        searchInput.value = item.query;
        clearInputBtn.style.display = 'block';
        executeSearch(item.query);
      });
      popularTagsContainer.appendChild(chip);
    });
  } catch (err) {
    console.warn('[Popular] Failed to load popular searches:', err);
  }
}

async function loadHistory() {
  try {
    const res = await fetch(`${API_BASE}/api/history`);
    if (!res.ok) return;
    const history = await res.json();

    historyTagsContainer.innerHTML = '';
    if (!history || history.length === 0) {
      historyTagsContainer.innerHTML = '<span class="empty-hint">// no recent searches</span>';
      return;
    }

    history.forEach(query => {
      const chip = document.createElement('button');
      chip.className = 'tag-chip';
      chip.textContent = query;
      chip.addEventListener('click', () => {
        searchInput.value = query;
        clearInputBtn.style.display = 'block';
        executeSearch(query);
      });
      historyTagsContainer.appendChild(chip);
    });
  } catch (err) {
    console.warn('[History] Failed to load history:', err);
  }
}

clearHistoryBtn.addEventListener('click', async () => {
  if (!confirm('Clear all recent search history?')) return;
  try {
    const res = await fetch(`${API_BASE}/api/history`, { method: 'DELETE' });
    if (res.ok) {
      loadHistory();
      loadPopular();
    }
  } catch (err) {
    console.error('[History] Failed to clear history:', err);
  }
});

// Helper to escape HTML characters
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initial Boot
window.addEventListener('DOMContentLoaded', () => {
  initTheme();
  loadPopular();
  loadHistory();

  // Check for URL query parameter (?q=...) or start clean for real-time typing
  const urlParams = new URLSearchParams(window.location.search);
  const initialQuery = urlParams.get('q');
  if (initialQuery && initialQuery.trim().length > 0) {
    searchInput.value = initialQuery.trim();
    clearInputBtn.style.display = 'block';
    executeSearch(initialQuery.trim());
  } else {
    // Focus search bar so user can start typing in real time immediately
    searchInput.focus();
  }
});
