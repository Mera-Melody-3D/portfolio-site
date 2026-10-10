/* Visitor colour settings: a "Color" banner in the top menu opens a small panel where visitors pick the site's accent colour.
   Everything blue on the site follows one number, --h (the hue, default 200 = the original ice blue).
   The choice is kept in the visitor's browser (localStorage). Reset puts it back to the default. */
/* Contents (VS Code: Ctrl+K Ctrl+0 folds everything; search "#region" to jump):
   1. Hue: save, load, apply
   2. Styles for the Settings button and panel
   3. Settings panel
*/
(function(){
'use strict';
/* #region Hue: save, load, apply */
var D=document.documentElement,KEY='mm_hue',DEF=200,H=DEF;
var PRESETS=[['Ice',200],['Violet',265],['Rose',335],['Ember',18],['Gold',42],['Emerald',150]];
/* Read the saved hue (0-360) from this browser. */
function get(){try{var v=parseFloat(localStorage.getItem(KEY));return isFinite(v)?Math.max(0,Math.min(360,Math.round(v))):DEF}catch(e){return DEF}}
/* Save the hue in this browser (the default hue is not stored). */
function put(h){try{if(h===DEF)localStorage.removeItem(KEY);else localStorage.setItem(KEY,String(h))}catch(e){}}
/* Convert a hue to an [r,g,b] colour (used by the swatches and the cursor). */
function rgb(h){var s=1,l=.68,c=(1-Math.abs(2*l-1))*s,x=c*(1-Math.abs((h/60)%2-1)),m=l-c/2,r,g,b;
 if(h<60){r=c;g=x;b=0}else if(h<120){r=x;g=c;b=0}else if(h<180){r=0;g=c;b=x}else if(h<240){r=0;g=x;b=c}else if(h<300){r=x;g=0;b=c}else{r=c;g=0;b=x}
 return[Math.round((r+m)*255),Math.round((g+m)*255),Math.round((b+m)*255)]}
/* Set --h on <html>: every blue on the site follows it. */
function apply(h){H=h;var st=D.style;
 if(h===DEF){st.removeProperty('--h');st.removeProperty('--hue-d')}else{st.setProperty('--h',h);st.setProperty('--hue-d',(h-DEF)+'deg')}
 window.MM_ACC='rgb('+rgb(h).join(',')+')'}
apply(get());   /* before the page paints, so there is no flash of the old colour */

/* #endregion */
/* #region Styles for the Settings button and panel */
var css='.eye img{filter:hue-rotate(var(--hue-d,0deg))}nav>span .mmt-btn:focus-visible{outline:2px solid #fff;outline-offset:3px}'
+'nav>span .mmt-btn i{display:inline-block;width:9px;height:9px;margin-right:7px;vertical-align:1px;border-radius:50%;background:var(--blue);box-shadow:0 0 10px var(--blue)}'
var pcss='#tpanel{position:fixed;top:112px;right:clamp(14px,4vw,56px);z-index:60;width:min(300px,calc(100vw - 28px));padding:16px 18px 20px;border-radius:18px;'
+'border:1px solid rgba(255,255,255,.14);background:linear-gradient(135deg,rgba(255,255,255,.1),rgba(255,255,255,.03) 62%),rgba(8,12,18,.88);'
+'backdrop-filter:blur(16px) saturate(150%);-webkit-backdrop-filter:blur(16px) saturate(150%);box-shadow:inset 0 1px 0 rgba(255,255,255,.2),0 24px 50px -20px rgba(0,0,0,.95);'
+'color:#e8f1f8;font:500 .9rem/1.3 "DM Sans",system-ui,sans-serif;opacity:0;visibility:hidden;transform:translateY(-10px) scale(.97);transform-origin:90% 0;'
+'transition:opacity .25s,transform .35s cubic-bezier(.2,.9,.2,1),visibility 0s .35s}'
+'#tpanel.open{opacity:1;visibility:visible;transform:none;transition-delay:0s}'
+'#tpanel::after{content:"";position:absolute;left:12%;right:12%;bottom:-1px;height:2px;border-radius:2px;background:linear-gradient(90deg,transparent,var(--blue),transparent);box-shadow:0 0 16px 2px var(--blue)}'
+'#tpanel .th{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}'
+'#tpanel .th b{font:600 1.05rem/1 Syne,system-ui,sans-serif}'
+'#tpanel .rs{padding:7px 15px;border-radius:99px;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.06);color:inherit;font:inherit;font-size:.8rem;transition:background .25s,opacity .25s}'
+'#tpanel .rs:hover:not(:disabled){background:rgba(255,255,255,.16)}#tpanel .rs:disabled{opacity:.4}'
+'#tpanel .sw{display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin-bottom:18px}'
+'#tpanel .sw button{aspect-ratio:1;border-radius:50%;border:2px solid transparent;padding:0;background:var(--sc);box-shadow:0 0 14px -2px var(--sc);transition:transform .25s}'
+'#tpanel .sw button:hover{transform:scale(1.12)}#tpanel .sw button[aria-pressed="true"]{border-color:#fff;box-shadow:0 0 0 2px rgba(5,7,11,.9),0 0 16px 1px var(--sc)}'
+'#tpanel label{display:block;margin-bottom:9px;font-size:.78rem;color:#8896a6}'
+'#tpanel input{-webkit-appearance:none;appearance:none;display:block;width:100%;height:12px;margin:0;border-radius:99px;outline:none;'
+'background:linear-gradient(90deg,hsl(0 100% 68%),hsl(60 100% 68%),hsl(120 100% 68%),hsl(180 100% 68%),hsl(240 100% 68%),hsl(300 100% 68%),hsl(360 100% 68%))}'
+'#tpanel input::-webkit-slider-thumb{-webkit-appearance:none;width:22px;height:22px;border-radius:50%;background:var(--blue);border:3px solid #fff;box-shadow:0 0 14px var(--blue)}'
+'#tpanel input::-moz-range-thumb{width:16px;height:16px;border-radius:50%;background:var(--blue);border:3px solid #fff;box-shadow:0 0 14px var(--blue)}'
+'#tpanel button:focus-visible,#tpanel input:focus-visible{outline:2px solid #fff;outline-offset:3px}'
+'#tpanel .lh{margin:24px 0 10px}'
+'#tpanel .lg{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:4px;border-radius:99px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12)}'
+'#tpanel .lg button{padding:9px 0;border:0;border-radius:99px;background:none;color:#a9b6c4;font:inherit;font-size:.85rem;transition:background .25s,color .25s}'
+'#tpanel .lg button[aria-pressed="true"]{background:var(--blue);color:#04121c}'
+'#tpanel input,#tpanel .sw,#tpanel .lg{direction:ltr}'
+'#tpanel.fa{right:auto;left:clamp(14px,4vw,56px);transform-origin:10% 0}'
+'#tpanel.fa{direction:rtl;font-family:Vazirmatn,"Segoe UI",Tahoma,system-ui,sans-serif}#tpanel.fa *{font-family:inherit!important;letter-spacing:0!important}'
+'@media(prefers-reduced-motion:reduce){#tpanel{transition:none}}';
var st=document.createElement('style');st.textContent=css;document.head.appendChild(st);

/* #endregion */
/* #region Settings panel */
function build(){
 var bar=document.querySelector('nav>span');if(!bar)return;
 var btn=document.createElement('button');btn.type='button';btn.className='mmt-btn';btn.setAttribute('aria-expanded','false');
 btn.innerHTML='<i></i><span data-i18n="nav.settings">Settings</span>';bar.appendChild(btn);
 var host=document.createElement('div');host.id='mmt-host';document.body.appendChild(host);
 var root=host.attachShadow({mode:'open'});
 root.innerHTML='<style>'+pcss+'</style><div id="tpanel" role="dialog" aria-label="Settings"><div class="th"><b data-k="p.color">Color</b><button type="button" class="rs" data-k="p.reset">Reset</button></div><div class="sw"></div><label for="thue" data-k="p.fine">Fine tune</label><input id="thue" type="range" min="0" max="360" step="1"><div class="th lh"><b data-k="p.lang">Language</b></div><div class="lg"><button type="button" data-l="en">English</button><button type="button" data-l="fa">فارسی</button></div></div>';
 var p=root.getElementById('tpanel');
 var sw=p.querySelector('.sw'),rs=p.querySelector('.rs'),sl=p.querySelector('input'),dots=[];
 PRESETS.forEach(function(x){var b=document.createElement('button');b.type='button';b.setAttribute('aria-label',x[0]);b.title=x[0];
  b.style.setProperty('--sc','rgb('+rgb(x[1]).join(',')+')');b.addEventListener('click',function(){set(x[1])});sw.appendChild(b);dots.push([b,x[1]])});
 function sync(){sl.value=H;rs.disabled=H===DEF;dots.forEach(function(d){d[0].setAttribute('aria-pressed',String(d[1]===H))})}
 function set(h){apply(h);put(h);sync()}
 sl.addEventListener('input',function(){set(+sl.value)});
 rs.addEventListener('click',function(){set(DEF)});
 function open(o){p.classList.toggle('open',o);btn.setAttribute('aria-expanded',String(o))}
 btn.addEventListener('click',function(e){e.stopPropagation();open(!p.classList.contains('open'))});
 document.addEventListener('click',function(e){if(p.classList.contains('open')&&e.composedPath().indexOf(p)<0)open(false)});
 document.addEventListener('keydown',function(e){if(e.key==='Escape'&&p.classList.contains('open')){open(false);btn.focus()}});
 addEventListener('storage',function(e){if(e.key===KEY){apply(get());sync()}});
 var LG=window.MM_LANG;
 function labels(){var l=LG?LG.get():'en';p.classList.toggle('fa',l==='fa');p.setAttribute('aria-label',LG?LG.t('p.title','Settings'):'Settings');
  [].forEach.call(p.querySelectorAll('[data-k]'),function(e){if(e.__d==null)e.__d=e.textContent;e.textContent=LG?LG.t(e.getAttribute('data-k'),e.__d):e.__d});
  [].forEach.call(p.querySelectorAll('[data-l]'),function(b){b.setAttribute('aria-pressed',String(b.getAttribute('data-l')===l))})}
 [].forEach.call(p.querySelectorAll('[data-l]'),function(b){b.addEventListener('click',function(){if(LG)LG.set(b.getAttribute('data-l'))})});
 if(LG){LG.onChange(labels);LG.scan()}
 labels();sync()}
/* #endregion */
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',build);else build();
})();
