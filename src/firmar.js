import { requireAuth, logoutUser } from './auth.js';
import { db, storage } from './firebase.js';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// ─── Estado del módulo ────────────────────────────────────────────────────────
let currentFile = null;
let currentFileHash = null;
let currentUser = null;
let canvasHasContent = false;

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

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

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
    showStep1Error('Tipo de archivo no permitido. Usa PDF, DOC, DOCX, TXT, PNG o JPG.');
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

btnContinue.addEventListener('click', () => {
  if (currentFile) showStep(2);
});

// ─── Paso 2: Canvas de firma ──────────────────────────────────────────────────
const canvas = document.getElementById('signatureCanvas');
const ctx = canvas.getContext('2d');
const btnClearCanvas = document.getElementById('btnClearCanvas');
const btnSign = document.getElementById('btnSign');
const step2Error = document.getElementById('step2Error');

function initCanvas() {
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
}

initCanvas();

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
}

function draw(e) {
  if (!isDrawing) return;
  e.preventDefault();
  const pos = getPosition(e);
  ctx.lineTo(pos.x, pos.y);
  ctx.stroke();
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
  initCanvas();
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

// ─── Botón principal: Firmar y generar certificado ────────────────────────────
btnSign.addEventListener('click', async () => {
  step2Error.style.display = 'none';
  btnSign.disabled = true;
  btnSign.textContent = 'Procesando firma...';

  try {
    // 1. Generar hash SHA-256
    currentFileHash = await generateHash(currentFile);

    // 2. Capturar firma como base64
    const signatureBase64 = canvas.toDataURL('image/png');

    // 3. Subir documento a Firebase Storage
    const filePath = `documentos/${currentUser.uid}/${Date.now()}_${currentFile.name}`;
    const storageRef = ref(storage, filePath);
    await uploadBytes(storageRef, currentFile);
    const downloadURL = await getDownloadURL(storageRef);

    // 4. Guardar paquete en Firestore
    const signaturePackage = {
      userId: currentUser.uid,
      userEmail: currentUser.email,
      fileName: currentFile.name,
      fileSize: currentFile.size,
      fileType: currentFile.type,
      fileURL: downloadURL,
      storagePath: filePath,
      hash: currentFileHash,
      signature: signatureBase64,
      signedAt: serverTimestamp(),
      status: 'valid',
    };

    await addDoc(collection(db, 'firmas'), signaturePackage);

    // 5. Mostrar certificado
    document.getElementById('certFileName').textContent = currentFile.name;
    document.getElementById('certFileSize').textContent = formatSize(currentFile.size);
    document.getElementById('certHash').textContent = currentFileHash;
    document.getElementById('certEmail').textContent = currentUser.email;
    document.getElementById('certDate').textContent = new Date().toLocaleString('es-MX', {
      dateStyle: 'long',
      timeStyle: 'short',
    });
    document.getElementById('certSignatureImg').src = signatureBase64;

    showStep(3);
  } catch (err) {
    console.error('Error al firmar:', err);
    showStep2Error('Ocurrió un error al procesar la firma. Verifica tu conexión e intenta de nuevo.');
    btnSign.disabled = false;
    btnSign.textContent = 'Firmar y generar certificado';
  }
});

// ─── Reiniciar flujo ──────────────────────────────────────────────────────────
document.getElementById('btnSignAnother').addEventListener('click', () => {
  // Resetear estado
  currentFile = null;
  currentFileHash = null;
  canvasHasContent = false;

  // Resetear paso 1
  fileInfo.classList.remove('visible');
  btnContinue.classList.remove('visible');
  clearStep1Error();
  fileInput.value = '';

  // Resetear paso 2
  initCanvas();
  btnSign.disabled = true;
  btnSign.textContent = 'Firmar y generar certificado';
  step2Error.style.display = 'none';

  showStep(1);
});
