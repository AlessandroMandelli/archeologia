const ROWS_INITIAL = 38;
const STORAGE_KEY = 'ceramic-summary-form-current';

const body = document.getElementById('countBody');
const statusEl = document.getElementById('status');
const canvas = document.getElementById('sketchCanvas');
const wrap = document.getElementById('canvasWrap');
const ctx = canvas.getContext('2d');
const penSize = document.getElementById('penSize');

let drawing = false;
let last = null;
let strokes = [];
let currentStroke = [];
let autosaveTimer = null;

function setStatus(text){
  statusEl.textContent = text;
  clearTimeout(setStatus._t);
  setStatus._t = setTimeout(() => statusEl.textContent = 'Pronto', 1800);
}

function makeRow(index, values = {}){
  const tr = document.createElement('tr');
  const fields = ['typeForm','rims','handles','feet','bodies'];
  fields.forEach((field) => {
    const td = document.createElement('td');
    const input = document.createElement('input');
    input.type = field === 'typeForm' ? 'text' : 'number';
    input.inputMode = field === 'typeForm' ? 'text' : 'numeric';
    input.dataset.row = index;
    input.dataset.col = field;
    input.value = values[field] ?? '';
    input.addEventListener('input', scheduleAutosave);
    td.appendChild(input);
    tr.appendChild(td);
  });
  return tr;
}

function addRows(n = 5, rowsData = null){
  const start = body.children.length;
  for(let i = 0; i < n; i++){
    body.appendChild(makeRow(start + i, rowsData ? rowsData[i] : {}));
  }
  resizeCanvas(false);
  scheduleAutosave();
}

function resizeCanvas(keepDrawing = true){
  const oldData = keepDrawing ? canvas.toDataURL('image/png') : null;
  const rect = wrap.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(rect.width * ratio));
  canvas.height = Math.max(1, Math.floor(rect.height * ratio));
  canvas.style.width = rect.width + 'px';
  canvas.style.height = rect.height + 'px';
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#000';
  if(oldData){
    const img = new Image();
    img.onload = () => ctx.drawImage(img, 0, 0, rect.width, rect.height);
    img.src = oldData;
  } else {
    redrawStrokes();
  }
}

function pointFromEvent(e){
  const rect = canvas.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
    w: Number(penSize.value)
  };
}

function drawSegment(a, b){
  ctx.lineWidth = b.w || Number(penSize.value);
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
}

function redrawStrokes(){
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for(const stroke of strokes){
    for(let i = 1; i < stroke.length; i++) drawSegment(stroke[i - 1], stroke[i]);
  }
}

canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  canvas.setPointerCapture(e.pointerId);
  drawing = true;
  last = pointFromEvent(e);
  currentStroke = [last];
});

canvas.addEventListener('pointermove', (e) => {
  if(!drawing) return;
  e.preventDefault();
  const p = pointFromEvent(e);
  drawSegment(last, p);
  currentStroke.push(p);
  last = p;
});

function endStroke(){
  if(drawing && currentStroke.length){
    strokes.push(currentStroke);
    scheduleAutosave();
  }
  drawing = false;
  last = null;
  currentStroke = [];
}

canvas.addEventListener('pointerup', endStroke);
canvas.addEventListener('pointercancel', endStroke);
canvas.addEventListener('pointerleave', endStroke);

document.querySelectorAll('[data-field]').forEach((el) => el.addEventListener('input', scheduleAutosave));

function collectData(){
  const rows = [...body.querySelectorAll('tr')].map((tr) => {
    const obj = {};
    tr.querySelectorAll('input').forEach((input) => obj[input.dataset.col] = input.value);
    return obj;
  });
  return {
    schema: 'ceramic-summary-form-pwa-v1',
    savedAt: new Date().toISOString(),
    header: {
      area: document.getElementById('area').value,
      stratUnit: document.getElementById('stratUnit').value,
      room: document.getElementById('room').value
    },
    rows,
    remarks: document.getElementById('remarks').value,
    sketchPng: canvas.toDataURL('image/png'),
    strokes
  };
}

function loadData(data){
  document.getElementById('area').value = data.header?.area || '';
  document.getElementById('stratUnit').value = data.header?.stratUnit || '';
  document.getElementById('room').value = data.header?.room || '';
  document.getElementById('remarks').value = data.remarks || '';
  body.innerHTML = '';
  const rows = Array.isArray(data.rows) && data.rows.length ? data.rows : [];
  if(rows.length){ addRows(rows.length, rows); } else { addRows(ROWS_INITIAL); }
  strokes = Array.isArray(data.strokes) ? data.strokes : [];
  resizeCanvas(false);
  if(data.sketchPng){
    const img = new Image();
    img.onload = () => {
      const rect = canvas.getBoundingClientRect();
      ctx.drawImage(img, 0, 0, rect.width, rect.height);
    };
    img.src = data.sketchPng;
  }
  setStatus('Dati caricati');
  scheduleAutosave();
}

function clearForm(){
  document.getElementById('area').value = '';
  document.getElementById('stratUnit').value = '';
  document.getElementById('room').value = '';
  document.getElementById('remarks').value = '';
  body.innerHTML = '';
  strokes = [];
  addRows(ROWS_INITIAL);
  resizeCanvas(false);
  localStorage.removeItem(STORAGE_KEY);
  setStatus('Nuova scheda');
}

function safeNamePart(s){
  return String(s || '').trim().replace(/[^a-z0-9_-]+/gi, '_').replace(/^_+|_+$/g, '') || 'scheda';
}

function downloadBlob(blob, filename){
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 500);
}

function saveLocal(showStatus = true){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(collectData()));
  if(showStatus) setStatus('Salvato locale');
}

function loadLocal(){
  const raw = localStorage.getItem(STORAGE_KEY);
  if(!raw){
    setStatus('Nessun salvataggio locale');
    return;
  }
  try{
    loadData(JSON.parse(raw));
  }catch(err){
    alert('Salvataggio locale non leggibile.');
  }
}

function scheduleAutosave(){
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => saveLocal(false), 600);
}

document.getElementById('newBtn').addEventListener('click', () => {
  if(confirm('Creare una nuova scheda e cancellare i dati correnti?')) clearForm();
});

document.getElementById('addRowsBtn').addEventListener('click', () => addRows(5));

document.getElementById('undoBtn').addEventListener('click', () => {
  strokes.pop();
  redrawStrokes();
  setStatus('Ultimo tratto rimosso');
  scheduleAutosave();
});

document.getElementById('clearSketchBtn').addEventListener('click', () => {
  if(confirm('Pulire completamente lo schizzo?')){
    strokes = [];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setStatus('Schizzo pulito');
    scheduleAutosave();
  }
});

document.getElementById('saveLocalBtn').addEventListener('click', () => saveLocal(true));
document.getElementById('loadLocalBtn').addEventListener('click', loadLocal);

document.getElementById('saveJsonBtn').addEventListener('click', () => {
  const data = collectData();
  const filename = `ceramic_${safeNamePart(data.header.area)}_${safeNamePart(data.header.stratUnit)}_${safeNamePart(data.header.room)}.json`;
  downloadBlob(new Blob([JSON.stringify(data, null, 2)], {type:'application/json'}), filename);
  setStatus('JSON esportato');
});

document.getElementById('jsonInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if(!file) return;
  try{
    const text = await file.text();
    loadData(JSON.parse(text));
  }catch(err){
    alert('JSON non valido o non leggibile.');
  } finally {
    e.target.value = '';
  }
});

document.getElementById('savePdfBtn').addEventListener('click', () => {
  saveLocal(false);
  setStatus('Apertura stampa PDF...');
  window.print();
});

window.addEventListener('resize', () => resizeCanvas(true));

if('serviceWorker' in navigator){
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  });
}

addRows(ROWS_INITIAL);
setTimeout(() => {
  resizeCanvas(false);
  if(localStorage.getItem(STORAGE_KEY)) setStatus('Salvataggio locale disponibile');
}, 100);
