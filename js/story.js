/* Contents (VS Code: Ctrl+K Ctrl+0 folds everything; search "#region" to jump):
   1. Setup and helpers
   2. Reader panel: render
   3. Progress line and section highlight
*/
(function(){
/* #region Setup and helpers */
/* The page is drawn from two files: data/site.js (name, colour, picture of the character) and data/lore.js (the long story).
   The character comes from the link: story.html#m8 */
var U=function(p){return window.SITE_URL?window.SITE_URL(p):p};
var app=document.getElementById('app'),prog=document.getElementById('prog'),navch=document.getElementById('navch');
/* Escape text so it is safe inside HTML. */
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(m){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]})}
function inline(s){return esc(s).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')}   /* **word** = bold */
/* Which character is asked for: story.html#m8 gives "m8" (the first story if there is no #). */
function curId(){var h='';try{h=decodeURIComponent(location.hash.slice(1))}catch(e){}if(h)return h;var k=Object.keys(window.SITE_LORE||{});return k[0]||''}
/* Find a character in data/site.js by its id. */
function find(id){var a=(window.SITE_DATA&&SITE_DATA.characters)||[];for(var i=0;i<a.length;i++)if(a[i].id===id)return a[i];return null}
var secEls=[],tocBtns=[],artEl=null;

/* #endregion */
/* #region Reader panel: render */
/* Draw the whole story page for the current character and language. */
function render(){
 var id=curId(),c=find(id),lore=window.SITE_LORE&&SITE_LORE[id],lang=window.MM_LANG?MM_LANG.get():'en';
 var back='characters.html'+(id?'#'+encodeURIComponent(id):'');navch.setAttribute('href',back);
 secEls=[];tocBtns=[];artEl=null;prog.style.transform='scaleX(0)';
 var cl=null,secs=null;
 if(lore){
  if(lore[lang]&&lore[lang].length){cl=lang;secs=lore[lang]}
  else if(lore.fa&&lore.fa.length){cl='fa';secs=lore.fa}
  else if(lore.en&&lore.en.length){cl='en';secs=lore.en}
 }
 if(!c||!secs){
  document.title='Story · Mera Melody';
  app.innerHTML='<div class="hero" style="min-height:300px"><div class="hin"><a class="back" href="characters.html" data-go><span class="bk">←</span> <span data-i18n="story.all">All characters</span></a><p class="line" data-i18n="story.none">No story found for this character.</p></div></div>';
  if(window.MM_LANG)MM_LANG.scan(app);return}
 var m=window.MM_T?MM_T(c):c,col=c.c||'#5cc8ff';
 document.title=c.name+' · Story · Mera Melody';
 document.body.style.setProperty('--c',col);
 var rtl=cl==='fa',dir=rtl?'rtl':'ltr';
 var bn=lore.banner&&lore.banner.src?lore.banner:null,ey=bn&&bn.eyes&&bn.eyes.src?bn.eyes:null;
 var art=bn?'<div class="art ban"><div class="bf"><img class="bimg" src="'+esc(U(bn.src))+'" alt="'+esc(c.name)+'">'+(ey?'<img class="eyes" src="'+esc(U(ey.src))+'" alt="" style="left:'+(+ey.x)+'%;top:'+(+ey.y)+'%;width:'+(+ey.w)+'%;height:'+(+ey.h)+'%">':'')+'</div></div>'
 :'<div class="art'+(c.fit==='contain'?' tall':'')+'">'+(c.poster?'<img src="'+esc(U(c.poster))+'" alt="'+esc(c.name)+'" style="--pos:'+esc(c.pos||'50% 50%')+'">':'')+'</div>';
 var words=0;secs.forEach(function(x){(x.paras||[]).forEach(function(q){words+=String(q).split(/\s+/).length})});
 var mins=Math.max(1,Math.round(words/(rtl?170:220))),nf=function(n){return n.toLocaleString(rtl?'fa-IR':'en')};
 var stats='<p class="stats"><span><b>'+nf(secs.length)+'</b><span data-i18n="story.sec">sections</span></span><i></i><span><b>'+nf(mins)+'</b><span data-i18n="story.min">min read</span></span></p>';
 var note=(lang==='en'&&cl==='fa')?'<div class="note"><p>This story is currently available in Persian only</p></div>':'';
 var faUI=document.documentElement.getAttribute('data-lang')==='fa',bx=bn&&bn.x!=null?+bn.x:70,by=bn&&bn.y!=null?+bn.y:54,bh=bn&&bn.h!=null?+bn.h:108,br=bn&&bn.r>0?+bn.r:1.7778;if(faUI)bx=100-bx;
 var h='<header class="hero"'+(bn?' style="--bx:'+bx+'%;--by:'+by+'%;--bh:'+bh+'%;--br:'+br+'"':'')+'><i class="dust"></i><i class="hud"></i>'+art
 +'<div class="hin"><a class="back" href="'+back+'" data-go><span class="bk">←</span> <span data-i18n="story.back">Back to character</span></a>'
 +'<span class="tag">'+esc(m.tag)+'</span><h1>'+esc(m.name)+'</h1><p class="line">'+esc(m.line)+'</p>'+stats+note+'</div></header>';
 var toc='<details class="toc"><summary data-i18n="story.toc">Sections</summary><ol>',body='';
 secs.forEach(function(s,i){
  var t=String(s.title||''),mm=t.match(/^([0-9\u06F0-\u06F9\u0660-\u0669]+)[.\-)]\s*(.+)$/);
  toc+='<li><button type="button" data-i="'+i+'">'+esc(t)+'</button></li>';
  body+='<section id="s'+i+'"><h2>'+(mm?'<span class="num">'+esc(mm[1])+'</span>'+esc(mm[2]):esc(t))+'</h2>'
  +(s.paras||[]).map(function(p){var cls='',pp=String(p);
    if(/^\*\*[^*]+\*\*$/.test(pp)&&pp.length<30)cls=' class="fin"';else if(/^«.*»$/.test(pp))cls=' class="q"';
    return'<p'+cls+'>'+inline(pp)+'</p>'}).join('')+'</section>'});
 toc+='</ol></details>';
 h+='<div class="wrap" dir="'+dir+'">'+toc+'<article class="read'+(rtl?' fa':'')+'" lang="'+(rtl?'fa':'en')+'" dir="'+dir+'">'+body+'</article></div>'
 +'<div class="end"><a class="more" href="'+back+'" data-go><span class="bk">←</span><span data-i18n="story.back">Back to character</span></a></div>';
 app.innerHTML=h;
 var det=app.querySelector('.toc');if(det&&innerWidth>=1100)det.open=true;
 artEl=app.querySelector('.read');secEls=[].slice.call(app.querySelectorAll('.read section'));tocBtns=[].slice.call(app.querySelectorAll('.toc button'));
 tocBtns.forEach(function(b){b.addEventListener('click',function(){var s=secEls[+b.dataset.i];if(s)s.scrollIntoView({behavior:'smooth',block:'start'});if(innerWidth<1100&&det)det.open=false})});
 if(window.MM_LANG)MM_LANG.scan(app);
 tick();
}

/* #endregion */
/* #region Progress line and section highlight */
/* progress line + highlight of the section being read */
var raf=0;
function tick(){raf=0;var nv=document.querySelector('nav');if(nv)nv.classList.toggle('s',scrollY>40);
 if(!artEl)return;var top=artEl.getBoundingClientRect().top+scrollY,h=artEl.offsetHeight,p=(scrollY-top+innerHeight*.35)/Math.max(1,h-innerHeight*.35);
 prog.style.transform='scaleX('+Math.max(0,Math.min(1,p))+')';
 var y=innerHeight*.35,cur=0;secEls.forEach(function(s,i){if(s.getBoundingClientRect().top<=y)cur=i});
 tocBtns.forEach(function(b,i){b.classList.toggle('on',i===cur)})}
/* Run tick() at most once per frame while scrolling. */
function req(){if(!raf)raf=requestAnimationFrame(tick)}
addEventListener('scroll',req,{passive:true});addEventListener('resize',req);
addEventListener('hashchange',function(){render();scrollTo(0,0)});
window.SITE_REBUILD=render;   /* the language switch and the editor panel call this */
render();
/* #endregion */
})();
