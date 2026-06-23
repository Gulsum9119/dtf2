async function analyzeWithGemini(imageDataURL) {
  const key = localStorage.getItem('geminiKey');
  const section = document.getElementById('analysisSection');
  const spinner = document.getElementById('analysisSpinner');
  const card = document.getElementById('analysisCard');
  const errEl = document.getElementById('analysisError');

  section.classList.remove('hidden');
  spinner.classList.remove('hidden');
  card.classList.add('hidden');
  errEl.classList.add('hidden');

  if (!key) {
    spinner.classList.add('hidden');
    errEl.textContent = 'Gemini API Key не указан в настройках';
    errEl.classList.remove('hidden');
    document.getElementById('retryAnalysisBtn').classList.remove('hidden');
    return;
  }
  document.getElementById('retryAnalysisBtn').classList.add('hidden');

  try {
    const base64 = imageDataURL.split(',')[1];
    const mimeType = imageDataURL.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';

    const prompt = `Ты — эксперт по подготовке изображений для DTF-печати. Проанализируй изображение и ответь ТОЛЬКО в формате JSON:
{
  "verdict": "готово к печати" | "желательно улучшить качество" | "требуется доработка" | "непригодно",
  "dpi_status": "отличное (300+)" | "низкое (150-299)" | "критично (<150)",
  "background": "прозрачный" | "белый" | "сложный" | "градиентный",
  "watermark": "есть" | "нет"
}
Отвечай только JSON, без пояснений.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeType, data: base64 } }
            ]
          }]
        })
      }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Не удалось разобрать ответ');

    const result = JSON.parse(jsonMatch[0]);
    displayAnalysis(result);
  } catch (e) {
    spinner.classList.add('hidden');
    errEl.textContent = 'Ошибка анализа: ' + e.message;
    errEl.classList.remove('hidden');
    document.getElementById('retryAnalysisBtn').classList.remove('hidden');
  }
}

function retryAnalysis() {
  if (!window.appState.originalImage) return;
  const tmpCanvas = document.createElement('canvas');
  tmpCanvas.width = window.appState.originalImage.width;
  tmpCanvas.height = window.appState.originalImage.height;
  tmpCanvas.getContext('2d').drawImage(window.appState.originalImage, 0, 0);
  analyzeWithGemini(tmpCanvas.toDataURL('image/png'));
}

function displayAnalysis(result) {
  document.getElementById('analysisSpinner').classList.add('hidden');
  const card = document.getElementById('analysisCard');
  card.classList.remove('hidden');

  const verdictEl = document.getElementById('aVerdict');
  verdictEl.textContent = result.verdict;
  verdictEl.className = 'analysis-value';
  if (result.verdict?.includes('готово')) verdictEl.classList.add('verdict-ready');
  else if (result.verdict?.includes('улучшить')) verdictEl.classList.add('verdict-improve');
  else if (result.verdict?.includes('доработка')) verdictEl.classList.add('verdict-required');
  else verdictEl.classList.add('verdict-bad');

  document.getElementById('aDpi').textContent = result.dpi_status || '—';
  document.getElementById('aBg').textContent = result.background || '—';
  document.getElementById('aWatermark').textContent = result.watermark || '—';
}

async function testAPIs() {
  const geminiKey = document.getElementById('geminiKey').value;
  const removeBgKey = document.getElementById('removeBgKey').value;
  const replicateKey = document.getElementById('replicateKey').value;
  const resultEl = document.getElementById('apiTestResult');
  resultEl.classList.remove('hidden');
  resultEl.textContent = 'Проверка...';

  const results = [];

  // Test Gemini
  if (geminiKey) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`);
      results.push(r.ok ? '✅ Gemini API: OK' : `❌ Gemini API: HTTP ${r.status}`);
    } catch { results.push('❌ Gemini API: Ошибка сети'); }
  } else { results.push('⚠️ Gemini API: Ключ не указан'); }

  // Test remove.bg (can only check with actual image)
  if (removeBgKey) {
    results.push('⚠️ remove.bg: Проверка только при использовании');
  } else { results.push('⚠️ remove.bg: Ключ не указан'); }

  // Test Replicate
  if (replicateKey) {
    try {
      const r = await fetch('https://api.replicate.com/v1/models', {
        headers: { 'Authorization': `Token ${replicateKey}` }
      });
      results.push(r.ok ? '✅ Replicate API: OK' : `❌ Replicate API: HTTP ${r.status}`);
    } catch { results.push('❌ Replicate API: Ошибка сети'); }
  } else { results.push('⚠️ Replicate API: Ключ не указан'); }

  resultEl.textContent = results.join('\n');
}
