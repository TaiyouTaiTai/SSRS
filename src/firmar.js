import { requireAuth, logoutUser } from './auth.js';
import { db, storage } from './firebase.js';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { generateCertificatePDF } from './pdfUtils.js';

// ─── Estado del módulo ────────────────────────────────────────────────────────
let currentFile = null;
let currentFileHash = null;
let currentUser = null;
let canvasHasContent = false;
let currentCertPdf = null;
let currentSignedDocBase64 = null;
let documentImageData = null;   // snapshot del documento renderizado (sin firma)

// ─── Canvas principal (documento + firma) ─────────────────────────────────────
const canvas = document.getElementById('signatureCanvas');
const ctx = canvas.getContext('2d');

// Canvas oculto: registra solo los trazos de la firma (fondo blanco)
const sigCanvas = document.createElement('canvas');
const sigCtx = sigCanvas.getContext('2d');

// ─── Protección de ruta ───────────────────────────────────────────────────────
requireAuth((user) => {
  currentUser = user;
  const avatar = document.getElementById('userAvatar');
  const name = document.getElementById('userName');
  if (avatar) avatar.textContent = user.email[0].toUpperCase();
  if (name) name.textContent = user.email;
});

// ─── Navegación general ───────────────────────────────────────────────────────
document.getElementById('btnLogout').addEventListener('click', () => logoutUser());
document.getElementById('btnBackPanel').addEventListener('click', () => {
  window.location.href = '/panel.html';
});
document.getElementById('btnGoPanel').addEventListener('click', () => {
  window.location.href = '/panel.html';
});

// ─── Gestión de pasos ─────────────────────────────────────────────────────────
function showStep(n) {
  document.querySelectorAll('.step-section').forEach((s) => s.classList.remove('active'));
  document.getElementById(`step${n}`).classList.add('active');
}

// ─── Paso 1: Subir documento ──────────────────────────────────────────────────
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const fileIcon = document.getElementById('fileIcon');
const btnContinue = document.getElementById('btnContinue');
const step1Error = document.getElementById('step1Error');

const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'image/png',
  'image/jpeg',
];

const FILE_ICONS = {
  'application/pdf': '📕',
  'application/msword': '📘',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📘',
  'text/plain': '📄',
  'image/png': '🖼️',
  'image/jpeg': '🖼️',
};

const MAX_SIZE = 10 * 1024 * 1024;

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function showStep1Error(msg) {
  step1Error.textContent = msg;
  step1Error.style.display = 'block';
}

function clearStep1Error() {
  step1Error.textContent = '';
  step1Error.style.display = 'none';
}

function handleFile(file) {
  clearStep1Error();

  if (!ALLOWED_TYPES.includes(file.type)) {
    showStep1Error('Tipo de archivo no permitido. Usa PDF, PNG o JPG.');
    return;
  }

  if (file.size > MAX_SIZE) {
    showStep1Error('El archivo supera el límite de 10 MB.');
    return;
  }

  currentFile = file;
  fileName.textContent = file.name;
  fileSize.textContent = formatSize(file.size);
  fileIcon.textContent = FILE_ICONS[file.type] || '📄';
  fileInfo.classList.add('visible');
  btnContinue.classList.add('visible');
}

dropZone.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', () => {
  if (fileInput.files.length > 0) handleFile(fileInput.files[0]);
});

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
});

btnContinue.addEventListener('click', async () => {
  if (!currentFile) return;
  showStep(2);
  await loadDocumentToCanvas(currentFile);
});

// ─── Carga del documento en el canvas ────────────────────────────────────────
const canvasLoading = document.getElementById('canvasLoading');

const MAX_W = 780;
const MAX_H = 900;

function scaleToFit(w, h) {
  const scale = Math.min(MAX_W / w, MAX_H / h, 1);
  return { w: Math.round(w * scale), h: Math.round(h * scale) };
}

function resizeBothCanvases(w, h) {
  canvas.width = w;
  canvas.height = h;
  sigCanvas.width = w;
  sigCanvas.height = h;
  sigCtx.fillStyle = '#FFFFFF';
  sigCtx.fillRect(0, 0, w, h);
  sigCtx.strokeStyle = '#000000';
  sigCtx.lineWidth = 2.5;
  sigCtx.lineCap = 'round';
  sigCtx.lineJoin = 'round';
}

async function loadDocumentToCanvas(file) {
  canvasLoading.style.display = 'flex';
  canvasHasContent = false;
  document.getElementById('btnSign').disabled = true;

  try {
    if (file.type.startsWith('image/')) {
      await loadImage(file);
    } else if (file.type === 'application/pdf') {
      await loadPdf(file);
    } else {
      loadBlank();
    }
  } catch (err) {
    console.error('Error cargando documento:', err);
    loadBlank();
  } finally {
    canvasLoading.style.display = 'none';
  }
}

function loadBlank() {
  resizeBothCanvases(700, 350);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // Hint de tipo no previsualizable
  ctx.fillStyle = '#CCCCCC';
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Vista previa no disponible · Firma aquí', canvas.width / 2, canvas.height / 2);
  ctx.textAlign = 'left';
  documentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const { w, h } = scaleToFit(img.naturalWidth, img.naturalHeight);
      resizeBothCanvases(w, h);
      ctx.drawImage(img, 0, 0, w, h);
      documentImageData = ctx.getImageData(0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve();
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo cargar la imagen')); };
    img.src = url;
  });
}

async function loadPdf(file) {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).href;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);

  const baseViewport = page.getViewport({ scale: 1 });
  const scale = Math.min(MAX_W / baseViewport.width, MAX_H / baseViewport.height);
  const viewport = page.getViewport({ scale });

  resizeBothCanvases(Math.round(viewport.width), Math.round(viewport.height));

  await page.render({ canvasContext: ctx, viewport }).promise;
  documentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
}

// ─── Dibujo sobre el canvas ───────────────────────────────────────────────────
const btnClearCanvas = document.getElementById('btnClearCanvas');
const btnSign = document.getElementById('btnSign');
const step2Error = document.getElementById('step2Error');

let isDrawing = false;

function getPosition(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  if (e.touches) {
    return {
      x: (e.touches[0].clientX - rect.left) * scaleX,
      y: (e.touches[0].clientY - rect.top) * scaleY,
    };
  }
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY,
  };
}

function startDrawing(e) {
  e.preventDefault();
  isDrawing = true;
  const pos = getPosition(e);
  ctx.beginPath();
  ctx.moveTo(pos.x, pos.y);
  sigCtx.beginPath();
  sigCtx.moveTo(pos.x, pos.y);
}

function draw(e) {
  if (!isDrawing) return;
  e.preventDefault();
  const pos = getPosition(e);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineTo(pos.x, pos.y);
  ctx.stroke();
  sigCtx.lineTo(pos.x, pos.y);
  sigCtx.stroke();
}

function stopDrawing() {
  if (!isDrawing) return;
  isDrawing = false;
  canvasHasContent = true;
  btnSign.disabled = false;
}

canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mouseleave', stopDrawing);
canvas.addEventListener('touchstart', startDrawing, { passive: false });
canvas.addEventListener('touchmove', draw, { passive: false });
canvas.addEventListener('touchend', stopDrawing);

btnClearCanvas.addEventListener('click', () => {
  // Restaura el documento sin la firma
  if (documentImageData) {
    ctx.putImageData(documentImageData, 0, 0);
  }
  // Limpia el canvas de firma
  sigCtx.clearRect(0, 0, sigCanvas.width, sigCanvas.height);
  sigCtx.fillStyle = '#FFFFFF';
  sigCtx.fillRect(0, 0, sigCanvas.width, sigCanvas.height);

  canvasHasContent = false;
  btnSign.disabled = true;
  step2Error.style.display = 'none';
});

document.getElementById('btnBackStep1').addEventListener('click', () => {
  showStep(1);
});

// ─── Utilidades ───────────────────────────────────────────────────────────────
async function generateHash(file) {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function showStep2Error(msg) {
  step2Error.textContent = msg;
  step2Error.style.display = 'block';
}

// ─── Firmar ───────────────────────────────────────────────────────────────────
btnSign.addEventListener('click', async () => {
  step2Error.style.display = 'none';

  if (!currentUser) {
    showStep2Error('Sesión no disponible. Recarga la página e intenta de nuevo.');
    return;
  }

  btnSign.disabled = true;
  const setStatus = (msg) => { btnSign.textContent = msg; };

  try {
    console.log('[firmar] 1/5 calculando hash…');
    setStatus('Calculando integridad…');
    currentFileHash = await generateHash(currentFile);

    console.log('[firmar] 2/5 exportando canvas a base64…');
    const signedDocBase64 = canvas.toDataURL('image/png');
    const signatureBase64 = sigCanvas.toDataURL('image/png');
    const signedAt = new Date();
    currentSignedDocBase64 = signedDocBase64;

    console.log('[firmar] 3/5 guardando en Firestore…');
    setStatus('Registrando firma…');
    const signaturePackage = {
      userId: currentUser.uid,
      userEmail: currentUser.email,
      fileName: currentFile.name,
      fileSize: currentFile.size,
      fileType: currentFile.type,
      hash: currentFileHash,
      signature: signatureBase64,
      signedAt: serverTimestamp(),
      status: 'valid',
    };
    const docRef = await addDoc(collection(db, 'firmas'), signaturePackage);
    console.log('[firmar] Firestore OK, docId:', docRef.id);

    // Storage: fire-and-forget — nunca bloquea el flujo principal
    const storageRef = ref(storage, `firmas/${currentUser.uid}/${docRef.id}/documento-firmado.png`);
    canvas.toBlob((blob) => {
      if (!blob) return console.warn('[storage] toBlob devolvió null');
      console.log('[storage] subiendo blob de', Math.round(blob.size / 1024), 'KB');
      uploadBytes(storageRef, blob)
        .then(() => getDownloadURL(storageRef))
        .then((url) => updateDoc(doc(db, 'firmas', docRef.id), { signedDocUrl: url }))
        .then(() => console.log('[storage] upload OK'))
        .catch((err) => console.warn('[storage] upload falló:', err.message));
    }, 'image/png');

    console.log('[firmar] 4/5 generando certificado PDF…');
    setStatus('Generando certificado…');
    currentCertPdf = generateCertificatePDF({
      fileName: currentFile.name,
      fileSize: currentFile.size,
      fileType: currentFile.type,
      hash: currentFileHash,
      userEmail: currentUser.email,
      signedAt,
      id: docRef.id,
      signature: signatureBase64,
    });

    console.log('[firmar] 5/5 mostrando paso 3');
    document.getElementById('certFileName').textContent = currentFile.name;
    document.getElementById('certFileSize').textContent = formatSize(currentFile.size);
    document.getElementById('certHash').textContent = currentFileHash;
    document.getElementById('certEmail').textContent = currentUser.email;
    document.getElementById('certDate').textContent = signedAt.toLocaleString('es-MX', {
      dateStyle: 'long',
      timeStyle: 'short',
    });
    document.getElementById('certSignedDocImg').src = signedDocBase64;
    document.getElementById('certDocId').textContent = docRef.id;

    showStep(3);
    console.log('[firmar] flujo completado');
  } catch (err) {
    console.error('[firmar] ERROR:', err.code, err.message, err);

    let msg = '';
    if (err.code === 'permission-denied' || err.message?.includes('Missing or insufficient permissions')) {
      msg = 'Sin permiso en Firestore. Verifica las reglas de seguridad.';
    } else if (err.code === 'storage/unauthorized') {
      msg = 'Sin permiso en Firebase Storage. Verifica las reglas en Firebase Console.';
    } else {
      msg = `Error: ${err.message || err.code || 'desconocido'}`;
    }

    showStep2Error(msg);
    btnSign.disabled = false;
    btnSign.textContent = 'Firmar y generar certificado';
  }
});

// ─── Descargar documento firmado ──────────────────────────────────────────────
document.getElementById('btnDownloadSignedDoc').addEventListener('click', () => {
  if (!currentSignedDocBase64) return;
  const a = document.createElement('a');
  const base = (currentFile?.name || 'documento').replace(/\.[^/.]+$/, '');
  a.download = `firmado-${base}.png`;
  a.href = currentSignedDocBase64;
  a.click();
});

// ─── Descargar certificado PDF ────────────────────────────────────────────────
document.getElementById('btnDownloadCert').addEventListener('click', () => {
  if (currentCertPdf) {
    currentCertPdf.save(`certificado-${document.getElementById('certDocId').textContent}.pdf`);
  }
});

// ─── Reiniciar flujo ──────────────────────────────────────────────────────────
document.getElementById('btnSignAnother').addEventListener('click', () => {
  currentFile = null;
  currentFileHash = null;
  canvasHasContent = false;
  currentCertPdf = null;
  currentSignedDocBase64 = null;
  documentImageData = null;

  fileInfo.classList.remove('visible');
  btnContinue.classList.remove('visible');
  clearStep1Error();
  fileInput.value = '';

  // Resetear canvas
  canvas.width = 300;
  canvas.height = 150;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  btnSign.disabled = true;
  btnSign.textContent = 'Firmar y generar certificado';
  step2Error.style.display = 'none';

  showStep(1);
});
