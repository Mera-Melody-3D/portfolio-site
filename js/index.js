/* Contents (VS Code: Ctrl+K Ctrl+0 folds everything; search "#region" to jump):
   1. Hero: pointer light and robot eye
   2. Hero: floating particles
   3. Character cards
   4. Top bar and scroll reveal
*/
(function(){
/* #region Hero: pointer light and robot eye */
var h=document.querySelector('.hero');
h.addEventListener('pointermove',function(e){
var r=h.getBoundingClientRect();
h.style.setProperty('--x',(e.clientX-r.left)+'px');
h.style.setProperty('--y',(e.clientY-r.top)+'px');
});
var eyeEl=document.querySelector('.eye'),EB=eyeEl.children[0],EC=eyeEl.children[1];
var E={x:0,y:0},mx=null,my=null,cur=.3;
h.addEventListener('pointermove',function(e){var r=h.getBoundingClientRect();mx=e.clientX-r.left;my=e.clientY-r.top});
var RTL=function(){return !!(window.MM_LANG&&MM_LANG.get()==='fa')};
/* In Persian the photo is flipped (rtl.css), so the eye box is mirrored around the middle of the hero: x -> w - x. The glow images are flipped by CSS. */
/* Place the glow images over the robot's eye for any screen size and language. */
function eye(){var w=h.clientWidth,hh=h.clientHeight,k=Math.max(w/2560,hh/1440),ox=(w-2560*k)*.72,oy=(hh-1440*k)*.30,fa=RTL();
E.x=ox+1607*k;E.y=oy+561*k;var bl=ox+1203*k,bw=808*k;
if(fa){E.x=w-E.x;bl=w-bl-bw}
eyeEl.style.cssText='left:'+bl+'px;top:'+(oy+152*k)+'px;width:'+bw+'px;height:'+(818*k)+'px'}
eye();addEventListener('resize',eye);if(window.MM_LANG)MM_LANG.onChange(eye);
(function L(){
 if(scrollY<innerHeight*1.2){
  var w=h.clientWidth,hh=h.clientHeight,px=mx==null?(RTL()?.28:.72)*w:mx,py=my==null?.4*hh:my;
  var near=Math.max(0,1-Math.hypot(px-E.x,py-E.y)/460);
  cur+=(.16+.6*near-cur)*.1;
  EB.style.opacity=Math.min(1,cur);EC.style.opacity=Math.min(1,.4+cur*.55)}
 requestAnimationFrame(L)})(0);
/* #endregion */
/* #region Hero: floating particles */
var cv=document.getElementById('fx'),g=cv.getContext('2d'),P=[],W=0,H=0;
/* Fit the particle canvas to the hero and scatter new particles. */
function size(){W=cv.width=h.clientWidth;H=cv.height=h.clientHeight;P=[];for(var i=0;i<Math.min(70,W/22);i++)P.push({x:Math.random()*W,y:Math.random()*H,r:Math.random()*1.8+.4,v:Math.random()*.35+.1,a:Math.random()*.5+.2})}
size();addEventListener('resize',size);
if(!matchMedia('(prefers-reduced-motion:reduce)').matches)(function f(now){
 if(scrollY<innerHeight*1.2){g.clearRect(0,0,W,H);
  for(var i=0;i<P.length;i++){var p=P[i];p.y-=p.v;p.x+=Math.sin(now/1000+i)*.15;if(p.y<-5){p.y=H+5;p.x=Math.random()*W}
   g.globalAlpha=p.a;g.fillStyle=window.MM_ACC||'#5cc8ff';g.beginPath();g.arc(p.x,p.y,p.r,0,6.283);g.fill()}}
 requestAnimationFrame(f)})(0);
/* #endregion */
/* #region Character cards */
/* character cards come from data/site.js */
var ul=document.getElementById('cards'),U=function(p){return window.SITE_URL?window.SITE_URL(p):p};
var ARROW='<svg class="ar" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(m){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]})}
function pad(n){return('0'+n).slice(-2)}
/* Draw the character cards from data/site.js. */
function renderCards(quiet){
 var cs=(window.SITE_DATA&&window.SITE_DATA.characters)||[];
 ul.className='cards'+(quiet?' re':'');
 ul.innerHTML=cs.map(function(c,i){var T=window.MM_T?MM_T(c):c,im=c.thumb||c.poster;
  return'<li style="--i:'+i+'"><a class="card" href="characters.html#'+encodeURIComponent(c.id)+'" data-go style="--c:'+esc(c.c||'#5cc8ff')+'"><span class="th">'+(im?'<img src="'+esc(U(im))+'" width="168" height="168" alt="">':'')+'</span><span class="tx"><span class="no">'+pad(i+1)+'</span><span class="nm">'+esc(c.name)+'</span><span class="tg">'+esc(T.tag)+'</span></span>'+ARROW+'</a></li>'}).join('');
 document.getElementById('cnt').textContent=pad(cs.length);chk()}
/* Show the fade on the right edge only when the row can scroll further. */
function chk(){ul.classList.toggle('more',ul.scrollWidth-ul.clientWidth-Math.abs(ul.scrollLeft)>4)}   /* abs(): scrollLeft is 0..negative in RTL */
ul.addEventListener('scroll',chk,{passive:true});addEventListener('resize',chk);
ul.addEventListener('wheel',function(e){if(innerWidth<761||Math.abs(e.deltaY)<=Math.abs(e.deltaX))return;var max=ul.scrollWidth-ul.clientWidth,s=getComputedStyle(ul).direction==='rtl'?-1:1,x=Math.abs(ul.scrollLeft);if((e.deltaY>0&&x<max-1)||(e.deltaY<0&&x>0)){ul.scrollLeft=s*(x+e.deltaY);e.preventDefault()}},{passive:false});
renderCards();window.SITE_REBUILD=function(){renderCards(true)};
/* #endregion */
/* #region Top bar and scroll reveal */
var nv=document.querySelector('nav');function sc(){nv.classList.toggle('s',scrollY>40)}sc();addEventListener('scroll',sc,{passive:true});
document.querySelectorAll('.chips li').forEach(function(el,i){el.classList.add('rv');el.style.setProperty('--d',(i%3)*.12+'s')});
var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{threshold:.15});
document.querySelectorAll('.rv').forEach(function(el){io.observe(el)});
/* #endregion */
})();
