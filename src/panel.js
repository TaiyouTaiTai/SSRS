import { requireAuth, logoutUser } from './auth.js';

requireAuth((user) => {
  const userAvatar = document.getElementById('userAvatar');
  const userName = document.getElementById('userName');

  if (userAvatar) userAvatar.textContent = user.email[0].toUpperCase();
  if (userName) userName.textContent = user.email;
});

document.getElementById('btnLogout').addEventListener('click', () => {
  logoutUser();
});

document.querySelectorAll('.action-card').forEach((card) => {
  card.addEventListener('click', () => {
    const module = card.dataset.module;
    if (module === 'firmar') {
      window.location.href = '/firmar.html';
    } else {
      alert(`Módulo ${module} en desarrollo.`);
    }
  });
});
