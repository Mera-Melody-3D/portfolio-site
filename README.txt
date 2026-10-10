MERA MELODY PORTFOLIO
=====================

PAGES AND FILES
  index.html, characters.html, story.html   the three pages (markup only)
  css/base.css      colours (--bg, --ink, --blue ...), base text, top-bar state, reduced motion: used by every page
  css/inner.css     shared by characters.html and story.html (page frame, top bar, glass pill button)
  css/index.css, css/characters.css, css/story.css   the styles of each page
  css/nav.css       the top menu: glass capsule with a glowing lens + the custom scrollbar look
  css/rtl.css       the mirrored layout used in Persian. Every rule starts with html[data-lang="fa"], so English is never affected
  js/loader.js      loads data/site.js (and data/lore.js) and, on localhost only, admin/admin.js
  js/index.js, js/index-wave.js, js/characters.js, js/story.js   the scripts of each page
  js/lang.js        English/Persian switch. Persian UI texts live in this file; a character added in the editor stays English until you add its Persian text to CH
  js/theme.js       the visitors' "Color" panel (saved in their own browser)
  js/nav-fx.js      the lens in the top menu
  js/wipe.js        the page-transition animation (add data-go to a link to use it)
  js/cursor.js      the custom mouse cursor (images/cursor.png is the arrow; delete the <script src="js/cursor.js"> line in a page to turn it off)
  js/protect.js     blocks copy / select / right-click / drag / save / print / dev-tools keys for VISITORS. It switches itself off on localhost, so the editor (E panel) works normally for you
  data/site.js      ALL characters and gallery images (the editor writes this file)
  data/lore.js      the long stories (the editor's Stories tab writes this file)
  admin/admin.js    the editor panel. It only loads on localhost, visitors never get it
  models/ images/   your .glb files and pictures
  favicon.svg, robots.txt, .nojekyll, .gitignore   publishing helpers for GitHub Pages
  CHANGELOG.md      what was cleaned up and why
  CODE-MAP.md       a beginner's map of the code (Persian)

TIP: every bigger file has a "Contents" comment at the top and "#region" markers.
  In VS Code press Ctrl+K Ctrl+0 to fold everything, or search for "#region" to jump to a section.

EDIT THE SITE (the E panel)
  1. Double-click start-editor.bat (Windows) or start-editor.command (Mac/Linux).
     It opens http://localhost:8000. Use Chrome or Edge.
     (No Python? Install it from python.org, or open the folder in VS Code and use the "Live Server" extension.)
  2. Press E to open or close the panel. (E does nothing while you type in a field.)
  3. Characters tab: add, edit, delete and reorder characters (name, subtitle, color, story, tools,
     .glb model, still image, card thumbnail). Gallery tab: add images, titles, order.
     The page behind the panel updates live.
  4. Every change is kept as a draft a moment later. If you close the tab you will be asked next time:
     "Restore previous draft?". Leaving the page with unsaved changes shows a warning.
  5. Press Save to folder. The first time, choose THIS folder (the one with index.html).
     Save writes data/site.js and the new model/image files into it, and removes the files of anything
     you deleted. Discard throws the draft away.
  6. To publish: upload/commit the whole folder to GitHub (GitHub Pages) as you did before.

NOTES
  - Models: in Blender use File > Export > glTF 2.0 > format "glTF Binary (.glb)".
  - Big pictures are shrunk automatically. Models over ~25 MB load slowly (GitHub rejects files over 100 MB).
  - A character's id (used in links like characters.html#w17) is locked after its first save so links keep working.
  - You can still edit data/site.js by hand if you like.
  - Ctrl+S saves while the panel is open. Esc closes it.


FULL STORIES (story.html)
- The long story of each character lives in data/lore.js (the editor panel's Stories tab writes it; data/site.js is not touched by it).
- Run start-editor.bat, open story.html (or any page), press E, open the "Stories" tab, pick a character
  (add the character in the Characters tab first). There you can import a Word file (section titles = Heading 2),
  edit sections, set the color, the cover picture and a glow on eyes/lights, then press "Save to folder".
