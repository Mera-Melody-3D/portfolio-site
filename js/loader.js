/* Loads the data files, and the editor panel on localhost only (visitors never get admin.js).
   document.write is used on purpose: the data must be ready before the page script at the end of <body> runs.
   Add data-lore-always to the <script> tag of a page that needs data/lore.js for every visitor (index.html only needs it on localhost). */
(function(){
var local=/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname),
    stamp=local?'?t='+Date.now():'',
    me=document.currentScript,
    needLore=local||!!(me&&me.hasAttribute('data-lore-always')),
    html=(needLore?'<script src="data/lore.js'+stamp+'"><\/script>':'')+'<script src="data/site.js'+stamp+'"><\/script>';
if(local)html+='<script src="admin/admin.js"><\/script>';
document.write(html);
})();
