// ============================================================
//  zoom.js  -  zoom buttons and two-finger pinch for the chart.
//  "Fit" shows the whole ocean; zooming in makes the squares
//  bigger and the chart scrolls inside its own box.
// ============================================================
const MAX_CELL = 72;   // biggest square, in pixels
const STEP = 1.35;     // how much one button press zooms

export function attachZoom(box) {
  const wrap = box.querySelector(".chart-wrap");
  const bar = box.querySelector(".zoom-bar");

  const firstCell = () => wrap.querySelector(".cell");
  const cellSize = () => (firstCell() ? firstCell().getBoundingClientRect().width : 0);
  const cols = () => Number(getComputedStyle(wrap.querySelector(".ocean") || wrap).getPropertyValue("--cols")) || 16;
  const axisWidth = () => { const a = wrap.querySelector(".axis.row"); return a ? a.getBoundingClientRect().width : 26; };
  const fitSize = () => (wrap.clientWidth - axisWidth()) / cols();

  // Set the square size; `anchor` is the point (inside the box) that should stay still
  function zoomTo(px, anchor) {
    const before = cellSize();
    if (px === null || px <= fitSize() + 0.5) {
      wrap.classList.remove("zoomed");
      wrap.style.removeProperty("--cell");
    } else {
      wrap.classList.add("zoomed");
      wrap.style.setProperty("--cell", Math.min(MAX_CELL, px) + "px");
    }
    const after = cellSize();
    if (before && after && anchor) {
      const k = after / before;
      wrap.scrollLeft = (wrap.scrollLeft + anchor.x) * k - anchor.x;
      wrap.scrollTop = (wrap.scrollTop + anchor.y) * k - anchor.y;
    }
    bar.querySelector('[data-zoom="fit"]').setAttribute("aria-pressed", !wrap.classList.contains("zoomed"));
  }
  const centre = () => ({ x: wrap.clientWidth / 2, y: wrap.clientHeight / 2 });

  bar.addEventListener("click", (e) => {
    const z = e.target.closest("[data-zoom]")?.dataset.zoom;
    if (z === "in") zoomTo(cellSize() * STEP, centre());
    if (z === "out") zoomTo(cellSize() / STEP, centre());
    if (z === "fit") zoomTo(null);
  });

  // Two-finger pinch inside the chart (one finger still scrolls it)
  let pinch = null;
  const dist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  const mid = (t) => {
    const r = wrap.getBoundingClientRect();
    return { x: (t[0].clientX + t[1].clientX) / 2 - r.left, y: (t[0].clientY + t[1].clientY) / 2 - r.top };
  };
  wrap.addEventListener("touchstart", (e) => {
    if (e.touches.length === 2) pinch = { d: dist(e.touches), size: cellSize() };
  }, { passive: true });
  wrap.addEventListener("touchmove", (e) => {
    if (!pinch || e.touches.length !== 2) return;
    e.preventDefault();
    const target = pinch.size * (dist(e.touches) / pinch.d);
    if (Math.abs(target - cellSize()) > 1) zoomTo(target, mid(e.touches));
  }, { passive: false });
  wrap.addEventListener("touchend", (e) => { if (e.touches.length < 2) pinch = null; });

  zoomTo(null);
}
