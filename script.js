(function () {
  'use strict';

  var STORAGE_THEME = 'dashboard-theme';
  var STORAGE_ORDER = 'dashboard-category-order';
  var STORAGE_LINKS = 'dashboard-links';
  var STORAGE_NEWS_COLLAPSED = 'dashboard-news-collapsed';
  var STORAGE_NOTES = 'dashboard-notes';
  var STORAGE_NOTES_COLLAPSED = 'dashboard-notes-collapsed';
  var STORAGE_WEATHER_LOCATION = 'dashboard-weather-location';

  var DEFAULT_ICON = '<svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/></svg>';

  function $(id) { return document.getElementById(id); }
  function qs(sel, el) { return (el || document).querySelector(sel); }
  function qsAll(sel, el) { return (el || document).querySelectorAll(sel); }

  // ---------- Page load animation ----------
  setTimeout(function () {
    document.body.classList.add('page-loaded');
  }, 80);

  // ---------- Time of day background ----------
  function setTimeOfDayBackground() {
    var h = new Date().getHours();
    document.body.classList.remove('bg-morning', 'bg-afternoon', 'bg-evening');
    if (h >= 5 && h < 12) document.body.classList.add('bg-morning');
    else if (h >= 12 && h < 18) document.body.classList.add('bg-afternoon');
    else document.body.classList.add('bg-evening');
  }
  setTimeOfDayBackground();
  setInterval(setTimeOfDayBackground, 60000);

  // ---------- כותרת דינמית: בוקר/צהריים/ערב/לילה טוב ----------
  function setGreeting() {
    var el = $('header-greeting');
    if (!el) return;
    var h = new Date().getHours();
    var msg = (h >= 5 && h < 12) ? 'בוקר טוב' : (h >= 12 && h < 17) ? 'צהריים טובים' : (h >= 17 && h < 22) ? 'ערב טוב' : 'לילה טוב';
    el.textContent = msg + ' שחף';
  }
  setGreeting();
  setInterval(setGreeting, 60000);

  // ---------- Date & time ----------
  function updateDateTime() {
    var d = new Date();
    if ($('current-time')) $('current-time').textContent = d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    if ($('current-date')) $('current-date').textContent = d.toLocaleDateString('he-IL', { weekday: 'short', month: 'short', day: 'numeric' });
  }
  updateDateTime();
  setInterval(updateDateTime, 1000);

  // ---------- Online / offline ----------
  var ind = $('online-indicator');
  if (ind) {
    function setOnline(v) {
      ind.classList.toggle('offline', !v);
      ind.title = v ? 'מחובר לאינטרנט' : 'לא מחובר';
    }
    setOnline(navigator.onLine);
    window.addEventListener('online', function () { setOnline(true); });
    window.addEventListener('offline', function () { setOnline(false); });
  }

  // ---------- Theme ----------
  var themeBtn = $('theme-toggle');
  if (themeBtn) {
    var theme = localStorage.getItem(STORAGE_THEME) || 'dark';
    if (theme === 'light') {
      document.body.classList.add('light-theme');
      themeBtn.textContent = '☀';
    }
    themeBtn.addEventListener('click', function () {
      document.body.classList.toggle('light-theme');
      var isLight = document.body.classList.contains('light-theme');
      localStorage.setItem(STORAGE_THEME, isLight ? 'light' : 'dark');
      themeBtn.textContent = isLight ? '☀' : '🌙';
    });
  }

  // ---------- Sidebar ----------
  var sidebar = $('sidebar');
  var navToggle = $('nav-toggle');
  var sidebarBackdrop = $('sidebar-backdrop');
  var sidebarClose = $('sidebar-close');
  qsAll('.sidebar__nav a').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var href = a.getAttribute('href');
      if (href && href[0] === '#') {
        e.preventDefault();
        closeSidebar();
        var target = $(href.slice(1));
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else closeSidebar();
    });
  });
  function openSidebar() { if (sidebar) { sidebar.classList.add('is-open'); sidebar.setAttribute('aria-hidden', 'false'); } }
  function closeSidebar() { if (sidebar) { sidebar.classList.remove('is-open'); sidebar.setAttribute('aria-hidden', 'true'); } }
  if (navToggle) navToggle.addEventListener('click', openSidebar);
  if (sidebarClose) sidebarClose.addEventListener('click', closeSidebar);
  if (sidebarBackdrop) sidebarBackdrop.addEventListener('click', closeSidebar);

  // ---------- Search ----------
  var searchInput = $('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', function () {
      var q = (searchInput.value || '').trim().toLowerCase();
      qsAll('.links-section[data-category-id]').forEach(function (section) {
        var cards = section.querySelectorAll('.link-card');
        var visible = 0;
        cards.forEach(function (card) {
          var text = (card.getAttribute('data-search') || card.textContent || '').toLowerCase();
          var show = !q || text.indexOf(q) !== -1;
          card.classList.toggle('hidden-by-search', !show);
          if (show) visible++;
        });
        section.classList.toggle('hidden-by-search', visible === 0);
      });
    });
  }

  // ---------- Category drag & drop order ----------
  function getCategoryOrder() {
    try { return JSON.parse(localStorage.getItem(STORAGE_ORDER) || '[]'); } catch (e) { return []; }
  }
  function saveCategoryOrder(ids) { localStorage.setItem(STORAGE_ORDER, JSON.stringify(ids)); }

  var container = $('categories-container');
  if (container) {
    var sections = qsAll('.links-section[data-category-id]', container);
    var order = getCategoryOrder().filter(function (id) { return id !== 'favorites'; });
    if (order.length) {
      order.forEach(function (id) {
        var el = qs('[data-category-id="' + id + '"]', container);
        if (el) container.appendChild(el);
      });
    }

    sections.forEach(function (section) {
      var head = section.querySelector('.links-section__head');
      if (!head) return;
      head.addEventListener('mousedown', function (e) {
        if (e.button !== 0) return;
        section.classList.add('dragging');
        var rect = section.getBoundingClientRect();
        var shiftY = e.clientY - rect.top;
        function move(e) {
          var y = e.clientY - shiftY;
          var next = null;
          qsAll('.links-section', container).forEach(function (s) {
            if (s === section) return;
            var r = s.getBoundingClientRect();
            if (y < r.top + r.height / 2) { next = s; return false; }
          });
          if (next) container.insertBefore(section, next);
          else container.appendChild(section);
        }
        function up() {
          section.classList.remove('dragging');
          document.removeEventListener('mousemove', move);
          document.removeEventListener('mouseup', up);
          var ids = [];
          qsAll('.links-section[data-category-id]', container).forEach(function (s) { ids.push(s.getAttribute('data-category-id')); });
          saveCategoryOrder(ids);
        }
        document.addEventListener('mousemove', move);
        document.addEventListener('mouseup', up);
      });
    });
  }

  // ---------- עריכת קישורים אונליין: הוספה, מחיקה, שינוי סדר ----------
  function getLinksFromDom() {
    var data = {};
    qsAll('.links-section[data-category-id]').forEach(function (section) {
      var catId = section.getAttribute('data-category-id');
      if (!catId) return;
      var list = section.querySelector('.links-section__list');
      if (!list) return;
      var links = [];
      qsAll('.link-card', list).forEach(function (card) {
        var a = card.querySelector('.link-card__link');
        var url = card.getAttribute('data-url') || (a ? a.getAttribute('href') : '') || '';
        var title = card.getAttribute('data-title') || (a ? (a.querySelector('.link-card__title') || {}).textContent : '') || '';
        var search = card.getAttribute('data-search') || title;
        if (url) links.push({ url: url, title: title.trim(), search: (search || title).trim() });
      });
      data[catId] = links;
    });
    return data;
  }

  function loadLinks() {
    try {
      var raw = localStorage.getItem(STORAGE_LINKS);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (e) {}
    var fromDom = getLinksFromDom();
    saveLinks(fromDom);
    return fromDom;
  }

  function saveLinks(data) {
    try { localStorage.setItem(STORAGE_LINKS, JSON.stringify(data)); } catch (e) {}
  }

  function escapeHtml(s) {
    if (!s) return '';
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function renderLinks(data) {
    if (!data) return;
    qsAll('.links-section[data-category-id]').forEach(function (section) {
      var catId = section.getAttribute('data-category-id');
      var list = section.querySelector('.links-section__list');
      if (!list || !data[catId]) return;
      var html = '';
      data[catId].forEach(function (link) {
        var url = escapeHtml(link.url);
        var title = escapeHtml(link.title);
        var search = escapeHtml(link.search || link.title);
        html += '<article class="link-card" data-url="' + url + '" data-title="' + title + '" data-search="' + search + '">';
        html += '<button type="button" class="link-card__delete" aria-label="מחק">×</button>';
        html += '<a href="' + url + '" target="_blank" rel="noopener noreferrer" class="link-card__link">';
        html += '<span class="link-card__icon">' + DEFAULT_ICON + '</span>';
        html += '<span class="link-card__title">' + title + '</span></a></article>';
      });
      list.innerHTML = html;
    });
    attachLinksEditorEvents();
  }

  function attachLinksEditorEvents() {
    var container = $('categories-container');
    if (!container) return;

    qsAll('.links-section__list', container).forEach(function (list) {
      var section = list.closest('.links-section');
      var catId = section ? section.getAttribute('data-category-id') : null;
      if (!catId) return;

      list.addEventListener('click', function (e) {
        var del = e.target.closest('.link-card__delete');
        if (!del) return;
        e.preventDefault();
        e.stopPropagation();
        var card = del.closest('.link-card');
        if (!card) return;
        var url = card.getAttribute('data-url');
        var data = loadLinks();
        if (!data[catId]) return;
        data[catId] = data[catId].filter(function (l) { return l.url !== url; });
        saveLinks(data);
        renderLinks(data);
      });

      qsAll('.link-card', list).forEach(function (card) {
        card._dragDone = false;
        card.addEventListener('mousedown', function (e) {
          if (!document.body.classList.contains('edit-mode')) return;
          if (e.target.closest('.link-card__delete')) return;
          if (e.button !== 0) return;
          e.preventDefault();
          var rect = card.getBoundingClientRect();
          var shiftY = e.clientY - rect.top;
          var listRect = list.getBoundingClientRect();
          function move(ev) {
            var y = ev.clientY - shiftY;
            var next = null;
            [].slice.call(list.children).forEach(function (c) {
              if (c === card) return;
              var r = c.getBoundingClientRect();
              if (y < r.top + r.height / 2) { next = c; return false; }
            });
            if (next) list.insertBefore(card, next);
            else list.appendChild(card);
          }
          function up() {
            document.removeEventListener('mousemove', move);
            document.removeEventListener('mouseup', up);
            card._dragDone = true;
            var newOrder = [];
            qsAll('.link-card', list).forEach(function (c) {
              newOrder.push({
                url: c.getAttribute('data-url'),
                title: c.getAttribute('data-title'),
                search: c.getAttribute('data-search') || c.getAttribute('data-title')
              });
            });
            var data = loadLinks();
            if (data[catId]) { data[catId] = newOrder; saveLinks(data); }
          }
          document.addEventListener('mousemove', move);
          document.addEventListener('mouseup', up);
        });
      });
    });
  }

  var editToggle = $('edit-toggle');
  if (editToggle) {
    editToggle.addEventListener('click', function () {
      document.body.classList.toggle('edit-mode');
      editToggle.classList.toggle('is-active', document.body.classList.contains('edit-mode'));
      editToggle.setAttribute('title', document.body.classList.contains('edit-mode') ? 'סיום עריכה' : 'ערוך קישורים');
    });
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.links-section__add');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    var catId = btn.getAttribute('data-category-id');
    if (!catId) return;
    var catInput = $('add-link-category');
    if (catInput) catInput.value = catId;
    var modal = $('add-link-modal');
    var titleInput = $('add-link-title');
    var urlInput = $('add-link-url');
    if (titleInput) titleInput.value = '';
    if (urlInput) urlInput.value = '';
    if (modal) {
      modal.removeAttribute('hidden');
      if (titleInput) { titleInput.focus(); }
    }
  });

  var addLinkModal = $('add-link-modal');
  var addLinkForm = $('add-link-form');
  var addLinkCategory = $('add-link-category');
  if (addLinkForm && addLinkCategory) {
    addLinkForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var title = ($('add-link-title') || {}).value;
      var url = ($('add-link-url') || {}).value;
      var catId = addLinkCategory.value;
      if (!title || !url || !catId) return;
      if (!url.match(/^https?:\/\//i)) url = 'https://' + url;
      var data = loadLinks();
      if (!data[catId]) data[catId] = [];
      data[catId].push({ url: url, title: title.trim(), search: title.trim() });
      saveLinks(data);
      renderLinks(data);
      addLinkModal.hidden = true;
    });
  }
  if ($('modal-cancel')) $('modal-cancel').addEventListener('click', function () { addLinkModal.hidden = true; });
  if ($('modal-backdrop')) $('modal-backdrop').addEventListener('click', function () { addLinkModal.hidden = true; });

  (function initLinks() {
    var data = loadLinks();
    renderLinks(data);
  })();

  // ---------- News panel ----------
  var RSS_URL = 'https://news.google.com/rss?hl=he&gl=IL&ceid=IL:he';
  var PROXIES = [
    'https://api.allorigins.win/raw?url=',
    'https://corsproxy.io/?url=',
    'https://thingproxy.freeboard.io/fetch/'
  ];
  var REFRESH_MIN = 5;

  var newsList = $('news-list');
  var newsListDup = $('news-list-dup');
  var newsTrack = $('news-track');
  var newsLoading = $('news-loading');
  var newsError = $('news-error');
  var newsRetry = $('news-retry');
  var newsRefresh = $('news-refresh');
  var newsToggle = $('news-toggle');
  var newsPanelBody = $('news-panel-body');
  var newsPanel = document.querySelector('.news-panel');

  if (localStorage.getItem(STORAGE_NEWS_COLLAPSED) === '1' && newsPanel) {
    newsPanel.classList.add('collapsed');
    if (newsToggle) newsToggle.textContent = '+';
  }

  if (newsToggle && newsPanel) {
    newsToggle.addEventListener('click', function () {
      newsPanel.classList.toggle('collapsed');
      var c = newsPanel.classList.contains('collapsed');
      newsToggle.textContent = c ? '+' : '−';
      localStorage.setItem(STORAGE_NEWS_COLLAPSED, c ? '1' : '0');
    });
  }

  // ---------- Notes panel ----------
  var notesTextarea = $('notes-textarea');
  var notesToggle = $('notes-toggle');
  var notesPanel = document.querySelector('.notes-panel');

  if (notesTextarea) {
    try {
      var saved = localStorage.getItem(STORAGE_NOTES);
      if (saved) notesTextarea.value = saved;
    } catch (e) {}
    var notesSaveTimeout;
    notesTextarea.addEventListener('input', function () {
      clearTimeout(notesSaveTimeout);
      notesSaveTimeout = setTimeout(function () {
        try { localStorage.setItem(STORAGE_NOTES, notesTextarea.value); } catch (e) {}
      }, 300);
    });
  }

  if (notesToggle && notesPanel) {
    if (localStorage.getItem(STORAGE_NOTES_COLLAPSED) === '1') {
      notesPanel.classList.add('collapsed');
      notesToggle.textContent = '+';
    }
    notesToggle.addEventListener('click', function () {
      notesPanel.classList.toggle('collapsed');
      var c = notesPanel.classList.contains('collapsed');
      notesToggle.textContent = c ? '+' : '−';
      localStorage.setItem(STORAGE_NOTES_COLLAPSED, c ? '1' : '0');
    });
  }

  function stripHtml(str) {
    if (!str) return '';
    var d = document.createElement('div');
    d.innerHTML = str;
    return (d.textContent || d.innerText || '').trim();
  }

  function parseRss(text) {
    var parser = new DOMParser();
    var doc = parser.parseFromString(text, 'text/xml');
    var items = doc.querySelectorAll('item');
    if (!items.length) items = doc.querySelectorAll('entry');
    var out = [];
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var titleEl = it.querySelector('title');
      var title = titleEl ? (titleEl.textContent || '').trim() : '';
      var link = '';
      var linkEl = it.querySelector('link');
      if (linkEl) {
        link = linkEl.getAttribute('href') || linkEl.textContent || '';
      }
      if (!title) continue;
      out.push({ title: title, link: (link || '').trim() });
    }
    return out;
  }

  function renderNews(items) {
    if (!items.length) return;
    var html = '';
    items.forEach(function (it, i) {
      var title = stripHtml(it.title);
      if (!title) return;
      var newBadge = i < 3 ? ' <span class="item-new">חדש</span>' : '';
      html += '<li class="news-panel__item"><a href="' + (it.link || '#') + '" target="_blank" rel="noopener noreferrer">' + title + '</a>' + newBadge + '</li>';
    });
    if (newsList) newsList.innerHTML = html;
    if (newsListDup) newsListDup.innerHTML = html;
    if (newsLoading) { newsLoading.hidden = true; newsLoading.style.display = 'none'; }
    if (newsError) { newsError.hidden = true; newsError.style.display = 'none'; }
    if (newsTrack) newsTrack.style.display = '';
  }

  function showNewsError() {
    if (newsLoading) { newsLoading.hidden = true; newsLoading.style.display = 'none'; }
    if (newsError) { newsError.hidden = false; newsError.style.display = ''; }
    if (newsTrack) newsTrack.style.display = 'none';
  }

  function fetchNews(isManual) {
    if (isManual && newsRefresh) newsRefresh.classList.add('refreshing');
    if (newsTrack) newsTrack.style.display = 'none';
    if (newsLoading) { newsLoading.hidden = false; newsLoading.style.display = ''; }
    if (newsError) newsError.hidden = true;

    var proxyIndex = 0;
    function tryFetch() {
      if (proxyIndex >= PROXIES.length) {
        showNewsError();
        if (newsRefresh) newsRefresh.classList.remove('refreshing');
        return;
      }
      var proxy = PROXIES[proxyIndex];
      var url = proxy + encodeURIComponent(RSS_URL);
      fetch(url)
        .then(function (r) {
          if (!r.ok) throw new Error('Proxy ' + proxyIndex);
          return r.text();
        })
        .then(function (text) {
          if (!text || text.length < 100) throw new Error('Empty response');
          var items = parseRss(text);
          if (items.length) {
            renderNews(items);
            if (newsRefresh) newsRefresh.classList.remove('refreshing');
          } else {
            proxyIndex++;
            tryFetch();
          }
        })
        .catch(function () {
          proxyIndex++;
          tryFetch();
        });
    }
    tryFetch();
  }

  if (newsRetry) newsRetry.addEventListener('click', function () { fetchNews(true); });
  if (newsRefresh) newsRefresh.addEventListener('click', function () { fetchNews(true); });
  fetchNews(false);
  setInterval(function () { fetchNews(false); }, REFRESH_MIN * 60 * 1000);

  // ---------- Quote ----------
  var quotes = [
    'הדרך להתחיל היא להפסיק לדבר ולהתחיל לעשות. — וולט דיסני',
    'ההצלחה אינה סופית, הכישלון אינו קטלני. — וינסטון צ\'רצ\'יל',
    'המסע היחיד הבלתי אפשרי הוא זה שאף פעם לא מתחילים. — טוני רובינס',
    'עשה מה שאתה יכול, עם מה שיש לך, איפה שאתה. — תאודור רוזוולט'
  ];
  var quoteEl = $('quote-text');
  if (quoteEl) quoteEl.textContent = quotes[new Date().getDate() % quotes.length];

  // ---------- משחקי ספורט היום (TheSportsDB) + קישורים לספורט5, ONE, SPORT1 ----------
  var sportsList = $('sports-list');
  var sportsLoading = $('sports-loading');
  var sportsError = $('sports-error');
  if (sportsList) {
    function todayIsrael() {
      return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });
    }
    function fetchSports() {
      var d = todayIsrael();
      var url = 'https://www.thesportsdb.com/api/v1/json/123/eventsday.php?d=' + d;
      if (sportsLoading) { sportsLoading.hidden = false; sportsLoading.style.display = ''; }
      if (sportsError) sportsError.hidden = true;
      sportsList.innerHTML = '';
      fetch(url)
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (sportsLoading) { sportsLoading.hidden = true; sportsLoading.style.display = 'none'; }
          var events = (data && data.events) ? data.events : [];
          if (events.length === 0) {
            if (sportsError) { sportsError.hidden = false; sportsError.style.display = ''; }
            return;
          }
          events.slice(0, 20).forEach(function (ev) {
            var league = (ev.strLeague || '').trim();
            var home = (ev.strHomeTeam || '').trim();
            var away = (ev.strAwayTeam || '').trim();
            var time = (ev.strTime || '').trim();
            if (!home && !away) return;
            var match = home && away ? home + ' – ' + away : (ev.strEvent || home || away);
            var timeStr = time ? time.replace(/^(\d{2}):(\d{2}).*/, '$1:$2') : '';
            var html = '<li class="sports-panel__item">';
            if (league) html += '<span class="sports-panel__league">' + escapeHtml(league) + '</span>';
            html += '<span class="sports-panel__match">' + escapeHtml(match) + '</span>';
            if (timeStr) html += '<span class="sports-panel__time">' + escapeHtml(timeStr) + '</span>';
            html += '</li>';
            sportsList.insertAdjacentHTML('beforeend', html);
          });
        })
        .catch(function () {
          if (sportsLoading) { sportsLoading.hidden = true; sportsLoading.style.display = 'none'; }
          if (sportsError) { sportsError.hidden = false; sportsError.style.display = ''; }
        });
    }
    fetchSports();
    setInterval(fetchSports, 30 * 60 * 1000);
  }

  // ---------- Weather: תחזית ל־6 ימים + בחירת מיקום ----------
  var WEATHER_CITIES = {
    telaviv:    { name: 'תל אביב',     lat: 32.0853, lon: 34.7818 },
    jerusalem:  { name: 'ירושלים',     lat: 31.7683, lon: 35.2137 },
    haifa:      { name: 'חיפה',        lat: 32.7940, lon: 34.9896 },
    beersheva:  { name: 'באר שבע',    lat: 31.2520, lon: 34.7915 },
    eilat:      { name: 'אילת',        lat: 29.5577, lon: 34.9519 },
    netanya:    { name: 'נתניה',       lat: 32.3320, lon: 34.8594 },
    ashdod:     { name: 'אשדוד',      lat: 31.8044, lon: 34.6553 },
    rishon:     { name: 'ראשון לציון', lat: 31.9640, lon: 34.8042 }
  };
  var weatherEl = $('weather-text');
  var weatherSelect = $('weather-location');
  if (weatherEl) {
    function getWeatherLocation() {
      var key = (weatherSelect && weatherSelect.value) || localStorage.getItem(STORAGE_WEATHER_LOCATION) || 'telaviv';
      return WEATHER_CITIES[key] || WEATHER_CITIES.telaviv;
    }
    function fetchWeather() {
      var loc = getWeatherLocation();
      if (weatherSelect) try { localStorage.setItem(STORAGE_WEATHER_LOCATION, weatherSelect.value); } catch (e) {}
      var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + loc.lat + '&longitude=' + loc.lon +
        '&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=Asia/Jerusalem&forecast_days=6';
      fetch(url)
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (!d || !d.daily || !d.daily.time) { weatherEl.textContent = '—'; return; }
          var times = d.daily.time;
          var maxT = d.daily.temperature_2m_max || [];
          var minT = d.daily.temperature_2m_min || [];
          var locationLine = loc.name + ' (' + loc.lat.toFixed(2) + '°N, ' + loc.lon.toFixed(2) + '°E)';
          var html = '<p class="widget-weather__location">' + locationLine + '</p><ul class="widget-weather__days">';
          for (var i = 0; i < times.length; i++) {
            var date = new Date(times[i] + 'T12:00:00');
            var dayName = date.toLocaleDateString('he-IL', { weekday: 'short' });
            if (i === 0) dayName = 'היום';
            else if (i === 1) dayName = 'מחר';
            var max = maxT[i] != null ? Math.round(maxT[i]) : '—';
            var min = minT[i] != null ? Math.round(minT[i]) : '—';
            html += '<li class="widget-weather__day"><span class="widget-weather__day-name">' + dayName + '</span><span class="widget-weather__day-temp">' + max + '° / ' + min + '°</span></li>';
          }
          html += '</ul>';
          weatherEl.innerHTML = html;
        })
        .catch(function () { weatherEl.textContent = '—'; });
    }
    if (weatherSelect) {
      try {
        var saved = localStorage.getItem(STORAGE_WEATHER_LOCATION);
        if (saved && WEATHER_CITIES[saved]) weatherSelect.value = saved;
      } catch (e) {}
      weatherSelect.addEventListener('change', fetchWeather);
    }
    fetchWeather();
  }

  // ---------- רקע דינמי: תמונות נופים (לפי שעה + רוטציה) ----------
  var bgEl = $('bg-image');
  var landscapeUrls = [
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80',
    'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1920&q=80',
    'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&q=80',
    'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1920&q=80',
    'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1920&q=80'
  ];
  if (bgEl) {
    function setBgImage() {
      var h = new Date().getHours();
      var idx = h >= 5 && h < 12 ? 0 : h >= 12 && h < 17 ? 1 : h >= 17 && h < 22 ? 2 : 3;
      idx = (idx + Math.floor(Date.now() / 60000) % landscapeUrls.length) % landscapeUrls.length;
      bgEl.style.backgroundImage = 'url(' + landscapeUrls[idx] + ')';
    }
    setBgImage();
    setInterval(setBgImage, 60000);
  }
})();
