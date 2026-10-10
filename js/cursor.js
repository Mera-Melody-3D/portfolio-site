/* Custom cursor: a metal arrow whose blue glow takes the colour of whatever it is over,
   with a ripple on click and a light trail while dragging.
   Only for mouse/trackpad. Touch screens and prefers-reduced-motion keep things simple.
   Over the editor panel the normal system cursor is shown. */
/* Contents (VS Code: Ctrl+K Ctrl+0 folds everything; search "#region" to jump):
   1. Cursor: setup and styles
   2. Cursor: colour under the pointer
   3. Cursor: effects and pointer events
   4. Cursor: draw loop
   5. Custom page scrollbar
*/
(function(){
if(!matchMedia('(hover:hover) and (pointer:fine)').matches)return;
/* #region Cursor: setup and styles */
var RM=matchMedia('(prefers-reduced-motion:reduce)').matches,D=document.documentElement;
var BASE=208,DEF=[92,200,255],SIZE=32;   /* BASE = hue of the blue in images/cursor.png */

var css='html.cc,html.cc *{cursor:none!important}'
+'#cur{position:fixed;left:0;top:0;z-index:99999;pointer-events:none;opacity:0;transition:opacity .25s;will-change:transform}'
+'#cur.on{opacity:1}'
+'#cur img{display:block;width:'+SIZE+'px;height:auto;transform-origin:1px 1px;transition:transform .22s cubic-bezier(.2,.8,.2,1),filter .5s}'
+'#cur.hv img{transform:scale(1.15) rotate(-7deg)}'
+'#cur.dn img{transform:scale(.82) rotate(4deg)}'
+'img,canvas,svg,model-viewer{-webkit-user-select:none;user-select:none;-webkit-user-drag:none}'
+'#cfx{position:fixed;left:0;top:0;width:100%;height:100%;z-index:99998;pointer-events:none}';
var st=document.createElement('style');st.textContent=css;document.head.appendChild(st);

var cur=document.createElement('div');cur.id='cur';cur.setAttribute('aria-hidden','true');
var img=new Image();img.alt='';img.draggable=false;cur.appendChild(img);
var cv=document.createElement('canvas');cv.id='cfx';cv.setAttribute('aria-hidden','true');
document.body.appendChild(cv);document.body.appendChild(cur);
var g=cv.getContext('2d'),ready=false;
img.onload=function(){ready=true};img.src='images/cursor.png';

addEventListener('dragstart',function(e){if(e.target&&e.target.tagName==='IMG')e.preventDefault()},true);
function size(){var r=Math.min(devicePixelRatio||1,2);cv.width=innerWidth*r;cv.height=innerHeight*r;
 /* exact pixel size (not 100%): with a scrollbar, 100% is narrower than innerWidth and squeezed the effects to the left of the pointer */
 cv.style.width=innerWidth+'px';cv.style.height=innerHeight+'px';g.setTransform(r,0,0,r,0,0)}
size();addEventListener('resize',size);

/* #endregion */
/* #region Cursor: colour under the pointer */
/* ---- colour under the pointer ---- */
var px=document.createElement('canvas').getContext('2d',{willReadFrequently:true}),cache={};
/* Turn any CSS colour into [r,g,b] using a 1-pixel canvas. */
function rgb(s){if(cache[s])return cache[s];px.clearRect(0,0,1,1);px.fillStyle=window.MM_ACC||'#5cc8ff';px.fillStyle=s;px.fillRect(0,0,1,1);
 var d=px.getImageData(0,0,1,1).data;return cache[s]=[d[0],d[1],d[2]]}
/* Hue (0-360) of an [r,g,b] colour. */
function hueOf(c){var r=c[0]/255,gg=c[1]/255,b=c[2]/255,mx=Math.max(r,gg,b),mn=Math.min(r,gg,b),d=mx-mn;if(!d)return BASE;
 var h=mx===r?((gg-b)/d)%6:mx===gg?(b-r)/d+2:(r-gg)/d+4;return(h*60+360)%360}
/* The colour the cursor glow should take for the element under the pointer. */
function pick(t){var s='';
 if(t&&t.nodeType===1){if(t.closest('.deck,.card'))s=getComputedStyle(t).getPropertyValue('--c').trim();if(t.closest&&t.closest('.btn.g'))s='#a592ff'}
 return s?rgb(s):rgb(window.MM_ACC||'#5cc8ff')}
var col=DEF,H=0;
/* Tint the cursor image with colour c. */
function setColor(c){col=c;var d=hueOf(c)-BASE;H+=((d-H)%360+540)%360-180;
 img.style.filter='hue-rotate('+H.toFixed(1)+'deg) saturate(1.12) drop-shadow(0 0 5px rgba('+c[0]+','+c[1]+','+c[2]+',.6))'}
setColor(DEF);
function rgba(a){return'rgba('+col[0]+','+col[1]+','+col[2]+','+a+')'}

/* #endregion */
/* #region Cursor: effects and pointer events */
/* ---- effects ---- */
var rings=[],sparks=[],trail=[],x=-99,y=-99,t=null,down=false,hv=false,lastPick=0,lastWave=0,lastSp={x:0,y:0},started=false;
/* Add a ripple ring at the pointer. */
function ring(max,delay,w){if(!RM)rings.push({x:x,y:y,t0:performance.now()+(delay||0),max:max,w:w||2.2,c:col.slice()})}
/* Add a handful of sparks at the pointer. */
function burst(n,sp){if(RM)return;for(var i=0;i<n;i++){var a=Math.random()*6.283,v=(sp||1.6)*(.5+Math.random());
 sparks.push({x:x,y:y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,t0:performance.now(),life:420+Math.random()*320,c:col.slice()})}}
/* the 3D viewer draws its own hand cursor inside its shadow DOM: hide that one too */
function hideIn(mv){if(mv._cc||!mv.shadowRoot)return;mv._cc=1;var q=document.createElement('style');q.textContent='*{cursor:none!important}';mv.shadowRoot.appendChild(q)}
/* True when the pointer is over the editor panel or the 3D viewer (normal cursor is shown there). */
function over(e){var p=e.composedPath?e.composedPath():[];for(var i=0;i<p.length;i++){var n=p[i];if(n.id==='mm-editor')return true;if(n.tagName==='MODEL-VIEWER'||n.id==='mmt-host')hideIn(n)}return false}

addEventListener('pointermove',function(e){
 if(e.pointerType==='touch')return;
 x=e.clientX;y=e.clientY;var pth=e.composedPath?e.composedPath():[];t=pth[0]||e.target;cur.style.transform='translate3d('+(x-1)+'px,'+(y-1)+'px,0)';
 var native=over(e)||!ready;D.classList.toggle('cc',!native);cur.classList.toggle('on',!native);
 hv=!!(t&&t.closest&&t.closest('a,button,[role=button],.o,.hub,.card'));cur.classList.toggle('hv',hv&&!down);
 if(!started){started=true;requestAnimationFrame(loop)}
 if(down&&!RM){var now=performance.now(),ev=e.getCoalescedEvents?e.getCoalescedEvents():[e];
  for(var k=0;k<ev.length;k++)trail.push({x:ev[k].clientX,y:ev[k].clientY,t:now});
  if(trail.length>90)trail.splice(0,trail.length-90);
  if(now-lastWave>110){lastWave=now;ring(30,0,1.2)}
  if(Math.hypot(x-lastSp.x,y-lastSp.y)>14){lastSp={x:x,y:y};burst(1,.9)}}
},true);
addEventListener('pointerdown',function(e){if(e.pointerType==='touch')return;down=true;cur.classList.add('dn');cur.classList.remove('hv');
 x=e.clientX;y=e.clientY;lastSp={x:x,y:y};ring(46,0);ring(82,100,1.4);burst(8)},true);
function up(){if(!down)return;down=false;cur.classList.remove('dn');cur.classList.toggle('hv',hv);ring(26,0,1.2)}
addEventListener('pointerup',up,true);addEventListener('pointercancel',up,true);addEventListener('blur',up);
D.addEventListener('mouseleave',function(){cur.classList.remove('on')});

/* #endregion */
/* #region Cursor: draw loop */
function loop(now){
 if(now-lastPick>90){lastPick=now;var c=pick(t);if(c[0]!==col[0]||c[1]!==col[1]||c[2]!==col[2])setColor(c)}
 if(rings.length||sparks.length||trail.length){
  g.clearRect(0,0,innerWidth,innerHeight);g.globalCompositeOperation='lighter';
  rings=rings.filter(function(r){var p=(now-r.t0)/650;if(p>1)return false;if(p<0)return true;
   var e=1-Math.pow(1-p,3),R=r.max*e,a=1-p,k='rgba('+r.c[0]+','+r.c[1]+','+r.c[2]+',';
   g.beginPath();g.arc(r.x,r.y,R,0,6.283);g.fillStyle=k+(a*.08)+')';g.fill();
   g.lineWidth=r.w*a*3.2+1;g.strokeStyle=k+(a*.18)+')';g.stroke();g.lineWidth=r.w*a+.3;g.strokeStyle=k+(a*.85)+')';g.stroke();return true});
  sparks=sparks.filter(function(s){var p=(now-s.t0)/s.life;if(p>1)return false;
   s.x+=s.vx;s.y+=s.vy;s.vx*=.95;s.vy*=.95;
   g.beginPath();g.arc(s.x,s.y,1.8*(1-p)+.3,0,6.283);g.fillStyle='rgba('+s.c[0]+','+s.c[1]+','+s.c[2]+','+(1-p)+')';g.fill();return true});
  trail=trail.filter(function(p){return now-p.t<420});
  g.lineCap='round';
  for(var i=1;i<trail.length-1;i++){var a=trail[i-1],b=trail[i],c=trail[i+1],f=1-(now-b.t)/420;
   g.beginPath();g.moveTo((a.x+b.x)/2,(a.y+b.y)/2);g.quadraticCurveTo(b.x,b.y,(b.x+c.x)/2,(b.y+c.y)/2);
   g.lineWidth=8*f+1;g.strokeStyle=rgba(f*.14);g.stroke();
   g.lineWidth=2.6*f+.4;g.strokeStyle=rgba(f*.7);g.stroke()}
  g.globalCompositeOperation='source-over';
 }else if(g._d){g.clearRect(0,0,innerWidth,innerHeight)}
 g._d=rings.length||sparks.length||trail.length;
 requestAnimationFrame(loop)}

/* #endregion */
/* #region Custom page scrollbar */
/* ---- page scrollbar drawn by the site itself ----
   The browser's own scrollbar sits above the page, so the custom cursor would slide underneath it.
   Here the real one is hidden and replaced by an in-page copy (same look), so the cursor stays on top. */
(function(){
var sc=document.scrollingElement||D;
var q=document.createElement('style');
q.textContent='html.cs{scrollbar-width:none!important}html.cs::-webkit-scrollbar{display:none!important}'
+'#sbar{position:fixed;top:0;right:0;bottom:0;width:12px;z-index:99990;background:hsl(calc(var(--h,200) + 20),37.5%,4.5%);border-left:1px solid hsl(calc(var(--h,200) + 13),34%,14%);box-sizing:border-box;touch-action:none;user-select:none;-webkit-user-select:none}'
+'#sbar.off{display:none}'
+'#sbar i{position:absolute;left:0;right:0;top:0;border:3px solid transparent;border-radius:99px;background-clip:padding-box;box-sizing:border-box;'
+'background-image:repeating-linear-gradient(0deg,rgba(3,8,14,.5) 0 2px,transparent 2px 9px),linear-gradient(180deg,hsl(calc(var(--h,200) + .2),100%,72%),hsl(calc(var(--h,200) + 15),100%,50%));'
+'box-shadow:inset 0 0 8px hsla(calc(var(--h,200) + .2),100%,80%,.45)}'
+'#sbar:hover i,#sbar.dr i{background-image:repeating-linear-gradient(0deg,rgba(3,8,14,.35) 0 2px,transparent 2px 9px),linear-gradient(180deg,hsl(calc(var(--h,200) + .2),100%,80%),hsl(calc(var(--h,200) + 10),100%,60%))}';
document.head.appendChild(q);
var bar=document.createElement('div');bar.id='sbar';bar.setAttribute('aria-hidden','true');
var th=document.createElement('i');bar.appendChild(th);document.body.appendChild(bar);
D.classList.add('cs');
/* hiding the native scrollbar widens the page by ~12px: tell the page (the robot-eye glow is positioned from the hero width) */
dispatchEvent(new Event('resize'));addEventListener('load',function(){dispatchEvent(new Event('resize'))});
var th_h=56,max=0,drag=null;
/* Size and place the scrollbar thumb. */
function upd(){
 var vh=innerHeight,sh=sc.scrollHeight;
 if(sh<=vh+1){bar.classList.add('off');return}
 bar.classList.remove('off');
 th_h=Math.max(56,vh*vh/sh);max=vh-th_h;
 th.style.height=th_h+'px';
 th.style.transform='translateY('+(sc.scrollTop/(sh-vh)*max).toFixed(1)+'px)'}
addEventListener('scroll',upd,{passive:true});addEventListener('resize',upd);
if(window.ResizeObserver)new ResizeObserver(upd).observe(document.body);
setInterval(upd,700);upd();
bar.addEventListener('pointerdown',function(e){
 if(e.button)return;e.preventDefault();
 var r=th.getBoundingClientRect();
 if(e.target===th){drag={y:e.clientY,top:sc.scrollTop};bar.classList.add('dr');bar.setPointerCapture(e.pointerId)}
 else{sc.scrollBy({top:(e.clientY<r.top?-1:1)*innerHeight*.9,behavior:'smooth'})}});
bar.addEventListener('pointermove',function(e){
 if(!drag||!max)return;
 sc.scrollTo({top:drag.top+(e.clientY-drag.y)*(sc.scrollHeight-innerHeight)/max,behavior:'instant'})});
function end(){drag=null;bar.classList.remove('dr')}
bar.addEventListener('pointerup',end);bar.addEventListener('pointercancel',end);
bar.addEventListener('wheel',function(e){sc.scrollBy({top:e.deltaY,behavior:'instant'})},{passive:true});
})();
/* #endregion */
})();
