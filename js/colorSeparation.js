function kMeans(pixels, k, maxIter = 20) {
  const step = Math.floor(pixels.length / k);
  let centroids = Array.from({length: k}, (_, i) => [...pixels[(i * step) % pixels.length]]);
  let assignments = new Array(pixels.length).fill(0);
  for (let iter = 0; iter < maxIter; iter++) {
    let changed = false;
    for (let i = 0; i < pixels.length; i++) {
      const p = pixels[i];
      let best = 0, bestDist = Infinity;
      for (let j = 0; j < k; j++) {
        const c = centroids[j];
        const d = (p[0]-c[0])**2 + (p[1]-c[1])**2 + (p[2]-c[2])**2;
        if (d < bestDist) { bestDist = d; best = j; }
      }
      if (assignments[i] !== best) { assignments[i] = best; changed = true; }
    }
    if (!changed) break;
    const sums = Array.from({length: k}, () => [0,0,0,0]);
    for (let i = 0; i < pixels.length; i++) {
      const j = assignments[i];
      sums[j][0] += pixels[i][0]; sums[j][1] += pixels[i][1]; sums[j][2] += pixels[i][2]; sums[j][3]++;
    }
    for (let j = 0; j < k; j++) {
      if (sums[j][3] > 0) centroids[j] = [sums[j][0]/sums[j][3], sums[j][1]/sums[j][3], sums[j][2]/sums[j][3]];
    }
  }
  return { centroids, assignments };
}

function separateColors() {
  if (!window.appState.resultImageData) { alert('Сначала обработайте изображение (удалите фон)'); return; }
  const k = parseInt(document.getElementById('colorCount').value);
  const imageData = window.appState.resultImageData;
  const data = imageData.data;
  const pixels = [], pixelIndices = [];
  for (let i = 0; i < data.length; i += 4) {
    if (data[i+3] > 10) { pixels.push([data[i], data[i+1], data[i+2]]); pixelIndices.push(i / 4); }
  }
  if (pixels.length === 0) { alert('Нет пикселей для разделения'); return; }
  const { centroids, assignments } = kMeans(pixels, k);
  const { width, height } = imageData;
  const layers = Array.from({length: k}, () => { const c = document.createElement('canvas'); c.width = width; c.height = height; return c; });
  const ctxs = layers.map(c => c.getContext('2d'));
  const layerDatas = ctxs.map(ctx => ctx.createImageData(width, height));
  for (let pi = 0; pi < pixelIndices.length; pi++) {
    const pixIdx = pixelIndices[pi], cluster = assignments[pi];
    const ld = layerDatas[cluster].data, di = pixIdx * 4;
    ld[di] = data[di]; ld[di+1] = data[di+1]; ld[di+2] = data[di+2]; ld[di+3] = data[di+3];
  }
  layerDatas.forEach((ld, i) => ctxs[i].putImageData(ld, 0, 0));
  window.appState.colorLayers = layers.map((canvas, i) => ({ canvas, color: centroids[i], visible: true }));
  renderColorLayers();
  switchTab('colors');
}

function renderColorLayers() {
  const grid = document.getElementById('colorLayersGrid');
  grid.innerHTML = '';
  (window.appState.colorLayers || []).forEach((layer, i) => {
    const [r, g, b] = layer.color.map(Math.round);
    const hex = '#' + [r,g,b].map(v => v.toString(16).padStart(2,'0')).join('');
    const card = document.createElement('div');
    card.className = 'color-layer-card';
    const img = document.createElement('img');
    img.className = 'color-layer-preview'; img.src = layer.canvas.toDataURL();
    card.appendChild(img);
    const footer = document.createElement('div'); footer.className = 'color-layer-footer';
    const swatch = document.createElement('div'); swatch.className = 'color-swatch'; swatch.style.background = hex;
    const btns = document.createElement('div'); btns.className = 'color-layer-btns';
    const exportBtn = document.createElement('button'); exportBtn.className = 'color-layer-btn'; exportBtn.textContent = 'PNG'; exportBtn.onclick = () => exportLayer(i);
    const toggleBtn = document.createElement('button'); toggleBtn.className = 'color-layer-btn';
    toggleBtn.textContent = layer.visible ? 'Скрыть' : 'Показать';
    toggleBtn.onclick = () => toggleLayer(i, toggleBtn);
    btns.appendChild(toggleBtn); btns.appendChild(exportBtn);
    footer.appendChild(swatch); footer.appendChild(btns);
    card.appendChild(footer); grid.appendChild(card);
  });
}

function exportLayer(i) {
  const layer = window.appState.colorLayers[i];
  const a = document.createElement('a'); a.href = layer.canvas.toDataURL('image/png'); a.download = `layer_${i+1}.png`; a.click();
}

function toggleLayer(i, btn) {
  const layer = window.appState.colorLayers[i]; layer.visible = !layer.visible;
  btn.textContent = layer.visible ? 'Скрыть' : 'Показать';
  btn.closest('.color-layer-card').querySelector('img').style.opacity = layer.visible ? '1' : '0.2';
}