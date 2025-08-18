/**
 * lazy-loader.js
 * Универсальный переносимый модуль:
 * - loadScript, loadModule, loadCSS (с кешем, attrs, SRI support)
 * - fetchWithCache
 * - lazy block loader (selector .lazy-load by default; data-src, data-css, data-js, data-module, data-replace)
 * - events: lazyblock:beforeload, lazyblock:loaded, lazyblock:error
 * - API: window.lazyLoader.{initBlocks, loadBlock, loadScript, loadModule, loadCSS, initMaps}
 *
 * Подключение:
 * <script type="module" src="/assets/js/lazy-loader.js" defer></script>
 *
 * Цель: один файл, который легко переносить между проектами.
 */

const LazyLoader = (function () {
  // ====== CACHES & INTERNALS ======
  const scriptPromises = new Map(); // src -> Promise
  const modulePromises = new Map(); // url -> Promise
  const cssPromises = new Map(); // href -> Promise
  const fetchCache = new Map(); // url -> Promise<string>

  // Default settings
  const DEFAULT_ROOT_MARGIN = '400px';
  const DEFAULT_BLOCK_SELECTOR = '.lazy-load';

  // ====== HELPERS ======
  function isElementLoadedSelector(selector) {
    return !!document.querySelector(selector);
  }

  // normalize attribute list separated by spaces or commas
  function parseListAttr(str) {
    if (!str) return [];
    return String(str).split(/[\s,]+|,+/).map(s => s.trim()).filter(Boolean);
  }

  // Utility: create element only if not exists by src/href
  function elementExists(selector) {
    return !!document.querySelector(selector);
  }

  // ====== loadScript ======
  // options: { async=true, defer=false, attrs: {integrity, crossorigin, type, nomodule, ...}, timeoutMs }
  function loadScript(src, options = {}) {
    if (!src) return Promise.reject(new Error('loadScript: src is required'));
    if (scriptPromises.has(src)) return scriptPromises.get(src);

    const { async = true, defer = false, attrs = {}, timeoutMs = 20000 } = options;

    const promise = new Promise((resolve, reject) => {
      // if already present in DOM, consider it loaded (best-effort)
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }

      const s = document.createElement('script');
      s.src = src;
      s.async = !!async;
      s.defer = !!defer;
      Object.entries(attrs || {}).forEach(([k, v]) => {
        if (v === true) s.setAttribute(k, '');
        else s.setAttribute(k, String(v));
      });

      let timedOut = false;
      let timer = null;
      if (timeoutMs) {
        timer = setTimeout(() => {
          timedOut = true;
          const err = new Error('loadScript timeout: ' + src);
          reject(err);
        }, timeoutMs);
      }

      s.addEventListener('load', () => {
        if (timer) clearTimeout(timer);
        if (timedOut) return;
        resolve();
      }, { once: true });
      s.addEventListener('error', (e) => {
        if (timer) clearTimeout(timer);
        reject(new Error('Failed to load script: ' + src));
      }, { once: true });

      document.head.appendChild(s);
    });

    scriptPromises.set(src, promise);
    // remove from cache on rejection? keep it so repeated attempts use same rejected promise unless user resets
    return promise;
  }

  // ====== loadModule (dynamic import with fallback to script[type=module]) ======
  // note: when using CDN ESM, CORS must be allowed on that URL for dynamic import to work.
  async function loadModule(url, { timeoutMs = 20000 } = {}) {
    if (!url) return Promise.reject(new Error('loadModule: url is required'));
    if (modulePromises.has(url)) return modulePromises.get(url);

    const promise = (async () => {
      // Attempt dynamic import first
      try {
        // webpackIgnore prevents bundlers from resolving URL at build time when used inside a module environment.
        const mod = await import(/* webpackIgnore: true */ url);
        return mod;
      } catch (err) {
        // Fallback: insert <script type="module" src="...">
        return await new Promise((resolve, reject) => {
          // if already present via script[type=module][src=url] -> resolve when loaded
          const existing = document.querySelector(`script[type="module"][src="${url}"]`);
          if (existing) {
            existing.addEventListener('load', () => resolve(window.__lazyLoaderModuleFallback || {}), { once: true });
            existing.addEventListener('error', () => reject(new Error('Failed to load module (existing script) ' + url)), { once: true });
            return;
          }

          const s = document.createElement('script');
          s.type = 'module';
          s.src = url;
          s.setAttribute('data-lazy-loader-module', '1');

          let timedOut = false;
          let timer = null;
          if (timeoutMs) {
            timer = setTimeout(() => {
              timedOut = true;
              reject(new Error('loadModule timeout: ' + url));
            }, timeoutMs);
          }

          s.addEventListener('load', () => {
            if (timer) clearTimeout(timer);
            if (timedOut) return;
            // Many CDN ESM bundles may not expose exports globally; consumer module should attach global fallback if needed.
            resolve(window.__lazyLoaderModuleFallback || {});
          }, { once: true });
          s.addEventListener('error', () => {
            if (timer) clearTimeout(timer);
            reject(new Error('Failed to load module: ' + url));
          }, { once: true });
          document.head.appendChild(s);
        });
      }
    })();

    modulePromises.set(url, promise);
    return promise;
  }

  // ====== loadCSS ======
  function loadCSS(href, { attrs = {}, timeoutMs = 20000 } = {}) {
    if (!href) return Promise.resolve();
    if (cssPromises.has(href)) return cssPromises.get(href);

    const p = new Promise((resolve, reject) => {
      if (document.querySelector(`link[href="${href}"]`)) {
        resolve();
        return;
      }
      const l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = href;
      Object.entries(attrs || {}).forEach(([k, v]) => {
        if (v === true) l.setAttribute(k, '');
        else l.setAttribute(k, String(v));
      });

      let timer = null;
      let timedOut = false;
      if (timeoutMs) {
        timer = setTimeout(() => {
          timedOut = true;
          reject(new Error('loadCSS timeout: ' + href));
        }, timeoutMs);
      }

      l.addEventListener('load', () => {
        if (timer) clearTimeout(timer);
        if (timedOut) return;
        resolve();
      }, { once: true });
      l.addEventListener('error', () => {
        if (timer) clearTimeout(timer);
        reject(new Error('Failed to load CSS: ' + href));
      }, { once: true });

      document.head.appendChild(l);
    });

    cssPromises.set(href, p);
    return p;
  }

  // ====== fetchWithCache ======
  function fetchWithCache(url, options = {}) {
    if (!url) return Promise.reject(new Error('fetchWithCache: url required'));
    if (fetchCache.has(url)) return fetchCache.get(url);
    const p = fetch(url, options).then(async (res) => {
      if (!res.ok) throw new Error('Failed to fetch ' + url + ' status=' + res.status);
      return res.text();
    });
    fetchCache.set(url, p);
    return p;
  }

  // ====== Lazy Block Loader ======
  // data attributes:
  // data-src / data-url - html fragment URL
  // data-css - CSS href(s) (space/comma separated)
  // data-js - non-module script(s) (space/comma separated)
  // data-module - module URL(s) (space/comma separated)
  // data-replace="true" - replace placeholder element with fetched fragment
  // data-insert="append|prepend|after|before|replace" - insertion mode
  // Emits element-level events: lazyblock:beforeload, lazyblock:loaded, lazyblock:error
  // Also global window events of same names.

  async function loadBlock(el, options = {}) {
    if (!el) return Promise.reject(new Error('loadBlock: element is required'));
    if (el.__lazyblock_loading) return Promise.reject(new Error('Already loading'));
    if (el.__lazyblock_loaded) return Promise.resolve(true);

    el.__lazyblock_loading = true;
    const url = el.dataset.src || el.dataset.url || options.url;
    const replaceAttr = el.dataset.replace;
    const insertModeAttr = el.dataset.insert;
    const replace = options.replace === true || replaceAttr === 'true' || replaceAttr === '1';
    const insertMode = options.insert || insertModeAttr || (replace ? 'replace' : 'inner');

    const detailBase = { url, el };

    el.dispatchEvent(new CustomEvent('lazyblock:beforeload', { detail: detailBase }));
    window.dispatchEvent(new CustomEvent('lazyblock:beforeload', { detail: detailBase }));

    try {
      if (!url) throw new Error('No data-src/data-url for lazy block');

      const cssList = parseListAttr(el.dataset.css || '');
      const jsList = parseListAttr(el.dataset.js || '');
      const moduleList = parseListAttr(el.dataset.module || '');

      // Load CSS first (so styles are available by the time DOM is inserted)
      // Note: you may invert order (html first) depending on UX preference
      const cssPromises = cssList.map(h => loadCSS(h).catch(err => { throw err; }));
      // Load non-module scripts (these will execute when inserted)
      const jsPromises = jsList.map(src => {
        if (scriptPromises.has(src) || document.querySelector(`script[src="${src}"]`)) {
          return Promise.resolve();
        }
        return loadScript(src, { async: true, defer: true });
      });
      // Load modules
      const modulePromisesArr = moduleList.map(m => loadModule(m));

      // Wait for dependencies in parallel
      await Promise.allSettled([...cssPromises, ...jsPromises, ...modulePromisesArr]).then(results => {
        const rej = results.find(r => r.status === 'rejected');
        if (rej) throw rej.reason;
      });

      // Fetch HTML
      const html = await fetchWithCache(url);

      // Insert HTML according to insertMode
      if (insertMode === 'replace') {
        const wrapper = document.createElement('div');
        wrapper.innerHTML = html;
        // if single child and we want to preserve it, replace with child
        if (wrapper.children.length === 1) {
          el.replaceWith(wrapper.children[0]);
        } else {
          el.replaceWith(wrapper);
        }
      } else if (insertMode === 'append') {
        el.insertAdjacentHTML('beforeend', html);
      } else if (insertMode === 'prepend') {
        el.insertAdjacentHTML('afterbegin', html);
      } else if (insertMode === 'before') {
        el.insertAdjacentHTML('beforebegin', html);
      } else if (insertMode === 'after') {
        el.insertAdjacentHTML('afterend', html);
      } else {
        // default: inner
        el.innerHTML = html;
      }

      el.__lazyblock_loaded = true;
      el.__lazyblock_loading = false;
      el.dispatchEvent(new CustomEvent('lazyblock:loaded', { detail: detailBase }));
      window.dispatchEvent(new CustomEvent('lazyblock:loaded', { detail: detailBase }));
      return true;
    } catch (err) {
      el.__lazyblock_loading = false;
      el.dispatchEvent(new CustomEvent('lazyblock:error', { detail: { error: err } }));
      window.dispatchEvent(new CustomEvent('lazyblock:error', { detail: { error: err, el } }));
      throw err;
    }
  }

  function initBlocks(selector = DEFAULT_BLOCK_SELECTOR, opts = {}) {
    const rootMargin = opts.rootMargin || DEFAULT_ROOT_MARGIN;
    const threshold = (typeof opts.threshold !== 'undefined') ? opts.threshold : 0.01;
    const root = opts.root || null;

    const nodes = Array.from(document.querySelectorAll(selector));
    if (!nodes.length) return;

    if (!('IntersectionObserver' in window)) {
      // fallback: load all now (or could wait for manual trigger)
      nodes.forEach(n => loadBlock(n).catch(() => {}));
      return;
    }

    const io = new IntersectionObserver((entries, obs) => {
      const toLoad = [];
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          obs.unobserve(entry.target);
          toLoad.push(entry.target);
        }
      });
      if (toLoad.length) {
        toLoad.forEach(el => loadBlock(el).catch(() => {}));
      }
    }, { root, rootMargin, threshold });

    nodes.forEach(n => io.observe(n));
  }

  // ====== Simple Maps init helper (Google Maps + markerclusterer) ======
  // Use by calling lazyLoader.initMaps(options) or include a .map container with data attributes and use initMaps() to auto-detect.
  // Map container: <div class="map" data-maps-api-key="..." data-center-lat=".." data-center-lng=".." data-zoom="12"> <div class="marker" data-lat=".." data-lng=".." data-title="..."></div> </div>
  function createGoogleMapForElement(el) {
    if (!el) return Promise.reject(new Error('createGoogleMapForElement: el required'));
    const apiKey = el.dataset.mapsApiKey || el.getAttribute('data-maps-api-key') || '';
    if (!apiKey) return Promise.reject(new Error('No maps API key in data-maps-api-key'));

    const centerLat = parseFloat(el.dataset.centerLat || el.getAttribute('data-center-lat') || '0') || 0;
    const centerLng = parseFloat(el.dataset.centerLng || el.getAttribute('data-center-lng') || '0') || 0;
    const zoom = parseInt(el.dataset.zoom || el.getAttribute('data-zoom') || '12', 10) || 12;

    const callbackName = '__lazyLoader_initMap_' + Math.random().toString(36).slice(2, 9);

    return new Promise((resolve, reject) => {
      window[callbackName] = function () {
        try {
          const map = new google.maps.Map(el, {
            center: { lat: centerLat, lng: centerLng },
            zoom,
            gestureHandling: 'cooperative'
          });

          const markers = [];
          el.querySelectorAll('.marker').forEach(mEl => {
            const lat = parseFloat(mEl.dataset.lat || mEl.getAttribute('data-lat'));
            const lng = parseFloat(mEl.dataset.lng || mEl.getAttribute('data-lng'));
            if (Number.isFinite(lat) && Number.isFinite(lng)) {
              const marker = new google.maps.Marker({
                position: { lat, lng },
                map,
                title: mEl.dataset.title || mEl.getAttribute('data-title') || ''
              });
              markers.push(marker);
            }
          });

          // Load markerclusterer library if markers exist
          if (markers.length) {
            const markerClustererUrl = 'https://unpkg.com/@googlemaps/markerclusterer/dist/index.min.js';
            loadScript(markerClustererUrl, { async: true, defer: true }).then(() => {
              try {
                if (window.MarkerClusterer) {
                  try {
                    // modern usage
                    new MarkerClusterer({ map, markers });
                  } catch (e) {
                    // fallback old constructor
                    try { new window.MarkerClusterer(map, markers, {}); } catch (err) {}
                  }
                } else if (window.markerClusterer) {
                  new window.markerClusterer(map, markers);
                } // else no global
              } catch (ex) {
                // ignore
              }
            }).finally(() => {
              try { delete window[callbackName]; } catch (e) { window[callbackName] = undefined; }
              resolve(map);
            });
          } else {
            try { delete window[callbackName]; } catch (e) { window[callbackName] = undefined; }
            resolve(map);
          }
        } catch (err) {
          try { delete window[callbackName]; } catch (e) { window[callbackName] = undefined; }
          reject(err);
        }
      };

      // Append Google Maps script with callback
      const mapsUrl = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&callback=${callbackName}`;
      const s = document.createElement('script');
      s.src = mapsUrl;
      s.async = true;
      s.defer = true;
      s.addEventListener('error', () => {
        try { delete window[callbackName]; } catch (e) { window[callbackName] = undefined; }
        reject(new Error('Failed to load Google Maps API'));
      }, { once: true });
      document.head.appendChild(s);
    });
  }

  function initMaps(selector = '.map', opts = {}) {
    const rootMargin = opts.rootMargin || '500px';
    const threshold = (typeof opts.threshold !== 'undefined') ? opts.threshold : 0.01;
    const root = opts.root || null;

    const nodes = Array.from(document.querySelectorAll(selector));
    if (!nodes.length) return;

    if (!('IntersectionObserver' in window)) {
      nodes.forEach(n => createGoogleMapForElement(n).catch(() => {}));
      return;
    }

    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          obs.unobserve(entry.target);
          createGoogleMapForElement(entry.target).catch(() => {});
        }
      });
    }, { root, rootMargin, threshold });

    nodes.forEach(n => io.observe(n));
  }

  // ====== Exposed API ======
  const api = {
    // loaders
    loadScript,
    loadModule,
    loadCSS,
    fetchWithCache,

    // lazy blocks
    loadBlock,
    initBlocks,

    // maps
    createGoogleMapForElement,
    initMaps,

    // caches (for testing / reset)
    _caches: {
      scriptPromises,
      modulePromises,
      cssPromises,
      fetchCache
    },

    // helpers
    parseListAttr
  };

  return api;
})();

// Expose globally for easy usage/portability
if (typeof window !== 'undefined') {
  window.lazyLoader = window.lazyLoader || LazyLoader;
}

// Export for module-aware environments
export default LazyLoader;