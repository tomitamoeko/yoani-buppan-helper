// ============================================
// Constants
// ============================================

const API_URL = 'https://firestore.googleapis.com/v1/projects/yoani-buppan-dev/databases/(default)/documents/events-prod';

const GROUP_CONFIG = {
    'equal-love': {
        url: 'https://equal-love.jp/',
        displayName: '=LOVE'
    },
    'not-equal-me': {
        url: 'https://not-equal-me.jp/',
        displayName: '≠ME'
    },
    'nearly-equal-joy': {
        url: 'https://nearly-equal-joy.jp/',
        displayName: '≒JOY'
    },
    'unknown': {
        url: '',
        displayName: 'その他'
    }
};

// ============================================
// State
// ============================================

let allEvents = [];
let currentFilter = 'all';

// ============================================
// Utility Functions
// ============================================

/**
 * Convert official site URL to group identifier
 * @param {string} siteUrl - Official site URL
 * @returns {string} Group identifier
 */
function officialSiteToGroup(siteUrl) {
    for (const [group, config] of Object.entries(GROUP_CONFIG)) {
        if (config.url === siteUrl) {
            return group;
        }
    }
    return 'unknown';
}

/**
 * Get display name for a group
 * @param {string} group - Group identifier
 * @returns {string} Display name
 */
function getGroupDisplayName(group) {
    return GROUP_CONFIG[group]?.displayName ?? 'その他';
}

/**
 * Generate shop link URL
 * @param {Object} event - Event object
 * @returns {string} Shop URL
 */
function generateShopLink(event) {
    return `https://monosys.net/${event.group}/${event.id}`;
}

/**
 * Format timestamp to date string
 * @param {number} timestamp - Unix timestamp in milliseconds
 * @returns {string} Formatted date string (YYYY/MM/DD)
 */
function formatDate(timestamp) {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
}

// ============================================
// API Functions
// ============================================

/**
 * Fetch all events from Firestore
 * @returns {Promise<Array>} Array of event objects
 */
async function fetchEvents() {
    try {
        const eventList = [];
        let pageToken = undefined;

        do {
            const url = pageToken ? `${API_URL}?pageToken=${pageToken}` : API_URL;

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Network error: ${response.statusText}`);
            }

            const data = await response.json();
            pageToken = data.nextPageToken || undefined;

            if (!data.documents) {
                continue;
            }

            console.log(`Fetched ${data.documents.length} entries. Has more: ${!!pageToken}`);

            const events = data.documents.map(doc => ({
                id: doc.name.split('/').pop(),
                name: doc.fields.event_name?.stringValue ?? '',
                group: officialSiteToGroup(doc.fields.official_site_url?.stringValue ?? ''),
                created: new Date(doc.createTime).getTime()
            }));

            eventList.push(...events);
        } while (pageToken);

        return eventList;
    } catch (error) {
        console.error('Fetch error:', error);
        return [];
    }
}

// ============================================
// DOM Functions
// ============================================

/**
 * Get DOM element by ID
 * @param {string} id - Element ID
 * @returns {HTMLElement|null}
 */
function $(id) {
    return document.getElementById(id);
}

/**
 * Render events to the DOM
 * @param {Array} events - Array of event objects
 */
function renderEvents(events) {
    const listEl = $('event-list');

    if (events.length === 0) {
        listEl.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" 
                        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p>イベントが見つかりませんでした</p>
            </div>
        `;
        return;
    }

    listEl.innerHTML = events.map(event => `
        <article class="event-card ${event.group}">
            <a href="${generateShopLink(event)}" target="_blank" rel="noopener noreferrer">
                <div class="event-header">
                    <span class="group-badge ${event.group}">${getGroupDisplayName(event.group)}</span>
                    <span class="event-date">${formatDate(event.created)}</span>
                </div>
                <h3 class="event-name">${escapeHtml(event.name)}</h3>
                <div class="event-footer">
                    <span class="shop-link">
                        ショップを開く
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                    </span>
                </div>
            </a>
        </article>
    `).join('');
}

/**
 * Escape HTML special characters
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Update statistics display
 */
function updateStats() {
    const counts = {
        'equal-love': 0,
        'not-equal-me': 0,
        'nearly-equal-joy': 0,
        'unknown': 0
    };

    allEvents.forEach(event => {
        if (counts.hasOwnProperty(event.group)) {
            counts[event.group]++;
        }
    });

    // Update filter button counts
    $('count-all').textContent = allEvents.length;
    $('count-equal-love').textContent = counts['equal-love'];
    $('count-not-equal-me').textContent = counts['not-equal-me'];
    $('count-nearly-equal-joy').textContent = counts['nearly-equal-joy'];

    // Update stat cards
    $('stat-equal-love').textContent = counts['equal-love'];
    $('stat-not-equal-me').textContent = counts['not-equal-me'];
    $('stat-nearly-equal-joy').textContent = counts['nearly-equal-joy'];
}

/**
 * Filter events by group
 * @param {string} group - Group identifier or 'all'
 */
function filterEvents(group) {
    currentFilter = group;

    // Update active button state
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.group === group);
    });

    // Filter and render events
    const filtered = group === 'all'
        ? allEvents
        : allEvents.filter(event => event.group === group);

    renderEvents(filtered);
}

// ============================================
// Event Handlers
// ============================================

/**
 * Initialize filter button click handlers
 */
function initFilterButtons() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            filterEvents(btn.dataset.group);
        });
    });
}

/**
 * Initialize scroll to top button
 */
function initScrollTopButton() {
    const scrollTopBtn = $('scroll-top');

    window.addEventListener('scroll', () => {
        scrollTopBtn.classList.toggle('visible', window.scrollY > 300);
    });

    scrollTopBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// ============================================
// Initialization
// ============================================

/**
 * Main initialization function
 */
async function init() {
    // Initialize UI handlers
    initFilterButtons();
    initScrollTopButton();

    // Fetch data
    allEvents = await fetchEvents();
    allEvents.sort((a, b) => b.created - a.created);

    console.log(`Loaded ${allEvents.length} events`);

    // Update UI
    $('loading').style.display = 'none';
    $('stats').style.display = 'grid';

    updateStats();
    renderEvents(allEvents);
}

// Start the application
document.addEventListener('DOMContentLoaded', init);
