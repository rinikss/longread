document.addEventListener("DOMContentLoaded", function () {
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  if (typeof Lenis !== "undefined" && !reduceMotion) {
    const MAX_LEAD = 0.45;

    const lenis = new Lenis({
      lerp: 0.06,
      wheelMultiplier: 1,
      virtualScroll: function (data) {
        const l = window.lenis;
        if (!l) return true;
        const max = window.innerHeight * MAX_LEAD;
        const lead = l.targetScroll - l.animatedScroll;
        const want = lead + data.deltaY;
        if (Math.abs(want) > max) {
          data.deltaY = Math.sign(want) * max - lead;
          if (Math.sign(data.deltaY) !== Math.sign(want)) data.deltaY = 0;
        }
        return true;
      },
    });

    function raf(time) {
      lenis.raf(time);
      window.requestAnimationFrame(raf);
    }
    window.requestAnimationFrame(raf);

    window.lenis = lenis;
  }

  // \\\\\\\\\\\\\\\\\\\\\\\\\\\\\

  const GLOW = {
    layers: [
      { width: 4, blur: 11, alpha: 0.43 },
      { width: 20, blur: 95, alpha: 0.3, smooth: true },
    ],
    res: 1,
    smoothRes: 0.5,
    boost: 3,
    dither: 1,
  };

  const glowSources = [];
  const pathCache = new WeakMap();

  window.glow = {
    add: function (src) {
      if (src && src.el) glowSources.push(src);
    },
  };

  const glowCanvas = document.createElement("canvas");
  glowCanvas.className = "glow_canvas";
  glowCanvas.setAttribute("aria-hidden", "true");
  const gctx = glowCanvas.getContext("2d");

  const softCanvas = document.createElement("canvas");
  softCanvas.className = "glow_canvas";
  softCanvas.setAttribute("aria-hidden", "true");
  const work = document.createElement("canvas");
  const wctx = work.getContext("2d");
  const gl = softCanvas.getContext("webgl", {
    premultipliedAlpha: true,
    alpha: true,
  });
  let glReady = false;
  let uBoost, uDither;

  document.body.prepend(glowCanvas);
  document.body.prepend(softCanvas);

  if (gl) {
    const vs =
      "attribute vec2 p; varying vec2 uv;" +
      "void main(){ uv = vec2(p.x * 0.5 + 0.5, 0.5 - p.y * 0.5); gl_Position = vec4(p, 0.0, 1.0); }";
    const fs =
      "precision highp float; varying vec2 uv; uniform sampler2D tex;" +
      "uniform float boost; uniform float dither;" +
      "float hash(vec2 c){ return fract(sin(dot(c, vec2(12.9898, 78.233))) * 43758.5453); }" +
      "void main(){" +
      "  float a = texture2D(tex, uv).a / boost;" +
      "  vec2 c = floor(gl_FragCoord.xy);" +
      "  float n = (hash(c) + hash(c + 31.7) - 1.0) * dither / 255.0;" +
      "  float v = a > 0.0005 ? clamp(a + n, 0.0, 1.0) : 0.0;" +
      "  gl_FragColor = vec4(v, v, v, v);" +
      "}";
    const sh = function (type, src) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog);
    if (gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      gl.useProgram(prog);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
        gl.STATIC_DRAW,
      );
      const loc = gl.getAttribLocation(prog, "p");
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      uBoost = gl.getUniformLocation(prog, "boost");
      uDither = gl.getUniformLocation(prog, "dither");
      glReady = true;
    }
  }

  let glowScale = 1;
  let softScale = 1;

  function sizeGlow() {
    const dpr = window.devicePixelRatio || 1;
    glowScale = GLOW.res * dpr;
    softScale = GLOW.smoothRes * dpr;
    glowCanvas.width = Math.round(window.innerWidth * glowScale);
    glowCanvas.height = Math.round(window.innerHeight * glowScale);
    work.width = Math.round(window.innerWidth * softScale);
    work.height = Math.round(window.innerHeight * softScale);
    softCanvas.width = Math.round(window.innerWidth * dpr);
    softCanvas.height = Math.round(window.innerHeight * dpr);
    [glowCanvas, softCanvas].forEach(function (c) {
      c.style.width = window.innerWidth + "px";
      c.style.height = window.innerHeight + "px";
    });
    if (glReady) gl.viewport(0, 0, softCanvas.width, softCanvas.height);
  }
  sizeGlow();
  window.addEventListener("resize", sizeGlow);
  function stageK() {
    return Math.min(window.innerWidth, window.innerHeight * 1.40625) / 1440;
  }

  function opacityOf(el) {
    let op = 1;
    let node = el;
    while (node && node.nodeType === 1 && op > 0.001) {
      const cs = window.getComputedStyle(node);
      if (cs.display === "none" || cs.visibility === "hidden") return 0;
      op *= parseFloat(cs.opacity);
      node = node.parentNode;
    }
    return op;
  }

  function screenMatrix(el) {
    const svg = el.ownerSVGElement;
    if (!svg) return el.getScreenCTM();
    const r = svg.getBoundingClientRect();
    const vb = svg.viewBox && svg.viewBox.baseVal;
    let m = new DOMMatrix();
    if (vb && vb.width && vb.height) {
      const k = Math.min(r.width / vb.width, r.height / vb.height);
      m = m
        .translate(
          r.left + (r.width - vb.width * k) / 2 - vb.x * k,
          r.top + (r.height - vb.height * k) / 2 - vb.y * k,
        )
        .scale(k);
    } else {
      m = m.translate(r.left, r.top);
    }
    const chain = [];
    for (let n = el; n && n !== svg; n = n.parentNode) chain.unshift(n);
    chain.forEach(function (n) {
      const t =
        n.transform && n.transform.baseVal && n.transform.baseVal.consolidate();
      if (t) {
        const q = t.matrix;
        m = m.multiply(new DOMMatrix([q.a, q.b, q.c, q.d, q.e, q.f]));
      }
    });
    return m;
  }

  function svgPath(el) {
    const tag = el.tagName.toLowerCase();
    const key =
      tag === "path"
        ? el.getAttribute("d")
        : tag +
          ["cx", "cy", "r", "rx", "ry", "x1", "y1", "x2", "y2"]
            .map(function (a) {
              return el.getAttribute(a);
            })
            .join(",");
    const cached = pathCache.get(el);
    if (cached && cached.key === key) return cached.path;

    const p = new Path2D();
    const n = function (a) {
      return parseFloat(el.getAttribute(a)) || 0;
    };
    if (tag === "path") {
      p.addPath(new Path2D(key));
    } else if (tag === "ellipse") {
      p.ellipse(n("cx"), n("cy"), n("rx"), n("ry"), 0, 0, Math.PI * 2);
    } else if (tag === "circle") {
      p.arc(n("cx"), n("cy"), n("r"), 0, Math.PI * 2);
    } else if (tag === "line") {
      p.moveTo(n("x1"), n("y1"));
      p.lineTo(n("x2"), n("y2"));
    }
    pathCache.set(el, { key: key, path: p });
    return p;
  }

  const sampleCache = new WeakMap();

  function samplesOf(el) {
    const key =
      el.getAttribute("d") ||
      ["cx", "cy", "r", "rx", "ry"]
        .map(function (a) {
          return el.getAttribute(a);
        })
        .join(",");
    const cached = sampleCache.get(el);
    if (cached && cached.key === key) return cached;
    const len = el.getTotalLength();
    const step = Math.max(1.5, len / 240);
    const pts = [];
    for (let l = 0; l < len; l += step) {
      const pt = el.getPointAtLength(l);
      pts.push([l, pt.x, pt.y]);
    }
    const last = el.getPointAtLength(len);
    pts.push([len, last.x, last.y]);
    const res = { key: key, len: len, step: step, pts: pts };
    sampleCache.set(el, res);
    return res;
  }

  function partialPath(el, k) {
    const sm = samplesOf(el);
    const end = sm.len * k;
    const p = new Path2D();
    let prev = null;
    for (let i = 0; i < sm.pts.length; i++) {
      const pt = sm.pts[i];
      if (pt[0] > end) break;
      if (
        !prev ||
        Math.hypot(pt[1] - prev[1], pt[2] - prev[2]) > sm.step * 1.6
      ) {
        p.moveTo(pt[1], pt[2]);
      } else {
        p.lineTo(pt[1], pt[2]);
      }
      prev = pt;
    }
    return p;
  }

  function rangePath(el, from, to) {
    const sm = samplesOf(el);
    const p = new Path2D();
    let prev = null;
    for (let lap = 0; lap < 2; lap++) {
      for (let i = 0; i < sm.pts.length; i++) {
        const pt = sm.pts[i];
        const l = pt[0] + lap * sm.len;
        if (l < from) continue;
        if (l > to) return p;
        if (
          !prev ||
          Math.hypot(pt[1] - prev[1], pt[2] - prev[2]) > sm.step * 1.6
        ) {
          p.moveTo(pt[1], pt[2]);
        } else {
          p.lineTo(pt[1], pt[2]);
        }
        prev = pt;
      }
    }
    return p;
  }

  function dashOf(el) {
    const cs = window.getComputedStyle(el);
    if (!cs.strokeDasharray || cs.strokeDasharray === "none") return null;
    let k = 1;
    const pl = el.getAttribute("pathLength");
    if (pl && el.getTotalLength) k = el.getTotalLength() / parseFloat(pl);
    const arr = cs.strokeDasharray.split(/[\s,]+/).map(function (v) {
      return parseFloat(v) * k;
    });
    return { arr: arr, offset: (parseFloat(cs.strokeDashoffset) || 0) * k };
  }

  function onScreen(r) {
    const pad = 300;
    return (
      r.width + r.height > 0 &&
      r.right > -pad &&
      r.left < window.innerWidth + pad &&
      r.bottom > -pad &&
      r.top < window.innerHeight + pad
    );
  }

  const OFF = 30000;

  function measure(src) {
    const el = src.el;
    const box = el.getBoundingClientRect();
    if (!onScreen(box)) return null;
    const op = opacityOf(el);
    if (op <= 0.001) return null;
    const m = { box: box, gain: (src.gain !== undefined ? src.gain : 1) * op };
    if (src.kind === "svg") {
      m.ctm = screenMatrix(el);
      if (!m.ctm) return null;
      if (src.range) {
        const r = src.range();
        if (!r || r[1] - r[0] <= 0.5) return null;
        m.k = r[0] * 7 + r[1];
        m.path = rangePath(el, r[0], r[1]);
      } else if (src.drawn) {
        const k = src.drawn();
        if (k <= 0.001) return null;
        m.k = k;

        if (src.parts) {
          m.path = new Path2D();
          src.parts.forEach(function (p) {
            m.path.addPath(k < 1 ? partialPath(p, k) : svgPath(p));
          });
        } else if (k < 1) {
          m.path = partialPath(el, k);
        }
      } else {
        m.dash = src.dash ? dashOf(src.dash) : null;
        if (m.dash && m.dash.arr.some(isNaN)) m.dash = null;
        if (m.dash && m.dash.arr[0] <= 0.01) return null;
      }
      if (!m.path) m.path = svgPath(el);
    }
    return m;
  }

  function strokeLayer(ctx, S, src, m, L, sk, alphaK) {
    ctx.shadowOffsetX = OFF;
    ctx.shadowOffsetY = 0;
    ctx.shadowBlur = 2 * L.blur * sk * S;
    ctx.shadowColor =
      "rgba(255, 255, 255, " + Math.min(1, L.alpha * m.gain * alphaK) + ")";
    ctx.strokeStyle = "#fff";
    ctx.lineCap = "butt";
    ctx.lineJoin = "round";

    if (src.kind === "svg") {
      const c = m.ctm;
      const unit = Math.sqrt(Math.abs(c.a * c.d - c.b * c.c)) || 1;
      ctx.setTransform(
        c.a * S,
        c.b * S,
        c.c * S,
        c.d * S,
        c.e * S - OFF,
        c.f * S,
      );
      ctx.setLineDash(m.dash ? m.dash.arr : []);
      ctx.lineDashOffset = m.dash ? m.dash.offset : 0;
      ctx.lineWidth = (L.width * sk) / unit;
      ctx.stroke(m.path);
      return;
    }

    const box = m.box;
    ctx.setTransform(S, 0, 0, S, -OFF, 0);
    ctx.setLineDash([]);
    ctx.lineWidth = L.width * sk;
    ctx.beginPath();
    if (src.kind === "ring") {
      const r = box.width * (src.r || 0.5);
      ctx.arc(
        box.left + box.width / 2,
        box.top + box.height / 2,
        r,
        0,
        Math.PI * 2,
      );
    } else {
      const x1 = box.left + box.width * (src.x1 !== undefined ? src.x1 : 0);
      const x2 = box.left + box.width * (src.x2 !== undefined ? src.x2 : 1);
      const y = box.top + box.height * (src.y !== undefined ? src.y : 0.5);
      if (x2 - x1 < 0.5) return;
      ctx.moveTo(x1, y);
      ctx.lineTo(x2, y);
    }
    ctx.stroke();
  }

  let glowEmpty = false;
  let glowSig = "";
  function glowFrame() {
    const sk = stageK();
    const visible = [];
    for (let i = 0; i < glowSources.length; i++) {
      const m = measure(glowSources[i]);
      if (m) visible.push([glowSources[i], m]);
    }
    if (!visible.length && glowEmpty) {
      window.requestAnimationFrame(glowFrame);
      return;
    }
    glowEmpty = !visible.length;

    const sig =
      visible
        .map(function (v) {
          const m = v[1];
          const b = m.box;
          return [
            Math.round(b.left * 2),
            Math.round(b.top * 2),
            Math.round(b.width * 2),
            Math.round(m.gain * 1000),
            m.k === undefined ? "" : Math.round(m.k * 2000),
            m.dash ? m.dash.arr.join(",") + "/" + m.dash.offset : "",
            m.ctm
              ? [m.ctm.a, m.ctm.b, m.ctm.c, m.ctm.d]
                  .map(function (x) {
                    return x.toFixed(4);
                  })
                  .join(",")
              : "",
            v[0].kind === "svg" ? v[0].el.getAttribute("d") || "" : "",
          ].join(":");
        })
        .join("|") +
      "@" +
      sk +
      "@" +
      glowCanvas.width +
      "x" +
      glowCanvas.height;
    if (sig === glowSig) {
      window.requestAnimationFrame(glowFrame);
      return;
    }
    glowSig = sig;

    gctx.setTransform(1, 0, 0, 1, 0, 0);
    gctx.clearRect(0, 0, glowCanvas.width, glowCanvas.height);
    wctx.setTransform(1, 0, 0, 1, 0, 0);
    wctx.clearRect(0, 0, work.width, work.height);

    let anySoft = false;
    visible.forEach(function (v) {
      GLOW.layers.forEach(function (L) {
        if (L.smooth && glReady) {
          strokeLayer(wctx, softScale, v[0], v[1], L, sk, GLOW.boost);
          anySoft = true;
        } else {
          strokeLayer(gctx, glowScale, v[0], v[1], L, sk, 1);
        }
      });
    });
    gctx.shadowColor = "transparent";
    wctx.shadowColor = "transparent";

    if (glReady) {
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      if (anySoft) {
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          work,
        );
        gl.uniform1f(uBoost, GLOW.boost);
        gl.uniform1f(uDither, GLOW.dither);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
    }
    window.requestAnimationFrame(glowFrame);
  }
  window.requestAnimationFrame(glowFrame);

  const finePointer = window.matchMedia(
    "(hover: hover) and (pointer: fine)",
  ).matches;

  if (finePointer) {
    const CURSOR_LERP = 0.25;
    const cursor = document.createElement("div");
    cursor.className = "cursor";
    cursor.setAttribute("aria-hidden", "true");
    document.body.appendChild(cursor);
    document.documentElement.classList.add("has_cursor");

    let mx = -100;
    let my = -100;
    let cx = mx;
    let cy = my;
    let shown = false;

    window.addEventListener("mousemove", function (e) {
      mx = e.clientX;
      my = e.clientY;
      if (!shown) {
        cx = mx;
        cy = my;
        shown = true;
        cursor.classList.add("is_visible");
      }

      const hover =
        e.target.closest && e.target.closest("button, a, [role='button']");
      cursor.classList.toggle("is_hover", !!hover);
    });

    document.addEventListener("mouseleave", function () {
      shown = false;
      cursor.classList.remove("is_visible");
    });

    window.addEventListener("mousedown", function () {
      cursor.classList.add("is_down");
    });
    window.addEventListener("mouseup", function () {
      cursor.classList.remove("is_down");
    });

    function cursorFrame() {
      const k = reduceMotion ? 1 : CURSOR_LERP;
      cx += (mx - cx) * k;
      cy += (my - cy) * k;
      cursor.style.transform = "translate(" + cx + "px, " + cy + "px)";
      window.requestAnimationFrame(cursorFrame);
    }
    window.requestAnimationFrame(cursorFrame);
  }
});
