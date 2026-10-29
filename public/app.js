import { escapeHTML as e, safeURL, published, formatDuration, validateContent, getTariffSelection, telegramDraftURL } from './lib.js';
import { hydrateDraftMedia } from './draft-store.js';

const $ = s => document.querySelector(s);
const embeddedAssets = document.getElementById('portfolio-assets');
const assetMap = embeddedAssets ? JSON.parse(embeddedAssets.textContent) : {};
const asset = path => assetMap[path] || path;
const page = document.body.dataset.page;
const draft = new URLSearchParams(location.search).get('draft') === '1';
const draftSuffix = draft ? '?draft=1' : '';
let data, mediaReturnFocus, currentReview = 0;
const arrow = '<span class="arrow" aria-hidden="true">↗</span>';
const btn = (text, href, cls = '', external = false) => `<a class="button ${cls}" href="${e(href)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${e(text)}${arrow}</a>`;
// Project calls to action lead to the contact block on the current page.
const telegram = (text = 'Обсудить проект', cls = 'lime') => btn(text, '#contacts', cls);
const home = id => `index.html${draftSuffix}${id ? `#${id}` : ''}`;
const caseURL = id => `case.html?id=${encodeURIComponent(id)}${draft ? '&draft=1' : ''}`;
const navItems = [['Обо мне','about'],['Кейсы','cases'],['Визуалы','visuals'],['Видео','video'],['Услуги','services'],['Вопросы','faq'],['Контакты','contacts']];
const nav = () => navItems.map(([label,id])=>`<a href="${id === 'cases' ? 'cases.html'+draftSuffix : home(id)}">${label}</a>`).join('');
const section = (id, num, label, title, description, body, extra = '') => `<section id="${id}" class="section ${extra}"><div class="wrap section-grid"><div class="section-intro reveal"><div class="eyebrow"><span class="num">${num}</span>${label}</div><h2>${e(title)}</h2>${description?`<p>${e(description)}</p>`:''}</div><div class="section-content reveal">${body}</div></div></section>`;

function renderHeader() {
  $('#site-header').innerHTML = `<header class="site-header"><div class="wrap header-inner"><a class="brand" href="${home('')}" aria-label="Mikhaleva — на главную"><span class="brand-mark" aria-hidden="true">✳</span><span class="brand-name">${e(data.brand)}<small>SMM · АВИТО · ГЕО</small></span></a><nav class="desktop-nav" aria-label="Основная навигация">${nav()}</nav><div class="header-actions">${telegram()}<button class="menu-toggle" aria-label="Открыть меню" aria-expanded="false" aria-controls="mobile-nav"><span></span><span></span></button></div></div><nav id="mobile-nav" class="mobile-nav" aria-label="Мобильная навигация" hidden>${nav()}</nav></header>`;
  const toggle = $('.menu-toggle');
  const menu = $('#mobile-nav');
  function closeMenu() { menu.hidden = true; toggle.setAttribute('aria-expanded','false'); toggle.setAttribute('aria-label','Открыть меню'); }
  toggle.addEventListener('click',()=>{ const open = menu.hidden; menu.hidden = !open; toggle.setAttribute('aria-expanded',String(open)); toggle.setAttribute('aria-label',open?'Закрыть меню':'Открыть меню'); });
  menu.addEventListener('click',event=>{ if(event.target.closest('a'))closeMenu(); });
  document.addEventListener('keydown',event=>{ if(event.key==='Escape'&&!menu.hidden){closeMenu();toggle.focus();} });
  matchMedia('(min-width:1191px)').addEventListener('change',event=>{if(event.matches)closeMenu();});
}

function renderFooter() {
  $('#site-footer').innerHTML = `<div id="contacts" class="wrap contact-wrap"><section class="contact reveal"><div><div class="eyebrow">Контакты</div><h2>${e(data.contact.title)}</h2></div><div><p>${e(data.contact.description)}</p><div class="contact-selection" id="contact-selection" role="status" aria-live="polite" hidden><span class="eyebrow">Вы выбрали</span><p id="contact-selection-label"></p><button class="text-button" type="button" data-clear-tariff>Сбросить выбор</button></div><div class="contact-messengers">${btn(data.contact.cta, safeURL(data.telegram), 'lime telegram-contact')}${data.contact.max?btn('Написать в MAX',safeURL(data.contact.max),'max-contact',true):''}</div></div></section></div><footer class="wrap footer"><div class="footer-top"><div><a class="footer-brand" href="${home('')}">${e(data.brand)}</a><p>SMM, Авито и геосервисы для малого и среднего бизнеса.</p></div><nav aria-label="Навигация в подвале">${nav()}</nav><div class="footer-contact"><div class="eyebrow">Связаться</div><a href="${e(safeURL(data.telegram))}" >${e(data.contact.handle)}</a>${data.contact.max?`<a href="${e(safeURL(data.contact.max))}" target="_blank" rel="noopener noreferrer">MAX ↗</a>`:''}</div></div><div class="footer-bottom"><span>© ${new Date().getFullYear()} ${e(data.name)}</span><span>Портфолио · SMM · Авито · Геосервисы</span><a class="top-link" href="#main">Наверх <span aria-hidden="true">↑</span></a></div></footer>`;
}

function updateContactSelection(selection = null) {
  const panel = $('#contact-selection');
  $('#contact-selection-label').textContent = selection?.label || '';
  panel.hidden = !selection;
  const href = telegramDraftURL(data.telegram, selection?.message || '');
  document.querySelectorAll('#contacts .telegram-contact, #contacts .contact-handle').forEach(link => link.href = href);
}

function emptyCase(filter = 'all') {
  const c = data.copy.cases;
  return `<div class="empty-case"><div class="eyebrow">Портфолио наполняется</div><h3>${e(c.emptyTitle)}</h3><p>${e(c.emptyText)}</p><div class="button-row">${telegram()}${page==='home'?btn('Все кейсы','cases.html'+draftSuffix):filter!=='all'?'<button class="button" data-reset-filter>Все направления <span aria-hidden="true">↗</span></button>':btn('На главную',home(''))}</div></div>`;
}
function caseCover(c, detail=false) {
  return c.cover&&safeURL(c.cover,{media:true}) ? `<img src="${e(safeURL(c.cover,{media:true}))}" alt="${e(c.coverAlt||c.client)}" loading="lazy" width="${c.coverWidth||900}" height="${c.coverHeight||650}">` : `<div class="case-photo-placeholder"><span class="eyebrow">${e(c.client)}</span><span>Фото проекта<br>будет добавлено</span><small>Место для реального материала</small></div>`;
}
function caseCard(c) {
  return `<a class="case-card case-${e(c.id)}" href="${caseURL(c.id)}"><div class="case-card-image">${caseCover(c)}${c.partner?'<span class="partner-badge">Проект партнёра</span>':''}</div><div class="case-card-copy"><div class="eyebrow">${e(c.services||c.category)}</div><div class="case-metric"><strong>${e(c.metric||'')}</strong><span>${e(c.metricLabel||c.summary)}</span></div><h3>${e(c.title)}</h3><p>${e(c.niche||c.client)}</p><span class="case-open">Смотреть кейс <span aria-hidden="true">↗</span></span></div></a>`;
}
function carousel(id, content, kind, label) {
  return `<div class="carousel carousel-${kind}" data-carousel="${e(id)}" role="region" aria-label="${e(label)}" aria-roledescription="карусель"><div class="carousel-tools"><span class="carousel-status" aria-live="polite">01 / ${String(content.length).padStart(2,'0')}</span><div class="carousel-buttons"><button type="button" class="round-button" data-slide="-1" aria-label="Назад: ${e(label)}">←</button><button type="button" class="round-button" data-slide="1" aria-label="Вперёд: ${e(label)}">→</button></div></div><div class="carousel-track" tabindex="0">${content.join('')}</div></div>`;
}
function featuredCases() {
  const cases = published(data.cases);
  return cases.length ? carousel('featured',cases.map(caseCard),'cases','Кейсы')+btn('Все кейсы','cases.html'+draftSuffix) : emptyCase();
}

function gallery() {
  const real = published(data.visuals);
  const items = real.length ? real : Array.from({length:6},(_,i)=>({id:`placeholder-${i+1}`,src:asset(`assets/images/visual-placeholder-${i+1}.webp`),title:'Место для вашей работы',placeholder:true}));
  const rows = [items.filter((_,i)=>i%2===0),items.filter((_,i)=>i%2===1)];
  function set(list, clone=false) {
    const repeated = [...list]; while(repeated.length<6) repeated.push(...list);
    return `<div class="gallery-set"${clone?' aria-hidden="true"':''}>${repeated.map(item=>`<button class="visual-card" data-visual="${e(item.id)}" aria-label="Открыть ${item.placeholder?'пример оформления':e(item.title)}"${clone?' tabindex="-1"':''}><img src="${e(safeURL(item.src,{media:true}))}" alt="${item.placeholder?'Графическая заглушка — не клиентская работа':e(item.title)}" width="${item.width||528}" height="${item.height||660}" loading="lazy">${item.placeholder?'<span class="placeholder-badge">Место для вашей работы</span>':''}</button>`).join('')}</div>`;
  }
  const result = rows.map((row,i)=>{ const list=row.length?row:rows[0];return `<div class="marquee-row ${i?'reverse':''}"><div class="gallery-track">${set(list)}${set(list,true)}</div></div>`;}).join('');
  return `${result}<button class="text-button" data-gallery-pause aria-pressed="false">Приостановить ленты</button>`;
}

function videoGrid() {
  const videos=published(data.videos);
  if(!videos.length)return '<p>Видео появятся здесь.</p>';
  const cards=videos.map((v,i)=>`<button class="video-card" data-video="${e(v.id)}" aria-label="Воспроизвести: ${e(v.title)}"><div class="video-thumb"><img src="${e(safeURL(v.poster,{media:true}))}" alt="${e(v.title)}" loading="lazy" width="400" height="711"><span class="video-play" aria-hidden="true">▶</span><span class="video-duration">${formatDuration(v.duration)}</span></div><div class="video-caption"><span class="num">${String(i+1).padStart(2,'0')}</span><span>${e(v.title)}</span></div></button>`);
  return carousel('videos',cards,'videos','Видео');
}

function services() {
  return `<p class="services-hint" id="services-hint">Выберите направление — нажмите на кнопку</p><div class="tabs" role="tablist" aria-label="Направления услуг" aria-describedby="services-hint">${data.services.map((s,i)=>`<button class="tab" role="tab" id="tab-${e(s.id)}" aria-controls="panel-${e(s.id)}" aria-selected="${i===0}" tabindex="${i===0?0:-1}" data-service="${e(s.id)}"><span class="tab-index" aria-hidden="true">${String(i+1).padStart(2,'0')}</span><span class="tab-label">${e(s.label)}</span><span class="tab-indicator" aria-hidden="true">${i===0?'✓':'↗'}</span></button>`).join('')}</div><div id="service-panel"></div>`;
}
function switchService(id, focus=false) {
  const s=data.services.find(s=>s.id===id);if(!s)return;
  const i=data.services.indexOf(s), pricing=data.pricing?.[id];
  document.querySelectorAll('[data-service]').forEach(tab=>{const on=tab.dataset.service===id;tab.setAttribute('aria-selected',String(on));tab.tabIndex=on?0:-1;tab.querySelector('.tab-indicator').textContent=on?'✓':'↗';if(on&&focus)tab.focus({preventScroll:true});});
  if(!pricing){$('#service-panel').innerHTML=`<div id="panel-${e(id)}" role="tabpanel" aria-labelledby="tab-${e(id)}"><h3>${e(s.title)}</h3><p>${e(s.description)}</p></div>`;return;}
  const items=(list,cls='')=>list?.length?`<ul class="tariff-items ${cls}">${list.map(item=>`<li><span aria-hidden="true">✓</span>${e(item)}</li>`).join('')}</ul>`:'';
  const tiers=pricing.tiers.map((t,tierIndex)=>`<article class="tariff-card${t.highlight?' tariff-highlight':''}"><div class="tariff-head"><span class="eyebrow">Тариф</span><h4>${e(t.name)}</h4><div class="tariff-price">${e(t.price)}${t.period?`<small>${e(t.period)}</small>`:''}</div>${t.description?`<p>${e(t.description)}</p>`:''}</div><div class="tariff-body"><div class="eyebrow">Что входит</div>${items(t.items)}${t.extra?.length?`<div class="tariff-extra"><div class="eyebrow">Дополнительно</div>${items(t.extra)}</div>`:''}${t.note?`<p class="tariff-note">${e(t.note)}</p>`:''}</div><a class="button lime" href="#contacts" data-tariff-service="${e(id)}" data-tariff-index="${tierIndex}">Выбрать тариф${arrow}</a></article>`).join('');
  $('#service-panel').innerHTML=`<div class="service-panel pricing-panel" id="panel-${e(id)}" role="tabpanel" aria-labelledby="tab-${e(id)}" tabindex="0"><div class="pricing-intro"><div class="eyebrow">${String(i+1).padStart(2,'0')} / 03</div><h3>${e(s.title)}</h3><p>${e(s.description)}</p>${pricing.intro?`<p>${e(pricing.intro)}</p>`:''}${id==='smm'?`<p class="social-footnote">Instagram* принадлежит Meta, признанной экстремистской организацией и запрещённой в РФ.</p>`:''}</div><div class="tariff-grid">${tiers}</div></div>`;
}

function faq() {
  return `<div class="faq-list">${(data.faq||[]).map((item,i)=>`<details class="faq-item"><summary><span class="faq-number">${String(i+1).padStart(2,'0')}</span><span class="faq-question">${e(item.question)}</span><span class="faq-toggle" aria-hidden="true">+</span></summary><div class="faq-answer"><p>${e(item.answer)}</p></div></details>`).join('')}</div>`;
}

function reviews() {
  const list=published(data.reviews);
  const controls=`<div class="reviews-toolbar"><span class="review-status" aria-live="polite">${list.length?`1 / ${list.length}`:'Отзывы ещё не добавлены'}</span><button class="round-button" data-review-prev aria-label="Предыдущий отзыв" disabled>←</button><button class="round-button" data-review-next aria-label="Следующий отзыв"${list.length<2?' disabled':''}>→</button></div>`;
  if (!list.length) return controls+`<div class="empty-review"><span class="asterisk" aria-hidden="true">✳</span><h3>${e(data.copy.reviews.emptyTitle)}</h3><p>${e(data.copy.reviews.emptyText)}</p></div>`;
  return `${controls}<div class="reviews-viewport" aria-roledescription="карусель" aria-label="Отзывы клиентов"><div class="reviews-track">${list.map((r,i)=>`<article class="review-card" aria-label="Отзыв ${i+1} из ${list.length}"${i?' aria-hidden="true"':''}><div class="review-quote" aria-hidden="true">“</div><blockquote>${e(r.text)}</blockquote><cite>${e(r.name)}</cite>${r.company?`<p>${e(r.company)}</p>`:''}${r.image&&safeURL(r.image,{media:true})?`<button class="text-button" data-review-image="${e(r.id)}">Открыть скриншот отзыва</button>`:''}</article>`).join('')}</div></div>`;
}
function moveReview(direction) {
  const list=published(data.reviews);currentReview=Math.max(0,Math.min(list.length-1,currentReview+direction));
  const track=$('.reviews-track');if(!track)return;
  track.style.transform=`translateX(calc(-${currentReview*100}% - ${currentReview*24}px))`;
  track.querySelectorAll('.review-card').forEach((card,i)=>{card.setAttribute('aria-hidden',String(i!==currentReview));card.inert=i!==currentReview;});
  $('[data-review-prev]').disabled=currentReview===0;$('[data-review-next]').disabled=currentReview===list.length-1;$('.review-status').textContent=`${currentReview+1} / ${list.length}`;
}

function renderHome() {
  const ticker=['SMM-стратегия','Авито','Геосервисы','Контент-план','Оформление','Тексты объявлений','Аналитика','Отзывы','Карточки компаний','Продвижение'];
  $('#main').innerHTML = `<section class="wrap hero"><div class="hero-copy"><div class="eyebrow">${e(data.hero.eyebrow)}</div><h1>${e(data.hero.title)}</h1><p>${e(data.hero.subtitle)}</p><div class="button-row">${btn(data.hero.primary,'cases.html'+draftSuffix,'dark')}${telegram(data.hero.secondary)}</div></div><div class="hero-art"><img src="assets/images/chrome.svg" width="520" height="520" alt="Серебристая хромированная скульптура"><span class="object-label" aria-hidden="true">SMM · АВИТО · ГЕО</span></div></section><div class="ticker" aria-hidden="true"><div class="ticker-track">${Array(2).fill(`<div class="ticker-group">${ticker.map(t=>`<span>${t}</span>`).join('')}</div>`).join('')}</div></div><section id="about" class="wrap about"><div class="portrait reveal"><img src="${e(safeURL(data.about.photo||'assets/images/about-placeholder.webp',{media:true}))}" width="923" height="1231" alt="${data.about.photo?'Кристина':'Графическая заглушка для фотографии Кристины'}" loading="lazy">${data.about.photo?'':'<span class="portrait-label">Фото появится здесь</span>'}</div><div class="reveal"><div class="eyebrow">Обо мне</div><h2>${e(data.about.title)}</h2>${data.about.paragraphs.map(p=>`<p>${e(p)}</p>`).join('')}<div class="about-bottom">${telegram(data.about.cta)}</div></div></section>${section('cases','01','Портфолио',data.copy.cases.title,data.copy.cases.description,featuredCases())}${section('visuals','02','Визуалы',data.copy.visuals.title,data.copy.visuals.description,gallery(),'gallery-section')}${section('video','03','Видео',data.copy.videos.title,data.copy.videos.description,videoGrid())}${section('services','04','Услуги',data.copy.services.title,data.copy.services.description,services())}${section('faq','05','FAQ','Частые вопросы','',faq())}`;
  if(data.services.length)switchService(data.services[0].id);
}

function renderCatalog() {
  $('#main').innerHTML=`<div class="wrap page-hero"><a class="breadcrumb" href="${home('')}">← На главную</a><div class="eyebrow">Портфолио</div><h1>Все кейсы</h1></div><section class="wrap catalog" aria-label="Каталог проектов"><div class="filter-bar" role="group" aria-label="Фильтр кейсов">${[['all','Все проекты'],['SMM','SMM'],['Авито','Авито'],['Геосервисы','Геосервисы']].map(([id,label])=>`<button class="filter" data-filter="${id}" aria-pressed="${id==='all'}">${label}</button>`).join('')}</div><div id="catalog-results" aria-live="polite"></div></section>`;
  filterCatalog('all');
}
function filterCatalog(category) {
  const list=published(data.cases).filter(c=>category==='all'||(c.categories||[c.category]).includes(category));
  document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter===category)));
  $('#catalog-results').innerHTML=`<div class="catalog-status">${category==='all'?'Все направления':e(category)} · проектов: ${list.length}</div>${list.length?carousel('catalog',list.map(caseCard),'cases','Кейсы'):emptyCase(category)}`;
}

function renderCase() {
  const id=new URLSearchParams(location.search).get('id');const c=published(data.cases).find(c=>c.id===id);
  if(!c){$('#main').innerHTML=`<div class="wrap not-found"><div class="eyebrow">Портфолио</div><h1>Кейс пока не опубликован</h1><p>Этот проект ещё не добавлен или ссылка изменилась.</p>${btn('Все кейсы','cases.html'+draftSuffix,'dark')}</div>`;return;}
  document.title=`${c.title} — Кристина Михалева`;
  const listSection=(title,items)=>`<section class="case-section reveal"><h2>${e(title)}</h2><ul>${items.map(i=>`<li>${e(i)}</li>`).join('')}</ul></section>`;
  const mediaSection=(kind,title)=>{
    const items=c.materials.map((m,i)=>({m,i})).filter(({m})=>(m.kind||'content')===kind);
    if(!items.length)return '';
    return `<section class="case-section case-media-section reveal"><h2>${e(title)}</h2><div class="case-materials case-materials-${kind}">${items.map(({m,i})=>`<figure class="${m.height>m.width*1.3?'material-portrait':'material-landscape'}"><button data-case-image="${i}" data-case="${e(c.id)}" aria-label="Открыть: ${e(m.caption||'Материал '+(i+1))}"><img src="${e(safeURL(m.src,{media:true}))}" alt="${e(m.caption||c.title)}" width="${m.width}" height="${m.height}" loading="lazy"><span class="image-zoom" aria-hidden="true">Увеличить ↗</span></button><figcaption>${e(m.caption||'')}</figcaption></figure>`).join('')}</div></section>`;
  };
  $('#main').innerHTML=`<article class="wrap case-detail case-${e(c.id)}"><div class="page-hero"><a class="breadcrumb" href="cases.html${draftSuffix}">← Все кейсы</a><div class="eyebrow">${e(c.services||c.category)}</div>${c.partner?'<span class="partner-badge detail-badge">Проект партнёра</span>':''}<h1>${e(c.title)}</h1>${c.partnerNote?`<p class="partner-note">${e(c.partnerNote)}</p>`:''}<dl class="case-facts"><div><dt>Ниша</dt><dd>${e(c.niche||c.client)}</dd></div><div><dt>Услуги</dt><dd>${e(c.services||c.category)}</dd></div>${c.region?`<div><dt>Регион</dt><dd>${e(c.region)}</dd></div>`:''}${c.period?`<div><dt>Период</dt><dd>${e(c.period)}</dd></div>`:''}</dl></div><div class="case-cover">${c.cover?`<button data-case-cover="${e(c.id)}" aria-label="Увеличить обложку">${caseCover(c,true)}<span class="image-zoom">Увеличить ↗</span></button>`:caseCover(c,true)}</div><section class="case-section reveal"><h2>О проекте</h2>${(c.about||[c.client]).map(p=>`<p>${e(p)}</p>`).join('')}</section>${listSection('Задача',c.tasks)}${listSection(c.actionsTitle||'Что сделали',c.actions)}<section class="case-section case-outcome reveal"><h2>${e(c.resultTitle||'Результаты')}</h2><p class="case-result-short">${e(c.result)}</p>${c.results?.length?`<ul>${c.results.map(r=>`<li>${e(r)}</li>`).join('')}</ul>`:''}${c.resultNote?`<p class="case-result-note">${e(c.resultNote)}</p>`:''}</section>${mediaSection('statistics','Статистика')}${mediaSection('content','Примеры работ')}<div class="case-section case-end"><h2>Обсудим ваш проект?</h2>${telegram('Хочу так же')}</div><nav class="case-neighbors" aria-label="Другие кейсы">${published(data.cases).filter(x=>x.id!==id).map(x=>`<a href="${caseURL(x.id)}">${e(x.title)} ↗</a>`).join('')}</nav></article>`;
}

function openMedia(kind, item, trigger) {
  const dialog=$('#media-dialog'),body=$('#media-body');mediaReturnFocus=trigger;
  const src=safeURL(kind==='video'?item.src:item.src||item.image,{media:true});if(!src)return;
  body.innerHTML=kind==='video'?`<video class="modal-video" controls playsinline preload="metadata" poster="${e(safeURL(item.poster,{media:true}))}"><source src="${e(src)}" type="video/mp4">Ваш браузер не поддерживает воспроизведение видео.</video><div class="modal-caption"><div>${e(item.title)}<p>${item.duration?formatDuration(item.duration):''}</p></div><p class="eyebrow">${e(item.category||'')}</p></div><p class="media-error" role="alert" hidden>Видео не удалось загрузить. <a href="${e(src)}" target="_blank" rel="noopener noreferrer">Открыть файл отдельно</a></p>`:`<img class="modal-image" src="${e(src)}" alt="${e(item.title||item.caption||'Материал проекта')}"><div class="modal-caption"><div>${e(item.title||item.caption||'Материал проекта')}${item.placeholder?'<p class="image-placeholder-label">Графическая заглушка — не клиентская работа</p>':''}</div></div>`;
  dialog.showModal();
  const video=body.querySelector('video');
  if(video){
    const controls=document.createElement('div');controls.className='media-controls';controls.innerHTML='<button data-media-pause>Пауза</button><button data-media-mute aria-pressed="false">Выключить звук</button>';video.after(controls);
    const updatePause=()=>{controls.querySelector('[data-media-pause]').textContent=video.paused?'Воспроизвести':'Пауза';};
    video.addEventListener('pause',updatePause);video.addEventListener('play',updatePause);
    controls.querySelector('[data-media-pause]').addEventListener('click',()=>{if(video.paused)video.play().catch(updatePause);else video.pause();});
    const mute=controls.querySelector('[data-media-mute]');mute.addEventListener('click',()=>{video.muted=!video.muted;});
    video.addEventListener('volumechange',()=>{mute.setAttribute('aria-pressed',String(video.muted));mute.textContent=video.muted?'Включить звук':'Выключить звук';});
    const onError=()=>{const message=body.querySelector('.media-error');if(video.isConnected&&message)message.hidden=false;};
    video.addEventListener('error',onError);video.querySelector('source').addEventListener('error',onError);video.play().catch(updatePause);
  }
}
function closeMedia() {const dialog=$('#media-dialog');if(!dialog.open)return;dialog.close();}
function wireInteractions() {
  const dialog=$('#media-dialog');
  $('.modal-close').addEventListener('click',closeMedia);
  dialog.addEventListener('click',event=>{if(event.target===dialog)closeMedia();});
  dialog.addEventListener('close',()=>{const video=dialog.querySelector('video');if(video){video.pause();video.removeAttribute('src');video.querySelectorAll('source').forEach(s=>s.removeAttribute('src'));video.load();}$('#media-body').replaceChildren();if(mediaReturnFocus?.isConnected)mediaReturnFocus.focus({preventScroll:true});});
  document.addEventListener('click',event=>{
    if(event.target.closest('[data-clear-tariff]')){updateContactSelection();$('#contacts .button').focus({preventScroll:true});return;}
    const contactLink=event.target.closest('a[href="#contacts"]');
    if(contactLink){
      event.preventDefault();
      const selection = contactLink.hasAttribute('data-tariff-service')
        ? getTariffSelection(data, contactLink.dataset.tariffService, contactLink.dataset.tariffIndex)
        : null;
      updateContactSelection(selection);
      const contact=document.getElementById('contacts');
      contact.querySelector('.reveal')?.classList.remove('ready');
      contact.querySelector('.reveal')?.classList.add('visible');
      const top=Math.max(0,window.scrollY+contact.getBoundingClientRect().top-(parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop)||0));
      if(matchMedia('(prefers-reduced-motion: reduce)').matches){window.scrollTo({top,behavior:'instant'});}else{const start=window.scrollY,distance=top-start,began=performance.now();const animate=now=>{const t=Math.min(1,(now-began)/300);window.scrollTo({top:start+distance*(1-Math.pow(1-t,3)),behavior:'instant'});if(t<1)requestAnimationFrame(animate);};requestAnimationFrame(animate);}
      history.replaceState(null,'','#contacts');
      return;
    }
    const slide=event.target.closest('[data-slide]');if(slide){const track=slide.closest('[data-carousel]').querySelector('.carousel-track');const card=track.firstElementChild;if(card){const gap=parseFloat(getComputedStyle(track).columnGap)||0;track.scrollBy({left:Number(slide.dataset.slide)*(card.getBoundingClientRect().width+gap),behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});}return;}
    const cover=event.target.closest('[data-case-cover]');if(cover){const c=published(data.cases).find(c=>c.id===cover.dataset.caseCover);if(c?.cover)openMedia('image',{src:c.cover,title:c.coverAlt||c.title},cover);}
    const video=event.target.closest('[data-video]');if(video){const item=published(data.videos).find(v=>v.id===video.dataset.video);if(item)openMedia('video',item,video);}
    const visual=event.target.closest('[data-visual]');if(visual){const id=visual.dataset.visual;const item=id.startsWith('placeholder-')?{title:'Место для вашей работы',src:asset(`assets/images/visual-placeholder-${id.split('-').pop()}.webp`),placeholder:true}:published(data.visuals).find(v=>v.id===id);if(item)openMedia('image',item,visual);}
    const cimg=event.target.closest('[data-case-image]');if(cimg){const c=published(data.cases).find(c=>c.id===cimg.dataset.case);const m=c?.materials[Number(cimg.dataset.caseImage)];if(m)openMedia('image',m,cimg);}
    const rimg=event.target.closest('[data-review-image]');if(rimg){const r=published(data.reviews).find(r=>r.id===rimg.dataset.reviewImage);if(r)openMedia('image',{src:r.image,title:r.name},rimg);}
    const tab=event.target.closest('[data-service]');if(tab)switchService(tab.dataset.service);
    const filter=event.target.closest('[data-filter]');if(filter)filterCatalog(filter.dataset.filter);
    if(event.target.closest('[data-reset-filter]'))filterCatalog('all');
    if(event.target.closest('[data-review-prev]'))moveReview(-1);
    if(event.target.closest('[data-review-next]'))moveReview(1);
    const pause=event.target.closest('[data-gallery-pause]');if(pause){const paused=pause.getAttribute('aria-pressed')!=='true';pause.setAttribute('aria-pressed',String(paused));pause.textContent=paused?'Продолжить движение':'Приостановить ленты';$('#visuals').classList.toggle('gallery-paused',paused);}
  });
  document.addEventListener('scroll',event=>{const track=event.target;if(!track.classList?.contains('carousel-track'))return;const carousel=track.closest('[data-carousel]'), cards=[...track.children];if(!cards.length)return;const step=cards[0].getBoundingClientRect().width+(parseFloat(getComputedStyle(track).columnGap)||0);const position=Math.min(cards.length,Math.max(1,Math.round(track.scrollLeft/step)+1));carousel.querySelector('.carousel-status').textContent=`${String(position).padStart(2,'0')} / ${String(cards.length).padStart(2,'0')}`;},true);
  document.addEventListener('keydown',event=>{const tab=event.target.closest('[data-service]');if(!tab)return;const i=data.services.findIndex(s=>s.id===tab.dataset.service);let next;if(event.key==='ArrowRight')next=(i+1)%data.services.length;if(event.key==='ArrowLeft')next=(i-1+data.services.length)%data.services.length;if(event.key==='Home')next=0;if(event.key==='End')next=data.services.length-1;if(next!==undefined){event.preventDefault();switchService(data.services[next].id,true);}});
}

function revealSections() {
  if(matchMedia('(prefers-reduced-motion:reduce)').matches||!('IntersectionObserver' in window))return;
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target);}}),{threshold:.06,rootMargin:'0px 0px 25px 0px'});
  document.querySelectorAll('.reveal').forEach(el=>{el.classList.add('ready');observer.observe(el);});
}

async function init() {
  try{
    const response=await fetch('content.json');if(!response.ok)throw Error('Не удалось загрузить содержание');data=await response.json();
    if(draft){try{const stored=localStorage.getItem('kristina-portfolio-draft');if(stored)data=JSON.parse(stored);}catch{/* No browser storage: use repository content. */}}
    const errors=validateContent(data);if(errors.length)throw Error(errors.join('; '));
    if(draft){try{data=await hydrateDraftMedia(data);}catch{/* Existing files remain usable when IndexedDB is disabled. */}}
    renderHeader();renderFooter();if(page==='home')renderHome();else if(page==='cases')renderCatalog();else renderCase();
    if(draft){const banner=document.createElement('div');banner.className='draft-banner';banner.innerHTML='Локальный черновик. Изменения не опубликованы. <a href="content-editor.html">Вернуться к редактору</a>';document.body.prepend(banner);}
    $('#main').classList.add('route-enter');wireInteractions();revealSections();
    if(location.hash){const target=document.getElementById(decodeURIComponent(location.hash.slice(1)));target?.scrollIntoView({behavior:'instant'});}
    document.documentElement.dataset.ready='true';
  }catch(error){console.error(error);$('#main').innerHTML=`<section class="wrap not-found"><h1>Не удалось загрузить портфолио</h1><p>Попробуйте обновить страницу.</p>${btn('Написать в Telegram','https://t.me/MikhalevaKS','lime',true)}</section>`;}
}
init();
