window.appState = {
  originalImage: null, originalData: null, resultImageData: null,
  fileName: '', undoStack: [], colorLayers: [],
};

document.addEventListener('DOMContentLoaded', () => {
  loadSettings(); loadPrompts();
  setupDragDrop();
  initBrush(document.getElementById('mainCanvas'));
  document.getElementById('fileInput').addEventListener('change', handleFileSelect);
  updateFilePreview();
});

function setupDragDrop() {
  const zone = document.getElementById('dropZone');
  document.body.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
  document.body.addEventListener('dragleave', e => { if (!e.relatedTarget) zone.classList.remove('drag-over'); });
  document.body.addEventListener('drop', e => { e.preventDefault(); zone.classList.remove('drag-over'); const f=e.dataTransfer.files[0]; if(f) loadFile(f); });
}

function handleFileSelect(e) { const f=e.target.files[0]; if(f) loadFile(f); }

function loadFile(file) {
  const allowed = ['image/png','image/jpeg','image/jpg','image/webp'];
  if (!allowed.includes(file.type)) { alert('Неподдерживаемый формат файла'); return; }
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      window.appState.originalImage = img; window.appState.fileName = file.name;
      window.appState.resultImageData = null; window.appState.undoStack = []; window.appState.colorLayers = [];
      const canvas = document.getElementById('mainCanvas');
      canvas.width = img.width; canvas.height = img.height;
      const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0);
      window.appState.originalData = ctx.getImageData(0, 0, img.width, img.height).data.slice();
      showEditor(); updateFileInfo(file); analyzeWithGemini(e.target.result);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function showEditor() {
  document.getElementById('emptyState').classList.add('hidden');
  document.getElementById('canvasContainer').classList.remove('hidden');
  document.getElementById('exportBtn').disabled = false;
  document.getElementById('fileInfo').classList.remove('hidden');
  ['printParams','analysisSection','bgSection','edgeSection','brushSection','upscaleSection','colorSection','promptSection','saveSection'].forEach(id => document.getElementById(id).classList.remove('hidden'));
  loadPrompts(); setCanvasBg('checker');
}

function updateFileInfo(file) {
  const img = window.appState.originalImage;
  document.getElementById('fileName').textContent = window.appState.fileName;
  document.getElementById('fileDimensions').textContent = `${img.width} × ${img.height}`;
  if (file) {
    const kb = (file.size/1024).toFixed(0);
    document.getElementById('fileSize').textContent = kb>1024 ? `${(kb/1024).toFixed(1)} MB` : `${kb} KB`;
  }
  updateDPI();
  const code = localStorage.getItem('designerCode');
  if (code) document.getElementById('saveDesignerCode').value = code;
  updateFilePreview();
}

function updateDPI() {
  const img = window.appState.originalImage; if (!img) return;
  const dpi = parseInt(document.getElementById('dpiInput').value) || 300;
  document.getElementById('physicalSize').textContent = `${((img.width/dpi)*2.54).toFixed(1)} × ${((img.height/dpi)*2.54).toFixed(1)} см`;
  const badge = document.getElementById('qualityBadge');
  if (dpi >= 300) { badge.textContent = '✓ Отлично (300+ DPI)'; badge.className = 'quality-badge quality-excellent'; }
  else if (dpi >= 150) { badge.textContent = '⚠ Низкое качество (150–299 DPI)'; badge.className = 'quality-badge quality-low'; }
  else { badge.textContent = '✕ Критично (< 150 DPI)'; badge.className = 'quality-badge quality-critical'; }
}

let currentView = 'result', currentBg = 'checker';

function renderCanvas() {
  const canvas = document.getElementById('mainCanvas'), ctx = canvas.getContext('2d');
  if (currentView === 'original' || !window.appState.resultImageData) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (window.appState.originalImage) ctx.drawImage(window.appState.originalImage, 0, 0);
  } else {
    ctx.putImageData(window.appState.resultImageData, 0, 0);
    if (document.getElementById('showMask')?.checked) overlayMask(ctx, canvas.width, canvas.height);
  }
}

function overlayMask(ctx, w, h) {
  const imageData = ctx.getImageData(0,0,w,h), data=imageData.data;
  const out = ctx.createImageData(w,h);
  for (let i=0;i<data.length;i+=4) { const a=data[i+3]; out.data[i]=a>128?0:255; out.data[i+1]=a>128?200:0; out.data[i+2]=a>128?100:0; out.data[i+3]=100; }
  ctx.putImageData(out,0,0);
}

function setView(view) {
  currentView = view;
  document.querySelectorAll('.view-btn').forEach(b => b.classList.toggle('active', b.dataset.view===view));
  renderCanvas();
}

function setCanvasBg(bg) {
  currentBg = bg;
  document.getElementById('canvasWrapper').className = 'canvas-wrapper bg-' + bg;
  document.querySelectorAll('.bg-btn').forEach(b => b.classList.toggle('active', b.dataset.bg===bg));
}

function switchTab(tab) {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab===tab));
  ['editor','colors','layers'].forEach(t => {
    const el = document.getElementById('tab'+t.charAt(0).toUpperCase()+t.slice(1));
    if (el) el.classList.toggle('active', t===tab);
  });
}

function saveStateForUndo() {
  const canvas = document.getElementById('mainCanvas');
  window.appState.undoStack.push(canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height));
  if (window.appState.undoStack.length > 20) window.appState.undoStack.shift();
}

function undo() {
  if (!window.appState.undoStack.length) return;
  const imageData = window.appState.undoStack.pop();
  const canvas = document.getElementById('mainCanvas');
  canvas.getContext('2d').putImageData(imageData, 0, 0);
  window.appState.resultImageData = canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height);
  renderCanvas();
}

function resetImage() {
  if (!window.appState.originalImage) return;
  const canvas = document.getElementById('mainCanvas');
  canvas.width=window.appState.originalImage.width; canvas.height=window.appState.originalImage.height;
  canvas.getContext('2d').drawImage(window.appState.originalImage, 0, 0);
  window.appState.resultImageData = null; window.appState.undoStack = []; renderCanvas();
}

function openSettings() {
  ['geminiKey','removeBgKey','replicateKey','designerCode'].forEach(k => document.getElementById(k).value = localStorage.getItem(k) || '');
  document.getElementById('startNumber').value = localStorage.getItem('startNumber') || '9000';
  document.getElementById('apiTestResult').classList.add('hidden');
  document.getElementById('settingsModal').classList.remove('hidden');
}

function closeSettings() { document.getElementById('settingsModal').classList.add('hidden'); }

function saveSettings() {
  ['geminiKey','removeBgKey','replicateKey','designerCode','startNumber'].forEach(k => {
    const val = document.getElementById(k).value.trim();
    if (val) localStorage.setItem(k, val); else localStorage.removeItem(k);
  });
  const start = document.getElementById('startNumber').value;
  if (start) localStorage.setItem('currentPrintNumber', start);
  const code = document.getElementById('designerCode').value.trim();
  if (code) document.getElementById('saveDesignerCode').value = code;
  closeSettings(); updateFilePreview();
}

function loadSettings() {
  const code = localStorage.getItem('designerCode');
  if (code) document.getElementById('saveDesignerCode').value = code;
}