/* Mera Melody · copy protection
   Active for VISITORS only. On localhost (where the editor loads, see start-editor.bat) it does nothing,
   so you, the admin, can select, copy, right-click and use dev tools normally while editing.
   Note: nothing in a browser can make a public site 100% uncopyable; this blocks every casual way. */
(function(){
'use strict';
if(/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname))return;

var css=document.createElement('style');
css.textContent=
'html,body,body *{-webkit-user-select:none!important;-moz-user-select:none!important;-ms-user-select:none!important;user-select:none!important;-webkit-touch-callout:none!important;-webkit-user-drag:none!important}'+
'input,textarea{-webkit-user-select:text!important;user-select:text!important}'+
'img,model-viewer,canvas,video{-webkit-user-drag:none!important;user-drag:none!important}'+
'::selection{background:transparent!important}'+
'@media print{html{display:none!important}}';
(document.head||document.documentElement).appendChild(css);

/* True while the visitor is typing in a field (never blocked). */
function typing(t){return t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.isContentEditable)}
/* Cancel the event unless the visitor is typing. */
function stop(e){if(typing(e.target))return;e.preventDefault();e.stopPropagation();return false}

['copy','cut','contextmenu','dragstart','selectstart','drop'].forEach(function(n){
  document.addEventListener(n,stop,true);
});
/* put nothing on the clipboard even if a copy sneaks through */
document.addEventListener('copy',function(e){if(typing(e.target))return;try{e.clipboardData.setData('text/plain','')}catch(_){}e.preventDefault()},true);

document.addEventListener('keydown',function(e){
  var k=(e.key||'').toLowerCase(),c=e.ctrlKey||e.metaKey;
  var block=
    (c&&!typing(e.target)&&'cxasup'.indexOf(k)>-1&&k.length===1)||   /* copy cut select-all save view-source print */
    e.key==='F12'||
    (c&&e.shiftKey&&'ijcks'.indexOf(k)>-1&&k.length===1)||            /* dev tools / screenshot shortcuts */
    (e.metaKey&&e.altKey&&'ijcu'.indexOf(k)>-1&&k.length===1);        /* mac dev tools / view-source */
  if(block){e.preventDefault();e.stopPropagation();return false}
},true);

/* make every image and link undraggable, including ones drawn later */
/* Make every image, link and model undraggable. */
function lock(root){
  (root.querySelectorAll?root.querySelectorAll('img,a,model-viewer'):[]).forEach(function(n){n.setAttribute('draggable','false')});
}
function init(){
  lock(document);
  new MutationObserver(function(ms){ms.forEach(function(m){m.addedNodes.forEach(function(n){if(n.nodeType===1){if(n.matches&&n.matches('img,a,model-viewer'))n.setAttribute('draggable','false');lock(n)}})})})
    .observe(document.documentElement,{childList:true,subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
