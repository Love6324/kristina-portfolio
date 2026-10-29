const dbName = 'kristina-portfolio-media';
function openDB() {
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(dbName,1);
    req.onupgradeneeded=()=>req.result.createObjectStore('files');
    req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
  });
}
export async function saveDraftFile(path, file) {
  const db=await openDB();
  await new Promise((resolve,reject)=>{const t=db.transaction('files','readwrite');t.objectStore('files').put(file,path);t.oncomplete=resolve;t.onerror=()=>reject(t.error);});db.close();
}
export async function draftFiles() {
  const db=await openDB();
  const entries=await new Promise((resolve,reject)=>{const result=[];const t=db.transaction('files','readonly');const req=t.objectStore('files').openCursor();req.onsuccess=()=>{const c=req.result;if(c){result.push([c.key,c.value]);c.continue();}else resolve(result);};req.onerror=()=>reject(req.error);});db.close();return entries;
}
export async function clearDraftFiles() {
  const db=await openDB();await new Promise((resolve,reject)=>{const t=db.transaction('files','readwrite');t.objectStore('files').clear();t.oncomplete=resolve;t.onerror=()=>reject(t.error);});db.close();
}
export async function hydrateDraftMedia(data) {
  const files=await draftFiles();const map=new Map(files.map(([path,file])=>[path,URL.createObjectURL(file)]));
  function visit(value){if(Array.isArray(value))return value.map(visit);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,v])=>[key,visit(v)]));return typeof value==='string'&&map.has(value)?map.get(value):value;}
  return visit(data);
}
