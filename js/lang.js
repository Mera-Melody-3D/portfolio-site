/* English / Persian (فارسی). Texts marked with data-i18n="key" (or data-i18n-html) in the pages are swapped from the FA table below.
   Character texts (tag, line, story, tags) are translated per character id in CH. A character added later with the editor
   has no Persian yet, so it simply stays in English until you add it to CH. data/site.js is never changed by the language switch. */
/* Contents (VS Code: Ctrl+K Ctrl+0 folds everything; search "#region" to jump):
   1. Persian UI strings (FA)
   2. Persian page titles and character texts (TITLES, CH)
   3. Switching and translating
   4. Persian layout CSS and font
   5. Language switch and public API
*/
(function(){
'use strict';
var KEY='mm_lang',D=document.documentElement,lang='en',subs=[];
/* #region Persian UI strings (FA) */
var FA={
'nav.characters':'کاراکترها','nav.about':'درباره من','nav.contact':'تماس','nav.settings':'تنظیمات',
'eyebrow':'هنرمند کاراکتر سه‌بعدی و سازنده‌ی دنیا',
'h1':'کاراکترهایی<br><em>ساخته‌شده از نور.</em>',
'hero.p':'هر کاراکتر ملودی خودش را دارد. این‌ها مال من‌اند، ساخته‌شده در Blender.',
'btn.explore':'دیدن کاراکترها','btn.about':'درباره من',
'stat.chars':'کاراکتر','stat.model':'مدل‌سازی','stat.games':'دنیای بازی','cue':'پایین بروید',
'about.h':'درباره من',
'about.p1':'من Mera Melody هستم، دانشجوی علوم کامپیوتر که در Blender کاراکتر سه‌بعدی می‌سازم و داستان‌هایی را که این کاراکترها از آن‌ها می‌آیند می‌نویسم. در Godot هم بازی می‌سازم و برای تفریح ویولن می‌زنم.',
'about.p2':'اسمم از یک ایده آمده: هر کاراکتر ملودی خودش را با خودش دارد، پس هر کدام که می‌سازم تکه‌ی کوچکی از خودم است.',
'chip.story':'داستان‌نویسی','chip.violin':'ویولن',
'contact.h':'بیا با هم کار کنیم','contact.p':'پروژه، بازی یا ایده‌ای داری؟ یک ایمیل برایم بفرست.',
'projects':'پروژه‌ها','hint.open':'برای مرور، موس را روی گزینه‌ها ببر، اسکرول کن یا از کلیدهای جهت‌دار استفاده کن.',
'hint.close':'روی چرخ‌دنده کلیک کن تا پروژه‌هایم باز شود.','drag':'برای چرخاندن بکش',
'gal.tag':'گالری','more':'مدل‌های بیشتر','gal.line':'هر چیز دیگری که ساخته‌ام.','gal.click':'روی هر تصویر کلیک کن تا بزرگ‌تر ببینی.','soon':'مدل بعدی به‌زودی',
'btn.story':'خواندن داستان کامل','story.back':'بازگشت به کاراکتر','story.toc':'فهرست بخش‌ها','story.sec':'بخش','story.min':'دقیقه مطالعه','story.none':'داستانی برای این کاراکتر پیدا نشد.','story.all':'همه‌ی کاراکترها',
'p.color':'رنگ','p.reset':'بازنشانی','p.fine':'تنظیم دقیق','p.lang':'زبان','p.title':'تنظیمات'
};
/* #endregion */
/* #region Persian page titles and character texts (TITLES, CH) */
var TITLES={'Mera Melody · 3D Character Artist':'Mera Melody · هنرمند کاراکتر سه‌بعدی','Characters · Mera Melody':'کاراکترها · Mera Melody'};
var CH={
 w17:{tag:'ربات · Blender',line:'حرف W یعنی Wraith (شبح): رباتی که دیده نمی‌شود.',
  story:['ذهنی مصنوعی که در تاریکی زیرزمین زندگی می‌کند و از راه دور، در بدن ربات‌ها می‌جنگد؛ بدن می‌شکند، ولی خودش نه.','او جنگ‌ها را تمام کرد و جهان را زیر یک پرچم آورد؛ و آخرش، برای نجات همه، خودش را به بیست بخش تقسیم کرد.'],
  meta:['Hard-surface','نور لبه','Blender']},
 m8:{tag:'ربات · Blender',line:'هشتمین ربات از نوع خودش.',
  story:['محافظی که روزی از انسان‌ها مراقبت کرد و در پایان، آینده‌ی آن‌ها را به قیمت وجود خودش نجات داد.','زانو زده، کلاه بر سر، با نوری نرم در صورتش؛ آخرین ماندگار از هجده ربات M.'],
  meta:['شخصیت','مطالعه‌ی ژست','Blender']},
 knight:{tag:'پراپ · Blender',line:'یک مهره‌ی شطرنج، سیاه و طلایی.',
  story:['زره‌ی سیاه براق با خط‌های باریکی از طلای مذاب، روی یک پایه‌ی سنگین.','مهره‌ای که انگار از قبل تصمیم گرفته حرکت بعدی‌اش چیست.'],
  meta:['Hard-surface','طلای درخشان','Blender']}
};
/* #endregion */
/* #region Switching and translating */
try{if(localStorage.getItem(KEY)==='fa')lang='fa'}catch(e){}
/* Put the language on <html> (lang, data-lang, dir) so CSS can react to it. */
function mark(){D.setAttribute('lang',lang);D.setAttribute('data-lang',lang);
 if(lang==='fa')D.setAttribute('dir','rtl');else D.removeAttribute('dir')}   /* rtl.css mirrors the layout when data-lang=fa */
mark();

/* Text for key k in the current language (d is the English default). */
function t(k,d){return lang==='fa'&&FA[k]!=null?FA[k]:d}
/* Translate a character's tag, line, story and meta with the CH table. */
window.MM_T=function(c){var f=lang==='fa'&&c&&CH[c.id];return f?Object.assign({},c,f):c};

/* Swap every data-i18n text inside root to the current language. */
function scan(root){(root||document).querySelectorAll('[data-i18n],[data-i18n-html]').forEach(function(el){
 var html=el.hasAttribute('data-i18n-html'),k=el.getAttribute(html?'data-i18n-html':'data-i18n');
 if(el.__en==null)el.__en=html?el.innerHTML:el.textContent;
 var v=lang==='fa'&&FA[k]!=null?FA[k]:el.__en;if(html)el.innerHTML=v;else el.textContent=v});
 var tt=document.title;if(!document.__t0)document.__t0=tt;document.title=lang==='fa'&&TITLES[document.__t0]||document.__t0}

/* #endregion */
/* #region Persian layout CSS and font */
var css='html[data-lang=fa] :is(body,body *):not(svg):not(svg *){font-family:Vazirmatn,"Segoe UI",Tahoma,system-ui,sans-serif!important;letter-spacing:0!important;text-transform:none!important}'
+'html[data-lang=fa] :is(.hero-text,.about,.info,.dhint,.card,.chips){direction:rtl;text-align:right}'
+'html[data-lang=fa] .hero-text{width:fit-content;max-width:640px}'
+'html[data-lang=fa] .btn span{margin:0 8px 0 0;transform:scaleX(-1)}html[data-lang=fa] .btn:hover span{transform:scaleX(-1) translateX(5px)}'
+'html[data-lang=fa] .ar{scale:-1 1}html[data-lang=fa] li:hover .ar,html[data-lang=fa] li:focus-within .ar{transform:translateX(-4px)}'
+'html[data-lang=fa] .cta,html[data-lang=fa] .cta *{direction:rtl}';
var st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
/* Load the Persian font the first time Persian is used. */
function font(){if(lang!=='fa'||document.getElementById('mm-fafont'))return;var l=document.createElement('link');l.id='mm-fafont';l.rel='stylesheet';
 l.href='https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600&display=swap';document.head.appendChild(l)}
font();

/* #endregion */
/* #region Language switch and public API */
/* Switch language, remember the choice and redraw the page. */
function set(l){if(l===lang)return;lang=l;try{localStorage.setItem(KEY,l)}catch(e){}
 mark();font();scan();if(window.SITE_REBUILD)try{window.SITE_REBUILD()}catch(e){console.error(e)}scan();
 subs.forEach(function(f){try{f(lang)}catch(e){console.error(e)}})}
window.MM_LANG={get:function(){return lang},set:set,t:t,scan:scan,onChange:function(f){subs.push(f)}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){scan()});else scan();
addEventListener('storage',function(e){if(e.key===KEY){var l=e.newValue==='fa'?'fa':'en';set(l)}});
/* #endregion */
})();
