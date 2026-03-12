'use strict';

(function () {
  var WEBGI_VIEWER_URL = "https://dist.pixotronics.com/webgi/runtime/viewer-0.9.2.js";
  //var ENV_MAP_URL = 'https://dist.pixotronics.com/webgi/assets/hdr/gem_2.hdr';
  var ENV_MAP_URL = "https://cdn.shopify.com/s/files/1/0969/2990/7075/files/Studio_SCENE_V3_copy.hdr?v=1773249444";

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

    var loader = document.createElement("div");
    loader.className = "webgi-loader";
    loader.innerHTML =
      '<img class="webgi-spinner" src="https://cdn.shopify.com/s/files/1/0969/2990/7075/files/RC_LOGO_MARK_SIZE_A.svg?v=1772794159" alt="">';
    container.innerHTML = "";
    container.appendChild(loader);

    var canvas = document.createElement("canvas");
    canvas.style.touchAction = "pan-y";
    container.appendChild(canvas);

    function startViewer() {
      var rect = canvas.getBoundingClientRect();
      var w = Math.round(rect.width) || 600;
      var h = Math.round(rect.height) || 600;
      canvas.width = w * window.devicePixelRatio;
      canvas.height = h * window.devicePixelRatio;

      loadWebGIScript(function () {
        setupViewer(canvas, glbUrl, container);
      });
    }

    requestAnimationFrame(function () {
      requestAnimationFrame(startViewer);
    });
  }

  async function setupViewer(canvas, glbUrl, container) {
    try {
      var isMobile = navigator.maxTouchPoints > 0 || window.innerWidth <= 1024;
      var dpr = Math.min(window.devicePixelRatio, 1.5);

      var viewer = new ViewerApp({
        canvas: canvas,
        useRgbm: true,
        useGBufferDepth: false,
        isAntialiased: false,
      });

      var manager = await viewer.addPlugin(AssetManagerPlugin);
      await addBasePlugins(viewer);

      viewer.renderer.displayCanvasScaling = dpr;
      if (viewer.renderer.renderer) {
        viewer.renderer.renderer.setClearAlpha(0);
        viewer.renderer.renderer.setClearColor(0x000000, 0);
      }
      viewer.renderer.refreshPipeline();

      var ssr = viewer.getPlugin(SSRPlugin);
      if (ssr) ssr.enabled = false;
      var ssao = viewer.getPlugin(SSAOPlugin);
      if (ssao) ssao.enabled = false;

      var ground = viewer.getPlugin(GroundPlugin);
      if (ground) ground.enabled = false;

      var envMap = await manager.importer.importSinglePath(ENV_MAP_URL);
      viewer.scene.setEnvironment(envMap);

      var options = {
        autoCenter: true,
        autoScale: true,
        autoScaleRadius: 2,
      };

      await manager.addFromPath(glbUrl, options);

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
        controls.dampingFactor = 0.25;
        controls.zoomSpeed = 1.0;
        controls.maxSpeed = 1.0;
        controls.minDistance = defaultDist * 0.7; //max zoom in
        controls.maxDistance = defaultDist * 1.5; // max zoom out
        controls.update();
      }

      viewer.renderer.refreshPipeline();
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          var ldr = container.querySelector(".webgi-loader");
          if (ldr) ldr.classList.add("webgi-loader--done");
        });
      });

      var resizeTimer = null;
      var lastResizeW = 0;
      var lastResizeH = 0;
      var resizeObserver = new ResizeObserver(function () {
        if (resizeTimer) return;
        resizeTimer = requestAnimationFrame(function () {
          resizeTimer = null;
          var rect = canvas.getBoundingClientRect();
          var w = Math.round(rect.width);
          var h = Math.round(rect.height);
          if (w > 0 && h > 0 && (w !== lastResizeW || h !== lastResizeH)) {
            lastResizeW = w;
            lastResizeH = h;
            canvas.width = w * dpr;
            canvas.height = h * dpr;
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
