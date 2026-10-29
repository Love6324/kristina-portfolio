export const escapeHTML = (value = '') => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// Content is editable. Never allow an edited URL to become executable markup.
export function safeURL(value, { media = false } = {}) {
  if (typeof value !== 'string' || /[\u0000-\u0020\\]/.test(value)) return '';
  if (media && value.startsWith('data:image/') && /^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/.test(value)) return value;
  if (media && /^data:video\/mp4;base64,[a-zA-Z0-9+/=]+$/.test(value)) return value;
  if (media && /^blob:https?:\/\//.test(value)) return value;
  if (/^https:\/\//i.test(value)) return value;
  if (!value || value.startsWith('/') || value.startsWith('//') || value.split('/').includes('..') || /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(value)) return '';
  return value;
}

export const published = list => (Array.isArray(list) ? list : []).filter(item => item.published === true);
export const formatDuration = seconds => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

export function validateContent(data) {
  const errors = [];
  if (!data || data.version !== 1) return ['Неподдерживаемый формат content.json'];
  for (const key of ['hero', 'about', 'contact']) if (!data[key] || typeof data[key] !== 'object') errors.push(`Нет раздела ${key}`);
  for (const key of ['cases','visuals','videos','services','reviews']) if (!Array.isArray(data[key])) errors.push(`Раздел ${key} должен быть списком`);
  if (errors.length) return errors;
  if (!safeURL(data.telegram) || !data.telegram.startsWith('https://t.me/')) errors.push('Укажите корректную ссылку Telegram');
  for (const key of ['cases','visuals','videos','services','reviews']) {
    const ids = new Set();
    for (const item of data[key]) {
      if (!item.id || !/^[a-z0-9-]+$/.test(item.id) || ids.has(item.id)) errors.push(`${key}: нужен уникальный id (латиница, цифры, дефис)`);
      ids.add(item.id);
    }
  }
  for (const item of data.videos) if (item.published && (!safeURL(item.src,{media:true}) || !safeURL(item.poster,{media:true}))) errors.push(`Видео ${item.id}: нужны файл и обложка`);
  for (const item of data.visuals) if (item.published && !safeURL(item.src,{media:true})) errors.push(`Визуал ${item.id}: нужен файл`);
  for (const item of data.cases) if (item.published && (!item.title || !item.client || !item.summary || !item.result || !item.tasks?.length || !item.actions?.length || (!item.materials?.length && !item.missingMaterials?.length))) errors.push(`Кейс ${item.id}: заполните клиента, результат, задачи, работу и материалы до публикации`);
  for (const item of data.reviews) if (item.published && (!item.name || !item.text)) errors.push(`Отзыв ${item.id}: заполните имя и текст`);
  return errors;
}

// Resolve selection against the current approved catalogue, never button text.
export function getTariffSelection(content, serviceId, tierIndex) {
  if (!/^\d+$/.test(String(tierIndex))) return null;
  const service = content.services.find(s => s.id === serviceId);
  const tier = content.pricing?.[serviceId]?.tiers[Number(tierIndex)];
  if (!service || !tier) return null;
  const price = [tier.price, tier.period].filter(Boolean).join(' ');
  return {
    label: `${service.label} · ${tier.name} — ${price}`,
    message: `Здравствуйте! Меня интересует ${service.label}, тариф «${tier.name}» (${price}). Хочу обсудить проект.`
  };
}

export function telegramDraftURL(base, message = '') {
  const url = new URL(base);
  if (url.protocol !== 'https:' || url.hostname !== 't.me' || !/^\/[a-zA-Z0-9_]+\/?$/.test(url.pathname)) return '';
  url.search = '';
  url.hash = '';
  if (message) url.searchParams.set('text', message);
  return url.href;
}
