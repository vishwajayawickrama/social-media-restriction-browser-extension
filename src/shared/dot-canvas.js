const canvas = document.querySelector("[data-dot-canvas]");

if (canvas) {
  const context = canvas.getContext("2d");
  const dotGridCanvas = document.createElement("canvas");
  const dotGridContext = dotGridCanvas.getContext("2d");
  const baseDotSize = 1;
  const pulses = [];

  let dotGap = 22;
  let canvasWidth = 0;
  let canvasHeight = 0;
  let deviceScale = 1;
  let lastPulse = 0;

  const drawDot = (targetContext, x, y, radius, alpha) => {
    targetContext.beginPath();
    targetContext.arc(x, y, radius, 0, Math.PI * 2);
    targetContext.fillStyle = `rgb(23 23 26 / ${alpha})`;
    targetContext.fill();
  };

  const cacheDotGrid = () => {
    dotGridCanvas.width = Math.floor(canvasWidth * deviceScale);
    dotGridCanvas.height = Math.floor(canvasHeight * deviceScale);
    dotGridContext.setTransform(deviceScale, 0, 0, deviceScale, 0, 0);
    dotGridContext.clearRect(0, 0, canvasWidth, canvasHeight);

    for (let x = 0; x <= canvasWidth; x += dotGap) {
      for (let y = 0; y <= canvasHeight; y += dotGap) {
        drawDot(dotGridContext, x, y, baseDotSize, 0.1);
      }
    }
  };

  const resizeCanvas = () => {
    deviceScale = window.devicePixelRatio || 1;
    canvasWidth = window.innerWidth;
    canvasHeight = window.innerHeight;
    dotGap = canvasWidth < 700 ? 28 : 22;
    canvas.width = Math.floor(canvasWidth * deviceScale);
    canvas.height = Math.floor(canvasHeight * deviceScale);
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;
    context.setTransform(deviceScale, 0, 0, deviceScale, 0, 0);
    cacheDotGrid();
  };

  const addPulse = () => {
    pulses.push({
      x: Math.round((Math.random() * canvasWidth) / dotGap) * dotGap,
      y: Math.round((Math.random() * canvasHeight) / dotGap) * dotGap,
      born: performance.now(),
      duration: 1800 + Math.random() * 1400
    });
  };

  const draw = (time) => {
    context.clearRect(0, 0, canvasWidth, canvasHeight);
    context.drawImage(dotGridCanvas, 0, 0, canvasWidth, canvasHeight);

    if (time - lastPulse > 420 + Math.random() * 420) {
      addPulse();
      lastPulse = time;
    }

    for (let index = pulses.length - 1; index >= 0; index -= 1) {
      const pulse = pulses[index];
      const progress = (time - pulse.born) / pulse.duration;

      if (progress >= 1) {
        pulses.splice(index, 1);
        continue;
      }

      const opacity = Math.sin(progress * Math.PI);
      context.shadowBlur = 12 * opacity;
      context.shadowColor = "rgb(23 23 26 / 0.22)";
      drawDot(context, pulse.x, pulse.y, 1.6 + opacity * 1.1, 0.14 + opacity * 0.28);
      context.shadowBlur = 0;
    }

    window.requestAnimationFrame(draw);
  };

  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);
  window.requestAnimationFrame(draw);
}
