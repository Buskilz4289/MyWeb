(function () {
  'use strict';

  var STORAGE_THEME = 'dashboard-theme';
  var STORAGE_ORDER = 'dashboard-category-order';
  var STORAGE_NEWS_COLLAPSED = 'dashboard-news-collapsed';
  var STORAGE_NOTES = 'dashboard-notes';
  var STORAGE_NOTES_COLLAPSED = 'dashboard-notes-collapsed';

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

  // ---------- News panel ----------
  var RSS_URL = 'https://news.google.com/rss?hl=he&gl=IL&ceid=IL:he';
  var PROXIES = ['https://api.allorigins.win/raw?url=', 'https://corsproxy.io/?'];
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
    var out = [];
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var title = it.querySelector('title');
      var link = it.querySelector('link');
      out.push({ title: title ? title.textContent : '', link: link ? link.textContent : '' });
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

    var proxy = PROXIES[0];
    var url = proxy + encodeURIComponent(RSS_URL);
    fetch(url).then(function (r) { return r.text(); })
      .then(function (text) {
        var items = parseRss(text);
        if (items.length) renderNews(items);
        else showNewsError();
      })
      .catch(showNewsError)
      .then(function () {
        if (newsRefresh) newsRefresh.classList.remove('refreshing');
      });
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

  // ---------- Weather ----------
  var weatherEl = $('weather-text');
  if (weatherEl) {
    fetch('https://api.open-meteo.com/v1/forecast?latitude=32.0853&longitude=34.7818&current=temperature_2m,weather_code&timezone=Asia/Jerusalem')
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d && d.current) weatherEl.textContent = Math.round(d.current.temperature_2m) + '°C';
        else weatherEl.textContent = '—';
      })
      .catch(function () { weatherEl.textContent = '—'; });
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
