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
  canvasWrap.style.justifyContent = "center";
  canvasWrap.style.alignItems = "center";
  canvasWrap.style.width = "100%";
  canvasWrap.style.paddingBottom = UI_PADDING + "px";
  canvasWrap.style.aspectRatio = `${d.canvas.width} / ${d.canvas.height}`;
  canvasWrap.style.maxHeight = `${MAX_CANVAS_VH}vh`;

  const canvas = document.createElement("canvas");
  canvas.style.display = "block";
  canvas.style.borderRadius = "8px";
  canvas.style.touchAction = "none";
  canvas.style.maxWidth = "100%";
  canvas.style.maxHeight = "100%";
  canvas.style.height = "auto";
  canvasWrap.appendChild(canvas);

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

  /* ================= CANVAS ================= */
  const ctx = canvas.getContext("2d");
  let strokeColor = d.canvas.defaultColor;
  let erasing = false;

  function resetCanvas() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = d.canvas.width * dpr;
    canvas.height = d.canvas.height * dpr;
    canvas.style.width = d.canvas.width + "px";
    canvas.style.height = d.canvas.height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle =
      document.documentElement.dataset.theme === "light"
        ? d.canvas.backgroundLight
        : d.canvas.backgroundDark;

    ctx.fillRect(0, 0, d.canvas.width, d.canvas.height);
    snapshot();
  }

  /* ================= FULLSCREEN ================= */
  function fitCanvas() {
    canvasWrap.style.flex = "1";
    canvasWrap.style.maxHeight = "none";
    canvasWrap.style.paddingBottom = "0";

    canvas.style.position = "absolute";
    canvas.style.left = "50%";
    canvas.style.top = "50%";

    const toolbarH = toolbar.getBoundingClientRect().height;
    const footerH = footer.getBoundingClientRect().height;

    const viewportW = window.visualViewport?.width ?? document.documentElement.clientWidth;
    const viewportH = window.visualViewport?.height ?? document.documentElement.clientHeight;

    const scale = Math.min(
      viewportW / d.canvas.width,
      (viewportH - toolbarH - footerH) / d.canvas.height
    );

    canvas.style.transform = `translate(-50%, -50%) scale(${scale})`;
    canvas.style.marginTop = "-45px";
  }

  function resetFit() {
    canvas.style.position = "";
    canvas.style.left = "";
    canvas.style.top = "";
    canvas.style.transform = "";
    canvas.style.marginTop = "0";

    canvasWrap.style.flex = "";
    canvasWrap.style.maxHeight = `${MAX_CANVAS_VH}vh`;
    canvasWrap.style.paddingBottom = UI_PADDING + "px";
  }

  fsBtn.onclick = () => card.requestFullscreen?.();
  document.addEventListener("fullscreenchange", () =>
    document.fullscreenElement === card ? fitCanvas() : resetFit()
  );

  /* ================= DRAWING + PEN ================= */
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
    if (e.pointerType === "pen") return Math.max(0.05, e.pressure || 0);
    if (e.pointerType === "touch") return 0.6;
    return 0.5;
  }

  function smoothPressure(p, n) {
    return p * 0.7 + n * 0.3;
  }

  function pos(e) {
    const r = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (canvas.width / r.width),
      y: (e.clientY - r.top) * (canvas.height / r.height)
    };
  }

  function snapshot() {
    history.push(canvas.toDataURL());
    if (history.length > 50) history.shift();
    redo.length = 0;
  }

  canvas.addEventListener("pointerdown", e => {
    try { canvas.setPointerCapture(e.pointerId); } catch {}
    drawing = true;
    penEraserActive = isPenEraser(e);
    lastPressure = getPressure(e);
    points = [pos(e)];
    snapshot();
  });

  canvas.addEventListener("pointermove", e => {
    if (!drawing) return;

    const pressure = smoothPressure(lastPressure, getPressure(e));
    lastPressure = pressure;

    const activeEraser = penEraserActive || erasing;

    points.push(pos(e));
    if (points.length < 3) return;

    const [p0, p1, p2] = points.slice(-3);
    const m1 = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
    const m2 = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };

    ctx.lineWidth = Math.max(1, sizeInput.value * pressure);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = strokeColor;
    ctx.globalCompositeOperation =
      activeEraser ? "destination-out" : "source-over";

    ctx.beginPath();
    ctx.moveTo(m1.x, m1.y);
    ctx.quadraticCurveTo(p1.x, p1.y, m2.x, m2.y);
    ctx.stroke();
  });

  canvas.addEventListener("pointerup", () => {
    drawing = false;
    penEraserActive = false;
    points = [];
    ctx.globalCompositeOperation = "source-over";
  });

  canvas.addEventListener("pointercancel", () => {
    drawing = false;
    penEraserActive = false;
    points = [];
    ctx.globalCompositeOperation = "source-over";
  });

  /* ================= UNDO / REDO ================= */
  undoBtn.onclick = () => {
    if (history.length > 1) {
      redo.push(history.pop());
      restore(history[history.length - 1]);
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

  resetCanvas();
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
