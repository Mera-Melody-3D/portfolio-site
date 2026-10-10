/* Contents (VS Code: Ctrl+K Ctrl+0 folds everything; search "#region" to jump):
   1. Setup: data, elements, state
   2. Dial: gear teeth
   3. Helpers
   4. Panes: info, media, gallery
   5. Model: spin and drag
   6. Model: create on demand
   7. Selection
   8. Build dial and panes
   9. Dial: open, close, keys
   10. Deep links and start-up
*/
(function(){
/* #region Setup: data, elements, state */
/* Everything shown here comes from data/site.js (window.SITE_DATA). Add, edit or remove characters with the editor panel
   (run the site on localhost and press E), or edit data/site.js by hand. */
var U=function(p){return window.SITE_URL?window.SITE_URL(p):p};
var L=function(k,d){return window.MM_LANG?MM_LANG.t(k,d):d};
var GAL_COLOR='#8fdcff',STEP=27;
var CHARS=[],GALLERY=[],N=1,GALLERY_INDEX=0,items=[];
var deck=document.getElementById('deck'),dial=document.getElementById('dial'),hub=document.getElementById('hub'),opts=document.getElementById('opts'),
    stage=document.getElementById('stage'),hintEl=document.getElementById('dhint'),cnt=document.getElementById('cnt'),g1=document.getElementById('g1'),
    lb=document.getElementById('lb'),lbi=lb.querySelector('img'),lbp=lb.querySelector('p');
var panes=[],btns=[],cur=-1,rot=0,armed=false,armT,hoverT,cache={};

/* #endregion */
/* #region Dial: gear teeth */
/* gear teeth (decorative ring that turns with the selection) */
(function(){var n=40,a=360/n,d='';function P(r,deg){var t=deg*Math.PI/180;return (r*Math.cos(t)).toFixed(2)+' '+(r*Math.sin(t)).toFixed(2)}
 for(var i=0;i<n;i++){var s=i*a;d+=(i?'L':'M')+P(91,s-a*.5)+'L'+P(98.5,s-a*.27)+'L'+P(98.5,s+a*.27)+'L'+P(91,s+a*.5)}
 g1.innerHTML='<path d="'+d+'Z" fill="rgba(255,255,255,.035)" stroke="rgba(255,255,255,.32)" stroke-width=".6" stroke-linejoin="round"/><circle r="84" fill="none" stroke="rgba(255,255,255,.10)" stroke-width=".5"/>'})();

/* #endregion */
/* #region Helpers */
/* Make an element with an optional class and inner HTML. */
function el(t,c,h){var e=document.createElement(t);if(c)e.className=c;if(h!=null)e.innerHTML=h;return e}
/* Escape text so it is safe inside HTML. */
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(m){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]})}
/* Two-digit number: 1 -> "01". */
function pad(n){return('0'+n).slice(-2)}
function indexOfId(id){for(var i=0;i<items.length;i++)if(items[i].id===id)return i;return -1}
function readData(){var d=window.SITE_DATA||{};CHARS=Array.isArray(d.characters)?d.characters:[];GALLERY=Array.isArray(d.gallery)?d.gallery:[];N=CHARS.length+1;GALLERY_INDEX=N-1}

/* #endregion */
/* #region Panes: info, media, gallery */
/* ---- panes ---- */
/* True when data/lore.js has a long story for this character. */
function hasLore(c){var l=window.SITE_LORE&&SITE_LORE[c.id];return!!(l&&((l.fa&&l.fa.length)||(l.en&&l.en.length)))}
function moreHTML(c){return hasLore(c)?'<div class="morewrap"><a class="more" href="story.html#'+encodeURIComponent(c.id)+'" data-go><span data-i18n="btn.story">Read full story</span><i aria-hidden="true">→</i></a></div>':''}
function infoHTML(c){c=window.MM_T?MM_T(c):c;return'<span class="tag">'+esc(c.tag)+'</span><h2>'+esc(c.name)+'</h2><p class="line">'+esc(c.line)+'</p><div class="story">'+(c.story||[]).map(function(s){return'<p>'+esc(s)+'</p>'}).join('')+'</div>'+moreHTML(c)+'<ul class="chips">'+(c.meta||[]).map(function(m){return'<li>'+esc(m)+'</li>'}).join('')+'</ul>'}
function mvKey(c){return U(c.src||'')+'|'+(c.orbit||'')}
function mediaSig(c){return JSON.stringify([U(c.src||''),c.orbit||'',U(c.poster||''),c.fit||'',c.pos||''])}
/* Build (or reuse) the panel of one character: text on one side, picture and 3D model on the other. */
function mkPane(c,on){
 var old=cache[c.id],ms=mediaSig(c),sty='--c:'+(c.c||'#5cc8ff')+';--bg2:'+(c.bg||'#0f1a2a');
 if(old&&old.ms===ms){old.pane.style.cssText=sty;old.pane.querySelector('.info').innerHTML=infoHTML(c);old.pane.classList.toggle('on',!!on);return old.pane}
 var p=el('article','pane'+(on?' on':''));p.id='p-'+c.id;p.setAttribute('aria-hidden','true');p.style.cssText=sty;
 p.innerHTML='<div class="info">'+infoHTML(c)+'</div>'
 +'<div class="media"><div class="mv" style="--pos:'+esc(c.pos||'50% 50%')+'">'+(c.poster?'<img class="poster'+(c.fit==='cover'?' cover':'')+'" src="'+esc(U(c.poster))+'" alt="'+esc(c.name)+', 3D character">':'')+'</div><span class="hint" data-i18n="drag">Drag to rotate</span></div>';
 var rec={ms:ms,pane:p,mv:null,key:null};
 if(old&&old.mv&&old.key===mvKey(c)){p.querySelector('.mv').appendChild(old.mv);rec.mv=old.mv;rec.key=old.key;if(old.pane.classList.contains('ok'))p.classList.add('ok')}
 cache[c.id]=rec;return p}
/* Build the "More models" panel with the gallery pictures. */
function mkGallery(on){
 var p=el('article','pane'+(on?' on':''));p.id='p-gallery';p.setAttribute('aria-hidden','true');p.style.cssText='--c:'+GAL_COLOR;
 p.innerHTML='<div class="info"><span class="tag" data-i18n="gal.tag">Gallery</span><h2 data-i18n="more">More models</h2><p class="line" data-i18n="gal.line">Everything else I have built.</p><div class="story"><p data-i18n="gal.click">Click an image to see it larger.</p></div></div><div class="gwrap"><div class="gal"></div></div>';
 var gal=p.querySelector('.gal');
 if(GALLERY.length)GALLERY.forEach(function(g){var t=(g.title||'')+(g.note?' — '+g.note:''),f=el('figure','tile','<img loading="lazy" alt=""><figcaption></figcaption>');f.firstChild.src=U(g.src);f.firstChild.alt=g.title||'';f.lastChild.textContent=t;f.onclick=function(){lbi.src=U(g.src);lbi.alt=g.title||'';lbp.textContent=t;lb.classList.add('on')};gal.appendChild(f)});
 else['4/5','1/1','3/4'].forEach(function(r){var f=el('div','tile empty','<span data-i18n="soon">Next model soon</span>');f.style.aspectRatio=r;gal.appendChild(f)});
 return p}
lb.onclick=function(){lb.classList.remove('on')};

/* #endregion */
/* #region Model: spin and drag */
/* ---- spinning the model (not the camera) ---- */
/* Start or stop the built-in spin animation of a model. */
function spin(m,on){try{if(!m.loaded)return;if(on&&!m._drag)m.play({repetitions:Infinity});else if(!on)m.pause()}catch(e){}}
/* Let the visitor drag sideways to turn the model by hand. */
function spinDrag(m){
 var x0=0,down=false,t=0;
 m.addEventListener('pointerdown',function(e){down=true;x0=e.clientX;m._drag=true;clearTimeout(t)});
 window.addEventListener('pointermove',function(e){if(!down)return;var dx=e.clientX-x0;x0=e.clientX;
  if(!m.loaded||!m.duration)return;try{m.pause()}catch(_){}
  m.currentTime=((m.currentTime+dx*0.027)%m.duration+m.duration)%m.duration});
 window.addEventListener('pointerup',function(){if(!down)return;down=false;clearTimeout(t);
  t=setTimeout(function(){m._drag=false;var r=cache[(CHARS[cur]||{}).id];if(r&&r.mv===m)spin(m,true)},2500)});
}

/* #endregion */
/* #region Model: create on demand */
/* 3D models are created the first time a character is shown (the still image is the fallback) */
function ensureModel(i){var c=CHARS[i],rec=c&&cache[c.id];if(!c||!c.src||!rec||rec.mv)return;var m=document.createElement('model-viewer');
 m.setAttribute('src',U(c.src));m.setAttribute('alt','3D model of '+c.name);
 /* camera: fixed side, can tilt a little and zoom, but never goes below the platform and cannot pan */
 m.setAttribute('camera-controls','');m.setAttribute('disable-pan','');
 m.setAttribute('camera-orbit','0deg 80deg auto');m.setAttribute('min-camera-orbit','0deg 55deg 70%');m.setAttribute('max-camera-orbit','0deg 86deg 170%');
 m.setAttribute('interaction-prompt','none');m.setAttribute('shadow-intensity','.6');m.setAttribute('exposure','1.1');m.setAttribute('touch-action','pan-y');
 /* the model spins on the platform (a built-in animation), the platform itself stays still */
 m.setAttribute('animation-name','Spin');m.setAttribute('autoplay','');
 spinDrag(m);
 m.addEventListener('load',function(){var r=cache[c.id];if(r&&r.mv===m){r.pane.classList.add('ok');spin(m,cur===i)}});
 rec.pane.querySelector('.mv').appendChild(m);rec.mv=m;rec.key=mvKey(c)}

/* #endregion */
/* #region Selection */
/* ---- selection ---- */
/* Show item i: highlight its option, turn the dial and fade in its panel. */
function select(i,instant){
 if(i<0||i>=N||(i===cur&&!instant))return;
 var prev=cur;cur=i;
 panes.forEach(function(p,k){var on=k===i;p.classList.toggle('on',on);p.setAttribute('aria-hidden',on?'false':'true');var c=CHARS[k],r=c&&cache[c.id];if(r&&r.mv)spin(r.mv,on)});
 btns.forEach(function(b,k){b.setAttribute('aria-current',k===i?'true':'false')});
 if(!instant)rot+=(prev<0?i:i-prev)*STEP;
 dial.style.setProperty('--rot',rot+'deg');
 dial.style.setProperty('--ia',opts.children[i].dataset.ang+'deg');
 deck.style.setProperty('--c',items[i].c);
 cnt.textContent=pad(i+1)+' / '+pad(N);
 ensureModel(i);
}

/* #endregion */
/* #region Build dial and panes */
/* ---- (re)build the dial and the panes from SITE_DATA ---- */
function build(activeIdx){
 readData();
 var spread=Math.min(26,150/Math.max(1,N-1));
 items=CHARS.map(function(c){return{id:c.id,label:c.name||c.id,c:c.c||'#5cc8ff'}}).concat([{id:'gallery',label:L('more','More models'),c:GAL_COLOR}]);
 opts.innerHTML='';btns=[];dial.classList.toggle('many',N>9);
 items.forEach(function(it,i){
  var ang=(i-(N-1)/2)*spread;
  if(N>6){var u=(i-(N-1)/2)/((N-1)/2);ang=Math.asin(u*.95)*180/Math.PI}   /* many options: equal vertical spacing so the ends do not crowd */
  var t=ang*Math.PI/180,li=el('li');
  li.style.cssText='--cx:'+Math.cos(t).toFixed(4)+';--sy:'+Math.sin(t).toFixed(4)+';--j:'+i+';--oc:'+it.c;
  li.dataset.ang=ang;
  var b=el('button','o','<i></i><small>'+pad(i+1)+'</small><span>'+esc(it.label)+'</span>');b.type='button';b.dataset.i=i;b.setAttribute('aria-current','false');
  li.appendChild(b);opts.appendChild(li);btns.push(b);
  b.addEventListener('click',function(){select(i)});
  b.addEventListener('focus',function(){select(i)});
  b.addEventListener('pointerenter',function(e){if(e.pointerType!=='mouse'||!armed)return;clearTimeout(hoverT);hoverT=setTimeout(function(){select(i)},90)});
  b.addEventListener('pointerleave',function(){clearTimeout(hoverT)});
 });
 var keep={};CHARS.forEach(function(c){keep[c.id]=1});
 Object.keys(cache).forEach(function(k){if(!keep[k]){cache[k].pane.remove();delete cache[k]}});
 var want=CHARS.map(function(c,i){return mkPane(c,i===activeIdx)});
 want.push(mkGallery(activeIdx===GALLERY_INDEX));
 [].slice.call(stage.querySelectorAll('.pane')).forEach(function(p){if(want.indexOf(p)<0)p.remove()});
 want.forEach(function(p,i){var ref=stage.children[i+1];if(ref!==p)stage.insertBefore(p,ref||null)});
 panes=want;
}
/* Redraw after the data changed (language switch or editor) and stay on the same character. */
function rebuild(){
 var id=items[cur]&&items[cur].id,keepCur=Math.max(0,cur);readData();
 var idx=-1;if(id==='gallery')idx=N-1;else for(var i=0;i<CHARS.length;i++)if(CHARS[i].id===id)idx=i;
 if(idx<0)idx=Math.min(keepCur,N-1);
 build(idx);cur=-1;select(idx,true);
}
window.SITE_REBUILD=rebuild;

/* #endregion */
/* #region Dial: open, close, keys */
/* ---- dial open / close ---- */
/* Open or close the dial (the list of projects). */
function setOpen(o){dial.dataset.open=o?'true':'false';armed=false;clearTimeout(armT);if(o)armT=setTimeout(function(){armed=true},950);hub.setAttribute('aria-expanded',o?'true':'false');
 hintTxt()}
/* Update the small hint text under the dial. */
function hintTxt(){hintEl.textContent=dial.dataset.open==='true'?L('hint.open','Hover, scroll or use the arrow keys to browse.'):L('hint.close','Click the gear to open my projects.')}
if(window.MM_LANG)MM_LANG.onChange(hintTxt);hintTxt();
hub.addEventListener('click',function(){setOpen(dial.dataset.open!=='true')});

var col=document.getElementById('dialcol'),lock=0;
col.addEventListener('wheel',function(e){
 if(dial.dataset.open!=='true'||Math.abs(e.deltaY)<4||innerWidth<1100)return;
 var nx=cur+(e.deltaY>0?1:-1);if(nx<0||nx>=N)return;
 e.preventDefault();var t=Date.now();if(t-lock<380)return;lock=t;select(nx)},{passive:false});
col.addEventListener('keydown',function(e){
 var k=e.key,nx=null;
 var fa=window.MM_LANG&&MM_LANG.get()==='fa',NX=fa?'ArrowLeft':'ArrowRight',PV=fa?'ArrowRight':'ArrowLeft';   /* RTL: the left arrow goes forward */
 if(k==='ArrowDown'||k===NX)nx=Math.min(N-1,cur+1);else if(k==='ArrowUp'||k===PV)nx=Math.max(0,cur-1);
 else if(k==='Home')nx=0;else if(k==='End')nx=N-1;
 else if(k==='Escape'&&dial.dataset.open==='true'){setOpen(false);hub.focus();return}
 if(nx===null)return;e.preventDefault();
 if(dial.dataset.open!=='true')setOpen(true);
 select(nx);if(btns[nx]&&dial.dataset.open==='true')btns[nx].focus({preventScroll:true})});
addEventListener('keydown',function(e){if(e.key==='Escape')lb.classList.remove('on')});

/* #endregion */
/* #region Deep links and start-up */
/* nav links and deep links (e.g. characters.html#m8 or #gallery) */
document.querySelectorAll('[data-sel]').forEach(function(a){a.addEventListener('click',function(e){e.preventDefault();var s=a.dataset.sel,i=s==='gallery'?GALLERY_INDEX:+s;setOpen(true);select(i);deck.scrollIntoView({block:'start'})})});
addEventListener('hashchange',function(){var i=indexOfId(location.hash.slice(1));if(i>=0){setOpen(true);select(i)}});
build(-1);
var start=indexOfId(location.hash.slice(1));
select(start<0?0:start);
if(start>=0)setOpen(true);
setTimeout(function(){CHARS.forEach(function(c,i){ensureModel(i)})},2500);

var nv=document.querySelector('nav');function sc(){nv.classList.toggle('s',scrollY>40)}sc();addEventListener('scroll',sc,{passive:true});
/* #endregion */
})();
