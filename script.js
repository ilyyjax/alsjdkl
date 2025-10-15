/* script.js
   - Handles:
     * tab switching
     * live updates of the SVG
     * randomize
     * save / load (localStorage)
     * export PNG (serialize SVG -> draw to canvas -> download)
     * particles background and small UI polish: theme toggle, music toggle
*/

/* ========= utility helpers ========= */
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,8);

/* ========= element refs ========= */
const loader = $('#loader');
const app = $('#app');
const svg = $('#characterSVG');
const face = $('#face');
const bgRect = $('#bgRect');
const hairShort = $('#hairShort');
const hairLong = $('#hairLong');
const hairPony = $('#hairPony');
const shirt = $('#shirt');
const pupilL = $('#pupilL');
const pupilR = $('#pupilR');
const mouthSmile = $('#mouthSmile');
const mouthFrown = $('#mouthFrown');
const mouthOpen = $('#mouthOpen');
const eyesNormal = $('#eyesNormal');
const eyesClosed = $('#eyesClosed');
const glasses = $('#glasses');
const hat = $('#hat');
const previewBg = $('#previewBg');
const charStage = $('#charStage');

/* ========= initial state ========= */
let state = {
  skinColor: '#F6D6B2',
  faceWidth: 90,
  mouth: 'smile',
  hairStyle: 'short',
  hairColor: '#2F2F2F',
  hairShine: 0.2,
  eyeColor: '#1A1A1A',
  eyeType: 'normal',
  pupilSize: 6,
  shirtColor: '#6C9BD8',
  shirtPattern: 'solid',
  glasses: false,
  hat: false,
  accColor: '#222222',
  bgColor: '#EAF6FF',
  bgGradient: 'soft',
  particleDensity: 8,
  poseMood: 'relaxed',
  smoothTransitions: true
};

/* ========= storage keys ========= */
const STORAGE_KEY = 'cc_saves_v1';

/* ========= loader intro ========= */
window.addEventListener('load', () => {
  // small intro animation: fade loader, show app
  setTimeout(()=> {
    loader.style.opacity = 0;
    loader.style.transform = 'translateY(-10px)';
    setTimeout(()=> loader.remove(), 500);
  }, 800);

  // init UI
  initUI();
  applyStateToSVG();
  renderParticles();
});

/* ========= UI initialization ========= */
function initUI(){
  // Tabs
  $$('.tab').forEach(btn => {
    btn.addEventListener('click', e => {
      $$('.tab').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      const name = btn.dataset.tab;
      $$('.tab-content').forEach(tc => tc.classList.remove('active'));
      $(`#tab-${name}`).classList.add('active');
    });
  });

  // Inputs -> state
  $('#skinColor').addEventListener('input', e => { state.skinColor = e.target.value; applyStateToSVG(); });
  $('#faceWidth').addEventListener('input', e => { state.faceWidth = +e.target.value; applyStateToSVG(); });
  $('#mouthSelect').addEventListener('change', e => { state.mouth = e.target.value; applyStateToSVG(); });

  $('#hairStyle').addEventListener('change', e => { state.hairStyle = e.target.value; applyStateToSVG(); });
  $('#hairColor').addEventListener('input', e => { state.hairColor = e.target.value; applyStateToSVG(); });
  $('#hairShine').addEventListener('input', e => { state.hairShine = +e.target.value; applyStateToSVG(); });

  $('#eyeColor').addEventListener('input', e => { state.eyeColor = e.target.value; applyStateToSVG(); });
  $('#eyeType').addEventListener('change', e => { state.eyeType = e.target.value; applyStateToSVG(); });
  $('#pupilSize').addEventListener('input', e => { state.pupilSize = +e.target.value; applyStateToSVG(); });

  $('#shirtColor').addEventListener('input', e => { state.shirtColor = e.target.value; applyStateToSVG(); });
  $('#shirtPattern').addEventListener('change', e => { state.shirtPattern = e.target.value; applyStateToSVG(); });

  $('#toggleGlasses').addEventListener('change', e => { state.glasses = e.target.checked; applyStateToSVG(); });
  $('#toggleHat').addEventListener('change', e => { state.hat = e.target.checked; applyStateToSVG(); });
  $('#accColor').addEventListener('input', e => { state.accColor = e.target.value; applyStateToSVG(); });

  $('#bgColor').addEventListener('input', e => { state.bgColor = e.target.value; applyStateToSVG(); });
  $('#bgGradient').addEventListener('change', e => { state.bgGradient = e.target.value; applyStateToSVG(); });
  $('#particleDensity').addEventListener('input', e => { state.particleDensity = +e.target.value; renderParticles(); });

  $('#poseMood').addEventListener('change', e => { state.poseMood = e.target.value; applyStateToSVG(); });
  $('#smoothTransitions').addEventListener('change', e => { state.smoothTransitions = e.target.checked; toggleTransitions(); });

  // top controls
  $('#randomBtn').addEventListener('click', randomizeSmall);
  $('#randomizeAll').addEventListener('click', randomizeAll);
  $('#saveBtn').addEventListener('click', saveCurrent);
  $('#loadBtn').addEventListener('click', openSavesModal);
  $('#downloadBtn').addEventListener('click', downloadPNG);

  // modal
  $('#closeModal').addEventListener('click', closeModal);
  $('#clearSaves').addEventListener('click', clearSaves);

  // theme toggle
  $('#toggleTheme').addEventListener('click', toggleTheme);

  // music control (optional)
  $('#playMusic').addEventListener('click', toggleMusic);
  // import / export
  $('#exportJson').addEventListener('click', exportJSON);
  $('#importJsonBtn').addEventListener('click', ()=> $('#importFile').click());
  $('#importFile').addEventListener('change', handleImportFile);

  // downloads & drag interactions: allow pan and zoom
  setupStageInteractivity();
  toggleTransitions();
}

/* ========= transitions control ========= */
function toggleTransitions(){
  const toggled = state.smoothTransitions;
  // toggle CSS transitions on svg.transitionable elements
  const elems = svg.querySelectorAll('.transitionable');
  elems.forEach(el => el.style.transition = toggled ? '' : 'none');
}

/* ========= apply state to SVG ========= */
function applyStateToSVG(){
  // skin
  face.setAttribute('fill', state.skinColor);
  // face width adjust via rx/ry since it's ellipse
  face.setAttribute('rx', state.faceWidth);
  face.setAttribute('ry', Math.round(state.faceWidth * 1.05));

  // mouth
  [mouthSmile, mouthFrown, mouthOpen].forEach(m => m.classList.add('hidden'));
  if (state.mouth === 'smile') mouthSmile.classList.remove('hidden');
  else if (state.mouth === 'frown') mouthFrown.classList.remove('hidden');
  else mouthOpen.classList.remove('hidden');

  // hair style
  [hairShort, hairLong, hairPony].forEach(h => h.classList.add('hidden'));
  if (state.hairStyle === 'short') hairShort.classList.remove('hidden');
  if (state.hairStyle === 'long') hairLong.classList.remove('hidden');
  if (state.hairStyle === 'ponytail') hairPony.classList.remove('hidden');

  // hair color and shine (simulate by mixing color with a lighter overlay using opacity)
  [hairShort, hairLong, hairPony].forEach(h=>{
    h.setAttribute('fill', state.hairColor);
    h.style.opacity = 1 - (state.hairShine * 0.4);
  });

  // eyes
  pupilL.setAttribute('fill', state.eyeColor);
  pupilR.setAttribute('fill', state.eyeColor);
  pupilL.setAttribute('r', state.pupilSize);
  pupilR.setAttribute('r', state.pupilSize);
  if (state.eyeType === 'normal') { eyesNormal.classList.remove('hidden'); eyesClosed.classList.add('hidden'); }
  else { eyesNormal.classList.add('hidden'); eyesClosed.classList.remove('hidden'); }

  // shirt
  shirt.setAttribute('fill', state.shirtColor);
  shirt.classList.remove('pattern-stripe','pattern-gradient');
  if (state.shirtPattern === 'stripe') shirt.classList.add('pattern-stripe');
  if (state.shirtPattern === 'gradient') shirt.classList.add('pattern-gradient');

  // accessories
  glasses.style.display = state.glasses ? 'inline' : 'none';
  hat.style.display = state.hat ? 'inline' : 'none';
  [glasses, hat].forEach(a => a.setAttribute('fill', state.accColor));

  // background
  bgRect.setAttribute('fill', state.bgColor);
  // gradient styles via previewBg element
  if (state.bgGradient === 'soft'){
    previewBg.style.background = `radial-gradient(800px 300px at 10% 30%, ${lighten(state.bgColor,0.25)}, transparent 10%), radial-gradient(900px 300px at 90% 80%, ${lighten(state.bgColor,0.08)}, transparent 12%)`;
  } else if (state.bgGradient === 'striped'){
    previewBg.style.background = `repeating-linear-gradient(135deg, ${state.bgColor}, ${state.bgColor} 12px, ${lighten(state.bgColor,0.06)} 12px, ${lighten(state.bgColor,0.06)} 24px)`;
  } else {
    previewBg.style.background = state.bgColor;
  }

  // pose mood modifies small transforms and micro animations
  applyPoseMood();

  // sync inputs (if state changed programmatically)
  syncInputs();
}

/* helper to brighten a hex color a bit */
function lighten(hex, amt=0.1){
  const c = hex.replace('#','');
  const num = parseInt(c,16);
  let r = (num >> 16) + Math.round(255*amt);
  let g = ((num >> 8) & 0x00FF) + Math.round(255*amt);
  let b = (num & 0x0000FF) + Math.round(255*amt);
  r = Math.min(255, r); g = Math.min(255, g); b = Math.min(255,b);
  return `rgb(${r},${g},${b})`;
}

/* pose -> group transforms */
function applyPoseMood(){
  const group = $('#poseGroup');
  group.style.transition = state.smoothTransitions ? '' : 'none';
  // reset
  group.style.transform = '';
  // moods: relaxed (slight tilt), happy (bounce), angry (tilt + scowl)
  if (state.poseMood === 'relaxed'){
    group.style.transform = 'translateY(6px) rotate(-3deg) scale(0.995)';
    // softly animate
    group.animate([{transform:'translateY(6px) rotate(-3deg) scale(0.995)'},{transform:'translateY(4px) rotate(-2deg) scale(0.998)'},{transform:'translateY(6px) rotate(-3deg) scale(0.995)'}], {duration:3000,iterations:Infinity});
  } else if (state.poseMood === 'happy'){
    group.style.transform = 'translateY(-2px) rotate(0deg)';
    group.animate([{transform:'translateY(0px)'},{transform:'translateY(-6px)'},{transform:'translateY(0px)'}], {duration:1200,iterations:Infinity, easing:'ease-in-out'});
  } else if (state.poseMood === 'angry'){
    group.style.transform = 'translateY(-2px) rotate(5deg) scale(1.01)';
    // make mouth frown
    state.mouth = 'frown';
    // short sharp wiggle
    group.animate([{transform:'translateX(-2px) rotate(5deg)'},{transform:'translateX(2px) rotate(5deg)'},{transform:'translateX(-2px) rotate(5deg)'}], {duration:280,iterations:Infinity});
  }
}

/* sync UI inputs with state (used after randomize/load) */
function syncInputs(){
  $('#skinColor').value = state.skinColor;
  $('#faceWidth').value = state.faceWidth;
  $('#mouthSelect').value = state.mouth;
  $('#hairStyle').value = state.hairStyle;
  $('#hairColor').value = state.hairColor;
  $('#hairShine').value = state.hairShine;
  $('#eyeColor').value = state.eyeColor;
  $('#eyeType').value = state.eyeType;
  $('#pupilSize').value = state.pupilSize;
  $('#shirtColor').value = state.shirtColor;
  $('#shirtPattern').value = state.shirtPattern;
  $('#toggleGlasses').checked = state.glasses;
  $('#toggleHat').checked = state.hat;
  $('#accColor').value = state.accColor;
  $('#bgColor').value = state.bgColor;
  $('#bgGradient').value = state.bgGradient;
  $('#particleDensity').value = state.particleDensity;
  $('#poseMood').value = state.poseMood;
  $('#smoothTransitions').checked = state.smoothTransitions;
}

/* ========= Randomization ========= */
function randomHex(){
  return '#'+Math.floor(Math.random()*16777215).toString(16).padStart(6,'0');
}
function randomizeSmall(){
  state.hairColor = randomHex();
  state.shirtColor = randomHex();
  state.eyeColor = randomHex();
  applyStateToSVG();
}
function randomizeAll(){
  state.skinColor = randomHex();
  state.faceWidth = 70 + Math.floor(Math.random()*45);
  state.mouth = ['smile','open','frown'][Math.floor(Math.random()*3)];
  state.hairStyle = ['short','long','ponytail'][Math.floor(Math.random()*3)];
  state.hairColor = randomHex();
  state.hairShine = Math.random()*0.6;
  state.eyeColor = randomHex();
  state.eyeType = ['normal','closed'][Math.floor(Math.random()*2)];
  state.pupilSize = 4 + Math.floor(Math.random()*8);
  state.shirtColor = randomHex();
  state.shirtPattern = ['solid','stripe','gradient'][Math.floor(Math.random()*3)];
  state.glasses = Math.random() > 0.6;
  state.hat = Math.random() > 0.85;
  state.accColor = randomHex();
  state.bgColor = randomHex();
  state.bgGradient = ['soft','striped','none'][Math.floor(Math.random()*3)];
  state.particleDensity = Math.floor(Math.random()*28);
  state.poseMood = ['relaxed','happy','angry'][Math.floor(Math.random()*3)];
  applyStateToSVG();
}

/* ========= save / load (localStorage) ========= */
function loadSaves(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  }catch(e){
    console.warn('Failed to load saves', e);
    return [];
  }
}
function persistSaves(list){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}
function saveCurrent(){
  const saves = loadSaves();
  const entry = {
    id: uid(),
    name: `Character ${new Date().toLocaleString()}`,
    created: Date.now(),
    state: structuredClone(state)
  };
  saves.unshift(entry);
  persistSaves(saves);
  // feedback
  flashToast('Saved character');
}
function openSavesModal(){
  const overlay = $('#modalOverlay');
  const listContainer = $('#savesList');
  listContainer.innerHTML = '';
  const saves = loadSaves();
  if (!saves.length) listContainer.innerHTML = '<p class="muted">No saved characters yet. Click "Save Character" to store one locally.</p>';
  saves.forEach(s=>{
    const div = document.createElement('div');
    div.className = 'save-item';
    const meta = document.createElement('div'); meta.className = 'meta';
    meta.innerHTML = `<strong>${escapeHtml(s.name)}</strong><div class="muted">${new Date(s.created).toLocaleString()}</div>`;
    const controls = document.createElement('div');
    controls.innerHTML = `<button class="btn" data-id="${s.id}" data-action="load">Load</button>
                          <button class="btn ghost" data-id="${s.id}" data-action="rename">Rename</button>
                          <button class="btn outline" data-id="${s.id}" data-action="delete">Delete</button>`;
    div.appendChild(meta); div.appendChild(controls);
    listContainer.appendChild(div);
  });

  // delegate actions
  listContainer.querySelectorAll('button').forEach(b=>{
    b.addEventListener('click', e=>{
      const id = b.dataset.id;
      const action = b.dataset.action;
      handleSaveAction(id, action);
    });
  });

  overlay.classList.remove('hidden');
}

function handleSaveAction(id, action){
  let saves = loadSaves();
  const idx = saves.findIndex(s => s.id === id);
  if (idx === -1) return;
  if (action === 'load'){
    state = structuredClone(saves[idx].state);
    applyStateToSVG();
    closeModal();
  } else if (action === 'delete'){
    if (!confirm('Delete this saved character?')) return;
    saves.splice(idx,1);
    persistSaves(saves);
    openSavesModal(); // refresh
  } else if (action === 'rename'){
    const name = prompt('New name', saves[idx].name);
    if (name) { saves[idx].name = name; persistSaves(saves); openSavesModal(); }
  }
}
function closeModal(){ $('#modalOverlay').classList.add('hidden'); }
function clearSaves(){ if (!confirm('Clear all saved characters?')) return; localStorage.removeItem(STORAGE_KEY); openSavesModal(); }

/* ========= export PNG =========
   Method:
   - Serialize the character SVG (clone & inline styles)
   - Create an Image with data:image/svg+xml;utf8,<svg...>
   - Draw to canvas (scale up for quality)
*/
async function downloadPNG(){
  const svgNode = $('#characterSVG');
  const clone = svgNode.cloneNode(true);

  // inline computed styles for transitionable elements so they render consistently
  inlineStyles(clone);

  // set width/height for rendering
  const width = 1200; // large for good quality
  const height = Math.round( (svgNode.viewBox.baseVal.height / svgNode.viewBox.baseVal.width) * width );

  const svgStr = new XMLSerializer().serializeToString(clone);
  const svgData = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgStr);

  const img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas');
    c.width = width; c.height = height;
    const ctx = c.getContext('2d');
    // white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0,0,c.width,c.height);
    ctx.drawImage(img, 0, 0, c.width, c.height);
    c.toBlob(blob => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `character_${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
      flashToast('Downloaded PNG');
    }, 'image/png', 0.92);
  };
  img.onerror = (e) => {
    console.error('SVG -> Image failed', e);
    alert('Export failed — try again.');
  };
  img.src = svgData;
}

/* inline computed styles recursively (useful to preserve fills) */
function inlineStyles(node){
  const all = node.querySelectorAll('*');
  all.forEach(el => {
    const cs = window.getComputedStyle(el);
    // inline a limited set of properties relevant for visuals
    const props = ['fill','stroke','stroke-width','opacity','transform','filter'];
    props.forEach(p => {
      const val = cs.getPropertyValue(p);
      if (val) el.style.setProperty(p, val);
    });
  });
}

/* ========= import / export JSON ========= */
function exportJSON(){
  const data = JSON.stringify(state, null, 2);
  const blob = new Blob([data], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `character_${Date.now()}.json`;
  document.body.appendChild(a); a.click(); a.remove();
}
function handleImportFile(e){
  const f = e.target.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = () => {
    try{
      const obj = JSON.parse(reader.result);
      state = Object.assign(state, obj);
      applyStateToSVG();
      flashToast('Imported character');
    }catch(err){
      alert('Invalid file');
    }
  };
  reader.readAsText(f);
  e.target.value = '';
}

/* ========= misc UI helpers ========= */
function flashToast(msg='Done'){
  const t = document.createElement('div');
  t.textContent = msg;
  t.style.position = 'fixed';
  t.style.right = '20px';
  t.style.bottom = '20px';
  t.style.padding = '10px 14px';
  t.style.borderRadius = '10px';
  t.style.background = 'linear-gradient(90deg,rgba(0,0,0,0.75),rgba(0,0,0,0.6))';
  t.style.color = 'white'; t.style.boxShadow = '0 8px 30px rgba(0,0,0,0.4)';
  document.body.appendChild(t);
  setTimeout(()=> t.style.opacity = 0, 1600);
  setTimeout(()=> t.remove(), 2200);
}

function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

/* ========= stage pan & zoom interactions ========= */
function setupStageInteractivity(){
  let scale = 1;
  let start = null;
  let pan = {x:0,y:0};
  let isDown = false;
  charStage.addEventListener('wheel', e=>{
    e.preventDefault();
    const delta = -e.deltaY * 0.0015;
    scale = Math.max(0.6, Math.min(1.8, scale + delta));
    charStage.style.transform = `scale(${scale}) translate(${pan.x}px, ${pan.y}px)`;
  }, {passive:false});

  charStage.addEventListener('pointerdown', e=>{
    isDown = true; start = {x:e.clientX - pan.x, y:e.clientY - pan.y};
    charStage.setPointerCapture(e.pointerId);
  });
  window.addEventListener('pointermove', e=>{
    if (!isDown) return;
    pan.x = e.clientX - start.x; pan.y = e.clientY - start.y;
    charStage.style.transform = `scale(${scale}) translate(${pan.x}px, ${pan.y}px)`;
  });
  window.addEventListener('pointerup', e=>{
    isDown = false;
  });
}

/* ========= particles background
   Draw simple floating circles (canvas-less: DOM for simplicity).
*/
let particleTimer = null;
function renderParticles(){
  const density = state.particleDensity || 8;
  // clear existing
  previewBg.innerHTML = '';
  // create container
  for (let i=0;i<density;i++){
    const p = document.createElement('div');
    p.className = 'particle';
    const size = 4 + Math.random()*18;
    p.style.position = 'absolute';
    p.style.left = Math.random()*100 + '%';
    p.style.top = Math.random()*100 + '%';
    p.style.width = size + 'px';
    p.style.height = size + 'px';
    p.style.borderRadius = '50%';
    p.style.opacity = (0.06 + Math.random()*0.18).toString();
    p.style.background = 'white';
    p.style.transform = `translateY(${Math.random()*40}px)`;
    p.style.filter = 'blur(1px)';
    p.style.transition = `transform ${6+Math.random()*6}s linear, opacity ${4+Math.random()*4}s linear`;
    previewBg.appendChild(p);
    // animate periodically
    setTimeout(()=> {
      p.style.transform = `translateY(${ -30 - Math.random()*40 }px)`;
      p.style.opacity = (0.02 + Math.random()*0.16).toString();
      // loop
      (function loop(){
        setTimeout(()=>{
          p.style.transform = `translateY(${10 + Math.random()*40}px)`;
          p.style.opacity = (0.04 + Math.random()*0.16).toString();
          setTimeout(loop, 7000 + Math.random()*4000);
        }, 6000 + Math.random()*3000);
      })();
    }, Math.random()*2000);
  }
}

/* ========= theme and music ========= */
function toggleTheme(){
  const body = document.body;
  body.classList.toggle('dark');
  flashToast(body.classList.contains('dark') ? 'Dark mode' : 'Light mode');
}
function toggleMusic(){
  const a = $('#bg-music');
  const btn = $('#playMusic');
  if (!a.src) {
    flashToast('No background music embedded. (Optional)'); return;
  }
  if (a.paused){ a.play(); btn.classList.add('primary'); btn.textContent = '🔊 Playing'; }
  else { a.pause(); btn.classList.remove('primary'); btn.textContent = '🔊 Music'; }
}

/* ========= small helpers ========= */
function structuredClone(obj){ return JSON.parse(JSON.stringify(obj)); }

/* ========= small security / utility: inline styles while cloning
   (not using CSS external asset library) */

/* ========= small input sanitizers ========= */
// nothing to sanitize currently

/* ========= END ========= */
