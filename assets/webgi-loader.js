'use strict';

(function () {
  var WEBGI_VIEWER_URLS = {
    v9: "https://dist.pixotronics.com/webgi/runtime/viewer-0.9.9.js",
    v19: "https://releases.ijewel3d.com/webgi/runtime/viewer-0.9.19.js",
  };
  var _loaderScript = document.currentScript || document.querySelector("script[data-webgi-version]");
  var _webgiVersion = (_loaderScript && _loaderScript.dataset.webgiVersion) || "v9";
  var WEBGI_VIEWER_URL = WEBGI_VIEWER_URLS[_webgiVersion] || WEBGI_VIEWER_URLS["v9"];
  var ENV_MAP_URL = "https://demo-assets.pixotronics.com/pixo/hdr/gem_2.hdr";
  var ENV_MAP_URL_STUDIO =
    "https://cdn.shopify.com/s/files/1/0969/2990/7075/files/Studio_SCENE_V3_copy.hdr?v=1773249444";

  var scriptLoaded = false;
  var scriptLoading = false;
  var pendingCallbacks = [];

  function loadWebGIScript(callback) {
    if (scriptLoaded) {
      callback();
      return;
    }
    pendingCallbacks.push(callback);
    if (scriptLoading) return;
    scriptLoading = true;

    var script = document.createElement("script");
    script.src = WEBGI_VIEWER_URL;
    script.async = true;
    script.onload = function () {
      scriptLoaded = true;
      scriptLoading = false;
      var cbs = pendingCallbacks.slice();
      pendingCallbacks = [];
      cbs.forEach(function (cb) {
        cb();
      });
    };
    script.onerror = function () {
      scriptLoading = false;
      console.error("[WebGI] Failed to load viewer script");
    };
    document.head.appendChild(script);
  }

  function initWebGIViewer(container) {
    if (container.dataset.webgiInitialized === "true") return;
    container.dataset.webgiInitialized = "true";

    var glbUrl = container.dataset.webgiSrc;
    if (!glbUrl) return;
    if (glbUrl.indexOf("//") === 0) {
      glbUrl = "https:" + glbUrl;
    } else if (glbUrl.indexOf("/") === 0) {
      glbUrl = window.location.origin + glbUrl;
    }

    container.innerHTML = "";

    // Loader overlay
    var loader = document.createElement("div");
    loader.className = "webgi-loader";
    loader.innerHTML =
      '<img class="webgi-spinner" src="https://cdn.shopify.com/s/files/1/0969/2990/7075/files/RC_LOGO_MARK_SIZE_A.svg?v=1772794159" alt="">';
    container.appendChild(loader);

    // Inner div for CoreViewerApp (it creates its own canvas inside)
    var viewerDiv = document.createElement("div");
    viewerDiv.style.cssText = "width:100%;height:100%;position:absolute;top:0;left:0;";
    container.appendChild(viewerDiv);

    function startViewer() {
      loadWebGIScript(function () {
        setupViewer(viewerDiv, glbUrl, container, loader);
      });
    }

    requestAnimationFrame(function () {
      requestAnimationFrame(startViewer);
    });
  }

  async function setupViewer(viewerDiv, glbUrl, container, loader) {
    try {
      var isMobile = navigator.maxTouchPoints > 0 || window.innerWidth <= 1024;
      var dpr = isMobile ? Math.min(window.devicePixelRatio, 0.75) : Math.min(window.devicePixelRatio, 1.75);

      var viewer, manager;
      if (typeof CoreViewerApp !== "undefined") {
        // Use CoreViewerApp + initialize() per official iJewel3D Shopify integration docs
        viewer = new CoreViewerApp({ container: viewerDiv });
        await viewer.initialize({
          caching: true,
          ground: !isMobile,
          bloom: false,
          enableDrop: false,
          importPopup: false,
          depthTonemap: !isMobile,
          debug: false,
        });
        manager = viewer.getManager ? viewer.getManager() : null;
      } else {
        // Fallback: ViewerApp + addBasePlugins
        var canvas0 = document.createElement("canvas");
        canvas0.style.cssText = "width:100%;height:100%;display:block;touch-action:pan-y;";
        viewerDiv.appendChild(canvas0);
        var rect0 = viewerDiv.getBoundingClientRect();
        canvas0.width = (Math.round(rect0.width) || 600) * dpr;
        canvas0.height = (Math.round(rect0.height) || 600) * dpr;
        viewer = new ViewerApp({ canvas: canvas0, useRgbm: true, useGBufferDepth: false, isAntialiased: false });
        manager = await viewer.addPlugin(AssetManagerPlugin);
        await addBasePlugins(viewer);
      }

      // Get canvas (CoreViewerApp manages its own; fallback already appended canvas0)
      var canvas = viewer.canvas || viewerDiv.querySelector("canvas");
      if (canvas) canvas.style.touchAction = "pan-y";
      var diamondPlugin = viewer.getPlugin(DiamondPlugin) || null;

      viewer.renderer.displayCanvasScaling = dpr;
      // Opaque background required for diamond/gem refraction to render correctly
      if (viewer.renderer.renderer) {
        viewer.renderer.renderer.setClearColor(0xf9f9f9, 1);
      }
      viewer.renderer.refreshPipeline();

      // Disable SDK UI plugins — we use our own loader overlay
      try {
        var loadingBar = viewer.getPluginByType("AssetManagerLoadingBarPlugin");
        if (loadingBar) loadingBar.enabled = false;
        var loadingScreen = viewer.getPluginByType("LoadingScreenPlugin");
        if (loadingScreen) loadingScreen.enabled = false;
        var popup = viewer.getPluginByType("AssetManagerBasicPopupPlugin");
        if (popup) popup.enabled = false;
      } catch (e) {}

      // Mobile: disable expensive plugins
      if (isMobile) {
        var ssrM = viewer.getPlugin(SSRPlugin);
        if (ssrM) ssrM.enabled = false;
        var ssaoM = viewer.getPlugin(SSAOPlugin);
        if (ssaoM) ssaoM.enabled = false;
      } else {
        var ground = viewer.getPlugin(GroundPlugin);
        if (ground && ground.shadowBaker && ground.shadowBaker.attachedMesh) {
          ground.shadowBaker.attachedMesh.material.transparent = true;
        }
      }

      // Load HDR environment map
      var envMap = null;
      try {
        var importer = manager && manager.importer ? manager.importer : viewer.getManager().importer;
        envMap = await importer.importSinglePath(ENV_MAP_URL);
        viewer.scene.setEnvironment(envMap);
      } catch (e) {
        console.warn("[WebGI] HDR load error:", e);
      }

      // Register file with decryption key (models are encrypted with iJewel3D encryption)
      try {
        var importer2 = manager && manager.importer ? manager.importer : viewer.getManager().importer;
        var registered = importer2.registerFile(glbUrl);
        if (registered && registered.preparsers && registered.preparsers[0]) {
          registered.preparsers[0].key = function () {
            return "w9pcNNE7LBeEGCN";
          };
        }
      } catch (e) {
        console.warn("[WebGI] Could not register file preparsers:", e);
      }

      // Load model
      if (typeof viewer.load === "function") {
        await viewer.load(glbUrl);
      } else {
        await manager.addFromPath(glbUrl, { autoCenter: true, autoScale: true, autoScaleRadius: 2 });
      }

      // Set gem_2.hdr on DiamondPlugin + boost normalMapRes for better cut simulation
      if (diamondPlugin) {
        diamondPlugin.envMap = envMap;
        try {
          viewer.scene.traverse(function (obj) {
            if (obj.material && typeof obj.material.refractionIndex !== "undefined") {
              if (typeof obj.material.normalMapRes !== "undefined") {
                // 256 on mobile for speed, 1024 on desktop for detail
                obj.material.normalMapRes = isMobile ? 256 : 1024;
              }
              obj.material.setDirty && obj.material.setDirty();
            }
          });
        } catch (e) {}
      }

      // Tonemapping: moderate contrast + exposure boost for sparkle without washing out
      try {
        var tonemap = viewer.getPlugin(TonemapPlugin);
        if (tonemap) {
          if (typeof tonemap.contrast !== "undefined") tonemap.contrast = 1.1;
          if (typeof tonemap.saturation !== "undefined") tonemap.saturation = 1.05;
          if (typeof tonemap.exposure !== "undefined") tonemap.exposure = 1.05;
        }
      } catch (e) {}

      // GemRefractionPlugin: handles screen-space transmission through gems
      // (separate from DiamondPlugin's ray-traced internal simulation)
      try {
        if (typeof GemRefractionPlugin !== "undefined") {
          var gemRefraction = viewer.getPlugin(GemRefractionPlugin);
          if (!gemRefraction) gemRefraction = await viewer.addPlugin(GemRefractionPlugin);
        }
      } catch (e) {}

      var bloom = viewer.getPlugin(BloomPlugin);
      if (bloom) bloom.enabled = false;

      var controls = viewer.scene.activeCamera ? viewer.scene.activeCamera.controls : null;
      if (controls) {
        var camOptions = viewer.scene.activeCamera.getCameraOptions
          ? viewer.scene.activeCamera.getCameraOptions()
          : null;
        if (camOptions) {
          camOptions.zoom = 1;
          viewer.scene.activeCamera.setCameraOptions(camOptions);
        }

        // Compute current camera-to-target distance to set zoom limits relative to default view
        var defaultDist = 4; // fallback if position/target unavailable
        try {
          var camObj = viewer.scene.activeCamera.cameraObject;
          var tgt = controls.target;
          if (camObj && tgt) {
            var dx = camObj.position.x - tgt.x;
            var dy = camObj.position.y - tgt.y;
            var dz = camObj.position.z - tgt.z;
            var measured = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (measured > 0.1) defaultDist = measured;
          }
        } catch (e) {}

        // On mobile: fit model to viewport width by computing ideal distance from FOV
        if (isMobile) {
          try {
            var camObj2 = viewer.scene.activeCamera.cameraObject;
            var containerWidth = container.clientWidth || window.innerWidth;
            var containerHeight = container.clientHeight || containerWidth;
            var aspect = containerWidth / containerHeight;
            var fovRad = ((camObj2 && camObj2.fov ? camObj2.fov : 50) * Math.PI) / 180;
            var modelRadius = 2; // autoScaleRadius: 2
            // Distance needed so model fills width: radius / (tan(fov/2) * aspect)
            var fitDist = modelRadius / (Math.tan(fovRad / 2) * Math.min(aspect, 1));
            fitDist = fitDist * 1.1; // 10% padding
            if (fitDist > 0.1) defaultDist = fitDist;
            // Move camera to this distance along its current direction
            if (camObj2 && controls.target) {
              var tgt2 = controls.target;
              var cdx = camObj2.position.x - tgt2.x;
              var cdy = camObj2.position.y - tgt2.y;
              var cdz = camObj2.position.z - tgt2.z;
              var curLen = Math.sqrt(cdx * cdx + cdy * cdy + cdz * cdz);
              if (curLen > 0.001) {
                camObj2.position.x = tgt2.x + (cdx / curLen) * fitDist;
                camObj2.position.y = tgt2.y + (cdy / curLen) * fitDist;
                camObj2.position.z = tgt2.z + (cdz / curLen) * fitDist;
              }
            }
          } catch (e) {}
        }

        controls.autoRotate = true;
        controls.autoRotateSpeed = 2;
        controls.dampingFactor = isMobile ? 0.05 : 0.1;
        controls.zoomSpeed = isMobile ? 0.4 : 1.0;
        controls.maxSpeed = 1.0;
        controls.minDistance = defaultDist * 0.4; // max zoom in
        controls.maxDistance = defaultDist * 1.5; // max zoom out
        controls.update();

        // Resume auto-rotation 3s after user stops interacting
        // Disable SSR during drag for smooth performance, re-enable after
        var ssrPlugin = viewer.getPlugin(SSRPlugin) || null;
        var autoRotateTimer = null;
        canvas.addEventListener("pointerdown", function () {
          controls.autoRotate = false;
          if (autoRotateTimer) {
            clearTimeout(autoRotateTimer);
            autoRotateTimer = null;
          }
          if (ssrPlugin) ssrPlugin.enabled = false;
        });
        canvas.addEventListener("pointerup", function () {
          if (ssrPlugin) ssrPlugin.enabled = true;
          if (autoRotateTimer) clearTimeout(autoRotateTimer);
          autoRotateTimer = setTimeout(function () {
            controls.autoRotate = true;
          }, 3000);
        });
        canvas.addEventListener("pointercancel", function () {
          if (ssrPlugin) ssrPlugin.enabled = true;
          if (autoRotateTimer) clearTimeout(autoRotateTimer);
          autoRotateTimer = setTimeout(function () {
            controls.autoRotate = true;
          }, 3000);
        });
      }

      viewer.renderer.refreshPipeline();
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          if (loader) loader.classList.add("webgi-loader--done");
        });
      });

      // MutationObserver: remove SDK evaluation logo/watermark injected into container
      var _sdkObserver = new MutationObserver(function (mutations) {
        mutations.forEach(function (m) {
          m.addedNodes.forEach(function (node) {
            if (!node.tagName) return;
            var tag = node.tagName.toLowerCase();
            var cls = (node.className || "").toString();
            var src = node.src || (node.getAttribute && node.getAttribute("src")) || "";
            var isLogo = tag === "img" && (src.indexOf("ijewel") !== -1 || src.indexOf("pixotronics") !== -1);
            var isSDKOverlay =
              tag === "div" &&
              (cls.indexOf("ijewel") !== -1 ||
                cls.indexOf("webgi-evaluation") !== -1 ||
                cls.indexOf("watermark") !== -1 ||
                (node.style &&
                  node.style.zIndex >= 9999 &&
                  node.children.length === 1 &&
                  node.children[0].tagName === "IMG"));
            if (isLogo || isSDKOverlay) node.remove();
          });
        });
      });
      _sdkObserver.observe(container, { childList: true, subtree: true });
      _sdkObserver.observe(viewerDiv, { childList: true, subtree: true });

      // Add edge zones on top of viewer canvas for gallery swipe support
      var edgeStyle = "position:absolute;top:0;bottom:0;width:20%;z-index:10;pointer-events:all;";
      var edgeLeft = document.createElement("div");
      edgeLeft.className = "webgi-edge-zone webgi-edge-zone--left";
      edgeLeft.style.cssText = edgeStyle + "left:0;";
      var edgeRight = document.createElement("div");
      edgeRight.className = "webgi-edge-zone webgi-edge-zone--right";
      edgeRight.style.cssText = edgeStyle + "right:0;";
      container.appendChild(edgeLeft);
      container.appendChild(edgeRight);

      [edgeLeft, edgeRight].forEach(function (zone) {
        var startX = 0,
          startY = 0,
          tracking = false;
        zone.addEventListener("pointerdown", function (e) {
          startX = e.clientX;
          startY = e.clientY;
          tracking = true;
          zone.setPointerCapture(e.pointerId);
        });
        zone.addEventListener("pointerup", function (e) {
          if (!tracking) return;
          tracking = false;
          var dx = e.clientX - startX;
          var dy = e.clientY - startY;
          if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
            container.dispatchEvent(
              new CustomEvent("webgi:edge:swipe", {
                bubbles: true,
                detail: { direction: dx < 0 ? "next" : "prev" },
              })
            );
          }
        });
        zone.addEventListener("pointercancel", function () {
          tracking = false;
        });
      });

      var resizeTimer = null;
      var lastResizeW = 0;
      var lastResizeH = 0;
      var resizeObserver = new ResizeObserver(function () {
        if (resizeTimer) return;
        resizeTimer = requestAnimationFrame(function () {
          resizeTimer = null;
          var w = Math.round(container.clientWidth);
          var h = Math.round(container.clientHeight);
          if (w > 0 && h > 0 && (w !== lastResizeW || h !== lastResizeH)) {
            lastResizeW = w;
            lastResizeH = h;
            viewer.renderer.refreshPipeline();
            if (viewer.scene.activeCamera) viewer.scene.activeCamera.setDirty();
          }
        });
      });
      resizeObserver.observe(container);
    } catch (err) {
      console.error("[WebGI] Error:", err);
    }
  }

  window.__webgiInitViewer = initWebGIViewer;
})();
