import { db } from './firebase.js';
import { collection, query, where, getDocs } from 'firebase/firestore';

// ─── Estado ───────────────────────────────────────────────────────────────────
let currentFile = null;

// ─── Navegación ───────────────────────────────────────────────────────────────
document.getElementById('btnBackPanel').addEventListener('click', () => {
  window.location.href = '/panel.html';
});

// ─── Referencias DOM ──────────────────────────────────────────────────────────
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const fileIconEl = document.getElementById('fileIcon');
const fileNameEl = document.getElementById('fileName');
const fileSizeEl = document.getElementById('fileSize');
const uploadError = document.getElementById('uploadError');
const btnVerify = document.getElementById('btnVerify');
const uploadSection = document.getElementById('uploadSection');
const resultSection = document.getElementById('resultSection');
const cardVerified = document.getElementById('cardVerified');
const cardNotVerified = document.getElementById('cardNotVerified');

// ─── Constantes ───────────────────────────────────────────────────────────────
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

// ─── Utilidades ───────────────────────────────────────────────────────────────
function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function generateHash(file) {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function showUploadError(msg) {
  uploadError.textContent = msg;
  uploadError.style.display = 'block';
}

function clearUploadError() {
  uploadError.textContent = '';
  uploadError.style.display = 'none';
}

// ─── Lógica de drop zone ──────────────────────────────────────────────────────
function handleFile(file) {
  clearUploadError();

  if (!ALLOWED_TYPES.includes(file.type)) {
    showUploadError('Tipo de archivo no permitido. Usa PDF, DOC, DOCX, TXT, PNG o JPG.');
    return;
  }

  if (file.size > MAX_SIZE) {
    showUploadError('El archivo supera el límite de 10 MB.');
    return;
  }

  currentFile = file;
  fileIconEl.textContent = FILE_ICONS[file.type] || '📄';
  fileNameEl.textContent = file.name;
  fileSizeEl.textContent = formatSize(file.size);
  fileInfo.classList.add('visible');
  btnVerify.classList.add('visible');
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

// ─── Verificar integridad ─────────────────────────────────────────────────────
btnVerify.addEventListener('click', async () => {
  clearUploadError();
  btnVerify.disabled = true;
  btnVerify.textContent = 'Verificando...';

  try {
    const fileHash = await generateHash(currentFile);

    const q = query(collection(db, 'firmas'), where('hash', '==', fileHash));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const docData = querySnapshot.docs[0].data();
      const docId = querySnapshot.docs[0].id;

      // Formatear fecha (signedAt puede ser null si el serverTimestamp aún no se resolvió)
      let dateStr = '—';
      if (docData.signedAt) {
        try {
          dateStr = docData.signedAt.toDate().toLocaleString('es-GT', {
            dateStyle: 'long',
            timeStyle: 'short',
          });
        } catch (_) {
          dateStr = 'Fecha no disponible';
        }
      }

      document.getElementById('resEmail').textContent = docData.userEmail || '—';
      document.getElementById('resDate').textContent = dateStr;
      document.getElementById('resFileName').textContent = docData.fileName || '—';
      document.getElementById('resHash').textContent = fileHash;
      document.getElementById('resDocId').textContent = docId;
      document.getElementById('resSignatureImg').src = docData.signature || '';

      cardVerified.style.display = 'block';
      cardNotVerified.style.display = 'none';
    } else {
      document.getElementById('resHashNotFound').textContent = fileHash;
      cardVerified.style.display = 'none';
      cardNotVerified.style.display = 'block';
    }

    uploadSection.style.display = 'none';
    resultSection.classList.add('visible');
  } catch (err) {
    console.error('Error al verificar:', err);

    let msg = '';
    if (
      err.code === 'permission-denied' ||
      err.message?.includes('Missing or insufficient permissions')
    ) {
      msg =
        'Sin permiso para leer Firestore. Configura las reglas para permitir lectura pública en la colección "firmas".';
    } else {
      msg = `Error al verificar: ${err.message || err.code || 'desconocido'}`;
    }

    showUploadError(msg);
  } finally {
    btnVerify.disabled = false;
    btnVerify.textContent = 'Verificar integridad';
  }
});

// ─── Reiniciar flujo ──────────────────────────────────────────────────────────
document.getElementById('btnVerifyAnother').addEventListener('click', () => {
  currentFile = null;
  fileInput.value = '';

  fileInfo.classList.remove('visible');
  btnVerify.classList.remove('visible');
  clearUploadError();

  cardVerified.style.display = 'none';
  cardNotVerified.style.display = 'none';
  resultSection.classList.remove('visible');
  uploadSection.style.display = 'block';
});
