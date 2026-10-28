
function getMatchBroadcast(match, leagueId) {
  if (match.broadcast) return match.broadcast;
  if (match.channels && match.channels.length) return match.channels[0];
  const id = Number(leagueId || match.league_id || match.league_meta?.id || 0);
  const fid = Number(match.fixture_id || 0);
  const defaultBroadcasts = {
    39: ['K+ SPORT 1', 'K+ SPORT 2', 'TV360', 'ON Football'],
    2: ['TV360', 'FPT Play'],
    3: ['TV360', 'FPT Play'],
    340: ['FPT Play', 'VTV5', 'HTV Thể Thao', 'TV360'],
    140: ['SCTV15', 'VTVcab', 'K+'],
    135: ['ON Football', 'VTVcab'],
    78: ['ON Sports News', 'VTVcab'],
    61: ['ON Sports', 'VTVcab']
  };
  const chs = defaultBroadcasts[id] || ['TV360', 'FPT Play', 'K+ SPORT 1', 'VTVcab'];
  return chs[fid % chs.length];
}

// Realtime dynamic date (GMT+7)
function getClientTodayYmd() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
let TODAY_DATE = getClientTodayYmd();

// Standard VDS Date & Time Formatters (Follows https://vnexpress-design-system.vne-designops.workers.dev/content/time/)
function formatTemplateDateTime(eventDateStr) {
  if (window.vdsFormatDateTime) {
    return window.vdsFormatDateTime(eventDateStr);
  }
  if (!eventDateStr) return '';
  const d = new Date(eventDateStr);
  if (isNaN(d.getTime())) return eventDateStr;

  const dayNames = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
  const dayName = dayNames[d.getDay()];
  const day = d.getDate();
  const month = d.getMonth() + 1;
  const year = d.getFullYear();
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');

  return `${dayName}, ${day}/${month}/${year}, ${hours}:${minutes} (GMT+7)`;
}

// Match Item Time Formatter: "16/10, 02:00"
function formatMatchItemTime(eventDateStr) {
  if (window.vdsFormatMatchItemTime) {
    return window.vdsFormatMatchItemTime(eventDateStr);
  }
  if (!eventDateStr) return '';
  const d = new Date(eventDateStr);
  if (isNaN(d.getTime())) return eventDateStr;

  const day = d.getDate();
  const month = d.getMonth() + 1;
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');

  return `${day}/${month}, ${hours}:${minutes}`;
}

function formatTemplateDateOnly(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00+07:00`);
  if (isNaN(d.getTime())) return dateStr;

  const dayNames = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
  const dayName = dayNames[d.getDay()];
  const day = d.getDate();
  const month = d.getMonth() + 1;
  const year = d.getFullYear();

  return `${dayName}, ${day}/${month}/${year}`;
}

// Detect initial mode from independent SEO URL or query param
function detectInitialMode() {
  const path = window.location.pathname.toLowerCase();
  const urlParams = new URLSearchParams(window.location.search);
  const modeParam = urlParams.get('mode');

  if (path === '/ket-qua' || path === '/ket-qua-bong-da' || modeParam === 'past') {
    return 'past';
  } else if (path === '/live' || modeParam === 'live') {
    return 'live';
  } else {
    return 'future';
  }
}

// Application State
const state = {
  currentMode: detectInitialMode(), // 'future' | 'past' | 'live'
  selectedDate: TODAY_DATE, // Active 'Hôm nay' immediately on access
  selectedLeague: null,
  selectedTeam: null,
  searchQuery: '',
  viewMode: 'timeline', // 'timeline' (demo-final.jpeg) | 'scs' (scs.jpeg)
  newsPage: 1,
  newsLimit: 20,
  showAllLeagues: false,
  showAllTeams: false,
  demoLiveActive: false,
  config: null,
  allFixtures: [],
  standingsMap: {},
  simulatedMatches: []
};

// Initialize
async function initApp() {
  if (window.lucide) lucide.createIcons();
  setupEventListeners();

  const headerDateEl = document.getElementById('current-datetime-display');
  function updateHeaderClock() {
    if (headerDateEl) {
      headerDateEl.innerText = formatTemplateDateTime(new Date().toISOString());
    }
  }
  updateHeaderClock();
  setInterval(updateHeaderClock, 30000);

  // Tự động cập nhật lại lịch thi đấu và kết quả mỗi 2 tiếng
  setInterval(() => {
    if (document.visibilityState === 'visible') {
      loadFixtures();
    }
  }, 2 * 60 * 60 * 1000);

  updateModeUI(state.currentMode, false);
  await loadConfig();

  // Support incoming ?team_id= or ?league_id= from Match Detail sidebar
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('team_id')) {
    state.selectedTeam = parseInt(urlParams.get('team_id'));
    state.selectedDate = null;
    renderSidebarFilters();
  } else if (urlParams.get('league_id')) {
    state.selectedLeague = parseInt(urlParams.get('league_id'));
    state.selectedDate = null;
    renderSidebarFilters();
  }

  generateDateTabs();
  await Promise.all([
    loadFixtures(),
    loadStandings(),
    loadNews()
  ]);
  checkLiveMatches();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

// Event Listeners
function setupEventListeners() {
  const searchInput = document.getElementById('sidebar-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value.toLowerCase().trim();
      renderSidebarFilters();
      loadFixtures();
    });
  }

  const demoLiveBtn = document.getElementById('btn-toggle-demo-live');
  if (demoLiveBtn) {
    demoLiveBtn.addEventListener('click', () => {
      state.demoLiveActive = !state.demoLiveActive;
      demoLiveBtn.style.backgroundColor = state.demoLiveActive ? 'var(--vne-red)' : '#fff0f2';
      demoLiveBtn.style.color = state.demoLiveActive ? '#ffffff' : 'var(--vne-red)';
      demoLiveBtn.innerText = state.demoLiveActive ? '✓ Đang bật LIVE giả lập' : '⚡ Giả lập trận LIVE';
      if (state.demoLiveActive) {
        switchMode('live');
      } else {
        loadFixtures();
        checkLiveMatches();
      }
    });
  }
}

// Fetch System Configuration
async function loadConfig() {
  try {
    const res = await fetch('/api/config');
    state.config = await res.json();
    renderSidebarFilters();
  } catch (err) {
    console.error('Error loading config:', err);
  }
}

// Render Left Sidebar Leagues & Hot Teams
function renderSidebarFilters() {
  if (!state.config) return;

  const leagueListEl = document.getElementById('league-filter-list');
  const teamListEl = document.getElementById('team-filter-list');
  const q = state.searchQuery;

  // Filter leagues
  let leagues = state.config.leagues || [];
  if (q) {
    leagues = leagues.filter(l => l.name.toLowerCase().includes(q) || l.vnName.toLowerCase().includes(q) || l.country.toLowerCase().includes(q));
  }
  const visibleLeagues = (state.showAllLeagues || q) ? leagues : leagues.slice(0, 10);
  document.getElementById('league-count-badge').innerText = `${visibleLeagues.length}/${leagues.length}`;
  document.getElementById('txt-more-leagues').innerText = state.showAllLeagues 
    ? '∧ Thu gọn' 
    : `∨ Xem thêm (${leagues.length - visibleLeagues.length} giải khác)`;
  document.getElementById('btn-toggle-more-leagues').style.display = (leagues.length <= 10 || q) ? 'none' : 'flex';

  leagueListEl.innerHTML = visibleLeagues.map(l => {
    const isActive = state.selectedLeague === l.id;
    return `
      <li>
        <button class="vne-filter-item-btn ${isActive ? 'active' : ''}" onclick="selectLeague(${l.id})">
          <img src="${l.logo}" class="vne-filter-icon" alt="${l.vnName}" onerror="this.src='https://is.vnecdn.net/objects/leagues/39.png?v=1'">
          <div class="vne-filter-name-col">
            <span class="vne-filter-name" title="${l.vnName}">${l.vnName}</span>
            <span class="vne-filter-sub">${l.country}</span>
          </div>
        </button>
      </li>
    `;
  }).join('');

  // Filter hot teams
  let teams = state.config.hotTeams || [];
  if (q) {
    teams = teams.filter(t => t.name.toLowerCase().includes(q) || t.country.toLowerCase().includes(q));
  }
  const visibleTeams = (state.showAllTeams || q) ? teams : teams.slice(0, 6);
  document.getElementById('team-count-badge').innerText = `${visibleTeams.length}/${teams.length}`;
  document.getElementById('txt-more-teams').innerText = state.showAllTeams 
    ? '∧ Thu gọn' 
    : `∨ Xem thêm (${teams.length - visibleTeams.length} đội khác)`;
  document.getElementById('btn-toggle-more-teams').style.display = (teams.length <= 6 || q) ? 'none' : 'flex';

  teamListEl.innerHTML = visibleTeams.map(t => {
    const isActive = state.selectedTeam === t.id;
    return `
      <li>
        <button class="vne-filter-item-btn ${isActive ? 'active' : ''}" onclick="selectTeam(${t.id})">
          <img src="${t.logo}" class="vne-filter-icon" alt="${t.name}" onerror="this.src='https://is.vnecdn.net/objects/teams/42.png?v=1'">
          <div class="vne-filter-name-col">
            <span class="vne-filter-name" title="${t.name}">${t.name}</span>
            <span class="vne-filter-sub">${t.country}</span>
          </div>
        </button>
      </li>
    `;
  }).join('');

  // Show/hide reset filter box
  const hasFilter = state.selectedLeague !== null || state.selectedTeam !== null || state.searchQuery !== '';
  document.getElementById('reset-filter-box').style.display = hasFilter ? 'block' : 'none';

  // Update active filter alert banner
  const alertEl = document.getElementById('active-filter-alert');
  const alertTextEl = document.getElementById('active-filter-text');
  if (hasFilter) {
    let filterNames = [];
    if (state.selectedLeague) {
      const l = state.config.leagues.find(x => x.id === state.selectedLeague);
      if (l) filterNames.push(`Giải đấu: ${l.vnName}`);
    }
    if (state.selectedTeam) {
      const t = state.config.hotTeams.find(x => x.id === state.selectedTeam);
      if (t) filterNames.push(`Đội bóng: ${t.name}`);
    }
    if (state.searchQuery) {
      filterNames.push(`Từ khoá: "${state.searchQuery}"`);
    }
    alertTextEl.innerText = `Đang lọc: ${filterNames.join(' | ')}`;
    alertEl.style.display = 'flex';
  } else {
    alertEl.style.display = 'none';
  }

  // Also render mobile quick league chips
  renderMobileLeagueChips();
}

// Render Mobile Quick League Filter Chips
function renderMobileLeagueChips() {
  const container = document.getElementById('mobile-league-chips-container');
  if (!container || !state.config) return;

  const topLeagueIds = [39, 2, 140, 340, 78, 135, 61, 307, 3, 253];
  const leagues = state.config.leagues.filter(l => topLeagueIds.includes(l.id));

  let html = `
    <button class="vne-mobile-chip ${state.selectedLeague === null ? 'active' : ''}" onclick="selectLeague(null)">
      <span>Tất cả giải</span>
    </button>
  `;

  html += leagues.map(l => {
    const isActive = state.selectedLeague === l.id;
    return `
      <button class="vne-mobile-chip ${isActive ? 'active' : ''}" onclick="selectLeague(${l.id})">
        <img src="${l.logo}" alt="${l.vnName}" onerror="this.src='https://is.vnecdn.net/objects/leagues/39.png?v=1'">
        <span>${l.vnName}</span>
      </button>
    `;
  }).join('');

  container.innerHTML = html;
}

function toggleMoreLeagues() {
  state.showAllLeagues = !state.showAllLeagues;
  renderSidebarFilters();
}

function toggleMoreTeams() {
  state.showAllTeams = !state.showAllTeams;
  renderSidebarFilters();
}

function selectLeague(leagueId) {
  state.selectedLeague = (state.selectedLeague === leagueId) ? null : leagueId;
  state.selectedTeam = null; // reset team when league clicked
  renderSidebarFilters();
  loadFixtures();
}

function selectTeam(teamId) {
  state.selectedTeam = (state.selectedTeam === teamId) ? null : teamId;
  state.selectedLeague = null; // reset league when team clicked
  renderSidebarFilters();
  loadFixtures();
}

function clearFilters() {
  state.selectedLeague = null;
  state.selectedTeam = null;
  state.searchQuery = '';
  state.selectedDate = TODAY_DATE; // Reset to Hôm nay
  const searchInput = document.getElementById('sidebar-search-input');
  if (searchInput) searchInput.value = '';
  renderSidebarFilters();
  generateDateTabs();
  loadFixtures();
}

// Date Strip Tabs Generator (Không có tab "Tất cả", mặc định Hôm nay active)
function generateDateTabs() {
  const container = document.getElementById('date-slider-container');
  const fullDayNames = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];

  const baseDate = new Date(TODAY_DATE);
  const tabs = [];

  if (state.currentMode === 'future') {
    // Show today and next 7 days (Hôm nay, Ngày mai, Thứ bảy, Chủ nhật...)
    for (let i = 0; i < 8; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + i);
      const iso = d.toISOString().split('T')[0];
      const day = d.getDate();
      const month = d.getMonth() + 1;
      let title = i === 0 ? 'Hôm nay' : i === 1 ? 'Ngày mai' : fullDayNames[d.getDay()];
      tabs.push({
        dateStr: iso,
        title: title,
        sub: `${day}/${month}`
      });
    }
  } else if (state.currentMode === 'past') {
    // Show today and past 7 days (Hôm nay, Hôm qua, Thứ năm, Thứ tư...)
    for (let i = 0; i < 8; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() - i);
      const iso = d.toISOString().split('T')[0];
      const day = d.getDate();
      const month = d.getMonth() + 1;
      let title = i === 0 ? 'Hôm nay' : i === 1 ? 'Hôm qua' : fullDayNames[d.getDay()];
      tabs.push({
        dateStr: iso,
        title: title,
        sub: `${day}/${month}`
      });
    }
  } else {
    // LIVE mode
    tabs.push({
      dateStr: TODAY_DATE,
      title: 'Hôm nay',
      sub: 'Đang đá'
    });
  }

  container.innerHTML = tabs.map(tab => {
    const isActive = state.selectedDate === tab.dateStr;
    return `
      <button class="vne-date-item-btn ${isActive ? 'active' : ''}" onclick="selectDate('${tab.dateStr}')">
        <span>${tab.title}</span>
        <span class="date-day-sub">${tab.sub}</span>
      </button>
    `;
  }).join('');
}

function selectDate(dateStr) {
  state.selectedDate = dateStr;
  generateDateTabs();
  loadFixtures();
}

function onCustomDateSelect(dateVal) {
  if (dateVal) {
    selectDate(dateVal);
  }
}

function slideDates(direction) {
  const container = document.getElementById('date-slider-container');
  container.scrollBy({ left: direction * 140, behavior: 'smooth' });
}

// Mode Switcher (Lịch thi đấu / Kết quả / LIVE)
function switchMode(mode, updateUrl = true, evt = null) {
  if (evt) evt.preventDefault();
  state.currentMode = mode;
  state.selectedDate = TODAY_DATE; // Khi đổi tab Lịch thi đấu hoặc Kết quả, luôn active ngay 'Hôm nay'

  updateModeUI(mode, updateUrl);
  generateDateTabs();
  loadFixtures();
}

// Update UI and URL according to current mode
function updateModeUI(mode, updateUrl = true) {
  // Update tabs active state
  document.querySelectorAll('.vne-tab-btn').forEach(b => b.classList.remove('active'));
  const activeTabBtn = document.getElementById(`tab-${mode}`);
  if (activeTabBtn) activeTabBtn.classList.add('active');

  // Update live pill in date bar
  const livePill = document.getElementById('btn-date-live-pill');
  if (livePill) {
    if (mode === 'live') {
      livePill.style.backgroundColor = '#9f224e';
    } else {
      livePill.style.backgroundColor = 'var(--vne-badge-live)';
    }
  }

  // Update document title
  if (mode === 'past') {
    document.title = 'Kết quả bóng đá hôm nay - VnExpress Thể Thao';
  } else if (mode === 'live') {
    document.title = 'Trực tiếp bóng đá hôm nay (LIVE) - VnExpress Thể Thao';
  } else {
    document.title = 'Lịch thi đấu bóng đá hôm nay - VnExpress Thể Thao';
  }

  // Update browser URL using HTML5 History API without reloading
  if (updateUrl) {
    const targetUrl = mode === 'past' ? '/ket-qua' : mode === 'live' ? '/live' : '/lich-thi-dau';
    if (window.location.pathname !== targetUrl) {
      window.history.pushState({ mode }, '', targetUrl);
    }
  }
}

// Support browser Back/Forward navigation between modes
window.addEventListener('popstate', (e) => {
  const newMode = detectInitialMode();
  if (newMode !== state.currentMode) {
    switchMode(newMode, false);
  }
});

// View Mode Switcher (Timeline vs SCS Combo Card)
function switchViewMode(view) {
  state.viewMode = view;
  const btnTimeline = document.getElementById('btn-view-timeline');
  if (btnTimeline) btnTimeline.classList.toggle('active', view === 'timeline');
  const btnScs = document.getElementById('btn-view-scs');
  if (btnScs) btnScs.classList.toggle('active', view === 'scs');
  renderMatches();
}

// Load Fixtures and Results from API
async function loadFixtures() {
  const container = document.getElementById('matches-main-container');
  container.innerHTML = `
    <div style="text-align: center; padding: 40px; color: var(--vne-text-muted);">
      <div class="live-dot-pulse" style="margin-bottom: 8px;"></div>
      <div>Đang tải dữ liệu...</div>
    </div>
  `;

  try {
    let url = `/api/fixtures?mode=${state.currentMode}`;
    if (state.selectedDate) url += `&date=${state.selectedDate}`;
    if (state.selectedLeague) url += `&league_id=${state.selectedLeague}`;
    if (state.selectedTeam) url += `&team_id=${state.selectedTeam}`;
    if (state.searchQuery) url += `&search=${encodeURIComponent(state.searchQuery)}`;

    const res = await fetch(url);
    const data = await res.json();
    state.allFixtures = data.matches || [];

    // If LIVE mode and demo enabled or real live matches exist
    if (state.currentMode === 'live' && state.demoLiveActive && state.allFixtures.length === 0) {
      const liveRes = await fetch('/api/live-matches');
      const liveJson = await liveRes.json();
      state.allFixtures = liveJson.matches || [];
    }

    renderMatches();
  } catch (err) {
    console.error('Error fetching fixtures:', err);
    container.innerHTML = `
      <div style="text-align: center; padding: 30px; color: #d32f2f;">
        Không thể tải dữ liệu lịch thi đấu lúc này. Vui lòng thử lại sau!
      </div>
    `;
  }
}

// Check real live matches count for header badge
async function checkLiveMatches() {
  try {
    const res = await fetch('/api/fixtures?mode=live');
    const data = await res.json();
    let count = data.totalMatches || 0;
    if (state.demoLiveActive) count = Math.max(count, 1);
    document.getElementById('live-count-badge').innerText = count;
  } catch (e) {
    document.getElementById('live-count-badge').innerText = state.demoLiveActive ? '1' : '0';
  }
}

// Render Matches View
function renderMatches() {
  const container = document.getElementById('matches-main-container');
  const matches = state.allFixtures;

  // Summary title (if element exists)
  const summaryEl = document.getElementById('matches-summary-text');
  if (summaryEl) {
    let modeName = state.currentMode === 'future' ? 'Lịch thi đấu' : state.currentMode === 'past' ? 'Kết quả' : 'Trận đấu trực tiếp';
    const dateFormatted = formatTemplateDateOnly(state.selectedDate || TODAY_DATE);
    summaryEl.innerText = `${modeName} - ${dateFormatted} (${matches.length} trận)`;
  }

  if (matches.length === 0) {
    let emptyMsg = state.currentMode === 'live' 
      ? 'Hiện không có trận đấu nào đang diễn ra. Bạn có thể nhấn nút "⚡ Giả lập trận LIVE" ở góc trên để trải nghiệm giao diện trực tiếp.' 
      : 'Không tìm thấy trận đấu nào phù hợp với điều kiện lọc.';
    container.innerHTML = `
      <div style="background: white; border: 1px solid var(--vne-border); border-radius: 8px; padding: 36px 20px; text-align: center; color: var(--vne-text-muted);">
        <i data-lucide="info" style="width: 32px; height: 32px; margin-bottom: 8px; color: var(--vne-text-subtle);"></i>
        <div style="font-size: 14px; font-weight: 600; color: var(--vne-text-secondary); margin-bottom: 6px;">Không có dữ liệu trận đấu</div>
        <div style="font-size: 12px; max-width: 440px; margin: 0 auto 16px;">${emptyMsg}</div>
        <button onclick="clearFilters(); switchMode('future');" style="background: var(--vne-red); color: white; border: none; padding: 6px 14px; border-radius: 16px; font-size: 12px; font-weight: 600; cursor: pointer;">
          Xem lịch thi đấu sắp tới
        </button>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
    return;
  }

  // Group by league
  const grouped = {};
  matches.forEach(m => {
    const lid = m.league_id;
    if (!grouped[lid]) {
      grouped[lid] = {
        league: m.league_meta || m.league,
        round: m.round,
        matches: []
      };
    }
    grouped[lid].matches.push(m);
  });

  if (state.viewMode === 'scs') {
    renderSCSComboView(grouped);
  } else {
    renderTimelineView(grouped);
  }

  if (window.lucide) lucide.createIcons();
}

// Mode 1: Timeline View (demo-final.jpeg)
function renderTimelineView(grouped) {
  const container = document.getElementById('matches-main-container');

  const html = Object.values(grouped).map(group => {
    const league = group.league;
    const roundText = group.round ? group.round.replace('Regular Season - ', 'Vòng ') : '';

    const matchRows = group.matches.map(m => {
      const isFinished = ['FT', 'AET', 'PEN', 'Match Finished'].includes(m.status_short) || m.status === 'Match Finished';
      const isLive = ['1H', '2H', 'HT', 'LIVE', 'ET', 'P'].includes(m.status_short);
      const isPen = m.status_short === 'PEN' || m.penalty_home !== undefined || (m.score && m.score.penalty);
      const matchTimeStr = formatMatchItemTime(m.event_date);
      const fullDateTime = formatTemplateDateTime(m.event_date);
      const broadcastChannel = m.broadcast || getMatchBroadcast(m, league.id);

      const channelPillHtml = `
        <div class="vne-match-channel-pill" title="Kênh phát sóng trực tiếp: ${broadcastChannel}">
          <svg class="vne-tv-icon" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <rect width="20" height="15" x="2" y="7" rx="2" ry="2"/>
            <polyline points="17 2 12 7 7 2"/>
          </svg>
          <span>${broadcastChannel}</span>
        </div>
      `;

      // Time & Status Column
      let timeStatusHtml = '';
      if (isLive) {
        timeStatusHtml = `
          <span class="vne-match-item-time" title="${fullDateTime}">${matchTimeStr}</span>
          <div class="vne-match-live-tag">
            <span class="live-dot-pulse"></span>
            <span>${m.elapsed || 'Đang đá'}' LIVE</span>
          </div>
          ${channelPillHtml}
        `;
      } else if (isFinished) {
        timeStatusHtml = `
          <span class="vne-match-item-time" title="${fullDateTime}">${matchTimeStr}</span>
          <span class="vne-match-status-sub">KT</span>
        `;
      } else {
        timeStatusHtml = `
          <span class="vne-match-item-time" title="${fullDateTime}">${matchTimeStr}</span>
          ${channelPillHtml}
        `;
      }

      // Score display (with Penalty shootout support)
      let scoreHtml = '';
      if (isLive) {
        scoreHtml = `<div class="vne-score-box live"><span class="vne-score-num">${m.goals_home_team ?? 0}</span><span class="vne-score-dash">–</span><span class="vne-score-num">${m.goals_away_team ?? 0}</span></div>`;
      } else if (isPen) {
        const penHome = m.penalty_home ?? (m.score?.penalty ? m.score.penalty.split('-')[0].trim() : 4);
        const penAway = m.penalty_away ?? (m.score?.penalty ? m.score.penalty.split('-')[1].trim() : 2);
        scoreHtml = `
          <div class="vne-score-box has-pen" title="Hòa 120 phút: ${m.goals_home_team ?? 1}-${m.goals_away_team ?? 1} | Luân lưu: ${penHome}-${penAway}">
            <div class="vne-score-main">
              <span class="vne-score-num">${m.goals_home_team ?? 1}</span><span class="vne-score-dash">–</span><span class="vne-score-num">${m.goals_away_team ?? 1}</span>
            </div>
            <div class="vne-penalty-sub">Pen ${penHome}–${penAway}</div>
          </div>
        `;
      } else if (isFinished) {
        scoreHtml = `<div class="vne-score-box"><span class="vne-score-num">${m.goals_home_team ?? 0}</span><span class="vne-score-dash">–</span><span class="vne-score-num">${m.goals_away_team ?? 0}</span></div>`;
      } else {
        scoreHtml = `<div class="vne-score-box upcoming"><span>vs</span></div>`;
      }

      const actionHtml = isFinished ? `
        <button class="vne-btn-highlight" onclick="goToMatchDetail(${m.fixture_id}, '${escapeHtml(m.home_team.team_name)}', '${escapeHtml(m.away_team.team_name)}', event)">
          <i data-lucide="video" style="width: 12px; height: 12px;"></i>
          <span>Chi tiết</span>
        </button>
      ` : `
        <button class="vne-btn-highlight" onclick="goToMatchDetail(${m.fixture_id}, '${escapeHtml(m.home_team.team_name)}', '${escapeHtml(m.away_team.team_name)}', event)">
          <span>Chi tiết</span>
        </button>
      `;

      return `
        <div class="vne-match-row" style="cursor: pointer;" onclick="goToMatchDetail(${m.fixture_id}, '${escapeHtml(m.home_team.team_name)}', '${escapeHtml(m.away_team.team_name)}')">
          <div class="vne-match-time-status">
            ${timeStatusHtml}
          </div>
          <div class="vne-match-teams-score">
            <div class="vne-team-side home">
              <span class="vne-team-name" title="${m.home_team.team_name}">${m.home_team.team_name}</span>
              <img src="${m.home_team.logo}" class="vne-team-logo" alt="${m.home_team.team_name}" onerror="this.src='https://is.vnecdn.net/objects/teams/42.png?v=1'">
            </div>
            ${scoreHtml}
            <div class="vne-team-side away">
              <img src="${m.away_team.logo}" class="vne-team-logo" alt="${m.away_team.team_name}" onerror="this.src='https://is.vnecdn.net/objects/teams/42.png?v=1'">
              <span class="vne-team-name" title="${m.away_team.team_name}">${m.away_team.team_name}</span>
            </div>
          </div>
          <div class="vne-match-action-col">
            ${actionHtml}
          </div>
        </div>
      `;
    }).join('');

    const leagueObj = state.config?.leagues?.find(x => x.id === league.id);
    const leagueSlug = league.slug || leagueObj?.slug || 'ngoai-hang-anh';

    return `
      <div class="vne-league-group">
        <div class="vne-league-group-header">
          <div class="vne-league-info-left" style="cursor: pointer;" onclick="window.location.href='/giai-dau/${leagueSlug}'">
            <img src="${league.logo}" class="vne-league-logo" alt="${league.name}" onerror="this.src='https://is.vnecdn.net/objects/leagues/39.png?v=1'">
            <span class="vne-league-name">${league.vnName || league.name}</span>
            ${roundText ? `<span class="vne-round-tag">${roundText}</span>` : ''}
          </div>
          <a class="vne-view-detail-link" href="/giai-dau/${leagueSlug}">
            <span>Xem chi tiết</span>
            <i data-lucide="chevron-right" style="width: 14px; height: 14px;"></i>
          </a>
        </div>
        <div>
          ${matchRows}
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = html;
}

// Mode 2: SCS Combo View (scs.jpeg) - Lịch đấu, Kết quả, Bảng điểm
function renderSCSComboView(grouped) {
  const container = document.getElementById('matches-main-container');

  const html = Object.values(grouped).map(group => {
    const league = group.league;
    const matches = group.matches;

    // Split matches into upcoming vs finished
    const upcoming = matches.filter(m => !['FT', 'AET', 'PEN', 'Match Finished'].includes(m.status_short)).slice(0, 5);
    const finished = matches.filter(m => ['FT', 'AET', 'PEN', 'Match Finished'].includes(m.status_short)).slice(0, 5);
    const standings = state.standingsMap[league.id] || [];
    const roundText = group.round ? group.round.replace('Regular Season - ', 'Vòng ') : 'Vòng đấu';

    const leagueObj = state.config?.leagues?.find(x => x.id === league.id);
    const leagueSlug = league.slug || leagueObj?.slug || 'ngoai-hang-anh';

    return `
      <div class="vne-league-group">
        <div class="vne-league-group-header" style="background-color: #ffffff; border-bottom: 2px solid #e5e7eb; border-left: 5px solid var(--vne-dark-header);">
          <div class="vne-league-info-left" style="cursor: pointer;" onclick="window.location.href='/giai-dau/${leagueSlug}'">
            <img src="${league.logo}" class="vne-league-logo" alt="${league.name}" onerror="this.src='https://is.vnecdn.net/objects/leagues/39.png?v=1'">
            <span class="vne-league-name" style="font-size: 14px; font-weight: 700;">${league.vnName || league.name}</span>
          </div>
          <a class="vne-view-detail-link" style="color: var(--vne-dark-header); font-weight: 700;" href="/giai-dau/${leagueSlug}">
            <span>Chi tiết giải đấu &gt;</span>
          </a>
        </div>

        <div class="vne-scs-combo-container">
          <!-- Box 1: Lịch đấu (scs.jpeg) -->
          <div class="vne-scs-box">
            <div class="vne-scs-box-header">
              <span>Lịch đấu</span>
              <span class="vne-scs-date-pill">
                <span>&lt;</span>
                <span>${formatTemplateDateOnly(state.selectedDate || TODAY_DATE)}</span>
                <span>&gt;</span>
              </span>
            </div>
            <div class="vne-scs-box-body">
              <div style="font-size: 10px; font-weight: 700; color: #6b7280; text-align: center; padding: 2px 0; border-bottom: 1px solid #f0f2f5;">${roundText}</div>
              ${upcoming.length === 0 ? '<div style="color: #999; font-size: 11px; text-align: center; padding: 25px 0;">Không có trận sắp tới</div>' : 
                upcoming.map(m => `
                  <div class="vne-scs-match-item" style="cursor: pointer;" onclick="goToMatchDetail(${m.fixture_id}, '${escapeHtml(m.home_team.team_name)}', '${escapeHtml(m.away_team.team_name)}')" title="${formatTemplateDateTime(m.event_date)}">
                    <span style="font-weight: 600; font-size: 11px; flex: 1; text-align: right; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${m.home_team.team_name}</span>
                    <span style="padding: 1px 6px; background: #f3f4f6; border-radius: 4px; font-weight: 800; font-size: 11px; margin: 0 6px; color: #111;">${formatMatchItemTime(m.event_date)}</span>
                    <span style="font-weight: 600; font-size: 11px; flex: 1; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${m.away_team.team_name}</span>
                  </div>
                `).join('')
              }
              <button class="vne-scs-pill-btn" onclick="filterLeague(${league.id}); switchMode('future');">Xem tất cả &gt;</button>
            </div>
          </div>

          <!-- Box 2: Kết quả (scs.jpeg) -->
          <div class="vne-scs-box">
            <div class="vne-scs-box-header">
              <span>Kết quả</span>
              <span class="vne-scs-date-pill">
                <span>&lt;</span>
                <span>${formatTemplateDateOnly(state.selectedDate || TODAY_DATE)}</span>
                <span>&gt;</span>
              </span>
            </div>
            <div class="vne-scs-box-body">
              <div style="font-size: 10px; font-weight: 700; color: #6b7280; text-align: center; padding: 2px 0; border-bottom: 1px solid #f0f2f5;">${roundText}</div>
              ${finished.length === 0 ? '<div style="color: #999; font-size: 11px; text-align: center; padding: 25px 0;">Chưa có kết quả mới</div>' : 
                finished.map(m => `
                  <div class="vne-scs-match-item" style="cursor: pointer;" onclick="goToMatchDetail(${m.fixture_id}, '${escapeHtml(m.home_team.team_name)}', '${escapeHtml(m.away_team.team_name)}')" title="${formatTemplateDateTime(m.event_date)}">
                    <span style="font-weight: 600; font-size: 11px; flex: 1; text-align: right; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${m.home_team.team_name}</span>
                    <span style="padding: 1px 6px; background: #e5e7eb; border-radius: 4px; font-weight: 800; font-size: 11px; margin: 0 6px; color: #111;">${m.goals_home_team}-${m.goals_away_team}</span>
                    <span style="font-weight: 600; font-size: 11px; flex: 1; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${m.away_team.team_name}</span>
                  </div>
                `).join('')
              }
              <button class="vne-scs-pill-btn" onclick="filterLeague(${league.id}); switchMode('past');">Xem tất cả &gt;</button>
            </div>
          </div>

          <!-- Box 3: Bảng điểm (scs.jpeg) -->
          <div class="vne-scs-box">
            <div class="vne-scs-box-header">
              <span>Bảng điểm</span>
              <span class="vne-scs-date-pill">Top 5</span>
            </div>
            <div class="vne-scs-box-body" style="padding: 4px;">
              ${standings.length === 0 ? '<div style="color: #999; font-size: 11px; text-align: center; padding: 25px 0;">Đang cập nhật bảng xếp hạng</div>' : `
                <table class="vne-table-mini">
                  <thead>
                    <tr>
                      <th style="width: 14px;">#</th>
                      <th>CLB</th>
                      <th style="width: 20px;">Tr</th>
                      <th style="width: 24px;">HS</th>
                      <th style="width: 24px;">Đ</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${standings.slice(0, 5).map(s => `
                      <tr>
                        <td class="vne-rank-num ${s.rank <= 3 ? 'top-rank' : ''}">${s.rank}</td>
                        <td>
                          <div class="vne-standings-clb-col">
                            <img src="${s.logo}" class="vne-standings-logo" onerror="this.src='https://is.vnecdn.net/objects/teams/42.png?v=1'">
                            <span class="vne-standings-name">${s.team_name}</span>
                          </div>
                        </td>
                        <td>${s.all?.matchs_played ?? s.all?.played ?? '-'}</td>
                        <td>${s.goals_diff >= 0 ? '+' + s.goals_diff : s.goals_diff}</td>
                        <td class="vne-standings-pts">${s.points}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              `}
              <a class="vne-scs-pill-btn" href="/giai-dau/${leagueSlug}/bang-xep-hang" style="text-decoration:none; display:inline-block; text-align:center;">Chi tiết &gt;</a>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = html;
}

// Load Standings for Right Sidebar
async function loadStandings() {
  const container = document.getElementById('standings-sidebar-container');
  try {
    const res = await fetch('/api/standings');
    const json = await res.json();
    state.standingsMap = json.standings || {};

    const leagues = state.config?.leagues || [];
    const availableLeagueIds = Object.keys(state.standingsMap).map(Number);
    const countBadge = document.getElementById('standings-count-badge'); if (countBadge) countBadge.remove();

    container.innerHTML = availableLeagueIds.map(id => {
      const l = leagues.find(x => x.id === id) || { vnName: 'Giải đấu', name: 'League' };
      const list = state.standingsMap[id] || [];
      const top5 = list.slice(0, 5);
      const leagueSlug = l.slug || 'ngoai-hang-anh';

      return `
        <div class="vne-standings-card">
          <div class="vne-standings-header" style="cursor: pointer;" onclick="window.location.href='/giai-dau/${leagueSlug}/bang-xep-hang'">
            <div class="vne-standings-league-title">
              <span style="display:inline-block; width:4px; height:12px; background:var(--vne-red); border-radius:2px;"></span>
              <span>${l.vnName || l.name}</span>
            </div>
            <span class="vne-standings-season">2026/27</span>
          </div>

          <table class="vne-table-mini">
            <thead>
              <tr>
                <th style="width: 14px;">#</th>
                <th>CLB</th>
                <th style="width: 24px;">Tr</th>
                <th style="width: 28px;">HS</th>
                <th style="width: 28px;">Đ</th>
              </tr>
            </thead>
            <tbody>
              ${top5.map(s => `
                <tr>
                  <td class="vne-rank-num ${s.rank <= 3 ? 'top-rank' : ''}">${s.rank}</td>
                  <td>
                    <div class="vne-standings-clb-col">
                      <img src="${s.logo}" class="vne-standings-logo" alt="${s.team_name}" onerror="this.src='https://is.vnecdn.net/objects/teams/42.png?v=1'">
                      <span class="vne-standings-name" title="${s.team_name}">${s.team_name}</span>
                    </div>
                  </td>
                  <td>${s.all?.matchs_played ?? s.all?.played ?? '-'}</td>
                  <td>${s.goals_diff >= 0 ? '+' + s.goals_diff : s.goals_diff}</td>
                  <td class="vne-standings-pts">${s.points}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="vne-standings-footer">
            <a class="vne-standings-more-link" href="/giai-dau/${leagueSlug}/bang-xep-hang">
              <span>Xem chi tiết</span> &gt;
            </a>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('Error loading standings:', err);
  }
}

// Load Football News Feed
async function loadNews(page = 1) {
  state.newsPage = page;
  const container = document.getElementById('news-list-container');
  container.innerHTML = `
    <div style="text-align: center; padding: 20px; color: var(--vne-text-muted);">
      Đang tải tin tức thể thao...
    </div>
  `;

  try {
    const res = await fetch(`/api/news?page=${page}&limit=${state.newsLimit}`);
    const data = await res.json();
    const items = data.items || [];

    document.getElementById('news-page-info').innerText = `Trang ${data.page} / ${data.totalPages} (${data.total} tin bài)`;
    const startRange = (data.page - 1) * data.limit + 1;
    const endRange = Math.min(data.page * data.limit, data.total);
    document.getElementById('news-display-range').innerText = `Hiển thị ${startRange} - ${endRange} trên ${data.total} bài viết`;

    container.innerHTML = items.map(news => `
      <a href="${news.link}" target="_blank" rel="noopener noreferrer" class="vne-news-card">
        <div class="vne-news-thumb-col">
          <img src="${news.thumbnail}" class="vne-news-thumb" alt="${escapeHtml(news.title)}" loading="lazy" onerror="this.src='https://s1.vnecdn.net/vnexpress/restruct/i/v9525/v2_2019/pc/graphics/placeholder.png'">
        </div>
        <div class="vne-news-text-col">
          <div>
            <h3 class="vne-news-heading">${news.title}</h3>
            <p class="vne-news-lead">${news.description}</p>
          </div>
          <div class="vne-news-meta">
            <span>${news.timeAgo}</span>
            <span>•</span>
            <span class="vne-news-category-pill">${news.category}</span>
          </div>
        </div>
      </a>
    `).join('');

    // Pagination buttons
    renderNewsPagination(data.page, data.totalPages);
  } catch (err) {
    console.error('Error fetching news:', err);
    container.innerHTML = `<div style="padding: 20px; text-align: center; color: #999;">Không thể tải tin tức bóng đá lúc này.</div>`;
  }
}

function renderNewsPagination(currentPage, totalPages) {
  const container = document.getElementById('news-pagination-controls');
  let buttons = '';

  if (currentPage > 1) {
    buttons += `<button class="vne-page-btn" onclick="loadNews(${currentPage - 1})">&lt; Trước</button>`;
  }

  for (let p = 1; p <= totalPages; p++) {
    buttons += `
      <button class="vne-page-btn ${p === currentPage ? 'active' : ''}" onclick="loadNews(${p})">
        ${p}
      </button>
    `;
  }

  if (currentPage < totalPages) {
    buttons += `<button class="vne-page-btn" onclick="loadNews(${currentPage + 1})">Sau &gt;</button>`;
  }

  container.innerHTML = buttons;
}

// Open Full League Standings
function openLeagueStandingsModal(leagueId) {
  const leagues = state.config?.leagues || [];
  const league = leagues.find(l => l.id === leagueId);
  const slug = league?.slug || 'ngoai-hang-anh';
  window.location.href = `/giai-dau/${slug}/bang-xep-hang`;
}

// Open Highlight Video Simulator Modal
function openHighlightModal(fixtureId, homeTeam, awayTeam, score, leagueName, eventDate) {
  const modal = document.getElementById('modal-highlight');
  document.getElementById('modal-highlight-title').innerText = `HIGHLIGHT: ${homeTeam.toUpperCase()} ${score} ${awayTeam.toUpperCase()}`;
  document.getElementById('highlight-match-banner').innerText = `${homeTeam} ${score} ${awayTeam}`;
  const formattedTime = formatTemplateDateTime(eventDate);
  document.getElementById('highlight-meta-info').innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--vne-border-light); padding-bottom: 8px; margin-bottom: 8px;">
      <span style="font-weight: 700; font-size: 14px; color: var(--vne-dark-header);">${leagueName}</span>
      <span style="font-size: 12px; font-weight: 600; color: var(--vne-text-secondary);">${formattedTime}</span>
    </div>
    <div style="font-size: 13px; line-height: 1.5; color: var(--vne-text-secondary);">
      Xem lại toàn bộ những pha bóng đáng chú ý, các bàn thắng đẹp mắt và tình huống kịch tính nhất trong màn so tài đỉnh cao giữa <strong>${homeTeam}</strong> và <strong>${awayTeam}</strong>.
    </div>
  `;
  modal.classList.add('open');
  if (window.lucide) lucide.createIcons();
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('open');
}

function closeModalOnBackdrop(e, modalId) {
  if (e.target.id === modalId) {
    closeModal(modalId);
  }
}

function filterLeague(leagueId) {
  selectLeague(leagueId);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

function toSeoSlug(str) {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function goToMatchDetail(fixtureId, homeName, awayName, evt = null) {
  if (evt) evt.stopPropagation();
  const hSlug = toSeoSlug(homeName) || 'home';
  const aSlug = toSeoSlug(awayName) || 'away';
  const idPart = fixtureId || 1001;
  window.location.href = `/tran-dau/${hSlug}-vs-${aSlug}-${idPart}`;
}
