/* Menu lens: a glow that slides to the hovered link, rests on the current page/section. */
(function(){
'use strict';
/* Create the glowing lens and connect hover, focus and scroll tracking. */
function init(){
  var bar=document.querySelector('nav>span');if(!bar)return;
  var ind=document.createElement('i');ind.className='nav-ind';bar.insertBefore(ind,bar.firstChild);
  function items(){return Array.prototype.slice.call(bar.querySelectorAll('a,button'))}
  /* Slide the lens under element el (or hide it). */
  function to(el){if(!el){ind.classList.remove('show');return}
    ind.style.left=el.offsetLeft+'px';ind.style.width=el.offsetWidth+'px';ind.classList.add('show')}
  var cur=null;
  function rest(){to(cur)}
  /* current: the page link on characters.html, otherwise the section being read (index.html) */
  function setCur(el){items().forEach(function(a){a.classList.toggle('on',a===el)});cur=el;if(!hover)rest()}
  var hover=false;
  bar.addEventListener('mouseover',function(e){var a=e.target.closest('a,button');if(a&&bar.contains(a)){hover=true;to(a)}});
  bar.addEventListener('focusin',function(e){var a=e.target.closest('a,button');if(a){hover=true;to(a)}});
  bar.addEventListener('mouseleave',function(){hover=false;rest()});
  bar.addEventListener('focusout',function(){hover=false;rest()});
  var page=bar.querySelector('[aria-current="page"]');
  if(page){cur=page}
  else{
    var secs=items().map(function(a){var h=a.getAttribute('href')||'';return h.charAt(0)==='#'&&h.length>1?{a:a,s:document.querySelector(h)}:null}).filter(Boolean);
    function spy(){var y=window.scrollY+window.innerHeight*.35,best=null;
      secs.forEach(function(o){if(o.s&&o.s.getBoundingClientRect().top+window.scrollY<=y)best=o.a});
      if(best!==cur)setCur(best)}
    window.addEventListener('scroll',spy,{passive:true});spy();
  }
  /* settle after fonts/language/settings button are in place, and on resize */
  var t;function relayout(){clearTimeout(t);t=setTimeout(rest,60)}
  window.addEventListener('resize',relayout);
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(rest);
  new MutationObserver(relayout).observe(bar,{childList:true,subtree:true,characterData:true});
  setTimeout(rest,300);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
