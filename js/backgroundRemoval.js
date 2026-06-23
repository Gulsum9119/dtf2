async function removeBgAPI() {
  const key = localStorage.getItem('removeBgKey');
  if (!key) { alert('Укажите remove.bg API Key в настройках'); return; }
  if (!window.appState.originalImage) return;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = window.appState.originalImage.width; canvas.height = window.appState.originalImage.height;
    canvas.getContext('2d').drawImage(window.appState.originalImage, 0, 0);
    const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
    const formData = new FormData(); formData.append('image_file', blob, 'image.png'); formData.append('size', 'auto');
    const resp = await fetch('https://api.remove.bg/v1.0/removebg', { method: 'POST', headers: { 'X-Api-Key': key }, body: formData });
    if (!resp.ok) { const err = await resp.json().catch(() => ({})); throw new Error(err.errors?.[0]?.title || `HTTP ${resp.status}`); }
    const imgBlob = new Blob([await resp.arrayBuffer()], { type: 'image/png' });
    const url = URL.createObjectURL(imgBlob);
    const img = new Image();
    img.onload = () => { saveStateForUndo(); applyRemovedBgImage(img); URL.revokeObjectURL(url); };
    img.src = url;
  } catch (e) { alert('remove.bg ошибка: ' + e.message); }
}

function applyRemovedBgImage(img) {
  const canvas = document.getElementById('mainCanvas'), ctx = canvas.getContext('2d');
  canvas.width = img.width; canvas.height = img.height;
  ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(img, 0, 0);
  window.appState.resultImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  renderCanvas();
}

function floodFill() {
  if (!window.appState.originalImage) return;
  saveStateForUndo();
  const canvas = document.getElementById('mainCanvas'), ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data, width = canvas.width, height = canvas.height;
  const threshold = parseInt(document.getElementById('thresholdSlider').value);
  const visited = new Uint8Array(width * height), queue = [], seeds = [];
  for (let x = 0; x < width; x++) { seeds.push(x); seeds.push((height-1)*width + x); }
  for (let y = 0; y < height; y++) { seeds.push(y*width); seeds.push(y*width + width-1); }
  const seedColor = [data[0], data[1], data[2]];
  seeds.forEach(idx => { if (!visited[idx]) { visited[idx] = 1; queue.push(idx); } });
  while (queue.length) {
    const idx = queue.pop(), di = idx * 4;
    if (data[di+3] < 10) continue;
    if (Math.abs(data[di]-seedColor[0]) + Math.abs(data[di+1]-seedColor[1]) + Math.abs(data[di+2]-seedColor[2]) > threshold * 3) continue;
    data[di+3] = 0;
    const x = idx % width, y = Math.floor(idx / width);
    [x>0?idx-1:-1, x<width-1?idx+1:-1, y>0?idx-width:-1, y<height-1?idx+width:-1].forEach(n => { if (n >= 0 && !visited[n]) { visited[n] = 1; queue.push(n); } });
  }
  ctx.putImageData(imageData, 0, 0);
  window.appState.resultImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  renderCanvas();
}

let pickingColor = false;
function removeByColor() { pickingColor = true; document.getElementById('mainCanvas').title = 'Нажмите на цвет для удаления'; showThreshold(); }

function handleColorPick(e) {
  if (!pickingColor) return;
  pickingColor = false; document.getElementById('mainCanvas').title = '';
  const canvas = document.getElementById('mainCanvas'), rect = canvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) * canvas.width / rect.width);
  const y = Math.floor((e.clientY - rect.top) * canvas.height / rect.height);
  const ctx = canvas.getContext('2d'), imageData = ctx.getImageData(0, 0, canvas.width, canvas.height), data = imageData.data;
  const idx = (y * canvas.width + x) * 4;
  const targetR = data[idx], targetG = data[idx+1], targetB = data[idx+2];
  const threshold = parseInt(document.getElementById('thresholdSlider').value) * 2;
  saveStateForUndo();
  for (let i = 0; i < data.length; i += 4) {
    if (data[i+3] < 10) continue;
    if (Math.abs(data[i]-targetR) + Math.abs(data[i+1]-targetG) + Math.abs(data[i+2]-targetB) <= threshold) data[i+3] = 0;
  }
  ctx.putImageData(imageData, 0, 0);
  window.appState.resultImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  renderCanvas();
}

function removeWhite() {
  if (!window.appState.originalImage) return;
  showThreshold('thresholdLabel', 'Порог белого'); saveStateForUndo();
  const canvas = document.getElementById('mainCanvas'), ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height), data = imageData.data;
  const t = 255 - parseInt(document.getElementById('thresholdSlider').value) * 2;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] >= t && data[i+1] >= t && data[i+2] >= t) {
      data[i+3] = Math.round(Math.max(0, 1 - (Math.min(data[i],data[i+1],data[i+2]) - t) / (255 - t + 0.001)) * data[i+3]);
    }
  }
  ctx.putImageData(imageData, 0, 0);
  window.appState.resultImageData = ctx.getImageData(0, 0, canvas.width, canvas.height); renderCanvas();
}

function removeDark() {
  if (!window.appState.originalImage) return;
  showThreshold('thresholdLabel', 'Порог тёмного'); saveStateForUndo();
  const canvas = document.getElementById('mainCanvas'), ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height), data = imageData.data;
  const t = parseInt(document.getElementById('thresholdSlider').value) * 2;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] <= t && data[i+1] <= t && data[i+2] <= t) {
      data[i+3] = Math.round((Math.max(data[i],data[i+1],data[i+2]) / (t + 0.001)) * data[i+3]);
    }
  }
  ctx.putImageData(imageData, 0, 0);
  window.appState.resultImageData = ctx.getImageData(0, 0, canvas.width, canvas.height); renderCanvas();
}

function showThreshold(labelId, labelText) {
  document.getElementById('thresholdRow').classList.remove('hidden');
  if (labelId && labelText) document.getElementById(labelId).textContent = labelText;
}
function updateThresholdLabel() { document.getElementById('thresholdValue').textContent = document.getElementById('thresholdSlider').value; }

function updateEdge() {
  document.getElementById('featherVal').textContent = document.getElementById('featherSlider').value;
  document.getElementById('expandVal').textContent = document.getElementById('expandSlider').value;
  document.getElementById('defringeVal').textContent = document.getElementById('defringeSlider').value;
}

function applyEdge() {
  if (!window.appState.resultImageData) return;
  const feather = parseInt(document.getElementById('featherSlider').value);
  const expand = parseInt(document.getElementById('expandSlider').value);
  const defringe = parseInt(document.getElementById('defringeSlider').value);
  saveStateForUndo();
  const canvas = document.getElementById('mainCanvas'), ctx = canvas.getContext('2d');
  let imageData = new ImageData(new Uint8ClampedArray(window.appState.resultImageData.data), window.appState.resultImageData.width, window.appState.resultImageData.height);
  if (expand !== 0) imageData = morphologicalOp(imageData, expand);
  if (feather > 0) imageData = featherEdges(imageData, feather);
  if (defringe > 0) imageData = defringeEdges(imageData, defringe);
  ctx.putImageData(imageData, 0, 0);
  window.appState.resultImageData = ctx.getImageData(0, 0, canvas.width, canvas.height); renderCanvas();
}

function featherEdges(imageData, radius) {
  const { width, height, data } = imageData;
  const alpha = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) alpha[i] = data[i*4+3] / 255;
  const blurred = boxBlurAlpha(alpha, width, height, radius);
  const result = new ImageData(new Uint8ClampedArray(data), width, height);
  for (let i = 0; i < width * height; i++) result.data[i*4+3] = Math.round(blurred[i] * 255);
  return result;
}

function boxBlurAlpha(alpha, width, height, radius) {
  const temp = new Float32Array(alpha.length), r = Math.max(1, radius), size = 2 * r + 1;
  for (let y = 0; y < height; y++) {
    let sum = 0;
    for (let x = -r; x < r; x++) sum += alpha[y*width + Math.max(0, x)];
    for (let x = 0; x < width; x++) {
      sum += (x+r < width ? alpha[y*width+x+r] : alpha[y*width+width-1]) - (x-r-1 >= 0 ? alpha[y*width+x-r-1] : alpha[y*width]);
      temp[y*width+x] = sum / size;
    }
  }
  const out = new Float32Array(alpha.length);
  for (let x = 0; x < width; x++) {
    let sum = 0;
    for (let y = -r; y < r; y++) sum += temp[Math.max(0,y)*width+x];
    for (let y = 0; y < height; y++) {
      sum += (y+r < height ? temp[(y+r)*width+x] : temp[(height-1)*width+x]) - (y-r-1 >= 0 ? temp[(y-r-1)*width+x] : temp[x]);
      out[y*width+x] = sum / size;
    }
  }
  return out;
}

function morphologicalOp(imageData, amount) {
  const { width, height, data } = imageData;
  const result = new ImageData(new Uint8ClampedArray(data), width, height);
  const r = Math.abs(amount), expand = amount > 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let best = data[(y*width+x)*4+3];
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (dx*dx+dy*dy > r*r) continue;
        const a = data[(Math.max(0,Math.min(height-1,y+dy))*width+Math.max(0,Math.min(width-1,x+dx)))*4+3];
        if (expand ? a > best : a < best) best = a;
      }
      result.data[(y*width+x)*4+3] = best;
    }
  }
  return result;
}

function defringeEdges(imageData, radius) {
  const { width, height, data } = imageData;
  const result = new ImageData(new Uint8ClampedArray(data), width, height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const idx = (y*width+x)*4;
    if (data[idx+3] < 200 && data[idx+3] > 0) {
      let sr=0,sg=0,sb=0,cnt=0;
      for (let dy=-radius;dy<=radius;dy++) for (let dx=-radius;dx<=radius;dx++) {
        const ni=(Math.max(0,Math.min(height-1,y+dy))*width+Math.max(0,Math.min(width-1,x+dx)))*4;
        if (data[ni+3]>200) { sr+=data[ni]; sg+=data[ni+1]; sb+=data[ni+2]; cnt++; }
      }
      if (cnt>0) { result.data[idx]=Math.round(sr/cnt); result.data[idx+1]=Math.round(sg/cnt); result.data[idx+2]=Math.round(sb/cnt); }
    }
  }
  return result;
}

let brushMode = 'erase', isDrawing = false, lastX = 0, lastY = 0;

function setBrushMode(mode) {
  brushMode = mode;
  document.getElementById('brushRestore').classList.toggle('active', mode === 'restore');
  document.getElementById('brushErase').classList.toggle('active', mode === 'erase');
}

function toggleMaskView() { renderCanvas(); }

function initBrush(canvas) {
  canvas.addEventListener('mousedown', (e) => {
    if (pickingColor) { handleColorPick(e); return; }
    isDrawing = true; const [x, y] = getCanvasCoords(e, canvas); lastX = x; lastY = y; brushStroke(canvas, x, y, x, y);
  });
  canvas.addEventListener('mousemove', (e) => {
    if (!isDrawing) return; const [x, y] = getCanvasCoords(e, canvas); brushStroke(canvas, lastX, lastY, x, y); lastX = x; lastY = y;
  });
  canvas.addEventListener('mouseup', () => {
    if (isDrawing) { isDrawing = false; const c = document.getElementById('mainCanvas'); window.appState.resultImageData = c.getContext('2d').getImageData(0,0,c.width,c.height); }
  });
  canvas.addEventListener('mouseleave', () => { isDrawing = false; });
}

function getCanvasCoords(e, canvas) {
  const rect = canvas.getBoundingClientRect();
  return [(e.clientX-rect.left)*canvas.width/rect.width, (e.clientY-rect.top)*canvas.height/rect.height];
}

function brushStroke(canvas, x1, y1, x2, y2) {
  const ctx = canvas.getContext('2d');
  const size = parseInt(document.getElementById('brushSize').value);
  const softness = parseInt(document.getElementById('brushSoftness').value) / 100;
  const innerRadius = size * (1 - softness);
  const dx = x2-x1, dy = y2-y1, dist = Math.sqrt(dx*dx+dy*dy) || 1;
  const steps = Math.ceil(dist/(size*0.25)) + 1;
  for (let s = 0; s <= steps; s++) {
    const t = s/steps, cx = x1+dx*t, cy = y1+dy*t;
    const sx = Math.floor(cx-size), sy = Math.floor(cy-size), sw = size*2, sh = size*2;
    if (sx<0||sy<0||sx+sw>canvas.width||sy+sh>canvas.height) continue;
    const imageData = ctx.getImageData(sx,sy,sw,sh), d = imageData.data;
    for (let py = 0; py < sh; py++) for (let px = 0; px < sw; px++) {
      const ex=px-size, ey=py-size, d2=Math.sqrt(ex*ex+ey*ey);
      if (d2>size) continue;
      const opacity = d2<=innerRadius ? 1 : 1-(d2-innerRadius)/(size-innerRadius+0.001);
      const idx=(py*sw+px)*4;
      if (brushMode==='erase') {
        d[idx+3] = Math.max(0, d[idx+3]-Math.round(opacity*20));
      } else if (window.appState.originalData) {
        const gx=Math.round(cx-size+px), gy=Math.round(cy-size+py);
        if (gx>=0&&gx<canvas.width&&gy>=0&&gy<canvas.height) {
          const oi=(gy*canvas.width+gx)*4;
          d[idx]=window.appState.originalData[oi]; d[idx+1]=window.appState.originalData[oi+1]; d[idx+2]=window.appState.originalData[oi+2];
          d[idx+3]=Math.min(255,d[idx+3]+Math.round(opacity*20));
        }
      }
    }
    ctx.putImageData(imageData, sx, sy);
  }
}

let upscaleScale = 2, preUpscaleImage = null;

function setScale(s) {
  upscaleScale = s; [2,4,8].forEach(v => document.getElementById(`scale${v}x`).classList.toggle('active', v===s));
}

async function upscaleImage() {
  const key = localStorage.getItem('replicateKey');
  if (!key) { alert('Укажите Replicate API Key в настройках'); return; }
  if (!window.appState.originalImage) return;
  const btn = document.getElementById('upscaleBtn'), progress = document.getElementById('upscaleProgress');
  const fill = document.getElementById('upscaleProgressFill'), status = document.getElementById('upscaleStatus');
  btn.disabled = true; progress.classList.remove('hidden');
  const sp = (pct, text) => { fill.style.width = pct+'%'; status.textContent = text; };
  try {
    sp(10, 'Подготовка...');
    const canvas = document.createElement('canvas');
    canvas.width = window.appState.originalImage.width; canvas.height = window.appState.originalImage.height;
    canvas.getContext('2d').drawImage(window.appState.originalImage, 0, 0);
    const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
    const base64 = await new Promise((res,rej) => { const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(blob); });
    sp(20, 'Отправка...');
    const resp = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST', headers: {'Authorization':`Token ${key}`,'Content-Type':'application/json'},
      body: JSON.stringify({ version: 'nightmareai/real-esrgan:42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b', input: { image: base64, scale: upscaleScale, face_enhance: false } })
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const prediction = await resp.json();
    sp(30, 'Обработка...');
    let result;
    for (let i = 0; i < 60; i++) {
      await new Promise(res => setTimeout(res, 2000));
      const r = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {headers:{'Authorization':`Token ${key}`}});
      const data = await r.json();
      if (data.status==='succeeded') { result=data.output; break; }
      if (data.status==='failed') throw new Error(data.error||'Replicate failed');
      sp(30+i, `Обработка... (${data.status})`);
    }
    if (!result) throw new Error('Timeout');
    sp(90, 'Загрузка...');
    preUpscaleImage = window.appState.originalImage;
    const img = new Image(); img.crossOrigin='anonymous';
    img.onload = () => {
      window.appState.originalImage = img;
      const c = document.getElementById('mainCanvas');
      c.width=img.width; c.height=img.height; c.getContext('2d').drawImage(img,0,0);
      window.appState.originalData = c.getContext('2d').getImageData(0,0,c.width,c.height).data;
      window.appState.resultImageData = null;
      sp(100,'Готово!'); document.getElementById('rollbackUpscaleBtn').classList.remove('hidden');
      updateFileInfo(); setTimeout(()=>progress.classList.add('hidden'),1500);
    };
    img.src = result;
  } catch (e) { alert('Ошибка апскейла: '+e.message); progress.classList.add('hidden'); }
  btn.disabled = false;
}

function rollbackUpscale() {
  if (!preUpscaleImage) return;
  window.appState.originalImage = preUpscaleImage;
  const c = document.getElementById('mainCanvas');
  c.width=preUpscaleImage.width; c.height=preUpscaleImage.height; c.getContext('2d').drawImage(preUpscaleImage,0,0);
  window.appState.originalData = c.getContext('2d').getImageData(0,0,c.width,c.height).data;
  window.appState.resultImageData = null; preUpscaleImage = null;
  document.getElementById('rollbackUpscaleBtn').classList.add('hidden');
  updateFileInfo(); renderCanvas();
}