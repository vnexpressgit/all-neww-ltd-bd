
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

/**
 * League Detail Page Scripts - VnExpress Football
 * Handles SEO slug routing, 4 sub-pages (Tổng quan, Lịch thi đấu, Kết quả, Bảng xếp hạng),
 * match widget slider, clean news pagination without view badges, prediction widget, standings & top scorers.
 */

const state = {
  leagueSlug: 'champions-league',
  leagueId: 2,
  activeTab: 'tong-quan', // 'tong-quan' | 'lich-thi-dau' | 'ket-qua' | 'bang-xep-hang'
  data: null,
  newsPage: 1,
  newsPerPage: 20,
  activeModal: null,
  fixturesFilterRound: 'all',
  fixturesSearchText: '',
  resultsFilterRound: 'all',
  resultsSearchText: ''
};

// Initialize
function initLeagueDetailApp() {
  parseUrlRoute();
  initHeaderClock();
  loadLeagueDetailData();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLeagueDetailApp);
} else {
  initLeagueDetailApp();
}

// Parse SEO Friendly URL Route: /giai-dau/:slug/:tab or /giai-dau/:slug
function parseUrlRoute() {
  const path = window.location.pathname; // e.g. /giai-dau/champions-league/lich-thi-dau
  const parts = path.split('/').filter(Boolean);

  if (parts[0] === 'giai-dau' && parts[1]) {
    state.leagueSlug = parts[1];
    if (parts[2]) {
      const validTabs = ['tong-quan', 'lich-thi-dau', 'ket-qua', 'bang-xep-hang'];
      if (validTabs.includes(parts[2])) {
        state.activeTab = parts[2];
      }
    } else {
      state.activeTab = 'tong-quan';
    }
  } else {
    // Query param fallback support: /league-detail.html?league_id=39&tab=lich-thi-dau
    const urlParams = new URLSearchParams(window.location.search);
    const qSlug = urlParams.get('slug');
    const qLeagueId = parseInt(urlParams.get('league_id'));
    const qTab = urlParams.get('tab');
    if (qSlug) state.leagueSlug = qSlug;
    if (qLeagueId && !isNaN(qLeagueId)) state.leagueId = qLeagueId;
    if (qTab) state.activeTab = qTab;
  }
}

// Update live header datetime clock
function initHeaderClock() {
  const el = document.getElementById('current-datetime-display');
  if (!el) return;
  const update = () => {
    if (window.vdsFormatDateTime) {
      el.innerText = window.vdsFormatDateTime(new Date());
    } else {
      const days = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
      const now = new Date();
      const dName = days[now.getDay()];
      const dd = now.getDate();
      const mm = now.getMonth() + 1;
      const yyyy = now.getFullYear();
      const hh = String(now.getHours()).padStart(2, '0');
      const min = String(now.getMinutes()).padStart(2, '0');
      el.innerText = `${dName}, ${dd}/${mm}/${yyyy}, ${hh}:${min} (GMT+7)`;
    }
  };
  update();
  setInterval(update, 30000);
}

// Fetch all league detail data from server
async function loadLeagueDetailData() {
  try {
    const query = state.leagueSlug 
      ? `slug=${state.leagueSlug}` 
      : `league_id=${state.leagueId}`;
    const res = await fetch(`/api/league-detail?${query}`);
    const data = await res.json();
    state.data = data;
    state.leagueSlug = data.league?.slug || state.leagueSlug;
    state.leagueId = data.league?.id || state.leagueId;

    // Render Banner
    renderLeagueBanner(data.league, data.allLeagues);

    // Render Tab 1: Tổng quan & Tin tức
    renderTopMatchWidget(data.topMatches);
    renderNewsSection();
    renderPredictionWidget(data.predictionMatches);
    renderMiniStandings(data.standings);
    renderMiniTopScorers(data.topscorers);

    // Render Tab 2: Lịch thi đấu
    renderUpcomingFixtures();

    // Render Tab 3: Kết quả
    renderPastResults();

    // Render Tab 4: Bảng xếp hạng chi tiết
    renderFullStandingsPage(data.standings);
    renderFullTopScorersPage(data.topscorers);

    // Activate the targeted tab
    switchLeagueTab(state.activeTab, null, false);

    if (window.lucide) lucide.createIcons();
  } catch (err) {
    console.error('Error loading league detail:', err);
  }
}

// Update Page Title based on league & active tab
function updatePageTitle() {
  const leagueName = state.data?.league?.vnName || state.data?.league?.name || 'Chi tiết giải đấu';
  if (state.activeTab === 'lich-thi-dau') {
    document.title = `Lịch thi đấu ${leagueName} 2026/2027 - VnExpress`;
  } else if (state.activeTab === 'ket-qua') {
    document.title = `Kết quả ${leagueName} 2026/2027 - VnExpress`;
  } else if (state.activeTab === 'bang-xep-hang') {
    document.title = `Bảng xếp hạng ${leagueName} 2026/2027 - VnExpress`;
  } else {
    document.title = `${leagueName} - Tổng quan & Tin tức - VnExpress Thể Thao`;
  }
}

// Switch between the 4 sub-pages / tabs
function switchLeagueTab(tab, evt, updateHistory = true) {
  if (evt) evt.preventDefault();
  state.activeTab = tab;

  // Update subnav buttons active state
  const tabs = ['tong-quan', 'lich-thi-dau', 'ket-qua', 'bang-xep-hang'];
  tabs.forEach(t => {
    const btn = document.getElementById(`subnav-${t}`);
    if (btn) {
      if (t === tab) btn.classList.add('active');
      else btn.classList.remove('active');
    }
  });

  // Update tab panes visibility
  tabs.forEach(t => {
    const pane = document.getElementById(`tab-pane-${t}`);
    if (pane) {
      if (t === tab) pane.classList.add('active');
      else pane.classList.remove('active');
    }
  });

  // Update browser URL using HTML5 History API (without reloading)
  if (updateHistory && state.leagueSlug) {
    const newUrl = tab === 'tong-quan' 
      ? `/giai-dau/${state.leagueSlug}` 
      : `/giai-dau/${state.leagueSlug}/${tab}`;
    if (window.location.pathname !== newUrl) {
      window.history.pushState({ tab, leagueSlug: state.leagueSlug }, '', newUrl);
    }
  }

  updatePageTitle();

  if (window.lucide) lucide.createIcons();
}

// Listen to browser Back / Forward buttons
window.addEventListener('popstate', (e) => {
  parseUrlRoute();
  switchLeagueTab(state.activeTab, null, false);
});

// 1. Render Title Tên Giải (League Banner - Cleaned per user request: no country badge, no subtitle)
function renderLeagueBanner(league, allLeagues) {
  if (!league) return;
  
  const logoEl = document.getElementById('detail-league-logo');
  const nameEl = document.getElementById('detail-league-name');
  
  if (logoEl) logoEl.src = league.logo;
  if (nameEl) nameEl.innerText = league.name || league.vnName;

  // Set league names on subpage headers
  const fName = document.getElementById('fixtures-league-name');
  const rName = document.getElementById('results-league-name');
  const sName = document.getElementById('standings-league-name');
  if (fName) fName.innerText = `- ${league.vnName || league.name}`;
  if (rName) rName.innerText = `- ${league.vnName || league.name}`;
  if (sName) sName.innerText = `- ${league.vnName || league.name}`;

  // Populate league dropdown
  const dropdown = document.getElementById('league-dropdown-select');
  if (dropdown && allLeagues) {
    dropdown.innerHTML = allLeagues.map(l => `
      <option value="${l.slug}" ${l.slug === state.leagueSlug || l.id === state.leagueId ? 'selected' : ''}>
        ${l.vnName} (${l.country})
      </option>
    `).join('');
  }
}

function onSwitchLeague(newSlug) {
  window.location.href = `/giai-dau/${newSlug}`;
}

// 2. Render Top Match Schedule Widget (chi-tiet-giai.jpg)
function renderTopMatchWidget(matches) {
  const container = document.getElementById('top-widget-matches-container');
  if (!container) return;

  if (!matches || matches.length === 0) {
    container.innerHTML = `
      <div style="padding: 16px; color: var(--vne-text-muted); font-size: 12px; text-align: center; width: 100%;">
        Chưa có lịch thi đấu mới cho giải này.
      </div>
    `;
    return;
  }

  container.innerHTML = matches.map(m => {
    const isFinished = ['FT', 'AET', 'PEN', 'Match Finished'].includes(m.status_short) || m.status === 'Match Finished';
    const isLive = ['1H', '2H', 'HT', 'LIVE', 'ET', 'P'].includes(m.status_short);
    const isPen = m.status_short === 'PEN' || m.penalty_home !== undefined || (m.score && m.score.penalty);
    const dateFormatted = formatWidgetMatchDate(m.event_date);
    const broadcastChannel = m.broadcast || getMatchBroadcast(m, m.league_id);

    const penH = m.penalty_home ?? (m.score?.penalty ? m.score.penalty.split('-')[0].trim() : 4);
    const penA = m.penalty_away ?? (m.score?.penalty ? m.score.penalty.split('-')[1].trim() : 2);

    let homeScore = '';
    let awayScore = '';
    if (isFinished || isLive) {
      if (isPen) {
        homeScore = `<span class="vne-widget-match-score ${isLive ? 'live' : ''}">${m.goals_home_team ?? 0} <span class="vne-widget-pen-num">(${penH})</span></span>`;
        awayScore = `<span class="vne-widget-match-score ${isLive ? 'live' : ''}">${m.goals_away_team ?? 0} <span class="vne-widget-pen-num">(${penA})</span></span>`;
      } else {
        homeScore = `<span class="vne-widget-match-score ${isLive ? 'live' : ''}">${m.goals_home_team ?? 0}</span>`;
        awayScore = `<span class="vne-widget-match-score ${isLive ? 'live' : ''}">${m.goals_away_team ?? 0}</span>`;
      }
    }

    return `
      <div class="vne-widget-match-item" style="cursor: pointer;" onclick="goToMatchDetail(${m.fixture_id}, '${escapeHtml(m.home_team.team_name)}', '${escapeHtml(m.away_team.team_name)}')">
        <div class="vne-widget-match-time">
          <span>${dateFormatted}</span>
          ${isLive ? '<span class="live-dot-pulse" style="width:6px; height:6px;"></span>' : ''}
          ${isFinished ? '<span style="color:#64748b; font-weight:700; font-size:10px;">KT</span>' : ''}
          ${!isFinished && broadcastChannel ? `
            <div class="vne-match-channel-pill" title="Trực tiếp: ${broadcastChannel}">
              <svg class="vne-tv-icon" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <rect width="20" height="15" x="2" y="7" rx="2" ry="2"/>
                <polyline points="17 2 12 7 7 2"/>
              </svg>
              <span>${broadcastChannel}</span>
            </div>
          ` : ''}
        </div>
        
        <!-- Home Team -->
        <div class="vne-widget-team-row">
          <div class="vne-widget-team-info">
            <img src="${m.home_team.logo}" class="vne-widget-team-logo" alt="${m.home_team.team_name}" onerror="this.src='https://is.vnecdn.net/objects/teams/42.png?v=1'">
            <span class="vne-widget-team-name" title="${m.home_team.team_name}">${m.home_team.team_name}</span>
          </div>
          ${homeScore}
        </div>

        <!-- Away Team -->
        <div class="vne-widget-team-row">
          <div class="vne-widget-team-info">
            <img src="${m.away_team.logo}" class="vne-widget-team-logo" alt="${m.away_team.team_name}" onerror="this.src='https://is.vnecdn.net/objects/teams/42.png?v=1'">
            <span class="vne-widget-team-name" title="${m.away_team.team_name}">${m.away_team.team_name}</span>
          </div>
          ${awayScore}
        </div>
      </div>
    `;
  }).join('');
}

function slideTopMatches(direction) {
  const container = document.getElementById('top-widget-matches-container');
  if (container) {
    container.scrollBy({ left: direction * 280, behavior: 'smooth' });
  }
}

// 3. Render News Section (Hero Article + 20 items list per page)
// Cleaned per user request: removed '7.382 Educate' and eye icon 👁
function renderNewsSection() {
  const allNews = state.data?.news || [];
  const heroContainer = document.getElementById('league-hero-article-container');
  const listContainer = document.getElementById('league-news-list-container');
  const rangeInfo = document.getElementById('league-news-range-info');
  const pagination = document.getElementById('league-news-pagination');

  if (allNews.length === 0) {
    listContainer.innerHTML = '<div style="padding: 30px; text-align: center; color: #888;">Đang cập nhật tin tức...</div>';
    return;
  }

  // Page 1: Top item is Hero article (chi-tiet-giai.jpg)
  const page = state.newsPage;
  const perPage = state.newsPerPage;
  const startIdx = (page - 1) * perPage;
  const pageItems = allNews.slice(startIdx, startIdx + perPage);

  if (page === 1) {
    const hero = pageItems[0];
    const restItems = pageItems.slice(1);

    if (heroContainer) {
      heroContainer.style.display = 'block';
      heroContainer.innerHTML = `
        <article class="vne-league-hero-card">
          <div class="vne-league-hero-thumb-wrapper">
            <a href="${hero.link}" target="_blank">
              <img src="${hero.thumbnail}" class="vne-league-hero-thumb" alt="${hero.title}" onerror="this.src='https://s1.vnecdn.net/vnexpress/restruct/i/v9525/v2_2019/pc/graphics/placeholder.png'">
            </a>
          </div>
          <div class="vne-league-hero-body">
            <h2 class="vne-league-hero-title">
              <a href="${hero.link}" target="_blank">${hero.title}</a>
            </h2>
            <p class="vne-league-hero-lead">${hero.description}</p>
            <div class="vne-league-hero-footer">
              <span class="vne-news-time">${hero.timeAgo}</span>
              <span class="vne-news-comments">💬 ${Math.floor(Math.random() * 50 + 10)}</span>
            </div>
          </div>
        </article>
      `;
    }

    if (listContainer) {
      listContainer.innerHTML = restItems.map(item => renderNewsCardHtml(item)).join('');
    }
  } else {
    // Other pages: all 20 items in list
    if (heroContainer) heroContainer.style.display = 'none';
    if (listContainer) {
      listContainer.innerHTML = pageItems.map(item => renderNewsCardHtml(item)).join('');
    }
  }

  // Update Range info
  const startItem = startIdx + 1;
  const endItem = Math.min(startIdx + perPage, allNews.length);
  if (rangeInfo) {
    rangeInfo.innerText = `Hiển thị ${startItem} - ${endItem} trên tổng số ${allNews.length} bài viết`;
  }

  // Update Pagination Controls
  const totalPages = Math.ceil(allNews.length / perPage) || 1;
  if (pagination) {
    let pagesHtml = '';
    
    pagesHtml += `
      <button class="vne-page-btn" ${page <= 1 ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : `onclick="changeNewsPage(${page - 1})"`}>
        ‹ Trước
      </button>
    `;

    for (let p = 1; p <= totalPages; p++) {
      pagesHtml += `
        <button class="vne-page-btn ${p === page ? 'active' : ''}" onclick="changeNewsPage(${p})">
          ${p}
        </button>
      `;
    }

    pagesHtml += `
      <button class="vne-page-btn" ${page >= totalPages ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : `onclick="changeNewsPage(${page + 1})"`}>
        Sau ›
      </button>
    `;

    pagination.innerHTML = pagesHtml;
  }
}

// Clean News Card Html: NO eye icon, NO '7.382 Educate'
function renderNewsCardHtml(item) {
  return `
    <article class="vne-league-news-item">
      <div class="vne-league-news-thumb-col">
        <a href="${item.link}" target="_blank">
          <img src="${item.thumbnail}" class="vne-league-news-thumb" alt="${item.title}" onerror="this.src='https://s1.vnecdn.net/vnexpress/restruct/i/v9525/v2_2019/pc/graphics/placeholder.png'">
        </a>
      </div>
      <div class="vne-league-news-body-col">
        <h3 class="vne-league-news-heading">
          <a href="${item.link}" target="_blank">${item.title}</a>
        </h3>
        <p class="vne-league-news-lead">${item.description}</p>
        <div class="vne-league-news-footer">
          <span class="vne-news-time">${item.timeAgo}</span>
          <span class="vne-news-comments">💬 ${Math.floor(Math.random() * 70 + 5)}</span>
        </div>
      </div>
    </article>
  `;
}

function changeNewsPage(p) {
  state.newsPage = p;
  renderNewsSection();
  const el = document.getElementById('league-hero-article-container');
  if (el) el.scrollIntoView({ behavior: 'smooth' });
}

// 4. Render Widget "Dự đoán tỷ số" (chi-tiet-giai.jpg)
function renderPredictionWidget(matches) {
  const container = document.getElementById('prediction-matches-list');
  if (!container) return;

  if (!matches || matches.length === 0) {
    container.innerHTML = '<div style="padding: 12px; color: #888; font-size: 11.5px; text-align: center;">Chưa có trận dự đoán hôm nay.</div>';
    return;
  }

  container.innerHTML = matches.map(m => {
    const timeFormatted = formatPredictionDate(m.event_date);
    return `
      <div class="vne-prediction-item" style="cursor: pointer;" onclick="goToMatchDetail(${m.fixture_id}, '${escapeHtml(m.home_team.team_name)}', '${escapeHtml(m.away_team.team_name)}')">
        <div class="vne-prediction-kickoff">| ${timeFormatted}</div>
        
        <div class="vne-prediction-teams-row">
          <span class="vne-prediction-team-name">${m.home_team.team_name}</span>
          <img src="${m.home_team.logo}" class="vne-prediction-logo" alt="${m.home_team.team_name}" onerror="this.src='https://is.vnecdn.net/objects/teams/42.png?v=1'">
          <span class="vne-prediction-vs">VS</span>
          <img src="${m.away_team.logo}" class="vne-prediction-logo" alt="${m.away_team.team_name}" onerror="this.src='https://is.vnecdn.net/objects/teams/42.png?v=1'">
          <span class="vne-prediction-team-name">${m.away_team.team_name}</span>
        </div>

        <button class="vne-btn-predict" onclick="goToMatchDetail(${m.fixture_id}, '${escapeHtml(m.home_team.team_name)}', '${escapeHtml(m.away_team.team_name)}', event)">
          Chi tiết
        </button>
      </div>
    `;
  }).join('');
}

// 5. Render Sidebar Mini Standings (Top 8 teams)
function renderMiniStandings(standings) {
  const tbody = document.getElementById('detail-standings-tbody');
  if (!tbody) return;

  if (!standings || standings.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:16px; color:#888;">Chưa có bảng xếp hạng mùa này.</td></tr>';
    return;
  }

  const topStandings = standings.slice(0, 8);
  tbody.innerHTML = topStandings.map((team, idx) => {
    const rank = team.rank || idx + 1;
    const calc = team.calculated || {};
    const played = calc.played ?? (team.all?.matchs_played ?? 0);
    const gd = calc.goalDiff ?? (team.goals_diff ?? 0);
    const pts = calc.points ?? (team.points ?? 0);
    
    let rankBadgeClass = rank <= 4 ? 'rank-ucl' : rank <= 6 ? 'rank-uel' : '';
    
    return `
      <tr>
        <td>
          <span class="vne-rank-num ${rankBadgeClass}">${rank}</span>
        </td>
        <td>
          <div class="vne-table-team-cell">
            <img src="${team.team_logo || team.logo}" class="vne-table-team-logo" alt="${team.team_name}" onerror="this.src='https://is.vnecdn.net/objects/teams/50.png?v=1'">
            <span class="vne-table-team-title" title="${team.team_name}">${team.team_name}</span>
          </div>
        </td>
        <td style="text-align: center; color: var(--vne-text-muted);">${played}</td>
        <td style="text-align: center; font-weight: 600;">${gd > 0 ? `+${gd}` : gd}</td>
        <td style="text-align: center; font-weight: 800; color: var(--vne-text-main);">${pts}</td>
      </tr>
    `;
  }).join('');
}

// 6. Render Sidebar Mini Top Scorers (Top 8)
function renderMiniTopScorers(scorers) {
  const tbody = document.getElementById('detail-scorers-tbody');
  if (!tbody) return;

  if (!scorers || scorers.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:16px; color:#888;">Đang cập nhật danh sách ghi bàn.</td></tr>';
    return;
  }

  const topScorers = scorers.slice(0, 8);
  tbody.innerHTML = topScorers.map((player, idx) => {
    const rank = idx + 1;
    const rankClass = rank === 1 ? 'rank-gold' : rank === 2 ? 'rank-silver' : rank === 3 ? 'rank-bronze' : '';
    const goalsCount = player.goals?.total ?? player.goals ?? 0;

    return `
      <tr>
        <td>
          <span class="vne-rank-num ${rankClass}">${rank}</span>
        </td>
        <td>
          <div style="font-weight: 700; color: var(--vne-text-main); font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 120px;" title="${player.player_name}">
            ${player.player_name}
          </div>
          <div style="font-size: 10px; color: var(--vne-text-muted);">${player.nationality || player.position || ''}</div>
        </td>
        <td>
          <div class="vne-table-team-cell">
            <img src="${player.logo_team}" class="vne-table-team-logo" alt="${player.team_name}" onerror="this.src='https://is.vnecdn.net/objects/teams/50.png?v=1'">
            <span class="vne-table-team-title" style="max-width: 80px;" title="${player.team_name}">${player.team_name}</span>
          </div>
        </td>
        <td style="text-align: center; font-weight: 800; color: #dc2626; font-size: 13px;">${goalsCount}</td>
      </tr>
    `;
  }).join('');
}

// =========================================================================
// SUB-PAGE 2: LỊCH THI ĐẤU (HÔM NAY ĐI VỀ TƯƠNG LAI)
// =========================================================================
function renderUpcomingFixtures() {
  const matches = state.data?.upcomingMatches || [];
  const roundFilter = document.getElementById('fixtures-round-filter');
  if (roundFilter && roundFilter.options.length <= 1) {
    const rounds = [...new Set(matches.map(m => m.round).filter(Boolean))];
    roundFilter.innerHTML = '<option value="all">Tất cả các vòng</option>' + rounds.map(r => `<option value="${r}">${r}</option>`).join('');
  }

  filterUpcomingMatches();
}

function filterUpcomingMatches() {
  const container = document.getElementById('upcoming-matches-container');
  if (!container) return;

  const roundVal = document.getElementById('fixtures-round-filter')?.value || 'all';
  const searchVal = (document.getElementById('fixtures-team-search')?.value || '').toLowerCase().trim();

  let matches = state.data?.upcomingMatches || [];
  if (roundVal !== 'all') {
    matches = matches.filter(m => m.round === roundVal);
  }
  if (searchVal) {
    matches = matches.filter(m => 
      m.home_team?.team_name?.toLowerCase().includes(searchVal) ||
      m.away_team?.team_name?.toLowerCase().includes(searchVal)
    );
  }

  if (matches.length === 0) {
    container.innerHTML = `
      <div style="background:#fff; border:1px solid var(--vne-border); border-radius:6px; padding:36px; text-align:center; color:var(--vne-text-muted);">
        <i data-lucide="calendar-x" style="width:36px; height:36px; margin-bottom:8px; opacity:0.6;"></i>
        <div style="font-size:14px; font-weight:600;">Không tìm thấy lịch thi đấu phù hợp.</div>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
    return;
  }

  // Group by round
  const grouped = {};
  matches.forEach(m => {
    const key = m.round || 'Lịch thi đấu sắp tới';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(m);
  });

  let html = '';
  for (const [roundName, roundMatches] of Object.entries(grouped)) {
    html += `
      <div class="vne-subpage-round-group">
        <div class="vne-subpage-round-title">
          <span>${roundName}</span>
          <span style="font-size:11.5px; font-weight:600; color:#64748b;">${roundMatches.length} trận đấu</span>
        </div>
        <div>
          ${roundMatches.map(m => {
            const timeFormatted = formatSubpageKickoff(m.event_date);
            const isLive = ['1H', '2H', 'HT', 'LIVE'].includes(m.status_short);
            const isFinished = ['FT', 'AET', 'PEN', 'Match Finished'].includes(m.status_short) || m.status === 'Match Finished';
            const broadcastChannel = m.broadcast || getMatchBroadcast(m, state.leagueId);
            const channelPillHtml = broadcastChannel && !isFinished ? `
              <div class="vne-match-channel-pill" title="Kênh phát sóng trực tiếp: ${broadcastChannel}">
                <svg class="vne-tv-icon" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <rect width="20" height="15" x="2" y="7" rx="2" ry="2"/>
                  <polyline points="17 2 12 7 7 2"/>
                </svg>
                <span>${broadcastChannel}</span>
              </div>
            ` : '';

            return `
              <div class="vne-subpage-match-row" style="cursor: pointer;" onclick="goToMatchDetail(${m.fixture_id}, '${escapeHtml(m.home_team.team_name)}', '${escapeHtml(m.away_team.team_name)}')">
                <div class="vne-subpage-time-col">
                  <div class="vne-subpage-time-left">
                    <span class="vne-subpage-time-primary">${timeFormatted.time}</span>
                    <span class="vne-subpage-time-secondary">${timeFormatted.date}</span>
                  </div>
                  ${channelPillHtml}
                </div>

                <div class="vne-subpage-teams-col">
                  <div class="vne-subpage-team-box home">
                    <span class="vne-subpage-team-name" title="${m.home_team.team_name}">${m.home_team.team_name}</span>
                    <img src="${m.home_team.logo}" class="vne-subpage-team-logo" alt="${m.home_team.team_name}" onerror="this.src='https://is.vnecdn.net/objects/teams/42.png?v=1'">
                  </div>

                  <div class="vne-subpage-score-box ${isLive ? 'live' : ''}">
                    ${isLive ? `<span class="vne-score-num">${m.goals_home_team}</span><span class="vne-score-dash">–</span><span class="vne-score-num">${m.goals_away_team}</span>` : 'VS'}
                  </div>

                  <div class="vne-subpage-team-box away">
                    <img src="${m.away_team.logo}" class="vne-subpage-team-logo" alt="${m.away_team.team_name}" onerror="this.src='https://is.vnecdn.net/objects/teams/42.png?v=1'">
                    <span class="vne-subpage-team-name" title="${m.away_team.team_name}">${m.away_team.team_name}</span>
                  </div>
                </div>

                <div class="vne-subpage-action-col">
                  <button class="vne-btn-subpage-action" onclick="goToMatchDetail(${m.fixture_id}, '${escapeHtml(m.home_team.team_name)}', '${escapeHtml(m.away_team.team_name)}', event)">
                    <i data-lucide="target" style="width:13px; height:13px;"></i>
                    <span>Chi tiết</span>
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  container.innerHTML = html;
  if (window.lucide) lucide.createIcons();
}

// =========================================================================
// SUB-PAGE 3: KẾT QUẢ (HÔM NAY TRỞ VỀ QUÁ KHỨ)
// =========================================================================
function renderPastResults() {
  const matches = state.data?.pastMatches || [];
  const roundFilter = document.getElementById('results-round-filter');
  if (roundFilter && roundFilter.options.length <= 1) {
    const rounds = [...new Set(matches.map(m => m.round).filter(Boolean))];
    roundFilter.innerHTML = '<option value="all">Tất cả các vòng</option>' + rounds.map(r => `<option value="${r}">${r}</option>`).join('');
  }

  filterPastMatches();
}

function filterPastMatches() {
  const container = document.getElementById('past-matches-container');
  if (!container) return;

  const roundVal = document.getElementById('results-round-filter')?.value || 'all';
  const searchVal = (document.getElementById('results-team-search')?.value || '').toLowerCase().trim();

  let matches = state.data?.pastMatches || [];
  if (roundVal !== 'all') {
    matches = matches.filter(m => m.round === roundVal);
  }
  if (searchVal) {
    matches = matches.filter(m => 
      m.home_team?.team_name?.toLowerCase().includes(searchVal) ||
      m.away_team?.team_name?.toLowerCase().includes(searchVal)
    );
  }

  if (matches.length === 0) {
    container.innerHTML = `
      <div style="background:#fff; border:1px solid var(--vne-border); border-radius:6px; padding:36px; text-align:center; color:var(--vne-text-muted);">
        <i data-lucide="trophy" style="width:36px; height:36px; margin-bottom:8px; opacity:0.6;"></i>
        <div style="font-size:14px; font-weight:600;">Không tìm thấy kết quả trận đấu phù hợp.</div>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
    return;
  }

  // Group by round
  const grouped = {};
  matches.forEach(m => {
    const key = m.round || 'Kết quả các trận đã đấu';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(m);
  });

  let html = '';
  for (const [roundName, roundMatches] of Object.entries(grouped)) {
    html += `
      <div class="vne-subpage-round-group">
        <div class="vne-subpage-round-title">
          <span>${roundName}</span>
          <span style="font-size:11.5px; font-weight:600; color:#64748b;">${roundMatches.length} trận đã đấu</span>
        </div>
        <div>
          ${roundMatches.map(m => {
            const timeFormatted = formatSubpageKickoff(m.event_date);
            const hGoals = m.goals_home_team ?? 0;
            const aGoals = m.goals_away_team ?? 0;
            const isPen = m.status_short === 'PEN' || m.penalty_home !== undefined || (m.score && m.score.penalty);
            const penH = m.penalty_home ?? (m.score?.penalty ? m.score.penalty.split('-')[0].trim() : 4);
            const penA = m.penalty_away ?? (m.score?.penalty ? m.score.penalty.split('-')[1].trim() : 2);

            let homeWon = hGoals > aGoals;
            let awayWon = aGoals > hGoals;
            if (isPen) {
              homeWon = Number(penH) > Number(penA);
              awayWon = Number(penA) > Number(penH);
            }

            return `
              <div class="vne-subpage-match-row" style="cursor: pointer;" onclick="goToMatchDetail(${m.fixture_id}, '${escapeHtml(m.home_team.team_name)}', '${escapeHtml(m.away_team.team_name)}')">
                <div class="vne-subpage-time-col">
                  <div style="display:flex; align-items:center; gap:6px;">
                    <span class="vne-subpage-time-primary">${timeFormatted.time}</span>
                    <span style="background:#f1f5f9; color:#475569; font-size:10px; font-weight:700; padding:1px 5px; border-radius:3px;">KT</span>
                  </div>
                  <span class="vne-subpage-time-secondary">${timeFormatted.date}</span>
                </div>

                <div class="vne-subpage-teams-col">
                  <div class="vne-subpage-team-box home">
                    <span class="vne-subpage-team-name ${homeWon ? 'winner' : ''}" title="${m.home_team.team_name}">${m.home_team.team_name}</span>
                    <img src="${m.home_team.logo}" class="vne-subpage-team-logo" alt="${m.home_team.team_name}" onerror="this.src='https://is.vnecdn.net/objects/teams/42.png?v=1'">
                  </div>

                  <div class="vne-subpage-score-box ${isPen ? 'has-pen' : ''}">
                    ${isPen ? `
                      <div class="vne-score-main">
                        <span class="vne-score-num">${hGoals}</span>
                        <span class="vne-score-dash">–</span>
                        <span class="vne-score-num">${aGoals}</span>
                      </div>
                      <div class="vne-penalty-sub">Pen ${penH}–${penA}</div>
                    ` : `
                      <span class="vne-score-num">${hGoals}</span>
                      <span class="vne-score-dash" style="opacity:0.4;">–</span>
                      <span class="vne-score-num">${aGoals}</span>
                    `}
                  </div>

                  <div class="vne-subpage-team-box away">
                    <img src="${m.away_team.logo}" class="vne-subpage-team-logo" alt="${m.away_team.team_name}" onerror="this.src='https://is.vnecdn.net/objects/teams/42.png?v=1'">
                    <span class="vne-subpage-team-name ${awayWon ? 'winner' : ''}" title="${m.away_team.team_name}">${m.away_team.team_name}</span>
                  </div>
                </div>

                <div class="vne-subpage-action-col">
                  <button class="vne-btn-subpage-action" onclick="goToMatchDetail(${m.fixture_id}, '${escapeHtml(m.home_team.team_name)}', '${escapeHtml(m.away_team.team_name)}', event)">
                    <i data-lucide="play-circle" style="width:13px; height:13px; color:#9f224e;"></i>
                    <span>Chi tiết</span>
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  container.innerHTML = html;
  if (window.lucide) lucide.createIcons();
}

// =========================================================================
// SUB-PAGE 4: BẢNG XẾP HẠNG CHI TIẾT (FULL STATS & PHONG ĐỘ 5 TRẬN)
// =========================================================================
function renderFullStandingsPage(standings) {
  const tbody = document.getElementById('full-standings-tbody');
  if (!tbody) return;

  if (!standings || standings.length === 0) {
    tbody.innerHTML = '<tr><td colspan="11" style="text-align:center; padding:24px; color:#888;">Chưa có dữ liệu bảng xếp hạng.</td></tr>';
    return;
  }

  tbody.innerHTML = standings.map((t, idx) => {
    const rank = t.rank || idx + 1;
    const calc = t.calculated || {};
    const played = calc.played ?? (t.all?.matchs_played ?? 0);
    const win = calc.win ?? (t.all?.win ?? 0);
    const draw = calc.draw ?? 0;
    const lose = calc.lose ?? 0;
    const gf = calc.goalsFor ?? (t.all?.goals_for ?? 0);
    const ga = calc.goalsAgainst ?? (t.all?.goals_against ?? 0);
    const gd = calc.goalDiff ?? (t.goals_diff ?? 0);
    const pts = calc.points ?? (t.points ?? 0);
    const formeStr = calc.forme || t.forme || '';

    // Zone highlight: Top 4 (blue), Top 5-6 (orange), Relegation (red)
    let rankClass = '';
    if (rank <= 4) rankClass = 'zone-c1';
    else if (rank <= 6) rankClass = 'zone-el';
    else if (rank > standings.length - 3) rankClass = 'zone-rel';

    // Form badges (W = Win / Thắng 🟢, D = Draw / Hoà 🟡, L = Loss / Thua 🔴)
    const formeHtml = formeStr.split('').slice(-5).map(f => {
      if (f === 'W') return '<span class="forme-badge forme-w" title="Thắng">T</span>';
      if (f === 'D') return '<span class="forme-badge forme-d" title="Hoà">H</span>';
      if (f === 'L') return '<span class="forme-badge forme-l" title="Bại">B</span>';
      return '';
    }).join('');

    return `
      <tr>
        <td>
          <span class="rank-box ${rankClass}">${rank}</span>
        </td>
        <td class="td-left">
          <div class="vne-full-team-cell">
            <img src="${t.logo || t.team_logo}" class="vne-full-team-logo" alt="${t.team_name}" onerror="this.src='https://is.vnecdn.net/objects/teams/42.png?v=1'">
            <span class="vne-full-team-name" title="${t.team_name}">${t.team_name}</span>
          </div>
        </td>
        <td>${played}</td>
        <td>${win}</td>
        <td>${draw}</td>
        <td>${lose}</td>
        <td>${gf}</td>
        <td>${ga}</td>
        <td style="font-weight:600; color:${gd > 0 ? '#16a34a' : gd < 0 ? '#dc2626' : '#64748b'};">${gd > 0 ? `+${gd}` : gd}</td>
        <td><span class="vne-pts-badge">${pts}</span></td>
        <td><div class="forme-list">${formeHtml || '<span style="color:#aaa; font-size:11px;">-</span>'}</div></td>
      </tr>
    `;
  }).join('');
}

function renderFullTopScorersPage(scorers) {
  const tbody = document.getElementById('full-topscorers-tbody');
  if (!tbody) return;

  if (!scorers || scorers.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:24px; color:#888;">Đang cập nhật danh sách ghi bàn.</td></tr>';
    return;
  }

  tbody.innerHTML = scorers.map((s, idx) => {
    const rank = idx + 1;
    const goals = s.goals?.total ?? 0;
    const assists = s.goals?.assists ?? 0;
    const apps = s.games?.appearences ?? 0;
    const nationality = s.nationality || '-';
    const position = s.position || '-';

    return `
      <tr>
        <td><span class="rank-box ${rank <= 3 ? 'zone-c1' : ''}">${rank}</span></td>
        <td class="td-left">
          <div style="font-weight:700; color:#0f172a;">${s.player_name}</div>
        </td>
        <td class="td-left">
          <div class="vne-full-team-cell">
            <img src="${s.logo_team}" class="vne-full-team-logo" alt="${s.team_name}" onerror="this.src='https://is.vnecdn.net/objects/teams/42.png?v=1'">
            <span class="vne-full-team-name" style="max-width:140px;">${s.team_name}</span>
          </div>
        </td>
        <td>${nationality}</td>
        <td>${position}</td>
        <td>${apps}</td>
        <td>${assists}</td>
        <td><span style="font-weight:800; font-size:14px; color:#9f224e;">${goals}</span></td>
      </tr>
    `;
  }).join('');
}

// Modals
function openPredictModal(homeName, awayName, time) {
  document.getElementById('predict-match-heading').innerText = `${homeName} vs ${awayName}`;
  document.getElementById('predict-match-time').innerText = `Thời gian thi đấu: ${time}`;
  document.getElementById('predict-home-name').innerText = homeName;
  document.getElementById('predict-away-name').innerText = awayName;

  const modal = document.getElementById('modal-predict');
  modal.classList.add('active');
  state.activeModal = 'modal-predict';
}

function submitPrediction() {
  const hScore = document.getElementById('predict-home-score').value;
  const aScore = document.getElementById('predict-away-score').value;
  alert(`Cảm ơn bạn! Dự đoán tỷ số ${hScore} - ${aScore} của bạn đã được ghi nhận vào hệ thống VnExpress!`);
  closeModal('modal-predict');
}

function openHighlightModal(fixtureId, homeTeam, awayTeam, score, leagueName, eventDate) {
  const modal = document.getElementById('modal-highlight');
  document.getElementById('modal-highlight-title').innerText = `VIDEO HIGHLIGHT: ${homeTeam.toUpperCase()} VS ${awayTeam.toUpperCase()}`;
  document.getElementById('highlight-match-banner').innerText = `${homeTeam} ${score} ${awayTeam}`;
  
  const d = new Date(eventDate);
  const timeStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  
  document.getElementById('highlight-meta-info').innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--vne-border); padding-bottom: 10px; margin-bottom: 10px;">
      <div>
        <span style="font-weight: 700; color: var(--vne-dark-header); font-size: 13px;">${leagueName}</span>
        <span style="color: var(--vne-text-muted); font-size: 12px; margin-left: 8px;">${timeStr}</span>
      </div>
      <span style="background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700;">Full HD 1080p</span>
    </div>
    <div style="font-size: 13px; color: var(--vne-text-secondary); line-height: 1.5;">
      Xem lại các diễn biến đỉnh cao, bàn thắng đẹp mắt và tình huống then chốt trận cầu rực lửa giữa <b>${homeTeam}</b> và <b>${awayTeam}</b>.
    </div>
  `;

  modal.classList.add('active');
  state.activeModal = 'modal-highlight';
  if (window.lucide) lucide.createIcons();
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('active');
  state.activeModal = null;
}

function closeModalOnBackdrop(evt, modalId) {
  if (evt.target.id === modalId) {
    closeModal(modalId);
  }
}

// Formatters according to VnExpress Design System (VDS)
function formatWidgetMatchDate(dateStr) {
  if (!dateStr) return '';
  const days = ['CN', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
  const d = new Date(dateStr);
  const dayName = days[d.getDay()];
  const dd = d.getDate();
  const mm = d.getMonth() + 1;
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dayName}, ${dd}/${mm}, ${hh}:${min}`;
}

function formatPredictionDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const dd = d.getDate();
  const mm = d.getMonth() + 1;
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${min}, ${dd}/${mm}/${yyyy}`;
}

function formatSubpageKickoff(dateStr) {
  if (!dateStr) return { date: '', time: '' };
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { date: dateStr, time: '' };

  const days = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
  const dayName = days[d.getDay()];
  const dd = d.getDate();
  const mm = d.getMonth() + 1;
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');

  return {
    date: `${dayName}, ${dd}/${mm}/${yyyy}`,
    time: `${hh}:${min}`
  };
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
