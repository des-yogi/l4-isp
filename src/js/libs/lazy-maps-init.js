(function () {
  // Scripts map async initialization Start
  //const apiKeyLocal = 'AIzaSyBqO-iJGp0LsZjKZrNhIjodnrqgxD7vVWU';
  const _mapEl = document.getElementById('map');
  const _mapApiKey = _mapEl ? _mapEl.getAttribute('data-maps-api-key') : undefined;

  (g=>{ var h,a,k,p="The Google Maps JavaScript API",c="google",l="importLibrary",q="__ib__",m=document,b=window;b=b[c]||(b[c]={ });var d=b.maps||(b.maps={ }),r=new Set,e=new URLSearchParams,u=()=>h||(h=new Promise(async(f,n)=>{ await (a=m.createElement("script"));e.set("libraries",[...r]+"");for(k in g)e.set(k.replace(/[A-Z]/g,t=>"_"+t[0].toLowerCase()),g[k]);e.set("callback",c+".maps."+q);a.src=`https://maps.${ c}apis.com/maps/api/js?`+e;d[q]=f;a.onerror=()=>h=n(Error(p+" could not load."));a.nonce=m.querySelector("script[nonce]")?.nonce||"";m.head.append(a)}));d[l]?console.warn(p+" only loads once. Ignoring:",g):d[l]=(f,...n)=>r.add(f)&&u().then(()=>d[l](f,...n))})({
    key: _mapApiKey,
    v: "weekly",
  });
  // Scripts map initialization End

  // ====== CONFIG ======
    const DEFAULT_MAP_ID = '1ba02fcecc153be989d2ce78';
    const MARKER_CLUSTERER_URL = 'https://unpkg.com/@googlemaps/markerclusterer/dist/index.min.js';
    const SCRIPT_LOAD_TIMEOUT = 20000;
    // ====================

    // ---------- Utilities ----------
    function tryParseJson(text) {
      if (!text || !text.trim()) return null;
      try { return JSON.parse(text); }
      catch (e) {
        try {
          const fixed = text.replace(/&quot;/g, '"').replace(/\r?\n/g, ' ');
          return JSON.parse(fixed);
        } catch (e2) {
          return null;
        }
      }
    }

    function _loadScript(src, opts = {}) {
      return new Promise((resolve, reject) => {
        const found = Array.from(document.scripts).find(s => s.src && s.src.indexOf(src) !== -1);
        if (found) {
          if (found.getAttribute('data-loaded') === '1' || found.readyState === 'complete') return resolve();
          found.addEventListener('load', () => resolve(), { once: true });
          found.addEventListener('error', () => reject(new Error('Failed to load script: ' + src)), { once: true });
          return;
        }

        const s = document.createElement('script');
        s.src = src;
        s.async = !!opts.async;
        s.defer = !!opts.defer;
        try { s.setAttribute('loading', opts.loadingAttr || 'async'); } catch (e) {}
        if (opts.attrs) Object.entries(opts.attrs).forEach(([k, v]) => {
          if (v === true) s.setAttribute(k, ''); else s.setAttribute(k, String(v));
        });
        const timer = opts.timeoutMs ? setTimeout(() => { reject(new Error('Script load timeout: ' + src)); }, opts.timeoutMs) : null;
        s.addEventListener('load', () => { if (timer) clearTimeout(timer); s.setAttribute('data-loaded', '1'); resolve(); }, { once: true });
        s.addEventListener('error', () => { if (timer) clearTimeout(timer); reject(new Error('Failed to load script: ' + src)); }, { once: true });
        document.head.appendChild(s);
      });
    }

    function buildMapsUrl({ apiKey, libraries, callbackName, version } = {}) {
      const params = new URLSearchParams();
      if (apiKey) params.set('key', apiKey);
      if (libraries) params.set('libraries', libraries);
      if (version) params.set('v', version);
      if (callbackName) params.set('callback', callbackName);
      return `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    }

    function loadGoogleMaps({ apiKey, libraries = 'places,marker', version = 'weekly', timeoutMs = SCRIPT_LOAD_TIMEOUT } = {}) {
      return new Promise((resolve, reject) => {
        if (window.google && window.google.maps) {
          return resolve(window.google.maps);
        }

        const cbName = '__lazyMaps_cb_' + Math.random().toString(36).slice(2, 9);
        let timedOut = false;
        const timer = setTimeout(() => {
          timedOut = true;
          try { delete window[cbName]; } catch (e) {}
          reject(new Error('Google Maps load timeout'));
        }, timeoutMs);

        window[cbName] = function () {
          if (timedOut) return;
          clearTimeout(timer);
          try { delete window[cbName]; } catch (e) {}
          if (window.google && window.google.maps) return resolve(window.google.maps);
          return resolve(window.google);
        };

        const url = buildMapsUrl({ apiKey, libraries, callbackName: cbName, version });
        _loadScript(url, { async: true, defer: true, loadingAttr: 'async', timeoutMs }).catch(err => {
          try { delete window[cbName]; } catch (e) {}
          clearTimeout(timer);
          reject(err);
        });
      });
    }

    function loadMarkerClusterer(timeoutMs = SCRIPT_LOAD_TIMEOUT) {
      return _loadScript(MARKER_CLUSTERER_URL, { async: true, defer: true, loadingAttr: 'async', timeoutMs })
        .catch(err => { console.warn('lazy-maps: Failed to load markerclusterer', err); throw err; });
    }

    // Read markers JSON from inside the map container
    function readMarkersFromContainer(el) {
      try {
        const inside = el.querySelector('script[type="application/json"].map-markers') || el.querySelector('script[type="application/json"]');
        if (inside && inside.textContent && inside.textContent.trim().length) {
          const parsed = tryParseJson(inside.textContent);
          if (parsed) {
            console.debug('coverage-map: markers read from inside container script[type="application/json"]');
            return parsed;
          } else {
            console.warn('coverage-map: failed to parse JSON inside map container (attempted fallback fixes).');
          }
        }
      } catch (e) {
        console.warn('coverage-map: error reading script inside container', e);
      }

      try {
        const globalCandidate = document.querySelector('script[type="application/json"].map-markers') ||
          Array.from(document.querySelectorAll('script[type="application/json"]')).find(s => (s.textContent || '').indexOf('"gmap"') !== -1);
        if (globalCandidate) {
          const parsed = tryParseJson(globalCandidate.textContent);
          if (parsed) {
            console.debug('coverage-map: markers read from global script[type="application/json"]');
            return parsed;
          } else {
            console.warn('coverage-map: failed to parse JSON from global script');
          }
        }
      } catch (e) {
        console.warn('coverage-map: error reading global script', e);
      }

      try {
        if (window.coverageMap && Array.isArray(window.coverageMap)) {
          console.debug('coverage-map: markers read from window.coverageMap');
          return window.coverageMap;
        }
      } catch (e) {}

      console.debug('coverage-map: no markers found in container or global scripts');
      return [];
    }

    function normalizeCoverage(arr) {
      return (arr || []).map(item => {
        const d = Object.assign({}, item);
        if (typeof d.gmap === 'string') d._gmap = tryParseJson(d.gmap);
        else if (d.gmap && typeof d.gmap === 'object') d._gmap = d.gmap;
        else d._gmap = null;

        const tryNum = v => { if (v === null || typeof v === 'undefined') return undefined; const n = parseFloat(String(v)); return Number.isFinite(n) ? n : undefined; };

        d.lat = tryNum(d.lat) ?? tryNum(d.latitude) ?? (d._gmap ? tryNum(d._gmap.latitude) : undefined);
        d.lng = tryNum(d.lng) ?? tryNum(d.longitude) ?? (d._gmap ? tryNum(d._gmap.longitude) : undefined);

        if ((!d.lat || !d.lng) && d._gmap) {
          // don't treat 0 as missing — check for undefined explicitly
          if ((typeof d.lat === 'undefined' || typeof d.lng === 'undefined') && d._gmap) {
            if (d._gmap.center) {
              d.lat = d.lat ?? tryNum(d._gmap.center.latitude) ?? tryNum(d._gmap.center.lat);
              d.lng = d.lng ?? tryNum(d._gmap.center.longitude) ?? tryNum(d._gmap.center.lng);
            }
            if (d._gmap.loc) {
              d.lat = d.lat ?? tryNum(d._gmap.loc.lat);
              d.lng = d.lng ?? tryNum(d._gmap.loc.lng);
            }
          }
        }
        d.title = d.title || d.pagetitle || '';
        return d;
      }).filter(d => typeof d.lat !== 'undefined' && typeof d.lng !== 'undefined');
    }

    // ---------- Main bootstrap ----------
    async function bootstrapMap(el) {
      if (!el) throw new Error('bootstrapMap: element required');

      const apiKey = el.dataset.mapsApiKey || el.getAttribute('data-maps-api-key') || el.dataset.apiKey || null;
      if (!apiKey) console.warn('coverage-map: data-maps-api-key not found on container; map may not load if missing');

      const providedMapId = el.dataset.mapId || el.dataset.mapsMapId || el.dataset.mapID || el.getAttribute('data-map-id');
      const mapIdToUse = providedMapId || DEFAULT_MAP_ID;

      // Read descriptors BEFORE loading/creating map
      const raw = readMarkersFromContainer(el);
      let descriptors = Array.isArray(raw) ? normalizeCoverage(raw) : [];

      // Load Google Maps
      try {
        await loadGoogleMaps({ apiKey, libraries: 'places,marker' });
      } catch (err) {
        console.error('coverage-map: Failed to load Google Maps', err);
        throw err;
      }

      // Modules
      let MapsModule, MarkerModule;
      try {
        MapsModule = (google && google.maps && typeof google.maps.importLibrary === 'function') ? await google.maps.importLibrary('maps') : google.maps;
        try { MarkerModule = (google && google.maps && typeof google.maps.importLibrary === 'function') ? await google.maps.importLibrary('marker') : (google.maps.marker || {}); } catch (e) { MarkerModule = google.maps.marker || {}; }
      } catch (e) {
        MapsModule = google.maps;
        MarkerModule = google.maps.marker || {};
      }

      const MapCtor = MapsModule && MapsModule.Map ? MapsModule.Map : (google.maps && google.maps.Map ? google.maps.Map : null);
      const InfoWindowCtor = MapsModule && MapsModule.InfoWindow ? MapsModule.InfoWindow : (google.maps && google.maps.InfoWindow ? google.maps.InfoWindow : null);
      const AdvancedMarkerElement = (MarkerModule && MarkerModule.AdvancedMarkerElement) ? MarkerModule.AdvancedMarkerElement : (google.maps && google.maps.marker && google.maps.marker.AdvancedMarkerElement ? google.maps.marker.AdvancedMarkerElement : null);

      if (!MapCtor) { console.error('coverage-map: Map constructor not found'); throw new Error('Map constructor not found'); }

      const mapOptions = {
        zoom: parseInt(el.dataset.zoom || el.getAttribute('data-zoom') || 12, 10),
        maxZoom: parseInt(el.dataset.maxZoom || 20, 10),
        center: { lat: parseFloat(el.dataset.centerLat) || 50.4501, lng: parseFloat(el.dataset.centerLng) || 30.5234 },
        mapId: mapIdToUse
      };

      const map = new MapCtor(el, mapOptions);

      // fallback to DOM .marker children if descriptors empty
      if (!descriptors.length) {
        const domMarkers = Array.from(el.querySelectorAll('.marker')).map(mEl => {
          const lat = parseFloat(mEl.dataset.lat);
          const lng = parseFloat(mEl.dataset.lng);
          return (Number.isFinite(lat) && Number.isFinite(lng)) ? { lat, lng, title: mEl.dataset.title, info: mEl.dataset.info } : null;
        }).filter(Boolean);
        descriptors = normalizeCoverage(domMarkers);
      }

      if (descriptors && descriptors.length) {
        try {
          const bounds = new google.maps.LatLngBounds();
          descriptors.forEach(d => bounds.extend(new google.maps.LatLng(d.lat, d.lng)));
          map.fitBounds(bounds);
        } catch (e) {}
      }

      // Helper: create mirrored accessible button (for classic markers)
      function createAccessibleButtonForClassic(index, label, onActivate) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'sr-marker-btn'; // you should add .sr-marker-btn or share visually-hidden styles
        btn.setAttribute('aria-label', label || ('Marker ' + (index + 1)));
        btn.setAttribute('data-marker-index', String(index));
        // visually hide but keep focusable for AT
        btn.classList.add('visually-hidden');
        btn.addEventListener('click', onActivate);
        btn.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onActivate(e); }
        });
        el.appendChild(btn);
        return btn;
      }

      // Create markers & icons
      const createdMarkers = descriptors.map((location, idx) => {
        const g = location._gmap || {};
        const iconSrc = (location.coverage_status == 1) ? '/img/ip-tv.svg' : '/img/ip.svg';

        const markerElement = document.createElement('div');
        markerElement.classList.add('custom-marker');
        const iconImg = document.createElement('img');
        iconImg.src = iconSrc;
        iconImg.alt = String(location.coverage_status || '');
        iconImg.style.width = '56px';
        iconImg.style.height = '56px';
        markerElement.appendChild(iconImg);

        // Accessibility: make the markerElement focusable and announceable to AT.
        // This is effective for AdvancedMarkerElement (HTML content). For classic icon markers,
        // we'll create a separate visually-hidden button below.
        markerElement.setAttribute('role', 'button');
        markerElement.setAttribute('tabindex', '0');
        markerElement.setAttribute('aria-label', location.title || ((g.street || '') + ' ' + (g.housenumber || '') || 'Точка на мааі'));
        // ensure not hidden for screen readers
        markerElement.setAttribute('aria-hidden', 'false');

        // small visually-hidden text for screen readers (if you prefer)
        const srSpan = document.createElement('span');
        srSpan.className = 'visually-hidden';
        srSpan.textContent = markerElement.getAttribute('aria-label');
        markerElement.appendChild(srSpan);

        // handler to open info window (we will reuse for click and keyboard)
        const openHandler = (markerInstance) => {
          openInfoWindowForLocation({ map, marker: markerInstance, location, g, InfoWindowCtor, focusReturnElement: markerElement });
        };

        if (AdvancedMarkerElement && (map.mapId || mapIdToUse)) {
          try {
            const adv = new AdvancedMarkerElement({
              // use normalized coordinates from `location` (normalizeCoverage)
              position: { lat: Number(location.lat), lng: Number(location.lng) },
              content: markerElement,
              title: (g.street || '') + ' ' + (g.housenumber || '')
            });


            // click events: Google AdvancedMarkerElement supports addListener
            adv.addListener && adv.addListener('click', ({ domEvent, latLng } = {}) => {
              openHandler(adv);
            });

            // keyboard: Enter/Space on the marker's content should open infowindow
            markerElement.addEventListener('keydown', (ev) => {
              if (ev.key === 'Enter' || ev.key === ' ') {
                ev.preventDefault();
                openHandler(adv);
              }
            });

            // ensure markerElement focused state is visible via CSS :focus (add styles in your CSS)
            // return instance
            return adv;
          } catch (e) {
            console.warn('coverage-map: AdvancedMarkerElement creation failed; fallback to classic Marker', e);
          }
        }

        // fallback to classic marker (image icon)
        const classic = new google.maps.Marker({
          // use normalized coordinates from `location` (normalizeCoverage)
          position: { lat: Number(location.lat), lng: Number(location.lng) },
          map,
          title: (g.street || '') + ' ' + (g.housenumber || ''),
          icon: { url: iconSrc, scaledSize: new google.maps.Size(56, 56) }
        });
        classic.addListener && classic.addListener('click', () => openInfoWindowForLocation({ map, marker: classic, location, g, InfoWindowCtor, focusReturnElement: null }));

        // For classic markers, create an accessible visually-hidden button in the DOM to open / focus infowindow
        // This is necessary because classic markers are rendered as images in map canvas and not focusable by AT.
        const accBtn = createAccessibleButtonForClassic(idx, markerElement.getAttribute('aria-label'), (e) => {
          // open infowindow and return focus to this button on close
          openInfoWindowForLocation({ map, marker: classic, location, g, InfoWindowCtor, focusReturnElement: accBtn });
        });

        // Return the marker instance (classic)
        return classic;
      });

      // --- CLUSTERIZATION (unchanged from previous logic) ---
      try {
        if (el.__markerClusterInstance) {
          try {
            if (typeof el.__markerClusterInstance.clearMarkers === 'function') {
              el.__markerClusterInstance.clearMarkers();
            }
            if (typeof el.__markerClusterInstance.dispose === 'function') {
              el.__markerClusterInstance.dispose();
            } else if (typeof el.__markerClusterInstance.destroy === 'function') {
              el.__markerClusterInstance.destroy();
            } else if (typeof el.__markerClusterInstance.release === 'function') {
              el.__markerClusterInstance.release();
            }
          } catch (e) {
            console.debug('coverage-map: error while clearing previous cluster instance', e);
          }
          delete el.__markerClusterInstance;
        }

        await loadMarkerClusterer().catch(() => { /* maybe already present */ });

        const defaultClusterOptions = {
          maxZoom: undefined,
          minClusterSize: 2,
          clusterClassName: 'coverage-cluster'
        };

        if (window.markerClusterer && typeof window.markerClusterer.MarkerClusterer === 'function') {
          try {
            let renderer = undefined;
            try {
              if (typeof window.markerClusterer.DefaultRenderer === 'function') {
                renderer = new window.markerClusterer.DefaultRenderer({ className: defaultClusterOptions.clusterClassName });
              }
            } catch (e) {
              console.debug('coverage-map: DefaultRenderer creation failed, using default renderer', e);
              renderer = undefined;
            }

            const modernOptions = {
              map,
              markers: createdMarkers,
              ...(renderer ? { renderer } : {}),
              ...(typeof defaultClusterOptions.maxZoom !== 'undefined' ? { maxZoom: defaultClusterOptions.maxZoom } : {})
            };

            const mc = new markerClusterer.MarkerClusterer(modernOptions);
            el.__markerClusterInstance = mc;
            console.debug('coverage-map: using modern markerClusterer.MarkerClusterer');
          } catch (err) {
            console.warn('coverage-map: modern MarkerClusterer init failed, will try legacy fallback', err);
          }
        }

        if (!el.__markerClusterInstance) {
          const classicMarkers = (typeof google !== 'undefined') ? createdMarkers.filter(m => m instanceof google.maps.Marker) : [];
          if (classicMarkers.length && window.MarkerClusterer && typeof window.MarkerClusterer === 'function') {
            try {
              const legacy = new window.MarkerClusterer(map, classicMarkers, {});
              el.__markerClusterInstance = legacy;
              console.debug('coverage-map: using legacy MarkerClusterer for classic markers');
            } catch (err) {
              console.warn('coverage-map: legacy MarkerClusterer init failed', err);
            }
          } else {
            console.debug('coverage-map: clustering skipped — no suitable MarkerClusterer or no classic markers to cluster');
          }
        }
      } catch (e) {
        console.warn('coverage-map: clustering error', e);
      }

      // Обработчик клавиатуры ESC
      // document.addEventListener('keydown', (e) => {
      //   if (e.key === 'Escape' && currentInfoWindow) {
      //     currentInfoWindow.close();
      //     currentInfoWindow = null;
      //   }
      //   if (e.key === 'Tab' && focusable.length) {
      //     const first = focusable[0];
      //     const last = focusable[focusable.length - 1];
      //     if (e.shiftKey && document.activeElement === first) {
      //       last.focus();
      //       e.preventDefault();
      //     } else if (!e.shiftKey && document.activeElement === last) {
      //       first.focus();
      //       e.preventDefault();
      //     }
      //   }
      // });

      // Обработчик клавиатуры ESC / Tab (теперь использует currentFocusables)
      // Переменные состояния должны быть объявлены ДО навешивания обработчика:
      let currentInfoWindow = null;
      let currentFocusables = [];
      let currentFocusReturnElement = null;

      // Чистая версия обработчика клавиатуры для ESC / Tab
      const __coverage_keydown = (e) => {
        try {
          // ESC — закрыть текущее InfoWindow и вернуть фокус инициатору
          if (e.key === 'Escape' && currentInfoWindow) {
            try { if (typeof currentInfoWindow.close === 'function') currentInfoWindow.close(); } catch (ignore) {}
            currentInfoWindow = null;
            try { if (currentFocusReturnElement && typeof currentFocusReturnElement.focus === 'function') currentFocusReturnElement.focus(); } catch (ignore) {}
            currentFocusables = [];
            currentFocusReturnElement = null;
            return;
          }

          // Tab — если открыто InfoWindow и в нём есть фокусируемые элементы, зациклить фокус
          if (e.key === 'Tab' && currentInfoWindow && currentFocusables && currentFocusables.length) {
            const first = currentFocusables[0];
            const last = currentFocusables[currentFocusables.length - 1];

            if (e.shiftKey) {
              // Shift+Tab: если фокус на первом — перейти на последний
              if (document.activeElement === first) {
                e.preventDefault();
                try { last.focus(); } catch (ignore) {}
              }
            } else {
              // Tab: если фокус на последнем — перейти на первый
              if (document.activeElement === last) {
                e.preventDefault();
                try { first.focus(); } catch (ignore) {}
              }
            }
          }
        } catch (err) {
          // Не должно ломать страницу — логируем в debug
          console.debug('coverage-map: key handler error', err);
        }
      };

      // Навешивание обработчика (вставить после объявления переменных)
      document.addEventListener('keydown', __coverage_keydown);

      // При необходимости удалить обработчик при cleanup:
      // document.removeEventListener('keydown', __coverage_keydown);

      // InfoWindow handling — now supports focusReturnElement: DOM element to focus when infowindow closes.
      function openInfoWindowForLocation({ map, marker, location, g = {}, InfoWindowCtor, focusReturnElement = null }) {
        try {
          // Ensure InfoWindowCtor is available
          if (!InfoWindowCtor) {
            InfoWindowCtor = (typeof google !== 'undefined' && google.maps && google.maps.InfoWindow) ? google.maps.InfoWindow : null;
          }
          if (!InfoWindowCtor) {
            console.warn('coverage-map: InfoWindow constructor not found');
            return null;
          }

          // Close any existing info window for this map
          try {
            if (typeof currentInfoWindow?.close === 'function') {
              currentInfoWindow.close();
            }
          } catch (e) { /* ignore close errors */ }
          currentInfoWindow = null;

          // store focus-return element for this opening
          currentFocusReturnElement = focusReturnElement;

          // Prepare basic info data
          const infoData = {
            backup_power: (location && location.backup_power) || '72h',
            street: (g && (g.street || g.Street)) || (location && location.title) || '',
            housenumber: (g && g.housenumber) || ''
          };

          // Try to use an inline template with id="infowindow-custom"
          const templateEl = document.getElementById('infowindow-custom');
          const template = templateEl ? templateEl.content.cloneNode(true) : null;

          // If no template — use a simple fallback info window
          if (!template) {
            const div = document.createElement('div');
            div.textContent = `${infoData.street} ${infoData.housenumber}`.trim();
            currentInfoWindow = new InfoWindowCtor({
              content: div,
              ariaLabel: `${infoData.street} ${infoData.housenumber}`.trim(),
              disableAutoPan: false
            });

            // Open (try modern open signature, fallback to legacy)
            try {
              currentInfoWindow.open({ anchor: marker, map, shouldFocus: true });
            } catch (err) {
              try { currentInfoWindow.open(map, marker); } catch (err2) { /* ignore */ }
            }

            // Return focus to the initiator after a short delay
            setTimeout(() => {
              try { if (currentFocusReturnElement && typeof currentFocusReturnElement.focus === 'function') currentFocusReturnElement.focus(); } catch (e) {}
            }, 200);

            return currentInfoWindow;
          }

          // Populate template fields (non-destructive)
          const mapFields = [
            { selector: '.infowindow-template__backup-time', value: infoData.backup_power },
            { selector: '.infowindow-template__street', value: infoData.street },
            { selector: '.infowindow-template__apartment', value: infoData.housenumber }
          ];
          mapFields.forEach(field => {
            try {
              const elField = template.querySelector(field.selector);
              if (elField && typeof field.value !== 'undefined') elField.textContent = field.value;
            } catch (e) { /* ignore per-field errors */ }
          });

          // Initialize phone masks if IMask available
          try {
            const phoneInputs = template.querySelectorAll('.phone-mask');
            if (phoneInputs.length && window.IMask) {
              phoneInputs.forEach(input => {
                try { IMask(input, { mask: '+{38} (\\000) 000 00 00', lazy: true }); } catch (e) {}
              });
            }
          } catch (e) { /* ignore mask errors */ }

          // Collect focusable elements inside template for Tab trapping
          try {
            currentFocusables = Array.from(template.querySelectorAll('input, button, a[href], select, textarea, [tabindex]:not([tabindex="-1"])'));
          } catch (e) {
            currentFocusables = [];
          }

          // Focus first focusable element shortly after opening
          if (currentFocusables.length) {
            setTimeout(() => {
              try { currentFocusables[0].focus(); } catch (e) {}
            }, 50);
          }

          // Create InfoWindow with template content and open it
          currentInfoWindow = new InfoWindowCtor({
            content: template,
            ariaLabel: `${infoData.street} ${infoData.housenumber}`.trim(),
            disableAutoPan: false
          });

          try {
            if (typeof currentInfoWindow.open === 'function') {
              currentInfoWindow.open({ anchor: marker, map, shouldFocus: true });
            } else {
              // legacy fallback
              currentInfoWindow.open(map, marker);
            }
          } catch (err) {
            // ignore open errors
          }

          // When infowindow closes, return focus and clear tracked focusables
          try {
            if (typeof currentInfoWindow.addListener === 'function') {
              currentInfoWindow.addListener('closeclick', () => {
                try {
                  if (currentFocusReturnElement && typeof currentFocusReturnElement.focus === 'function') {
                    currentFocusReturnElement.focus();
                  }
                } catch (e) {}
                currentInfoWindow = null;
                currentFocusables = [];
                currentFocusReturnElement = null;
              });
            }
          } catch (e) {
            // ignore listener attach errors
          }

          return currentInfoWindow;
        } catch (e) {
          console.warn('coverage-map: failed to open info window', e);
          return null;
        }
      }

      // expose instance for debug and provide cleanup helper (remove keydown handler, clear cluster, close infowindow)
      el.__coverageMap_instance = {
        map,
        markers: createdMarkers,
        descriptors,
        cleanup: () => {
          try {
            // remove markerclusterer if present
            if (el.__markerClusterInstance) {
              try {
                if (typeof el.__markerClusterInstance.clearMarkers === 'function') el.__markerClusterInstance.clearMarkers();
                if (typeof el.__markerClusterInstance.dispose === 'function') el.__markerClusterInstance.dispose();
                else if (typeof el.__markerClusterInstance.destroy === 'function') el.__markerClusterInstance.destroy();
                else if (typeof el.__markerClusterInstance.release === 'function') el.__markerClusterInstance.release();
              } catch (e) { console.debug('coverage-map: cluster cleanup error', e); }
              delete el.__markerClusterInstance;
            }
            // remove keydown listener
            if (typeof __coverage_keydown === 'function') {
              try { document.removeEventListener('keydown', __coverage_keydown); } catch (e) {}
            }
            // close info window if open
            try { if (currentInfoWindow && typeof currentInfoWindow.close === 'function') currentInfoWindow.close(); } catch (e) {}
          } catch (err) { console.debug('coverage-map: cleanup error', err); }
        }
      };

      return { map, markers: createdMarkers, descriptors };
    }

    // expose bootstrapMap globally
    window.bootstrapMap = bootstrapMap;

    // Lazy init hook for '#map'
    function initLazyForMap(selector = '#map') {
      const el = document.querySelector(selector);
      if (!el) return;
      const trigger = (el.dataset.trigger || el.getAttribute('data-trigger') || 'viewport').toLowerCase();
      if (trigger === 'manual') return;

      const start = () => {
        if (el.__coverageMap_loading || el.__coverageMap_loaded) return;
        el.__coverageMap_loading = true;
        bootstrapMap(el).then(() => { el.__coverageMap_loaded = true; }).catch(err => { console.error('coverage-map: bootstrap failed', err); }).finally(() => { delete el.__coverageMap_loading; });
      };

      if (!('IntersectionObserver' in window) || trigger === 'immediate') { start(); return; }

      const io = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => { if (entry.isIntersecting) { obs.unobserve(entry.target); start(); } });
      }, { root: null, rootMargin: '500px', threshold: 0.01 });

      io.observe(el);
    }

    // Auto init
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => { initLazyForMap('#map'); });
    } else {
      initLazyForMap('#map');
    }

    // expose helpers for debugging
    window.__lazyMaps_helpers = { readMarkersFromContainer, normalizeCoverage, loadGoogleMaps, loadMarkerClusterer };

})();
