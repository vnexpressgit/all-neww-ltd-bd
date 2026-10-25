/**
 * Match Detail Page Controller - VnExpress Thể Thao
 * Supports independent sub-URLs for all 4 tabs:
 *  - /tran-dau/:slug (or /tran-dau/:slug/dien-bien) -> Diễn biến
 *  - /tran-dau/:slug/thong-ke -> Thống kê
 *  - /tran-dau/:slug/doi-hinh-ra-san -> Đội hình ra sân
 *  - /tran-dau/:slug/ket-qua-gan-day -> Kết quả gần đây
 */

const mdState = {
  matchSlug: 'psg-vs-barca-1001',
  fixtureId: null,
  activeTab: 'dien-bien', // 'dien-bien' | 'thong-ke' | 'doi-hinh-ra-san' | 'ket-qua-gan-day'
  data: null,
  showAllLeagues: false,
  showAllTeams: false,
  sidebarSearch: ''
};

// VnExpress Design System Football Event Icons
const SOCCER_BALL_SVG = `<img src="/vds/icons/Icon__Football__Goal.svg" alt="Bàn thắng" width="16" height="16" class="vne-md-ball-svg" style="vertical-align: middle; display: inline-block;">`;
const YELLOW_CARD_SVG = `<img src="/vds/icons/Icon__Football__CardYellow.svg" alt="Thẻ vàng" width="13" height="16" style="vertical-align: middle; display: inline-block;">`;
const RED_CARD_SVG = `<img src="/vds/icons/Icon__Football__CardRed.svg" alt="Thẻ đỏ" width="13" height="16" style="vertical-align: middle; display: inline-block;">`;
const SUB_SVG = `<img src="/vds/icons/Icon__Football__Substitution.svg" alt="Thay người" width="16" height="16" style="vertical-align: middle; display: inline-block;">`;

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

function parseMatchUrlRoute() {
  const path = window.location.pathname; // e.g. /tran-dau/psg-vs-barca-1001/thong-ke
  const parts = path.split('/').filter(Boolean);

  if (parts[0] === 'tran-dau' && parts[1]) {
    mdState.matchSlug = parts[1];
    const idMatch = parts[1].match(/-(\d+)$/);
    if (idMatch) mdState.fixtureId = parseInt(idMatch[1]);

    const rawTab = parts[2] || 'dien-bien';
    if (rawTab === 'thong-ke') {
      mdState.activeTab = 'thong-ke';
    } else if (rawTab === 'doi-hinh-ra-san' || rawTab === 'doi-hinh') {
      mdState.activeTab = 'doi-hinh-ra-san';
    } else if (rawTab === 'ket-qua-gan-day' || rawTab === 'phong-do') {
      mdState.activeTab = 'ket-qua-gan-day';
    } else {
      mdState.activeTab = 'dien-bien';
    }
  } else {
    const params = new URLSearchParams(window.location.search);
    if (params.get('slug')) mdState.matchSlug = params.get('slug');
    if (params.get('id')) mdState.fixtureId = parseInt(params.get('id'));
    if (params.get('tab')) mdState.activeTab = params.get('tab');
  }
}

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

async function initMatchDetailApp() {
  if (window.lucide) lucide.createIcons();
  parseMatchUrlRoute();
  initHeaderClock();
  await loadMatchDetailData();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMatchDetailApp);
} else {
  initMatchDetailApp();
}

async function loadMatchDetailData() {
  try {
    const qs = new URLSearchParams();
    if (mdState.matchSlug) qs.set('slug', mdState.matchSlug);
    if (mdState.fixtureId) qs.set('fixture_id', mdState.fixtureId);

    const res = await fetch(`/api/match-detail?${qs.toString()}`);
    const data = await res.json();
    mdState.data = data;

    if (data.match?.slug) {
      mdState.matchSlug = data.match.slug;
    }

    renderLeftSidebar();
    renderLeagueHeader(data.league, data.match);
    renderMatchHeader(data.match);
    updateTabLinks();
    renderTimelineTab(data.match, data.events);
    renderStatsTab(data.match, data.stats, data.standings, data.standingsGroupTitle);
    renderLineupsTab(data.match, data.lineups);
    renderRecentFormTab(data.recentForm);
    renderRightSidebarStandings(data.league, data.standings, data.match);

    // Activate initial tab without pushing duplicate history state
    switchMatchTab(mdState.activeTab, null, false);

    if (window.lucide) lucide.createIcons();
  } catch (err) {
    console.error('Error loading match detail data:', err);
  }
}

function updateTabLinks() {
  const base = `/tran-dau/${mdState.matchSlug}`;
  const btnDienBien = document.getElementById('md-tab-btn-dien-bien');
  const btnThongKe = document.getElementById('md-tab-btn-thong-ke');
  const btnDoiHinh = document.getElementById('md-tab-btn-doi-hinh-ra-san');
  const btnKetQua = document.getElementById('md-tab-btn-ket-qua-gan-day');

  if (btnDienBien) btnDienBien.href = `${base}/dien-bien`;
  if (btnThongKe) btnThongKe.href = `${base}/thong-ke`;
  if (btnDoiHinh) btnDoiHinh.href = `${base}/doi-hinh-ra-san`;
  if (btnKetQua) btnKetQua.href = `${base}/ket-qua-gan-day`;
}

function switchMatchTab(tab, evt = null, pushUrl = true) {
  if (evt) evt.preventDefault();
  mdState.activeTab = tab;

  const tabs = ['dien-bien', 'thong-ke', 'doi-hinh-ra-san', 'ket-qua-gan-day'];
  tabs.forEach(t => {
    const btn = document.getElementById(`md-tab-btn-${t}`);
    const pane = document.getElementById(`md-pane-${t}`);
    const isActive = t === tab;
    if (btn) {
      btn.classList.toggle('active', isActive);
      if (isActive && typeof btn.scrollIntoView === 'function') {
        // Smoothly scroll active tab into view in mobile horizontal tab strip
        btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
    if (pane) pane.classList.toggle('active', isActive);
  });

  // Update page title
  const m = mdState.data?.match;
  const matchTitle = m ? `${m.home_team.team_name} ${m.homeScore} - ${m.awayScore} ${m.away_team.team_name}` : 'Chi tiết trận đấu';
  const tabLabels = {
    'dien-bien': 'Diễn biến',
    'thong-ke': 'Thống kê',
    'doi-hinh-ra-san': 'Đội hình ra sân',
    'ket-qua-gan-day': 'Kết quả gần đây'
  };
  document.title = `${matchTitle} | ${tabLabels[tab] || 'Chi tiết'} - VnExpress Thể Thao`;

  // Push independent sub-URL via HTML5 History API
  if (pushUrl && mdState.matchSlug) {
    const targetUrl = `/tran-dau/${mdState.matchSlug}/${tab}`;
    if (window.location.pathname !== targetUrl) {
      window.history.pushState({ tab, matchSlug: mdState.matchSlug }, '', targetUrl);
    }
  }
}

window.addEventListener('popstate', () => {
  parseMatchUrlRoute();
  switchMatchTab(mdState.activeTab, null, false);
});

// =========================================================================
// 1. LEFT SIDEBAR (MENU CÁC GIẢI & ĐỘI BÓNG)
// =========================================================================
function renderLeftSidebar() {
  const leagues = mdState.data?.allLeagues || [];
  const hotTeams = mdState.data?.hotTeams || [];
  const currentLeagueId = mdState.data?.league?.id;
  const search = mdState.sidebarSearch.toLowerCase().trim();

  // Filter by search
  const filteredLeagues = search
    ? leagues.filter(l => l.vnName.toLowerCase().includes(search) || l.name.toLowerCase().includes(search) || l.country.toLowerCase().includes(search))
    : leagues;

  const visibleLeagues = mdState.showAllLeagues || search ? filteredLeagues : filteredLeagues.slice(0, 10);

  const leagueListEl = document.getElementById('league-filter-list');
  const leagueBadgeEl = document.getElementById('league-count-badge');
  const moreLeaguesBtn = document.getElementById('btn-toggle-more-leagues');
  const moreLeaguesTxt = document.getElementById('txt-more-leagues');

  if (leagueBadgeEl) leagueBadgeEl.innerText = `${visibleLeagues.length}/${filteredLeagues.length}`;

  if (leagueListEl) {
    leagueListEl.innerHTML = visibleLeagues.map(l => {
      const isActive = l.id === currentLeagueId;
      return `
        <li>
          <button class="vne-filter-item-btn ${isActive ? 'active' : ''}" onclick="window.location.href='/giai-dau/${l.slug}'">
            <img src="${l.logo}" class="vne-filter-icon" alt="${l.vnName}" onerror="this.src='https://is.vnecdn.net/objects/leagues/39.png?v=1'">
            <div class="vne-filter-name-col">
              <span class="vne-filter-name" title="${l.vnName}">${l.vnName}</span>
              <span class="vne-filter-sub">${l.country}</span>
            </div>
          </button>
        </li>
      `;
    }).join('');
  }

  if (moreLeaguesBtn && moreLeaguesTxt) {
    if (search || filteredLeagues.length <= 10) {
      moreLeaguesBtn.style.display = 'none';
    } else {
      moreLeaguesBtn.style.display = 'flex';
      moreLeaguesTxt.innerText = mdState.showAllLeagues
        ? '∧ Thu gọn'
        : `∨ Xem thêm (${filteredLeagues.length - 10} giải khác)`;
    }
  }

  // Teams
  const filteredTeams = search
    ? hotTeams.filter(t => t.name.toLowerCase().includes(search) || t.country.toLowerCase().includes(search))
    : hotTeams;

  const visibleTeams = mdState.showAllTeams || search ? filteredTeams : filteredTeams.slice(0, 6);
  const teamListEl = document.getElementById('team-filter-list');
  const teamBadgeEl = document.getElementById('team-count-badge');
  const moreTeamsBtn = document.getElementById('btn-toggle-more-teams');
  const moreTeamsTxt = document.getElementById('txt-more-teams');

  if (teamBadgeEl) teamBadgeEl.innerText = `${visibleTeams.length}/${filteredTeams.length}`;

  const homeId = mdState.data?.match?.home_team?.team_id;
  const awayId = mdState.data?.match?.away_team?.team_id;

  if (teamListEl) {
    teamListEl.innerHTML = visibleTeams.map(t => {
      const isActive = t.id === homeId || t.id === awayId;
      return `
        <li>
          <button class="vne-filter-item-btn ${isActive ? 'active' : ''}" onclick="window.location.href='/lich-thi-dau?team_id=${t.id}'">
            <img src="${t.logo}" class="vne-filter-icon" alt="${t.name}" onerror="this.src='https://is.vnecdn.net/objects/teams/42.png?v=1'">
            <div class="vne-filter-name-col">
              <span class="vne-filter-name" title="${t.name}">${t.name}</span>
              <span class="vne-filter-sub">${t.country}</span>
            </div>
          </button>
        </li>
      `;
    }).join('');
  }

  if (moreTeamsBtn && moreTeamsTxt) {
    if (search || filteredTeams.length <= 6) {
      moreTeamsBtn.style.display = 'none';
    } else {
      moreTeamsBtn.style.display = 'flex';
      moreTeamsTxt.innerText = mdState.showAllTeams
        ? '∧ Thu gọn'
        : `∨ Xem thêm (${filteredTeams.length - 6} đội khác)`;
    }
  }
}

function toggleMoreLeagues() {
  mdState.showAllLeagues = !mdState.showAllLeagues;
  renderLeftSidebar();
}

function toggleMoreTeams() {
  mdState.showAllTeams = !mdState.showAllTeams;
  renderLeftSidebar();
}

function onSidebarSearch(val) {
  mdState.sidebarSearch = val || '';
  renderLeftSidebar();
}

// =========================================================================
// 1.5. LEAGUE HEADER BAR (Image 1 top & Breadcrumbs)
// =========================================================================
function renderLeagueHeader(league, match) {
  const l = league || mdState.data?.league || {
    id: 2,
    slug: 'champions-league',
    name: 'UEFA Champions League',
    vnName: 'Champions League',
    logo: 'https://is.vnecdn.net/objects/leagues/2.png?v=1'
  };

  const m = match || mdState.data?.match;
  const leagueSlug = l.slug || 'champions-league';
  const leagueName = l.vnName || l.name || 'Champions League';
  const leagueFullName = l.name || l.vnName || 'UEFA Champions League';
  const leagueHref = `/giai-dau/${leagueSlug}`;

  // 1. League Bar above match date/time
  const linkEl = document.getElementById('md-league-title-link');
  const logoEl = document.getElementById('md-league-title-logo');
  const nameEl = document.getElementById('md-league-title-name');

  if (linkEl) {
    linkEl.href = leagueHref;
    linkEl.setAttribute('title', `Xem chi tiết giải đấu ${leagueFullName}`);
  }
  if (logoEl) {
    logoEl.src = l.logo || 'https://is.vnecdn.net/objects/leagues/2.png?v=1';
    logoEl.alt = leagueFullName;
  }
  if (nameEl) {
    nameEl.innerText = leagueFullName;
  }

  // 2. Breadcrumbs:
  // - 'Kết quả' (nếu đang ở trận đấu đã kết thúc) / [Tên giải của trận đấu]
  // - 'Lịch thi đấu' (Nếu đang ở trong trận đấu đang Live hoặc Chưa diễn ra) / [Tên giải của trận đấu]
  // User có thể click ngược về tên giải để đi về trang Chi tiết giải đấu
  const isFinished = m ? (m.isFinished === true || m.statusBadge === 'Kết thúc' || m.status_short === 'FT') : true;

  const parentBreadcrumbEl = document.getElementById('breadcrumb-parent-link');
  if (parentBreadcrumbEl) {
    if (isFinished) {
      parentBreadcrumbEl.href = '/ket-qua';
      parentBreadcrumbEl.innerText = 'Kết quả';
      parentBreadcrumbEl.setAttribute('title', 'Về trang Kết quả bóng đá');
    } else {
      parentBreadcrumbEl.href = '/lich-thi-dau';
      parentBreadcrumbEl.innerText = 'Lịch thi đấu';
      parentBreadcrumbEl.setAttribute('title', 'Về trang Lịch thi đấu bóng đá');
    }
  }

  const leagueBreadcrumbEl = document.getElementById('breadcrumb-league-link');
  if (leagueBreadcrumbEl) {
    leagueBreadcrumbEl.href = leagueHref;
    leagueBreadcrumbEl.innerText = leagueName;
    leagueBreadcrumbEl.setAttribute('title', `Xem chi tiết giải đấu ${leagueName}`);
  }
}

// =========================================================================
// 2. MATCH HEADER BANNER (Image 1)
// =========================================================================
function renderMatchHeader(match) {
  if (!match) return;

  const topbar = document.getElementById('md-header-date-bar');
  if (topbar) topbar.innerText = match.headerDateText || 'Thứ tư 21/10/2026, 02:00 - Lượt 3';

  const wmHome = document.getElementById('md-watermark-home');
  const wmAway = document.getElementById('md-watermark-away');
  if (wmHome) wmHome.src = match.home_team.logo;
  if (wmAway) wmAway.src = match.away_team.logo;

  const statusPill = document.getElementById('md-status-pill');
  if (statusPill) {
    statusPill.innerText = match.statusBadge || 'Kết thúc';
    statusPill.classList.toggle('live', !!match.isLive);
  }

  const homeName = document.getElementById('md-home-name');
  const homeLogo = document.getElementById('md-home-logo');
  const awayName = document.getElementById('md-away-name');
  const awayLogo = document.getElementById('md-away-logo');
  if (homeName) homeName.innerText = match.home_team.team_name;
  if (homeLogo) homeLogo.src = match.home_team.logo;
  if (awayName) awayName.innerText = match.away_team.team_name;
  if (awayLogo) awayLogo.src = match.away_team.logo;

  const homeScore = document.getElementById('md-home-score');
  const awayScore = document.getElementById('md-away-score');
  if (homeScore) homeScore.innerText = match.homeScore ?? 0;
  if (awayScore) awayScore.innerText = match.awayScore ?? 0;

  const htText = document.getElementById('md-halftime-text');
  if (htText) htText.innerText = match.halftimeText || 'Hiệp một: 0 - 0';

  const homeScorersEl = document.getElementById('md-home-scorers');
  const awayScorersEl = document.getElementById('md-away-scorers');

  if (homeScorersEl) {
    homeScorersEl.innerHTML = (match.homeScorers || []).map(s => `
      <div class="vne-md-scorer-item home">
        <span>${s.player} (${s.minute})</span>
        ${SOCCER_BALL_SVG}
      </div>
    `).join('');
  }

  if (awayScorersEl) {
    awayScorersEl.innerHTML = (match.awayScorers || []).map(s => `
      <div class="vne-md-scorer-item away">
        ${SOCCER_BALL_SVG}
        <span>${s.player} (${s.minute})</span>
      </div>
    `).join('');
  }
}

// =========================================================================
// 3. TAB 1: DIỄN BIẾN (Image 2)
// =========================================================================
function renderTimelineTab(match, events) {
  if (!match) return;

  const tlHomeName = document.getElementById('tl-home-name');
  const tlHomeLogo = document.getElementById('tl-home-logo');
  const tlAwayName = document.getElementById('tl-away-name');
  const tlAwayLogo = document.getElementById('tl-away-logo');

  if (tlHomeName) tlHomeName.innerText = match.home_team.team_name;
  if (tlHomeLogo) tlHomeLogo.src = match.home_team.logo;
  if (tlAwayName) tlAwayName.innerText = match.away_team.team_name;
  if (tlAwayLogo) tlAwayLogo.src = match.away_team.logo;

  const container = document.getElementById('md-timeline-container');
  if (!container) return;

  const list = events || [];
  container.innerHTML = list.map((ev, idx) => {
    const isFirst = idx === 0;
    const isLast = idx === list.length - 1;
    const isHome = ev.side === 'home';

    const renderEventDetail = (e, side) => {
      if (e.type === 'goal') {
        return side === 'home'
          ? `<div class="vne-tl-event-line"><span>${e.player}</span> ${SOCCER_BALL_SVG}</div>`
          : `<div class="vne-tl-event-line">${SOCCER_BALL_SVG} <span>${e.player}</span></div>`;
      }
      if (e.type === 'yellow_card') {
        return side === 'home'
          ? `<div class="vne-tl-event-line"><span>${e.player}</span> ${YELLOW_CARD_SVG}</div>`
          : `<div class="vne-tl-event-line">${YELLOW_CARD_SVG} <span>${e.player}</span></div>`;
      }
      if (e.type === 'red_card') {
        return side === 'home'
          ? `<div class="vne-tl-event-line"><span>${e.player}</span> ${RED_CARD_SVG}</div>`
          : `<div class="vne-tl-event-line">${RED_CARD_SVG} <span>${e.player}</span></div>`;
      }
      if (e.type === 'sub') {
        if (side === 'home') {
          return `
            <div class="vne-tl-sub-block home">
              <div class="vne-tl-sub-in"><span>${e.playerIn}</span> ${SUB_SVG}</div>
              <div class="vne-tl-sub-out"><span>${e.playerOut}</span></div>
            </div>
          `;
        } else {
          return `
            <div class="vne-tl-sub-block away">
              <div class="vne-tl-sub-in">${SUB_SVG} <span>${e.playerIn}</span></div>
              <div class="vne-tl-sub-out"><span>${e.playerOut}</span></div>
            </div>
          `;
        }
      }
      return '';
    };

    return `
      <div class="vne-md-tl-row">
        <div class="vne-md-tl-side home">
          ${isHome ? renderEventDetail(ev, 'home') : ''}
        </div>
        <div class="vne-md-tl-minute ${isFirst ? 'first' : ''} ${isLast ? 'last' : ''}">
          ${ev.minute}
        </div>
        <div class="vne-md-tl-side away">
          ${!isHome ? renderEventDetail(ev, 'away') : ''}
        </div>
      </div>
    `;
  }).join('');
}

// =========================================================================
// 4. TAB 2: THỐNG KÊ (Image 3)
// =========================================================================
function renderStatsTab(match, stats, standings, groupTitle) {
  if (!match) return;

  const stHomeLogo = document.getElementById('st-home-logo');
  const stHomeName = document.getElementById('st-home-name');
  const stAwayLogo = document.getElementById('st-away-logo');
  const stAwayName = document.getElementById('st-away-name');

  if (stHomeLogo) stHomeLogo.src = match.home_team.logo;
  if (stHomeName) stHomeName.innerText = match.home_team.team_name;
  if (stAwayLogo) stAwayLogo.src = match.away_team.logo;
  if (stAwayName) stAwayName.innerText = match.away_team.team_name;

  const statsContainer = document.getElementById('md-stats-rows-container');
  if (statsContainer) {
    statsContainer.innerHTML = (stats || []).map(row => {
      // Calculate dual-color comparative percentage for mobile visual bar
      const hNum = parseFloat(String(row.home).replace('%', '')) || 0;
      const aNum = parseFloat(String(row.away).replace('%', '')) || 0;
      const total = hNum + aNum;
      const homePct = total > 0 ? Math.round((hNum / total) * 100) : 50;
      const awayPct = 100 - homePct;

      return `
        <div class="vne-md-stat-row">
          <div class="vne-md-stat-val">${row.home}</div>
          <div class="vne-md-stat-label-wrap">
            <span class="vne-md-stat-label">${row.label}</span>
            <div class="vne-md-stat-bar-track">
              <div class="vne-md-stat-bar-fill home" style="width: ${homePct}%;"></div>
              <div class="vne-md-stat-bar-fill away" style="width: ${awayPct}%;"></div>
            </div>
          </div>
          <div class="vne-md-stat-val">${row.away}</div>
        </div>
      `;
    }).join('');
  }

  // Inline Standings Table inside Thống kê tab (Image 3)
  const titleEl = document.getElementById('md-inline-table-title');
  if (titleEl) titleEl.innerText = groupTitle || 'Bảng e';

  const tbody = document.getElementById('md-inline-standings-tbody');
  if (!tbody) return;

  const rows = standings || [];
  tbody.innerHTML = rows.map((s, idx) => {
    const rank = s.rank || idx + 1;
    const rankBgClass = rank <= 8 ? 'rank-blue-main' : 'rank-blue-sub';
    const isHighlighted = s.isHome || s.isAway;

    // Form badges: W -> T (green), D -> H (grey), L -> B (red)
    const formeChars = String(s.forme || 'WWW').split('').slice(-5);
    const formeHtml = formeChars.map(ch => {
      if (ch === 'W' || ch === 'T') return '<span class="vne-md-form-badge win">T</span>';
      if (ch === 'D' || ch === 'H') return '<span class="vne-md-form-badge draw">H</span>';
      return '<span class="vne-md-form-badge loss">B</span>';
    }).join('');

    return `
      <tr class="${isHighlighted ? 'vne-md-inline-row-highlight' : ''}">
        <td class="td-rank-colored ${rankBgClass}">${rank}</td>
        <td class="td-team-cell">
          <div class="vne-md-inline-team">
            <img src="${s.logo}" alt="${s.team_name}" onerror="this.src='https://is.vnecdn.net/objects/teams/42.png?v=1'">
            <span class="${isHighlighted ? 'fw-bold' : ''}">${s.team_name}</span>
          </div>
        </td>
        <td>${s.played}</td>
        <td>${s.win}</td>
        <td>${s.draw}</td>
        <td>${s.lose}</td>
        <td>${s.gf}</td>
        <td>${s.ga}</td>
        <td>${s.gd}</td>
        <td class="td-pts-bold">${s.points}</td>
        <td>
          <div class="vne-md-form-group">${formeHtml}</div>
        </td>
      </tr>
    `;
  }).join('');
}

// =========================================================================
// 5. TAB 3: ĐỘI HÌNH RA SÂN (Image 4)
// =========================================================================
function renderLineupsTab(match, lineups) {
  if (!match || !lineups) return;

  const home = lineups.home;
  const away = lineups.away;

  // Set team names & logos
  document.getElementById('lu-home-logo').src = match.home_team.logo;
  document.getElementById('lu-home-name').innerText = match.home_team.team_name;
  document.getElementById('lu-away-logo').src = match.away_team.logo;
  document.getElementById('lu-away-name').innerText = match.away_team.team_name;

  // Set Mobile Roster Switcher tabs
  const rHomeLogo = document.getElementById('roster-tab-home-logo');
  const rHomeName = document.getElementById('roster-tab-home-name');
  const rAwayLogo = document.getElementById('roster-tab-away-logo');
  const rAwayName = document.getElementById('roster-tab-away-name');
  if (rHomeLogo) rHomeLogo.src = match.home_team.logo;
  if (rHomeName) rHomeName.innerText = match.home_team.team_name;
  if (rAwayLogo) rAwayLogo.src = match.away_team.logo;
  if (rAwayName) rAwayName.innerText = match.away_team.team_name;

  // Ensure default home roster is active on mobile
  switchMobileRoster('home');

  document.getElementById('pitch-home-logo').src = match.home_team.logo;
  document.getElementById('pitch-home-name').innerText = match.home_team.team_name;
  document.getElementById('pitch-home-formation').innerText = home.formation || '4-3-3';

  document.getElementById('pitch-away-logo').src = match.away_team.logo;
  document.getElementById('pitch-away-name').innerText = match.away_team.team_name;
  document.getElementById('pitch-away-formation').innerText = away.formation || '4-2-3-1';

  // Left Column: Home Starters & Subs ([number] [name] ... [pos])
  const homeStartersEl = document.getElementById('lu-home-starters');
  if (homeStartersEl) {
    homeStartersEl.innerHTML = (home.starters || []).map(p => `
      <div class="vne-md-roster-row home">
        <div class="vne-md-roster-left">
          <span class="vne-md-shirt-num">${p.number}</span>
          <span class="vne-md-player-name">${p.name}</span>
        </div>
        <span class="vne-md-player-pos">${p.pos}</span>
      </div>
    `).join('');
  }

  const homeSubsEl = document.getElementById('lu-home-subs');
  if (homeSubsEl) {
    homeSubsEl.innerHTML = (home.subs || []).map(p => `
      <div class="vne-md-roster-row home">
        <div class="vne-md-roster-left">
          <span class="vne-md-shirt-num">${p.number}</span>
          <span class="vne-md-player-name">${p.name}</span>
        </div>
        <span class="vne-md-player-pos">${p.pos}</span>
      </div>
    `).join('');
  }

  // Right Column: Away Starters & Subs (Mirrored: [pos] ... [name] [number])
  const awayStartersEl = document.getElementById('lu-away-starters');
  if (awayStartersEl) {
    awayStartersEl.innerHTML = (away.starters || []).map(p => `
      <div class="vne-md-roster-row away">
        <span class="vne-md-player-pos">${p.pos}</span>
        <div class="vne-md-roster-right">
          <span class="vne-md-player-name">${p.name}</span>
          <span class="vne-md-shirt-num">${p.number}</span>
        </div>
      </div>
    `).join('');
  }

  const awaySubsEl = document.getElementById('lu-away-subs');
  if (awaySubsEl) {
    awaySubsEl.innerHTML = (away.subs || []).map(p => `
      <div class="vne-md-roster-row away">
        <span class="vne-md-player-pos">${p.pos}</span>
        <div class="vne-md-roster-right">
          <span class="vne-md-player-name">${p.name}</span>
          <span class="vne-md-shirt-num">${p.number}</span>
        </div>
      </div>
    `).join('');
  }

  // Center Column: 2D Pitch Formation Nodes
  // Home Half (Top to Middle: line 0 GK -> line 1 DF -> line 2 MF -> line 3 FW)
  const homeLines = {};
  (home.starters || []).forEach(p => {
    const l = p.line ?? 1;
    if (!homeLines[l]) homeLines[l] = [];
    homeLines[l].push(p);
  });

  const homeHalfEl = document.getElementById('pitch-home-nodes');
  if (homeHalfEl) {
    const sortedLineKeys = Object.keys(homeLines).map(Number).sort((a, b) => a - b);
    homeHalfEl.innerHTML = sortedLineKeys.map(k => `
      <div class="pitch-formation-row">
        ${homeLines[k].map(p => `
          <div class="pitch-player-node home">
            <div class="pitch-player-circle home">${p.number}</div>
            <div class="pitch-player-label">${p.name}</div>
          </div>
        `).join('')}
      </div>
    `).join('');
  }

  // Away Half (Middle to Bottom: highest line FW near center -> ... -> line 0 GK at bottom)
  const awayLines = {};
  (away.starters || []).forEach(p => {
    const l = p.line ?? 1;
    if (!awayLines[l]) awayLines[l] = [];
    awayLines[l].push(p);
  });

  const awayHalfEl = document.getElementById('pitch-away-nodes');
  if (awayHalfEl) {
    const sortedAwayKeys = Object.keys(awayLines).map(Number).sort((a, b) => b - a);
    awayHalfEl.innerHTML = sortedAwayKeys.map(k => {
      // Reverse row order for away so left/right flanks mirror properly (e.g. Cancelo #2 on left, Espart #12 on right as in Image 4)
      const rowPlayers = [...awayLines[k]].reverse();
      return `
        <div class="pitch-formation-row">
          ${rowPlayers.map(p => `
            <div class="pitch-player-node away">
              <div class="pitch-player-circle away">${p.number}</div>
              <div class="pitch-player-label">${p.name}</div>
            </div>
          `).join('')}
        </div>
      `;
    }).join('');
  }
}

// Switch Mobile Lineup Roster View (PSG vs Barca)
function switchMobileRoster(team) {
  const btnHome = document.getElementById('btn-roster-home');
  const btnAway = document.getElementById('btn-roster-away');
  const colHome = document.getElementById('md-lineup-home-col');
  const colAway = document.getElementById('md-lineup-away-col');

  if (btnHome) btnHome.classList.toggle('active', team === 'home');
  if (btnAway) btnAway.classList.toggle('active', team === 'away');
  if (colHome) colHome.classList.toggle('mobile-active', team === 'home');
  if (colAway) colAway.classList.toggle('mobile-active', team === 'away');
}

// =========================================================================
// 6. TAB 4: KẾT QUẢ GẦN ĐÂY (Image 5)
// =========================================================================
function renderRecentFormTab(recentForm) {
  if (!recentForm) return;

  const match = mdState.data?.match;
  if (match) {
    const hLogo = document.getElementById('recent-home-subhead-logo');
    const hName = document.getElementById('recent-home-subhead-name');
    const aLogo = document.getElementById('recent-away-subhead-logo');
    const aName = document.getElementById('recent-away-subhead-name');

    if (hLogo) hLogo.src = match.home_team.logo;
    if (hName) hName.innerText = match.home_team.team_name;
    if (aLogo) aLogo.src = match.away_team.logo;
    if (aName) aName.innerText = match.away_team.team_name;
  }

  const homeCol = document.getElementById('md-recent-home-col');
  const awayCol = document.getElementById('md-recent-away-col');

  const renderCard = (item) => {
    const slug = `${toSeoSlug(item.home_team.team_name)}-vs-${toSeoSlug(item.away_team.team_name)}-${item.fixture_id || 5001}`;
    return `
      <div class="vne-md-recent-card" onclick="window.location.href='/tran-dau/${slug}'">
        <div class="vne-md-recent-team left">
          <img src="${item.home_team.logo}" alt="${item.home_team.team_name}" onerror="this.src='https://is.vnecdn.net/objects/teams/42.png?v=1'">
          <span>${item.home_team.team_name}</span>
        </div>
        <div class="vne-md-recent-score-pill">${item.score}</div>
        <div class="vne-md-recent-team right">
          <span>${item.away_team.team_name}</span>
          <img src="${item.away_team.logo}" alt="${item.away_team.team_name}" onerror="this.src='https://is.vnecdn.net/objects/teams/42.png?v=1'">
        </div>
      </div>
    `;
  };

  if (homeCol) {
    homeCol.innerHTML = (recentForm.home || []).map(renderCard).join('');
  }
  if (awayCol) {
    awayCol.innerHTML = (recentForm.away || []).map(renderCard).join('');
  }
}

// =========================================================================
// 7. RIGHT SIDEBAR: TÓM TẮT BẢNG XẾP HẠNG + HIGHLIGHT 2 ĐỘI
// =========================================================================
function renderRightSidebarStandings(league, standings, match) {
  const container = document.getElementById('match-sidebar-standings-container');
  const badgeEl = document.getElementById('sidebar-league-badge');
  if (!container) return;

  const leagueName = league?.vnName || league?.name || 'Champions League';
  const leagueSlug = league?.slug || 'champions-league';
  if (badgeEl) badgeEl.innerText = leagueName;

  const allRows = standings || [];

  // Ensure the summary list shows top teams AND always includes the 2 highlighted teams
  let displayRows = allRows.slice(0, 10);
  const homeRow = allRows.find(r => r.isHome);
  const awayRow = allRows.find(r => r.isAway);

  if (homeRow && !displayRows.some(r => r.rank === homeRow.rank)) {
    displayRows.push(homeRow);
  }
  if (awayRow && !displayRows.some(r => r.rank === awayRow.rank)) {
    displayRows.push(awayRow);
  }
  displayRows.sort((a, b) => (a.rank || 0) - (b.rank || 0));

  container.innerHTML = `
    <div class="vne-standings-card">
      <div class="vne-standings-header" style="cursor: pointer;" onclick="window.location.href='/giai-dau/${leagueSlug}/bang-xep-hang'">
        <div class="vne-standings-league-title">
          <span style="display:inline-block; width:4px; height:12px; background:var(--vne-red); border-radius:2px;"></span>
          <span>${leagueName}</span>
        </div>
        <span class="vne-standings-season">2026/27</span>
      </div>

      <div class="vne-md-sidebar-highlight-note">
        <span class="vne-md-highlight-dot"></span>
        <span>Vị trí của <strong>${match?.home_team?.team_name || 'Đội nhà'}</strong> & <strong>${match?.away_team?.team_name || 'Đội khách'}</strong></span>
      </div>

      <table class="vne-table-mini">
        <thead>
          <tr>
            <th style="width: 22px;">#</th>
            <th>CLB</th>
            <th style="width: 24px;">Tr</th>
            <th style="width: 28px;">HS</th>
            <th style="width: 28px;">Đ</th>
          </tr>
        </thead>
        <tbody>
          ${displayRows.map(s => {
            const isMatchTeam = s.isHome || s.isAway;
            const gdFormatted = s.gd > 0 ? `+${s.gd}` : s.gd;
            return `
              <tr class="${isMatchTeam ? 'vne-sidebar-row-match-highlight' : ''}">
                <td class="vne-rank-num ${s.rank <= 4 ? 'top-rank' : ''}">${s.rank}</td>
                <td>
                  <div class="vne-standings-clb-col">
                    <img src="${s.logo}" class="vne-standings-logo" alt="${s.team_name}" onerror="this.src='https://is.vnecdn.net/objects/teams/42.png?v=1'">
                    <span class="vne-standings-name ${isMatchTeam ? 'match-team-bold' : ''}" title="${s.team_name}">${s.team_name}</span>
                  </div>
                </td>
                <td>${s.played}</td>
                <td>${gdFormatted}</td>
                <td class="vne-standings-pts">${s.points}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>

      <div class="vne-standings-footer">
        <a class="vne-standings-more-link" href="/giai-dau/${leagueSlug}/bang-xep-hang">
          <span>Xem chi tiết</span> &gt;
        </a>
      </div>
    </div>
  `;
}
