# Changelog: production cleanup

Goal: clean, human-maintainable code **without changing how the site looks or behaves**.

## What changed

**Package**
- Zip root is now the site folder `portfolio-site/` (`index.html` at its root). Before, it was `portfolio-site -/`.
- Removed `story-update.zip` (an old copy of files) and the empty `images/gallery/` folder (the editor re-creates it when needed).
- Added `.gitignore`, `.nojekyll`, `robots.txt`, `favicon.svg` (the five blades of the page transition) and a favicon `<link>` on every page.
- `README.txt` rewritten for the new structure. `start-editor.bat` still has CRLF line endings.

**Structure**
- Shared files moved into `css/` and `js/`. `data/`, `images/`, `models/`, `admin/` are unchanged.
- Each page's inline `<style>` and `<script>` moved to `css/<page>.css` and `js/<page>.js` (`index` also has `js/index-wave.js`). Load order is the same as before.
- One loader: `js/loader.js` replaces the `document.write` snippet that was copied into three pages. `index.html` loads `lore.js` only on localhost (as before); the other pages carry `data-lore-always`.
- One source of truth for shared CSS: `css/base.css` (colour tokens, body, focus ring, top-bar state, reduced motion; all pages) and `css/inner.css` (frame, fixed top bar, glass pill button; characters + story).

**Readability**
- Contents comment + `#region` markers in every file over ~60 lines (HTML, CSS, JS, `admin/admin.js`). One-line plain-English comments above non-obvious functions.
- Removed CSS declarations that a later rule with the same selector always overrode (e.g. old `.hero::after`, `.cue`, `.card`, `.hero .btn` values) and exact duplicates. Merged two `.read h2` rules. Replaced the `renderCards` wrapper in `index.js` with a direct `chk()` call.
- Meta: added `og:description` (story) and `twitter:title/description` (characters, story). `aria-label` on `<nav>` and a dialog role on the image viewer.

## Verified
- Screenshots before/after at 1440px and 390px, English and Persian, for index, characters, story#m8, story#w17: identical outside the animated gear dial (which also differs between two runs of the *original*, so it is animation noise). Page text, console errors (none) and horizontal scroll (none at 390px) match.
- Production mode (non-localhost host): same data files load, no `admin.js`, copy protection still active, no errors.
- Editor on localhost with a mocked folder: edited a title, imported a section from pasted text and from a `.docx`, saved. Output of `data/site.js` and `data/lore.js` is **byte-identical** to the output of the original editor. English-only edit: all 221 Persian strings identical. Persian edit: only the one title I edited changed.
- Hashes of all 221 lore strings and the 59 Persian UI/character strings in `lang.js`: identical to the original.
- Every `data-i18n` key exists in the FA table; every referenced file exists with exact case; no absolute or localhost paths.
- Not testable here: a real Chrome folder picker (mocked), the Google Fonts and model-viewer CDN (blocked in my sandbox, so the 3D model and web fonts were not rendered in screenshots).

## Deliberately not changed
- `data/lore.js`, `data/site.js` and the Persian text in `js/lang.js`: no regions, no reformatting (the editor rewrites those files and the text must stay byte-for-byte).
- Dense one-line JS/CSS style was kept; reformatting it would be risky without a build step. `esc()`/`pad()` helpers are repeated in several scripts (not shared: they live in separate closures and the editor has its own variant).
- `console.error` in `catch` blocks is real error reporting, so it stays. The `og:image` hint comment in `index.html` stays (your address is not known yet).
- CDN dependencies (Google Fonts, model-viewer 3.5.0) unchanged: no new network dependencies.

## Remaining risks / to do
- Page-specific CSS/JS are now separate files: a first visit makes a few more requests (cached afterwards). On a very slow connection content could appear a moment before its script runs.
- `og:image` and `Sitemap:` need your real address after publishing.
- The CDN script has no integrity hash (SRI); add one if you want.
- Keyboard: a scrollable panel (`div`) can receive focus without a visible ring; gallery tiles are mouse-only (not focusable). Both would need small visible changes, so they are listed, not fixed.
- The eye-glow loop on the home page keeps running under `prefers-reduced-motion` (opacity easing only; particles, transitions and animations are off).

## Performance notes (no visual change made)
- `models/w17.glb` is 6.5 MB (the largest asset by far); `m8.glb` 1.1 MB. Consider Draco/Meshopt compression and WebP textures.
- `images/hero.jpg` (2560x1440) is 341 KB; `knight.png` 220 KB could be WebP/JPG. `w17.jpg` is 1200x1600, `m8.jpg` 1600x1197: bigger than their on-screen size.
- Models are created 2.5 s after load for all characters; with more characters consider loading only on demand.
- `data/lore.js` (61 KB) is loaded by characters.html and story.html but only needed to know if a story exists (characters) or to show it (story).
- All images are used; none are unreferenced.
