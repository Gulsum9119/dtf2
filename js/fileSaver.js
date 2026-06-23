let currentShirtColor = 'white';

function setShirtColor(color) {
  currentShirtColor = color;
  document.getElementById('toggleWhite').classList.toggle('active', color === 'white');
  document.getElementById('toggleBlack').classList.toggle('active', color === 'black');
  updateFilePreview();
}

function getCurrentPrintNumber() {
  const stored = localStorage.getItem('currentPrintNumber');
  if (stored) return parseInt(stored);
  const start = localStorage.getItem('startNumber');
  return start ? parseInt(start) : 9000;
}

function getNextNumberForColor(color) {
  let num = getCurrentPrintNumber();
  if (color === 'white') { if (num % 2 !== 0) num++; }
  else { if (num % 2 !== 1) num++; }
  return num;
}

function updateFilePreview() {
  const code = document.getElementById('saveDesignerCode').value || localStorage.getItem('designerCode') || '';
  const prefix = document.getElementById('printType').value;
  const creator = document.getElementById('creatorCode').value;
  const num = getNextNumberForColor(currentShirtColor);
  document.getElementById('filePreviewName').textContent = buildFilename(prefix, code, num, creator) || '—';
}

function buildFilename(prefix, code, num, creator) {
  if (!code) return '';
  const parts = [];
  if (prefix) parts.push(prefix);
  parts.push(code);
  return parts.join('_') + '_' + String(num).padStart(4, '0') + (creator ? `!${creator}` : '') + '.png';
}

function savePNG() {
  const canvas = document.getElementById('mainCanvas');
  const code = document.getElementById('saveDesignerCode').value || localStorage.getItem('designerCode') || '';
  const prefix = document.getElementById('printType').value;
  const creator = document.getElementById('creatorCode').value;
  const num = getNextNumberForColor(currentShirtColor);
  if (!code) { alert('Укажите код дизайнера'); return; }
  const filename = buildFilename(prefix, code, num, creator);
  const exportCanvas = document.createElement('canvas'), ctx = exportCanvas.getContext('2d');
  if (window.appState.resultImageData) {
    exportCanvas.width = window.appState.resultImageData.width; exportCanvas.height = window.appState.resultImageData.height;
    ctx.putImageData(window.appState.resultImageData, 0, 0);
  } else {
    exportCanvas.width = canvas.width; exportCanvas.height = canvas.height; ctx.drawImage(canvas, 0, 0);
  }
  const a = document.createElement('a'); a.href = exportCanvas.toDataURL('image/png'); a.download = filename; a.click();
  localStorage.setItem('currentPrintNumber', String(currentShirtColor === 'white' ? num + 2 : num + 1));
  updateFilePreview();
  const btn = document.getElementById('savePngBtn');
  btn.textContent = `✓ Сохранено: ${filename}`;
  setTimeout(() => btn.textContent = 'Сохранить PNG', 2500);
}

function exportPNG() {
  const canvas = document.getElementById('mainCanvas');
  const exportCanvas = document.createElement('canvas'), ctx = exportCanvas.getContext('2d');
  if (window.appState.resultImageData) {
    exportCanvas.width = window.appState.resultImageData.width; exportCanvas.height = window.appState.resultImageData.height;
    ctx.putImageData(window.appState.resultImageData, 0, 0);
  } else {
    exportCanvas.width = canvas.width; exportCanvas.height = canvas.height; ctx.drawImage(canvas, 0, 0);
  }
  const a = document.createElement('a'); a.href = exportCanvas.toDataURL('image/png');
  a.download = (window.appState.fileName || 'image').replace(/\.[^.]+$/, '') + '_export.png'; a.click();
}