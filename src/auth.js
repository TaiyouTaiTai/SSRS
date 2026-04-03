import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth } from './firebase.js';

function getErrorMessage(code) {
  const messages = {
    'auth/email-already-in-use': 'Este correo ya está registrado.',
    'auth/invalid-email': 'El correo electrónico no es válido.',
    'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
    'auth/user-not-found': 'No existe una cuenta con este correo.',
    'auth/wrong-password': 'Contraseña incorrecta.',
    'auth/invalid-credential':
      'Credenciales inválidas. Verifica tu correo y contraseña.',
    'auth/too-many-requests':
      'Demasiados intentos. Espera un momento e intenta de nuevo.',
  };
  return messages[code] || 'Ocurrió un error inesperado. Intenta de nuevo.';
}

export async function registerUser(email, password) {
  try {
    const credential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    return { success: true, user: credential.user };
  } catch (error) {
    return { success: false, error: getErrorMessage(error.code) };
  }
}

export async function loginUser(email, password) {
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: credential.user };
  } catch (error) {
    return { success: false, error: getErrorMessage(error.code) };
  }
}

export async function logoutUser() {
  try {
    await signOut(auth);
  } catch (_) {
    // ignorar errores de cierre de sesión
  } finally {
    window.location.href = '/login.html';
  }
}

export function requireAuth(callback) {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      callback(user);
    } else {
      window.location.href = '/login.html';
    }
  });
}

export function onAuthChange(callback) {
  onAuthStateChanged(auth, callback);
}
