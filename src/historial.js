import { requireAuth, logoutUser } from './auth.js';
import { db } from './firebase.js';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';

// ─── Protección de ruta ───────────────────────────────────────────────────────
requireAuth((user) => {
  const avatar = document.getElementById('userAvatar');
  const name = document.getElementById('userName');
  if (avatar) avatar.textContent = user.email[0].toUpperCase();
  if (name) name.textContent = user.email;

  loadHistory(user.uid);
});

// ─── Navegación ───────────────────────────────────────────────────────────────
document.getElementById('btnLogout').addEventListener('click', () => logoutUser());
document.getElementById('btnBack').addEventListener('click', () => {
  window.location.href = '/panel.html';
});

// ─── Gestión de estados ───────────────────────────────────────────────────────
function showLoading() {
  document.getElementById('loadingState').style.display = 'flex';
  document.getElementById('emptyState').style.display = 'none';
  document.getElementById('historyContent').style.display = 'none';
}

function showEmptyState() {
  document.getElementById('loadingState').style.display = 'none';
  document.getElementById('emptyState').style.display = 'flex';
  document.getElementById('historyContent').style.display = 'none';
}

function showHistory() {
  document.getElementById('loadingState').style.display = 'none';
  document.getElementById('emptyState').style.display = 'none';
  document.getElementById('historyContent').style.display = 'block';
}

function updateCounter(count) {
  document.getElementById('docCounter').textContent =
    count + (count === 1 ? ' documento firmado' : ' documentos firmados');
  showHistory();
}

function showError(message) {
  const container = document.getElementById('historyList');
  container.innerHTML = `<div class="error-box">${message}</div>`;
  showHistory();
}

// ─── Cargar historial ─────────────────────────────────────────────────────────
async function loadHistory(userId) {
  showLoading();

  try {
    const firmasRef = collection(db, 'firmas');
    const q = query(firmasRef, where('userId', '==', userId), orderBy('signedAt', 'desc'));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      showEmptyState();
      return;
    }

    const firmas = [];
    querySnapshot.forEach((doc) => {
      firmas.push({ id: doc.id, ...doc.data() });
    });

    updateCounter(firmas.length);
    renderCards(firmas);
  } catch (error) {
    console.error('Error cargando historial — código:', error.code, '| mensaje:', error.message);

    let msg = 'Error al cargar el historial. Intenta de nuevo.';

    if (
      error.code === 'permission-denied' ||
      error.message?.includes('Missing or insufficient permissions')
    ) {
      msg = 'Sin permiso para leer Firestore. Verifica las reglas de seguridad.';
    } else if (error.code === 'failed-precondition' || error.message?.includes('index')) {
      msg =
        'Se requiere un índice compuesto en Firestore (userId + signedAt). ' +
        'Revisa la consola del navegador: habrá un enlace para crearlo automáticamente.';
    }

    showError(msg);
  }
}

// ─── Renderizar cards ─────────────────────────────────────────────────────────
function formatSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function formatDate(timestamp) {
  if (!timestamp) return 'Fecha no disponible';
  try {
    return timestamp.toDate().toLocaleString('es-GT', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch (_) {
    return 'Fecha no disponible';
  }
}

function renderCards(firmas) {
  const container = document.getElementById('historyList');
  container.innerHTML = '';

  firmas.forEach((firma) => {
    const card = document.createElement('div');
    card.className = 'history-card';

    const fecha = formatDate(firma.signedAt);
    const size = formatSize(firma.fileSize);
    const tipoCorto = (firma.fileType || 'archivo').split('/').pop().toUpperCase();

    card.innerHTML = `
      <div class="card-main">
        <div class="card-left">
          <span class="card-filename">${escapeHtml(firma.fileName || '—')}</span>
          <span class="card-meta">${escapeHtml(tipoCorto)} · ${escapeHtml(size)}</span>
        </div>
        <div class="card-right">
          <span class="card-date">${escapeHtml(fecha)}</span>
          <span class="card-badge">✓ Válido</span>
        </div>
      </div>
      <div class="card-detail" style="display: none;">
        <div class="detail-row">
          <span class="detail-label">Hash SHA-256</span>
          <div class="detail-hash">${escapeHtml(firma.hash || '—')}</div>
        </div>
        <div class="detail-row">
          <span class="detail-label">Firma digital</span>
          <div class="detail-signature">
            <img src="${firma.signature || ''}" alt="Firma digital">
          </div>
        </div>
        <div class="detail-row">
          <span class="detail-label">Firmante</span>
          <span class="detail-value">${escapeHtml(firma.userEmail || '—')}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Fecha y hora completa</span>
          <span class="detail-value">${escapeHtml(firma.signedAt ? firma.signedAt.toDate().toLocaleString('es-GT', { dateStyle: 'long', timeStyle: 'medium' }) : 'No disponible')}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">ID del certificado</span>
          <span class="detail-id">${escapeHtml(firma.id)}</span>
        </div>
        <button class="btn-close-detail">Cerrar detalle</button>
      </div>
    `;

    const mainSection = card.querySelector('.card-main');
    const detailSection = card.querySelector('.card-detail');
    const closeBtn = card.querySelector('.btn-close-detail');

    mainSection.addEventListener('click', () => {
      const isOpen = detailSection.style.display !== 'none';
      // Colapsar todos los demás detalles abiertos
      document.querySelectorAll('.card-detail').forEach((d) => {
        d.style.display = 'none';
      });
      detailSection.style.display = isOpen ? 'none' : 'block';
    });

    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      detailSection.style.display = 'none';
    });

    container.appendChild(card);
  });
}

// ─── Utilidad: escapar HTML para evitar XSS ───────────────────────────────────
function escapeHtml(str) {
  if (typeof str !== 'string') return String(str ?? '');
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
