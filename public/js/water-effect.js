/**
 * Gwaltney's All Seasons Pressure Washing — WebGL Hero Effect
 *
 * Reveals clean.webp beneath dirty.webp as the cursor moves,
 * using ping-pong render targets to accumulate the cleaned trail.
 * Adapted from MockSite1 — green color palette, gpw- class names.
 */

(function () {

  if (document.readyState !== 'complete') {
    window.addEventListener('load', start);
  } else {
    start();
  }

  function start() {

    if (typeof THREE === 'undefined') {
      console.error('[GPW] Three.js missing'); return;
    }

    var canvas    = document.getElementById('gpw-webgl-canvas');
    var container = document.getElementById('gpw-webgl-container');
    if (!canvas || !container) {
      console.error('[GPW] Canvas not found'); return;
    }

    // ── Dimensions — use hero container, not full viewport ───────────────
    var W   = container.offsetWidth  || window.innerWidth;
    var H   = container.offsetHeight || window.innerHeight;
    var DPR = Math.min(window.devicePixelRatio || 1, 2);
    var isMobile = W < 768;
    // CSS handles positioning (position:absolute within .gpw-hero)

    // ── Renderer ──────────────────────────────────────────────────────────
    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false, alpha: false });
    } catch(e) { console.error('[GPW] WebGL failed:', e); return; }

    renderer.setPixelRatio(DPR);
    renderer.setSize(W, H);

    var camera = new THREE.OrthographicCamera(-1,1,1,-1,0,10);
    camera.position.z = 1;
    var geo = new THREE.PlaneGeometry(2,2);

    // ── Render targets ────────────────────────────────────────────────────
    function makeRT() {
      return new THREE.WebGLRenderTarget(
        Math.floor(W * DPR), Math.floor(H * DPR), {
          minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
          format: THREE.RGBAFormat, type: THREE.UnsignedByteType
        }
      );
    }
    var rtA = makeRT(), rtB = makeRT();

    // ── Load textures — resolve path from script src ───────────────────────
    var BASE = (function () {
      var s = document.querySelector('script[src*="water-effect"]');
      if (s) return s.src.replace(/\/js\/water-effect\.js.*/, '/images/');
      return '/assets/images/';
    })();

    var loader   = new THREE.TextureLoader();
    loader.crossOrigin = 'anonymous';  // must match the crossorigin="anonymous" preload links
    var texDirty = loader.load(BASE + 'dirty.webp', onTex);
    var texClean = loader.load(BASE + 'clean.webp', onTex);
    texDirty.wrapS = texDirty.wrapT = THREE.ClampToEdgeWrapping;
    texClean.wrapS = texClean.wrapT = THREE.ClampToEdgeWrapping;

    var loadedCount = 0;
    var texAspect   = 1.0;
    function onTex() {
      loadedCount++;
      if (loadedCount === 2) {
        var img = texDirty.image;
        if (img && img.width && img.height) texAspect = img.width / img.height;
        initShaders();
      }
    }

    // Canvas scrolls naturally with the hero section — no scroll handler needed

    // ── Trail shader ──────────────────────────────────────────────────────
    var R = 0.047;
    var trailUniforms = {
      uPrev:   { value: null },
      uMouse:  { value: new THREE.Vector2(-5, -5) },
      uRadius: { value: R },
      uEdge:   { value: R * 0.38 },
      uFade:   { value: 0.006 },
      uAspect: { value: W / H },
      uActive: { value: 0.0 },
    };

    var TRAIL_VERT = [
      'varying vec2 vUv;',
      'void main(){vUv=uv;gl_Position=vec4(position,1.);}',
    ].join('\n');

    var TRAIL_FRAG = [
      'precision mediump float;',
      'uniform sampler2D uPrev;',
      'uniform vec2  uMouse;',
      'uniform float uRadius,uEdge,uFade,uAspect,uActive;',
      'varying vec2  vUv;',
      'void main(){',
      '  float prev=texture2D(uPrev,vUv).r*(1.-uFade);',
      '  if(uActive>.5){',
      '    vec2 d=(vUv-uMouse)*vec2(uAspect,1.);',
      '    float b=1.-smoothstep(uRadius-uEdge,uRadius,length(d));',
      '    prev=max(prev,b);',
      '  }',
      '  gl_FragColor=vec4(prev,prev,prev,1.);',
      '}',
    ].join('\n');

    // ── Surface shader ────────────────────────────────────────────────────
    var surfaceUniforms = {
      uDirty:      { value: null },
      uClean:      { value: null },
      uTrail:      { value: null },
      uTime:       { value: 0.0 },
      uMouse:      { value: new THREE.Vector2(-5,-5) },
      uRadius:     { value: R },
      uAspect:     { value: W / H },
      uTexAspect:  { value: 1.0 },
      uResolution: { value: new THREE.Vector2(W, H) },
    };

    var SURFACE_VERT = [
      'varying vec2 vUv;',
      'void main(){vUv=uv;gl_Position=vec4(position,1.);}',
    ].join('\n');

    var SURFACE_FRAG = [
      'precision highp float;',
      'uniform sampler2D uDirty,uClean,uTrail;',
      'uniform float uTime,uRadius,uAspect,uTexAspect;',
      'uniform vec2  uMouse,uResolution;',
      'varying vec2  vUv;',

      'float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
      'float noise(vec2 p){',
      '  vec2 i=floor(p),f=fract(p);',
      '  f=f*f*(3.-2.*f);',
      '  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),',
      '             mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);',
      '}',
      'float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*noise(p);a*=.5;p*=2.1;}return v;}',

      'void main(){',
      '  vec2 uv=vUv;',
      '  float t=uTime;',
      '  float aspect=uAspect;',

      '  vec2 tUV=uv;',
      '  if(uAspect>uTexAspect){tUV.y=(uv.y-.5)*(uTexAspect/uAspect)+.5;}',
      '  else{tUV.x=(uv.x-.5)*(uAspect/uTexAspect)+.5;}',

      '  vec4 dirty=texture2D(uDirty,tUV);',
      '  vec4 clean=texture2D(uClean,tUV);',
      '  float trail=texture2D(uTrail,uv).r;',

      // Wet gleam — green tint instead of blue
      '  float caus=sin(uv.x*18.+t*1.4+sin(uv.y*14.+t*.9))*',
      '             sin(uv.y*16.-t*1.1+sin(uv.x*12.+t*.7));',
      '  caus=pow(max(caus,0.),2.5)*0.18*trail;',
      '  clean.rgb+=vec3(.2,.9,.45)*caus;',

      '  float grime=fbm(uv*6.+vec2(t*.003,0.))*.12;',
      '  dirty.rgb*=1.-grime*.3;',

      '  float reveal=smoothstep(.02,.35,trail);',
      '  vec4 surface=mix(dirty,clean,reveal);',

      // Cursor — green-white tones
      '  vec2 toMouse=(uv-uMouse)*vec2(aspect,1.);',
      '  float dist=length(toMouse);',
      '  float angle=atan(toMouse.y,toMouse.x);',

      '  float rRing=uRadius*0.92;',
      '  float ringW=uRadius*0.06;',
      '  float ring=smoothstep(ringW,0.,abs(dist-rRing));',
      '  float ringNoise=0.7+0.3*noise(vec2(angle*5.+t*6.,1.));',
      '  ring*=ringNoise;',

      '  float core=smoothstep(uRadius*.14,0.,dist)*1.6;',

      '  float lineW=uRadius*0.028;',
      '  float lineLen=uRadius*0.55;',
      '  float hline=smoothstep(lineW,0.,abs(toMouse.y/(1.0)))*',
      '              smoothstep(lineLen,uRadius*.18,abs(toMouse.x))*',
      '              (1.-smoothstep(uRadius*.12,uRadius*.06,abs(toMouse.x)));',
      '  float vline=smoothstep(lineW,0.,abs(toMouse.x/aspect))*',
      '              smoothstep(lineLen,uRadius*.18,abs(toMouse.y))*',
      '              (1.-smoothstep(uRadius*.12,uRadius*.06,abs(toMouse.y)));',
      '  float crosshair=(hline+vline)*0.55;',

      // Green-tinted cursor color
      '  vec3 cursorCol=vec3(0.82,1.00,0.88);',
      '  vec3 coreCol  =vec3(0.92,1.00,0.94);',
      '  float mask=1.-smoothstep(uRadius*1.08,uRadius*1.16,dist);',
      '  surface.rgb+=coreCol*core + cursorCol*(ring+crosshair)*mask;',

      '  vec2 vig=(uv-.5)*2.;',
      '  float vignette=1.-dot(vig*.6,vig*.6);',
      '  vignette=clamp(vignette,0.,1.);',
      '  surface.rgb*=mix(.55,1.,vignette);',

      '  gl_FragColor=surface;',
      '}',
    ].join('\n');

    // ── Build scenes after textures load ──────────────────────────────────
    var trailMat, surfaceMat, trailScene, surfaceScene;
    var running = false;

    function initShaders() {
      trailMat = new THREE.ShaderMaterial({
        uniforms: trailUniforms,
        vertexShader: TRAIL_VERT,
        fragmentShader: TRAIL_FRAG,
      });

      surfaceMat = new THREE.ShaderMaterial({
        uniforms: surfaceUniforms,
        vertexShader: SURFACE_VERT,
        fragmentShader: SURFACE_FRAG,
      });

      surfaceUniforms.uDirty.value     = texDirty;
      surfaceUniforms.uClean.value     = texClean;
      surfaceUniforms.uTexAspect.value = texAspect;

      trailScene   = new THREE.Scene();
      surfaceScene = new THREE.Scene();
      trailScene.add(new THREE.Mesh(geo, trailMat));
      surfaceScene.add(new THREE.Mesh(geo, surfaceMat));

      running = true;
      last    = performance.now();
      requestAnimationFrame(tick);
    }

    // ── Mouse / touch tracking ────────────────────────────────────────────
    var mouse       = new THREE.Vector2(-5, -5);
    var targetMouse = new THREE.Vector2(0.5, 0.5);
    var mouseActive = false;
    var mouseTimer  = null;

    function setActive() {
      mouseActive = true;
      clearTimeout(mouseTimer);
      mouseTimer = setTimeout(function(){ mouseActive = false; }, 180);
    }

    window.addEventListener('mousemove', function(e) {
      // Coords relative to the canvas element so they work while scrolling
      var rect = canvas.getBoundingClientRect();
      var relX = (e.clientX - rect.left) / rect.width;
      var relY = (e.clientY - rect.top)  / rect.height;
      targetMouse.set(relX, 1.0 - relY);
      if (relX > -0.1 && relX < 1.1 && relY > -0.1 && relY < 1.1) {
        setActive();
        hideCursorHint();
      }
    }, { passive: true });

    if (!isMobile) {
      window.addEventListener('touchmove', function(e) {
        var t = e.touches[0];
        var rect = canvas.getBoundingClientRect();
        targetMouse.set(
          (t.clientX - rect.left) / rect.width,
          1.0 - (t.clientY - rect.top) / rect.height
        );
        setActive();
        hideCursorHint();
      }, { passive: true });
    }

    // ── Mobile auto-sweep ─────────────────────────────────────────────────
    var sweepX      = 0.01;
    var sweepDir    = 1;
    var sweepY      = 0.90;
    var sweepRowH   = 0.055;  // wider rows to match faster sweep
    var sweepDelay  = 0.5;    // start sooner (was 0.8)
    var sweepElapsed = 0;
    var sweepStarted = false;

    var hintHidden = false;
    function hideCursorHint() {
      if (hintHidden) return; hintHidden = true;
      var h = document.getElementById('gpwCursorHint');
      if (!h) return;
      h.style.transition = 'opacity .5s';
      h.style.opacity = '0';
      setTimeout(function(){ h.hidden = true; }, 600);
    }

    // ── Resize ────────────────────────────────────────────────────────────
    window.addEventListener('resize', function(){
      W = container.offsetWidth  || window.innerWidth;
      H = container.offsetHeight || window.innerHeight;
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      isMobile = W < 768;
      renderer.setSize(W, H);
      renderer.setPixelRatio(DPR);
      trailUniforms.uAspect.value      = W / H;
      surfaceUniforms.uAspect.value    = W / H;
      surfaceUniforms.uResolution.value.set(W, H);
      rtA.dispose(); rtB.dispose();
      rtA = makeRT(); rtB = makeRT();
    }, { passive: true });

    // ── Render loop ───────────────────────────────────────────────────────
    var time = 0, last = performance.now(), raf = null;

    function tick(now) {
      raf = requestAnimationFrame(tick);
      if (!running) return;

      var dt = Math.min((now - last) / 1000, 0.05);
      last = now; time += dt;

      if (isMobile) {
        sweepElapsed += dt;
        if (sweepElapsed > sweepDelay) {
          if (!sweepStarted) { sweepStarted = true; mouseActive = true; }
          sweepX += sweepDir * 0.308 * dt;  // 40% faster (was 0.22)
          if (sweepX >= 0.99 || sweepX <= 0.01) {
            sweepDir *= -1;
            sweepY = sweepY - sweepRowH;
            if (sweepY < 0.02) sweepY = 0.90;
          }
          targetMouse.set(sweepX, sweepY);
          mouseActive = true;
        }
      }

      mouse.x += (targetMouse.x - mouse.x) * 0.55;
      mouse.y += (targetMouse.y - mouse.y) * 0.55;

      trailUniforms.uPrev.value   = rtB.texture;
      trailUniforms.uMouse.value  = mouse;
      trailUniforms.uActive.value = mouseActive ? 1.0 : 0.0;
      renderer.setRenderTarget(rtA);
      renderer.render(trailScene, camera);

      surfaceUniforms.uTrail.value  = rtA.texture;
      surfaceUniforms.uTime.value   = time;
      surfaceUniforms.uMouse.value  = mouse;
      renderer.setRenderTarget(null);
      renderer.render(surfaceScene, camera);

      var tmp = rtA; rtA = rtB; rtB = tmp;
    }

    document.addEventListener('visibilitychange', function(){
      if (document.hidden) cancelAnimationFrame(raf);
      else { last = performance.now(); raf = requestAnimationFrame(tick); }
    });
  }

})();
