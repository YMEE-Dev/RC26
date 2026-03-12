'use strict';

(function () {
  var WEBGI_VIEWER_URL = 'https://dist.pixotronics.com/webgi/runtime/viewer-0.9.2.js';
  // var ENV_MAP_URL = 'https://dist.pixotronics.com/webgi/assets/hdr/gem_2.hdr';
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

    var script = document.createElement('script');
    script.src = WEBGI_VIEWER_URL;
    script.async = true;
    script.onload = function () {
      scriptLoaded = true;
      scriptLoading = false;
      var cbs = pendingCallbacks.slice();
      pendingCallbacks = [];
      cbs.forEach(function (cb) { cb(); });
    };
    script.onerror = function () {
      scriptLoading = false;
      console.error('[WebGI] Failed to load viewer script');
    };
    document.head.appendChild(script);
  }

  function initWebGIViewer(container) {
    if (container.dataset.webgiInitialized === 'true') return;
    container.dataset.webgiInitialized = 'true';

    var glbUrl = container.dataset.webgiSrc;
    if (!glbUrl) return;
    if (glbUrl.indexOf('//') === 0) {
      glbUrl = 'https:' + glbUrl;
    } else if (glbUrl.indexOf('/') === 0) {
      glbUrl = window.location.origin + glbUrl;
    }

    var loader = document.createElement('div');
    loader.className = 'webgi-loader';
    loader.innerHTML = '<img class="webgi-spinner" src="https://cdn.shopify.com/s/files/1/0969/2990/7075/files/RC_LOGO_MARK_SIZE_A.svg?v=1772794159" alt="">';
    container.innerHTML = '';
    container.appendChild(loader);

    var canvas = document.createElement('canvas');
    canvas.style.touchAction = 'pan-y';
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
      var viewer = new ViewerApp({
        canvas: canvas,
        useRgbm: true,
        useGBufferDepth: true,
        isAntialiased: true
      });

      var manager = await viewer.addPlugin(AssetManagerPlugin);
      await addBasePlugins(viewer);

      var isMobile = navigator.maxTouchPoints > 0 || window.innerWidth <= 768;

      viewer.renderer.displayCanvasScaling = isMobile ? 1 : Math.min(window.devicePixelRatio, 2);
      viewer.renderer.refreshPipeline();

      var tonemap = viewer.getPlugin(TonemapPlugin);
      if (tonemap) {
        tonemap.contrast = 1.1;
        tonemap.saturation = 1.15;
        if (typeof tonemap.exposure !== "undefined") tonemap.exposure = 1.1;
      }

      var ssr = viewer.getPlugin(SSRPlugin);
      if (ssr) {
        if (isMobile) {
          ssr.enabled = false;
        } else {
          ssr.enabled = true;
          if (typeof ssr.intensity !== "undefined") ssr.intensity = 0.6;
          if (typeof ssr.stepSize !== "undefined") ssr.stepSize = 0.02;
        }
      }

      var ssao = viewer.getPlugin(SSAOPlugin);
      if (ssao) {
        if (isMobile) {
          ssao.enabled = false;
        } else {
          ssao.enabled = true;
          if (typeof ssao.intensity !== "undefined") ssao.intensity = 0.4;
          if (typeof ssao.radius !== "undefined") ssao.radius = 0.1;
          if (typeof ssao.bias !== "undefined") ssao.bias = 0.025;
        }
      }

      var ground = viewer.getPlugin(GroundPlugin);
      if (ground) {
        ground.enabled = true;
        ground.shadowBaker.attachedMesh.material.transparent = true;
        ground.shadowBaker.shadowIntensity = 0.6;
        ground.shadowBaker.shadowMapSize = 4096;
        ground.shadowBaker.autoUpdate = false;
      }

      var options = {
        autoCenter: true,
        autoScale: true,
        autoScaleRadius: 2
      };

      await manager.addFromPath(glbUrl, options);

      var envMap = await manager.importer.importSinglePath(ENV_MAP_URL);
      viewer.scene.setEnvironment(envMap);

      var bloom = viewer.getPlugin(BloomPlugin);
      if (bloom) bloom.enabled = false;

      if (ground) {
        ground.material.aoMapIntensity = 0.3;
        if (ground.shadowBaker && typeof ground.shadowBaker.bake === "function") {
          await ground.shadowBaker.bake();
        } else if (ground.shadowBaker && typeof ground.shadowBaker.needsUpdate !== "undefined") {
          ground.shadowBaker.needsUpdate = true;
        }
      }

      var camera = viewer.scene.activeCamera;
      if (camera && typeof camera.positionTargetUpdated === "function") {
        camera.positionTargetUpdated(true);
      }
      var controls = camera ? camera.controls : null;
      if (controls) {
        controls.autoRotate = true;
        controls.autoRotateSpeed = 3;
        controls.dampingFactor = 0.25;
        controls.zoomSpeed = 1.0;
        if (typeof controls.getDistance === "function") {
          var dist = controls.getDistance();
          controls.minDistance = dist * 0.7;
          controls.maxDistance = dist * 2;
          if (typeof controls.dollyTo === "function") {
            controls.dollyTo(dist * 0.8, true);
          } else if (typeof controls.zoom === "number") {
            controls.zoom = controls.zoom * 1.2;
          }
        }
        controls.update();
      }

      viewer.renderer.refreshPipeline();
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          var ldr = container.querySelector(".webgi-loader");
          if (ldr) ldr.classList.add("webgi-loader--done");
        });
      });

      var resizeObserver = new ResizeObserver(function () {
        var rect = canvas.getBoundingClientRect();
        var w = Math.round(rect.width);
        var h = Math.round(rect.height);
        var dpr = isMobile ? 1 : Math.min(window.devicePixelRatio, 2);
        if (w > 0 && h > 0) {
          canvas.width = w * dpr;
          canvas.height = h * dpr;
          viewer.renderer.refreshPipeline();
          if (viewer.scene.activeCamera) viewer.scene.activeCamera.setDirty();
        }
      });
      resizeObserver.observe(container);

    } catch (err) {
      console.error('[WebGI] Error:', err);
    }
  }

  window.__webgiInitViewer = initWebGIViewer;
})();
