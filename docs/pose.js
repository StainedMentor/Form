/**
 * Camera pose estimation tab — MediaPipe Pose Landmarker (in-browser).
 */

const MEDIAPIPE_VISION_WASM =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm";
const POSE_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

/** MediaPipe Pose connections (pairs of landmark indices). */
const POSE_CONNECTIONS = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 7],
  [0, 4],
  [4, 5],
  [5, 6],
  [6, 8],
  [9, 10],
  [11, 12],
  [11, 13],
  [13, 15],
  [15, 17],
  [15, 19],
  [15, 21],
  [17, 19],
  [12, 14],
  [14, 16],
  [16, 18],
  [16, 20],
  [16, 22],
  [18, 20],
  [11, 23],
  [12, 24],
  [23, 24],
  [23, 25],
  [24, 26],
  [25, 27],
  [26, 28],
  [27, 29],
  [28, 30],
  [29, 31],
  [30, 32],
  [27, 31],
  [28, 32],
];

const MIN_VISIBILITY = 0.4;

let PoseLandmarker;
let FilesetResolver;
let landmarker = null;
let stream = null;
let rafId = 0;
let running = false;
let loadingModel = null;
let lastVideoTime = -1;
let bound = false;

const poseEls = {
  panel: null,
  video: null,
  canvas: null,
  startBtn: null,
  stopBtn: null,
  status: null,
  meta: null,
};

export function initPoseTab() {
  poseEls.panel = document.getElementById("panel-pose");
  poseEls.video = document.getElementById("pose-video");
  poseEls.canvas = document.getElementById("pose-canvas");
  poseEls.startBtn = document.getElementById("pose-start-btn");
  poseEls.stopBtn = document.getElementById("pose-stop-btn");
  poseEls.status = document.getElementById("pose-status");
  poseEls.meta = document.getElementById("pose-meta");

  if (!poseEls.panel || bound) {
    return;
  }

  bound = true;
  poseEls.startBtn.addEventListener("click", () => void startPose());
  poseEls.stopBtn.addEventListener("click", () => stopPose());
  setPoseStatus("Kamera je isključena. Pritisnite Start da učitate model i snimate.");
}

export async function onPoseTabEnter() {
  initPoseTab();
  setPoseButtons(false);
}

export function onPoseTabLeave() {
  stopPose();
}

async function ensureModel() {
  if (landmarker) {
    return landmarker;
  }
  if (loadingModel) {
    return loadingModel;
  }

  loadingModel = (async () => {
    setPoseStatus("Učitavam MediaPipe Pose model…");
    const vision = await import(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/+esm"
    );
    PoseLandmarker = vision.PoseLandmarker;
    FilesetResolver = vision.FilesetResolver;

    const fileset = await FilesetResolver.forVisionTasks(MEDIAPIPE_VISION_WASM);
    landmarker = await PoseLandmarker.createFromOptions(fileset, {
      baseOptions: {
        modelAssetPath: POSE_MODEL_URL,
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
    setPoseStatus("Model spreman.");
    return landmarker;
  })();

  try {
    return await loadingModel;
  } catch (error) {
    loadingModel = null;
    landmarker = null;
    throw error;
  }
}

async function startPose() {
  if (running) {
    return;
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    setPoseStatus("Kamera nije dostupna u ovom pregledniku.", true);
    return;
  }

  if (!window.isSecureContext && location.hostname !== "localhost") {
    setPoseStatus("Kamera zahtijeva HTTPS (ili localhost).", true);
    return;
  }

  poseEls.startBtn.disabled = true;
  setPoseStatus("Tražim dozvolu za kameru…");

  try {
    await ensureModel();

    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: "user",
        width: { ideal: 640 },
        height: { ideal: 480 },
      },
    });

    poseEls.video.srcObject = stream;
    await poseEls.video.play();

    running = true;
    lastVideoTime = -1;
    setPoseButtons(true);
    setPoseStatus("Kamera aktivna — procjena poza u toku.");
    poseEls.meta.textContent = "MediaPipe Pose Landmarker · Lite · uživo";
    rafId = requestAnimationFrame(detectFrame);
  } catch (error) {
    console.error(error);
    stopPose();
    const message =
      error?.name === "NotAllowedError"
        ? "Dozvola za kameru je odbijena."
        : `Nije moguće pokrenuti pozu: ${error?.message || error}`;
    setPoseStatus(message, true);
    setPoseButtons(false);
  }
}

function stopPose() {
  running = false;
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

  if (poseEls.video) {
    poseEls.video.srcObject = null;
  }

  const ctx = poseEls.canvas?.getContext("2d");
  if (ctx && poseEls.canvas) {
    ctx.clearRect(0, 0, poseEls.canvas.width, poseEls.canvas.height);
  }

  setPoseButtons(false);
  if (poseEls.status && !poseEls.status.classList.contains("error")) {
    setPoseStatus("Kamera je isključena.");
  }
  if (poseEls.meta) {
    poseEls.meta.textContent = "Model se učitava tek pri Startu.";
  }
}

function detectFrame() {
  if (!running || !landmarker) {
    return;
  }

  const video = poseEls.video;
  const canvas = poseEls.canvas;
  if (!video || video.readyState < 2) {
    rafId = requestAnimationFrame(detectFrame);
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
  // Mirror to match selfie camera.
  ctx.translate(width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, width, height);

  if (video.currentTime !== lastVideoTime) {
    lastVideoTime = video.currentTime;
    const result = landmarker.detectForVideo(video, performance.now());
    const landmarks = result?.landmarks?.[0];
    if (landmarks?.length) {
      drawPose(ctx, landmarks, width, height);
    }
  }

  ctx.restore();
  rafId = requestAnimationFrame(detectFrame);
}

function drawPose(ctx, landmarks, width, height) {
  ctx.lineWidth = Math.max(2, width / 200);
  ctx.strokeStyle = "#0b5fff";
  ctx.fillStyle = "#22c55e";

  for (const [a, b] of POSE_CONNECTIONS) {
    const pa = landmarks[a];
    const pb = landmarks[b];
    if (!pa || !pb) {
      continue;
    }
    if ((pa.visibility ?? 1) < MIN_VISIBILITY || (pb.visibility ?? 1) < MIN_VISIBILITY) {
      continue;
    }
    ctx.beginPath();
    ctx.moveTo(pa.x * width, pa.y * height);
    ctx.lineTo(pb.x * width, pb.y * height);
    ctx.stroke();
  }

  const radius = Math.max(3, width / 120);
  for (const point of landmarks) {
    if ((point.visibility ?? 1) < MIN_VISIBILITY) {
      continue;
    }
    ctx.beginPath();
    ctx.arc(point.x * width, point.y * height, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function setPoseButtons(isRunning) {
  if (!poseEls.startBtn || !poseEls.stopBtn) {
    return;
  }
  poseEls.startBtn.disabled = isRunning;
  poseEls.startBtn.hidden = isRunning;
  poseEls.stopBtn.hidden = !isRunning;
  poseEls.stopBtn.disabled = !isRunning;
}

function setPoseStatus(message, isError = false) {
  if (!poseEls.status) {
    return;
  }
  poseEls.status.hidden = false;
  poseEls.status.textContent = message;
  poseEls.status.classList.toggle("error", isError);
}
