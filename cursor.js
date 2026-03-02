/**
 * Custom cursor: neon circle with smooth inertia and hover states.
 * Does not run on touch devices (mobile fallback).
 */
(function () {
  const CURSOR_SELECTOR = 'a, button, .card';
  const INERTIA = 0.18; // Lower = smoother, higher = snappier (0.1–0.25)

  function isTouchDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  if (isTouchDevice()) return;

  const cursor = document.getElementById('custom-cursor');
  if (!cursor) return;

  document.body.classList.add('custom-cursor-active');

  let targetX = 0, targetY = 0;
  let currentX = -100, currentY = -100;
  let rafId = null;

  function lerp(start, end, t) {
    return start + (end - start) * t;
  }

  function updatePosition() {
    currentX = lerp(currentX, targetX, INERTIA);
    currentY = lerp(currentY, targetY, INERTIA);
    cursor.style.left = currentX + 'px';
    cursor.style.top = currentY + 'px';
    rafId = requestAnimationFrame(updatePosition);
  }

  function onMove(e) {
    targetX = e.clientX;
    targetY = e.clientY;
    if (rafId === null) rafId = requestAnimationFrame(updatePosition);
  }

  function setHover(isHover) {
    cursor.classList.toggle('hover', isHover);
  }

  document.addEventListener('mousemove', onMove, { passive: true });

  document.addEventListener('mouseover', function (e) {
    const el = e.target.closest(CURSOR_SELECTOR);
    setHover(!!el);
  });

  document.addEventListener('mouseout', function (e) {
    const related = e.relatedTarget;
    if (!related || !related.closest) {
      setHover(false);
      return;
    }
    const stillOver = related.closest(CURSOR_SELECTOR);
    setHover(!!stillOver);
  });
})();
