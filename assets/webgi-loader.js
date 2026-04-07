"use strict";

(function () {
  var WEBGI_VIEWER_URL = "https://releases.ijewel3d.com/webgi/runtime/viewer-0.9.19.js";
  var ENV_MAP_URL = "https://demo-assets.pixotronics.com/pixo/hdr/gem_2.hdr";

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
      var dpr = isMobile ? Math.min(window.devicePixelRatio, 1.75) : Math.min(window.devicePixelRatio, 1.75);

      var viewer, manager;
      if (typeof CoreViewerApp !== "undefined") {
        // Use CoreViewerApp + initialize() per official iJewel3D Shopify integration docs
        viewer = new CoreViewerApp({ container: viewerDiv });
        await viewer.initialize({
          caching: true,
          // Use the SDK ground plugin for the shadow, but tune it below to avoid the visible floor quad.
          ground: !isMobile,
          bloom: false,
          enableDrop: false,
          importPopup: false,
          depthTonemap: !isMobile,
          debug: false,
        });
        manager = viewer.getManager ? viewer.getManager() : null;
        // SceneLoopPlugin drives the continuous render loop (needed for autoRotate, enableDamping)
        try {
          if (typeof SceneLoopPlugin !== "undefined" && !viewer.getPlugin(SceneLoopPlugin)) {
            await viewer.addPlugin(SceneLoopPlugin);
          }
        } catch (e) {
          console.warn("[WebGI] Could not add SceneLoopPlugin:", e);
        }
        // MaterialConfiguratorPlugin is not added by CoreViewerApp.initialize() by default
        try {
          if (typeof MaterialConfiguratorPlugin !== "undefined" && !viewer.getPlugin(MaterialConfiguratorPlugin)) {
            await viewer.addPlugin(MaterialConfiguratorPlugin);
          }
        } catch (e) {
          console.warn("[WebGI] Could not add MaterialConfiguratorPlugin:", e);
        }
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
      if (canvas) canvas.style.touchAction = isMobile ? "none" : "pan-y";
      var diamondPlugin = viewer.getPlugin(DiamondPlugin) || null;

      // Match slide background color (#f9f9f9)
      // Desktop canvas renders ~#fff (needs dimming), mobile renders ~#e7e7e7 (needs brightening).
      container.style.backgroundColor = "#f9f9f9";
      viewerDiv.style.backgroundColor = "#f9f9f9";
      if (canvas) canvas.style.filter = isMobile ? "brightness(1.078)" : "brightness(0.9765)";

      viewer.renderer.displayCanvasScaling = dpr;
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

      function configureGroundPlugin(groundPlugin) {
        if (!groundPlugin) return;
        try {
          // SDK-first configuration: keep the ground plugin active for shadows,
          // but make it render as an alpha-only shadow catcher instead of a visible floor.
          groundPlugin.visible = true;
          groundPlugin.bakedShadows = true;
          groundPlugin.groundReflection = false;
          groundPlugin.physicalReflections = false;
          groundPlugin.tonemapGround = false;
          groundPlugin.renderToDepth = false;
          groundPlugin.limitCameraAboveGround = false;
          if (typeof groundPlugin.autoBakeShadows !== "undefined") groundPlugin.autoBakeShadows = true;
          if (typeof groundPlugin.size !== "undefined") groundPlugin.size = 6;
          if (typeof groundPlugin.yOffset !== "undefined") groundPlugin.yOffset = -0.002;

          if (groundPlugin.shadowBaker) {
            groundPlugin.shadowBaker.enabled = true;
            groundPlugin.shadowBaker.shadowAutoUpdate = true;
            groundPlugin.shadowBaker.smoothShadow = true;
            groundPlugin.shadowBaker.alphaVignette = true;
            groundPlugin.shadowBaker.alphaVignetteAxis = "xy";
            groundPlugin.shadowBaker.groundMapMode = "alphaMap";
          }

          if (typeof groundPlugin.refreshOptions === "function") {
            groundPlugin.refreshOptions();
          }

          var groundMesh = groundPlugin.shadowBaker && groundPlugin.shadowBaker.attachedMesh;
          var groundMaterial = groundMesh && groundMesh.material;
          if (groundMesh) {
            groundMesh.visible = true;
          }
          if (groundMaterial) {
            groundShadowMaterial = groundMaterial;
            // alphaMap mode: the baked shadow texture controls per-pixel alpha.
            // The material must be transparent with full opacity so the alphaMap drives visibility.
            // colorWrite MUST be true otherwise nothing renders at all.
            groundMaterial.transparent = true;
            groundMaterial.opacity = 1;
            if (typeof groundMaterial.depthWrite !== "undefined") groundMaterial.depthWrite = false;
            if (typeof groundMaterial.colorWrite !== "undefined") groundMaterial.colorWrite = true;
            if (groundMaterial.color && typeof groundMaterial.color.set === "function") {
              groundMaterial.color.set("#000000");
            }
            if (typeof groundMaterial.toneMapped !== "undefined") groundMaterial.toneMapped = false;
            if (typeof groundMaterial.envMapIntensity !== "undefined") groundMaterial.envMapIntensity = 0;
            if (typeof groundMaterial.setDirty === "function") groundMaterial.setDirty();
            groundMaterial.needsUpdate = true;
          }
        } catch (e) {
          console.warn("[WebGI] Could not configure GroundPlugin:", e);
        }
      }

      var ground = viewer.getPlugin(GroundPlugin) || null;
      var groundShadowMaterial = null;

      // Mobile: disable expensive plugins
      if (isMobile) {
        var ssrM = viewer.getPlugin(SSRPlugin);
        if (ssrM) ssrM.enabled = false;
        var ssaoM = viewer.getPlugin(SSAOPlugin);
        if (ssaoM) ssaoM.enabled = false;
      }

      configureGroundPlugin(ground);

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

      var matConfigPlugin = null;
      try {
        matConfigPlugin =
          (typeof MaterialConfiguratorPlugin !== "undefined" && viewer.getPlugin(MaterialConfiguratorPlugin)) ||
          viewer.getPlugin("MaterialConfiguratorPlugin") ||
          (viewer.getPluginByType && viewer.getPluginByType("MaterialConfiguratorPlugin")) ||
          null;
      } catch (e) {}
      if (matConfigPlugin && matConfigPlugin.variations) {
      }

      function getEntitySearchText(entity) {
        return [
          entity && entity.name,
          entity && entity.title,
          entity && entity.label,
          entity && entity.type,
          entity && entity.uuid,
          entity && entity.id,
          entity && entity.userData && entity.userData.name,
          entity && entity.userData && entity.userData.title,
          entity && entity.userData && entity.userData.uuid,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
      }

      function isGroundShadowMaterial(material) {
        if (!material) return false;
        var userData = material.userData || {};
        var label = getEntitySearchText(material);
        return !!(
          userData.gMapMode ||
          userData.groundMatExtension ||
          typeof userData.renderToDepth !== "undefined" ||
          typeof userData.__renderToDepth !== "undefined" ||
          label.indexOf("ground") !== -1 ||
          label.indexOf("shadow") !== -1
        );
      }

      function resetGroundShadowMaterial() {
        if (!groundShadowMaterial) return;
        try {
          if (groundShadowMaterial.color && typeof groundShadowMaterial.color.set === "function") {
            groundShadowMaterial.color.set("#000000");
          }
          groundShadowMaterial.transparent = true;
          groundShadowMaterial.opacity = 1;
          if (typeof groundShadowMaterial.colorWrite !== "undefined") groundShadowMaterial.colorWrite = true;
          if (typeof groundShadowMaterial.depthWrite !== "undefined") groundShadowMaterial.depthWrite = false;
          if (typeof groundShadowMaterial.toneMapped !== "undefined") groundShadowMaterial.toneMapped = false;
          if (typeof groundShadowMaterial.envMapIntensity !== "undefined") groundShadowMaterial.envMapIntensity = 0;
          if (typeof groundShadowMaterial.setDirty === "function") groundShadowMaterial.setDirty();
          groundShadowMaterial.needsUpdate = true;
        } catch (e) {
          console.warn("[WebGI] Could not reset ground shadow material:", e);
        }
      }

      function normalizeMetalKey(value) {
        var key = (value || "").trim().toLowerCase();
        if (key.indexOf("rose") !== -1) return "rose";
        if (key.indexOf("white") !== -1 || key.indexOf("platinum") !== -1 || key.indexOf("silver") !== -1)
          return "white";
        if (key.indexOf("yellow") !== -1 || key.indexOf("gold") !== -1) return "yellow";
        return "";
      }

      function materialMatchesMetalKey(material, metalKey) {
        var label = getEntitySearchText(material);
        if (!label) return false;
        if (metalKey === "rose") return label.indexOf("rose") !== -1;
        if (metalKey === "white") {
          return label.indexOf("white") !== -1 || label.indexOf("platinum") !== -1 || label.indexOf("silver") !== -1;
        }
        if (metalKey === "yellow") {
          return label.indexOf("yellow") !== -1 || label.indexOf("gold") !== -1;
        }
        return false;
      }

      function isTintableMetalMaterial(material) {
        if (!material || !material.color || !material.color.isColor) return false;
        if (typeof material.refractionIndex !== "undefined") return false;
        if (isGroundShadowMaterial(material)) return false;

        var name = getEntitySearchText(material);
        if (name.indexOf("diamond") !== -1 || name.indexOf("gem") !== -1) return false;
        if (
          name.indexOf("gold") !== -1 ||
          name.indexOf("metal") !== -1 ||
          name.indexOf("tag") !== -1 ||
          name.indexOf("logo") !== -1 ||
          name.indexOf("roberto") !== -1 ||
          name.indexOf("coin") !== -1 ||
          name.indexOf("texture") !== -1 ||
          name.indexOf("engr") !== -1
        ) {
          return true;
        }

        return typeof material.metalness === "number" && material.metalness > 0.2;
      }

      function collectTintableMetalMaterials() {
        var materials = [];
        try {
          viewer.scene.traverse(function (obj) {
            if (!obj || !obj.material) return;
            var objMaterials = Array.isArray(obj.material) ? obj.material : [obj.material];
            objMaterials.forEach(function (material) {
              if (isTintableMetalMaterial(material) && materials.indexOf(material) === -1) {
                materials.push(material);
              }
            });
          });
        } catch (e) {}
        return materials;
      }

      var metalMaterials = collectTintableMetalMaterials();

      var WEBGI_COLOR_MAP = {
        "18kt yellow gold": "#D2AF63",
        "18kt white gold": "#E5E1DA",
        "18kt rose gold": "#D3A08F",
        "yellow gold": "#D2AF63",
        "white gold": "#E5E1DA",
        "rose gold": "#D3A08F",
        gold: "#D2AF63",
        silver: "#C0C0C0",
        platinum: "#E5E4E2",
      };

      // SDK-first: resolve the metal variation and apply it through MaterialConfiguratorPlugin.
      function getGoldVariation() {
        if (!matConfigPlugin || !matConfigPlugin.variations) return null;
        for (var vi = 0; vi < matConfigPlugin.variations.length; vi++) {
          var variationLabel = getEntitySearchText(matConfigPlugin.variations[vi]);
          if (variationLabel.indexOf("gold") !== -1 || variationLabel.indexOf("metal") !== -1) {
            return matConfigPlugin.variations[vi];
          }
        }
        return null;
      }

      var goldVariation = getGoldVariation();

      function findVariationMaterial(variation, metalKey) {
        if (!variation || !variation.materials) return null;
        for (var i = 0; i < variation.materials.length; i++) {
          if (materialMatchesMetalKey(variation.materials[i], metalKey)) {
            return variation.materials[i];
          }
        }
        return null;
      }

      function tintMaterialColor(material, hex) {
        if (!material || !hex || !material.color || !material.color.isColor) return false;
        if (isGroundShadowMaterial(material)) return false;
        if (typeof material.color.set === "function") material.color.set(hex);
        else if (typeof material.color.setRGB === "function") {
          material.color.setRGB(
            parseInt(hex.slice(1, 3), 16) / 255,
            parseInt(hex.slice(3, 5), 16) / 255,
            parseInt(hex.slice(5, 7), 16) / 255
          );
        }
        if (typeof material.setDirty === "function") material.setDirty();
        material.needsUpdate = true;
        return true;
      }

      function applyMaterialVariation(variation, targetMaterial) {
        if (!variation || !targetMaterial || !matConfigPlugin) return false;

        var targetIndex = variation.materials ? variation.materials.indexOf(targetMaterial) : -1;
        if (targetIndex !== -1) variation.selectedIndex = targetIndex;

        try {
          if (typeof matConfigPlugin.applyVariation === "function") {
            return !!matConfigPlugin.applyVariation(variation, targetMaterial.uuid);
          }
        } catch (e) {
          console.warn("[WebGI] Could not apply material variation:", e);
        }

        return targetIndex !== -1;
      }

      // Collect UUIDs of materials managed by the SDK variation so we can
      // tell which scene metals are NOT covered by applyVariation().
      function getVariationMaterialUUIDs(variation) {
        var uuids = {};
        if (!variation || !variation.materials) return uuids;
        for (var i = 0; i < variation.materials.length; i++) {
          var m = variation.materials[i];
          if (m && m.uuid) uuids[m.uuid] = true;
        }
        return uuids;
      }

      function applyColorToModel(colorValue) {
        var metalKey = normalizeMetalKey(colorValue);
        if (!metalKey) return;

        // Fastest path: apply the SDK variation immediately and then sync any
        // remaining metal materials in the same tick.
        var sdkApplied = false;
        var targetMaterial = findVariationMaterial(goldVariation, metalKey);

        if (targetMaterial) {
          sdkApplied = applyMaterialVariation(goldVariation, targetMaterial);
        }

        var referenceHex = null;
        if (sdkApplied && targetMaterial && targetMaterial.color && targetMaterial.color.isColor) {
          referenceHex = "#" + targetMaterial.color.getHexString();
        }

        if (!referenceHex) {
          var key = (colorValue || "").trim().toLowerCase();
          referenceHex =
            WEBGI_COLOR_MAP[key] ||
            WEBGI_COLOR_MAP[metalKey + " gold"] ||
            (metalKey === "white" ? WEBGI_COLOR_MAP["white gold"] : null);
        }

        if (referenceHex) {
          var variationUUIDs = getVariationMaterialUUIDs(goldVariation);
          metalMaterials = collectTintableMetalMaterials();
          for (var mi = 0; mi < metalMaterials.length; mi++) {
            var mat = metalMaterials[mi];
            if (sdkApplied && mat.uuid && variationUUIDs[mat.uuid]) continue;
            tintMaterialColor(mat, referenceHex);
          }
        }

        resetGroundShadowMaterial();

        viewer.setDirty();
        viewer.renderer.refreshPipeline();
        if (viewer.scene.activeCamera) viewer.scene.activeCamera.setDirty();
      }

      container.__webgiApplyColor = applyColorToModel;
      container.__webgiViewer = viewer;
      container.__webgiManager = manager;

      // Sync with the currently selected color picker on page load
      var _sectionId = container.getAttribute("data-section-id");
      if (_sectionId) {
        var _initInput = document.querySelector(
          '[data-ymee-color-picker][data-section-id="' +
            _sectionId +
            '"] .ymee-color-picker__item.is-selected [data-ymee-color-input]'
        );
        if (_initInput && _initInput.value) applyColorToModel(_initInput.value);
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
          if (typeof tonemap.contrast !== "undefined") tonemap.contrast = 1.0;
          if (typeof tonemap.saturation !== "undefined") tonemap.saturation = 1.05;
          if (typeof tonemap.exposure !== "undefined") tonemap.exposure = 1.2;
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
          camOptions.zoom = 1.15;
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

        controls.autoRotate = true;
        controls.autoRotateSpeed = 2;
        controls.dampingFactor = isMobile ? 0.12 : 0.1;
        controls.zoomSpeed = isMobile ? 0.3 : 1.0;
        controls.maxSpeed = 1.0;
        controls.enableDamping = true;
        controls.minDistance = defaultDist * 0.35; // max zoom in
        controls.maxDistance = defaultDist * 1.6; // max zoom out

        // Mobile: disable user interaction (orbit/pan/zoom) — autorotate only
        if (isMobile) {
          controls.enableRotate = false;
          controls.enablePan = false;
          controls.enableZoom = false;
        }

        controls.update();
      }

      if (ground && ground.visible !== false && typeof ground.bakeShadows === "function") {
        try {
          ground.bakeShadows();
        } catch (e) {
          console.warn("[WebGI] Could not bake ground shadows:", e);
        }
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
  if (typeof window.__webgiInitViewerReady === "function") window.__webgiInitViewerReady();

  function applyColorFromInput(input) {
    if (!input) return;
    var picker = input.closest("[data-ymee-color-picker]");
    if (!picker) return;
    var sectionId = picker.getAttribute("data-section-id");
    if (!sectionId) return;

    var sectionRoot = document.querySelector("#MainProduct--" + sectionId) || document;
    var scopedContainers = sectionRoot.querySelectorAll('.webgi-container[data-section-id="' + sectionId + '"]');
    var allSectionContainers = document.querySelectorAll('.webgi-container[data-section-id="' + sectionId + '"]');
    var applied = false;
    var appliedCount = 0;

    function tryApply(container) {
      if (!container || typeof container.__webgiApplyColor !== "function") return;
      container.__webgiApplyColor(input.value);
      applied = true;
      appliedCount += 1;
    }

    scopedContainers.forEach(tryApply);
    if (!applied) allSectionContainers.forEach(tryApply);
    if (!applied) {
    } else {
    }
  }

  // Delegated: color picker change → apply color to 3D model (no gallery scroll)
  document.addEventListener(
    "change",
    function (e) {
      var input = e.target.closest("[data-ymee-color-input]");
      if (!input) return;
      applyColorFromInput(input);
    },
    true
  );

  // Fallback for label clicks if upstream scripts/DOM swaps interfere with change timing
  document.addEventListener(
    "click",
    function (e) {
      var item = e.target.closest(".ymee-color-picker__item");
      if (!item) return;
      var input = item.querySelector("[data-ymee-color-input]");
      if (!input) return;
      requestAnimationFrame(function () {
        applyColorFromInput(input);
      });
    },
    true
  );
})();
