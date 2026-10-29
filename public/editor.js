import {escapeHTML as e,validateContent,safeURL} from './lib.js';
import {saveDraftFile,draftFiles,clearDraftFiles} from './draft-store.js';
import {makeZip} from './zip.js';

let content, original, uploadBusy = false;
const $=s=>document.querySelector(s),storeKey='kristina-portfolio-draft';
const uid=()=>[...crypto.getRandomValues(new Uint8Array(16))].map(n=>n.toString(16).padStart(2,'0')).join('');
const status=(text,error=false)=>{const node=$('#editor-status');node.textContent=text;node.style.color=error?'#a12e20':'';};
const invalidateExport=()=>{const link=$('#download-prepared');if(link){URL.revokeObjectURL(link.href);link.remove();}};
const get=path=>path.split('.').reduce((obj,key)=>obj?.[key],content);
const set=(path,value)=>{const parts=path.split('.'),last=parts.pop();parts.reduce((obj,key)=>obj[key],content)[last]=value;};
const labels={metric:'Крупная цифра',metricLabel:'Подпись результата',niche:'Ниша',services:'Услуги',region:'Регион',about:'О проекте — абзацы по строкам',results:'Результаты — по одному на строку',resultNote:'Пояснение к результату',partner:'Проект партнёра',partnerNote:'Авторство партнёра',missingMaterials:'Недостающие материалы — по одному на строку',id:'ID — латиница, цифры и дефис',title:'Заголовок',name:'Имя',category:'Направление',published:'Показывать на сайте',featured:'Избранный проект',client:'Описание клиента',summary:'Краткий результат',tasks:'Задачи — по одной на строку',actions:'Что было сделано — по одному пункту на строку',result:'Основной результат',period:'Период работы',cover:'Обложка',src:'Файл',poster:'Обложка видео',duration:'Длительность в секундах',text:'Текст отзыва',company:'Компания / подпись',image:'Скриншот отзыва',description:'Описание',price:'Стоимость',items:'Состав работ — по одному пункту на строку',label:'Название вкладки',photo:'Фото',stat:'Показатель',statLabel:'Подпись показателя',cta:'Текст кнопки',paragraphs:'Абзацы — разделяйте пустой строкой',eyebrow:'Надпись над заголовком',subtitle:'Подзаголовок',primary:'Первая кнопка',secondary:'Вторая кнопка',handle:'Telegram',emptyTitle:'Заголовок пустого блока',emptyText:'Текст пустого блока',materials:'Материалы — JSON',brand:'Логотип / имя',telegram:'Ссылка на Telegram'};
const multiline=new Set(['description','text','client','summary','result','emptyText','subtitle']);
const media=new Set(['src','poster','cover','image','photo']);
function field(path,label,type){
  const value=get(path),key=path.split('.').pop(),id='field-'+path.replaceAll('.','-');label=label||labels[key]||key;
  let input;
  if(typeof value==='boolean')input=`<input id="${id}" type="checkbox" data-path="${path}"${value?' checked':''}>`;
  else if(type==='materials')input=`<textarea id="${id}" class="editor-json" data-path="${path}" data-type="json" spellcheck="false">${e(JSON.stringify(value,null,2))}</textarea><span class="editor-hint">Формат: [{"src":"assets/images/файл.webp","caption":"Подпись"}]. Файлы из галереи можно использовать по тому же пути.</span>`;
  else if(Array.isArray(value))input=`<textarea id="${id}" data-path="${path}" data-type="${key==='paragraphs'?'paragraphs':'lines'}">${e(value.join(key==='paragraphs'?'\n\n':'\n'))}</textarea>`;
  else if(key==='category')input=`<select id="${id}" data-path="${path}">${(path.startsWith('videos')?['Разговорный ролик','Базовый монтаж']:['SMM','Авито','Геосервисы']).map(option=>`<option${option===value?' selected':''}>${option}</option>`).join('')}</select>`;
  else if(typeof value==='number')input=`<input id="${id}" type="number" min="0" max="86400" data-path="${path}" data-type="number" value="${Number(value)}">`;
  else if(multiline.has(key))input=`<textarea id="${id}" data-path="${path}">${e(value||'')}</textarea>`;
  else input=`<input id="${id}" data-path="${path}" value="${e(value||'')}" spellcheck="${media.has(key)?'false':'true'}">`;
  if(media.has(key)){const video=path.startsWith('videos.')&&key==='src';input+=`<span class="upload-label">Добавить ${video?'MP4':'изображение'} <input aria-label="Загрузить файл: ${e(label)}" type="file" data-upload="${path}" accept="${video?'video/mp4,.mp4':'image/jpeg,image/png,image/webp'}"></span><span class="editor-hint">${video?'Для браузеров используйте MP4 H.264/AAC. MOV предварительно конвертируйте.':'Фото JPG, PNG или WebP.'} Файл попадёт в ZIP изменений. Для просмотра используйте «Просмотреть черновик».</span>`;}
  return `<div class="editor-field"><label for="${id}">${e(label)}</label>${input}</div>`;
}
function objectFields(path,keys){return keys.map(key=>field(`${path}.${key}`)).join('');}
const definitions={
  cases:{title:'Кейсы',keys:['id','title','category','client','niche','services','region','period','metric','metricLabel','summary','about','tasks','actions','result','results','resultNote','partner','partnerNote','cover','materials','missingMaterials','featured','published'],defaults:{title:'',category:'Авито',client:'',period:'',summary:'',tasks:[],actions:[],result:'',cover:'',materials:[],featured:false,published:false}},
  visuals:{title:'Визуалы',keys:['id','title','src','published'],defaults:{title:'',src:'',published:false}},
  videos:{title:'Видео',keys:['id','title','category','src','poster','duration','published'],defaults:{title:'',category:'Базовый монтаж',src:'',poster:'',duration:0,published:false}},
  reviews:{title:'Отзывы',keys:['id','name','company','text','image','published'],defaults:{name:'',company:'',text:'',image:'',published:false}},
  services:{title:'Услуги и тарифы',keys:['id','label','title','description','price','items'],defaults:null}
};
function collection(key){
  const def=definitions[key];
  return `<details class="editor-section" data-section="${key}"><summary>${def.title} <small>(${content[key].length})</small></summary><div class="editor-section-content">${key==='cases'?'<p class="editor-warning">Публикуйте только заполненные реальные проекты. У неопубликованных кейсов нет публичной страницы.</p>':''}${content[key].map((item,i)=>`<details class="editor-row" id="item-${key}-${i}"><summary>${e(item.title||item.name||'Новый материал')} ${item.published===false?'· черновик':''}</summary><div class="editor-item-fields">${def.keys.map(prop=>field(`${key}.${i}.${prop}`,null,prop==='materials'?'materials':null)).join('')}${def.defaults?`<div class="editor-row-actions"><button class="text-button" data-up="${key}.${i}"${i===0?' disabled':''}>Выше ↑</button><button class="text-button" data-down="${key}.${i}"${i===content[key].length-1?' disabled':''}>Ниже ↓</button><button class="text-button" data-remove="${key}.${i}">Удалить из черновика</button></div>`:''}</div></details>`).join('')}${def.defaults?`<button class="button editor-add" data-add="${key}">Добавить ${key==='cases'?'кейс':key==='videos'?'видео':key==='reviews'?'отзыв':'визуал'} +</button>`:''}</div></details>`;
}
function render(){
  invalidateExport();
  const fields=$('#editor-fields');
  const open=[...fields.querySelectorAll('details[open]')].map(d=>d.id||d.dataset.section).filter(Boolean);
  fields.innerHTML=`<details class="editor-section" data-section="main"><summary>Главная и контакты</summary><div class="editor-section-content">${field('name','Имя и фамилия')}${field('brand')}${field('telegram')}<h2 class="subheading">Первый экран</h2>${objectFields('hero',['eyebrow','title','subtitle','primary','secondary'])}<h2 class="subheading">Обо мне</h2>${objectFields('about',['title','paragraphs','photo','stat','statLabel','cta'])}<h2 class="subheading">Контакты</h2>${objectFields('contact',['title','description','cta','handle'])}</div></details>${Object.keys(definitions).map(collection).join('')}<details class="editor-section" data-section="copy"><summary>Названия и описания разделов</summary><div class="editor-section-content">${Object.keys(content.copy).map(section=>`<h2 class="subheading">${e(content.copy[section].title)}</h2>${Object.keys(content.copy[section]).map(key=>field(`copy.${section}.${key}`)).join('')}`).join('')}</div></details>`;
  open.forEach(id=>{const target=document.getElementById(id)||fields.querySelector(`[data-section="${id}"]`);if(target)target.open=true;});
}
function save({strict=false}={}){
  if(document.querySelector('[data-type="json"]:invalid')){status('Исправьте JSON материалов перед сохранением.',true);return false;}
  const errors=validateContent(content);
  if(strict&&errors.length){status(errors.join(' · '),true);return false;}
  try{localStorage.setItem(storeKey,JSON.stringify(content));status(errors.length?'Черновик сохранён. Перед просмотром: '+errors.join(' · '):'Черновик сохранён в этом браузере. Сайт не опубликован.',!!errors.length);return true;}catch{status('Браузер не разрешил сохранение. Скачайте ZIP изменений.',true);return false;}
}
async function exportContent(){
  if(uploadBusy){status('Дождитесь добавления файла.',true);return;}
  if(validateContent(content).length){status('Сначала исправьте ошибки: '+validateContent(content).join(' · '),true);return;}
  status('Подготавливаю ZIP…');
  const entries=[['content.json',new Blob([JSON.stringify(content,null,2)+'\n'],{type:'application/json'})],...await draftFiles()];
  const old=$('#download-prepared');if(old){URL.revokeObjectURL(old.href);old.remove();}
  const blob=await makeZip(entries);const url=URL.createObjectURL(blob);const link=document.createElement('a');link.id='download-prepared';link.className='button lime';link.href=url;link.download='portfolio-changes.zip';link.textContent='Скачать подготовленный ZIP ↓';$('.editor-toolbar').append(link);link.addEventListener('click',()=>status('Скачивание началось. ZIP содержит content.json и новые файлы. Замените соответствующие файлы в репозитории и проверьте сайт перед публикацией.'));status('ZIP подготовлен. Нажмите «Скачать подготовленный ZIP». Сайт не изменён.');
}
$('#editor-fields').addEventListener('input',event=>{
  const input=event.target,path=input.dataset.path;if(!path)return;
  try{let value=input.type==='checkbox'?input.checked:input.value;if(input.dataset.type==='lines')value=value.split('\n').map(s=>s.trim()).filter(Boolean);if(input.dataset.type==='paragraphs')value=value.split(/\n\s*\n/).map(s=>s.trim()).filter(Boolean);if(input.dataset.type==='number')value=Number(value);if(input.dataset.type==='json')value=JSON.parse(value);set(path,value);invalidateExport();input.setCustomValidity('');status('Есть несохранённые изменения.');}catch{input.setCustomValidity('Проверьте JSON');status('В материалах некорректный JSON. Изменение не сохранено.',true);}
});
$('#editor-fields').addEventListener('change',async event=>{
  const input=event.target;if(!input.dataset.upload||!input.files?.[0])return;const file=input.files[0],path=input.dataset.upload;
  const video=path.startsWith('videos.')&&path.endsWith('.src');
  const ext=file.name.split('.').pop().toLowerCase();
  if(video?ext!=='mp4':!['jpg','jpeg','png','webp'].includes(ext)){status('Неподдерживаемый формат файла.',true);return;}
  if(file.size>(video?100:15)*1024*1024){status('Файл слишком большой: видео до 100 МБ, изображения до 15 МБ.',true);return;}
  const filename=`assets/${video?'videos':'images'}/upload-${uid()}.${ext}`;
  try{uploadBusy=true;status('Сохраняю файл в локальный черновик…');await saveDraftFile(filename,file);set(path,filename);save();render();}catch{status('Браузер не смог сохранить файл. Попробуйте уменьшить размер.',true);}finally{uploadBusy=false;}
});
$('#editor-fields').addEventListener('click',event=>{
  const add=event.target.closest('[data-add]');if(add){const key=add.dataset.add;content[key].push({id:`${key}-${uid().slice(0,8)}`,...structuredClone(definitions[key].defaults)});render();$(`[data-section="${key}"]`).open=true;$(`#item-${key}-${content[key].length-1}`).open=true;status('Новый материал добавлен в черновик.');}
  for(const action of ['remove','up','down']){const button=event.target.closest(`[data-${action}]`);if(!button)continue;const[key,index]=button.dataset[action].split('.');const i=Number(index);if(action==='remove')content[key].splice(i,1);else{const j=i+(action==='up'?-1:1);if(j<0||j>=content[key].length)return;[content[key][i],content[key][j]]=[content[key][j],content[key][i]];}render();status('Есть несохранённые изменения.');}
});
$('#save-draft').addEventListener('click',()=>save());
$('#preview-draft').addEventListener('click',()=>{if(uploadBusy){status('Дождитесь добавления файла.',true);return;}if(save({strict:true}))window.open('index.html?draft=1','_blank','noopener');});
$('#export-content').addEventListener('click',()=>exportContent().catch(error=>status(error.message,true)));
$('#import-content').addEventListener('change',async event=>{const file=event.target.files?.[0];if(!file)return;try{const next=JSON.parse(await file.text());const errors=validateContent(next);if(errors.length)throw Error(errors.join(' · '));content=next;render();status('Файл открыт. Проверьте и сохраните локальный черновик.');}catch(error){status(error.message,true);}event.target.value='';});
$('#reset-draft').addEventListener('click',()=>$('#reset-confirm').showModal());
$('#cancel-reset').addEventListener('click',()=>$('#reset-confirm').close());
$('#confirm-reset').addEventListener('click',async()=>{try{localStorage.removeItem(storeKey);await clearDraftFiles();content=structuredClone(original);render();$('#reset-confirm').close();status('Локальный черновик сброшен.');}catch{status('Не удалось сбросить локальные файлы.',true);}});

try{const response=await fetch('content.json');if(!response.ok)throw Error('Не удалось загрузить content.json');original=await response.json();try{const saved=localStorage.getItem(storeKey);content=saved?JSON.parse(saved):structuredClone(original);}catch{content=structuredClone(original);}render();status('Редактор готов. Изменения не публикуются автоматически.');}catch(error){status(error.message,true);$('#editor-fields').replaceChildren();}
