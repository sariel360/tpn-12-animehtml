/* =========================================================
   TP12 — Dando Vida al Código con Anime.js
   Tema elegido: HUD de telemetría de simracing.
   La página simula la secuencia de luces de largada de una
   carrera; al "dar la salida" se revela el contenido del hero
   como si fuera un panel de instrumentos que arranca.

   Estructura del archivo:
   1. Config y referencias al DOM
   2. Helpers (armar el título letra por letra, crear las
      franjas de velocidad de fondo)
   3. Timeline de entrada (anime.timeline)
   4. Animaciones ambientales en loop (dial girando, franjas)
   5. Contadores de telemetría (RPM / velocidad / vuelta)
   6. Interactividad (parallax con el mouse, click de rearranque,
      chispas al hacer click)
   ========================================================= */

(() => {
  'use strict';

  /* -----------------------------------------------------
     1. CONFIG Y REFERENCIAS AL DOM
  ----------------------------------------------------- */
  const COLOR_LIGHT_OFF = '#4a1512';
  const COLOR_LIGHT_ON  = '#ff3b30';
  const COLOR_LIGHT_GO  = '#00d26a';

  const prefersReducedMotion =
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const heroEl        = document.getElementById('hero');
  const lightsEl       = document.getElementById('lights');
  const titleEl        = document.getElementById('title');
  const subtitleEl     = document.getElementById('subtitle');
  const hintEl         = document.getElementById('hint');
  const dialParallaxEl = document.getElementById('dial-parallax');
  const speedlinesEl   = document.getElementById('speedlines');
  const replayBtn      = document.getElementById('replay-btn');

  const rpmValueEl   = document.getElementById('rpm-value');
  const speedValueEl = document.getElementById('speed-value');
  const lapValueEl   = document.getElementById('lap-value');

  /* -----------------------------------------------------
     2. HELPERS
  ----------------------------------------------------- */

  // Divide el título en <span class="letter"> para poder animar cada
  // letra por separado (efecto "staggering" pedido en la consigna).
  // Las letras de una misma palabra se agrupan dentro de un
  // <span class="word"> con white-space: nowrap: así el navegador solo
  // puede cortar línea entre palabras, nunca en la mitad de una.
  function buildLetters() {
    const text = titleEl.dataset.text || titleEl.textContent;
    titleEl.textContent = '';
    const words = text.split(' ');

    words.forEach((word, wordIndex) => {
      const wordSpan = document.createElement('span');
      wordSpan.className = 'word';
      word.split('').forEach((char) => {
        const letterSpan = document.createElement('span');
        letterSpan.className = 'letter';
        letterSpan.textContent = char;
        wordSpan.appendChild(letterSpan);
      });
      titleEl.appendChild(wordSpan);

      if (wordIndex < words.length - 1) {
        const spaceSpan = document.createElement('span');
        spaceSpan.className = 'letter is-space';
        spaceSpan.textContent = '\u00A0';
        titleEl.appendChild(spaceSpan);
      }
    });
  }

  // Genera las franjas de velocidad de fondo (decorativas) en posiciones
  // aleatorias. Se crean una sola vez; anime.js las anima en loop.
  function buildSpeedlines(count) {
    speedlinesEl.innerHTML = '';
    const lines = [];
    for (let i = 0; i < count; i++) {
      const line = document.createElement('span');
      line.className = 'speedline';
      line.style.top = `${anime.random(0, 100)}%`;
      line.style.left = '-10%';
      line.style.width = `${anime.random(80, 220)}px`;
      speedlinesEl.appendChild(line);
      lines.push(line);
    }
    return lines;
  }

  /* -----------------------------------------------------
     3. TIMELINE DE ENTRADA (secuencia de luces + revelado)
  ----------------------------------------------------- */

  // Vuelve todo a su estado inicial (sin animar) para poder
  // reproducir la secuencia de nuevo desde cero con el botón "Repetir".
  function resetScene() {
    sceneGeneration++; // invalida cualquier contador de la escena anterior
    anime.set('.light', { backgroundColor: COLOR_LIGHT_OFF, scale: 1 });
    anime.set(lightsEl, { opacity: 1, translateY: 0, scale: 1 });
    anime.set('.title .letter', { opacity: 0, translateY: 40, rotate: 6 });
    anime.set(subtitleEl, { opacity: 0, translateY: 14 });
    anime.set('.btn', { opacity: 0, scale: 0 });
    anime.set(hintEl, { opacity: 0 });
    rpmValueEl.textContent = '0';
    speedValueEl.textContent = '0';
  }

  // Referencia al timeline de entrada actualmente en curso. Si se
  // reinicia la secuencia antes de que termine, hay que pausar este
  // timeline: si no, sigue corriendo en paralelo al nuevo y su propio
  // callback de fin de secuencia (que dispara los contadores) termina
  // disparando tarde, encima de la secuencia recién iniciada.
  let introTimeline = null;

  // Construye y reproduce la secuencia de largada + revelado del hero.
  // Devuelve el timeline por si se necesita encadenar algo al finalizar.
  function playIntroSequence() {
    if (introTimeline) introTimeline.pause();

    const dur = prefersReducedMotion ? 0.001 : 1; // multiplicador de duración

    const tl = anime.timeline({
      easing: 'easeOutExpo',
    });

    tl
      // Las 5 luces se encienden una por una, como en la largada de una carrera.
      .add({
        targets: '.light',
        backgroundColor: COLOR_LIGHT_ON,
        duration: 260 * dur,
        delay: anime.stagger(260 * dur),
        easing: 'easeInOutQuad',
      })
      // Con todas encendidas, cambian juntas a verde: la señal de largada.
      .add({
        targets: '.light',
        backgroundColor: COLOR_LIGHT_GO,
        scale: [1, 1.18, 1],
        duration: 320 * dur,
        easing: 'easeInOutQuad',
      }, '+=220')
      // El panel de luces se retira hacia arriba, dejando paso al contenido.
      .add({
        targets: lightsEl,
        opacity: 0,
        translateY: -18,
        scale: 0.9,
        duration: 420 * dur,
        easing: 'easeInQuad',
      }, '+=160')
      // El título se arma letra por letra (translateY + rotate + opacity).
      .add({
        targets: '.title .letter',
        opacity: [0, 1],
        translateY: [40, 0],
        rotate: [6, 0],
        duration: 600 * dur,
        delay: anime.stagger(28 * dur, { from: 'center' }),
        easing: 'easeOutExpo',
      }, '-=260')
      // El subtítulo entra con un leve desplazamiento horizontal.
      .add({
        targets: subtitleEl,
        opacity: [0, 1],
        translateX: [-16, 0],
        duration: 520 * dur,
      }, '-=280')
      // Los botones "rebotan" al aparecer (easeOutElastic + scale).
      .add({
        targets: '.btn',
        opacity: [0, 1],
        scale: [0, 1],
        duration: 700 * dur,
        delay: anime.stagger(120 * dur),
        easing: 'easeOutElastic(1, .6)',
      }, '-=220')
      .add({
        targets: hintEl,
        opacity: [0, 1],
        duration: 500 * dur,
      }, '-=150')
      // Al terminar la entrada, arrancan los contadores de telemetría.
      .add({
        targets: {},
        duration: 1,
        complete: runTelemetryCounters,
      });

    introTimeline = tl;
    return tl;
  }

  /* -----------------------------------------------------
     4. ANIMACIONES AMBIENTALES EN LOOP
  ----------------------------------------------------- */

  function startAmbientLoops(speedlineEls) {
    if (prefersReducedMotion) return; // se respeta la preferencia del usuario

    // El dial de fondo gira indefinidamente, muy lento, a velocidad constante.
    anime({
      targets: '.dial',
      rotate: '360',
      duration: 42000,
      loop: true,
      easing: 'linear',
    });

    // Cada franja de velocidad cruza la pantalla y se desvanece; se repiten
    // en loop con un desfasaje (stagger) distinto para que no se sincronicen.
    anime({
      targets: speedlineEls,
      translateX: () => window.innerWidth * 1.3,
      opacity: [
        { value: 0, duration: 0 },
        { value: 0.75, duration: 200 },
        { value: 0, duration: 260, delay: 200 },
      ],
      duration: () => anime.random(1800, 3600),
      delay: (el, i) => i * 160,
      easing: 'linear',
      loop: true,
    });
  }

  /* -----------------------------------------------------
     5. CONTADORES DE TELEMETRÍA
  ----------------------------------------------------- */

  // "Número de generación" de la escena actual. Cada vez que se reinicia
  // la secuencia (resetScene) se incrementa. Los contadores en curso de
  // una generación anterior quedan invalidados y dejan de escribir en el
  // DOM aunque su animación siga corriendo unos frames más: evita que un
  // conteo viejo pise el "0" de un reset reciente.
  let sceneGeneration = 0;

  // Anima un objeto numérico auxiliar y escribe su valor redondeado
  // en pantalla en cada frame (patrón típico de "conteo" con anime.js).
  function animateCounter(el, to, opts = {}) {
    const counter = { value: 0 };
    const myGeneration = sceneGeneration;
    anime({
      targets: counter,
      value: to,
      round: 1,
      duration: opts.duration || 1400,
      delay: opts.delay || 0,
      easing: opts.easing || 'easeOutCubic',
      update: () => {
        if (myGeneration !== sceneGeneration) return; // generación vieja: ignorar
        el.textContent = counter.value.toLocaleString('es-AR');
      },
    });
  }

  function runTelemetryCounters() {
    animateCounter(rpmValueEl, 7850, { duration: 1500, easing: 'easeOutCubic' });
    animateCounter(speedValueEl, 214, { duration: 1500, delay: 120, easing: 'easeOutCubic' });
  }

  // El crono de vuelta corre solo, con requestAnimationFrame (no usa
  // anime.js porque necesita correr indefinidamente sin un valor final).
  let lapStart = null;
  function tickLapTimer(timestamp) {
    if (lapStart === null) lapStart = timestamp;
    const elapsed = timestamp - lapStart;
    const minutes = Math.floor(elapsed / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    const millis = Math.floor(elapsed % 1000);
    lapValueEl.textContent =
      `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
    requestAnimationFrame(tickLapTimer);
  }

  /* -----------------------------------------------------
     6. INTERACTIVIDAD
  ----------------------------------------------------- */

  // Parallax: el dial y el título reaccionan a la posición del mouse
  // dentro del hero, dando sensación de profundidad tipo HUD de cabina.
  function setupParallax() {
    if (prefersReducedMotion) return;

    heroEl.addEventListener('mousemove', (event) => {
      const rect = heroEl.getBoundingClientRect();
      const relX = (event.clientX - rect.left) / rect.width - 0.5;
      const relY = (event.clientY - rect.top) / rect.height - 0.5;

      anime({
        targets: dialParallaxEl,
        translateX: relX * 46,
        translateY: relY * 46,
        duration: 700,
        easing: 'easeOutQuad',
      });

      anime({
        targets: titleEl,
        translateX: relX * 16,
        translateY: relY * 10,
        duration: 700,
        easing: 'easeOutQuad',
      });
    });

    heroEl.addEventListener('mouseleave', () => {
      anime({
        targets: [dialParallaxEl, titleEl],
        translateX: 0,
        translateY: 0,
        duration: 600,
        easing: 'easeOutQuad',
      });
    });
  }

  // Pequeña explosión de chispas al hacer click en el botón principal:
  // crea nodos temporales y los anima con valores aleatorios por partícula.
  function spawnSparks(x, y) {
    if (prefersReducedMotion) return;

    const sparkCount = 10;
    const sparks = [];

    for (let i = 0; i < sparkCount; i++) {
      const spark = document.createElement('span');
      spark.style.position = 'fixed';
      spark.style.left = `${x}px`;
      spark.style.top = `${y}px`;
      spark.style.width = '5px';
      spark.style.height = '5px';
      spark.style.borderRadius = '50%';
      spark.style.background = 'var(--amber-data)';
      spark.style.pointerEvents = 'none';
      spark.style.zIndex = '20';
      document.body.appendChild(spark);
      sparks.push(spark);
    }

    anime({
      targets: sparks,
      translateX: () => anime.random(-70, 70),
      translateY: () => anime.random(-70, 70),
      scale: [1, 0],
      opacity: [1, 0],
      duration: () => anime.random(500, 850),
      easing: 'easeOutCubic',
      complete: () => sparks.forEach((s) => s.remove()),
    });
  }

  function setupReplayButton() {
    replayBtn.addEventListener('click', (event) => {
      lapStart = null; // reinicia el crono de vuelta
      resetScene();
      playIntroSequence();
      spawnSparks(event.clientX, event.clientY);
    });
  }

  /* -----------------------------------------------------
     ARRANQUE
  ----------------------------------------------------- */
  function init() {
    buildLetters();
    resetScene();
    const speedlineEls = buildSpeedlines(14);

    playIntroSequence();
    startAmbientLoops(speedlineEls);
    setupParallax();
    setupReplayButton();
    requestAnimationFrame(tickLapTimer);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
