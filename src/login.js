import { loginUser, registerUser, onAuthChange } from './auth.js';

onAuthChange((user) => {
  if (user) {
    window.location.href = '/panel.html';
  }
});

const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const btnSubmit = document.getElementById('btnSubmit');
const btnToggleMode = document.getElementById('btnToggleMode');
const btnAux = document.getElementById('btnAux');
const formTitle = document.getElementById('formTitle');
const errorMessage = document.getElementById('errorMessage');

let isRegisterMode = false;

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.style.display = 'block';
}

function clearError() {
  errorMessage.textContent = '';
  errorMessage.style.display = 'none';
}

btnToggleMode.addEventListener('click', () => {
  isRegisterMode = !isRegisterMode;
  clearError();
  if (isRegisterMode) {
    formTitle.textContent = 'Crear cuenta';
    btnSubmit.textContent = 'Crear Cuenta';
    btnToggleMode.textContent = '¿Ya tienes cuenta? Inicia sesión';
  } else {
    formTitle.textContent = 'Iniciar sesión';
    btnSubmit.textContent = 'Iniciar Sesión';
    btnToggleMode.textContent = '¿No tienes cuenta? Regístrate';
  }
});

btnAux.addEventListener('click', () => {
  window.location.href = '/panel.html';
});

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearError();

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    showError('Por favor completa todos los campos.');
    return;
  }

  btnSubmit.disabled = true;
  btnSubmit.textContent = isRegisterMode ? 'Creando cuenta...' : 'Ingresando...';

  const result = isRegisterMode
    ? await registerUser(email, password)
    : await loginUser(email, password);

  if (result.success) {
    window.location.href = '/panel.html';
  } else {
    showError(result.error);
    btnSubmit.disabled = false;
    btnSubmit.textContent = isRegisterMode ? 'Crear Cuenta' : 'Iniciar Sesión';
  }
});
