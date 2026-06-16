// Initialize state
// ── Admin / Login state ──────────────────────────────────────────────────────
const ADMIN_PASSWORD = 'chronica2024';
let isAdmin = false;

function getFallbackImage(item, w = 1200, h = 800) {
  const parts = [];
  if (item.category) parts.push(item.category.split(/\s+/).slice(0,2).join(','));
  if (item.era) parts.push(item.era);
  const titleWord = (item.title || '').split(/\s+/)[0];
  if (titleWord) parts.push(titleWord);
  parts.push('history', 'museum', 'archive');
  const q = encodeURIComponent(parts.filter(Boolean).join(','));
  return `https://source.unsplash.com/${w}x${h}/?${q}`;
}

function openLogin() {
  if (isAdmin) {
    showView('admin');
    return;
  }
  document.getElementById('login-overlay').classList.add('open');
  document.getElementById('login-error').textContent = '';
  document.getElementById('login-pw').value = '';
  setTimeout(() => document.getElementById('login-pw').focus(), 80);
}

function closeLogin() {
  document.getElementById('login-overlay').classList.remove('open');
}

function handleOverlayClick(e) {
  if (e.target === document.getElementById('login-overlay')) closeLogin();
}

function estimateReadTime(text, wpm = 230) {
  const words = (text || '').trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / wpm));
  return {
    words,
    minutes,
    label: `${minutes} min read`
  };
}

function attemptLogin() {
  const pw = document.getElementById('login-pw').value;
  if (pw === ADMIN_PASSWORD) {
    isAdmin = true;
    closeLogin();
    applyAdminUI();
    showView('admin');
  } else {
    document.getElementById('login-error').textContent = 'Incorrect password. Please try again.';
    document.getElementById('login-pw').select();
  }
}

function adminLogout() {
  isAdmin = false;
  applyAdminUI();
  if (currentView === 'admin') showView('front');
}

function applyAdminUI() {
  const strip = document.getElementById('admin-strip');
  if (strip) strip.style.display = isAdmin ? '' : 'none';
  const logoutBtn = document.getElementById('logout-nav-btn');
  if (logoutBtn) logoutBtn.style.display = isAdmin ? '' : 'none';
  const editorBtn = document.getElementById('editor-nav-btn');
  if (editorBtn) editorBtn.textContent = isAdmin ? '✎ Dashboard' : '✎ Editor';
  syncReaderEditBar();
}

function syncReaderEditBar() {
  const bar = document.getElementById('reader-edit-bar');
  if (!bar) return;
  const onReader = document.getElementById('view-reader')?.classList.contains('active');
  bar.classList.toggle('visible', isAdmin && onReader);
}

// ── Search ───────────────────────────────────────────────────────
let searchQuery = '';

function onSearchInput(val) {
  searchQuery = val.trim().toLowerCase();
  const clearBtn = document.getElementById('search-clear');
  if (clearBtn) clearBtn.classList.toggle('visible', searchQuery.length > 0);
  applySearchFilter();
}

function clearSearch() {
  searchQuery = '';
  const inp = document.getElementById('search-input');
  if (inp) inp.value = '';
  const clearBtn = document.getElementById('search-clear');
  if (clearBtn) clearBtn.classList.remove('visible');
  applySearchFilter();
}

function applySearchFilter() {
  const hero = document.getElementById('hero-wrap');
  let totalVisible = 0;

  document.querySelectorAll('.article-card, .video-card').forEach(card => {
    const title = (card.querySelector('.headline')?.textContent || '').toLowerCase();
    const deck = (card.querySelector('.deck')?.textContent || '').toLowerCase();
    const tag = (card.querySelector('.tag')?.textContent || '').toLowerCase();
    const matchesSearch = !searchQuery || title.includes(searchQuery) || deck.includes(searchQuery) || tag.includes(searchQuery);
    const hiddenByFilter = card.style.display === 'none' && !card.dataset.searchHidden;
    if (!searchQuery) {
      if (card.dataset.searchHidden) { card.style.display = ''; delete card.dataset.searchHidden; }
    } else {
      if (!matchesSearch) {
        card.dataset.searchHidden = '1';
        card.style.display = 'none';
      } else {
        if (card.dataset.searchHidden) { delete card.dataset.searchHidden; card.style.display = ''; }
        totalVisible++;
      }
    }
  });

  document.querySelectorAll('.era-section').forEach(section => {
    const visible = [...section.querySelectorAll('.article-card, .video-card')].some(c => c.style.display !== 'none');
    section.style.display = visible ? '' : 'none';
  });

  if (hero) hero.style.display = searchQuery ? 'none' : '';

  const countEl = document.getElementById('search-count');
  if (countEl) {
    if (searchQuery) {
      countEl.textContent = totalVisible === 0 ? 'No results' : totalVisible + ' result' + (totalVisible !== 1 ? 's' : '');
    } else {
      countEl.textContent = '';
    }
  }

  const existingEmpty = document.getElementById('search-empty');
  if (totalVisible === 0 && searchQuery) {
    if (!existingEmpty) {
      const empty = document.createElement('div');
      empty.id = 'search-empty';
      empty.style.cssText = 'padding:4rem;text-align:center;color:var(--ink-faint);font-family:var(--font-body);font-style:italic;';
      empty.innerHTML = `No articles found for "<strong>${searchQuery}</strong>"`;
      document.getElementById('front-page-content').appendChild(empty);
    }
  } else {
    if (existingEmpty) existingEmpty.remove();
  }
}

let _heroIndex = 0;
let _heroItems = [];
let _heroTimer = null;
let _heroTimerStart = null;
const HERO_INTERVAL = 5000;

function renderHero() {
  const heroIds = ['fall-of-rome', 'mongol-empire', 'plague', 'napoleon', 'd-day-landings', 'renaissance'];
  _heroItems = heroIds
    .map(id => { const s = getSample(id); return s ? { ...s, _id: id } : null; })
    .filter(Boolean)
    .slice(0, 3);

  if (!_heroItems.length) return;
  const wrap = document.getElementById('hero-wrap');
  if (!wrap) return;

    function slideHtml(item) {
    const isVideo = item.type === 'video';
    const clickFn = `readSample('${item._id}')`;
      const imgUrl = item.image || getFallbackImage(item, 1200, 800);
    return `
      <div class="hero-slide">
        <div class="hero-card" onclick="${clickFn}">
          <div class="hero-text">
            <div class="hero-kicker">${isVideo ? '▶ Video · ' : ''}${item.category || 'Feature'}</div>
            <div class="hero-headline">${item.title}</div>
            ${item.subtitle ? `<div class="hero-deck">${item.subtitle}</div>` : ''}
            <div class="hero-meta">${item.author || 'Chronica Editorial'} &nbsp;·&nbsp; ${item.date || 'Archive'}</div>
          </div>
          <div class="hero-image-wrap">
            <img class="hero-image" src="${imgUrl}" alt="${item.title}"
              onerror="this.closest('.hero-image-wrap').style.background='var(--stone)';this.style.display='none'" loading="eager">
            ${item.imageCaption ? `<div class="hero-image-label">${item.imageCaption}</div>` : ''}
          </div>
        </div>
      </div>`;
  }

  const dotsHtml = _heroItems.map((_, i) =>
    `<button class="hero-dot${i === 0 ? ' active' : ''}" onclick="heroGoTo(${i})" aria-label="Slide ${i+1}"></button>`
  ).join('');

  wrap.innerHTML = `
    <div class="hero-section-label"><span>Lead Stories</span></div>
    <div class="hero-slider" id="hero-slider">
      <button class="hero-arrow hero-arrow-left" onclick="heroStep(-1)" aria-label="Previous">‹</button>
      <button class="hero-arrow hero-arrow-right" onclick="heroStep(1)" aria-label="Next">›</button>
      <div class="hero-slides" id="hero-slides">
        ${_heroItems.map(slideHtml).join('')}
      </div>
    </div>
    <div class="hero-timer-bar"><div class="hero-timer-fill" id="hero-timer-fill"></div></div>
    <div class="hero-dots">${dotsHtml}</div>
  `;

  _heroIndex = 0;
  startHeroTimer();
}

function heroGoTo(idx) {
  _heroIndex = (idx + _heroItems.length) % _heroItems.length;
  const slides = document.getElementById('hero-slides');
  if (slides) slides.style.transform = `translateX(-${_heroIndex * 100}%)`;
  document.querySelectorAll('.hero-dot').forEach((d, i) => d.classList.toggle('active', i === _heroIndex));
  resetHeroTimer();
}

function heroStep(dir) { heroGoTo(_heroIndex + dir); }

function startHeroTimer() {
  if (_heroItems.length < 2) return;
  clearInterval(_heroTimer);
  _heroTimerStart = Date.now();
  animateHeroTimerBar();
  _heroTimer = setInterval(() => {
    heroGoTo(_heroIndex + 1);
  }, HERO_INTERVAL);
}

function resetHeroTimer() {
  clearInterval(_heroTimer);
  _heroTimerStart = Date.now();
  const fill = document.getElementById('hero-timer-fill');
  if (fill) { fill.style.transition = 'none'; fill.style.width = '0%'; }
  setTimeout(() => animateHeroTimerBar(), 30);
  _heroTimer = setInterval(() => heroGoTo(_heroIndex + 1), HERO_INTERVAL);
}

function animateHeroTimerBar() {
  const fill = document.getElementById('hero-timer-fill');
  if (!fill) return;
  fill.style.transition = `width ${HERO_INTERVAL}ms linear`;
  fill.style.width = '100%';
}

function initProgressBar() {
  const wrap = document.getElementById('progress-bar-wrap');
  const fill = document.getElementById('progress-bar-fill');
  if (!wrap || !fill) return;

  window.addEventListener('scroll', () => {
    const readerView = document.getElementById('view-reader');
    const isReading = readerView && readerView.classList.contains('active');
    if (!isReading) { wrap.classList.remove('visible'); fill.style.width = '0%'; return; }

    wrap.classList.add('visible');
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const pct = docHeight > 0 ? Math.min(100, (scrollTop / docHeight) * 100) : 0;
    fill.style.width = pct + '%';
  }, { passive: true });
}

let _editingItem = null;
let _editingIsSample = false;
let _editingSampleId = null;

function openInlineEditor() {
  if (!_editingItem) return;
  if (!_editingIsSample) {
    editContent(_editingItem.id);
    showView('admin');
    return;
  }

  const item = _editingItem;
  const isVideo = item.type === 'video';

  document.getElementById('em-title').value    = item.title    || '';
  document.getElementById('em-subtitle').value = item.subtitle || '';
  document.getElementById('em-author').value   = item.author   || '';
  document.getElementById('em-body').value     = item.body     || '';

  // Show/hide body section
  document.getElementById('em-body-section').style.display = isVideo ? 'none' : '';

  // Image section
  const currentImgWrap = document.getElementById('em-current-image-wrap');
  const currentImg = document.getElementById('em-current-image');
  if (item.image) {
    currentImg.src = item.image;
    currentImgWrap.style.display = '';
  } else {
    currentImgWrap.style.display = 'none';
  }
  clearEmImage();

  // Video section
  document.getElementById('em-video-section').style.display = isVideo ? '' : 'none';
  if (isVideo) {
    document.getElementById('em-video-url').value = item.videoUrl || '';
    document.getElementById('em-video-preview-wrap').style.display = 'none';
    document.getElementById('em-video-preview-frame').src = '';
    // Update modal title
    document.querySelector('.edit-modal-title').textContent = '✎ Edit Video';
  } else {
    document.querySelector('.edit-modal-title').textContent = '✎ Edit Article';
  }

  document.getElementById('edit-modal-overlay').classList.add('open');
}

function closeEditModal() {
  document.getElementById('edit-modal-overlay').classList.remove('open');
}

function handleEditOverlayClick(e) {
  if (e.target === document.getElementById('edit-modal-overlay')) closeEditModal();
}

function saveInlineEdit() {
  if (!_editingItem) return;
  const title    = document.getElementById('em-title').value.trim();
  const subtitle = document.getElementById('em-subtitle').value.trim();
  const author   = document.getElementById('em-author').value.trim();
  const body     = document.getElementById('em-body').value.trim();
  const isVideo  = _editingItem.type === 'video';
  if (!title) { toast('Title cannot be empty.'); return; }

  // Get new image if uploaded
  const newImagePreview = document.getElementById('em-image-preview');
  const newImage = (newImagePreview && newImagePreview.src && newImagePreview.src.startsWith('data:')) ? newImagePreview.src : null;

  // Get new video URL if changed
  const newVideoUrl = isVideo ? document.getElementById('em-video-url').value.trim() : null;

  if (_editingIsSample) {
    const existing = state.contents.find(c => c._sampleId === _editingSampleId);
    if (existing) {
      existing.title    = title;
      existing.subtitle = subtitle;
      existing.author   = author;
      if (!isVideo) existing.body = body;
      if (newImage) existing.image = newImage;
      if (isVideo && newVideoUrl) { existing.videoUrl = newVideoUrl; existing.embedUrl = getEmbedUrl(newVideoUrl); }
      _editingItem = existing;
    } else {
      const newItem = {
        ..._editingItem,
        id: Date.now(),
        _sampleId: _editingSampleId,
        title, subtitle, author,
        body: isVideo ? _editingItem.body : body,
        isSample: false
      };
      if (newImage) newItem.image = newImage;
      if (isVideo && newVideoUrl) { newItem.videoUrl = newVideoUrl; newItem.embedUrl = getEmbedUrl(newVideoUrl); }
      state.contents.push(newItem);
      _editingItem = newItem;
      currentArticleId = newItem.id;
      _editingIsSample = false;
    }
    save();
    renderFront();
  } else {
    const item = state.contents.find(c => c.id == _editingItem.id);
    if (item) {
      item.title = title; item.subtitle = subtitle; item.author = author;
      if (!isVideo) item.body = body;
      if (newImage) item.image = newImage;
      if (isVideo && newVideoUrl) { item.videoUrl = newVideoUrl; item.embedUrl = getEmbedUrl(newVideoUrl); }
    }
    save();
    renderFront();
  }

  closeEditModal();
  renderReader(_editingItem);
  toast('Article saved!');
}

function handleEmImageUpload(input) {
  const file = input.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { toast('Image too large — max 5MB.'); input.value = ''; return; }
  const reader = new FileReader();
  reader.onload = function(e) {
    document.getElementById('em-image-preview').src = e.target.result;
    document.getElementById('em-image-preview-wrap').style.display = 'block';
    document.getElementById('em-image-upload-area').style.borderColor = 'var(--accent)';
    document.getElementById('em-image-upload-text').textContent = '✓ New image ready — save to apply';
  };
  reader.readAsDataURL(file);
}

function clearEmImage() {
  document.getElementById('em-image-input').value = '';
  document.getElementById('em-image-preview').src = '';
  document.getElementById('em-image-preview-wrap').style.display = 'none';
  document.getElementById('em-image-upload-area').style.borderColor = '';
  document.getElementById('em-image-upload-text').textContent = 'Click to upload a new cover image';
}

function previewEmVideo(url) {
  try {
    const embedUrl = getEmbedUrl(url.trim());
    const wrap = document.getElementById('em-video-preview-wrap');
    const frame = document.getElementById('em-video-preview-frame');
    if (embedUrl && (embedUrl.includes('youtube.com/embed') || embedUrl.includes('player.vimeo.com'))) {
      frame.src = embedUrl;
      wrap.style.display = 'block';
    } else {
      frame.src = '';
      wrap.style.display = 'none';
    }
  } catch(e) { console.error('Em video preview error:', e); }
}

function playYTVideo(wrapperId, src) {
  const wrap = document.getElementById(wrapperId);
  if (!wrap || wrap.classList.contains('playing')) return;
  const iframe = wrap.querySelector('iframe');
  if (iframe) {
    const origin = (location.protocol === 'file:') ? '' : ('&origin=' + encodeURIComponent(location.origin));
    iframe.src = src + origin;
  }
  wrap.classList.add('playing');
}

const STORE = 'chronica-v2';
let state = JSON.parse(localStorage.getItem(STORE) || '{"contents":[],"members":[]}');
let previousView = 'front';
let currentView = 'front';
let currentArticleTitle = '';
let currentArticleId = null;
let activeEra = 'all';
let activeCategory = 'all';

function init() {
  document.getElementById('masthead-date').textContent = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  renderFront();
  renderHero();
  initProgressBar();
  syncNavHighlight();
  // Auto-generate 2-3 articles per day
  setTimeout(autoGenerateArticles, 1200);
  // This Day in History widget
  setTimeout(renderThisDayWidget, 800);
}

function activateView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const el = document.getElementById('view-' + name);
  if (el) el.classList.add('active');
  previousView = currentView;
  currentView = name;
  window.scrollTo(0, 0);
  const sw = document.getElementById('search-wrap');
  if (sw) sw.style.display = (name === 'front') ? '' : 'none';
  if (name !== 'reader') {
    const pb = document.getElementById('progress-bar-wrap');
    const pf = document.getElementById('progress-bar-fill');
    if (pb) pb.classList.remove('visible');
    if (pf) pf.style.width = '0%';
  }
  syncReaderEditBar();
}

function syncNavHighlight() {
  document.querySelectorAll('.era-tab').forEach(tab => {
    const onclick = tab.getAttribute('onclick') || '';
    const eraMatch = onclick.match(/filterEra\('([^']+)'/);
    const isMembers = onclick.includes("showView('members')");
    if (currentView === 'members' && isMembers) {
      tab.classList.add('active');
    } else if (currentView === 'front' && eraMatch && eraMatch[1] === activeEra) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });

  document.querySelectorAll('.category-tab').forEach(tab => {
    const onclick = tab.getAttribute('onclick') || '';
    const catMatch = onclick.match(/filterCategory\('([^']+)'/);
    const isAll = onclick.includes("filterCategory('all'");
    if (currentView === 'front') {
      if (activeCategory === 'all' && isAll) tab.classList.add('active');
      else if (catMatch && catMatch[1] === activeCategory) tab.classList.add('active');
      else tab.classList.remove('active');
    } else {
      tab.classList.remove('active');
    }
  });

  const categoryNav = document.getElementById('category-nav');
  if (currentView === 'front') {
    categoryNav.classList.add('visible');
    if (activeEra === 'all') {
      document.querySelectorAll('.category-tab').forEach(t => { t.style.display = ''; });
    } else {
      updateCategoryTabsForEra(activeEra);
    }
  } else {
    categoryNav.classList.remove('visible');
  }
}

function showView(name) {
  if ((name === 'admin' || name === 'manage-tab') && !isAdmin) {
    openLogin();
    return;
  }
  if (name === 'manage-tab') {
    activateView('admin');
    syncNavHighlight();
    setTimeout(() => switchTab('manage', document.getElementById('tab-btn-manage')), 50);
    return;
  }

  activateView(name);
  syncNavHighlight();

  if (name === 'front') {
    if (previousView === 'admin' || !document.querySelector('.era-section')) {
      renderFront();
    } else {
      applyFilters();
    }
  }
  if (name === 'members') renderMembersPage();
  if (name === 'about') { /* static, nothing to render */ }
}

function goBack() {
  showView(previousView === 'reader' ? 'front' : previousView || 'front');
}

function filterEra(era, btn) {
  activeEra = era;
  activeCategory = 'all';

  if (currentView !== 'front') activateView('front');
  syncNavHighlight();

  if (!document.querySelector('.era-section')) renderFront();
  applyFilters();
}

function filterCategory(category, btn) {
  activeCategory = category;

  if (currentView !== 'front') activateView('front');
  syncNavHighlight();

  applyFilters();
}

function applyFilters() {
  document.querySelectorAll('.era-section').forEach(section => {
    // Always show latest section regardless of era filter
    if (section.classList.contains('latest-section')) {
      section.style.display = state.contents.length ? '' : 'none';
      return;
    }
    const eraId = section.dataset.era;
    const eraVisible = activeEra === 'all' || activeEra === eraId;
    let anyCardVisible = false;

    section.querySelectorAll('.article-card, .video-card').forEach(card => {
      const cat = card.dataset.category;
      const catVisible = activeCategory === 'all' || activeCategory === cat;
      const show = eraVisible && catVisible;
      card.style.display = show ? '' : 'none';
      if (show) anyCardVisible = true;
    });

    section.style.display = (eraVisible && anyCardVisible) ? '' : 'none';
  });

  const anyVisible = [...document.querySelectorAll('.era-section')].some(s => s.style.display !== 'none');
  let emptyEl = document.getElementById('front-empty-state');
  if (!anyVisible) {
    if (!emptyEl) {
      emptyEl = document.createElement('div');
      emptyEl.id = 'front-empty-state';
      emptyEl.className = 'empty-state';
      emptyEl.style.cssText = 'padding:4rem;text-align:center;';
      emptyEl.innerHTML = 'No articles found. <a href="#" onclick="filterEra(\'all\', document.querySelector(\'.era-tab\')); return false;" style="color:var(--accent);">Show all →</a>';
      document.getElementById('front-page-content').appendChild(emptyEl);
    }
    emptyEl.style.display = '';
  } else if (emptyEl) {
    emptyEl.style.display = 'none';
  }
}

const ERAS = [
  { id: 'ancient', label: 'Ancient World', years: 'Before 500 AD', icon: '⚱', articles: ['pyramids', 'rome', 'ancient-rome-video'] },
  { id: 'medieval', label: 'Medieval', years: '500–1500', icon: '⚔', articles: ['constantinople', 'mongol', 'plague'] },
  { id: 'early-modern', label: 'Early Modern', years: '1500–1800', icon: '⛵', articles: ['renaissance', 'napoleon'] },
  { id: 'modern', label: 'Modern Era', years: '1800–1914', icon: '🏭', articles: ['industrial-revolution', 'german-unification', 'american-civil-war', 'scramble-for-africa', 'age-of-steam'] },
  { id: 'wwii', label: 'World Wars', years: '1914–1945', icon: '✈', articles: ['ww2-video', 'causes-of-wwi', 'battle-of-verdun', 'life-in-trenches', 'd-day-landings', 'end-of-wwii'] },
];

function getLatestArticles(limit = 6) {
  // Returns the most recently published user articles (by id = timestamp)
  const sorted = [...state.contents].sort((a, b) => b.id - a.id);
  return sorted.slice(0, limit);
}

function renderLatestSection() {
  const items = getLatestArticles(6);
  if (!items.length) return '';

  let html = `<div class="era-section latest-section" id="era-latest" data-era="latest">
    <div class="era-header era-header-latest">
      <span class="era-icon">📰</span>
      <span class="era-name">Latest Articles</span>
      <span class="era-years latest-badge">Just Published</span>
    </div>
    <div class="era-grid">`;

  items.forEach(item => {
    const isVideo = item.type === 'video';
    const clickHandler = `readContent(${item.id})`;
    const tag = isVideo ? '▶ Video' : h(item.category || 'Article');
    const tagClass = isVideo ? 'tag-video' : '';
    const cardClass = isVideo ? 'video-card' : 'article-card';
    const cat = (item.category || '').replace(/"/g, '&quot;');
    const readTimeLabel = !isVideo ? (item.readTimeLabel || estimateReadTime(item.body).label) : '';
    const imgUrl = item.image || getFallbackImage(item, 1200, 800);

    if (isVideo) {
      html += `<div class="${cardClass}" onclick="${clickHandler}" data-category="${cat}">
        <div class="video-cover-wrap"><img src="${imgUrl}" alt="${h(item.title)}" onerror="this.closest('.video-cover-wrap').style.display='none'" loading="lazy"><div class="video-play-badge">▶ Video</div></div>
        <div class="tag tag-video">${tag}</div>
        <h2 class="headline">${h(item.title)}</h2>
        ${item.subtitle ? `<p class="deck">${h(item.subtitle)}</p>` : ''}
        <div class="byline">${h(item.date || 'Archive')}</div>
      </div>`;
    } else {
      html += `<div class="${cardClass}" onclick="${clickHandler}" data-category="${cat}">
        <img class="card-cover-image" src="${imgUrl}" alt="${h(item.title)}" onerror="this.style.display='none'" loading="lazy">
        <div class="tag ${tagClass}">${tag}</div>
        <h2 class="headline">${h(item.title)}</h2>
        ${item.subtitle ? `<p class="deck">${h(item.subtitle)}</p>` : ''}
        <div class="byline">${h(item.date || 'Archive')}</div>
        <div class="read-time">${readTimeLabel}</div>
      </div>`;
    }
  });

  html += `</div></div>`;
  return html;
}

const ERA_CATEGORIES = {
  'ancient':      ['Ancient World'],
  'medieval':     ['Medieval History', 'Social History'],
  'early-modern': ['Renaissance', 'Military History'],
  'modern':       ['Modern Era', 'Military History', 'Political History'],
  'wwii':         ['World War I', 'World War II', 'Military History'],
};

function updateCategoryTabsForEra(era) {
  const allowed = ERA_CATEGORIES[era] || [];
  document.querySelectorAll('.category-tab').forEach(tab => {
    const cat = tab.getAttribute('onclick')?.match(/filterCategory\('([^']+)'/)?.[1];
    if (!cat || cat === 'all') {
      tab.style.display = '';
    } else if (allowed.includes(cat)) {
      tab.style.display = '';
    } else {
      tab.style.display = 'none';
    }
  });
}

function renderFront() {
  const container = document.getElementById('front-page-content');
  try {
    let html = '';

    ERAS.forEach(era => {
      let allArticles = [];

      era.articles.forEach(id => {
        const sample = getSample(id);
        if (sample) allArticles.push({ ...sample, id, isSample: true });
      });

      state.contents.filter(c => c.era === era.id).forEach(article => {
        allArticles.push({ ...article, isSample: false });
      });

      if (!allArticles.length) return;

      const eraCount = getEraCount(era.id);
      html += `<div class="era-section" id="era-${era.id}" data-era="${era.id}">
        <div class="era-header">
          <span class="era-name">${era.label}</span>
          <span class="era-count">${eraCount} article${eraCount !== 1 ? 's' : ''}</span>
          <span class="era-years">${era.years}</span>
        </div>
        <div class="era-grid">`;

      allArticles.forEach(item => {
        const isVideo = item.type === 'video';
        const clickHandler = item.isSample ? `readSample('${item.id}')` : `readContent(${item.id})`;
        const tag = isVideo ? '▶ Video' : h(item.category || era.label);
        const tagClass = isVideo ? 'tag-video' : '';
        const cardClass = isVideo ? 'video-card' : 'article-card';
        const cat = (item.category || '').replace(/"/g, '&quot;');
        const readTimeLabel = !isVideo ? (item.readTimeLabel || estimateReadTime(item.body).label) : '';

        const imgUrl = item.image || getFallbackImage(item, 1200, 800);
        const readCount = getReadCount(item.isSample ? ('sample-' + item.id) : item.id);
        const readCountHtml = readCount > 0 ? `<span class="card-read-count">👁 ${formatReadCount(readCount)}</span>` : '';
        const shareBtn = `<button class="card-share-btn" onclick="event.stopPropagation();cardShare('${item.isSample ? 'sample-' + item.id : item.id}','${h(item.title).replace(/'/g,"\\'")}')">↗</button>`;

        if (isVideo) {
          html += `<div class="${cardClass}" onclick="${clickHandler}" data-category="${cat}">
            <div class="video-cover-wrap"><img src="${imgUrl}" alt="${h(item.title)}" onerror="this.closest('.video-cover-wrap').style.display='none'" loading="lazy"><div class="video-play-badge">▶ Video</div></div>
            <div class="tag tag-video">${tag}</div>
            <h2 class="headline">${h(item.title)}</h2>
            ${item.subtitle ? `<p class="deck">${h(item.subtitle)}</p>` : ''}
            <div class="card-footer"><div class="byline">${h(item.date || 'Archive')}</div>${readCountHtml}${shareBtn}</div>
          </div>`;
        } else {
          html += `<div class="${cardClass}" onclick="${clickHandler}" data-category="${cat}">
            <img class="card-cover-image" src="${imgUrl}" alt="${h(item.title)}" onerror="this.style.display='none'" loading="lazy">
            <div class="tag ${tagClass}">${tag}</div>
            <h2 class="headline">${h(item.title)}</h2>
            ${item.subtitle ? `<p class="deck">${h(item.subtitle)}</p>` : ''}
            <div class="card-footer"><div class="byline">${h(item.date || 'Archive')}</div>${readCountHtml}${shareBtn}</div>
            <div class="read-time">${readTimeLabel}</div>
          </div>`;
        }
      });

      html += `</div></div>`;
    });

    const latestHtml = renderLatestSection();
    container.innerHTML = latestHtml + html;
    applyFilters();
    if (searchQuery) applySearchFilter();

  } catch (error) {
    console.error('Error rendering front page:', error);
    container.innerHTML = '<div class="empty-state" style="padding:4rem;text-align:center;color:var(--accent);">Error loading content. Please refresh.</div>';
  }
}

function cardShare(id, title) {
  currentArticleId = id;
  currentArticleTitle = title;
  openShareModal();
}

function readContent(id) {
  try {
    const item = state.contents.find(c => c.id == id);
    if (!item) {
      toast('Article not found');
      return;
    }
    currentArticleId = id;
    currentArticleTitle = item.title;
    incrementReadCount(id);
    _editingItem = item;
    _editingIsSample = false;
    _editingSampleId = null;
    renderReader(item);
    showView('reader');
  } catch (error) {
    console.error('Error reading content:', error);
    toast('Error loading article');
  }
}

function readSample(id) {
  try {
    const item = getSample(id);
    if (!item) {
      toast('Article not found');
      return;
    }
    currentArticleId = 'sample-' + id;
    currentArticleTitle = item.title;
    item.id = id;
    incrementReadCount('sample-' + id);
    _editingItem = item;
    _editingIsSample = true;
    _editingSampleId = id;
    renderReader(item);
    showView('reader');
  } catch (error) {
    console.error('Error reading sample:', error);
    toast('Error loading article');
  }
}

function renderReader(item) {
  try {
    const el = document.getElementById('article-content');
    let html = `
      <div class="reader-header">
        <div class="tag ${item.type === 'video' ? 'tag-video' : ''}">${item.type === 'video' ? '▶ Video &nbsp;·&nbsp; ' : ''}${h(item.category || '')}</div>
        <h1 class="reader-title">${h(item.title)}</h1>
        ${item.subtitle ? `<p class="reader-deck">${h(item.subtitle)}</p>` : ''}
        <div class="byline">${item.author ? 'By ' + h(item.author) + ' &nbsp;·&nbsp; ' : ''}${h(item.date || 'Archive')}</div>
        ${item.type !== 'video' ? `<div class="read-time">${item.readTimeLabel || estimateReadTime(item.body).label}</div>` : ''}
      </div>
      ${item.image ? `
      <div class="featured-image-wrap">
        <img class="featured-image" src="${item.image}" alt="${h(item.title)}" onerror="this.closest('.featured-image-wrap').style.display='none'" loading="lazy">
        ${item.imageCaption ? `<p class="featured-image-caption">${h(item.imageCaption)}</p>` : ''}
      </div>` : ''}
    `;

    if (item.type === 'video') {
      if (item.embedUrl) {
        const ytIdMatch = item.embedUrl.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
        const ytId = ytIdMatch ? ytIdMatch[1] : null;
        const thumb = ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : '';
        const autoplaySrc = item.embedUrl + (item.embedUrl.includes('?') ? '&' : '?') + 'autoplay=1&rel=0&modestbranding=1';
        const posterId = 'yt-' + (ytId || Math.random().toString(36).slice(2));
        const isYouTube = item.embedUrl && item.embedUrl.includes('youtube.com/embed');

        const wrapperClass = isYouTube ? 'yt-poster-wrap native' : 'yt-poster-wrap';
        const iframeAttrs = isYouTube ? 'width="560" height="315"' : '';

        html += `<div class="${wrapperClass}" id="${posterId}" onclick="playYTVideo('${posterId}','${autoplaySrc}')">
          ${thumb ? `<img src="${thumb}" alt="Video thumbnail" onerror="this.style.display='none'">` : ''}
          <div class="yt-play-btn"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></div>
          <iframe ${iframeAttrs}
            src=""
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowfullscreen
            referrerpolicy="strict-origin-when-cross-origin"
            title="${h(item.title)}"></iframe>
        </div>
        <div style="text-align:center;margin:-1.2rem 0 1.5rem;font-family:var(--font-ui);font-size:12px;">
          <a href="${item.videoUrl || 'https://www.youtube.com/watch?v=' + (ytId||'')}" target="_blank" rel="noopener noreferrer" style="color:var(--ink-faint);text-decoration:underline;">▶ Open on YouTube</a>
        </div>`;
      }
      if (item.videoDesc) {
        html += `<div class="reader-body"><p class="drop-cap">${h(item.videoDesc)}</p></div>`;
      }
    } else {
      html += '<div class="reader-body">';
      const paras = (item.body || '').split(/\n\s*\n/);
      let first = true;
      paras.forEach(p => {
        p = p.trim();
        if (p.startsWith('### ')) {
          html += `<h3>${h(p.replace(/^### /, ''))}</h3>`;
        } else if (p) {
          if (first) {
            html += `<p class="drop-cap">${h(p).replace(/\n/g, '<br>')}</p>`;
            first = false;
          } else {
            html += `<p>${h(p).replace(/\n/g, '<br>')}</p>`;
          }
        }
      });
      html += '</div>';
    }

    const books = item.books || [];
    if (books.length) {
      html += `<div class="book-recs">
        <div class="book-recs-title">Further Reading</div>
        <div class="book-list">`;
      books.forEach(b => {
        html += `<div class="book-item">
          <div class="book-spine">&#128218;</div>
          <div class="book-info">
            <div class="book-title">${h(b.title)}</div>
            <div class="book-author">${h(b.author)}</div>
            <div class="book-desc">${h(b.description)}</div>
          </div>
        </div>`;
      });
      html += `</div></div>`;
    }

    // Series trail removed per request
    const seriesHtml = '';

    const totalReads = getReadCount(_editingIsSample ? ('sample-' + (item.id || _editingSampleId)) : item.id);
    const readsDisplay = totalReads > 0 ? `<span class="reader-read-count">👁 ${formatReadCount(totalReads)}</span>` : '';

    html += `
      <div class="share-bar">
        <span class="share-label">Share this article</span>
        ${readsDisplay}
        <button class="btn btn-ink btn-sm" onclick="shareTwitter()">🐦 Twitter</button>
        <button class="btn btn-ink btn-sm" onclick="shareWhatsapp()">💬 WhatsApp</button>
        <button class="btn btn-ink btn-sm" onclick="shareEmail()">✉ Email</button>
        <button class="btn btn-ink btn-sm" onclick="copyInstagram()">📸 Instagram</button>
        <button class="btn btn-ink btn-sm" onclick="copyShareUrl()">🔗 Copy link</button>
      </div>
    `;

    el.innerHTML = html;
  } catch (error) {
    console.error('Error rendering reader:', error);
    document.getElementById('article-content').innerHTML = '<div class="empty-state">Error loading article content.</div>';
  }
}

function getShareText() { return `${currentArticleTitle} — read on Chronica`; }
function getShareUrl() { return window.location.href.split('?')[0] + '?article=' + encodeURIComponent(currentArticleId); }

function openShareModal() {
  try {
    document.getElementById('share-modal-title').textContent = '"' + currentArticleTitle + '"';
    document.getElementById('share-url-field').value = getShareUrl();
    document.getElementById('share-modal').classList.add('open');
  } catch (error) {
    console.error('Error opening share modal:', error);
  }
}

function closeModal(id) {
  try {
    document.getElementById(id).classList.remove('open');
  } catch (error) {
    console.error('Error closing modal:', error);
  }
}

function shareTwitter() {
  try {
    window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent(getShareText()) + '&url=' + encodeURIComponent(getShareUrl()), '_blank');
  } catch (error) {
    console.error('Error sharing to Twitter:', error);
  }
}

function shareFacebook() {
  try {
    window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(getShareUrl()), '_blank');
  } catch (error) {
    console.error('Error sharing to Facebook:', error);
  }
}

function shareWhatsapp() {
  try {
    window.open('https://wa.me/?text=' + encodeURIComponent(getShareText() + ' ' + getShareUrl()), '_blank');
  } catch (error) {
    console.error('Error sharing to WhatsApp:', error);
  }
}

function shareEmail() {
  try {
    window.location.href = 'mailto:?subject=' + encodeURIComponent(getShareText()) + '&body=' + encodeURIComponent('I thought you might enjoy this article:\n\n' + getShareText() + '\n\n' + getShareUrl());
  } catch (error) {
    console.error('Error sharing via email:', error);
  }
}

function copyInstagram() {
  try {
    const subtitle = document.querySelector('.reader-deck') ? document.querySelector('.reader-deck').textContent.trim() : '';
    const caption = `📜 ${currentArticleTitle}\n\n${subtitle ? subtitle + '\n\n' : ''}Read the full article on Chronica — link in bio.\n\n#Chronica #History #HistoryLovers #HistoryMagazine`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(caption).then(() => {
        closeModal('share-modal');
        toast('📸 Instagram caption copied — paste it into your post!');
      });
    } else {
      const t = document.createElement('textarea');
      t.value = caption;
      document.body.appendChild(t);
      t.select();
      document.execCommand('copy');
      document.body.removeChild(t);
      closeModal('share-modal');
      toast('📸 Instagram caption copied — paste it into your post!');
    }
  } catch (error) {
    console.error('Error copying Instagram caption:', error);
    toast('Could not copy. Please try again.');
  }
}

function copyShareUrl() {
  try {
    const url = getShareUrl();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        closeModal('share-modal');
        toast('Link copied to clipboard!');
      }).catch(error => {
        console.error('Error copying to clipboard:', error);
        fallbackCopy(url);
      });
    } else {
      fallbackCopy(url);
    }
  } catch (error) {
    console.error('Error in copyShareUrl:', error);
  }
}

function fallbackCopy(url) {
  try {
    const t = document.createElement('textarea');
    t.value = url;
    document.body.appendChild(t);
    t.select();
    const success = document.execCommand('copy');
    document.body.removeChild(t);
    if (success) {
      closeModal('share-modal');
      toast('Link copied to clipboard!');
    }
  } catch (error) {
    console.error('Error in fallback copy:', error);
    closeModal('share-modal');
    toast('Could not copy link. Please copy manually.');
  }
}

function subscribe() {
  try {
    const name = document.getElementById('sub-name').value.trim();
    const email = document.getElementById('sub-email').value.trim();
    
    if (!name) {
      toast('Please enter your name.');
      return;
    }
    if (!email || !email.includes('@')) {
      toast('Please enter a valid email.');
      return;
    }
    if (state.members.find(m => m.email === email)) {
      toast('You are already subscribed!');
      return;
    }
    
    state.members.push({ 
      name, 
      email, 
      date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) 
    });
    save();
    
    document.getElementById('sub-name').value = '';
    document.getElementById('sub-email').value = '';
    document.getElementById('sub-modal-body').textContent = `Welcome, ${name}! You are now a member of the Chronica fellowship.`;
    document.getElementById('sub-modal').classList.add('open');
  } catch (error) {
    console.error('Error subscribing:', error);
    toast('Error subscribing. Please try again.');
  }
}

function renderMembersPage() {
  try {
    const section = document.getElementById('members-list-section');
    const list = document.getElementById('members-list');
    
    if (!state.members.length) { 
      section.style.display = 'none'; 
      return; 
    }
    
    section.style.display = 'block';
    list.innerHTML = state.members.map(m => `
      <div class="member-row">
        <div class="member-avatar">${m.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}</div>
        <div>
          <div class="member-name">${h(m.name)}</div>
          <div style="font-family: var(--font-ui); font-size: 11px; color: var(--ink-faint);">${h(m.email)}</div>
        </div>
        <div class="member-date">${h(m.date)}</div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error rendering members page:', error);
  }
}

function switchTab(name, btn) {
  try {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.getElementById('tab-' + name).classList.add('active');
    if (btn) btn.classList.add('active');
    if (name === 'manage') renderManage();
    if (name === 'members-admin') renderAdminMembers();
  } catch (error) {
    console.error('Error switching tabs:', error);
  }
}

function toggleContentType() {
  try {
    const t = document.getElementById('content-type').value;
    document.getElementById('article-fields').style.display = t === 'article' ? 'block' : 'none';
    document.getElementById('video-fields').style.display = t === 'video' ? 'block' : 'none';
  } catch (error) {
    console.error('Error toggling content type:', error);
  }
}

function clearForm() {
  try {
    ['content-title', 'content-subtitle', 'content-author', 'content-body', 'content-video-url', 'content-video-desc'].forEach(id => {
      const el = document.getElementById(id); 
      if (el) el.value = '';
    });
    document.getElementById('content-type').value = 'article';
    document.getElementById('edit-id').value = '';
    document.getElementById('admin-form-title').textContent = 'Publish Content';
    document.getElementById('publish-btn').textContent = 'Publish';
    document.getElementById('cancel-edit-btn').style.display = 'none';
    const uploadText = document.querySelector('.image-upload-text');
    if (uploadText) uploadText.textContent = 'Click to upload a cover image';
    const videoHint = document.querySelector('#video-fields .form-hint');
    if (videoHint) videoHint.textContent = 'Paste a YouTube or Vimeo link — a preview will appear below';
    clearImage();
    toggleContentType();
  } catch (error) {
    console.error('Error clearing form:', error);
  }
}

function publishContent() {
  try {
    const type = document.getElementById('content-type').value;
    const title = document.getElementById('content-title').value.trim();
    const subtitle = document.getElementById('content-subtitle').value.trim();
    const author = document.getElementById('content-author').value.trim();
    const category = document.getElementById('content-category').value;
    const era = document.getElementById('content-era').value;
    
    const editId = document.getElementById('edit-id').value;
    const uploadedImage = getUploadedImage();

    if (editId) {
      // Editing existing item
      const existing = state.contents.find(c => c.id == editId);
      if (!existing) { toast('Article not found.'); return; }
      existing.type = type;
      existing.title = title;
      existing.subtitle = subtitle;
      existing.author = author;
      existing.category = category;
      existing.era = era;
      // Replace image only if a new one was uploaded
      if (uploadedImage) existing.image = uploadedImage;
      if (type === 'article') {
        existing.body = document.getElementById('content-body').value.trim();
        const readTime = estimateReadTime(existing.body);
        existing.readTimeLabel = readTime.label;
        existing.readTimeMinutes = readTime.minutes;
        existing.wordCount = readTime.words;
      } else {
        const url = document.getElementById('content-video-url').value.trim();
        if (!url) { toast('Please enter a video URL.'); return; }
        // Replace video — old embedUrl is overwritten
        existing.videoUrl = url;
        existing.embedUrl = getEmbedUrl(url);
        existing.videoDesc = document.getElementById('content-video-desc').value.trim();
      }
      save();
      clearForm();
      document.getElementById('edit-id').value = '';
      document.getElementById('admin-form-title').textContent = 'Publish Content';
      document.getElementById('publish-btn').textContent = 'Publish';
      document.getElementById('cancel-edit-btn').style.display = 'none';
      toast('✓ Changes saved!');
      setTimeout(() => showView('front'), 800);
      return;
    }

    if (!title) {
      toast('Please enter a title.');
      return;
    }

    const item = {
      id: Date.now(),
      type,
      title,
      subtitle,
      author,
      category,
      era,
      date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
    };

    if (uploadedImage) item.image = uploadedImage;

    if (type === 'article') {
      const body = document.getElementById('content-body').value.trim();
      if (!body) {
        toast('Please enter article body text.');
        return;
      }
      item.body = body;
      const readTime = estimateReadTime(body);
      item.readTimeLabel = readTime.label;
      item.readTimeMinutes = readTime.minutes;
      item.wordCount = readTime.words;
    } else {
      const url = document.getElementById('content-video-url').value.trim();
      if (!url) {
        toast('Please enter a video URL.');
        return;
      }
      item.videoUrl = url;
      item.videoDesc = document.getElementById('content-video-desc').value.trim();
      item.embedUrl = getEmbedUrl(url);
    }

    state.contents.unshift(item);
    save();
    clearForm();
    toast('✓ Published!');
    setTimeout(() => showView('front'), 1000);
  } catch (error) {
    console.error('Error publishing content:', error);
    toast('Error publishing. Please try again.');
  }
}

function getEmbedUrl(url) {
  try {
    let m = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
    if (m) return 'https://www.youtube.com/embed/' + m[1];
    m = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    if (m) return 'https://www.youtube.com/embed/' + m[1];
    if (url.includes('youtube.com/embed/')) return url;
    m = url.match(/vimeo\.com\/(\d+)/);
    if (m) return 'https://player.vimeo.com/video/' + m[1];
    return url;
  } catch (error) {
    console.error('Error getting embed URL:', error);
    return url;
  }
}

function handleImageUpload(input) {
  const file = input.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    toast('Image too large — please use a file under 5MB.');
    input.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = function(e) {
    document.getElementById('image-preview').src = e.target.result;
    document.getElementById('image-preview-wrap').style.display = 'block';
    document.getElementById('image-upload-area').style.borderColor = 'var(--accent)';
  };
  reader.readAsDataURL(file);
}

function clearImage() {
  document.getElementById('content-image').value = '';
  document.getElementById('image-preview').src = '';
  document.getElementById('image-preview-wrap').style.display = 'none';
  document.getElementById('image-upload-area').style.borderColor = '';
}

function getUploadedImage() {
  const preview = document.getElementById('image-preview');
  return preview && preview.src && preview.src.startsWith('data:') ? preview.src : null;
}

function previewVideo(url) {
  try {
    const embedUrl = getEmbedUrl(url.trim());
    const wrap = document.getElementById('video-preview-wrap');
    const frame = document.getElementById('video-preview-frame');
    if (embedUrl && (embedUrl.includes('youtube.com/embed') || embedUrl.includes('player.vimeo.com'))) {
      frame.src = embedUrl;
      wrap.style.display = 'block';
    } else {
      frame.src = '';
      wrap.style.display = 'none';
    }
  } catch(e) {
    console.error('Preview error:', e);
  }
}

function renderManage() {
  try {
    const list = document.getElementById('manage-content-list');
    if (!state.contents.length) { 
      list.innerHTML = '<div class="empty-state">No content yet.</div>'; 
      return; 
    }
    list.innerHTML = state.contents.map(item => `
      <div class="content-item">
        <span class="content-item-type type-${item.type}">${item.type === 'article' ? 'Article' : 'Video'}</span>
        <div class="content-item-title">${h(item.title)}</div>
        <div class="content-item-meta">${h(item.era)} · ${h(item.date)}</div>
        <div class="content-item-actions">
          <button class="icon-btn" onclick="readContent(${item.id})">Read</button>
          <button class="icon-btn" onclick="editContent(${item.id})">Edit</button>
          <button class="icon-btn danger" onclick="deleteContent(${item.id})">Delete</button>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error rendering manage page:', error);
  }
}

function deleteContent(id) {
  try {
    if (!confirm('Delete this article?')) return;
    state.contents = state.contents.filter(c => c.id != id);
    save(); 
    renderManage(); 
    renderFront();
    toast('Deleted.');
  } catch (error) {
    console.error('Error deleting content:', error);
    toast('Error deleting article.');
  }
}

function editContent(id) {
  try {
    const item = state.contents.find(c => c.id == id);
    if (!item) { toast('Article not found.'); return; }

    switchTab('add', document.getElementById('tab-btn-add'));
    document.getElementById('edit-id').value = id;
    document.getElementById('admin-form-title').textContent = 'Edit Article';
    document.getElementById('publish-btn').textContent = 'Save Changes';
    document.getElementById('cancel-edit-btn').style.display = '';

    document.getElementById('content-type').value = item.type || 'article';
    toggleContentType();
    document.getElementById('content-era').value = item.era || 'ancient';
    document.getElementById('content-category').value = item.category || '';
    document.getElementById('content-author').value = item.author || '';
    document.getElementById('content-title').value = item.title || '';
    document.getElementById('content-subtitle').value = item.subtitle || '';

    if (item.type === 'video') {
      document.getElementById('content-video-url').value = item.videoUrl || '';
      document.getElementById('content-video-desc').value = item.videoDesc || '';
      if (item.embedUrl) previewVideo(item.videoUrl || '');
    } else {
      document.getElementById('content-body').value = item.body || '';
    }

    if (item.image) {
      document.getElementById('image-preview').src = item.image;
      document.getElementById('image-preview-wrap').style.display = 'block';
      document.getElementById('image-upload-area').style.borderColor = 'var(--accent)';
      // Show "current image" note and replace indicator
      const uploadText = document.querySelector('.image-upload-text');
      if (uploadText) uploadText.textContent = 'Click to replace the current cover image';
    } else {
      clearImage();
      const uploadText = document.querySelector('.image-upload-text');
      if (uploadText) uploadText.textContent = 'Click to upload a cover image';
    }

    // For video type, show current video URL with replace hint
    if (item.type === 'video') {
      const videoHint = document.querySelector('#video-fields .form-hint');
      if (videoHint) videoHint.textContent = 'Replace the URL below to swap the video entirely — the old one will be removed.';
    }

    document.getElementById('view-admin').scrollTop = 0;
    toast('Article loaded for editing.');
  } catch (error) {
    console.error('Error loading article for edit:', error);
    toast('Error loading article.');
  }
}

function cancelEdit() {
  clearForm();
  switchTab('manage', document.getElementById('tab-btn-manage'));
}

function renderAdminMembers() {
  try {
    const list = document.getElementById('admin-members-list');
    if (!state.members.length) { 
      list.innerHTML = '<div class="empty-state">No subscribers yet.</div>'; 
      return; 
    }
    list.innerHTML = state.members.map(m => `
      <div class="content-item">
        <div class="content-item-title">${h(m.name)}</div>
        <div class="content-item-meta">${h(m.email)}</div>
        <div class="content-item-meta">${h(m.date)}</div>
        <div class="content-item-actions">
          <button class="icon-btn danger" onclick="deleteMember('${m.email}')">Remove</button>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error rendering admin members:', error);
  }
}

function deleteMember(email) {
  try {
    if (!confirm('Remove this member?')) return;
    state.members = state.members.filter(m => m.email !== email);
    save(); 
    renderAdminMembers(); 
    toast('Member removed.');
  } catch (error) {
    console.error('Error deleting member:', error);
    toast('Error removing member.');
  }
}

function getSample(id) { 
  try {
    // Prefer any user-edited copy stored in state.contents that maps to this sample id
    if (state && Array.isArray(state.contents)) {
      const overridden = state.contents.find(c => c._sampleId === id);
      if (overridden) return overridden;
    }
    return SAMPLES[id] || null;
  } catch (error) {
    console.error('Error getting sample:', error);
    return null;
  }
}

const SAMPLES = {
  'pyramids': {
    image: 'https://images.unsplash.com/photo-1608480928697-f8a9f0f3c19d?w=1280&q=80',
    imageCaption: "Khufu's Pyramid, Giza · Wikimedia Commons (CC)",
    title: 'Building the Pyramids: New Evidence Emerges',
    category: 'Ancient World',
    era: 'ancient',
    type: 'article',
    author: 'Chronica Editorial',
    date: '22 January 2024',
    subtitle: 'Papyri discovered at the Red Sea coast upend century-old assumptions.',
    body: `The Great Pyramid of Giza is the only one of the Seven Wonders of the Ancient World still standing. Built around 2560 BC for the Pharaoh Khufu, it remained the tallest structure on Earth for nearly four thousand years. It contains an estimated 2.3 million stone blocks, each weighing between 2.5 and 15 tonnes.

### The Wadi al-Jarf Papyri

Wadi al-Jarf is a stretch of desert on the Egyptian Red Sea coast. In 2011 and 2013, a team led by French archaeologist Pierre Tallet excavated sealed galleries cut into the cliffs above an ancient harbour. What they found was extraordinary: the world's oldest papyri, dating to around 2560 BC — the precise period when the Great Pyramid was being built.

### Skilled Workers, Not Slaves

The papyri were the logbooks of a man named Merer, who commanded a team of about 200 workers. They record, in meticulous detail, the team's daily activities: travelling to the Tura limestone quarries, loading blocks onto boats, and sailing them to Giza via a system of purpose-built canals.

The picture that emerges is very different from the popular image of thousands of slaves toiling under the whip. Merer's team were not slaves. They were skilled state employees who received regular rations of bread, beer, meat, and fish.

### The Engineering Problem

How did these workers raise blocks weighing several tonnes to a height of nearly 150 metres? The papyri reveal a sophisticated logistics operation involving canals, harbours, and carefully timed deliveries. Archaeologists now believe that a series of ramps — internal, external, or some combination — were used to haul the blocks upward. No definitive answer has yet been found.

### What the Pyramids Tell Us

The pyramids are not simply tombs. They are monuments to the organisational power of the Egyptian state. To quarry, transport, and place 2.3 million blocks in roughly 20 years required a level of administrative coordination that rivals any modern construction project. The Wadi al-Jarf papyri have given us a rare window into how that machine worked — one logbook, one foreman, one extraordinary feat at a time.`,
    books: [
      { title: 'The Complete Pyramids', author: 'Mark Lehner', description: 'The definitive illustrated survey of every pyramid in Egypt, written by the leading field archaeologist.' },
      { title: 'The Riddle of the Pyramids', author: 'Kurt Mendelssohn', description: "A physicist's ingenious argument for how and why the pyramids were built — still provocative decades on." },
      { title: 'Wonders of the Ancient World', author: 'John Romer', description: "A sweeping account of Egypt's monuments from the earliest dynasties to the Ptolemaic era." },
    ]
  },
  'rome': {
    image: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=1280&q=80',
    imageCaption: 'The Colosseum, Rome · © David Iliff (CC BY-SA 3.0)',
    title: 'Why Rome Fell: A Modern Reassessment',
    category: 'Ancient World',
    era: 'ancient',
    type: 'article',
    author: 'Chronica Editorial',
    date: '1 February 2024',
    subtitle: 'Gibbon blamed Christianity. Others blamed barbarians, climate, or lead pipes.',
    body: `In 410 AD, the Visigoths under Alaric sacked the city of Rome — the first time in eight centuries that a foreign army had entered it. Saint Jerome, in Bethlehem, wrote that "the city which had taken the whole world was itself taken." Sixty-six years later, the last Western Roman Emperor — a teenager named Romulus Augustulus — was deposed by the Germanic chieftain Odoacer. How did the most powerful state the ancient world had ever produced come apart?

### Gibbon's Answer

Edward Gibbon, in his monumental Decline and Fall of the Roman Empire, blamed partly Christianity — a religion that, he argued, sapped martial virtues, redirected wealth toward monasteries, and promoted a pacifist otherworldliness incompatible with imperial defence.

### The Barbarian Explanation

The conventional explanation focuses on the barbarian invasions. From the third century, Germanic peoples pressed against and eventually through the Roman frontier. The Huns, erupting out of Central Asia in the late fourth century, destabilised the Gothic peoples and sent them flooding into Roman territory.

### Climate and Disease

Recent research has pointed to two additional catastrophic factors: climate change and pandemic disease. The Roman Climate Optimum — a warm, stable period that favoured agriculture across the Mediterranean — ended around the third century, replaced by a cooler, more erratic climate. Meanwhile, the Antonine Plague of the 160s and the Plague of Cyprian in the 250s may each have killed a quarter or more of the population in affected regions.

### A Transformation, Not a Collapse

Historians today are less likely to speak of a "fall" than of a long transformation. Roman institutions, law, language, and religion did not vanish — they were absorbed, adapted, and transmitted by the Germanic kingdoms that replaced the western empire. In that sense, Rome did not so much fall as dissolve, slowly and unevenly, into the world we now call medieval Europe.`,
    books: [
      { title: 'The Fall of the Roman Empire', author: 'Peter Heather', description: 'A compelling case that barbarian pressure, not internal decay, destroyed Rome — rigorously argued.' },
      { title: 'The Fate of Rome', author: 'Kyle Harper', description: 'A groundbreaking account of how climate change and pandemic disease brought down the empire.' },
      { title: 'How Rome Fell', author: 'Adrian Goldsworthy', description: 'A narrative history focusing on the political and military failures that hollowed out Roman power.' },
    ]
  },
  'ancient-rome-video': {
    image: 'https://images.unsplash.com/photo-1555992828-ca4dbe41d294?w=1280&q=80',
    imageCaption: 'The Roman Forum · © Sanjay Acharya (CC BY-SA 4.0)',
    title: 'Daily Life in Ancient Rome',
    category: 'Ancient World',
    era: 'ancient',
    type: 'video',
    author: 'Chronica Editorial',
    date: '12 February 2024',
    videoUrl: 'https://www.youtube.com/watch?v=RVUy_bm4V1k',
    embedUrl: 'https://www.youtube.com/embed/RVUy_bm4V1k',
    videoDesc: 'At its height, the city of Rome was home to over a million people — the first city in history to reach that scale.',
    books: [
      { title: 'SPQR: A History of Ancient Rome', author: 'Mary Beard', description: 'The finest one-volume history of Rome for the general reader — witty, scholarly, essential.' },
      { title: 'Rubicon', author: 'Tom Holland', description: 'The dramatic story of the late Republic, from the Gracchi to Caesar, told with novelistic flair.' },
      { title: 'Daily Life in Ancient Rome', author: 'Florence Dupont', description: 'A meticulous reconstruction of how Romans actually lived, ate, worshipped, and spent their days.' },
    ]
  },
  'constantinople': {
    image: 'https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?w=1280&q=80',
    imageCaption: 'Hagia Sophia, Istanbul · Wikimedia Commons (CC)',
    title: 'The Fall of Constantinople: End of an Era',
    category: 'Medieval History',
    era: 'medieval',
    type: 'article',
    author: 'Chronica Editorial',
    date: '29 May 2024',
    subtitle: 'When Ottoman forces breached the ancient walls in 1453.',
    body: `On the morning of 29 May 1453, the Ottoman sultan Mehmed II rode through the gates of Constantinople on a white horse. The city had stood as the capital of the Roman Empire for over a thousand years. The last Roman emperor, Constantine XI Palaiologos, had died fighting on the walls, his purple robes the only way to identify his body among the slain.

### The Siege of 1453

The siege lasted 53 days. Mehmed II, just 21 years old, had assembled an army of between 60,000 and 100,000 men. They faced a defending force of perhaps 7,000, including Genoese mercenaries under Giovanni Giustiniani.

The key to the Ottoman victory was technology. A Hungarian engineer named Orban had cast enormous bronze cannons. These weapons could batter walls that had repelled dozens of sieges over a thousand years.

### The Final Assault

On the night of 28–29 May, Mehmed launched his final assault. Wave after wave of troops attacked the Blachernae section of the walls, where cannon fire had opened a breach. Giovanni Giustiniani, the Genoese commander, was wounded and evacuated — a blow that broke the defenders' morale. Constantine XI, refusing to flee, was last seen charging into the oncoming tide.

### The Long Shadow

The fall of Constantinople sent shockwaves across Christendom and accelerated the flow of Greek scholars westward, carrying ancient manuscripts that would help fuel the Renaissance. It also closed one chapter of the Silk Road, nudging European merchants toward the sea routes they would use to reach Asia — and, accidentally, the Americas. In this sense, 1453 did not merely end an era; it helped begin another.`,
    books: [
      { title: 'The Fall of Constantinople 1453', author: 'Steven Runciman', description: 'The classic account of the siege — elegiac, precise, and still unsurpassed in narrative power.' },
      { title: 'Constantinople: The Last Great Siege', author: 'Roger Crowley', description: 'A gripping modern retelling that draws on both Christian and Ottoman sources.' },
      { title: 'Empires of the Sea', author: 'Roger Crowley', description: 'Broadens the story into the wider Ottoman-Christian conflict across the Mediterranean.' },
    ]
  },
  'mongol': {
    image: 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=1280&q=80',
    imageCaption: 'The Yuan Dynasty at its height · Wikimedia Commons (Public Domain)',
    title: 'The Silk Road Under the Mongol Pax',
    category: 'Medieval History',
    era: 'medieval',
    type: 'article',
    author: 'Chronica Editorial',
    date: '15 March 2024',
    subtitle: 'For a century, the world\'s largest contiguous empire created conditions for unprecedented cross-continental exchange.',
    body: `When Genghis Khan unified the Mongolian steppes in 1206 and began his campaigns of conquest, the immediate human cost was catastrophic. Cities were erased; populations were halved. By any measure, the Mongol conquests were among the most destructive events in human history.

### The Pax Mongolica

The period historians call the Pax Mongolica — roughly 1260 to 1360 — saw the entire length of the Silk Road fall under a single political authority for the first time. A merchant with a paiza, a tablet of authority issued by the Khan, could travel from Hangzhou to Tabriz without crossing a hostile border.

### Marco Polo and the Flow of Ideas

The most famous traveller of the Pax Mongolica was Marco Polo, whose account of his journey to the court of Kublai Khan — whatever its embellishments — captured a European audience stunned by descriptions of paper money, coal, and cities ten times the size of anything in the West. Less famous but equally significant was the movement of technologies and crops: porcelain, printing, and gunpowder moved westward; cotton and new agricultural techniques moved east.

### The End of the Pax

The Pax Mongolica ended not with military defeat but with plague. The Black Death, which may have originated in Central Asian rodent populations, spread along the very trade routes the Mongols had secured. By the mid-14th century, the Mongol khanates were fragmenting, the trade routes were disrupted, and the world that Marco Polo had described was becoming a memory.`,
    books: [
      { title: 'Genghis Khan and the Making of the Modern World', author: 'Jack Weatherford', description: 'A radical reassessment arguing the Mongols accelerated globalisation by centuries.' },
      { title: 'The Mongol Empire', author: 'John Man', description: 'A balanced one-volume history of the empire from Genghis to Kublai, richly illustrated.' },
      { title: 'The Silk Roads', author: 'Peter Frankopan', description: 'Places the Mongol Pax within the broader history of trade and connectivity across Eurasia.' },
    ]
  },
  'plague': {
    image: 'https://images.unsplash.com/photo-1572991793799-e92fc0a0e36e?w=1280&q=80',
    imageCaption: 'Danse Macabre, Michael Wolgemut, 1493 · Public Domain',
    title: 'The Black Death and the Birth of Modern Europe',
    category: 'Social History',
    era: 'medieval',
    type: 'article',
    author: 'Chronica Editorial',
    date: '10 April 2024',
    subtitle: 'How a catastrophe that killed perhaps half of Europe shattered the medieval order.',
    body: `In October 1347, twelve Genoese trading ships docked at Messina, having sailed from the Black Sea port of Kaffa. Most of the sailors were dead; the rest were covered in black swellings oozing blood and pus, and burning with fever. The ships were ordered back out to sea. It was already too late.

### The Economic Revolution

The death of half the population transformed the relationship between land and labour overnight. Suddenly, there was too much land and too few people to work it. Wages rose dramatically. Lords who had dictated terms to their peasants now competed for workers.

### The Collapse of Certainty

Beyond economics, the Black Death shattered the psychological foundations of medieval society. The Church, which claimed to be the guardian of human salvation, could neither explain the catastrophe nor prevent it. Priests died as readily as sinners. Flagellant movements swept through towns; Jewish communities were massacred by mobs seeking scapegoats. Trust in institutions that had stood for centuries collapsed within a generation.

### A New World

Paradoxically, the catastrophe created the conditions for renewal. Labour was scarce; innovation was incentivised. The peasants who survived inherited more land, more wages, and more autonomy than their grandparents could have imagined. The rigid hierarchy of the feudal order cracked under the pressure of demographic collapse, and from those cracks grew the more fluid, more mobile society of the early modern period.`,
    books: [
      { title: 'The Black Death', author: 'Philip Ziegler', description: 'The landmark popular history — comprehensive, compassionate, and still the best starting point.' },
      { title: 'The Great Mortality', author: 'John Kelly', description: "A vivid, street-level account of the plague's progress across Europe, town by town." },
      { title: 'Plagues and Peoples', author: 'William McNeill', description: 'The broader context: how epidemic disease has shaped human history from prehistory to the present.' },
    ]
  },
  'renaissance': {
    image: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=1280&q=80',
    imageCaption: 'La Primavera, Sandro Botticelli, c.1477 · Public Domain',
    title: 'Florence and the Birth of the Renaissance',
    category: 'Renaissance',
    era: 'early-modern',
    type: 'video',
    author: 'Chronica Editorial',
    date: '3 March 2024',
    videoUrl: 'https://www.youtube.com/watch?v=0qdxeKdPWmU',
    embedUrl: 'https://www.youtube.com/embed/0qdxeKdPWmU',
    videoDesc: 'Why did the Renaissance begin in Florence? This documentary explores the extraordinary convergence of wealth, civic pride, political competition, and intellectual ambition.',
    books: [
      { title: 'The Civilisation of the Renaissance in Italy', author: 'Jacob Burckhardt', description: 'The book that invented the idea of the Renaissance — still indispensable, still contested.' },
      { title: 'Leonardo da Vinci', author: 'Walter Isaacson', description: "A biography of the Renaissance's supreme genius, drawing on his thousands of surviving notebooks." },
      { title: 'Florence: The Biography of a City', author: 'Christopher Hibbert', description: 'A rich, readable portrait of Florence across the centuries.' },
    ]
  },
  'napoleon': {
    image: 'https://images.unsplash.com/photo-1524230572899-a752b3835840?w=1280&q=80',
    imageCaption: 'Napoleon in His Study, Jacques-Louis David, 1812 · Public Domain',
    title: "Napoleon's Hundred Days: Ambition's Last Gamble",
    category: 'Military History',
    era: 'early-modern',
    type: 'article',
    author: 'Chronica Editorial',
    date: '18 June 2024',
    subtitle: 'From Elba to Waterloo in one hundred days — the breathtaking last campaign.',
    body: `On the night of 26 February 1815, Napoleon Bonaparte slipped away from the island of Elba with around 700 men and a gambler's conviction that France was waiting for him. He had been on Elba for less than ten months — given the island as a sovereign domain, a pension, and the title of Emperor.

### The March on Paris

Napoleon landed on the southern French coast on 1 March 1815 and began marching north. The Bourbon armies sent to intercept him melted away. Near Grenoble, Napoleon walked alone toward a line of soldiers with their muskets raised, opened his coat, and invited any man who wished to shoot his Emperor to do so.

### The Hundred Days in Paris

No shot was fired. The soldiers went over to him, and the march became a triumphal procession. Louis XVIII fled Paris without firing a single cannon. By 20 March, Napoleon was back in the Tuileries. He had a hundred days, perhaps less, to consolidate his power before the allied armies of Europe closed in.

### Waterloo

The decisive battle came on 18 June 1815 near the Belgian village of Waterloo. Wellington's Anglo-allied army held a defensive ridge while waiting for Prussian reinforcements. Napoleon attacked. The French Imperial Guard, the elite of his army, was repulsed for the first time in its history. The French army broke and fled. Wellington and Blücher met on the field as night fell. "The nearest run thing you ever saw in your life," Wellington said later. Napoleon abdicated four days later. His gamble had failed — but it had been, for a hundred days, magnificently close.`,
    books: [
      { title: 'Napoleon: A Life', author: 'Andrew Roberts', description: 'The best modern single-volume biography — authoritative, sympathetic, and beautifully written.' },
      { title: 'Waterloo', author: 'Bernard Cornwell', description: "A gripping hour-by-hour account of the battle that ended Napoleon's last gamble." },
      { title: 'The Hundred Days', author: 'David Hamilton-Williams', description: 'A meticulous account of the campaign from Elba to Waterloo.' },
    ]
  },
  'industrial-revolution': {
    image: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1280&q=80',
    imageCaption: 'Iron and Coal, William Bell Scott, 1855–60 · Public Domain',
    title: 'The Industrial Revolution: A Turning Point in History',
    category: 'Modern Era',
    era: 'modern',
    type: 'article',
    author: 'Chronica Editorial',
    date: '15 May 2024',
    subtitle: 'How Britain led the world into an age of machines, factories, and unprecedented change.',
    body: `The Industrial Revolution began in Britain in the late 18th century. It marked a shift from agrarian economies to industrialized ones. This transformation reshaped societies, economies, and daily life in ways that are still felt today.

### The Birth of Industry

Before the Industrial Revolution, most people lived in rural areas and worked in agriculture. Goods were produced by hand in small workshops or at home. The Industrial Revolution changed this by introducing machines and factories.

### Key Innovations

The steam engine, perfected by James Watt in 1776, was a game-changer. It provided a reliable source of power that did not depend on wind, water, or muscle. This allowed factories to be built anywhere, not just near rivers.

### The Human Cost

The Industrial Revolution created wealth on an unprecedented scale, but distributed it very unevenly. Child labour in mines and mills was commonplace. Working days of 14 hours were the norm. Entire families moved from rural villages to crowded, smoky industrial cities where sanitation was minimal and disease was rife.

### A Changed World

By the middle of the 19th century, Britain was producing more than half the world's iron and cotton cloth. Railways had knitted the country together. The changes Britain pioneered spread to Europe, North America, and eventually the entire globe. No previous transformation in human history had altered the conditions of everyday life so rapidly — or so completely.`,
    books: [
      { title: 'The Lunar Men', author: 'Jenny Uglow', description: "The story of the Birmingham circle — Watt, Priestley, Darwin's grandfather — who invented the modern world." },
      { title: 'The Condition of the Working Class in England', author: 'Friedrich Engels', description: "A searing eyewitness account of Manchester's industrial poor, written in 1845 — still essential." },
      { title: 'The Making of the English Working Class', author: 'E.P. Thompson', description: 'The landmark social history of how industrialisation created a new class consciousness.' },
    ]
  },
  'german-unification': {
    image: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1280&q=80',
    imageCaption: 'Otto von Bismarck, photograph, 1894 · Public Domain',
    title: 'The Unification of Germany',
    category: 'Political History',
    era: 'modern',
    type: 'article',
    author: 'Chronica Editorial',
    date: '20 May 2024',
    subtitle: 'How a collection of small states became a powerful empire under Bismarck’s leadership.',
    body: `In the 19th century, Germany was not a single country but a collection of 39 states. These states were loosely connected under the German Confederation. The process of unifying these states into a single nation was driven by a combination of nationalism, military power, and political maneuvering.

### The Role of Otto von Bismarck

Otto von Bismarck, the Minister President of Prussia, was the architect of German unification. Appointed in 1862 by King Wilhelm I, Bismarck was determined to strengthen Prussia and unite the German states under its leadership.

### Blood and Iron

Bismarck's strategy was blunt: "The great questions of the day will not be settled by speeches and majority decisions — that was the mistake of 1848–49 — but by blood and iron." He engineered three wars in quick succession: against Denmark in 1864, against Austria in 1866, and against France in 1870–71. Each victory brought more German states into the Prussian orbit.

### The German Empire Proclaimed

On 18 January 1871, in the Hall of Mirrors at Versailles — humiliatingly, on French soil — the German Empire was proclaimed. King Wilhelm I of Prussia became Kaiser Wilhelm I of Germany. The new empire was the most powerful state in continental Europe, a position it would hold, with fateful consequences, until 1918.`,
    books: [
      { title: 'Bismarck: A Life', author: 'Jonathan Steinberg', description: 'A magisterial biography of the Iron Chancellor — admiring of his genius, clear-eyed about his dangers.' },
      { title: 'The Iron Kingdom', author: 'Christopher Clark', description: 'The definitive history of Prussia, from the Hohenzollerns to Hitler.' },
      { title: 'The Wars of German Unification', author: 'Dennis Showalter', description: 'A clear military and political history of the three wars that created the German Empire.' },
    ]
  },
  'american-civil-war': {
    image: 'https://images.unsplash.com/photo-1565953522043-baea26b83cde?w=1280&q=80',
    imageCaption: 'The Battle of Gettysburg, Thure de Thulstrup, 1887 · Public Domain',
    title: 'The American Civil War: A Nation Divided',
    category: 'Military History',
    era: 'modern',
    type: 'article',
    author: 'Chronica Editorial',
    date: '25 May 2024',
    subtitle: 'The bloody conflict that pitted North against South and redefined the United States.',
    body: `The American Civil War, fought from 1861 to 1865, was one of the most devastating conflicts in history. It was a struggle between the Northern states (the Union) and the Southern states (the Confederacy) over issues of states' rights, slavery, and the nature of the federal government.

### Causes of the War

The primary cause of the Civil War was slavery. The Southern economy relied heavily on slave labor for agriculture, particularly for cotton production. The Northern states, which had largely abolished slavery, opposed its expansion into new territories.

### War Begins

When Abraham Lincoln was elected president in November 1860, seven Southern states seceded before he even took office. Confederate forces fired on Fort Sumter in April 1861, and the war began. What most people expected to last months lasted four brutal years.

### The Turning Point and Its Aftermath

Gettysburg in July 1863 and Vicksburg the following day marked the war's turning point. The Confederacy never mounted a serious offensive again. By April 1865, General Lee surrendered at Appomattox Court House. The war had cost some 620,000 lives — more American dead than in any other conflict before or since. The 13th Amendment abolished slavery. Reconstruction would prove that winning the war was easier than winning the peace.`,
    books: [
      { title: 'Battle Cry of Freedom', author: 'James McPherson', description: 'The Pulitzer Prize-winning one-volume history of the Civil War — the place to start.' },
      { title: 'Team of Rivals', author: 'Doris Kearns Goodwin', description: 'The political genius of Lincoln, told through his relationships with his cabinet rivals.' },
      { title: 'The Civil War: A Narrative', author: 'Shelby Foote', description: 'Three magisterial volumes — literary, granular, and indispensable for any serious reader.' },
    ]
  },
  'scramble-for-africa': {
    image: 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=1280&q=80',
    imageCaption: 'Africa 1880–1913: the colonial partition · Wikimedia Commons (CC)',
    title: 'The Scramble for Africa',
    category: 'Political History',
    era: 'modern',
    type: 'article',
    author: 'Chronica Editorial',
    date: '30 May 2024',
    subtitle: 'How European powers carved up a continent in the late 19th century.',
    body: `The Scramble for Africa, which took place between 1881 and 1914, was a period of rapid colonization of the African continent by European powers. At the beginning of this period, only 10% of Africa was under European control. By the end, nearly 90% of the continent was colonized.

### The Berlin Conference

The Scramble for Africa was formalized at the Berlin Conference of 1884-1885. Convened by German Chancellor Otto von Bismarck, the conference was attended by representatives of 13 European states and the United States.

### The Rules of Partition

The conference established that a European power could claim African territory only if it "effectively occupied" it — a rule that unleashed a race to plant flags across the continent. No African representatives were invited. Borders were drawn on maps by diplomats who had often never set foot in the regions they were dividing.

### The Legacy

The consequences of the Scramble persist to this day. Borders imposed with no regard for ethnic, linguistic, or cultural boundaries created states that have struggled with internal conflict ever since. Resources extracted to fuel European industrialisation left colonial economies dependent on commodity exports. The trauma of the period — compounded by the Congo Free State atrocities, the Herero genocide, and dozens of lesser-known campaigns of violence — reshaped an entire continent in ways that a century of independence has only partially addressed.`,
    books: [
      { title: "King Leopold's Ghost", author: 'Adam Hochschild', description: 'The devastating history of the Congo Free State — one of the great works of narrative history.' },
      { title: 'The Scramble for Africa', author: 'Thomas Pakenham', description: 'The definitive account of the partition — vast in scope, rich in character, compelling throughout.' },
      { title: 'Africa: A Biography of the Continent', author: 'John Reader', description: "Places the colonial period within the deepest long view of the continent's human story." },
    ]
  },
  'age-of-steam': {
    image: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1280&q=80',
    imageCaption: "Stephenson's Rocket, 1829 · Public Domain",
    title: 'The Age of Steam and Railways',
    category: 'Modern Era',
    era: 'modern',
    type: 'article',
    author: 'Chronica Editorial',
    date: '5 June 2024',
    subtitle: 'How steam power transformed transportation and reshaped the world.',
    body: `The Age of Steam, spanning the late 18th to the early 20th century, was a period of remarkable innovation in transportation. The harnessing of steam power revolutionized the way people and goods moved across land and sea.

### The Steam Engine

The steam engine, perfected by James Watt in the 1770s, was the heart of the Age of Steam. Watt’s improvements to earlier designs made steam power more efficient and practical.`,
    books: [
      { title: 'The Victorian Internet', author: 'Tom Standage', description: 'Draws a brilliant parallel between the telegraph and the internet — a short, revelatory read.' },
      { title: 'Brunel: The Man Who Built the World', author: 'Steven Brindle', description: "A beautifully illustrated life of Isambard Kingdom Brunel, the steam age's greatest engineer." },
      { title: 'The Railway Journey', author: 'Wolfgang Schivelbusch', description: 'A cultural history of how railways changed perception, time, and the human body.' },
    ]
  },
  'ww2-video': {
    image: 'https://images.unsplash.com/photo-1591198619115-56e5e2f0fc60?w=1280&q=80',
    imageCaption: 'Douglas SBD Dauntless dive bombers, 1942 · US Navy (Public Domain)',
    title: 'The D-Day Landings: Hour by Hour',
    category: 'World War II',
    era: 'wwii',
    type: 'video',
    author: 'Chronica Editorial',
    date: '6 June 2024',
    videoUrl: 'https://www.youtube.com/watch?v=FTAW1PvEcAk',
    embedUrl: 'https://www.youtube.com/embed/FTAW1PvEcAk',
    videoDesc: 'Operation Overlord — the Allied invasion of Normandy on 6 June 1944 — was the largest seaborne invasion in history.',
    books: [
      { title: 'The Second World War', author: 'Winston Churchill', description: 'Six volumes of self-serving but indispensable history by the man who lived and shaped it.' },
      { title: 'Inferno: The World at War 1939-1945', author: 'Max Hastings', description: 'A global ground-level account told through the letters and diaries of ordinary people on every front.' },
      { title: 'No Simple Victory', author: 'Norman Davies', description: 'A provocative reassessment arguing the Eastern Front, not D-Day, decided the Second World War.' },
    ]
  },
  'causes-of-wwi': {
    image: 'https://images.unsplash.com/photo-1594040226829-7f251ab46d80?w=1280&q=80',
    imageCaption: 'Aftermath of the Sarajevo assassination, 1914 · Bundesarchiv (CC)',
    title: 'The Causes of World War I',
    category: 'World War I',
    era: 'wwii',
    type: 'article',
    author: 'Chronica Editorial',
    date: '10 June 2024',
    subtitle: 'A complex web of alliances, nationalism, and militarism led to the Great War.',
    body: `World War I was one of the deadliest conflicts in history, resulting in over 16 million deaths. Its causes were complex and interconnected, involving alliances, nationalism, militarism, and imperialism.

### The Alliance System

By the early 20th century, Europe was divided into two major alliance blocs: the Triple Entente (France, Russia, Britain) and the Triple Alliance (Germany, Austria-Hungary, Italy).`,
    books: [
      { title: 'The Guns of August', author: 'Barbara Tuchman', description: 'The Pulitzer-winning account of the first month of the war — still the most gripping narrative.' },
      { title: 'The Sleepwalkers', author: 'Christopher Clark', description: 'A revisionist masterpiece arguing that Europe\'s leaders stumbled into war without truly willing it.' },
      { title: 'A World Undone', author: 'G.J. Meyer', description: 'A panoramic narrative of the whole war, excellent for readers coming to WWI for the first time.' },
    ]
  },
  'battle-of-verdun': {
    image: 'https://images.unsplash.com/photo-1555992828-ca4dbe41d294?w=1280&q=80',
    imageCaption: 'French troops at Verdun, March 1916 · Public Domain',
    title: 'The Battle of Verdun: The Longest Battle of World War I',
    category: 'World War I',
    era: 'wwii',
    type: 'article',
    author: 'Chronica Editorial',
    date: '15 June 2024',
    subtitle: 'A brutal, ten-month struggle that became a symbol of French resistance.',
    body: `The Battle of Verdun, fought from 21 February to 19 December 1916, was the longest and one of the most costly battles of World War I, with over 700,000 casualties.

### The German Plan

General Erich von Falkenhayn’s "bleed France white" plan aimed to draw French reserves into a battle of attrition at Verdun, a historic fortress city.`,
    books: [
      { title: 'The Price of Glory', author: 'Alistair Horne', description: 'The classic English-language account of Verdun — vivid, moving, and impossible to put down.' },
      { title: 'Verdun: The Longest Battle of the Great War', author: 'Paul Jankowski', description: 'The most rigorous modern history of the battle, drawing on French, German, and American sources.' },
      { title: 'They Shall Not Pass', author: 'Ian Ousby', description: 'A cultural history of Verdun and its place in French memory — haunting and beautifully written.' },
    ]
  },
  'life-in-trenches': {
    image: 'https://images.unsplash.com/photo-1594040226829-7f251ab46d80?w=1280&q=80',
    imageCaption: 'Cheshire Regiment in trenches, Somme, 1916 · Public Domain',
    title: 'Life in the Trenches: The Harsh Reality of World War I',
    category: 'World War I',
    era: 'wwii',
    type: 'article',
    author: 'Chronica Editorial',
    date: '20 June 2024',
    subtitle: 'Soldiers endured unimaginable conditions in the mud, blood, and horror of the Western Front.',
    body: `Life in the trenches during World War I was a brutal and harrowing experience. Soldiers endured cramped, muddy, and unsanitary conditions, facing constant threats from enemy fire, disease, and poor sanitation.

### The Trench System

The Western Front was characterized by a complex system of trenches: front line, support line, and reserve line.`,
    books: [
      { title: 'Undertones of War', author: 'Edmund Blunden', description: 'One of the finest memoirs of the Western Front, written by a poet who survived to bear witness.' },
      { title: 'Goodbye to All That', author: 'Robert Graves', description: 'A savage, sardonic memoir of the trenches by the poet Robert Graves — funny and appalling by turns.' },
      { title: 'Tommy', author: 'Richard Holmes', description: 'A comprehensive portrait of the British soldier in WWI, from recruitment to demobilisation.' },
    ]
  },
  'd-day-landings': {
    image: 'https://images.unsplash.com/photo-1591198619115-56e5e2f0fc60?w=1280&q=80',
    imageCaption: 'Into the Jaws of Death — Omaha Beach, 6 June 1944 · US National Archives (Public Domain)',
    title: 'D-Day: The Normandy Landings',
    category: 'World War II',
    era: 'wwii',
    type: 'article',
    author: 'Chronica Editorial',
    date: '25 June 2024',
    subtitle: 'The largest amphibious invasion in history and the beginning of the end for Nazi Germany.',
    body: `D-Day, the Allied invasion of Normandy on 6 June 1944, was the largest amphibious invasion in history. Codenamed Operation Overlord, it marked a major turning point in World War II.

### Planning and Preparation

General Dwight D. Eisenhower led the planning, which involved a massive buildup of troops and supplies in Britain. The Allies used deception (Operation Fortitude) to mislead the Germans.`,
    books: [
      { title: 'D-Day: The Battle for Normandy', author: 'Antony Beevor', description: 'The definitive modern account of the Normandy campaign, from the beaches to the breakout.' },
      { title: 'The Longest Day', author: 'Cornelius Ryan', description: 'The founding classic of D-Day literature — told through hundreds of eyewitness accounts.' },
      { title: 'Overlord', author: 'Max Hastings', description: 'A frank, unsentimental account of the Normandy campaign that does not spare Allied commanders.' },
    ]
  },
  'end-of-wwii': {
    image: 'https://images.unsplash.com/photo-1560969184-10fe8719e047?w=1280&q=80',
    imageCaption: 'Soviet flag raised over the Reichstag, Berlin, 1945 · Public Domain',
    title: 'The End of World War II',
    category: 'World War II',
    era: 'wwii',
    type: 'article',
    author: 'Chronica Editorial',
    date: '30 June 2024',
    subtitle: 'The final months of the war in Europe and the Pacific, and the beginning of a new global order.',
    body: `The end of World War II in 1945 marked the conclusion of one of the most devastating conflicts in history, with an estimated 70-85 million deaths.

### The Fall of Berlin

By early 1945, Allied forces were closing in on Nazi Germany. The Battle of Berlin (16 April–2 May 1945) was the final major offensive in Europe. On 30 April, Adolf Hitler committed suicide.`,
    books: [
      { title: 'The Second World War', author: 'Antony Beevor', description: 'A single-volume global history of the conflict — authoritative, vivid, and admirably balanced.' },
      { title: 'Berlin: The Downfall 1945', author: 'Antony Beevor', description: 'A harrowing account of the final battle for the German capital, drawing on Soviet archives.' },
      { title: 'Hiroshima', author: 'John Hersey', description: 'The original and still irreplaceable account — six survivors tell what happened on 6 August 1945.' },
    ]
  }
};

function h(str) { 
  try {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); 
  } catch (error) {
    console.error('Error in h() function:', error);
    return str || '';
  }
}

function save() { 
  try {
    localStorage.setItem(STORE, JSON.stringify(state));
  } catch (error) {
    console.error('Error saving state:', error);
  }
}

function toast(msg) { 
  try {
    const t = document.getElementById('toast'); 
    t.textContent = msg; 
    t.classList.add('show'); 
    setTimeout(() => t.classList.remove('show'), 2800); 
  } catch (error) {
    console.error('Error showing toast:', error);
  }
}

// ── Auto Article Generation ──────────────────────────────────────
const AUTO_GEN_KEY = 'chronica-autogen-date';
const AUTO_GEN_COUNT = 'chronica-autogen-count';

const AUTO_GEN_TOPICS = [
  { era: 'ancient', category: 'Ancient World', topics: ['Persian Empire', 'Alexander the Great', 'Ancient Athens', 'Julius Caesar', 'Cleopatra', 'The Colosseum', 'Spartans', 'Egyptian Religion'] },
  { era: 'medieval', category: 'Medieval History', topics: ['The Crusades', 'Black Prince', 'Joan of Arc', 'Vikings in England', 'Magna Carta', 'Medieval Plague', 'Knights Templar', 'Byzantine Empire'] },
  { era: 'early-modern', category: 'Early Modern', topics: ['Spanish Armada', 'Galileo Galilei', 'The Reformation', 'Thirty Years War', 'Age of Exploration', 'The Medicis', 'Ottoman Siege of Vienna', 'English Civil War'] },
  { era: 'modern', category: 'Modern Era', topics: ['The French Revolution', 'Victorian Britain', 'The Suez Crisis', 'Rise of Japan', 'The Gold Rush', 'Darwin and Evolution', 'Crimean War', 'Meiji Restoration'] },
  { era: 'wwii', category: 'World War II', topics: ['Battle of Britain', 'Stalingrad', 'The Holocaust', 'Pacific Theatre', 'Resistance Movements', 'Churchill and the War Cabinet', 'Atomic Bomb Decision', 'Fall of Berlin'] },
];

async function autoGenerateArticles() {
  const today = new Date().toDateString();
  const lastDate = localStorage.getItem(AUTO_GEN_KEY);
  const countToday = parseInt(localStorage.getItem(AUTO_GEN_COUNT) || '0', 10);

  if (lastDate === today && countToday >= 3) return; // already generated today

  const toGenerate = lastDate === today ? (3 - countToday) : 3;
  if (toGenerate <= 0) return;

  toast('📰 Generating today\'s articles…');

  // Pick random topics not already in state
  const existingTitles = new Set(state.contents.map(c => c.title.toLowerCase()));
  let picked = [];
  const shuffled = AUTO_GEN_TOPICS.sort(() => Math.random() - 0.5);
  for (const group of shuffled) {
    for (const topic of group.topics.sort(() => Math.random() - 0.5)) {
      if (picked.length >= toGenerate) break;
      const slug = topic.toLowerCase();
      if ([...existingTitles].some(t => t.includes(slug.split(' ')[0]))) continue;
      picked.push({ ...group, topic });
      existingTitles.add(slug);
    }
    if (picked.length >= toGenerate) break;
  }

  let generated = lastDate === today ? countToday : 0;

  for (const pick of picked) {
    try {
      const prompt = `Write a Chronica history magazine article about: "${pick.topic}".

Return ONLY valid JSON (no markdown, no backticks) with these exact fields:
{
  "title": "compelling headline",
  "subtitle": "one-sentence deck (max 15 words)",
  "author": "Chronica Editorial",
  "body": "full article body (600-900 words). Use blank lines between paragraphs. Start sub-sections with ### Heading on its own line.",
  "books": [
    {"title": "...", "author": "...", "description": "one sentence annotation"},
    {"title": "...", "author": "...", "description": "one sentence annotation"},
    {"title": "...", "author": "...", "description": "one sentence annotation"}
  ]
}`;

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      const data = await res.json();
      const text = (data.content || []).map(b => b.text || '').join('');
      const clean = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);

      const readTime = estimateReadTime(parsed.body);
      const newItem = {
        id: Date.now() + generated,
        type: 'article',
        title: parsed.title || pick.topic,
        subtitle: parsed.subtitle || '',
        author: parsed.author || 'Chronica Editorial',
        body: parsed.body || '',
        books: parsed.books || [],
        category: pick.category,
        era: pick.era,
        date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
        readTimeLabel: readTime.label,
        readTimeMinutes: readTime.minutes,
        wordCount: readTime.words,
        autoGenerated: true,
      };

      state.contents.unshift(newItem);
      generated++;
      save();
    } catch (e) {
      console.error('Auto-gen error:', e);
    }
  }

  localStorage.setItem(AUTO_GEN_KEY, today);
  localStorage.setItem(AUTO_GEN_COUNT, String(generated));

  if (generated > 0) {
    renderFront();
    renderHero();
    toast(`✓ ${generated} new article${generated > 1 ? 's' : ''} published today`);
  }
}

// ── Read Counter ─────────────────────────────────────────────────
const READ_COUNTS_KEY = 'chronica-read-counts';

function getReadCounts() {
  try { return JSON.parse(localStorage.getItem(READ_COUNTS_KEY) || '{}'); } catch { return {}; }
}

function incrementReadCount(articleId) {
  const counts = getReadCounts();
  counts[articleId] = (counts[articleId] || 0) + 1;
  localStorage.setItem(READ_COUNTS_KEY, JSON.stringify(counts));
  return counts[articleId];
}

function getReadCount(articleId) {
  return getReadCounts()[articleId] || 0;
}

function formatReadCount(n) {
  if (n === 0) return '';
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k reads';
  return n + (n === 1 ? ' read' : ' reads');
}

// ── This Day in History ──────────────────────────────────────────
const TDIH_KEY = 'chronica-tdih';

async function renderThisDayWidget() {
  const wrap = document.getElementById('hero-wrap');
  if (!wrap) return;

  const today = new Date();
  const dateStr = today.toDateString();
  const dayMonth = today.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });

  // Check cache
  let cached = null;
  try { cached = JSON.parse(localStorage.getItem(TDIH_KEY) || 'null'); } catch {}
  if (cached && cached.date === dateStr && cached.events) {
    insertThisDayWidget(dayMonth, cached.events);
    return;
  }

  // Generate via API
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        messages: [{ role: 'user', content: `List 3 significant historical events that happened on ${dayMonth} in different years (spread across ancient, medieval/early-modern, and modern history). Return ONLY valid JSON array, no markdown:\n[{"year":"...","event":"one sentence description of what happened","era":"ancient|medieval|modern"}]` }]
      })
    });
    const data = await res.json();
    const text = (data.content || []).map(b => b.text || '').join('').replace(/```json|```/g, '').trim();
    const events = JSON.parse(text);
    localStorage.setItem(TDIH_KEY, JSON.stringify({ date: dateStr, events }));
    insertThisDayWidget(dayMonth, events);
  } catch(e) {
    console.error('TDIH error:', e);
    // Fallback: show a small static set of events so the widget is visible
    const fallbackEvents = [
      { year: '44 BC', event: 'Julius Caesar assassinated in Rome', era: 'ancient' },
      { year: '1453', event: 'Fall of Constantinople to the Ottoman Empire', era: 'medieval' },
      { year: '1944', event: 'Allied landings in Normandy (D-Day)', era: 'modern' }
    ];
    try { insertThisDayWidget(dayMonth, fallbackEvents); } catch (ie) { console.error('TDIH fallback failed', ie); }
  }
}

function insertThisDayWidget(dayMonth, events) {
  const existing = document.getElementById('tdih-widget');
  if (existing) existing.remove();

  const eraIcon = { ancient: '⚱', medieval: '⚔', modern: '🏭', default: '📜' };

  const widget = document.createElement('div');
  widget.id = 'tdih-widget';
  widget.className = 'tdih-widget';
  widget.innerHTML = `
    <div class="tdih-header">
      <span class="tdih-icon">📅</span>
      <span class="tdih-title">This Day in History</span>
      <span class="tdih-date">${dayMonth}</span>
    </div>
    <div class="tdih-events">
      ${events.map(ev => `
        <div class="tdih-event">
          <div class="tdih-year">${h(ev.year)}</div>
          <div class="tdih-event-icon">${eraIcon[ev.era] || eraIcon.default}</div>
          <div class="tdih-event-text">${h(ev.event)}</div>
        </div>
      `).join('')}
    </div>
  `;

  const frontPage = document.getElementById('front-page-content');
  if (frontPage) frontPage.parentNode.insertBefore(widget, frontPage);
}

// Series system disabled per request (no series UI)
const SERIES_LIST = {};
function getSeriesForArticle(id) { return null; }
function renderSeriesTrail(articleId) { return ''; }

// ── Era Article Counts ───────────────────────────────────────────
function getEraCount(eraId) {
  const sampleEra = ERAS.find(e => e.id === eraId);
  const sampleCount = sampleEra ? sampleEra.articles.length : 0;
  const userCount = state.contents.filter(c => c.era === eraId).length;
  return sampleCount + userCount;
}

window.addEventListener('DOMContentLoaded', init);
