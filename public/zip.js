// Minimal, dependency-free ZIP writer (stored entries, UTF-8 filenames, CRC32).
// Files remain local to the browser; there is no upload endpoint or remote account.
const table=Array.from({length:256},(_,n)=>{let c=n;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
function crc32(bytes){let c=0xffffffff;for(const b of bytes)c=table[(c^b)&255]^(c>>>8);return(c^0xffffffff)>>>0;}
function header(size){const bytes=new Uint8Array(size);return{bytes,view:new DataView(bytes.buffer)};}
export async function makeZip(entries){
  const chunks=[],central=[];let offset=0;
  for(const[name,blob]of entries){
    if(name.startsWith('/')||name.split('/').includes('..'))throw Error('Небезопасный путь в архиве');
    const filename=new TextEncoder().encode(name);const bytes=new Uint8Array(await blob.arrayBuffer());const crc=crc32(bytes);
    const h=header(30);h.view.setUint32(0,0x04034b50,true);h.view.setUint16(4,20,true);h.view.setUint16(6,0x0800,true);h.view.setUint16(12,33,true);h.view.setUint32(14,crc,true);h.view.setUint32(18,bytes.length,true);h.view.setUint32(22,bytes.length,true);h.view.setUint16(26,filename.length,true);
    chunks.push(h.bytes,filename,bytes);
    const c=header(46);c.view.setUint32(0,0x02014b50,true);c.view.setUint16(4,20,true);c.view.setUint16(6,20,true);c.view.setUint16(8,0x0800,true);c.view.setUint16(14,33,true);c.view.setUint32(16,crc,true);c.view.setUint32(20,bytes.length,true);c.view.setUint32(24,bytes.length,true);c.view.setUint16(28,filename.length,true);c.view.setUint32(42,offset,true);
    central.push(c.bytes,filename);offset+=30+filename.length+bytes.length;
  }
  const centralLength=central.reduce((sum,c)=>sum+c.length,0),end=header(22);end.view.setUint32(0,0x06054b50,true);end.view.setUint16(8,entries.length,true);end.view.setUint16(10,entries.length,true);end.view.setUint32(12,centralLength,true);end.view.setUint32(16,offset,true);
  return new Blob([...chunks,...central,end.bytes],{type:'application/zip'});
}
