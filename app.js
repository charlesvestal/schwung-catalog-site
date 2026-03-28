const CATEGORY_LABELS = {
    sound_generator: 'Synth',
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
let currentFilter = 'all';
let currentSort = 'popular';
let currentAudio = null;
let currentPlayBtn = null;

async function init() {
    try {
        const [catalogRes, countsRes] = await Promise.all([
            fetch('data/module-catalog.json'),
            fetch('data/download-counts.json'),
        ]);
        const catalogData = await catalogRes.json();
        catalog = catalogData.modules || [];

        try {
            downloadCounts = await countsRes.json();
        } catch {
            downloadCounts = {};
        }
    } catch (e) {
        console.error('Failed to load data:', e);
        document.getElementById('module-grid').innerHTML =
            '<p style="color: var(--text-muted)">Failed to load module catalog.</p>';
        return;
    }

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
        case 'name':
            modules.sort((a, b) => a.name.localeCompare(b.name));
            break;
        case 'newest':
            // Reverse catalog order (newest entries tend to be at the end)
            modules.reverse();
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
    const count = downloadCounts[m.id] || 0;
    const badgeLabel = CATEGORY_LABELS[m.component_type] || m.component_type;
    const repoUrl = `https://github.com/${m.github_repo}`;
    const hasAudio = audioExists(m.id);

    return `
    <div class="module-card">
        <div class="card-header">
            <div class="module-name"><a href="${repoUrl}" target="_blank" rel="noopener">${esc(m.name)}</a></div>
            <span class="badge badge-${m.component_type}">${esc(badgeLabel)}</span>
        </div>
        <div class="module-description">${esc(m.description)}</div>
        <div class="module-author">by ${esc(m.author)}</div>
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

function formatCount(n) {
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    return n.toString();
}

function esc(s) {
    const el = document.createElement('span');
    el.textContent = s;
    return el.innerHTML;
}

init();
