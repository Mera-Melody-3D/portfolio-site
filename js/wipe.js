/* Cinematic page transition + first-visit intro.
   Five glowing blades (echoing W-17's five eye slits) sweep up to cover the page, then peel away on the next page.
   Add data-go to any link to use it. Respects prefers-reduced-motion. */
/* Contents (VS Code: Ctrl+K Ctrl+0 folds everything; search "#region" to jump):
   1. Wipe: styles
   2. Wipe: build the blades
   3. Wipe: reveal and reset
   4. Wipe: intro and link clicks
*/
(function(){
/* #region Wipe: styles */
var D=document.documentElement,rm=matchMedia('(prefers-reduced-motion:reduce)').matches;
var css='.wipe{position:fixed;inset:0;z-index:100;pointer-events:none;overflow:hidden;visibility:hidden}'
+'.wipe.on{visibility:visible}'
+'.wipe i{position:absolute;top:-3%;bottom:-3%;left:calc(var(--n)*20% - 9%);width:36%;background:hsl(calc(var(--h,200) + 20),37.5%,3.1%);transform:translateY(104%) skewX(-8deg);transition:transform 1.15s cubic-bezier(.65,0,.2,1) calc(var(--o)*120ms);will-change:transform}'
+'.wipe i::before{content:"";position:absolute;left:0;right:0;top:0;height:2px;background:#d8f2ff;box-shadow:0 0 22px 5px hsla(calc(var(--h,200) + 0.2),100.0%,68.0%,.85),0 -40px 90px 24px hsla(calc(var(--h,200) + 15.4),100.0%,61.8%,.28)}'
+'.wipe.cov i{transform:translateY(0) skewX(-8deg)}'
+'.wipe.rev i{transform:translateY(-104%) skewX(-8deg)}'
+'.wipe.nt i{transition:none!important}'
+'.wipe .mark{position:absolute;inset:0;display:grid;place-content:center;justify-items:center;gap:22px;opacity:0;transition:opacity .35s ease}'
+'.wipe.cov .mark{opacity:1;transition-delay:.35s}.wipe.rev .mark{opacity:0;transition-delay:0s}'
+'.wipe svg{width:clamp(70px,9vw,110px);height:auto;overflow:visible;filter:drop-shadow(0 0 10px hsla(calc(var(--h,200) + 0.2),100.0%,68.0%,.9));transition:filter .3s}'
+'.wipe.flash svg{filter:drop-shadow(0 0 22px hsla(calc(var(--h,200) + 0),100.0%,79.4%,1)) drop-shadow(0 0 60px hsla(calc(var(--h,200) + 15.4),100.0%,61.8%,.9))}'
+'.wipe path{fill:none;stroke:#e6f6ff;stroke-linecap:round;stroke-dasharray:1;stroke-dashoffset:1}'
+'.wipe.cov path{animation:wdraw .7s cubic-bezier(.2,.7,.2,1) forwards;animation-delay:calc(var(--k)*.08s + .25s)}'
+'@keyframes wdraw{to{stroke-dashoffset:0}}'
+'.wipe b{font:600 clamp(1rem,2vw,1.4rem) Syne,system-ui,sans-serif;letter-spacing:.5em;text-indent:.5em;color:#e8f1f8;opacity:0;transition:opacity .9s ease .5s,letter-spacing 1.4s cubic-bezier(.2,.7,.2,1) .5s}'
+'.wipe.cov b{opacity:.9;letter-spacing:.2em;text-indent:.2em}'
+'.wipe.still path{animation:none;stroke-dashoffset:0}'
+'.wipe.still .mark{opacity:1;transition:none}.wipe.still b{opacity:.9;letter-spacing:.2em;text-indent:.2em;transition:none}'
+'.wipe.still.rev .mark{opacity:0;transition:opacity .35s ease}'
+'html.hold body *{animation-play-state:paused!important}';
var st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
/* #endregion */
/* #region Wipe: build the blades */
var el=document.createElement('div');el.className='wipe';el.setAttribute('aria-hidden','true');
var cols='';[2,1,3,0,4].forEach(function(n){cols+='<i style="--n:'+n+';--o:'+Math.abs(n-2)+'"></i>'});
var P=[[44,86,24,34],[52,86,42,18],[60,86,60,6],[68,86,78,18],[76,86,96,34]],W=[3.5,4.5,5.5,4.5,3.5],ps='';
P.forEach(function(p,k){ps+='<path pathLength="1" style="--k:'+k+'" stroke-width="'+W[k]+'" d="M'+p[0]+' '+p[1]+'L'+p[2]+' '+p[3]+'"/>'});
el.innerHTML=cols+'<div class="mark"><svg viewBox="0 0 120 92">'+ps+'</svg><b>MERA MELODY</b></div>';
D.appendChild(el);
/* #endregion */
/* #region Wipe: reveal and reset */
/* Hide the blades and return to the idle state. */
function reset(){el.className='wipe nt';void el.offsetWidth;el.className='wipe';D.classList.remove('hold')}
/* Peel the blades away once the page has loaded (after at least "wait" ms). */
function reveal(wait,still){
 var t0=Date.now(),done=false;
 function go(){if(done)return;done=true;
  var d=Math.max(0,wait-(Date.now()-t0));
  setTimeout(function(){
   if(!still)el.classList.add('flash');
   setTimeout(function(){
    el.classList.remove('nt');void el.offsetWidth;
    el.className='wipe on cov rev'+(still?' still':'');
    setTimeout(function(){D.classList.remove('hold')},1420);
    setTimeout(reset,1440);
   },still?0:320);
  },d)}
 if(document.readyState==='complete')go();else{addEventListener('load',go);setTimeout(go,3500)}
}
/* #endregion */
/* #region Wipe: intro and link clicks */
var intro=!rm&&!/characters\.html$/.test(location.pathname)&&window.name!=='wp'&&!sessionStorage.getItem('mm_intro');
if(!rm&&(window.name==='wp'||intro)){
 var isT=window.name==='wp';window.name='';
 if(intro)try{sessionStorage.setItem('mm_intro','1')}catch(e){}
 D.classList.add('hold');
 el.className='wipe on cov nt'+(isT?' still':'');
 reveal(isT?700:2000,isT);
}
document.addEventListener('click',function(e){
 var a=e.target.closest&&e.target.closest('a[data-go]');
 if(!a||e.metaKey||e.ctrlKey||e.shiftKey||e.button)return;
 e.preventDefault();var u=a.href;
 if(rm){location.href=u;return}
 window.name='wp';el.className='wipe on';void el.offsetWidth;el.className='wipe on cov';
 setTimeout(function(){location.href=u},1450);
});
addEventListener('pageshow',function(e){if(e.persisted)reset()});
/* #endregion */
})();
