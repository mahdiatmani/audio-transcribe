import { pipeline } from "https://cdn.jsdelivr.net/npm/@xenova/transformers/dist/transformers.min.js";

const ui = {
  file: document.getElementById("file"),
  btn: document.getElementById("btn"),
  out: document.getElementById("out"),
  model: document.getElementById("model"),
  device: document.getElementById("device"),
  bar: document.getElementById("bar"),
};

let asr = null;
let currentModel = ui.model.value;
let currentDevice = "auto";

async function loadPipeline() {
  ui.btn.disabled = true;
  ui.out.textContent = `Loading model: ${currentModel} (${currentDevice})…`;
  ui.bar.style.display = "block"; ui.bar.value = 10;

  const opts = {};
  if (currentDevice === "webgpu") opts.device = "webgpu"; // per docs
  // (WASM is default in the browser; 'auto' lets the runtime choose best available)

  asr = await pipeline("automatic-speech-recognition", currentModel, opts);
  ui.bar.value = 100;
  ui.btn.disabled = false;
  ui.out.textContent = "Model ready. Choose an audio file and click Transcribe.";
  setTimeout(() => (ui.bar.style.display = "none"), 300);
}

ui.model.onchange = async (e) => { currentModel = e.target.value; await loadPipeline(); };
ui.device.onchange = async (e) => { currentDevice = e.target.value; await loadPipeline(); };

ui.btn.onclick = async () => {
  const f = ui.file.files[0];
  if (!f) return;

  ui.out.textContent = "Transcribing… (runs locally in your browser)";
  ui.bar.style.display = "block"; ui.bar.value = 15;

  try {
    const result = await asr(f, { chunk_length_s: 30, stride_length_s: 5 });
    ui.out.textContent = result.text || "";
  } catch (err) {
    ui.out.textContent = "Error: " + err.message;
  } finally {
    ui.bar.style.display = "none";
  }
};

// Initial load
await loadPipeline();
