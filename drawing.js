function createDrawingCanvas() {
  const d = window.config?.drawing;
  if (!d || !d.enabled) return document.createElement("div");

  const rateLimitMs = (d.rateLimitSeconds ?? 60) * 1000;
  const UI_PADDING = 40;
  const MAX_CANVAS_VH = 55;

  /* ================= CARD ================= */
  const card = document.createElement("div");
  card.style.position = "relative";
  card.style.width = "100%";
  card.style.borderRadius = "12px";
  card.style.background = "var(--card)";
  card.style.border = "1px solid var(--border, rgba(255,255,255,0.08))";
  card.style.padding = "0.75rem";
  card.style.boxSizing = "border-box";
  card.style.overflow = "hidden";
  card.style.display = "flex";
  card.style.flexDirection = "column";

  /* ================= CANVAS WRAPPER ================= */
  const canvasWrap = document.createElement("div");
  canvasWrap.style.position = "relative";
  canvasWrap.style.display = "flex";
  canvasWrap.style.flexDirection = "column";
  canvasWrap.style.alignItems = "center";
  canvasWrap.style.width = "100%";
  canvasWrap.style.aspectRatio = `${d.canvas.width} / ${d.canvas.height}`;
  canvasWrap.style.maxWidth = "100%";
  canvasWrap.style.width = "100%";
  canvasWrap.style.height = "auto";
  canvasWrap.style.maxHeight = "none";
  canvasWrap.style.flex = "0 0 auto";
  canvasWrap.style.width = "100%";
  canvasWrap.style.alignSelf = "stretch";
  



  const canvas = document.createElement("canvas");
  canvas.style.display = "block";
  canvas.style.borderRadius = "8px";
  canvas.style.touchAction = "none";
  canvas.style.userSelect = "none";
  canvas.style.webkitUserSelect = "none";
  canvas.style.maxWidth = "100%";
  canvas.style.maxHeight = "100%";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvasWrap.appendChild(canvas);
  const canvasSpacer = document.createElement("div");
canvasSpacer.style.height = UI_PADDING + "px";
canvasSpacer.style.flexShrink = "0";
canvasWrap.appendChild(canvasSpacer);


  if (window.matchMedia("(max-width: 768px)").matches) {
canvasWrap.style.maxHeight = "none";

if (window.matchMedia("(max-width: 768px)").matches) {
  canvasWrap.style.maxHeight = `${MAX_CANVAS_VH}vh`;
}

}

  /* ================= TOOLBAR ================= */
  const toolbar = document.createElement("div");
  toolbar.style.display = "flex";
  toolbar.style.gap = "0.4rem";
  toolbar.style.flexWrap = "wrap";
  toolbar.style.padding = "0.5rem";

  let nameInput = null;
  if (d.allowName) {
    nameInput = document.createElement("input");
    nameInput.placeholder = "Your name (optional)";
    styleInput(nameInput);
    toolbar.appendChild(nameInput);
  }

  const colorBtn = toolBtn("Color");
  const eraserBtn = toolBtn("Eraser");
  const undoBtn = toolBtn("Undo");
  const redoBtn = toolBtn("Redo");
  const fsBtn = toolBtn("Fullscreen");

  toolbar.append(colorBtn, eraserBtn, undoBtn, redoBtn, fsBtn);

  /* ================= FOOTER ================= */
  const footer = document.createElement("div");
  footer.style.display = "flex";
  footer.style.gap = "0.5rem";
  footer.style.alignItems = "center";
  footer.style.padding = "0.5rem";
  footer.style.height = UI_PADDING + "px";
  footer.style.position = "absolute";
  footer.style.bottom = "0";
  footer.style.left = "0";

  const sizeInput = document.createElement("input");
  sizeInput.type = "range";
  sizeInput.min = 1;
  sizeInput.max = d.canvas.maxBrushSize;
  sizeInput.value = d.canvas.defaultBrushSize;

  const clearBtn = toolBtn("Clear");
  const sendBtn = toolBtn("Send");
  const status = document.createElement("span");
  status.style.fontSize = "0.85rem";
  status.style.color = "var(--desc)";

  footer.append(sizeInput, clearBtn, sendBtn, status);
  card.append(toolbar, canvasWrap, footer);

  /* ================= CANVAS SETUP ================= */
  const ctx = canvas.getContext("2d");
  let strokeColor = d.canvas.defaultColor;
  let erasing = false;

function resetCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();

  canvas.width  = Math.round(rect.width  * dpr);
  canvas.height = Math.round(rect.height * dpr);

  // IMPORTANT: do NOT apply DPR here
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  ctx.fillStyle =
    document.documentElement.dataset.theme === "light"
      ? d.canvas.backgroundLight
      : d.canvas.backgroundDark;

  ctx.fillRect(0, 0, canvas.width, canvas.height);
  snapshot();
}

/* ================= FULLSCREEN ================= */

/* ================= FULLSCREEN (LOCKED) ================= */

function fitCanvasFullscreen() {
  card.style.padding = "12px";

  canvasWrap.style.flex = "1";
  canvasWrap.style.maxHeight = "100%";

  canvasSpacer.style.display = "none";

  canvas.style.position = "absolute";
  canvas.style.left = "50%";
  canvas.style.top = "50%";

  const rect = canvas.getBoundingClientRect();

  const vw = window.visualViewport?.width ?? window.innerWidth;
  const vh = window.visualViewport?.height ?? window.innerHeight;

  // Hard limits — THIS is what fixes "too big"
  const MAX_W = vw * 0.9;
  const MAX_H = vh * 0.85;

  const scale = Math.min(
    MAX_W / rect.width,
    MAX_H / rect.height
  );

  const vv = window.visualViewport;
  const offsetX = vv ? vv.offsetLeft : 0;
  const offsetY = vv ? vv.offsetTop  : 0;

  const toolbarH = toolbar.getBoundingClientRect().height;
const footerH  = footer.getBoundingClientRect().height;

// Optical center correction
const centerBiasY = (footerH - toolbarH) * 2.5;

canvas.style.transform = `
  translate(
    calc(-50% + ${offsetX / scale}px),
    calc(-50% + ${offsetY / scale - centerBiasY / scale}px)
  )
  scale(${scale})
`;

}

function resetCanvasFullscreen() {
  card.style.padding = "0.75rem";

  canvasWrap.style.flex = "";
  canvasWrap.style.maxHeight = `${MAX_CANVAS_VH}vh`;

  canvasSpacer.style.display = "";

  canvas.style.position = "";
  canvas.style.left = "";
  canvas.style.top = "";
  canvas.style.transform = "";
}


const ua = navigator.userAgent;

// iPadOS detection (new & old)
const isIOS = /iPad|iPhone|iPod/.test(ua) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

// Safari-only fullscreen on iOS
const isSafari = isIOS &&
  /Safari/.test(ua) &&
  !/CriOS|FxiOS|EdgiOS|DuckDuckGo|OPiOS/.test(ua);

// Fullscreen unsupported environments
const fullscreenUnsupported = isIOS && !isSafari;

if (fullscreenUnsupported) {
  fsBtn.disabled = true;
  fsBtn.style.opacity = "0.4";
  fsBtn.style.cursor = "not-allowed";
  fsBtn.title = "Fullscreen not supported in this browser";
}

if (!fullscreenUnsupported) {
  fsBtn.onclick = () => card.requestFullscreen?.();

  document.addEventListener("fullscreenchange", () => {
    document.fullscreenElement === card
      ? fitCanvasFullscreen()
      : resetCanvasFullscreen();
  });
}

  /* ================= DRAWING ================= */
  let drawing = false;
  let points = [];
  let history = [];
  let redo = [];
  let lastPressure = 0.5;
  let penEraserActive = false;

  function isPenEraser(e) {
    return e.pointerType === "pen" && e.buttons === 32;
  }

function getPressure(e) {
  if (e.pointerType === "pen") {
    return Math.max(0.05, e.pressure || 0.5);
  }

  if (e.pointerType === "touch") {
    return 0.75; // stable touch feel
  }

  return 0.5; // mouse
}


  function smoothPressure(p, n) {
    return p * 0.7 + n * 0.3;
  }

function posFromXY(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();

  const scaleX = canvas.width  / rect.width;
  const scaleY = canvas.height / rect.height;

  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top)  * scaleY
  };
}

  function snapshot() {
    history.push(canvas.toDataURL());
    if (history.length > 50) history.shift();
    redo.length = 0;
  }

let strokeDirty = false;

/* ===== POINTER (mouse + pen) ===== */
canvas.addEventListener("pointerdown", e => {
  e.preventDefault();

  drawing = true;
  penEraserActive = isPenEraser(e);
  lastPressure = getPressure(e);
  strokeDirty = true;

  points = [posFromXY(e.clientX, e.clientY)];
}, { passive: false });

canvas.addEventListener("pointermove", e => {
  if (!drawing) return;
  e.preventDefault();

let pressure = getPressure(e);

// Only smooth mouse input
if (e.pointerType !== "pen") {
  pressure = smoothPressure(lastPressure, pressure);
}

lastPressure = pressure;


  drawPoint(posFromXY(e.clientX, e.clientY), pressure);
}, { passive: false });

canvas.addEventListener("pointerup", endStroke);
canvas.addEventListener("pointercancel", endStroke);

/* ===== TOUCH FALLBACK (ANDROID / iOS) ===== */
canvas.addEventListener("touchstart", e => {
  e.preventDefault();
  const t = e.touches[0];
  if (!t) return;

  drawing = true;
  lastPressure = 0.8;          // harder clamp for touch
  strokeDirty = true;

  points = [posFromXY(t.clientX, t.clientY)];
}, { passive: false });

canvas.addEventListener("touchmove", e => {
  if (!drawing) return;
  e.preventDefault();

  const t = e.touches[0];
  if (!t) return;

  drawPoint(posFromXY(t.clientX, t.clientY), lastPressure);
}, { passive: false });

canvas.addEventListener("touchend", endStroke);
canvas.addEventListener("touchcancel", endStroke);

/* ===== DRAW CURVE ===== */
function drawPoint(p, pressure) {
  const activeEraser = penEraserActive || erasing;
  points.push(p);

  // Use a wider window for mobile smoothness
  if (points.length < 4) return;

  const [p0, p1, p2, p3] = points.slice(-4);

  const m1 = {
    x: (p0.x + p1.x) / 2,
    y: (p0.y + p1.y) / 2
  };
  const m2 = {
    x: (p2.x + p3.x) / 2,
    y: (p2.y + p3.y) / 2
  };

  ctx.lineWidth = Math.max(1, sizeInput.value * pressure);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = strokeColor;
  ctx.globalCompositeOperation =
    activeEraser ? "destination-out" : "source-over";

  ctx.beginPath();
  ctx.moveTo(m1.x, m1.y);
  ctx.quadraticCurveTo(p2.x, p2.y, m2.x, m2.y);
  ctx.stroke();
}

/* ===== END STROKE ===== */
function endStroke() {
  if (!drawing) return;

  drawing = false;
  penEraserActive = false;
  points = [];
  ctx.globalCompositeOperation = "source-over";

  // Snapshot ONCE per stroke (performance critical)
  if (strokeDirty) {
    snapshot();
    strokeDirty = false;
  }
}


  /* ================= UNDO / REDO ================= */
  undoBtn.onclick = () => {
    if (history.length > 1) {
      redo.push(history.pop());
      restore(history.at(-1));
    }
  };

  redoBtn.onclick = () => {
    if (redo.length) {
      const img = redo.pop();
      history.push(img);
      restore(img);
    }
  };

  function restore(src) {
    const img = new Image();
    img.onload = () => ctx.drawImage(img, 0, 0);
    img.src = src;
  }

  eraserBtn.onclick = () => (erasing = !erasing);
  clearBtn.onclick = resetCanvas;

  /* ================= COLOR PICKER ================= */
  colorBtn.style.background = strokeColor;
  colorBtn.onclick = () => {
    const picker = document.createElement("input");
    picker.type = "color";
    picker.value = strokeColor;
    picker.style.position = "fixed";
    picker.style.left = "-9999px";
    document.body.appendChild(picker);
    picker.click();

    picker.oninput = () => {
      strokeColor = picker.value;
      colorBtn.style.background = strokeColor;
      erasing = false;
    };
    picker.onchange = () => picker.remove();
  };

  /* ================= SEND ================= */
  sendBtn.onclick = () => {
    const now = Date.now();
    const last = Number(localStorage.getItem("canvasLastSent") || 0);
    if (now - last < rateLimitMs) {
      status.textContent = "⏳ Rate limited";
      return;
    }

    status.textContent = "Sending…";
    canvas.toBlob(blob => {
      const form = new FormData();
      form.append("file", blob, "drawing.png");
      if (nameInput?.value) form.append("name", nameInput.value);

      fetch(d.workerUrl, { method: "POST", body: form })
        .then(r => {
          if (!r.ok) throw new Error();
          localStorage.setItem("canvasLastSent", now);
          status.textContent = "✅ Sent!";
          resetCanvas();
          setTimeout(() => status.textContent = "", 2000);
        })
        .catch(() => status.textContent = "❌ Failed");
    });
  };

  requestAnimationFrame(resetCanvas);
  return card;

  /* ================= HELPERS ================= */
  function toolBtn(text) {
    const b = document.createElement("button");
    b.textContent = text;
    b.style.padding = "6px 10px";
    b.style.borderRadius = "8px";
    b.style.border = "1px solid var(--border, rgba(255,255,255,0.1))";
    b.style.background = "var(--card)";
    b.style.color = "var(--fg)";
    b.style.cursor = "pointer";
    return b;
  }

  function styleInput(i) {
    i.style.padding = "6px 8px";
    i.style.borderRadius = "8px";
    i.style.border = "1px solid var(--border, rgba(255,255,255,0.1))";
    i.style.background = "var(--card)";
    i.style.color = "var(--fg)";
  }
}
