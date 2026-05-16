# DOCUMENTACION TECNICA — proyectoSSRS

> Escrita para alguien con dominio en Java / Spring Boot / Spring Security,
> que se enfrenta por primera vez a un proyecto frontend en JavaScript puro.

---

## TABLA DE CONTENIDOS

1. [¿Qué es este proyecto?](#1-qué-es-este-proyecto)
2. [¿Qué es NPM? (analogía con Maven/Gradle)](#2-qué-es-npm)
3. [Stack tecnológico](#3-stack-tecnológico)
4. [Cómo iniciar el proyecto](#4-cómo-iniciar-el-proyecto)
5. [Estructura de archivos](#5-estructura-de-archivos)
6. [Arquitectura general](#6-arquitectura-general)
7. [Flujo de autenticación](#7-flujo-de-autenticación)
8. [Flujo de cada módulo](#8-flujo-de-cada-módulo)
9. [Firebase: el "backend" del proyecto](#9-firebase-el-backend-del-proyecto)
10. [Vite: el sistema de build](#10-vite-el-sistema-de-build)
11. [Decisiones de diseño importantes](#11-decisiones-de-diseño-importantes)
12. [Glosario rápido](#12-glosario-rápido)

---

## 1. ¿Qué es este proyecto?

**SSRS** es un sistema de firma y verificación de documentos digitales, desplegado
en `ssrs.taiyouflare.com`. Su propósito:

- Un usuario se registra o inicia sesión.
- Sube un documento (PDF, Word, imagen, texto).
- Dibuja su firma a mano sobre un canvas.
- El sistema genera un **hash SHA-256** del documento + guarda la firma
  en una base de datos en la nube.
- Cualquier persona puede verificar si un documento fue firmado comparando
  su hash contra la base de datos.
- El usuario puede ver su historial de documentos firmados.

**Es un sistema de firma digital simple**, donde la "prueba" de autenticidad
es el hash del archivo y la imagen de la firma almacenados en Firebase.

---

## 2. ¿Qué es NPM?

> Analogía directa con el mundo Java:

| Concepto Java/Maven              | Equivalente en JS/NPM                     |
|----------------------------------|-------------------------------------------|
| `pom.xml` o `build.gradle`       | `package.json`                            |
| Maven Central / Gradle Plugins   | npm Registry (`npmjs.com`)                |
| `mvn install` / `gradle build`   | `npm install`                             |
| `mvn package`                    | `npm run build`                           |
| `mvn spring-boot:run`            | `npm run dev`                             |
| Dependencia de producción        | `dependencies` en `package.json`          |
| Dependencia de scope `test`      | `devDependencies` en `package.json`       |
| `target/` (el .jar generado)     | `dist/` (los archivos compilados)         |
| `node_modules/`                  | Equivalente a `.m2/` pero LOCAL al proyecto |

**NPM** = **N**ode **P**ackage **M**anager. Es el gestor de dependencias
del ecosistema JavaScript, igual que Maven lo es de Java.

Cuando ejecutas `npm install`, NPM lee el `package.json` y descarga todas
las dependencias en la carpeta `node_modules/`. Esa carpeta NO se sube al
repositorio (igual que `target/` en Java) — está en el `.gitignore`.

---

## 3. Stack tecnológico

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENTE (Navegador)                     │
│                                                             │
│   HTML5 puro  +  CSS3 puro  +  JavaScript ES Modules       │
│   (sin frameworks — sin Vue, React, Angular, Svelte)        │
│                                                             │
│   Build tool: Vite (empaqueta y sirve el proyecto)          │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    FIREBASE (Google Cloud)                    │
│                                                             │
│   ┌─────────────────┐    ┌──────────────────────────────┐   │
│   │  Firebase Auth  │    │   Firestore (base de datos)  │   │
│   │  (email/pass)   │    │   Colección: "firmas"        │   │
│   └─────────────────┘    └──────────────────────────────┘   │
│                                                             │
│   ┌──────────────────────────────────────────────────────┐  │
│   │  Firebase Hosting  (sirve el sitio en producción)    │  │
│   │  Dominio: ssrs.taiyouflare.com                       │  │
│   └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

| Tecnología         | Rol en el proyecto                          | Analogía Java            |
|--------------------|---------------------------------------------|--------------------------|
| **HTML5**          | Define la estructura de cada página         | Las vistas JSP/Thymeleaf |
| **CSS3**           | Estilos visuales (colores, layout)          | —                        |
| **JavaScript**     | Lógica del cliente (como el `.js` del Spring MVC pero en el navegador) | Controladores Spring MVC |
| **ES Modules**     | Sistema de imports/exports nativo del navegador | `import` de Java |
| **Vite**           | Servidor de desarrollo + empaquetador       | Spring Boot DevTools + Maven package |
| **Firebase Auth**  | Autenticación (login/registro)              | Spring Security          |
| **Firestore**      | Base de datos NoSQL en la nube              | JPA/Hibernate + PostgreSQL |
| **Firebase Hosting** | Hosting estático del sitio              | Tomcat / servidor de despliegue |

---

## 4. Cómo iniciar el proyecto

### Prerrequisitos

- **Node.js** instalado (v18 o superior). Node.js es el runtime de JavaScript
  fuera del navegador — equivalente a tener la JVM instalada.
- **npm** viene incluido con Node.js automáticamente.

Para verificar que los tienes:
```bash
node --version   # debe mostrar algo como v20.x.x
npm --version    # debe mostrar algo como 10.x.x
```

### Pasos para arrancar

```bash
# 1. Clonar o entrar al proyecto
cd /ruta/del/proyecto

# 2. Instalar dependencias (solo la primera vez, o cuando cambie package.json)
#    Equivalente a: mvn install / gradle build
npm install

# 3. Iniciar el servidor de desarrollo con hot-reload
#    Equivalente a: mvn spring-boot:run
npm run dev
```

Después del paso 3, verás algo así en la terminal:

```
  VITE v5.x.x  ready in 300 ms

  ➜  Local:   http://localhost:5173/login.html
  ➜  Network: http://192.168.x.x:5173/login.html
```

Abre el navegador en `http://localhost:5173` y el proyecto está corriendo.

### Comandos disponibles

| Comando             | Qué hace                                                   |
|---------------------|------------------------------------------------------------|
| `npm install`       | Descarga todas las dependencias (primera vez o al clonar) |
| `npm run dev`       | Servidor local con hot-reload (desarrollo)                |
| `npm run build`     | Genera los archivos optimizados en `dist/`                |
| `npm run preview`   | Sirve el contenido de `dist/` localmente                  |

### ¿Qué es hot-reload?

Cuando cambias un archivo `.html`, `.js` o `.css` con `npm run dev` activo,
el navegador se actualiza **automáticamente** en tiempo real sin necesidad
de reiniciar el servidor. Es como Spring Boot DevTools pero para el frontend.

---

## 5. Estructura de archivos

```
proyectoSSRS/
│
├── package.json          ← "pom.xml" del proyecto
├── package-lock.json     ← versiones exactas bloqueadas (como mvn dependency:resolve)
├── vite.config.js        ← configuración del build tool
├── firebase.json         ← configuración de despliegue en Firebase Hosting
├── .firebaserc           ← qué proyecto de Firebase usar
├── cors.json             ← política CORS para Firebase Storage
├── .prettierrc           ← configuración de formato de código
│
├── index.html            ← punto de entrada (redirige a login.html)
├── login.html            ← página de autenticación
├── panel.html            ← panel principal (dashboard)
├── firmar.html           ← módulo: firma de documentos
├── verificar.html        ← módulo: verificación de firmas
├── historial.html        ← módulo: historial de documentos firmados
│
├── src/                  ← lógica JavaScript de cada página
│   ├── firebase.js       ← inicialización de Firebase (como un @Configuration de Spring)
│   ├── auth.js           ← funciones de autenticación reutilizables
│   ├── login.js          ← lógica de la página login.html
│   ├── panel.js          ← lógica de la página panel.html
│   ├── firmar.js         ← lógica de la página firmar.html
│   ├── verificar.js      ← lógica de la página verificar.html
│   ├── historial.js      ← lógica de la página historial.html
│   └── main.js           ← archivo demo de la plantilla (no se usa)
│
├── public/               ← archivos estáticos (fuentes, SVGs)
│   ├── fonts/
│   │   ├── JetBrainsMono-Regular.woff2
│   │   └── JetBrainsSans-Regular.woff2
│   └── *.svg
│
├── dist/                 ← build compilado (se genera con npm run build)
│   └── ...               ← NO editar manualmente
│
└── node_modules/         ← dependencias descargadas (NO tocar, NO subir al repo)
    └── ...
```

### Relación HTML ↔ JS (análogo a Controller ↔ View en Spring MVC)

```
login.html    ←──────→    src/login.js
panel.html    ←──────→    src/panel.js
firmar.html   ←──────→    src/firmar.js
verificar.html ←─────→    src/verificar.js
historial.html ←─────→    src/historial.js
```

Cada par HTML+JS es **una página**. El HTML define la UI y el JS define la
lógica. En Spring MVC sería como el par `.html` de Thymeleaf + el
`@Controller` correspondiente, pero aquí todo ocurre en el navegador.

---

## 6. Arquitectura general

Este proyecto es una **MPA (Multi-Page Application)** — aplicación
multipágina clásica. NO es un SPA (Single Page Application) como haría
React o Vue normalmente. Cada página tiene su propio HTML y su propio JS.

```
                         USUARIO
                            │
                            ▼
                    ┌───────────────┐
                    │  index.html   │ ← punto de entrada
                    │ (redirige)    │
                    └──────┬────────┘
                           │
                           ▼
                    ┌───────────────┐
                    │  login.html   │ ← autenticación
                    │  login.js     │
                    └──────┬────────┘
                           │ login exitoso
                           ▼
                    ┌───────────────┐
                    │  panel.html   │ ← dashboard principal
                    │  panel.js     │
                    └──────┬────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
      ┌──────────────┐ ┌────────────┐ ┌──────────────┐
      │ firmar.html  │ │verificar.  │ │historial.    │
      │ firmar.js    │ │html / .js  │ │html / .js    │
      └──────────────┘ └────────────┘ └──────────────┘
```

### Capas del sistema

```
┌────────────────────────────────────────────────────────────┐
│  CAPA DE PRESENTACIÓN (HTML + CSS inline)                  │
│  Define estructura visual de cada página                   │
├────────────────────────────────────────────────────────────┤
│  CAPA DE LÓGICA (JavaScript — src/*.js)                    │
│  Maneja eventos, validaciones, flujos                      │
├────────────────────────────────────────────────────────────┤
│  CAPA DE SERVICIOS (Firebase SDK)                          │
│  auth.js → Firebase Auth                                   │
│  firmar.js / historial.js / verificar.js → Firestore       │
├────────────────────────────────────────────────────────────┤
│  INFRAESTRUCTURA (Firebase Cloud)                          │
│  Auth Server + Firestore Database + Hosting                │
└────────────────────────────────────────────────────────────┘
```

---

## 7. Flujo de autenticación

Firebase Auth actúa como **Spring Security** del proyecto. El archivo
`src/auth.js` centraliza toda la lógica de autenticación.

```
┌──────────────────────────────────────────────────────────────────┐
│  REGISTRO                                                         │
│                                                                  │
│  Usuario llena formulario                                        │
│         │                                                        │
│         ▼                                                        │
│  registerUser(email, password) ── en auth.js                    │
│         │                                                        │
│         ▼                                                        │
│  Firebase Auth: createUserWithEmailAndPassword()                 │
│         │                                                        │
│    ┌────┴────┐                                                   │
│    ▼         ▼                                                   │
│  Error    Éxito → redirige a panel.html                         │
│  (mostrar mensaje en español al usuario)                         │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  LOGIN                                                           │
│                                                                  │
│  loginUser(email, password) ── en auth.js                       │
│         │                                                        │
│         ▼                                                        │
│  Firebase Auth: signInWithEmailAndPassword()                     │
│         │                                                        │
│    ┌────┴────┐                                                   │
│    ▼         ▼                                                   │
│  Error    Éxito → redirige a panel.html                         │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  PROTECCIÓN DE RUTAS (equivalente a @PreAuthorize en Spring)     │
│                                                                  │
│  Cada página protegida llama:                                    │
│  requireAuth(callback) ── en auth.js                            │
│         │                                                        │
│         ▼                                                        │
│  Firebase verifica si hay sesión activa                         │
│         │                                                        │
│    ┌────┴────┐                                                   │
│    ▼         ▼                                                   │
│  No auth  Autenticado → ejecuta callback con usuario            │
│     │                                                            │
│     ▼                                                            │
│  redirige a login.html                                          │
└──────────────────────────────────────────────────────────────────┘
```

### Equivalencias con Spring Security

| Spring Security                   | Firebase Auth en este proyecto          |
|-----------------------------------|-----------------------------------------|
| `SecurityFilterChain`             | `requireAuth()` en cada página          |
| `UserDetailsService`              | Firebase Auth (maneja usuarios)         |
| `BCryptPasswordEncoder`           | Firebase (encripta passwords internamente) |
| `@PreAuthorize("isAuthenticated")` | `requireAuth(callback)` al inicio del JS |
| `SecurityContext`                 | `onAuthStateChanged()` de Firebase      |
| JWT / Session Token               | Firebase ID Token (transparente)        |
| `logout()`                        | `logoutUser()` → `signOut()` de Firebase |

---

## 8. Flujo de cada módulo

### 8.1 Módulo: Firmar (firmar.html + firmar.js)

Flujo de 3 pasos:

```
  PASO 1: SUBIR DOCUMENTO
  ┌─────────────────────────────┐
  │  Usuario sube archivo       │
  │  (drag-drop o click)        │
  │                             │
  │  Validaciones:              │
  │  - Tipo: PDF, DOC, DOCX,    │
  │    TXT, PNG, JPG            │
  │  - Tamaño: max 10 MB        │
  │                             │
  │  Si válido:                 │
  │  → Genera hash SHA-256      │
  │    del archivo              │
  │  → Avanza a paso 2          │
  └─────────────────────────────┘
              │
              ▼
  PASO 2: DIBUJAR FIRMA
  ┌─────────────────────────────┐
  │  Canvas HTML5 para dibujar  │
  │  (mouse o touchscreen)      │
  │                             │
  │  Opciones:                  │
  │  - Borrar y redibujar       │
  │  - Guardar firma            │
  │                             │
  │  Si canvas tiene contenido: │
  │  → Convierte a PNG Base64   │
  │  → Avanza a paso 3          │
  └─────────────────────────────┘
              │
              ▼
  PASO 3: GENERAR CERTIFICADO
  ┌─────────────────────────────┐
  │  Guarda en Firestore:       │
  │  {                          │
  │    userId,                  │
  │    userEmail,               │
  │    fileName,                │
  │    fileSize,                │
  │    fileType,                │
  │    hash (SHA-256),          │
  │    signature (PNG Base64),  │
  │    signedAt (timestamp),    │
  │    status: 'valid',         │
  │    docId (generado)         │
  │  }                          │
  │                             │
  │  Muestra certificado visual │
  └─────────────────────────────┘
```

### 8.2 Módulo: Verificar (verificar.html + verificar.js)

```
  Usuario sube un archivo
         │
         ▼
  Genera SHA-256 del archivo
         │
         ▼
  Consulta Firestore:
  WHERE hash == sha256DelArchivo
         │
    ┌────┴────┐
    ▼         ▼
  No encontrado  Encontrado
  │              │
  ▼              ▼
  "No firmado"   Muestra:
                 - Email del firmante
                 - Fecha de firma
                 - Imagen de firma
                 - ID del certificado
```

### 8.3 Módulo: Historial (historial.html + historial.js)

```
  Página carga (requireAuth verifica sesión)
         │
         ▼
  Consulta Firestore:
  WHERE userId == currentUser.uid
  ORDER BY signedAt DESC
         │
         ▼
  Renderiza lista de tarjetas con:
  - Nombre del archivo
  - Tipo y tamaño
  - Fecha de firma
  - Hash SHA-256
  - Imagen de la firma
  - ID del certificado
```

---

## 9. Firebase: el "backend" del proyecto

Firebase es una plataforma de Google que provee servicios de backend
**sin necesidad de escribir un servidor**. En este proyecto reemplaza
todo lo que haría Spring Boot en el backend.

```
┌─────────────────────────────────────────────────────────────────┐
│  LO QUE HARÍA SPRING BOOT     →    LO QUE HACE FIREBASE         │
├─────────────────────────────────────────────────────────────────┤
│  Spring Security (auth)        →   Firebase Authentication      │
│  JPA Repository                →   Firestore SDK               │
│  @RestController (API)         →   Firebase SDK directo         │
│  PostgreSQL / MySQL            →   Firestore (NoSQL)            │
│  Servidor Tomcat               →   Firebase Hosting             │
│  application.properties        →   firebase.json / .firebaserc  │
└─────────────────────────────────────────────────────────────────┘
```

### Inicialización de Firebase (src/firebase.js)

```javascript
// Equivalente a un @Configuration de Spring Boot
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: '...',
  authDomain: 'taiyouflare.firebaseapp.com',
  projectId: 'taiyouflare',
  ...
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);   // ← instancia de autenticación
export const db = getFirestore(app); // ← instancia de base de datos
```

### Firestore: la base de datos

Firestore es **NoSQL orientada a documentos** (como MongoDB). No tiene
tablas ni filas — tiene **colecciones** y **documentos**.

Analogía:

| SQL / JPA                    | Firestore                        |
|------------------------------|----------------------------------|
| Tabla `firmas`               | Colección `firmas`               |
| Fila / registro              | Documento                        |
| Columna                      | Campo del documento              |
| `SELECT * WHERE userId = ?`  | `query(where("userId", "==", x))`|
| `INSERT INTO firmas...`      | `addDoc(collection(db, "firmas"), datos)` |
| Primary Key auto             | ID de documento auto-generado    |

### Esquema del documento en Firestore

```
Colección: firmas
└── documento (ID auto)
    ├── userId: string        ← UID único del usuario (Firebase Auth)
    ├── userEmail: string     ← email del usuario
    ├── fileName: string      ← nombre del archivo
    ├── fileSize: number      ← tamaño en bytes
    ├── fileType: string      ← MIME type (ej: "application/pdf")
    ├── hash: string          ← SHA-256 del archivo
    ├── signature: string     ← imagen PNG en Base64
    ├── signedAt: Timestamp   ← fecha/hora del servidor
    ├── status: string        ← "valid"
    └── docId: string         ← ID del certificado
```

---

## 10. Vite: el sistema de build

**Vite** es el equivalente a Maven/Gradle pero para el frontend. Hace dos
cosas principales:

1. **En desarrollo** (`npm run dev`): Sirve los archivos directamente con
   hot-reload. Como Spring Boot DevTools.

2. **En producción** (`npm run build`): Empaqueta y optimiza todos los
   archivos HTML, JS y CSS en la carpeta `dist/`. Aplica:
   - Minificación (elimina espacios y comentarios)
   - Tree-shaking (elimina código no usado)
   - Hashing de archivos (para caché del navegador)

### Configuración de Vite (vite.config.js)

```javascript
// Como un pom.xml pero para el bundler
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        // Cada página HTML es un "entry point" independiente
        // Equivale a múltiples módulos en un multi-module Maven project
        index:     'index.html',
        login:     'login.html',
        panel:     'panel.html',
        firmar:    'firmar.html',
        verificar: 'verificar.html',
        historial: 'historial.html',
      },
    },
  },
});
```

### Proceso de build

```
npm run build
      │
      ▼
Vite lee cada HTML (6 entry points)
      │
      ▼
Sigue los <script> de cada HTML → encuentra los .js de src/
      │
      ▼
Bundlea JS + optimiza CSS + copia assets
      │
      ▼
Genera dist/
├── index.html
├── login.html
├── panel.html
├── firmar.html
├── verificar.html
├── historial.html
└── assets/
    ├── login-[hash].js
    ├── panel-[hash].js
    └── ...
```

---

## 11. Decisiones de diseño importantes

### 11.1 Vanilla JS sin frameworks

El proyecto NO usa Vue, React, Angular ni ningún framework. Usa
**JavaScript puro del navegador**. Esto significa:

- No hay componentes reutilizables sofisticados.
- La UI se manipula directamente con `document.getElementById()` y
  similares.
- El estado (qué archivo está cargado, qué usuario está logueado) vive
  en variables de módulo dentro de cada archivo JS.

### 11.2 MPA (Multi-Page Application)

Cada funcionalidad es una página HTML separada. La navegación entre páginas
es una redirección real (`window.location.href = '/panel.html'`), no una
navegación dentro de la misma página como en un SPA.

Ventaja: simplicidad. Desventaja: cada cambio de página recarga el navegador
completamente.

### 11.3 Protección de rutas en el cliente

A diferencia de Spring Security que protege en el servidor, aquí la
protección de rutas se hace en el cliente con `requireAuth()`. Esto es un
patrón normal en aplicaciones frontend con Firebase: el usuario podría
técnicamente ver el HTML de `panel.html` sin estar logueado, pero no podría
hacer ninguna operación porque Firestore tiene **reglas de seguridad** en
el servidor que bloquean accesos no autorizados.

### 11.4 Hash SHA-256 con Web Crypto API

El hash del documento se genera directamente en el navegador usando la
API nativa `crypto.subtle.digest('SHA-256', buffer)`. No se sube el
archivo al servidor — solo el hash y la firma. Esto protege la privacidad
del contenido del documento.

---

## 12. Glosario rápido

| Término frontend         | Significado                                                         |
|--------------------------|---------------------------------------------------------------------|
| **NPM**                  | Node Package Manager — gestor de dependencias (como Maven)          |
| **Node.js**              | Runtime de JavaScript fuera del navegador (como la JVM)             |
| **Vite**                 | Build tool y servidor de desarrollo (como Maven + DevTools)         |
| **ES Modules**           | Sistema de importaciones nativo (`import/export`) del navegador     |
| **Bundle**               | Archivo JS resultante de unir varios módulos (como un .jar)         |
| **dist/**                | Directorio de salida del build (como `target/`)                     |
| **node_modules/**        | Dependencias descargadas (como `.m2/`)                              |
| **Canvas HTML5**         | Elemento para dibujar gráficos con JavaScript                       |
| **Base64**               | Codificación para guardar imágenes como texto                       |
| **SHA-256**              | Función de hash criptográfico (como el MD5 pero seguro)             |
| **MPA**                  | Multi-Page Application — app con múltiples páginas HTML             |
| **SPA**                  | Single Page Application — app con una sola página que cambia       |
| **hot-reload**           | Recarga automática del navegador al cambiar código                  |
| **Firestore**            | Base de datos NoSQL de Firebase (documentos, no tablas)             |
| **Firebase Auth**        | Servicio de autenticación de Firebase                               |
| **Firebase Hosting**     | Hosting para archivos estáticos de Firebase                         |
| **MIME type**            | Tipo de archivo estándar (`application/pdf`, `image/png`, etc.)     |
| **DOM**                  | Document Object Model — representación en memoria del HTML          |

---

*Documentación generada con Claude Code — abril 2026*
