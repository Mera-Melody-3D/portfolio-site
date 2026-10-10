/* Mera Melody · local site editor
   Loaded only when the site runs on localhost (see the loader line in the <head> of each page), so visitors of the
   published site never get it. Press E to open or close the panel.

   How it works
   - The pages draw everything from data/site.js (window.SITE_DATA). The panel edits a working copy of that data and
     the page redraws live.
   - Every change is kept as a draft (localStorage + IndexedDB) a moment later. Close the tab, come back, and it offers to restore.
   - "Save to folder" writes data/site.js and the new model/image files straight into your project folder
     (File System Access API: Chrome or Edge). After that, upload the folder to GitHub as usual. */
/* Contents (VS Code: Ctrl+K Ctrl+0 folds everything; search "#region" to jump):
   1. Editor: helpers
   2. Editor: state
   3. Editor: IndexedDB
   4. Editor: draft and live preview
   5. Editor: images
   6. Editor: character and gallery operations
   7. Editor: save to folder
   8. Editor UI: shell
   9. Editor UI: toasts and dialogs
   10. Editor UI: rendering
   11. Editor UI: events
   12. Stories: data and helpers
   13. Editor: Word import
   14. Editor: cover picture
   15. Stories: tab
   16. Editor: global keys and leave warning
   17. Editor: start
*/
(function(){
'use strict';
if(window.__mmEditor)return;window.__mmEditor=true;

/* #region Editor: helpers */
/* ---------- helpers ---------- */
var LS_DRAFT='mm_draft',SS_LIVE='mm_live',SS_OPEN='mm_open',HEX=/^#[0-9a-f]{6}$/i;
function clone(o){return JSON.parse(JSON.stringify(o))}
function stable(v){if(Array.isArray(v))return'['+v.map(stable).join(',')+']';if(v&&typeof v==='object')return'{'+Object.keys(v).sort().map(function(k){return JSON.stringify(k)+':'+stable(v[k])}).join(',')+'}';return JSON.stringify(v)}
function tryDo(fn,fb){try{return fn()}catch(e){return fb}}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(m){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]})}
function slug(s){return String(s||'').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,40)}
function rnd(){return Math.random().toString(36).slice(2,6)}
function fname(p){return String(p||'').split('/').pop()}
function fmtSize(n){return n>1048576?(n/1048576).toFixed(1)+' MB':Math.max(1,Math.round(n/1024))+' KB'}
function hhmm(t){var d=new Date(t),z=function(n){return('0'+n).slice(-2)};return z(d.getHours())+':'+z(d.getMinutes())+':'+z(d.getSeconds())}
function trim(s){return String(s).trim()}
function norm(d){d=d&&typeof d==='object'?d:{};d.characters=Array.isArray(d.characters)?d.characters:[];d.gallery=Array.isArray(d.gallery)?d.gallery:[];return d}

/* #endregion */
/* #region Editor: state */
/* ---------- state ---------- */
var base=norm(clone(window.SITE_DATA||{}));         /* what is on disk right now */
var work=clone(base);                                /* what the panel edits and the page shows */
var LORE_FILE=window.SITE_LORE!==undefined;          /* false on a page that did not load data/lore.js: then the panel leaves that file alone */
var baseLore=normLore(clone(window.SITE_LORE||{}));  /* the long stories on disk (data/lore.js) */
var workLore=clone(baseLore);
var pending={};                                      /* new files not on disk yet: path -> {blob,url,name} */
var draft=tryDo(function(){var d=JSON.parse(localStorage.getItem(LS_DRAFT));return d&&d.data?d:null},null);
var live=tryDo(function(){return sessionStorage.getItem(SS_LIVE)==='1'},false);
var needRestoreAsk=false,lastDraftAt=0,saving=false,allowNav=false;
if(draft&&stable(norm(clone(draft.data)))===stable(base)&&stable(dLore(draft))===stable(baseLore)){tryDo(function(){localStorage.removeItem(LS_DRAFT)});draft=null}
if(draft&&live){work=norm(clone(draft.data));workLore=dLore(draft);lastDraftAt=draft.ts||0}
else if(draft)needRestoreAsk=true;
window.SITE_DATA=work;window.SITE_LORE=workLore;
window.SITE_URL=function(p){var f=pending[p];return f?f.url:p};
/* Ids of the characters that already exist in the saved data/site.js. */
function baseIds(){var m={};base.characters.forEach(function(c){m[c.id]=1});return m}
/* True when there are unsaved changes. */
function dirty(){return stable(work)!==stable(base)||(LORE_FILE&&stable(workLore)!==stable(baseLore))}
/* All image/model paths the data points to. */
function refsOf(d,l){var s={};d.characters.forEach(function(c){['src','poster','thumb'].forEach(function(k){if(c[k])s[c[k]]=1})});d.gallery.forEach(function(g){if(g.src)s[g.src]=1});
 Object.keys(l||{}).forEach(function(id){var b=l[id]&&l[id].banner;if(b){if(b.src)s[b.src]=1;if(b.eyes&&b.eyes.src)s[b.eyes.src]=1}});return s}

/* #endregion */
/* #region Editor: IndexedDB */
/* ---------- IndexedDB (draft files + remembered project folder) ---------- */
var dbP=null;
function db(){if(!dbP)dbP=new Promise(function(res,rej){if(!window.indexedDB)return rej(new Error('no indexedDB'));var r=indexedDB.open('mm-editor',1);r.onupgradeneeded=function(){var d=r.result;d.createObjectStore('kv');d.createObjectStore('files')};r.onsuccess=function(){res(r.result)};r.onerror=function(){rej(r.error)}});return dbP}
function tx(store,mode,fn){return db().then(function(d){return new Promise(function(res,rej){var t=d.transaction(store,mode),r=fn(t.objectStore(store));t.oncomplete=function(){res(r&&r.result)};t.onerror=t.onabort=function(){rej(t.error)}})})}
function kvGet(k){return tx('kv','readonly',function(s){return s.get(k)}).catch(function(){return undefined})}
function kvPut(k,v){return tx('kv','readwrite',function(s){s.put(v,k)}).catch(function(){})}
function fPut(k,v){return tx('files','readwrite',function(s){s.put(v,k)}).catch(function(){})}
function fDel(k){return tx('files','readwrite',function(s){s.delete(k)}).catch(function(){})}
function fClear(){return tx('files','readwrite',function(s){s.clear()}).catch(function(){})}
function fAll(){return db().then(function(d){return new Promise(function(res){var out={},t=d.transaction('files','readonly'),q=t.objectStore('files').openCursor();q.onsuccess=function(){var c=q.result;if(c){out[c.key]=c.value;c.continue()}};t.oncomplete=function(){res(out)};t.onerror=function(){res(out)}})}).catch(function(){return{}})}

/* Keep a new image/model in memory (and IndexedDB) until it is saved to the folder. */
function addPending(path,blob,name){if(pending[path])URL.revokeObjectURL(pending[path].url);pending[path]={blob:blob,url:URL.createObjectURL(blob),name:name||fname(path)};fPut(path,{blob:blob,name:name||fname(path)})}
function clearPending(){Object.keys(pending).forEach(function(k){URL.revokeObjectURL(pending[k].url)});pending={}}
/* Forget pending files that nothing refers to any more. */
function prune(){var r=refsOf(work,workLore);Object.keys(pending).forEach(function(k){if(!r[k]){URL.revokeObjectURL(pending[k].url);delete pending[k];fDel(k)}})}
function loadPending(){return fAll().then(function(all){Object.keys(all).forEach(function(k){if(!pending[k]&&all[k]&&all[k].blob)pending[k]={blob:all[k].blob,url:URL.createObjectURL(all[k].blob),name:all[k].name||fname(k)}});prune()})}

/* #endregion */
/* #region Editor: draft and live preview */
/* ---------- draft + live preview ---------- */
var rbT,dfT;
/* Give the working data to the page and redraw it live. */
function rebuildPage(){window.SITE_DATA=work;window.SITE_LORE=workLore;if(typeof window.SITE_REBUILD==='function')try{window.SITE_REBUILD()}catch(e){console.error(e)}}
/* Keep the current edits as a draft so a closed tab loses nothing. */
function saveDraft(){
 clearTimeout(dfT);
 if(!dirty()){tryDo(function(){localStorage.removeItem(LS_DRAFT);sessionStorage.removeItem(SS_LIVE)});lastDraftAt=0;fClear();updateUI();return}
 lastDraftAt=Date.now();
 tryDo(function(){localStorage.setItem(LS_DRAFT,JSON.stringify({v:2,ts:lastDraftAt,data:work,lore:LORE_FILE?workLore:undefined}));sessionStorage.setItem(SS_LIVE,'1')});
 updateUI();
}
function clearDraft(){clearTimeout(dfT);lastDraftAt=0;tryDo(function(){localStorage.removeItem(LS_DRAFT);sessionStorage.removeItem(SS_LIVE)});return fClear()}
function touch(){
 prune();
 clearTimeout(rbT);rbT=setTimeout(rebuildPage,350);
 clearTimeout(dfT);dfT=setTimeout(saveDraft,1500);
 updateUI();
}
addEventListener('pagehide',function(){if(dirty())saveDraft()});
addEventListener('beforeunload',function(e){if(dirty()&&!allowNav){saveDraft();e.preventDefault();e.returnValue=''}});

/* #endregion */
/* #region Editor: images */
/* ---------- images ---------- */
function loadImg(src){return new Promise(function(res,rej){var im=new Image();im.onload=function(){res(im)};im.onerror=function(){rej(new Error('image'))};im.src=src})}
function toBlob(cv,type,q){return new Promise(function(res){cv.toBlob(res,type,q)})}
var EXT={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
/* Shrink a picture to a maximum size and re-encode it. */
function processImage(file,max){
 var url=URL.createObjectURL(file);
 return loadImg(url).then(function(im){
  var w=im.naturalWidth,h=im.naturalHeight,k=Math.min(1,max/Math.max(w,h)),png=file.type==='image/png';
  if(k===1&&file.size<1500000&&EXT[file.type])return{blob:file,ext:EXT[file.type]};
  var cv=document.createElement('canvas');cv.width=Math.round(w*k);cv.height=Math.round(h*k);cv.getContext('2d').drawImage(im,0,0,cv.width,cv.height);
  return toBlob(cv,png?'image/png':'image/jpeg',.88).then(function(b){return{blob:b,ext:png?'png':'jpg'}});
 }).then(function(r){URL.revokeObjectURL(url);return r},function(e){URL.revokeObjectURL(url);throw e});
}
/* Cut a square thumbnail around a focus point. */
function squareCrop(src,px,py){
 return loadImg(src).then(function(im){
  var s=256,cv=document.createElement('canvas'),g;cv.width=cv.height=s;g=cv.getContext('2d');g.fillStyle='#0a0e14';g.fillRect(0,0,s,s);
  var w=im.naturalWidth,h=im.naturalHeight,side=Math.min(w,h);g.drawImage(im,(w-side)*px,(h-side)*py,side,side,0,0,s,s);
  return toBlob(cv,'image/jpeg',.86)});
}
function autoThumb(c){
 if(!c.poster){c.thumb='';return Promise.resolve()}
 var px=.5,py=.5,m=c.fit==='cover'&&c.pos&&String(c.pos).match(/(-?[\d.]+)%\s+(-?[\d.]+)%/);if(m){px=Math.min(1,Math.max(0,+m[1]/100));py=Math.min(1,Math.max(0,+m[2]/100))}
 return squareCrop(window.SITE_URL(c.poster),px,py).then(function(b){var path='images/th-'+(slug(c.id)||'char')+'-'+rnd()+'.jpg';addPending(path,b,'thumbnail.jpg');c.thumb=path});
}
function pick(accept,multiple){return new Promise(function(res){var i=document.createElement('input');i.type='file';i.accept=accept;i.multiple=!!multiple;i.hidden=true;root.appendChild(i);i.onchange=function(){var f=[].slice.call(i.files);i.remove();res(f)};i.click()})}

/* #endregion */
/* #region Editor: character and gallery operations */
/* ---------- characters / gallery operations ---------- */
function uniqueId(id,self){var n=1,t=id;while(work.characters.some(function(c){return c!==self&&c.id===t}))t=id+'-'+(++n);return t}
function newChar(){var c={id:'',name:'New character',tag:'Character · Blender',c:'#5cc8ff',bg:'#0f1a2a',src:'',poster:'',thumb:'',thumbAuto:true,orbit:'',fit:'contain',pos:'50% 50%',line:'',story:[],meta:[]};c.id=uniqueId('new-character',null);return c}
function moveItem(arr,i,j){if(j<0||j>=arr.length||i===j)return;var x=arr.splice(i,1)[0];arr.splice(j,0,x)}
function setField(c,f,t){
 var v=t.value;
 if(f==='story')c.story=v.split(/\n\s*\n/).map(trim).filter(Boolean);
 else if(f==='meta')c.meta=v.split(',').map(trim).filter(Boolean);
 else if(f==='c'||f==='bg'){if(!HEX.test(v))return;c[f]=v.toLowerCase();[].forEach.call(root.querySelectorAll('[data-f="'+f+'"]'),function(x){if(x!==t&&x.value!==c[f])x.value=c[f]})}
 else if(f==='name'){var oldId=c.id;c.name=v;if(!baseIds()[c.id])c.id=uniqueId(slug(v)||'character',c);if(oldId!==c.id&&workLore[oldId]){workLore[c.id]=workLore[oldId];delete workLore[oldId]}var idEl=root.getElementById('idshow');if(idEl)idEl.textContent=c.id}
 else c[f]=v;
 touch();
}
function chooseModel(c){pick('.glb',false).then(function(fs){var f=fs[0];if(!f)return;
 if(!/\.glb$/i.test(f.name)){toast('Please choose a .glb file (in Blender: File → Export → glTF 2.0 → format "glTF Binary").','err');return}
 if(f.size>60*1048576)toast('That model is '+fmtSize(f.size)+'. Big files load slowly (GitHub rejects files over 100 MB).','warn');
 var path='models/'+(slug(c.id)||'model')+'-'+rnd()+'.glb';addPending(path,f,f.name);c.src=path;touch();render()})}
function choosePoster(c,files){var f=files&&files[0];if(!f||!EXT[f.type]){if(f)toast('Use a JPG, PNG or WebP image.','err');return}
 processImage(f,1800).then(function(r){var path='images/'+(slug(c.id)||'char')+'-'+rnd()+'.'+r.ext;addPending(path,r.blob,f.name);c.poster=path;return c.thumbAuto===true?autoThumb(c):null}).then(function(){touch();render()}).catch(function(){toast('Could not read that image.','err')})}
function chooseThumb(c,files){var f=files&&files[0];if(!f||!EXT[f.type]){if(f)toast('Use a JPG, PNG or WebP image.','err');return}
 var u=URL.createObjectURL(f);squareCrop(u,.5,.5).then(function(b){URL.revokeObjectURL(u);var path='images/th-'+(slug(c.id)||'char')+'-'+rnd()+'.jpg';addPending(path,b,f.name);c.thumb=path;c.thumbAuto=false;touch();render()}).catch(function(){toast('Could not read that image.','err')})}
function addGallery(files){
 files=(files||[]).filter(function(f){return EXT[f.type]});if(!files.length){toast('Use JPG, PNG or WebP images.','err');return}
 var chain=Promise.resolve(),n=0;
 files.forEach(function(f){chain=chain.then(function(){return processImage(f,1600)}).then(function(r){var nm=f.name.replace(/\.[^.]+$/,''),path='images/gallery/'+(slug(nm)||'image')+'-'+rnd()+'.'+r.ext;addPending(path,r.blob,f.name);work.gallery.push({src:path,title:nm.replace(/[-_]+/g,' ').trim(),note:''});n++},function(){toast('Could not read '+f.name,'err')})});
 chain.then(function(){if(n){touch();render()}});
}

/* #endregion */
/* #region Editor: save to folder */
/* ---------- saving into the project folder ---------- */
/* Get (or ask for) the project folder to write into. */
function getDir(interactive,force){
 return (force?Promise.resolve(null):kvGet('dir')).then(function(h){
  if(h){
   var q=h.queryPermission?h.queryPermission({mode:'readwrite'}):Promise.resolve('granted');
   return q.then(function(p){if(p==='granted')return h;if(!interactive)return null;return h.requestPermission({mode:'readwrite'}).then(function(p2){return p2==='granted'?h:null})}).catch(function(){return null});
  }
  return null;
 }).then(function(h){
  if(h||!interactive)return h;
  if(!window.showDirectoryPicker)throw new Error('This browser cannot write to folders. Use Chrome or Edge.');
  return window.showDirectoryPicker({id:'mm-site',mode:'readwrite'}).then(function(d){
   return d.getFileHandle('index.html').then(function(){return d.getFileHandle('characters.html')}).then(function(){kvPut('dir',d);refreshFolder(d);return d},function(){throw new Error('That folder has no index.html. Pick the site folder (the one with index.html, characters.html and models).')});
  });
 });
}
/* Write one file into the project folder. */
function writeFile(root,path,data){
 var parts=path.split('/'),name=parts.pop(),d=Promise.resolve(root);
 parts.forEach(function(p){d=d.then(function(h){return h.getDirectoryHandle(p,{create:true})})});
 return d.then(function(h){return h.getFileHandle(name,{create:true})}).then(function(fh){return fh.createWritable()}).then(function(w){return Promise.resolve(w.write(data)).then(function(){return w.close()})});
}
/* Delete one file from the project folder. */
function removeFile(root,path){
 var parts=path.split('/'),name=parts.pop(),d=Promise.resolve(root);
 parts.forEach(function(p){d=d.then(function(h){return h.getDirectoryHandle(p)})});
 return d.then(function(h){return h.removeEntry(name)}).then(function(){return true},function(){return false});
}
/* Text of data/site.js for the given data. */
function serialize(d){return'/* Site content: the characters and the gallery.\n   Written by the editor panel (press E while the site runs on localhost). You can also edit it by hand. */\nwindow.SITE_DATA = '+JSON.stringify(d,null,2)+';\n'}
/* Check the data and list anything that would break the site. */
function problems(){
 var out=[];
 work.characters.forEach(function(c,i){
  if(!trim(c.name||''))out.push('Character '+(i+1)+' needs a name.');
  if(!HEX.test(c.c||''))out.push((c.name||'Character '+(i+1))+': the accent color is not valid.');
 });
 return out;
}
/* Write data/site.js, data/lore.js and the new files into the folder. */
function save(){
 if(saving)return Promise.resolve(false);
 var pr=problems();if(pr.length){toast(pr[0],'err');return Promise.resolve(false)}
 saving=true;updateUI();
 if(LORE_FILE){workLore=cleanLore(workLore);window.SITE_LORE=workLore}
 var written=0,removed=0,newBase=clone(work),newLore=clone(workLore);
 return getDir(true).then(function(root){
  if(!root){toast('Folder access was not granted, so nothing was saved.','err',5000);return false}
  var refs=refsOf(work,workLore),chain=Promise.resolve();
  Object.keys(pending).forEach(function(p){if(refs[p])chain=chain.then(function(){return writeFile(root,p,pending[p].blob)}).then(function(){written++})});
  chain=chain.then(function(){return writeFile(root,'data/site.js',serialize(work))});
  if(LORE_FILE)chain=chain.then(function(){return writeFile(root,'data/lore.js',serializeLore(workLore))});
  var old=refsOf(base,baseLore);
  Object.keys(old).forEach(function(p){if(!refs[p]&&/^(models|images)\//.test(p))chain=chain.then(function(){return removeFile(root,p)}).then(function(ok){if(ok)removed++})});
  return chain.then(function(){
   base=newBase;baseLore=newLore;clearPending();return clearDraft()}).then(function(){
   rebuildPage();render();
   toast('Saved'+(root.name?' to "'+root.name+'"':'')+(written?' · '+written+' file'+(written>1?'s':'')+' added':'')+(removed?' · '+removed+' removed':'')+'. Upload the folder to GitHub to publish.','ok',6500);
   return true});
 }).catch(function(e){if(e&&e.name==='AbortError')return false;toast((e&&e.message)||'Saving failed.','err',7000);console.error(e);return false})
  .then(function(ok){saving=false;updateUI();return ok});
}
/* Throw the draft away and go back to the saved data. */
function discard(){
 return ask({title:'Discard all unsaved changes?',body:'<p>Your edits since the last Save are thrown away and the site goes back to what is saved in the folder.</p><p class="rtl" dir="rtl">همه‌ی تغییرات ذخیره‌نشده پاک می‌شن و سایت به آخرین حالت ذخیره‌شده برمی‌گرده.</p>',buttons:[{id:'no',label:'Keep editing'},{id:'yes',label:'Discard',cls:'danger'}],cancel:'no'}).then(function(r){
  if(r!=='yes')return;
  work=clone(base);workLore=clone(baseLore);window.SITE_LORE=workLore;clearPending();view.edit=-1;view.story=-1;view.sel=null;return clearDraft().then(function(){rebuildPage();render();updateUI();toast('Draft discarded.','ok')});
 });
}

/* #endregion */
/* #region Editor UI: shell */
/* ---------- UI: shell ---------- */
var host,root,isOpen=false,modalRes=null,modalCancel=null,view={tab:'chars',edit:-1,story:-1,lang:'fa',sel:null},dragI=null,dragKind=null;
function $(id){return root.getElementById(id)}
var CSS='\
:host{all:initial}*{box-sizing:border-box}\
button,input,select,textarea{font:inherit;color:inherit}\
.pill{position:fixed;right:12px;bottom:8px;z-index:2147483000;display:flex;align-items:center;gap:8px;height:28px;padding:0 9px 0 10px;border-radius:99px;border:1px solid rgba(255,255,255,.16);background:rgba(10,14,20,.72);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);color:#c9d6e3;font:500 10.5px/1 "DM Sans",system-ui,sans-serif;letter-spacing:.16em;text-transform:uppercase;cursor:pointer;opacity:.7;transition:opacity .2s,border-color .2s}\
.pill:hover,.wrap.open .pill{opacity:1;border-color:rgba(92,200,255,.55)}\
.wrap.open .pill{right:calc(min(460px,100vw) + 12px)}\
.dot{width:7px;height:7px;border-radius:50%;background:#43d6a0;box-shadow:0 0 8px #43d6a0;flex:none}\
.wrap.dirty .dot{background:#f0a81c;box-shadow:0 0 8px #f0a81c}\
kbd{font:600 10px/1 "DM Sans",system-ui,sans-serif;padding:3px 5px;border-radius:5px;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.06);letter-spacing:0}\
.panel{position:fixed;top:0;right:0;bottom:0;width:min(460px,100vw);z-index:2147483001;display:flex;flex-direction:column;color:#e8f1f8;font:400 14px/1.45 "DM Sans",system-ui,sans-serif;background:linear-gradient(180deg,rgba(15,21,31,.93),rgba(6,9,14,.96));-webkit-backdrop-filter:blur(22px) saturate(150%);backdrop-filter:blur(22px) saturate(150%);border-left:1px solid rgba(255,255,255,.14);box-shadow:-30px 0 70px -30px rgba(0,0,0,.95);transform:translateX(104%);visibility:hidden;transition:transform .45s cubic-bezier(.2,.7,.2,1),visibility 0s .45s}\
.wrap.open .panel{transform:none;visibility:visible;transition:transform .45s cubic-bezier(.2,.7,.2,1),visibility 0s}\
.panel::before{content:"";position:absolute;left:0;right:0;top:0;height:2px;background:linear-gradient(90deg,transparent,#5cc8ff 35%,#a08cff 70%,transparent);box-shadow:0 0 16px 1px rgba(110,160,255,.6)}\
header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:18px 16px 12px 18px}\
.ttl b{display:block;font:600 18px/1.1 Syne,system-ui,sans-serif;letter-spacing:.01em}\
.stat{display:block;margin-top:5px;font-size:12px;color:#8896a6}\
.dirty .stat{color:#f0b84a}\
.x{width:32px;height:32px;border-radius:50%;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);cursor:pointer;font-size:19px;line-height:1;color:#b9c6d3}.x:hover{border-color:#5cc8ff;color:#fff}\
.tabs{display:flex;gap:4px;padding:0 14px;border-bottom:1px solid rgba(255,255,255,.08)}\
.tabs button{position:relative;background:none;border:0;padding:10px 12px 11px;cursor:pointer;color:#8896a6;font:600 13px/1 Syne,system-ui,sans-serif;letter-spacing:.02em}\
.tabs button.on{color:#e8f1f8}.tabs button.on::after{content:"";position:absolute;left:10px;right:10px;bottom:-1px;height:2px;background:#5cc8ff;box-shadow:0 0 10px #5cc8ff}\
.tabs em{font:500 11px/1 "DM Sans",system-ui,sans-serif;font-style:normal;color:#6f8093;margin-left:4px}\
.body{flex:1;min-height:0;overflow:auto;padding:16px 16px 22px;scrollbar-width:thin;scrollbar-color:#223246 transparent}\
.intro{color:#8896a6;font-size:13px;margin:0 0 14px}\
.rows{list-style:none;margin:0 0 14px;padding:0;display:grid;gap:8px}\
.row{display:flex;align-items:center;gap:10px;padding:8px 8px 8px 4px;border:1px solid rgba(255,255,255,.1);border-radius:14px;background:rgba(255,255,255,.035);transition:border-color .2s,background .2s}\
.row.over{border-color:#5cc8ff;background:rgba(92,200,255,.09)}.row.drag{opacity:.45}\
.grip{cursor:grab;color:#5a6a7c;padding:6px 5px;user-select:none;font-size:15px;line-height:1;letter-spacing:-3px}.grip:hover{color:#b9c6d3}\
.th{width:44px;height:44px;border-radius:10px;object-fit:cover;flex:none;background:#0a0e14;border:1px solid rgba(255,255,255,.1)}\
.th.ph{background:radial-gradient(circle at 50% 130%,var(--c,#5cc8ff),transparent 72%),#0a0e14}\
.nm{flex:1;min-width:0;text-align:left;background:none;border:0;cursor:pointer;padding:2px 0}\
.nm b{display:block;font:600 15px/1.2 Syne,system-ui,sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\
.nm small{display:block;color:#8896a6;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\
.rb{display:flex;gap:4px;flex:none}\
.ib{min-width:30px;height:30px;padding:0 8px;border-radius:9px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);cursor:pointer;color:#b9c6d3;font-size:13px;line-height:1}.ib:hover:not(:disabled){border-color:#5cc8ff;color:#fff}.ib:disabled{opacity:.3;cursor:default}.ib.del:hover:not(:disabled){border-color:#ff6b6b;color:#ff9a9a}\
.add,.drop{width:100%;padding:13px;border-radius:14px;border:1px dashed rgba(92,200,255,.45);background:rgba(92,200,255,.05);color:#9fd6ff;cursor:pointer;font:600 13px/1.2 Syne,system-ui,sans-serif;letter-spacing:.02em;text-align:center}\
.add:hover,.drop:hover,.drop.over{background:rgba(92,200,255,.12);border-color:#5cc8ff}\
.drop{margin-bottom:14px;font-weight:500;font-family:"DM Sans",system-ui,sans-serif;font-size:13px;line-height:1.4}.drop small{display:block;color:#7d90a4;margin-top:3px}\
.empty{text-align:center;color:#7d90a4;padding:20px 0 24px;margin:0}\
.back{background:none;border:0;color:#9fd6ff;cursor:pointer;padding:0;margin:0 0 12px;font-size:13px}.back:hover{color:#fff}\
.ed h3{margin:0 0 4px;font:600 20px/1.15 Syne,system-ui,sans-serif}.ed .sub{margin:0 0 16px;color:#7d90a4;font-size:12px}.ed .sub code{color:#9fd6ff}\
label{display:block;margin:0 0 14px;font-size:12px;color:#9bacbd;letter-spacing:.04em}label>small{color:#66798d;margin-left:6px;letter-spacing:0}\
input[type=text],input:not([type]),textarea,select{display:block;width:100%;margin-top:6px;padding:10px 12px;border-radius:11px;border:1px solid #223246;background:rgba(5,8,12,.7);color:#e8f1f8;font-size:14px;letter-spacing:0;outline:0;transition:border-color .2s,box-shadow .2s}\
textarea{resize:vertical;min-height:120px;line-height:1.5}select{appearance:none;background-image:linear-gradient(45deg,transparent 50%,#8896a6 50%),linear-gradient(135deg,#8896a6 50%,transparent 50%);background-position:calc(100% - 17px) 50%,calc(100% - 12px) 50%;background-size:5px 5px;background-repeat:no-repeat}\
input:focus,textarea:focus,select:focus{border-color:#5cc8ff;box-shadow:0 0 0 3px rgba(92,200,255,.14)}\
.two{display:grid;grid-template-columns:1fr 1fr;gap:12px}\
.color{display:flex;gap:8px;margin-top:6px}.color input[type=color]{width:42px;height:40px;padding:2px;border:1px solid #223246;border-radius:11px;background:rgba(5,8,12,.7);cursor:pointer;flex:none}.color input[type=text]{margin-top:0}\
.fbox{padding:12px;margin:0 0 12px;border:1px solid rgba(255,255,255,.1);border-radius:14px;background:rgba(255,255,255,.03)}.fbox.over{border-color:#5cc8ff;background:rgba(92,200,255,.07)}\
.fh{display:flex;align-items:baseline;gap:8px;margin-bottom:8px}.fh b{font:600 13px/1 Syne,system-ui,sans-serif}.fh small{color:#66798d;font-size:12px}\
.fs{font-size:13px;color:#a9b6c4;margin-bottom:10px;word-break:break-all}.fs code{color:#9fd6ff}.fs.none{color:#7d90a4}\
.fp{display:flex;gap:12px;align-items:center;margin-bottom:10px}.fp img{height:84px;max-width:120px;object-fit:contain;border-radius:10px;background:#0a0e14;border:1px solid rgba(255,255,255,.1)}.fp img.sq{width:64px;height:64px;object-fit:cover}\
.fa{display:flex;flex-wrap:wrap;gap:8px}\
.chk{display:flex;align-items:center;gap:8px;margin:0 0 10px;font-size:13px;color:#a9b6c4;letter-spacing:0;cursor:pointer}.chk input{width:16px;height:16px;margin:0;accent-color:#5cc8ff}\
.btn{padding:9px 14px;border-radius:11px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.05);cursor:pointer;font-size:13px;font-weight:500;color:#dbe6f0;transition:border-color .2s,background .2s}.btn:hover:not(:disabled){border-color:#5cc8ff;background:rgba(92,200,255,.1)}.btn:disabled{opacity:.4;cursor:default}\
.btn.ghost{background:none}.btn.danger{border-color:rgba(255,107,107,.5);color:#ffa3a3}.btn.danger:hover:not(:disabled){border-color:#ff6b6b;background:rgba(255,107,107,.12)}\
.btn.primary{border-color:rgba(170,226,255,.55);color:#fff;background:linear-gradient(180deg,rgba(130,220,255,.46),rgba(36,120,220,.32));box-shadow:inset 0 1px 0 rgba(255,255,255,.4),0 8px 24px -10px rgba(92,200,255,.75);text-shadow:0 1px 6px rgba(0,50,110,.5)}.btn.primary:hover:not(:disabled){border-color:#d0f0ff;background:linear-gradient(180deg,rgba(150,228,255,.6),rgba(50,134,232,.45))}\
details{margin:4px 0 16px;border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:0 12px}summary{cursor:pointer;padding:12px 0;font:600 13px/1 Syne,system-ui,sans-serif;color:#b9c6d3;list-style:none}summary::-webkit-details-marker{display:none}summary::after{content:"+";float:right;color:#6f8093}details[open] summary::after{content:"–"}details[open]{padding-bottom:2px}\
.hint{font-size:12px;color:#66798d;margin:-8px 0 14px;line-height:1.45;letter-spacing:0}\
.danger-zone{margin-top:22px;padding-top:16px;border-top:1px solid rgba(255,255,255,.08)}\
.grows{list-style:none;margin:0 0 14px;padding:0;display:grid;gap:8px}\
.grow{display:flex;align-items:center;gap:10px;padding:8px 8px 8px 4px;border:1px solid rgba(255,255,255,.1);border-radius:14px;background:rgba(255,255,255,.035)}.grow.over{border-color:#5cc8ff}.grow.drag{opacity:.45}\
.grow .th{width:56px;height:56px}.gf{flex:1;min-width:0;display:grid;gap:6px}.gf input{margin:0;padding:7px 10px;font-size:13px}\
.gb{display:grid;grid-template-columns:1fr 1fr;gap:4px}\
footer{padding:12px 16px 16px;border-top:1px solid rgba(255,255,255,.08);background:rgba(4,6,10,.5)}\
.folder{display:flex;align-items:center;gap:8px;margin-bottom:10px;font-size:12px;color:#8896a6;min-height:24px}.folder b{color:#c9d6e3;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.folder .lk{background:none;border:0;padding:0;color:#9fd6ff;cursor:pointer;font-size:12px;margin-left:auto;flex:none}.folder .lk:hover{color:#fff}\
.acts{display:flex;gap:10px}.acts .btn{flex:1;padding:12px 14px;font-size:14px}.acts .primary{flex:1.6}\
.toasts{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:2147483004;display:grid;gap:8px;justify-items:center;pointer-events:none;width:min(560px,calc(100vw - 24px))}\
.toast{pointer-events:auto;padding:11px 16px;border-radius:14px;border:1px solid rgba(255,255,255,.18);background:rgba(10,14,20,.94);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);color:#e8f1f8;font:400 13.5px/1.45 "DM Sans",system-ui,sans-serif;box-shadow:0 18px 40px -16px rgba(0,0,0,.9);animation:tin .35s cubic-bezier(.2,.7,.2,1)}\
.toast.ok{border-color:rgba(67,214,160,.55)}.toast.err{border-color:rgba(255,107,107,.65)}.toast.warn{border-color:rgba(240,168,28,.65)}\
@keyframes tin{from{opacity:0;transform:translateY(10px)}}\
.modal{position:fixed;inset:0;z-index:2147483005;display:grid;place-items:center;padding:20px;background:rgba(3,5,8,.62);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}.modal[hidden]{display:none}\
.card{width:min(440px,100%);padding:22px 22px 18px;border-radius:20px;border:1px solid rgba(255,255,255,.16);background:linear-gradient(180deg,rgba(18,25,36,.97),rgba(8,11,17,.98));box-shadow:0 40px 80px -30px #000,0 0 60px -30px #5cc8ff;color:#e8f1f8;font:400 14px/1.5 "DM Sans",system-ui,sans-serif;animation:tin .3s cubic-bezier(.2,.7,.2,1)}\
.card .mt{margin:0 0 10px;font:600 18px/1.2 Syne,system-ui,sans-serif}.card .mb p{margin:0 0 10px;color:#b9c6d3}.card .mb p.rtl{display:block;color:#9fb0c2;font-family:Vazirmatn,Tahoma,"DM Sans",system-ui,sans-serif;line-height:1.8}\
.mf{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end;margin-top:14px}\
@media(prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}\
@media(max-width:560px){.wrap.open .pill{display:none}.two{grid-template-columns:1fr}}';
var SHELL='<div class="wrap" id="wrap">\
<button class="pill" id="pill" type="button" title="Open or close the editor"><i class="dot"></i><span>Editor</span><kbd>E</kbd></button>\
<aside class="panel" id="panel" aria-label="Site editor" aria-hidden="true">\
<header><div class="ttl"><b>Site editor</b><span class="stat" id="stat"></span></div><button class="x" data-act="close" aria-label="Close editor" title="Close (E)">×</button></header>\
<nav class="tabs"><button data-tab="chars" class="on">Characters<em id="nc"></em></button><button data-tab="gallery">Gallery<em id="ng"></em></button></nav>\
<div class="body" id="body"></div>\
<footer><div class="folder" id="folder"></div><div class="acts"><button class="btn ghost" data-act="discard" id="bDiscard">Discard</button><button class="btn primary" data-act="save" id="bSave">Save to folder</button></div></footer>\
</aside>\
<div class="toasts" id="toasts" aria-live="polite"></div>\
<div class="modal" id="modal" hidden><div class="card" role="dialog" aria-modal="true"><h4 class="mt"></h4><div class="mb"></div><div class="mf"></div></div></div>\
</div>';

/* #endregion */
/* #region Editor UI: toasts and dialogs */
/* ---------- UI: toasts + dialogs ---------- */
function toast(msg,type,ms){var t=document.createElement('div');t.className='toast '+(type||'');t.textContent=msg;$('toasts').appendChild(t);setTimeout(function(){t.remove()},ms||3800)}
function ask(o){return new Promise(function(res){
 var m=$('modal');m.querySelector('.mt').textContent=o.title;m.querySelector('.mb').innerHTML=o.body;
 m.querySelector('.mf').innerHTML=o.buttons.map(function(b){return'<button class="btn '+(b.cls||'')+'" data-r="'+b.id+'">'+esc(b.label)+'</button>'}).join('');
 modalCancel=o.cancel||null;modalRes=function(r){m.hidden=true;modalRes=null;modalCancel=null;res(r)};m.hidden=false;
 var f=m.querySelector('.btn.primary')||m.querySelector('.btn:last-child');if(f)f.focus();
})}
function leaveAsk(){return ask({title:'Unsaved changes',body:'<p>Heads up: you are leaving the editing area with changes that are not saved to the folder yet. They stay here as a draft until you come back and press <b>Save</b> (or <b>Discard</b>).</p><p class="rtl" dir="rtl">توجه ادمین عزیز، داری از محیط ویرایش خارج می‌شی. تغییراتت به‌صورت پیش‌نویس نگه داشته می‌شن تا وقتی برگردی و Save یا Discard رو بزنی.</p>',buttons:[{id:'leave',label:'Leave, keep draft'},{id:'save',label:'Save, then leave'},{id:'stay',label:'Stay',cls:'primary'}],cancel:'stay'})}
function restoreAsk(){
 var changed=tryDo(function(){return stable(norm(clone(draft.data)))!==stable(base)||stable(dLore(draft))!==stable(baseLore)},true);
 return ask({title:'Restore your previous draft?',body:'<p>There are unsaved edits from <b>'+esc(new Date(draft.ts||Date.now()).toLocaleString())+'</b>. Restore them to continue where you stopped, or discard them and start from the saved site.</p><p class="rtl" dir="rtl">پیش‌نویس قبلی پیدا شد. بازیابی کنم تا از همون‌جا ادامه بدی، یا پاکش کنم؟</p>',buttons:[{id:'drop',label:'Discard draft',cls:'danger'},{id:'restore',label:'Restore draft',cls:'primary'}],cancel:null}).then(function(r){
  if(r==='restore'){
   work=norm(clone(draft.data));workLore=dLore(draft);window.SITE_DATA=work;window.SITE_LORE=workLore;tryDo(function(){sessionStorage.setItem(SS_LIVE,'1')});lastDraftAt=draft.ts||Date.now();
   return loadPending().then(function(){rebuildPage();render();updateUI();toast('Draft restored.','ok')});
  }
  return clearDraft().then(function(){updateUI();toast('Draft discarded.','ok')});
 });
}

/* #endregion */
/* #region Editor UI: rendering */
/* ---------- UI: rendering ---------- */
function thumbOf(c){var im=c.thumb||c.poster;return im?'<img class="th" src="'+esc(window.SITE_URL(im))+'" alt="">':'<span class="th ph" style="--c:'+esc(HEX.test(c.c)?c.c:'#5cc8ff')+'"></span>'}
function listHTML(){
 var cs=work.characters;
 return'<p class="intro">These appear on the home page and in the Projects dial, in this order. Drag the handle or use the arrows to reorder.</p>'
 +(cs.length?'<ul class="rows">'+cs.map(function(c,i){return'<li class="row" data-row="chars" data-i="'+i+'"><span class="grip" title="Drag to reorder">⋮⋮</span>'+thumbOf(c)+'<button class="nm" data-act="edit"><b>'+esc(c.name||'Untitled')+'</b><small>'+esc(c.tag||'')+'</small></button><span class="rb"><button class="ib" data-act="up" title="Move up"'+(i?'':' disabled')+'>↑</button><button class="ib" data-act="down" title="Move down"'+(i<cs.length-1?'':' disabled')+'>↓</button><button class="ib del" data-act="del" title="Delete">✕</button></span></li>'}).join('')+'</ul>':'<p class="empty">No characters yet.</p>')
 +'<button class="add" data-act="add">+ Add character</button>';
}
function fileState(path){var f=pending[path];return f?'<code>'+esc(f.name)+'</code> · '+fmtSize(f.blob.size)+' · <b style="color:#f0b84a">new, not saved yet</b>':'<code>'+esc(fname(path))+'</code>'}
function edHTML(i){
 var c=work.characters[i],isNew=!baseIds()[c.id];
 return'<div class="ed"><button class="back" data-act="back">← All characters</button><h3>'+esc(c.name||'Untitled')+'</h3><p class="sub">Link: <code>characters.html#<span id="idshow">'+esc(c.id)+'</span></code>'+(isNew?'':' · id is locked so existing links keep working')+'</p>'
 +'<label>Name<input type="text" data-f="name" value="'+esc(c.name)+'" autocomplete="off"></label>'
 +'<label>Subtitle<small>shown under the name</small><input type="text" data-f="tag" value="'+esc(c.tag)+'" placeholder="Robot · Blender" autocomplete="off"></label>'
 +'<label>One-line description<input type="text" data-f="line" value="'+esc(c.line)+'" autocomplete="off"></label>'
 +'<label>Short story<small>the few lines on the card · a blank line starts a new paragraph</small><textarea data-f="story" rows="8">'+esc((c.story||[]).join('\n\n'))+'</textarea></label>'
 +'<div class=\"fa\" style=\"margin:-6px 0 14px\"><button class=\"btn\" data-act=\"to-story\">Full story, cover &amp; color…</button></div>'
 +'<label>Tools &amp; tags<small>separate with commas</small><input type="text" data-f="meta" value="'+esc((c.meta||[]).join(', '))+'" placeholder="Hard-surface, Blender" autocomplete="off"></label>'
 +'<label>Accent color<span class="color"><input type="color" data-f="c" value="'+esc(HEX.test(c.c)?c.c:'#5cc8ff')+'"><input type="text" data-f="c" value="'+esc(c.c)+'" maxlength="7" autocomplete="off"></span></label>'
 +'<div class="fbox" data-drop="model"><div class="fh"><b>3D model</b><small>.glb file · drop it here</small></div><div class="fs'+(c.src?'':' none')+'">'+(c.src?fileState(c.src):'No model yet. The still image is shown instead.')+'</div><div class="fa"><button class="btn" data-act="pick-model">'+(c.src?'Replace model':'Choose .glb')+'</button>'+(c.src?'<button class="btn ghost" data-act="clr-model">Remove</button>':'')+'</div></div>'
 +'<div class="fbox" data-drop="poster"><div class="fh"><b>Still image</b><small>shown while the model loads · drop it here</small></div>'+(c.poster?'<div class="fp"><img src="'+esc(window.SITE_URL(c.poster))+'" alt=""><div class="fs" style="margin:0">'+fileState(c.poster)+'</div></div>':'<div class="fs none">No image yet.</div>')+'<div class="fa"><button class="btn" data-act="pick-poster">'+(c.poster?'Replace image':'Choose image')+'</button>'+(c.poster?'<button class="btn ghost" data-act="clr-poster">Remove</button>':'')+'</div></div>'
 +'<div class="fbox" data-drop="thumb"><div class="fh"><b>Card thumbnail</b><small>the small square on the home page</small></div>'+(c.thumb?'<div class="fp"><img class="sq" src="'+esc(window.SITE_URL(c.thumb))+'" alt=""></div>':'')
 +'<label class="chk"><input type="checkbox" data-act="thumbauto"'+(c.thumbAuto===true?' checked':'')+'> Make it automatically from the still image</label><div class="fa"><button class="btn" data-act="pick-thumb">Upload my own</button>'+(c.thumbAuto===true&&c.poster?'<button class="btn ghost" data-act="recrop">Re-crop</button>':'')+'</div></div>'
 +'<details><summary>Advanced</summary>'
 +'<label>Image framing<select data-f="fit"><option value="contain"'+(c.fit!=='cover'?' selected':'')+'>Contain (character on a clean background)</option><option value="cover"'+(c.fit==='cover'?' selected':'')+'>Cover (fills the whole area)</option></select></label>'
 +'<label>Image focus point<small>only for Cover, as “x% y%”</small><input type="text" data-f="pos" value="'+esc(c.pos||'50% 50%')+'" placeholder="50% 50%" autocomplete="off"></label>'
 +'<label>Camera start<small>model-viewer camera-orbit, leave empty for automatic</small><input type="text" data-f="orbit" value="'+esc(c.orbit||'')+'" placeholder="0deg 80deg 105%" autocomplete="off"></label>'
 +'<label>Panel tint<span class="color"><input type="color" data-f="bg" value="'+esc(HEX.test(c.bg)?c.bg:'#0f1a2a')+'"><input type="text" data-f="bg" value="'+esc(c.bg||'')+'" maxlength="7" autocomplete="off"></span></label>'
 +'</details>'
 +'<div class="danger-zone"><button class="btn danger" data-act="del-open">Delete this character</button></div></div>';
}
function galHTML(){
 var g=work.gallery;
 return'<div class="drop" data-drop="gallery" data-act="pick-gal">+ Add images<small>click here, or drop images onto this box</small></div>'
 +(g.length?'<ul class="grows">'+g.map(function(x,i){return'<li class="grow" data-row="gal" data-i="'+i+'"><span class="grip" title="Drag to reorder">⋮⋮</span><img class="th" src="'+esc(window.SITE_URL(x.src))+'" alt=""><div class="gf"><input type="text" data-g="title" value="'+esc(x.title)+'" placeholder="Title" autocomplete="off"><input type="text" data-g="note" value="'+esc(x.note)+'" placeholder="One line about it" autocomplete="off"></div><div class="gb"><button class="ib" data-act="up"'+(i?'':' disabled')+'>↑</button><button class="ib" data-act="down"'+(i<g.length-1?'':' disabled')+'>↓</button><button class="ib del" data-act="del" style="grid-column:1/3">✕</button></div></li>'}).join('')+'</ul>':'<p class="empty">No gallery images yet. They appear under “More models” in the Projects dial.</p>');
}
function render(){
 if(!root)return;var b=$('body'),st=b.scrollTop;
 b.innerHTML=view.tab==='chars'?(view.edit>=0&&work.characters[view.edit]?edHTML(view.edit):(view.edit=-1,listHTML())):view.tab==='stories'?storiesHTML():galHTML();
 b.scrollTop=st;
 [].forEach.call(root.querySelectorAll('.tabs button'),function(x){x.classList.toggle('on',x.dataset.tab===view.tab)});
 $('nc').textContent=work.characters.length;$('ng').textContent=work.gallery.length;if($('ns'))$('ns').textContent=loreCount();
 if(view.tab==='stories')showSel();
}
var folderName='';
function refreshFolder(h){folderName=h&&h.name||'';var f=$('folder');if(!f)return;
 if(!window.showDirectoryPicker){f.innerHTML='<span>Saving to a folder needs <b>Chrome or Edge</b>. Your edits are still kept as a draft.</span>';return}
 f.innerHTML=folderName?'<span>Folder:</span> <b>'+esc(folderName)+'</b><button class="lk" data-act="folder">Change</button>':'<span>No project folder chosen yet. Save will ask for it once.</span>'}
function updateUI(){
 if(!root)return;var d=dirty();
 $('wrap').classList.toggle('dirty',d);
 $('stat').textContent=d?'Unsaved changes'+(lastDraftAt?' · draft kept '+hhmm(lastDraftAt):' · saving draft…'):'Everything is saved';
 $('bSave').disabled=saving||!d;$('bSave').textContent=saving?'Saving…':'Save to folder';$('bDiscard').disabled=saving||!d;
 $('nc').textContent=work.characters.length;$('ng').textContent=work.gallery.length;if($('ns'))$('ns').textContent=loreCount();
}
function setOpen(o,silent){
 isOpen=!!o;$('wrap').classList.toggle('open',isOpen);$('panel').setAttribute('aria-hidden',isOpen?'false':'true');
 if(!silent)tryDo(function(){sessionStorage.setItem(SS_OPEN,isOpen?'1':'0')});
}
function previewChar(c){
 if(!document.getElementById('dial')||!c)return;
 clearTimeout(rbT);rebuildPage();
 history.replaceState(null,'','#'+encodeURIComponent(c.id));
 try{dispatchEvent(new HashChangeEvent('hashchange'))}catch(e){}
}

/* #endregion */
/* #region Editor UI: events */
/* ---------- UI: events ---------- */
function act(a,i,el){
 if(storyAct(a,i,el))return;
 var cs=work.characters,c=view.edit>=0?cs[view.edit]:null;
 switch(a){
 case'close':setOpen(false);break;
 case'save':save();break;
 case'discard':discard();break;
 case'folder':getDir(true,true).catch(function(e){if(e&&e.name!=='AbortError')toast(e.message,'err',6000)});break;
 case'add':{var n=newChar();cs.push(n);view.edit=cs.length-1;touch();render();previewChar(n);var nm=root.querySelector('[data-f="name"]');if(nm){nm.focus();nm.select()}break}
 case'edit':view.edit=i;render();previewChar(cs[i]);$('body').scrollTop=0;break;
 case'back':view.edit=-1;render();break;
 case'up':case'down':{var arr=view.tab==='gallery'?work.gallery:cs;moveItem(arr,i,i+(a==='up'?-1:1));touch();render();break}
 case'del':{if(view.tab==='gallery'){work.gallery.splice(i,1);touch();render();break}confirmDelete(i);break}
 case'del-open':confirmDelete(view.edit);break;
 case'pick-model':chooseModel(c);break;
 case'clr-model':c.src='';touch();render();break;
 case'pick-poster':pick('image/png,image/jpeg,image/webp').then(function(f){choosePoster(c,f)});break;
 case'clr-poster':c.poster='';if(c.thumbAuto===true)c.thumb='';touch();render();break;
 case'pick-thumb':pick('image/png,image/jpeg,image/webp').then(function(f){chooseThumb(c,f)});break;
 case'recrop':autoThumb(c).then(function(){touch();render()});break;
 case'pick-gal':pick('image/png,image/jpeg,image/webp',true).then(addGallery);break;
 }
}
function confirmDelete(i){
 var c=work.characters[i];if(!c)return;
 ask({title:'Delete “'+(c.name||'Untitled')+'”?',body:'<p>The character (and its full story) leaves the site once you press Save, and its model and image files are removed from your folder at that moment. Until then you can still bring it back with <b>Discard</b>.</p><p class="rtl" dir="rtl">این کاراکتر با زدن Save از سایت حذف می‌شه و فایل‌هاش هم از پوشه پاک می‌شن. تا قبل از Save با Discard برمی‌گرده.</p>',buttons:[{id:'no',label:'Keep it'},{id:'yes',label:'Delete',cls:'danger'}],cancel:'no'}).then(function(r){
  if(r!=='yes')return;work.characters.splice(i,1);delete workLore[c.id];view.edit=-1;touch();render();toast('Deleted. Press Save to remove it from the folder.','ok')});
}
function bind(){
 root.addEventListener('click',function(e){
  var r=e.target.closest('[data-r]');if(r&&modalRes){modalRes(r.dataset.r);return}
  if(e.target.id==='modal'&&modalCancel&&modalRes){modalRes(modalCancel);return}
  if(e.target.closest('#pill')){setOpen(!isOpen);return}
  if(e.target.closest('.sec .grip')){e.preventDefault();return}
  var t=e.target.closest('[data-tab]');if(t){view.tab=t.dataset.tab;view.edit=-1;if(view.tab==='stories')syncStory();else view.story=-1;render();$('body').scrollTop=0;if(view.tab==='gallery'&&document.getElementById('dial')){history.replaceState(null,'','#gallery');try{dispatchEvent(new HashChangeEvent('hashchange'))}catch(x){}}return}
  var a=e.target.closest('[data-act]');if(!a||a.type==='checkbox')return;
  var li=a.closest('[data-i]');act(a.dataset.act,li?+li.dataset.i:-1,a);
 });
 root.addEventListener('change',function(e){
  var t=e.target;if(t.dataset.act==='thumbauto'){var c=work.characters[view.edit];if(!c)return;c.thumbAuto=t.checked;
   (t.checked&&c.poster?autoThumb(c):Promise.resolve()).then(function(){touch();render()})}
 });
 root.addEventListener('input',function(e){
  var t=e.target;
  if(storyInput(t))return;
  if(t.dataset.f&&view.edit>=0&&work.characters[view.edit]){setField(work.characters[view.edit],t.dataset.f,t)}
  else if(t.dataset.g){var li=t.closest('[data-i]'),g=li&&work.gallery[+li.dataset.i];if(g){g[t.dataset.g]=t.value;touch()}}
 });
 /* reorder by dragging the handle */
 root.addEventListener('mousedown',function(e){var g=e.target.closest('.grip');if(g){var r=g.closest('[data-row]');r.draggable=true}});
 root.addEventListener('mouseup',function(){[].forEach.call(root.querySelectorAll('[data-row][draggable]'),function(r){r.draggable=false})});
 root.addEventListener('dragstart',function(e){var r=e.target.closest&&e.target.closest('[data-row]');if(!r||!r.draggable)return;dragI=+r.dataset.i;dragKind=r.dataset.row;r.classList.add('drag');e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain','row')});
 root.addEventListener('dragend',function(){dragI=null;[].forEach.call(root.querySelectorAll('.drag,.over'),function(x){x.classList.remove('drag','over')});[].forEach.call(root.querySelectorAll('[data-row][draggable]'),function(r){r.draggable=false})});
 root.addEventListener('dragover',function(e){
  var r=e.target.closest&&e.target.closest('[data-row]');
  if(dragI!==null&&r&&r.dataset.row===dragKind){e.preventDefault();[].forEach.call(root.querySelectorAll('.over'),function(x){x.classList.remove('over')});r.classList.add('over');return}
  var z=e.target.closest&&e.target.closest('[data-drop]');
  if(z&&e.dataTransfer&&[].indexOf.call(e.dataTransfer.types||[],'Files')>=0){e.preventDefault();z.classList.add('over')}
 });
 root.addEventListener('dragleave',function(e){var z=e.target.closest&&e.target.closest('[data-drop]');if(z&&!z.contains(e.relatedTarget))z.classList.remove('over')});
 root.addEventListener('drop',function(e){
  var r=e.target.closest&&e.target.closest('[data-row]');
  if(dragI!==null&&r&&r.dataset.row===dragKind){e.preventDefault();var to=+r.dataset.i,arr=dragKind==='gal'?work.gallery:dragKind==='sec'?curSecs():work.characters;moveItem(arr,dragI,to);dragI=null;touch();render();return}
  var z=e.target.closest&&e.target.closest('[data-drop]');if(!z)return;e.preventDefault();z.classList.remove('over');
  var files=[].slice.call(e.dataTransfer.files||[]),c=work.characters[view.edit],k=z.dataset.drop;
  if(k==='gallery')addGallery(files);else if(k==='banner')chooseBanner(files);else if(!c)return;
  else if(k==='model'){var f=files[0];if(f&&/\.glb$/i.test(f.name)){var path='models/'+(slug(c.id)||'model')+'-'+rnd()+'.glb';addPending(path,f,f.name);c.src=path;touch();render()}else toast('Please drop a .glb file.','err')}
  else if(k==='poster')choosePoster(c,files);else if(k==='thumb')chooseThumb(c,files);
 });
}

/* #endregion */
/* #region Stories: data and helpers */
/* ---------- full stories: the "Stories" tab (data/lore.js) ----------
   A story = sections {title, paras[]} per language (fa / en) + an optional cover picture ("banner") with a glow layer.
   Everything is kept in workLore, saved to data/lore.js; the page story.html redraws live while you type. */
/* Make sure lore is a plain object. */
function normLore(l){return l&&typeof l==='object'&&!Array.isArray(l)?l:{}}
function dLore(d){return LORE_FILE&&d&&d.lore?normLore(clone(d.lore)):clone(baseLore)}
function isStoryPage(){return /story\.html$/i.test(location.pathname)}
function pageId(){var h='';try{h=decodeURIComponent(location.hash.slice(1))}catch(e){}return h}
function syncStory(){
 if(!isStoryPage()){view.story=-1;return}
 var id=pageId()||Object.keys(workLore)[0]||'';
 view.story=work.characters.findIndex(function(c){return c.id===id});
}
function secCount(id,l){var e=workLore[id],a=e&&e[l];return Array.isArray(a)?a.length:0}
function loreCount(){return work.characters.filter(function(c){return secCount(c.id,'fa')||secCount(c.id,'en')}).length}
function curChar(){return work.characters[view.story]||null}
function curSecs(){var c=curChar(),e=c&&workLore[c.id];return e&&Array.isArray(e[view.lang])?e[view.lang]:[]}
function ensureSecs(){var c=curChar();if(!c)return null;var e=workLore[c.id]||(workLore[c.id]={});return Array.isArray(e[view.lang])?e[view.lang]:(e[view.lang]=[])}
function loreOf(id){return workLore[id]||(workLore[id]={})}
function countWords(list){var n=0;list.forEach(function(s){(s.paras||[]).forEach(function(p){n+=String(p).split(/\s+/).filter(Boolean).length})});return n}
/* Drop empty sections and empty characters before saving. */
function cleanLore(l){
 var o={};
 Object.keys(l).forEach(function(id){
  var e=l[id];if(!e||typeof e!=='object')return;
  var k={},has=false;
  Object.keys(e).forEach(function(key){
   if(key==='fa'||key==='en'){
    var a=(Array.isArray(e[key])?e[key]:[]).map(function(s){return{title:trim(s.title||''),paras:(s.paras||[]).map(trim).filter(Boolean)}}).filter(function(s){return s.title||s.paras.length});
    if(a.length){k[key]=a;has=true}
   }else if(key==='banner'){if(e.banner&&e.banner.src){k.banner=e.banner;has=true}}
   else k[key]=e[key];
  });
  if(has)o[id]=k;
 });
 return o;
}
/* Text of data/lore.js for the given stories. */
function serializeLore(l){return'/* Long stories (lore) of the characters, shown on story.html.\n   Written by the editor panel (Stories tab). You can also edit it by hand.\n   Shape: window.SITE_LORE = { <character id>: { fa: [ {title, paras:[...]} ], en: [ ...optional... ], banner: {src, x, y, h, eyes:{src,x,y,w,h}} } }\n   **double stars** make a word bold. */\nwindow.SITE_LORE = '+JSON.stringify(l,null,2)+';\n'}

/* #endregion */
/* #region Editor: Word import */
/* --- reading a story from a file ---
   Word: a paragraph styled "Heading 2" starts a section, "Heading 1" is the document title (skipped), bold runs become **bold**.
   Text: a line starting with ## starts a section, every other line is one paragraph. */
/* Turn text from a Word/plain-text file into story sections (one per heading). */
function parseText(text){
 var lines=String(text).replace(/\r/g,'').split('\n').map(function(x){return x.trim()}).filter(Boolean);
 var hasSub=lines.some(function(x){return /^#{2,6}\s+\S/.test(x)}),secs=[],cur=null;
 lines.forEach(function(x){
  var m=/^(#{1,6})\s+(.*)$/.exec(x);
  if(m){if(m[1].length===1&&hasSub)return;cur={title:m[2].replace(/\*\*/g,'').trim(),paras:[]};secs.push(cur);return}
  if(!cur){cur={title:'',paras:[]};secs.push(cur)}
  cur.paras.push(x);
 });
 return secs;
}
async function docxSections(file){
 var buf=await file.arrayBuffer(),u8=new Uint8Array(buf),dv=new DataView(buf),e=u8.length-22;
 while(e>=0&&dv.getUint32(e,true)!==0x06054b50)e--;
 if(e<0)throw new Error('not a zip');
 var cnt=dv.getUint16(e+10,true),p=dv.getUint32(e+16,true),xml=null,td=new TextDecoder();
 for(var k=0;k<cnt;k++){
  if(dv.getUint32(p,true)!==0x02014b50)break;
  var method=dv.getUint16(p+10,true),csize=dv.getUint32(p+20,true),nl=dv.getUint16(p+28,true),el=dv.getUint16(p+30,true),cl=dv.getUint16(p+32,true),lho=dv.getUint32(p+42,true);
  var name=td.decode(u8.subarray(p+46,p+46+nl));
  if(name==='word/document.xml'){
   var lnl=dv.getUint16(lho+26,true),lel=dv.getUint16(lho+28,true),st=lho+30+lnl+lel,data=u8.subarray(st,st+csize);
   xml=method===0?td.decode(data):td.decode(await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
   break;
  }
  p+=46+nl+el+cl;
 }
 if(xml==null)throw new Error('no document.xml');
 var doc=new DOMParser().parseFromString(xml,'application/xml'),W='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
 var kid=function(node,ln){return[].find.call(node.childNodes,function(n){return n.namespaceURI===W&&n.localName===ln})};
 var items=[];
 [].forEach.call(doc.getElementsByTagNameNS(W,'p'),function(para){
  var ppr=kid(para,'pPr'),ps=ppr&&kid(ppr,'pStyle'),sv=ps?(ps.getAttributeNS(W,'val')||ps.getAttribute('w:val')||''):'',hm=/^heading\s*([1-9])$/i.exec(sv),txt='';
  [].forEach.call(para.getElementsByTagNameNS(W,'r'),function(r){
   var t='';
   [].forEach.call(r.childNodes,function(n){if(n.namespaceURI!==W)return;if(n.localName==='t')t+=n.textContent;else if(n.localName==='tab'||n.localName==='br')t+=' '});
   if(!t)return;
   var rp=kid(r,'rPr'),b=rp&&kid(rp,'b'),on=b&&!/^(0|false|off)$/i.test(b.getAttributeNS(W,'val')||b.getAttribute('w:val')||'');
   txt+=on&&t.trim()?'**'+t+'**':t;
  });
  items.push({lvl:hm?+hm[1]:0,text:txt.replace(/\*\*\*\*/g,'').trim()});
 });
 var hasSub=items.some(function(x){return x.lvl>=2}),secs=[],cur=null;
 items.forEach(function(x){
  if(!x.text)return;
  if(x.lvl>=(hasSub?2:1)){cur={title:x.text.replace(/\*\*/g,'').trim(),paras:[]};secs.push(cur);return}
  if(x.lvl===1)return;
  if(!cur){cur={title:'',paras:[]};secs.push(cur)}
  cur.paras.push(x.text);
 });
 return secs;
}
async function importFile(f){
 if(!f)return;
 try{
  var secs=/\.docx$/i.test(f.name)?await docxSections(f):parseText(await f.text());
  applyImport(secs,f.name);
 }catch(e){console.error(e);toast('Could not read that file. Use a Word .docx or a plain text file.','err',6000)}
}
/* Put imported sections into the current story. */
function applyImport(secs,label){
 if(!secs||!secs.length){toast('No text found. In Word, give each section title the "Heading 2" style. In plain text, start each title line with ##.','err',8000);return}
 var l=ensureSecs();if(!l)return;
 var words=countWords(secs);
 function done(mode){
  if(mode==='replace')l.splice.apply(l,[0,l.length].concat(secs));else secs.forEach(function(s){l.push(s)});
  touch();render();toast('Imported '+secs.length+' sections ('+words+' words) from '+label+'.','ok',5000);
 }
 if(!l.length){done('replace');return}
 ask({title:'Replace the current story?',body:'<p>This '+(view.lang==='fa'?'Persian':'English')+' story already has <b>'+l.length+'</b> sections. The file has <b>'+secs.length+'</b>.</p><p>Replace swaps the whole text. Add puts the new sections at the end.</p>',buttons:[{id:'no',label:'Cancel'},{id:'add',label:'Add at the end'},{id:'replace',label:'Replace',cls:'danger'}],cancel:'no'}).then(function(r){if(r==='replace'||r==='add')done(r)});
}

/* #endregion */
/* #region Editor: cover picture */
/* --- cover picture: optional clean-up of a flat background, then saved as a normal image --- */
function mixLight(hex){
 var v=HEX.test(hex)?hex:'#5cc8ff',r=parseInt(v.slice(1,3),16),g=parseInt(v.slice(3,5),16),b=parseInt(v.slice(5,7),16);
 return[r,g,b].map(function(x){return Math.round((x*.35+78)*.55)});
}
function lighten(hex){
 var v=HEX.test(hex)?hex:'#5cc8ff',r=parseInt(v.slice(1,3),16),g=parseInt(v.slice(3,5),16),b=parseInt(v.slice(5,7),16);
 return[r,g,b].map(function(x){return Math.round(x+(255-x)*.45)});
}
/* Make a flat background transparent so a glow can sit on the eyes. */
function cleanFlat(g,W,H,accent){
 var img=g.getImageData(0,0,W,H),d=img.data,N=W*H,tol=14;
 var a=[d[0],d[1],d[2]],b=[d[(W-1)*4],d[(W-1)*4+1],d[(W-1)*4+2]];
 if(Math.max(Math.abs(a[0]-b[0]),Math.abs(a[1]-b[1]),Math.abs(a[2]-b[2]))>12)return false;
 var bg=new Uint8Array(N),stack=[];
 function push(p){if(!bg[p]){var i=p*4;if(Math.abs(d[i]-a[0])<=tol&&Math.abs(d[i+1]-a[1])<=tol&&Math.abs(d[i+2]-a[2])<=tol){bg[p]=1;stack.push(p)}}}
 var x,y;
 for(x=0;x<W;x++){push(x);push((H-1)*W+x)}
 for(y=0;y<H;y++){push(y*W);push(y*W+W-1)}
 while(stack.length){var p=stack.pop();x=p%W;y=(p-x)/W;if(x>0)push(p-1);if(x<W-1)push(p+1);if(y>0)push(p-W);if(y<H-1)push(p+W)}
 var cnt=0;for(var q=0;q<N;q++)cnt+=bg[q];
 if(cnt<N*.04)return false;
 var m2=new Uint8Array(bg);                         /* swallow the 1px antialiased fringe */
 for(y=0;y<H;y++)for(x=0;x<W;x++){var pp=y*W+x;if(bg[pp]){if(x>0)m2[pp-1]=1;if(x<W-1)m2[pp+1]=1;if(y>0)m2[pp-W]=1;if(y<H-1)m2[pp+W]=1}}
 var mc=document.createElement('canvas');mc.width=W;mc.height=H;var mg=mc.getContext('2d',{willReadFrequently:true}),md=mg.createImageData(W,H);
 for(var k=0;k<N;k++)md.data[k*4+3]=m2[k]?255:0;
 mg.putImageData(md,0,0);
 var bc=document.createElement('canvas');bc.width=W;bc.height=H;var bgx=bc.getContext('2d',{willReadFrequently:true});bgx.filter='blur(1px)';bgx.drawImage(mc,0,0);
 var soft=bgx.getImageData(0,0,W,H).data,dk=[5,8,12],lg=mixLight(accent),cx=W*.5,cy=H*.4,rx=W*.396,ry=H*.52;
 for(y=0;y<H;y++)for(x=0;x<W;x++){
  var o=y*W+x,m=soft[o*4+3]/255;if(m<=0)continue;
  var dx=(x-cx)/rx,dy=(y-cy)/ry,t=Math.pow(Math.max(0,1-Math.sqrt(dx*dx+dy*dy)),1.6),i=o*4,n=(Math.random()-.5)*2.2;
  for(var c=0;c<3;c++){var back=dk[c]+(lg[c]-dk[c])*t+n;d[i+c]=d[i+c]*(1-m)+back*m}
 }
 g.putImageData(img,0,0);
 return true;
}
async function processBanner(file,clean,accent){
 var url=URL.createObjectURL(file);
 try{
  var im=await loadImg(url),k=Math.min(1,1920/im.naturalWidth),W=Math.round(im.naturalWidth*k),H=Math.round(im.naturalHeight*k);
  var cv=document.createElement('canvas');cv.width=W;cv.height=H;var g=cv.getContext('2d',{willReadFrequently:true});g.drawImage(im,0,0,W,H);
  var note='';
  if(clean&&!cleanFlat(g,W,H,accent))note='The background is not one flat color, so the picture was kept as it is.';
  return{blob:await toBlob(cv,'image/jpeg',.9),ext:'jpg',note:note,r:Math.round(W/H*10000)/10000};
 }finally{URL.revokeObjectURL(url)}
}
async function chooseBanner(files){
 var f=files&&files[0],c=curChar();if(!f||!c)return;
 if(!EXT[f.type]){toast('Use a JPG, PNG or WebP image.','err');return}
 var clean=!!($('optclean')&&$('optclean').checked);
 try{
  var r=await processBanner(f,clean,c.c),path='images/'+(slug(c.id)||'char')+'-cover-'+rnd()+'.'+r.ext,e=loreOf(c.id),old=e.banner||{};
  addPending(path,r.blob,f.name);
  e.banner={src:path,r:r.r,x:old.x!=null?old.x:70,y:old.y!=null?old.y:54,h:old.h!=null?old.h:108};
  view.sel=null;touch();render();
  toast(r.note||(old.eyes?'Cover replaced. The glow was reset, because it belonged to the old picture.':'Cover picture added.'),r.note?'warn':'ok',6000);
 }catch(err){console.error(err);toast('Could not read that image.','err')}
}
async function makeGlow(){
 var c=curChar(),bn=c&&workLore[c.id]&&workLore[c.id].banner;
 if(!bn||!bn.src){toast('Add a cover picture first.','err');return}
 var sel=view.sel;
 if(!sel||sel.w<1||sel.h<1){toast('Drag a box around the glowing part of the picture first.','warn');return}
 try{
  var im=await loadImg(window.SITE_URL(bn.src)),W=im.naturalWidth,H=im.naturalHeight;
  var x0=Math.round(sel.x/100*W),y0=Math.round(sel.y/100*H),w=Math.max(1,Math.min(W-x0,Math.round(sel.w/100*W))),h=Math.max(1,Math.min(H-y0,Math.round(sel.h/100*H)));
  var cv=document.createElement('canvas');cv.width=w;cv.height=h;var g=cv.getContext('2d',{willReadFrequently:true});g.drawImage(im,x0,y0,w,h,0,0,w,h);
  var d=g.getImageData(0,0,w,h),px=d.data,thr=+($('gthr')&&$('gthr').value)||90,tint=lighten(c.c),n=0;
  for(var k=0;k<px.length;k+=4){var lum=(px[k]+px[k+1]+px[k+2])/3,a=Math.max(0,Math.min(1,(lum-thr)/100));px[k]=tint[0];px[k+1]=tint[1];px[k+2]=tint[2];px[k+3]=Math.round(a*255);if(a>.2)n++}
  if(n<6){toast('Nothing bright found in that box. Try a lower sensitivity, or a box that covers the glowing part.','warn',6000);return}
  g.putImageData(d,0,0);
  var path='images/'+(slug(c.id)||'char')+'-glow-'+rnd()+'.png';
  addPending(path,await toBlob(cv,'image/png'),'glow.png');
  var r2=function(v){return Math.round(v*100)/100};
  bn.eyes={src:path,x:r2(x0/W*100),y:r2(y0/H*100),w:r2(w/W*100),h:r2(h/H*100)};
  view.sel=null;touch();render();toast('Glow added. Look at the page: it follows the shape of the bright parts.','ok',5000);
 }catch(err){console.error(err);toast('Could not make the glow.','err')}
}

/* #endregion */
/* #region Stories: tab */
/* --- the tab itself --- */
function showSel(){
 var s=$('sel');if(!s)return;
 var c=curChar(),bn=c&&workLore[c.id]&&workLore[c.id].banner,r=view.sel||(bn&&bn.eyes?bn.eyes:null);
 if(!r){s.style.display='none';return}
 s.style.cssText='display:block;left:'+r.x+'%;top:'+r.y+'%;width:'+r.w+'%;height:'+r.h+'%';
 s.classList.toggle('fresh',!!view.sel);
}
function storiesHTML(){
 if(view.story>=0&&curChar())return storyEdHTML(view.story);
 view.story=-1;
 var cs=work.characters;
 if(!cs.length)return'<p class="empty">No characters yet. Add a character first, then come back here to give it a story.</p><button class="add" data-act="goto-chars">Go to Characters</button>';
 return'<p class="intro">The long story behind each character. It opens from the “Read full story” button on the character card. Pick a character to write or import its story, and to set its color and cover picture.</p>'
 +'<ul class="rows">'+cs.map(function(c,i){
  var fa=secCount(c.id,'fa'),en=secCount(c.id,'en'),st=fa||en?[fa?fa+' sections · Persian':'',en?en+' sections · English':''].filter(Boolean).join(' · '):'No story yet';
  return'<li class="row" data-i="'+i+'">'+thumbOf(c)+'<button class="nm" data-act="edit-story"><b>'+esc(c.name||'Untitled')+'</b><small>'+esc(st)+'</small></button><span class="rb"><button class="ib" data-act="edit-story" title="Edit story">✎</button></span></li>';
 }).join('')+'</ul><p class="hint" style="margin-top:0">A character that is not in this list yet? Add it in the Characters tab first.</p>';
}
function secHTML(s,n,total){
 return'<li class="sec" data-row="sec" data-i="'+n+'"><details><summary><span class="grip" title="Drag to reorder">⋮⋮</span><span class="sn">'+(n+1)+'</span><span class="st" dir="auto">'+esc(s.title||'Untitled section')+'</span></summary>'
 +'<div class="sb"><label>Title<input type="text" dir="auto" data-s="title" value="'+esc(s.title)+'" autocomplete="off"></label>'
 +'<label>Text<small>blank line = new paragraph · **word** = bold</small><textarea dir="auto" data-s="paras" rows="10">'+esc((s.paras||[]).join('\n\n'))+'</textarea></label>'
 +'<div class="fa"><button class="btn" data-act="sec-up"'+(n?'':' disabled')+'>↑ Move up</button><button class="btn" data-act="sec-down"'+(n<total-1?'':' disabled')+'>↓ Move down</button><button class="btn danger" data-act="sec-del">Delete</button></div></div></details></li>';
}
function storyEdHTML(i){
 var c=work.characters[i],id=c.id,L=workLore[id]||{},list=Array.isArray(L[view.lang])?L[view.lang]:[],bn=L.banner&&L.banner.src?L.banner:null,col=HEX.test(c.c)?c.c:'#5cc8ff';
 var fa=secCount(id,'fa'),en=secCount(id,'en'),words=countWords(list);
 var h='<div class="ed"><button class="back" data-act="back-story">← All stories</button><h3>'+esc(c.name||'Untitled')+'</h3>'
 +'<p class="sub">Page: <code>story.html#'+esc(id)+'</code> · <button class="lk2" data-act="open-page">'+(isStoryPage()?'show it':'open it')+'</button></p>'
 +'<div class="seg"><button data-act="lang" data-v="fa"'+(view.lang==='fa'?' class="on"':'')+'><bdi>فارسی</bdi><em>'+fa+'</em></button><button data-act="lang" data-v="en"'+(view.lang==='en'?' class="on"':'')+'>English<em>'+en+'</em></button></div>'
 +(view.lang==='en'?'<p class="hint" style="margin-top:-6px">Optional. While the English story is empty, English visitors see the Persian text with a small “Persian only” notice.</p>':'')
 +'<details class="grp" open><summary>Story text · '+list.length+' sections'+(words?' · '+words+' words':'')+'</summary>'
 +'<div class="fa" style="margin:2px 0 12px"><button class="btn primary" data-act="import-file">Import from Word / text file</button></div>'
 +'<p class="hint" style="margin-top:-2px">Word: give every section title the <b>Heading 2</b> style (the document title can be Heading 1). Bold words stay bold.</p>'
 +(list.length?'<ul class="rows" id="seclist">'+list.map(function(s,n){return secHTML(s,n,list.length)}).join('')+'</ul>':'<p class="empty" style="padding:6px 0 14px">No sections yet. Import a file, or add the first one.</p>')
 +'<button class="add" data-act="add-sec" style="margin-bottom:12px">+ Add section</button>'
 +'<details class="sub2"><summary>Paste text instead</summary><textarea id="pastebox" dir="auto" rows="7" placeholder="## 1. First title&#10;First paragraph.&#10;Second paragraph.&#10;## 2. Second title&#10;…"></textarea><p class="hint" style="margin:8px 0 10px">Start each section with a line like <code>## Title</code>. Every other line is one paragraph.</p><button class="btn" data-act="import-paste">Import this text</button></details>'
 +'</details>'
 +'<details class="grp" open><summary>Look · color &amp; cover</summary>'
 +'<label>Accent color<small>the same color as the character card</small><span class="color"><input type="color" data-sf="c" value="'+esc(col)+'"><input type="text" data-sf="c" value="'+esc(c.c)+'" maxlength="7" autocomplete="off"></span></label>'
 +'<div class="fbox" data-drop="banner"><div class="fh"><b>Cover picture</b><small>wide image behind the title · drop it here</small></div>'
 +(bn?'<div class="bprev" id="bprev"><img src="'+esc(window.SITE_URL(bn.src))+'" alt="" draggable="false"><i class="sel" id="sel"></i></div><div class="fs">'+fileState(bn.src)+'</div>':'<div class="fs none">No cover yet. The still image of the character is used.</div>')
 +'<label class="chk"><input type="checkbox" id="optclean" checked> Clean a flat background <small>(for renders on a plain gray or white backdrop)</small></label>'
 +'<div class="fa"><button class="btn" data-act="pick-banner">'+(bn?'Replace picture':'Choose picture')+'</button>'+(bn?'<button class="btn ghost" data-act="clr-banner">Remove</button>':'')+'</div>'
 +(bn?'<div style="margin-top:14px"><label>Position across<small>left ⟷ right</small><input type="range" min="10" max="90" data-sf="bx" value="'+(bn.x!=null?bn.x:70)+'"></label><label>Position up / down<input type="range" min="20" max="80" data-sf="by" value="'+(bn.y!=null?bn.y:54)+'"></label><label style="margin-bottom:0">Size<input type="range" min="60" max="180" data-sf="bh" value="'+(bn.h!=null?bn.h:108)+'"></label></div>':'')
 +'</div>'
 +(bn?'<div class="fbox"><div class="fh"><b>Glow</b><small>optional · for lit eyes or lights</small></div><p class="hint" style="margin:0 0 10px">Drag a box over the glowing part on the picture above, then press <b>Make glow</b>. Only the bright shapes are copied and made to shine softly.</p><label>Sensitivity<small>lower = more of the picture glows</small><input type="range" min="40" max="220" value="90" id="gthr"></label><div class="fa"><button class="btn" data-act="make-glow">Make glow</button>'+(bn.eyes?'<button class="btn ghost" data-act="clr-glow">Remove glow</button>':'')+'</div></div>':'')
 +'</details></div>';
 return h;
}
function storyAct(a,i,el){
 var cs=work.characters;
 switch(a){
  case'goto-chars':view.tab='chars';render();return true;
  case'to-story':{if(!cs[view.edit])return true;view.tab='stories';view.story=view.edit;view.edit=-1;render();$('body').scrollTop=0;focusStoryPage();return true}
  case'edit-story':view.story=i;view.sel=null;render();$('body').scrollTop=0;focusStoryPage();return true;
  case'back-story':view.story=-1;view.sel=null;render();return true;
  case'lang':view.lang=el.dataset.v==='en'?'en':'fa';render();return true;
  case'open-page':{var c0=curChar();if(c0)goPage(c0.id);return true}
  case'add-sec':{var l=ensureSecs();if(!l)return true;l.push({title:'',paras:[]});touch();render();var ds=root.querySelectorAll('.sec details'),d=ds[ds.length-1];if(d){d.open=true;d.scrollIntoView({block:'center'});var t=d.querySelector('[data-s="title"]');if(t)t.focus()}return true}
  case'sec-up':case'sec-down':{moveItem(curSecs(),i,i+(a==='sec-up'?-1:1));touch();render();return true}
  case'sec-del':{var sl=curSecs(),sx=sl[i];if(!sx)return true;
   ask({title:'Delete this section?',body:'<p>“'+esc(sx.title||'Untitled section')+'” leaves the story once you press Save. Until then <b>Discard</b> brings it back.</p>',buttons:[{id:'no',label:'Keep it'},{id:'yes',label:'Delete',cls:'danger'}],cancel:'no'}).then(function(r){if(r==='yes'){sl.splice(i,1);touch();render()}});return true}
  case'import-file':pick('.docx,.txt,.md,text/plain').then(function(fs){importFile(fs[0])});return true;
  case'import-paste':{var pb=$('pastebox');if(pb&&pb.value.trim())applyImport(parseText(pb.value),'the pasted text');else toast('Paste the text first.','warn');return true}
  case'pick-banner':pick('image/png,image/jpeg,image/webp').then(chooseBanner);return true;
  case'clr-banner':{var cb=curChar(),e=cb&&workLore[cb.id];if(e)delete e.banner;view.sel=null;touch();render();return true}
  case'make-glow':makeGlow();return true;
  case'clr-glow':{var cg=curChar(),eg=cg&&workLore[cg.id];if(eg&&eg.banner)delete eg.banner.eyes;touch();render();return true}
 }
 return false;
}
function storyInput(t){
 if(t.dataset.s){
  var li=t.closest('[data-i]'),s=li&&curSecs()[+li.dataset.i];if(!s)return true;
  if(t.dataset.s==='title'){s.title=t.value;var st=li.querySelector('.st');if(st)st.textContent=t.value||'Untitled section'}
  else s.paras=t.value.split(/\n\s*\n/).map(trim).filter(Boolean);
  touch();return true;
 }
 if(t.dataset.sf){
  var c=curChar();if(!c)return true;var f=t.dataset.sf;
  if(f==='c'){if(!HEX.test(t.value))return true;c.c=t.value.toLowerCase();[].forEach.call(root.querySelectorAll('[data-sf="c"]'),function(x){if(x!==t&&x.value!==c.c)x.value=c.c})}
  else{var e=workLore[c.id],b=e&&e.banner;if(!b)return true;b[f==='bx'?'x':f==='by'?'y':'h']=+t.value}
  touch();return true;
 }
 return false;
}
function focusStoryPage(){
 var c=curChar();if(!c||!isStoryPage()||pageId()===c.id)return;
 history.replaceState(null,'','#'+encodeURIComponent(c.id));
 try{dispatchEvent(new HashChangeEvent('hashchange'))}catch(e){}
}
function goPage(id){
 if(isStoryPage()){location.hash=encodeURIComponent(id);return}
 saveDraft();allowNav=true;location.href='story.html#'+encodeURIComponent(id);
}
function bindStory(){
 var drag=null,clamp=function(v){return Math.max(0,Math.min(100,v))};
 root.addEventListener('pointerdown',function(e){
  var p=e.target.closest&&e.target.closest('#bprev');if(!p)return;
  e.preventDefault();var r=p.getBoundingClientRect();
  drag={r:r,x0:clamp((e.clientX-r.left)/r.width*100),y0:clamp((e.clientY-r.top)/r.height*100)};
  if(p.setPointerCapture)try{p.setPointerCapture(e.pointerId)}catch(x){}
  view.sel=null;showSel();
 });
 root.addEventListener('pointermove',function(e){
  if(!drag)return;
  var x=clamp((e.clientX-drag.r.left)/drag.r.width*100),y=clamp((e.clientY-drag.r.top)/drag.r.height*100);
  view.sel={x:Math.min(drag.x0,x),y:Math.min(drag.y0,y),w:Math.abs(x-drag.x0),h:Math.abs(y-drag.y0)};showSel();
 });
 root.addEventListener('pointerup',function(){drag=null});
}
var CSS2=`
.seg{display:flex;gap:6px;margin:0 0 14px}
.seg button{flex:1;padding:9px 10px;border-radius:11px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);cursor:pointer;color:#a9b6c4;font:600 13px/1 "DM Sans",system-ui,sans-serif}
.seg button:hover{border-color:rgba(92,200,255,.5)}.seg button.on{border-color:#5cc8ff;color:#fff;background:rgba(92,200,255,.13)}
.seg em{font-style:normal;color:#6f8093;margin-left:6px;font-weight:500}
.lk2{background:none;border:0;padding:0;color:#9fd6ff;cursor:pointer;font-size:12px}.lk2:hover{color:#fff}
details.grp{margin:0 0 14px;padding:0 12px 4px}details.grp>summary{padding:13px 0}
details.sub2{margin:0 0 6px;padding:0 12px 12px}details.sub2 textarea{min-height:110px;font-size:13px}
.sec{list-style:none}
.sec details{margin:0;padding:0 12px;border-radius:14px;background:rgba(255,255,255,.035);transition:border-color .2s}
.sec.over details{border-color:#5cc8ff}.sec.drag{opacity:.45}
.sec summary{display:flex;align-items:center;gap:10px;padding:10px 0;color:#e8f1f8;font:500 14px/1.3 "DM Sans",system-ui,sans-serif;letter-spacing:0}
.sec summary::after{display:none}
.sec .sn{flex:none;min-width:24px;height:24px;display:grid;place-items:center;border-radius:8px;background:rgba(92,200,255,.14);color:#9fd6ff;font:600 12px/1 "DM Sans",system-ui,sans-serif}
.sec .st{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-family:Vazirmatn,Tahoma,"DM Sans",system-ui,sans-serif}
.sec .grip{padding:6px 2px 6px 0}
.sb{padding:2px 0 14px}.sb textarea,.sb input[type=text],#pastebox{font-family:Vazirmatn,Tahoma,"DM Sans",system-ui,sans-serif;line-height:1.85}
input[type=range]{display:block;width:100%;margin:10px 0 2px;accent-color:#5cc8ff;cursor:pointer}
.bprev{position:relative;margin:0 0 10px;border-radius:10px;overflow:hidden;cursor:crosshair;line-height:0;border:1px solid rgba(255,255,255,.1);touch-action:none;user-select:none}
.bprev img{width:100%;display:block;pointer-events:none}
.sel{position:absolute;display:none;pointer-events:none;border:1.5px dashed rgba(159,214,255,.9);background:rgba(92,200,255,.12);border-radius:3px}.sel.fresh{border-style:solid;border-color:#fff;background:rgba(92,200,255,.2)}
`;

/* #endregion */
/* #region Editor: global keys and leave warning */
/* ---------- global keys + leave warning ---------- */
addEventListener('keydown',function(e){
 if(!root)return;
 var t=(e.composedPath&&e.composedPath()[0])||e.target,tag=t&&t.tagName,typing=tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT'||(t&&t.isContentEditable);
 if(modalRes){if(e.key==='Escape'&&modalCancel){e.preventDefault();modalRes(modalCancel)}return}
 if((e.ctrlKey||e.metaKey)&&(e.key==='s'||e.key==='S'||e.code==='KeyS')&&isOpen){e.preventDefault();save();return}
 if(e.key==='Escape'&&isOpen){if(typing)t.blur();else setOpen(false);return}
 if(e.code==='KeyE'&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!e.shiftKey&&!e.repeat&&!e.isComposing&&!typing){e.preventDefault();setOpen(!isOpen)}
},true);
document.addEventListener('click',function(e){
 if(!dirty()||allowNav||e.defaultPrevented||e.button||e.metaKey||e.ctrlKey||e.shiftKey)return;
 var a=e.target.closest&&e.target.closest('a[href]');if(!a||(a.target&&a.target!=='_self')||a.hasAttribute('download'))return;
 var u;try{u=new URL(a.href,location.href)}catch(x){return}
 if(!/^https?:$/.test(u.protocol))return;
 if(u.origin===location.origin&&u.pathname===location.pathname)return;
 e.preventDefault();e.stopImmediatePropagation();
 leaveAsk().then(function(r){
  if(r==='leave'){saveDraft();allowNav=true;a.click()}
  else if(r==='save')save().then(function(ok){if(ok){allowNav=true;a.click()}});
 });
},true);

/* #endregion */
/* #region Editor: start */
/* ---------- start ---------- */
function boot(){
 host=document.createElement('div');host.id='mm-editor';document.body.appendChild(host);
 root=host.attachShadow({mode:'open'});root.innerHTML='<style>'+CSS+CSS2+'</style>'+SHELL;
 var tb=root.querySelector('.tabs'),sbt=document.createElement('button');sbt.dataset.tab='stories';sbt.innerHTML='Stories<em id="ns"></em>';tb.insertBefore(sbt,tb.querySelector('[data-tab="gallery"]'));
 if(isStoryPage()){view.tab='stories';syncStory()}
 bindStory();addEventListener('hashchange',function(){if(!root||!isStoryPage()||view.tab!=='stories')return;var before=view.story;syncStory();if(view.story!==before)render()});
 bind();render();updateUI();refreshFolder(null);
 kvGet('dir').then(function(h){if(h)refreshFolder(h)});
 if(tryDo(function(){return sessionStorage.getItem(SS_OPEN)==='1'},false))setOpen(true,true);
 if(live&&draft)loadPending().then(function(){rebuildPage();render()});
 if(needRestoreAsk)setTimeout(restoreAsk,400);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
/* #endregion */
})();
