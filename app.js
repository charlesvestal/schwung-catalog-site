const CATEGORY_LABELS = {
    sound_generator: 'Sound Generator',
    audio_fx: 'Audio FX',
    midi_fx: 'MIDI FX',
    overtake: 'Overtake',
    tool: 'Tool',
    utility: 'Utility',
    system: 'System',
    featured: 'Featured',
    midi_source: 'MIDI Source',
};

const PLAY_ICON = '<svg viewBox="0 0 24 24"><polygon points="6,3 20,12 6,21"/></svg>';
const STOP_ICON = '<svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12"/></svg>';
const DOWNLOAD_ICON = '<svg viewBox="0 0 24 24"><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';

let catalog = [];
let downloadCounts = {};
let downloadCounts7d = {};
let releaseMetadata = {};
let historyDayCount = 0;
let currentFilter = 'all';
let currentSort = 'popular';
let currentAudio = null;
let currentPlayBtn = null;

async function init() {
    try {
        const [catalogRes, countsRes, historyRes, metaRes] = await Promise.all([
            fetch('data/module-catalog.json'),
            fetch('data/download-counts.json'),
            fetch('data/download-counts-history.json'),
            fetch('data/release-metadata.json'),
        ]);
        const catalogData = await catalogRes.json();
        catalog = catalogData.modules || [];

        try {
            downloadCounts = await countsRes.json();
        } catch {
            downloadCounts = {};
        }

        try {
            const history = await historyRes.json();
            historyDayCount = Object.keys(history).length;
            downloadCounts7d = compute7dCounts(downloadCounts, history);
        } catch {
            downloadCounts7d = {};
        }

        try {
            releaseMetadata = await metaRes.json();
        } catch {
            releaseMetadata = {};
        }
    } catch (e) {
        console.error('Failed to load data:', e);
        document.getElementById('module-grid').innerHTML =
            '<p style="color: var(--text-muted)">Failed to load module catalog.</p>';
        return;
    }

    if (historyDayCount >= 2) {
        document.getElementById('sort-7d').hidden = false;
    }

    // Hide filter tabs for empty categories
    const visibleTypes = new Set(
        catalog.filter(m => m.component_type !== 'system' && m.component_type !== 'featured')
            .map(m => m.component_type)
    );
    document.querySelectorAll('.filter-btn[data-filter]').forEach(btn => {
        if (btn.dataset.filter !== 'all' && !visibleTypes.has(btn.dataset.filter)) {
            btn.hidden = true;
        }
    });

    setupControls();
    render();
}

function setupControls() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-selected', 'false');
            });
            btn.classList.add('active');
            btn.setAttribute('aria-selected', 'true');
            currentFilter = btn.dataset.filter;
            render();
        });
    });

    document.getElementById('sort-select').addEventListener('change', e => {
        currentSort = e.target.value;
        render();
    });
}

function getFiltered() {
    let modules = [...catalog];

    // Hide system/featured from browse
    modules = modules.filter(m => m.component_type !== 'system' && m.component_type !== 'featured');

    if (currentFilter !== 'all') {
        modules = modules.filter(m => m.component_type === currentFilter);
    }

    switch (currentSort) {
        case 'popular':
            modules.sort((a, b) => (downloadCounts[b.id] || 0) - (downloadCounts[a.id] || 0));
            break;
        case 'popular7d':
            modules.sort((a, b) => (downloadCounts7d[b.id] || 0) - (downloadCounts7d[a.id] || 0));
            break;
        case 'name':
            modules.sort((a, b) => a.name.localeCompare(b.name));
            break;
        case 'newest':
            modules.sort((a, b) => {
                const da = (releaseMetadata[a.id] || {}).first_release || '0000';
                const db = (releaseMetadata[b.id] || {}).first_release || '0000';
                return db.localeCompare(da);
            });
            break;
        case 'updated':
            modules.sort((a, b) => {
                const da = (releaseMetadata[a.id] || {}).last_updated || '0000';
                const db = (releaseMetadata[b.id] || {}).last_updated || '0000';
                return db.localeCompare(da);
            });
            break;
        case 'author':
            modules.sort((a, b) => a.author.localeCompare(b.author));
            break;
    }

    return modules;
}

function render() {
    const modules = getFiltered();
    const grid = document.getElementById('module-grid');
    const countEl = document.querySelector('.module-count');

    countEl.textContent = `${modules.length} module${modules.length !== 1 ? 's' : ''}`;

    grid.innerHTML = modules.map(m => cardHTML(m)).join('');

    // Bind audio players
    grid.querySelectorAll('.play-btn').forEach(btn => {
        btn.addEventListener('click', () => toggleAudio(btn));
    });

    grid.querySelectorAll('.progress-bar').forEach(bar => {
        bar.addEventListener('click', e => seekAudio(e, bar));
    });
}

function cardHTML(m) {
    const count = currentSort === 'popular7d'
        ? (downloadCounts7d[m.id] || 0)
        : (downloadCounts[m.id] || 0);
    const badgeLabel = CATEGORY_LABELS[m.component_type] || m.component_type;
    const meta = releaseMetadata[m.id] || {};
    const firstDate = meta.first_release && meta.first_release !== 'unknown' ? formatDate(meta.first_release) : null;
    const lastDate = meta.last_updated && meta.last_updated !== 'unknown' ? formatDate(meta.last_updated) : null;
    const version = meta.version && meta.version !== 'unknown' ? meta.version : null;
    const repoUrl = `https://github.com/${m.github_repo}`;
    const hasAudio = audioExists(m.id);

    return `
    <div class="module-card">
        <div class="card-header">
            <div class="module-name"><a href="${repoUrl}" target="_blank" rel="noopener">${esc(m.name)}</a></div>
            <span class="badge badge-${m.component_type}">${esc(badgeLabel)}</span>
        </div>
        <div class="module-description">${esc(m.description)}</div>
        <div class="module-meta">
            <span class="module-author">by ${esc(m.author)}</span>
            ${version ? `<span class="module-version">${esc(version)}</span>` : ''}
        </div>
        <div class="module-dates">
            ${firstDate ? `<span>Released ${firstDate}</span>` : ''}
            ${lastDate && lastDate !== firstDate ? `<span>Updated ${lastDate}</span>` : ''}
        </div>
        ${m.requires ? `<div class="module-requires">Requires: ${esc(m.requires)}</div>` : ''}
        <div class="card-footer">
            <div class="download-count">${DOWNLOAD_ICON} ${formatCount(count)}</div>
            ${hasAudio ? `
            <div class="audio-preview">
                <button class="play-btn" data-module="${m.id}" aria-label="Play preview">${PLAY_ICON}</button>
                <div class="progress-bar" data-module="${m.id}"><div class="progress-fill"></div></div>
            </div>
            ` : ''}
        </div>
    </div>`;
}

function audioExists(id) {
    // Check against a known list of available previews
    // This gets populated by the build/data step
    return (window.AUDIO_PREVIEWS || []).includes(id);
}

function toggleAudio(btn) {
    const moduleId = btn.dataset.module;
    const src = `audio/${moduleId}.mp3`;

    // Stop current
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        if (currentPlayBtn) {
            currentPlayBtn.innerHTML = PLAY_ICON;
            currentPlayBtn.classList.remove('playing');
        }
    }

    // If clicking the same one, just stop
    if (currentPlayBtn === btn) {
        currentAudio = null;
        currentPlayBtn = null;
        return;
    }

    // Play new
    currentAudio = new Audio(src);
    currentPlayBtn = btn;
    btn.innerHTML = STOP_ICON;
    btn.classList.add('playing');

    const progressFill = btn.closest('.module-card').querySelector('.progress-fill');

    currentAudio.addEventListener('timeupdate', () => {
        if (currentAudio && currentAudio.duration) {
            const pct = (currentAudio.currentTime / currentAudio.duration) * 100;
            progressFill.style.width = pct + '%';
        }
    });

    currentAudio.addEventListener('ended', () => {
        btn.innerHTML = PLAY_ICON;
        btn.classList.remove('playing');
        progressFill.style.width = '0%';
        currentAudio = null;
        currentPlayBtn = null;
    });

    currentAudio.play().catch(() => {
        btn.innerHTML = PLAY_ICON;
        btn.classList.remove('playing');
        currentAudio = null;
        currentPlayBtn = null;
    });
}

function seekAudio(e, bar) {
    const moduleId = bar.dataset.module;
    if (!currentAudio || !currentPlayBtn || currentPlayBtn.dataset.module !== moduleId) return;

    const rect = bar.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    currentAudio.currentTime = pct * currentAudio.duration;
}

function formatDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00Z');
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}

function formatCount(n) {
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    return n.toString();
}

function esc(s) {
    const el = document.createElement('span');
    el.textContent = s;
    return el.innerHTML;
}

function compute7dCounts(current, history) {
    const dates = Object.keys(history).sort();
    if (dates.length === 0) return { ...current };

    // Find the snapshot closest to 7 days ago
    const target = new Date();
    target.setDate(target.getDate() - 7);
    const targetStr = target.toISOString().slice(0, 10);

    let bestDate = dates[0];
    for (const d of dates) {
        if (d <= targetStr) bestDate = d;
    }

    const baseline = history[bestDate] || {};
    const result = {};
    for (const id of Object.keys(current)) {
        result[id] = Math.max(0, (current[id] || 0) - (baseline[id] || 0));
    }
    return result;
}

init();
