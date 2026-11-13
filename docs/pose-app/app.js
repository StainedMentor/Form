/**
 * Standalone English pose estimation app.
 * Opens the camera first (while the Start click is still a user gesture),
 * then loads MediaPipe Pose Landmarker and draws a live skeleton.
 */

const VISION_PKG = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18";
const WASM_PATH = `${VISION_PKG}/wasm`;
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

const POSE_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 7],
  [0, 4], [4, 5], [5, 6], [6, 8],
  [9, 10],
  [11, 12], [11, 13], [13, 15], [15, 17], [15, 19], [15, 21], [17, 19],
  [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [18, 20],
  [11, 23], [12, 24], [23, 24],
  [23, 25], [24, 26], [25, 27], [26, 28],
  [27, 29], [28, 30], [29, 31], [30, 32], [27, 31], [28, 32],
];

const MIN_VISIBILITY = 0.35;

const els = {
  startBtn: document.getElementById("start-btn"),
  stopBtn: document.getElementById("stop-btn"),
  status: document.getElementById("status"),
  pill: document.getElementById("model-pill"),
  video: document.getElementById("video"),
  canvas: document.getElementById("canvas"),
  stage: document.getElementById("stage"),
};

let PoseLandmarker;
let FilesetResolver;
let landmarker = null;
let stream = null;
let rafId = 0;
let running = false;
let lastVideoTime = -1;
let starting = false;

els.startBtn.addEventListener("click", () => {
  void start();
});
els.stopBtn.addEventListener("click", () => stop());

window.addEventListener("pagehide", () => stop());
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stop();
  }
});

async function start() {
  if (running || starting) {
    return;
  }
  starting = true;
  els.startBtn.disabled = true;
  setStatus("Requesting camera permission…");

  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Camera API is not available in this browser.");
    }
    if (!window.isSecureContext) {
      throw new Error("Camera requires HTTPS (or localhost).");
    }

    // Keep getUserMedia in the Start click's user-activation window.
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: "user" },
        width: { ideal: 640 },
        height: { ideal: 480 },
      },
    });

    els.video.srcObject = stream;
    els.video.setAttribute("playsinline", "");
    els.video.muted = true;
    await els.video.play();
    els.stage.classList.add("active");
    setButtons(true);
    setStatus("Camera on. Loading pose model…", "ok");
    setPill("Loading model…");

    landmarker = await createLandmarker();
    setPill("Pose model ready");
    setStatus("Tracking pose live.", "ok");

    running = true;
    lastVideoTime = -1;
    rafId = requestAnimationFrame(tick);
  } catch (error) {
    console.error(error);
    stop();
    const message =
      error?.name === "NotAllowedError"
        ? "Camera permission was denied. Allow the camera and press Start again."
        : error?.message || String(error);
    setStatus(message, "error");
    setPill("Model idle");
  } finally {
    starting = false;
    if (!running) {
      els.startBtn.disabled = false;
    }
  }
}

async function createLandmarker() {
  if (landmarker) {
    return landmarker;
  }

  const vision = await import(`${VISION_PKG}/+esm`);
  PoseLandmarker = vision.PoseLandmarker;
  FilesetResolver = vision.FilesetResolver;
  const fileset = await FilesetResolver.forVisionTasks(WASM_PATH);

  try {
    return await PoseLandmarker.createFromOptions(fileset, landmarkerOptions("GPU"));
  } catch (gpuError) {
    console.warn("GPU pose model failed, retrying on CPU", gpuError);
    setStatus("GPU unavailable — loading CPU model…", "ok");
    return PoseLandmarker.createFromOptions(fileset, landmarkerOptions("CPU"));
  }
}

function landmarkerOptions(delegate) {
  return {
    baseOptions: {
      modelAssetPath: MODEL_URL,
      delegate,
    },
    runningMode: "VIDEO",
    numPoses: 1,
    minPoseDetectionConfidence: 0.5,
    minPosePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  };
}

function stop() {
  running = false;
  starting = false;

  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = 0;
  }

  if (stream) {
    for (const track of stream.getTracks()) {
      track.stop();
    }
    stream = null;
  }

  els.video.srcObject = null;
  els.stage.classList.remove("active");

  const ctx = els.canvas.getContext("2d");
  ctx.clearRect(0, 0, els.canvas.width || 1, els.canvas.height || 1);

  setButtons(false);
  if (!els.status.classList.contains("error")) {
    setStatus("Camera off. Press Start to begin again.");
  }
  if (!landmarker) {
    setPill("Model idle");
  } else {
    setPill("Model ready");
  }
}

function tick() {
  if (!running) {
    return;
  }

  const video = els.video;
  const canvas = els.canvas;

  if (video.readyState < 2 || !video.videoWidth) {
    rafId = requestAnimationFrame(tick);
    return;
  }

  const width = video.videoWidth;
  const height = video.videoHeight;
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  const ctx = canvas.getContext("2d");
  ctx.save();
  ctx.clearRect(0, 0, width, height);
  ctx.translate(width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, width, height);

  if (landmarker && video.currentTime !== lastVideoTime) {
    lastVideoTime = video.currentTime;
    try {
      const result = landmarker.detectForVideo(video, performance.now());
      const landmarks = result?.landmarks?.[0];
      if (landmarks?.length) {
        drawPose(ctx, landmarks, width, height);
      }
    } catch (error) {
      console.warn("Pose frame failed", error);
    }
  }

  ctx.restore();
  rafId = requestAnimationFrame(tick);
}

function drawPose(ctx, landmarks, width, height) {
  ctx.lineWidth = Math.max(2, width / 180);
  ctx.lineCap = "round";
  ctx.strokeStyle = "#38bdf8";
  ctx.fillStyle = "#22c55e";

  for (const [a, b] of POSE_CONNECTIONS) {
    const pa = landmarks[a];
    const pb = landmarks[b];
    if (!isVisible(pa) || !isVisible(pb)) {
      continue;
    }
    ctx.beginPath();
    ctx.moveTo(pa.x * width, pa.y * height);
    ctx.lineTo(pb.x * width, pb.y * height);
    ctx.stroke();
  }

  const radius = Math.max(3, width / 110);
  for (const point of landmarks) {
    if (!isVisible(point)) {
      continue;
    }
    ctx.beginPath();
    ctx.arc(point.x * width, point.y * height, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function isVisible(point) {
  return Boolean(point) && (point.visibility ?? 1) >= MIN_VISIBILITY;
}

function setButtons(isRunning) {
  els.startBtn.hidden = isRunning;
  els.startBtn.disabled = isRunning;
  els.stopBtn.hidden = !isRunning;
  els.stopBtn.disabled = !isRunning;
}

function setStatus(message, kind = "") {
  els.status.textContent = message;
  els.status.classList.toggle("error", kind === "error");
  els.status.classList.toggle("ok", kind === "ok");
}

function setPill(text) {
  els.pill.textContent = text;
}
