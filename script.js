/**
 * ============================================================================
 * Portfólio de Hipermídia e Multimídia — Apple Design Edition
 * Controlador Multimídia Interativo (HTML5 Video, Web Audio API, Canvas 60fps)
 * ============================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  // ==========================================================================
  // 0. CONFIGURAÇÃO RÁPIDA DOS SEUS ARQUIVOS DE VÍDEO E ÁUDIO
  // ==========================================================================
  // Coloque seus arquivos (.mp4, .mp3, .wav) na mesma pasta deste projeto
  // e preencha os nomes abaixo (ex: 'meu-video.mp4' e 'meu-audio.mp3').
  // Se deixar em branco (''), o site usará a demonstração interativa integrada.
  const MEUS_TRABALHOS = {
    video: {
      arquivo: 'Trabalho CurriculumVitae.mp4',
      titulo: 'Trabalho Curriculum Vitae',
      subtitulo: 'Arquivo do Portfólio · Trabalho CurriculumVitae.mp4'
    },
    youtube: {
      url: 'https://www.youtube.com/watch?v=3kbCqswjvPc&t=1s',
      embedUrl: 'https://www.youtube.com/embed/3kbCqswjvPc?start=1&rel=0&modestbranding=1&playsinline=1'
    },
    audio: {
      arquivo: 'atividade_audio.mp3',
      titulo: 'Atividade de Áudio — Trabalho Prático (atividade_audio.mp3)',
      artista: 'Produção Sonora · Disciplina de Hipermídia e Multimídia'
    }
  };

  // ==========================================================================
  // 1. UTILITÁRIOS DE FORMATAÇÃO E SLIDERS (APPLE HIG)
  // ==========================================================================
  const formatTime = (seconds, showRemaining = false, total = 0) => {
    if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
    const val = showRemaining ? Math.max(0, total - seconds) : seconds;
    const mins = Math.floor(val / 60);
    const secs = Math.floor(val % 60);
    const prefix = showRemaining ? '-' : '';
    return `${prefix}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const formatPaddedTime = (seconds) => {
    if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const formatSMPTE = (seconds, fps = 60) => {
    if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const frames = Math.floor((seconds % 1) * fps);
    const pad = (n) => (n < 10 ? `0${n}` : `${n}`);
    return `00:${pad(mins)}:${pad(secs)}:${pad(frames)}`;
  };

  // Atualiza o preenchimento visual dos sliders no estilo iOS/macOS
  const updateSliderFill = (slider, accentColor = '#ffffff') => {
    const min = parseFloat(slider.min) || 0;
    const max = parseFloat(slider.max) || 100;
    const val = parseFloat(slider.value) || 0;
    const pct = Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100));
    const isLight = document.documentElement.classList.contains('light') && slider.classList.contains('light-adaptive');
    const trackBg = isLight ? 'rgba(0, 0, 0, 0.14)' : 'rgba(255, 255, 255, 0.22)';
    slider.style.background = `linear-gradient(to right, ${accentColor} 0%, ${accentColor} ${pct}%, ${trackBg} ${pct}%, ${trackBg} 100%)`;
  };

  const navMediaStatus = document.getElementById('nav-media-status');
  let lastActivePlayer = 'video'; // 'video' ou 'audio' para atalhos de teclado

  // ==========================================================================
  // 2. ALTERNADOR DE TEMA (DARK / LIGHT MODE - macOS Sequoia / Cupertino)
  // ==========================================================================
  const themeToggleBtn = document.getElementById('theme-toggle');
  const sunIcon = document.getElementById('theme-icon-sun');
  const moonIcon = document.getElementById('theme-icon-moon');

  themeToggleBtn.addEventListener('click', () => {
    const html = document.documentElement;
    const isDark = html.classList.contains('dark');
    if (isDark) {
      html.classList.remove('dark');
      html.classList.add('light');
      document.body.classList.remove('bg-black', 'text-white');
      document.body.classList.add('bg-[#f5f5f7]', 'text-zinc-900');
      sunIcon.classList.add('hidden');
      moonIcon.classList.remove('hidden');
    } else {
      html.classList.remove('light');
      html.classList.add('dark');
      document.body.classList.remove('bg-[#f5f5f7]', 'text-zinc-900');
      document.body.classList.add('bg-black', 'text-white');
      moonIcon.classList.add('hidden');
      sunIcon.classList.remove('hidden');
    }
    // Re-render slider fills for current theme
    updateSliderFill(audioScrubber, html.classList.contains('light') ? '#fa243c' : '#ffffff');
    updateSliderFill(audioVolume, html.classList.contains('light') ? '#1d1d1f' : '#ffffff');
  });

  // ==========================================================================
  // 3. GERADOR DE ÁUDIO WAV ESTÉREO PCM EM MEMÓRIA (ZERO DEPENDÊNCIA EXTERNA)
  // ==========================================================================
  // Gera arquivos .wav reais em memória para que os players funcionem offline
  // com som real, barra de progresso, volume e analisador FFT Web Audio API.
  function createSynthesizedWavBlob(durationSec, preset = 'podcast') {
    const sampleRate = 22050; // Rápido de gerar em JS e cristalino para síntese ambiente
    const numChannels = 2;
    const numSamples = Math.floor(sampleRate * durationSec);
    const bytesPerSample = 2; // 16-bit PCM
    const dataSize = numSamples * numChannels * bytesPerSample;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    const writeString = (offset, str) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    // Cabeçalho RIFF WAVE
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
    view.setUint16(32, numChannels * bytesPerSample, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    // Progressões harmônicas inspiradas na estética sonora da Apple
    const chords =
      preset === 'video'
        ? [
            [220.0, 277.18, 329.63, 440.0], // A Major 7
            [196.0, 246.94, 293.66, 392.0], // G Major
            [174.61, 220.0, 261.63, 349.23], // F Major 7
            [164.81, 207.65, 246.94, 329.63] // E Major
          ]
        : preset === 'binaural'
        ? [
            [146.83, 220.0, 293.66, 369.99],
            [130.81, 196.0, 261.63, 329.63],
            [164.81, 246.94, 329.63, 415.3],
            [146.83, 220.0, 293.66, 440.0]
          ]
        : preset === 'rhythmic'
        ? [
            [261.63, 329.63, 392.0, 523.25],
            [220.0, 261.63, 329.63, 440.0],
            [174.61, 220.0, 261.63, 349.23],
            [196.0, 246.94, 293.66, 392.0]
          ]
        : [
            // 'podcast' (Faixa 01 principal)
            [261.63, 329.63, 392.0, 493.88], // Cmaj7
            [220.0, 261.63, 329.63, 392.0],  // Am7
            [174.61, 220.0, 261.63, 329.63], // Fmaj7
            [196.0, 246.94, 293.66, 369.99]  // G6
          ];

    let offset = 44;
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const chordIndex = Math.floor((t / 4.5) % chords.length);
      const chord = chords[chordIndex];

      // Envelope de fade-in e fade-out suave
      const fadeIn = Math.min(1, t / 1.2);
      const fadeOut = Math.min(1, (durationSec - t) / 1.5);
      const masterEnv = fadeIn * fadeOut;

      // Pad harmônico espacial
      let padL = 0;
      let padR = 0;
      for (let n = 0; n < chord.length; n++) {
        const freq = chord[n];
        const detune = n % 2 === 0 ? 1.002 : 0.998;
        padL += Math.sin(2 * Math.PI * freq * t) * 0.14;
        padR += Math.sin(2 * Math.PI * (freq * detune) * t + 0.4) * 0.14;
      }

      // Arpejo cristalino (estilo Apple Keynote / Logic Pro Alchemy)
      const arpRate = preset === 'rhythmic' ? 6 : 3;
      const arpStep = Math.floor(t * arpRate) % chord.length;
      const arpNoteTime = (t * arpRate) % 1;
      const arpEnv = Math.exp(-arpNoteTime * 5.5);
      const arpFreq = chord[arpStep] * 2;
      const arpSignal = Math.sin(2 * Math.PI * arpFreq * t) * arpEnv * 0.22;

      // Pulso grave suave (Sub-bass)
      const subPulse = Math.sin(2 * Math.PI * (chord[0] * 0.5) * t) * (0.18 + 0.08 * Math.sin(2 * Math.PI * 0.5 * t));

      const pan = Math.sin(2 * Math.PI * 0.25 * t);
      const left = Math.max(-0.98, Math.min(0.98, (padL + subPulse + arpSignal * (0.6 + 0.4 * pan)) * masterEnv));
      const right = Math.max(-0.98, Math.min(0.98, (padR + subPulse + arpSignal * (0.6 - 0.4 * pan)) * masterEnv));

      view.setInt16(offset, left * 32767, true);
      view.setInt16(offset + 2, right * 32767, true);
      offset += 4;
    }

    return new Blob([buffer], { type: 'audio/wav' });
  }

  // ==========================================================================
  // 4. PLAYER DE VÍDEO CUSTOMIZADO (APPLE TV+ / HIPERMÍDIA ENGINE)
  // ==========================================================================
  const videoEl = document.getElementById('main-video');
  const motionCanvas = document.getElementById('motion-video-canvas');
  const mCtx = motionCanvas.getContext('2d');
  const videoViewport = document.getElementById('video-viewport');
  const videoPlayBtn = document.getElementById('video-play-btn');
  const videoCenterPlay = document.getElementById('video-center-play');
  const videoPlayIcon = document.getElementById('video-play-icon');
  const videoPauseIcon = document.getElementById('video-pause-icon');
  const videoCenterPlayIcon = document.getElementById('video-center-play-icon');
  const videoCenterPauseIcon = document.getElementById('video-center-pause-icon');
  const videoSkipBack = document.getElementById('video-skip-back');
  const videoSkipFwd = document.getElementById('video-skip-fwd');
  const videoMuteBtn = document.getElementById('video-mute-btn');
  const videoVolIcon = document.getElementById('video-vol-icon');
  const videoMuteIcon = document.getElementById('video-mute-icon');
  const videoVolume = document.getElementById('video-volume');
  const videoScrubber = document.getElementById('video-scrubber');
  const videoCurrentTimeEl = document.getElementById('video-current-time');
  const videoDurationEl = document.getElementById('video-duration');
  const videoSmpteEl = document.getElementById('video-smpte-code');
  const videoSpeedBtn = document.getElementById('video-speed-btn');
  const videoPipBtn = document.getElementById('video-pip-btn');
  const videoFullscreenBtn = document.getElementById('video-fullscreen-btn');
  const videoAmbientGlow = document.getElementById('video-ambient-glow');
  const toggleAmbientBtn = document.getElementById('toggle-ambient-btn');
  const ambientDot = document.getElementById('ambient-dot');
  const videoFileInput = document.getElementById('video-file-input');
  const resetVideoDemoBtn = document.getElementById('reset-video-demo-btn');
  const videoOverlayTitle = document.getElementById('video-overlay-title');
  const videoOverlayChapter = document.getElementById('video-overlay-chapter');
  const videoBadgeSource = document.getElementById('video-badge-source');
  const chapterCards = document.querySelectorAll('.video-chapter-card');

  // Áudio sincronizado para o documentário interativo em Canvas (Modo Demo)
  const demoVideoAudio = new Audio();
  demoVideoAudio.src = URL.createObjectURL(createSynthesizedWavBlob(60, 'video'));
  demoVideoAudio.volume = 0.8;

  // Estado do Player de Vídeo (Inicia com Trabalho CurriculumVitae.mp4 ativo)
  let isCustomVideoLoaded = true;
  let isVideoPlaying = false;
  let demoCurrentTime = 0;
  const demoDuration = 60; // 60 segundos divididos em 4 capítulos de 15s
  let playbackSpeedIndex = 1;
  const speeds = [0.5, 1.0, 1.25, 1.5, 2.0];
  let isAmbientActive = true;
  let lastFrameTimestamp = performance.now();

  // Metadados dos 4 Capítulos Hipermídia do Vídeo
  const videoChapters = [
    {
      start: 0,
      end: 15,
      title: 'Capítulo 01 · Vannevar Bush & O Conceito do Memex (1945)',
      headline: '01. O Memex & A Memória Associativa',
      subtitle: 'Em "As We May Think" (1945), Vannevar Bush propôs indexar o conhecimento humano por associação, exatamente como a mente opera.',
      accent: '#0071e3',
      glowClass: 'from-apple-blue/40 via-indigo-500/30 to-sky-400/35'
    },
    {
      start: 15,
      end: 30,
      title: 'Capítulo 02 · Ted Nelson, Hipertexto & Nós Não-Lineares (1965)',
      headline: '02. Hipertexto & Arquitetura de Nós',
      subtitle: 'O Projeto Xanadu cunhou os termos Hipertexto e Hipermídia: documentos interconectados onde o leitor escolhe seu próprio caminho.',
      accent: '#bf5af2',
      glowClass: 'from-apple-purple/40 via-fuchsia-500/30 to-indigo-500/35'
    },
    {
      start: 30,
      end: 45,
      title: 'Capítulo 03 · Síntese Multimídia & QuickTime Architecture',
      headline: '03. A Convergência Multimídia Digital',
      subtitle: 'Áudio PCM sem perdas, vídeo sincronizado por timecode SMPTE e gráficos vetoriais fundem-se em uma única experiência interativa.',
      accent: '#fa243c',
      glowClass: 'from-apple-red/40 via-orange-500/30 to-rose-500/35'
    },
    {
      start: 45,
      end: 60,
      title: 'Capítulo 04 · Computação Espacial & Apple Human Interface',
      headline: '04. Interfaces Espaciais & Imersão',
      subtitle: 'Translucidez física, áudio espacial binaural e controles táteis responsivos colocam o conteúdo no centro da percepção humana.',
      accent: '#64d2ff',
      glowClass: 'from-apple-teal/40 via-emerald-400/30 to-apple-blue/35'
    }
  ];

  // Renderizador Canvas 60fps para o Documentário Interativo Integrado
  function renderMotionVideoFrame(timeSec) {
    const w = motionCanvas.width;
    const h = motionCanvas.height;
    mCtx.clearRect(0, 0, w, h);

    // Identifica capítulo atual
    const activeChapterIndex = Math.min(3, Math.floor(timeSec / 15));
    const chapter = videoChapters[activeChapterIndex];
    const localT = (timeSec - chapter.start) / 15; // 0.0 a 1.0 dentro do capítulo

    // Fundo Gradiente Cinematográfico Estilo Apple Keynote
    const bgGrad = mCtx.createRadialGradient(
      w * (0.3 + 0.4 * Math.sin(timeSec * 0.4)),
      h * (0.35 + 0.2 * Math.cos(timeSec * 0.3)),
      40,
      w * 0.5,
      h * 0.5,
      w * 0.85
    );
    if (activeChapterIndex === 0) {
      bgGrad.addColorStop(0, '#0a2647');
      bgGrad.addColorStop(0.5, '#061121');
      bgGrad.addColorStop(1, '#020409');
    } else if (activeChapterIndex === 1) {
      bgGrad.addColorStop(0, '#2b1045');
      bgGrad.addColorStop(0.5, '#130721');
      bgGrad.addColorStop(1, '#040208');
    } else if (activeChapterIndex === 2) {
      bgGrad.addColorStop(0, '#420d1b');
      bgGrad.addColorStop(0.5, '#1c060c');
      bgGrad.addColorStop(1, '#050203');
    } else {
      bgGrad.addColorStop(0, '#0a3342');
      bgGrad.addColorStop(0.5, '#061824');
      bgGrad.addColorStop(1, '#020508');
    }
    mCtx.fillStyle = bgGrad;
    mCtx.fillRect(0, 0, w, h);

    // Grade de Precisão Hipermídia no Fundo
    mCtx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    mCtx.lineWidth = 1;
    const gridSize = 64;
    const offsetX = (timeSec * 18) % gridSize;
    for (let x = -gridSize + offsetX; x < w; x += gridSize) {
      mCtx.beginPath();
      mCtx.moveTo(x, 0);
      mCtx.lineTo(x, h);
      mCtx.stroke();
    }
    for (let y = 0; y < h; y += gridSize) {
      mCtx.beginPath();
      mCtx.moveTo(0, y);
      mCtx.lineTo(w, y);
      mCtx.stroke();
    }

    // Visualização Geométrica Central específica de cada Capítulo
    mCtx.save();
    const centerX = w * 0.72;
    const centerY = h * 0.46;

    if (activeChapterIndex === 0) {
      // Capítulo 1: Trilhas Associativas do Memex (Anéis Orbitais Conectados)
      for (let r = 1; r <= 4; r++) {
        mCtx.beginPath();
        mCtx.arc(centerX, centerY, r * 42, 0, Math.PI * 2);
        mCtx.strokeStyle = `rgba(0, 113, 227, ${0.35 - r * 0.06})`;
        mCtx.lineWidth = 1.5;
        mCtx.stroke();

        const angle = timeSec * (0.6 / r) + r * 1.4;
        const nx = centerX + Math.cos(angle) * (r * 42);
        const ny = centerY + Math.sin(angle) * (r * 42);
        mCtx.beginPath();
        mCtx.arc(nx, ny, 7, 0, Math.PI * 2);
        mCtx.fillStyle = '#64d2ff';
        mCtx.fill();
      }
    } else if (activeChapterIndex === 1) {
      // Capítulo 2: Grafo de Hipertexto & Nós Não-Lineares
      const nodes = [];
      for (let i = 0; i < 9; i++) {
        const ang = (i / 9) * Math.PI * 2 + timeSec * 0.25;
        const rad = 95 + 55 * Math.sin(timeSec * 0.8 + i);
        nodes.push({
          x: centerX + Math.cos(ang) * rad,
          y: centerY + Math.sin(ang) * rad
        });
      }
      mCtx.strokeStyle = 'rgba(191, 90, 242, 0.35)';
      mCtx.lineWidth = 1.5;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          if ((i + j) % 2 === 0) {
            mCtx.beginPath();
            mCtx.moveTo(nodes[i].x, nodes[i].y);
            mCtx.lineTo(nodes[j].x, nodes[j].y);
            mCtx.stroke();
          }
        }
      }
      nodes.forEach((n, idx) => {
        mCtx.beginPath();
        mCtx.arc(n.x, n.y, idx % 3 === 0 ? 9 : 6, 0, Math.PI * 2);
        mCtx.fillStyle = idx % 2 === 0 ? '#bf5af2' : '#ffffff';
        mCtx.fill();
      });
    } else if (activeChapterIndex === 2) {
      // Capítulo 3: Ondas Senoidais Multimídia (Áudio + Vídeo + Vetor)
      for (let layer = 0; layer < 4; layer++) {
        mCtx.beginPath();
        for (let x = centerX - 180; x <= centerX + 180; x += 4) {
          const norm = (x - (centerX - 180)) / 360;
          const env = Math.sin(norm * Math.PI);
          const y =
            centerY +
            Math.sin((x * 0.03) + timeSec * (3 + layer) + layer) * 68 * env;
          if (x === centerX - 180) mCtx.moveTo(x, y);
          else mCtx.lineTo(x, y);
        }
        mCtx.strokeStyle = layer === 0 ? '#fa243c' : layer === 1 ? '#ff9f0a' : 'rgba(255,255,255,0.45)';
        mCtx.lineWidth = 3 - layer * 0.4;
        mCtx.stroke();
      }
    } else {
      // Capítulo 4: Computação Espacial & Janelas visionOS
      for (let k = 3; k >= 0; k--) {
        const shiftX = Math.sin(timeSec * 0.9 + k) * 14;
        const shiftY = Math.cos(timeSec * 0.7 + k) * 10;
        const cardW = 240 - k * 22;
        const cardH = 145 - k * 12;
        const rx = centerX - cardW / 2 + shiftX + k * 12;
        const ry = centerY - cardH / 2 + shiftY - k * 14;

        mCtx.fillStyle = `rgba(100, 210, 255, ${0.08 + (3 - k) * 0.05})`;
        mCtx.strokeStyle = `rgba(255, 255, 255, ${0.2 + (3 - k) * 0.1})`;
        mCtx.lineWidth = 1.5;
        mCtx.beginPath();
        mCtx.roundRect(rx, ry, cardW, cardH, 20);
        mCtx.fill();
        mCtx.stroke();
      }
    }
    mCtx.restore();

    // Tipografia Editorial Apple Keynote no lado esquerdo do quadro
    mCtx.save();
    mCtx.fillStyle = chapter.accent;
    mCtx.font = '600 14px -apple-system, BlinkMacSystemFont, "Inter", sans-serif';
    mCtx.fillText(`HIPERMÍDIA & MULTIMÍDIA · NÓ 0${activeChapterIndex + 1}`, 76, h * 0.34);

    mCtx.fillStyle = '#ffffff';
    mCtx.font = '700 40px -apple-system, BlinkMacSystemFont, "Inter", sans-serif';
    mCtx.fillText(chapter.headline, 76, h * 0.43);

    // Quebra automática de linha para o subtítulo explicativo
    mCtx.fillStyle = 'rgba(235, 235, 245, 0.78)';
    mCtx.font = '400 20px -apple-system, BlinkMacSystemFont, "Inter", sans-serif';
    const words = chapter.subtitle.split(' ');
    let line = '';
    let yPos = h * 0.51;
    const maxWidth = w * 0.46;
    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + ' ';
      if (mCtx.measureText(testLine).width > maxWidth && i > 0) {
        mCtx.fillText(line, 76, yPos);
        line = words[i] + ' ';
        yPos += 30;
      } else {
        line = testLine;
      }
    }
    mCtx.fillText(line, 76, yPos);

    // Barra de progresso interna do capítulo
    const barX = 76;
    const barY = yPos + 38;
    const barW = 240;
    mCtx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    mCtx.beginPath();
    mCtx.roundRect(barX, barY, barW, 5, 3);
    mCtx.fill();

    mCtx.fillStyle = chapter.accent;
    mCtx.beginPath();
    mCtx.roundRect(barX, barY, barW * Math.max(0.02, Math.min(1, localT)), 5, 3);
    mCtx.fill();

    mCtx.restore();
  }

  // Sincroniza a UI do Player de Vídeo (Capítulos, SMPTE, Scrubber e Luz Ambiente)
  function updateVideoUI(currentTime, duration) {
    videoCurrentTimeEl.textContent = formatPaddedTime(currentTime);
    videoDurationEl.textContent = formatPaddedTime(duration);
    videoSmpteEl.textContent = formatSMPTE(currentTime, 60);

    videoScrubber.max = duration || 60;
    videoScrubber.value = currentTime;
    updateSliderFill(videoScrubber, '#0071e3');

    // Atualiza Capítulo Ativo
    const ratio = duration > 0 ? currentTime / duration : 0;
    const chapterIdx = Math.min(3, Math.floor(ratio * 4));
    const activeChap = videoChapters[chapterIdx];

    if (!isCustomVideoLoaded) {
      videoOverlayChapter.textContent = activeChap.title;
    }

    // Atualiza Luz Ambiente Dinâmica
    if (isAmbientActive) {
      videoAmbientGlow.className = `ambient-glow absolute -inset-3 rounded-[36px] bg-gradient-to-r ${activeChap.glowClass} opacity-85 pointer-events-none z-0`;
    }

    // Destaca o Card de Capítulo correspondente
    chapterCards.forEach((card, idx) => {
      const statusBadge = card.querySelector('div span:last-child');
      if (idx === chapterIdx) {
        card.classList.add('border-apple-blue/60', 'ring-1', 'ring-apple-blue/40');
        if (statusBadge) {
          statusBadge.textContent = 'Em exibição';
          statusBadge.className = 'px-1.5 py-0.5 rounded bg-apple-blue/20 text-[10px] text-apple-blue';
        }
      } else {
        card.classList.remove('border-apple-blue/60', 'ring-1', 'ring-apple-blue/40');
        if (statusBadge) {
          statusBadge.textContent = 'Saltar →';
          statusBadge.className = 'text-[10px] text-apple-gray';
        }
      }
    });
  }

  function setVideoPlayingState(playing) {
    isVideoPlaying = playing;
    if (playing) {
      lastActivePlayer = 'video';
      // Pausa o player de áudio se estiver tocando para evitar sobreposição sonora
      if (!audioEl.paused) {
        toggleAudioPlayback(false);
      }
      videoPlayIcon.classList.add('hidden');
      videoPauseIcon.classList.remove('hidden');
      videoCenterPlayIcon.classList.add('hidden');
      videoCenterPauseIcon.classList.remove('hidden');
      videoCenterPlay.classList.add('opacity-0', ' group-hover:opacity-100');
      navMediaStatus.textContent = 'Vídeo · Reproduzindo';
    } else {
      videoPlayIcon.classList.remove('hidden');
      videoPauseIcon.classList.add('hidden');
      videoCenterPlayIcon.classList.remove('hidden');
      videoCenterPauseIcon.classList.add('hidden');
      videoCenterPlay.classList.remove('opacity-0', 'group-hover:opacity-100');
      navMediaStatus.textContent = 'Vídeo · Pausado';
    }
  }

  function toggleVideoPlayback() {
    if (isCustomVideoLoaded) {
      if (videoEl.paused) {
        videoEl.play();
        setVideoPlayingState(true);
      } else {
        videoEl.pause();
        setVideoPlayingState(false);
      }
    } else {
      if (!isVideoPlaying) {
        if (demoCurrentTime >= demoDuration) {
          demoCurrentTime = 0;
          demoVideoAudio.currentTime = 0;
        }
        lastFrameTimestamp = performance.now();
        demoVideoAudio.play().catch(() => {});
        setVideoPlayingState(true);
      } else {
        demoVideoAudio.pause();
        setVideoPlayingState(false);
      }
    }
  }

  function seekVideoTo(targetSeconds) {
    const maxDur = isCustomVideoLoaded ? (videoEl.duration || 60) : demoDuration;
    const clamped = Math.max(0, Math.min(maxDur, targetSeconds));
    if (isCustomVideoLoaded) {
      videoEl.currentTime = clamped;
      updateVideoUI(clamped, maxDur);
    } else {
      demoCurrentTime = clamped;
      if (Number.isFinite(demoVideoAudio.duration)) {
        demoVideoAudio.currentTime = Math.min(demoVideoAudio.duration - 0.1, clamped);
      }
      renderMotionVideoFrame(demoCurrentTime);
      updateVideoUI(demoCurrentTime, demoDuration);
    }
  }

  // Loop de Animação 60fps para o Player de Vídeo
  function videoAnimationLoop(now) {
    const dt = (now - lastFrameTimestamp) / 1000;
    lastFrameTimestamp = now;

    if (!isCustomVideoLoaded && isVideoPlaying) {
      const currentSpeed = speeds[playbackSpeedIndex];
      demoCurrentTime += dt * currentSpeed;
      if (demoCurrentTime >= demoDuration) {
        demoCurrentTime = demoDuration;
        demoVideoAudio.pause();
        setVideoPlayingState(false);
      }
      renderMotionVideoFrame(demoCurrentTime);
      updateVideoUI(demoCurrentTime, demoDuration);
    }
    requestAnimationFrame(videoAnimationLoop);
  }

  // Inicializa o primeiro quadro do vídeo (Trabalho CurriculumVitae.mp4 por padrão)
  renderMotionVideoFrame(0);
  updateVideoUI(0, 62);
  updateSliderFill(videoVolume, '#ffffff');
  requestAnimationFrame(videoAnimationLoop);

  videoEl.addEventListener('loadedmetadata', () => {
    if (isCustomVideoLoaded && Number.isFinite(videoEl.duration)) {
      updateVideoUI(videoEl.currentTime || 0, videoEl.duration);
    }
  });

  // Eventos dos botões do Player de Vídeo
  videoPlayBtn.addEventListener('click', toggleVideoPlayback);
  videoCenterPlay.addEventListener('click', toggleVideoPlayback);
  motionCanvas.addEventListener('click', toggleVideoPlayback);
  videoEl.addEventListener('click', toggleVideoPlayback);

  videoSkipBack.addEventListener('click', () => {
    const cur = isCustomVideoLoaded ? videoEl.currentTime : demoCurrentTime;
    seekVideoTo(cur - 10);
  });

  videoSkipFwd.addEventListener('click', () => {
    const cur = isCustomVideoLoaded ? videoEl.currentTime : demoCurrentTime;
    seekVideoTo(cur + 10);
  });

  videoScrubber.addEventListener('input', (e) => {
    seekVideoTo(parseFloat(e.target.value));
  });

  // Controle de Volume e Mudo do Vídeo
  videoVolume.addEventListener('input', (e) => {
    const vol = parseFloat(e.target.value);
    videoEl.volume = vol;
    demoVideoAudio.volume = vol;
    videoEl.muted = vol === 0;
    demoVideoAudio.muted = vol === 0;
    videoVolIcon.classList.toggle('hidden', vol === 0);
    videoMuteIcon.classList.toggle('hidden', vol > 0);
    updateSliderFill(videoVolume, '#ffffff');
  });

  videoMuteBtn.addEventListener('click', () => {
    const isMuted = isCustomVideoLoaded ? !videoEl.muted : !demoVideoAudio.muted;
    videoEl.muted = isMuted;
    demoVideoAudio.muted = isMuted;
    videoVolIcon.classList.toggle('hidden', isMuted);
    videoMuteIcon.classList.toggle('hidden', !isMuted);
  });

  // Velocidade de Reprodução (0.5x -> 2.0x)
  videoSpeedBtn.addEventListener('click', () => {
    playbackSpeedIndex = (playbackSpeedIndex + 1) % speeds.length;
    const newSpeed = speeds[playbackSpeedIndex];
    videoEl.playbackRate = newSpeed;
    demoVideoAudio.playbackRate = newSpeed;
    videoSpeedBtn.textContent = `${newSpeed.toFixed(newSpeed % 1 === 0 ? 1 : 2)}x`;
  });

  // Modo Luz Ambiente (Apple Cinema Glow)
  toggleAmbientBtn.addEventListener('click', () => {
    isAmbientActive = !isAmbientActive;
    videoAmbientGlow.style.opacity = isAmbientActive ? '0.85' : '0';
    ambientDot.className = isAmbientActive
      ? 'w-2 h-2 rounded-full bg-apple-blue'
      : 'w-2 h-2 rounded-full bg-zinc-500';
    toggleAmbientBtn.querySelector('span:last-child').textContent = isAmbientActive
      ? 'Luz Ambiente: Ativa'
      : 'Luz Ambiente: Inativa';
  });

  // Tela Cheia (Fullscreen)
  videoFullscreenBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      videoViewport.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  });

  // Picture-in-Picture (Funciona tanto para vídeo MP4 quanto para o Canvas Motion!)
  videoPipBtn.addEventListener('click', async () => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        return;
      }
      if (!isCustomVideoLoaded && motionCanvas.captureStream) {
        const stream = motionCanvas.captureStream(30);
        videoEl.srcObject = stream;
        await videoEl.play();
      }
      await videoEl.requestPictureInPicture();
    } catch (err) {
      console.warn('Picture-in-Picture indisponível neste navegador:', err);
    }
  });

  // Clique nos Cards de Capítulo (Navegação Hipermídia)
  chapterCards.forEach((card, index) => {
    card.addEventListener('click', () => {
      const maxDur = isCustomVideoLoaded ? (videoEl.duration || 60) : demoDuration;
      const targetTime = isCustomVideoLoaded ? (index * 0.25 * maxDur) : parseFloat(card.dataset.time);
      seekVideoTo(targetTime);
      if (!isVideoPlaying) {
        toggleVideoPlayback();
      }
    });
  });

  // Importação de Arquivo de Vídeo Local (.mp4 / .webm / .mov)
  videoFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Pausa demo atual
    demoVideoAudio.pause();
    isCustomVideoLoaded = true;

    const fileURL = URL.createObjectURL(file);
    videoEl.srcObject = null;
    videoEl.src = fileURL;
    videoEl.classList.remove('hidden');
    motionCanvas.classList.add('hidden');
    resetVideoDemoBtn.classList.remove('hidden');
    resetVideoDemoBtn.classList.add('inline-flex');

    const cleanName = file.name.replace(/\.[^/.]+$/, '');
    videoOverlayTitle.textContent = cleanName;
    videoOverlayChapter.textContent = `Arquivo Local Carregado (${(file.size / (1024 * 1024)).toFixed(1)} MB)`;
    videoBadgeSource.textContent = file.type.split('/')[1]?.toUpperCase() || 'MP4 LOCAL';

    videoEl.addEventListener(
      'loadedmetadata',
      () => {
        updateVideoUI(0, videoEl.duration || 60);
        videoEl.play().then(() => setVideoPlayingState(true)).catch(() => {});
      },
      { once: true }
    );
  });

  videoEl.addEventListener('timeupdate', () => {
    if (isCustomVideoLoaded) {
      updateVideoUI(videoEl.currentTime, videoEl.duration || 60);
    }
  });

  videoEl.addEventListener('ended', () => {
    if (isCustomVideoLoaded) {
      setVideoPlayingState(false);
    }
  });

  // Botão para alternar entre o vídeo Trabalho CurriculumVitae.mp4 e a Demo Interativa 60fps
  const toggleDemoLabel = document.getElementById('toggle-demo-label');
  resetVideoDemoBtn.addEventListener('click', () => {
    if (isCustomVideoLoaded) {
      videoEl.pause();
      isCustomVideoLoaded = false;
      videoEl.classList.add('hidden');
      motionCanvas.classList.remove('hidden');
      if (toggleDemoLabel) toggleDemoLabel.textContent = 'Voltar ao Vídeo Curriculum Vitae';

      videoOverlayTitle.textContent = 'A Evolução da Hipermídia & Computação Espacial';
      videoOverlayChapter.textContent = 'Capítulo 01 · Vannevar Bush & O Conceito do Memex (1945)';
      videoBadgeSource.textContent = 'Apple Motion 60fps';
      demoCurrentTime = 0;
      demoVideoAudio.currentTime = 0;
      renderMotionVideoFrame(0);
      updateVideoUI(0, demoDuration);
      setVideoPlayingState(false);
    } else {
      demoVideoAudio.pause();
      isCustomVideoLoaded = true;
      motionCanvas.classList.add('hidden');
      videoEl.classList.remove('hidden');
      if (toggleDemoLabel) toggleDemoLabel.textContent = 'Alternar para Demo 60fps';

      videoOverlayTitle.textContent = MEUS_TRABALHOS.video.titulo;
      videoOverlayChapter.textContent = MEUS_TRABALHOS.video.subtitulo;
      videoBadgeSource.textContent = 'MP4 NATIVO · HD';
      updateVideoUI(videoEl.currentTime || 0, videoEl.duration || 62);
      setVideoPlayingState(false);
    }
  });

  // Botão de Reiniciar o Player do YouTube em t=1s
  const ytReloadBtn = document.getElementById('yt-reload-btn');
  const ytIframe = document.getElementById('youtube-iframe');
  if (ytReloadBtn && ytIframe) {
    ytReloadBtn.addEventListener('click', () => {
      ytIframe.src = 'https://www.youtube.com/embed/3kbCqswjvPc?start=1&autoplay=1&rel=0&modestbranding=1&playsinline=1';
    });
  }

  // ==========================================================================
  // 5. PLAYER DE ÁUDIO (APPLE MUSIC & LOGIC PRO STUDIO ENGINE)
  // ==========================================================================
  const audioEl = document.getElementById('main-audio');
  const audioPlayBtn = document.getElementById('audio-play-btn');
  const audioPlayIcon = document.getElementById('audio-play-icon');
  const audioPauseIcon = document.getElementById('audio-pause-icon');
  const audioPrevBtn = document.getElementById('audio-prev-btn');
  const audioNextBtn = document.getElementById('audio-next-btn');
  const audioBack5s = document.getElementById('audio-back-5s');
  const audioFwd5s = document.getElementById('audio-fwd-5s');
  const audioScrubber = document.getElementById('audio-scrubber');
  const audioCurrentTimeEl = document.getElementById('audio-current-time');
  const audioRemainingTimeEl = document.getElementById('audio-remaining-time');
  const audioVolume = document.getElementById('audio-volume');
  const audioTrackTitle = document.getElementById('audio-track-title');
  const audioTrackArtist = document.getElementById('audio-track-artist');
  const albumArtBox = document.getElementById('album-art-box');
  const albumArtBadge = document.getElementById('album-art-badge');
  const audioAmbientBg = document.getElementById('audio-ambient-bg');
  const lyricsScrollBox = document.getElementById('lyrics-scroll-box');
  const tracklistContainer = document.getElementById('audio-tracklist-container');
  const audioEqIndicator = document.getElementById('audio-eq-indicator');
  const audioStatusText = document.getElementById('audio-status-text');
  const audioLiveDot = document.getElementById('audio-live-dot');
  const audioFileInput = document.getElementById('audio-file-input');
  const audioFormatSpec = document.getElementById('audio-format-spec');
  const vizCanvas = document.getElementById('audio-visualizer');
  const vCtx = vizCanvas.getContext('2d');
  const toggleVizModeBtn = document.getElementById('toggle-viz-mode');

  // Catálogo de Faixas do Trabalho de Áudio (Faixa 01 = atividade_audio.mp3 enviada pelo usuário)
  const audioTracks = [
    {
      id: 0,
      title: 'Atividade de Áudio — Trabalho Prático (atividade_audio.mp3)',
      artist: 'Produção Sonora · Portfólio de Hipermídia e Multimídia',
      duration: 61,
      fileSrc: 'atividade_audio.mp3',
      preset: 'custom',
      badge: 'MP3 Original · 1.3 MB',
      gradient: 'from-rose-600 via-fuchsia-700 to-indigo-900',
      ambient: 'from-apple-red/35 via-apple-purple/25 to-apple-blue/20',
      blobUrl: 'atividade_audio.mp3',
      lyrics: [
        { time: 0, text: '♪ [00:00] Início da reprodução: Atividade de Áudio (atividade_audio.mp3)' },
        { time: 12, text: 'Apresentação e desenvolvimento sonoro do trabalho prático de áudio.' },
        { time: 25, text: 'Clique em qualquer trecho deste roteiro sincronizado para saltar diretamente na linha do tempo.' },
        { time: 40, text: 'Processamento de áudio integrado ao player Apple Music com análise espectral 60fps.' },
        { time: 52, text: '♪ [00:52] Conclusão e encerramento da faixa de áudio.' }
      ]
    },
    {
      id: 1,
      title: 'Estudo Complementar 02: Paisagem Sonora Binaural & Síntese FM',
      artist: 'Estudo Acústico · Espacialização Estéreo L/R',
      duration: 32,
      preset: 'binaural',
      badge: 'Binaural · 44.1kHz',
      gradient: 'from-indigo-600 via-purple-700 to-slate-900',
      ambient: 'from-indigo-500/35 via-purple-500/25 to-sky-400/20',
      blobUrl: null,
      lyrics: [
        { time: 0, text: '♪ [Início: Osciladores duplos com leve desvio de fase entre os canais L e R]' },
        { time: 6, text: 'A percepção binaural ocorre quando frequências ligeiramente distintas chegam a cada ouvido.' },
        { time: 13, text: 'Observe no analisador espectral como os harmônicos graves sustentam a atmosfera.' },
        { time: 20, text: 'No design de interfaces da Apple, sons sutis transmitem materialidade e profundidade.' },
        { time: 27, text: '♪ [Resolução: Ressonância harmônica em Ré Menor Dórico]' }
      ]
    },
    {
      id: 2,
      title: 'Estudo Complementar 03: Ritmo Algorítmico & Texturas Digitais',
      artist: 'Composição Procedural · Sequenciador Harmônico',
      duration: 28,
      preset: 'rhythmic',
      badge: 'Sequência · 60fps FFT',
      gradient: 'from-sky-500 via-blue-700 to-emerald-900',
      ambient: 'from-apple-teal/35 via-apple-blue/25 to-emerald-500/20',
      blobUrl: null,
      lyrics: [
        { time: 0, text: '♪ [Pulso Algorítmico: Arpejos gerados matematicamente a 180 notas por minuto]' },
        { time: 6, text: 'A multimídia computacional permite gerar música diretamente a partir de algoritmos.' },
        { time: 12, text: 'Envelopes exponenciais controlam o ataque e o decaimento de cada nota sintetizada.' },
        { time: 19, text: 'Experimente clicar no visualizador ao lado para alternar entre FFT e Osciloscópio.' },
        { time: 24, text: '♪ [Finalização: Cadência suspensa e silêncio digital]' }
      ]
    }
  ];

  // Mantém o arquivo real na faixa 1 e gera os blobs WAV para as faixas sintetizadas
  audioTracks.forEach((track) => {
    if (track.fileSrc) {
      track.blobUrl = track.fileSrc;
    } else {
      const blob = createSynthesizedWavBlob(track.duration, track.preset);
      track.blobUrl = URL.createObjectURL(blob);
    }
  });

  let currentTrackIndex = 0;
  let vizMode = 'bars'; // 'bars' ou 'wave'
  let audioCtx = null;
  let analyser = null;
  let dataArray = null;
  let timeDomainArray = null;

  // Inicializa Web Audio API (AnalyserNode FFT) quando em HTTP/HTTPS para evitar bloqueio CORS em file://
  function ensureAudioContext() {
    if (window.location.protocol === 'file:') {
      return; // Em file:// o elemento <audio> toca direto sem risco de silenciamento por CORS
    }
    if (audioCtx) {
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      return;
    }
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContextClass();
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.82;

      const source = audioCtx.createMediaElementSource(audioEl);
      source.connect(analyser);
      analyser.connect(audioCtx.destination);

      dataArray = new Uint8Array(analyser.frequencyBinCount);
      timeDomainArray = new Uint8Array(analyser.frequencyBinCount);
    } catch (err) {
      console.warn('Web Audio API fallback ativo:', err);
    }
  }

  // Renderiza o Roteiro Sincronizado (Live Lyrics) da faixa ativa
  function renderLyricsForTrack(track) {
    lyricsScrollBox.innerHTML = '';
    track.lyrics.forEach((item, index) => {
      const lineEl = document.createElement('div');
      lineEl.className = `lyric-line py-1.5 px-3 rounded-xl text-base sm:text-lg font-semibold leading-snug ${index === 0 ? 'active' : ''}`;
      lineEl.dataset.time = item.time;
      lineEl.innerHTML = `
        <span class="block text-[10px] font-mono text-apple-red uppercase tracking-wider mb-0.5">${formatPaddedTime(item.time)}</span>
        <span>${item.text}</span>
      `;
      lineEl.addEventListener('click', () => {
        audioEl.currentTime = item.time;
        if (audioEl.paused) {
          toggleAudioPlayback(true);
        }
      });
      lyricsScrollBox.appendChild(lineEl);
    });
  }

  // Renderiza a Lista de Faixas (Playlist Tab)
  function renderPlaylistUI() {
    tracklistContainer.innerHTML = '';
    audioTracks.forEach((track, idx) => {
      const isActive = idx === currentTrackIndex;
      const item = document.createElement('button');
      item.type = 'button';
      item.className = `w-full p-3.5 rounded-2xl flex items-center justify-between text-left transition-all border ${
        isActive
          ? 'bg-white/15 border-apple-red/50 shadow-lg'
          : 'bg-white/5 border-white/10 hover:bg-white/10'
      }`;
      item.innerHTML = `
        <div class="flex items-center gap-3.5 min-w-0">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br ${track.gradient} flex items-center justify-center text-white font-mono text-xs font-bold shrink-0">
            0${idx + 1}
          </div>
          <div class="min-w-0">
            <h4 class="text-sm font-semibold truncate ${isActive ? 'text-apple-red dark:text-apple-red' : ''}">${track.title}</h4>
            <p class="text-xs text-apple-gray truncate">${track.artist}</p>
          </div>
        </div>
        <div class="flex items-center gap-2 shrink-0 ml-3">
          <span class="px-2 py-0.5 rounded bg-white/10 text-[10px] font-mono text-zinc-300">${track.badge}</span>
          <span class="text-xs font-mono text-apple-gray">${formatTime(track.duration)}</span>
        </div>
      `;
      item.addEventListener('click', () => {
        loadAudioTrack(idx, true);
      });
      tracklistContainer.appendChild(item);
    });
  }

  function loadAudioTrack(index, autoPlay = false) {
    currentTrackIndex = (index + audioTracks.length) % audioTracks.length;
    const track = audioTracks[currentTrackIndex];

    audioEl.src = track.blobUrl;
    audioTrackTitle.textContent = track.title;
    audioTrackArtist.textContent = track.artist;
    albumArtBadge.textContent = track.badge;

    albumArtBox.className = `album-art-wrapper ${
      !audioEl.paused ? 'is-playing' : 'is-paused'
    } relative w-44 h-44 sm:w-48 sm:h-48 rounded-2xl overflow-hidden shadow-2xl border border-white/15 shrink-0 bg-gradient-to-br ${track.gradient} flex flex-col items-center justify-center p-5`;

    audioAmbientBg.className = `absolute -top-24 -left-24 w-96 h-96 rounded-full bg-gradient-to-br ${track.ambient} blur-[90px] pointer-events-none transition-all duration-1000`;

    audioScrubber.max = track.duration;
    audioScrubber.value = 0;
    audioCurrentTimeEl.textContent = '0:00';
    audioRemainingTimeEl.textContent = formatTime(0, true, track.duration);
    updateSliderFill(audioScrubber, document.documentElement.classList.contains('light') ? '#fa243c' : '#ffffff');

    renderLyricsForTrack(track);
    renderPlaylistUI();

    if (autoPlay) {
      toggleAudioPlayback(true);
    }
  }

  function toggleAudioPlayback(forceState) {
    ensureAudioContext();
    const shouldPlay = typeof forceState === 'boolean' ? forceState : audioEl.paused;

    if (shouldPlay) {
      lastActivePlayer = 'audio';
      // Pausa o vídeo se estiver tocando
      if (isVideoPlaying) {
        toggleVideoPlayback();
      }
      audioEl.play().then(() => {
        audioPlayIcon.classList.add('hidden');
        audioPauseIcon.classList.remove('hidden');
        albumArtBox.classList.remove('is-paused');
        albumArtBox.classList.add('is-playing');
        audioEqIndicator.classList.add('playing');
        audioStatusText.textContent = 'Reproduzindo Áudio';
        audioLiveDot.className = 'w-2 h-2 rounded-full bg-apple-red animate-ping';
        navMediaStatus.textContent = 'Áudio · Reproduzindo';
      }).catch((err) => console.warn('Erro ao iniciar áudio:', err));
    } else {
      audioEl.pause();
      audioPlayIcon.classList.remove('hidden');
      audioPauseIcon.classList.add('hidden');
      albumArtBox.classList.remove('is-playing');
      albumArtBox.classList.add('is-paused');
      audioEqIndicator.classList.remove('playing');
      audioStatusText.textContent = 'Áudio Pausado';
      audioLiveDot.className = 'w-2 h-2 rounded-full bg-zinc-500';
      navMediaStatus.textContent = 'Áudio · Pausado';
    }
  }

  // Atualização de Tempo e Sincronização Hipermídia das Estrofes (Live Lyrics)
  audioEl.addEventListener('timeupdate', () => {
    const cur = audioEl.currentTime;
    const dur = audioEl.duration || audioTracks[currentTrackIndex].duration || 36;
    audioScrubber.max = dur;
    audioScrubber.value = cur;
    audioCurrentTimeEl.textContent = formatTime(cur);
    audioRemainingTimeEl.textContent = formatTime(cur, true, dur);
    updateSliderFill(audioScrubber, document.documentElement.classList.contains('light') ? '#fa243c' : '#ffffff');

    // Sincroniza linha ativa do roteiro
    const track = audioTracks[currentTrackIndex];
    const lyricLines = lyricsScrollBox.querySelectorAll('.lyric-line');
    let activeIdx = 0;
    for (let i = 0; i < track.lyrics.length; i++) {
      if (cur >= track.lyrics[i].time) {
        activeIdx = i;
      }
    }
    lyricLines.forEach((el, idx) => {
      if (idx === activeIdx) {
        if (!el.classList.contains('active')) {
          el.classList.add('active');
          // Faz scroll suave apenas dentro da caixa de letras sem mover a janela inteira
          const targetScroll = el.offsetTop - lyricsScrollBox.clientHeight / 2 + el.clientHeight / 2;
          lyricsScrollBox.scrollTo({ top: Math.max(0, targetScroll), behavior: 'smooth' });
        }
      } else {
        el.classList.remove('active');
      }
    });
  });

  audioEl.addEventListener('ended', () => {
    toggleAudioPlayback(false);
  });

  // Controles do Player de Áudio
  audioPlayBtn.addEventListener('click', () => toggleAudioPlayback());
  audioPrevBtn.addEventListener('click', () => loadAudioTrack(currentTrackIndex - 1, !audioEl.paused));
  audioNextBtn.addEventListener('click', () => loadAudioTrack(currentTrackIndex + 1, !audioEl.paused));

  audioBack5s.addEventListener('click', () => {
    audioEl.currentTime = Math.max(0, audioEl.currentTime - 5);
  });

  audioFwd5s.addEventListener('click', () => {
    const dur = audioEl.duration || 36;
    audioEl.currentTime = Math.min(dur, audioEl.currentTime + 5);
  });

  audioScrubber.addEventListener('input', (e) => {
    audioEl.currentTime = parseFloat(e.target.value);
    updateSliderFill(audioScrubber, document.documentElement.classList.contains('light') ? '#fa243c' : '#ffffff');
  });

  audioVolume.addEventListener('input', (e) => {
    audioEl.volume = parseFloat(e.target.value);
    updateSliderFill(audioVolume, document.documentElement.classList.contains('light') ? '#1d1d1f' : '#ffffff');
  });

  // Alternar modo do Visualizador (Barras de Frequência FFT vs Onda Senoidal)
  const switchVizMode = () => {
    vizMode = vizMode === 'bars' ? 'wave' : 'bars';
    document.getElementById('audio-viz-label').textContent =
      vizMode === 'bars' ? 'Analisador Espectral FFT' : 'Osciloscópio no Domínio do Tempo';
  };
  toggleVizModeBtn.addEventListener('click', switchVizMode);
  vizCanvas.addEventListener('click', switchVizMode);

  // Abas Segmentadas do Estúdio de Áudio (Roteiro | Faixas | Ficha Acústica)
  const audioTabBtns = document.querySelectorAll('.audio-tab-btn');
  const audioTabPanels = {
    lyrics: document.getElementById('audio-tab-lyrics'),
    playlist: document.getElementById('audio-tab-playlist'),
    specs: document.getElementById('audio-tab-specs')
  };

  audioTabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.audioTab;
      audioTabBtns.forEach((b) => {
        b.className = 'audio-tab-btn px-3.5 py-1.5 rounded-lg text-xs font-semibold text-apple-gray hover:text-white transition-all';
      });
      btn.className = 'audio-tab-btn px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white/15 text-white shadow transition-all';

      Object.keys(audioTabPanels).forEach((key) => {
        audioTabPanels[key].classList.toggle('hidden', key !== target);
      });
    });
  });

  // Importação de Arquivo de Áudio Local (.mp3 / .wav / .ogg / .m4a)
  audioFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    const cleanName = file.name.replace(/\.[^/.]+$/, '');
    const ext = file.name.split('.').pop()?.toUpperCase() || 'AUDIO';

    const tempAudio = new Audio(url);
    tempAudio.addEventListener('loadedmetadata', () => {
      const dur = Number.isFinite(tempAudio.duration) ? Math.round(tempAudio.duration) : 60;
      const customTrack = {
        id: audioTracks.length,
        title: cleanName,
        artist: `Arquivo Importado (${(file.size / (1024 * 1024)).toFixed(2)} MB)`,
        duration: dur,
        preset: 'custom',
        badge: `${ext} Local`,
        gradient: 'from-emerald-500 via-teal-700 to-cyan-950',
        ambient: 'from-emerald-500/35 via-teal-500/25 to-apple-blue/20',
        blobUrl: url,
        lyrics: [
          { time: 0, text: `♪ Reproduzindo arquivo local: "${file.name}"` },
          { time: Math.floor(dur * 0.2), text: 'Análise espectral FFT ativa em tempo real sobre as frequências do seu arquivo.' },
          { time: Math.floor(dur * 0.45), text: 'Você pode clicar em qualquer ponto desta transcrição ou na barra de progresso para navegar.' },
          { time: Math.floor(dur * 0.75), text: 'Processamento de áudio nativo via Web Audio API + HTML5 Media Element.' }
        ]
      };

      audioTracks.unshift(customTrack);
      audioFormatSpec.textContent = `${ext} Local (${file.type || 'audio/mpeg'})`;
      // Atualiza contador na aba
      document.querySelector('[data-audio-tab="playlist"]').textContent = `Faixas do Trabalho (${audioTracks.length})`;
      loadAudioTrack(0, true);
    });
  });

  audioEl.addEventListener('loadedmetadata', () => {
    if (Number.isFinite(audioEl.duration) && audioEl.duration > 0) {
      const dur = Math.round(audioEl.duration);
      audioTracks[currentTrackIndex].duration = dur;
      audioScrubber.max = audioEl.duration;
      audioRemainingTimeEl.textContent = formatTime(audioEl.currentTime || 0, true, audioEl.duration);
      renderPlaylistUI();
    }
  });

  // Renderizador 60fps do Visualizador de Áudio (Apple Music Spectrum & Logic Pro Oscilloscope)
  function renderAudioVisualizer() {
    const w = vizCanvas.width;
    const h = vizCanvas.height;
    vCtx.clearRect(0, 0, w, h);

    const isPlaying = !audioEl.paused;
    const now = performance.now();

    if (analyser && isPlaying) {
      analyser.getByteFrequencyData(dataArray);
      analyser.getByteTimeDomainData(timeDomainArray);
    }

    if (vizMode === 'bars') {
      const barCount = 44;
      const gap = 4;
      const barWidth = (w - gap * (barCount - 1)) / barCount;

      for (let i = 0; i < barCount; i++) {
        let value = 6;
        if (analyser && isPlaying && dataArray) {
          const bin = Math.floor((i / barCount) * (dataArray.length * 0.7));
          value = Math.max(6, (dataArray[bin] / 255) * (h - 10));
        } else if (isPlaying) {
          // Espectro reativo a 60fps para reprodução direta local (file://)
          const env = Math.sin((i / barCount) * Math.PI);
          const wave1 = Math.abs(Math.sin(i * 0.45 + now * 0.009));
          const wave2 = Math.abs(Math.cos(i * 0.25 - now * 0.006));
          value = Math.max(8, (0.25 + 0.75 * env * (wave1 * 0.6 + wave2 * 0.4)) * (h - 12));
        } else {
          // Onda de repouso elegante quando pausado
          value = 6 + Math.sin(i * 0.35 + now * 0.002) * 3;
        }

        const x = i * (barWidth + gap);
        const y = h - value;

        const grad = vCtx.createLinearGradient(0, y, 0, h);
        grad.addColorStop(0, '#fa243c');
        grad.addColorStop(0.6, '#bf5af2');
        grad.addColorStop(1, '#0071e3');

        vCtx.fillStyle = isPlaying ? grad : 'rgba(134, 134, 139, 0.35)';
        vCtx.beginPath();
        vCtx.roundRect(x, y, barWidth, value, 3);
        vCtx.fill();
      }
    } else {
      // Modo Osciloscópio (Onda Contínua)
      vCtx.beginPath();
      const sliceWidth = w / (timeDomainArray ? timeDomainArray.length : 128);
      let x = 0;
      const len = timeDomainArray ? timeDomainArray.length : 128;

      for (let i = 0; i < len; i++) {
        let y = h / 2;
        if (analyser && isPlaying && timeDomainArray) {
          const v = timeDomainArray[i] / 128.0;
          y = (v * h) / 2;
        } else if (isPlaying) {
          const env = Math.sin((i / len) * Math.PI);
          y = h / 2 + (Math.sin(i * 0.22 + now * 0.012) * 18 + Math.cos(i * 0.11 - now * 0.008) * 10) * env;
        } else {
          y = h / 2 + Math.sin(i * 0.15 + now * 0.003) * 5;
        }
        if (i === 0) vCtx.moveTo(x, y);
        else vCtx.lineTo(x, y);
        x += sliceWidth;
      }
      vCtx.strokeStyle = isPlaying ? '#fa243c' : 'rgba(134, 134, 139, 0.45)';
      vCtx.lineWidth = 2.5;
      vCtx.stroke();
    }

    requestAnimationFrame(renderAudioVisualizer);
  }

  // Inicializa o Player de Áudio com a Faixa 01
  loadAudioTrack(0, false);
  updateSliderFill(audioVolume, '#ffffff');
  requestAnimationFrame(renderAudioVisualizer);

  // ==========================================================================
  // 6. ATALHOS DE TECLADO GLOBAIS (ACESSIBILIDADE MULTIMÍDIA)
  // ==========================================================================
  document.addEventListener('keydown', (e) => {
    // Evita interceptar se o foco estiver em campos de texto
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;

    if (e.code === 'Space') {
      e.preventDefault();
      if (lastActivePlayer === 'audio') {
        toggleAudioPlayback();
      } else {
        toggleVideoPlayback();
      }
    } else if (e.code === 'ArrowRight') {
      if (lastActivePlayer === 'audio') {
        audioEl.currentTime = Math.min(audioEl.duration || 36, audioEl.currentTime + 5);
      } else {
        const cur = isCustomVideoLoaded ? videoEl.currentTime : demoCurrentTime;
        seekVideoTo(cur + 5);
      }
    } else if (e.code === 'ArrowLeft') {
      if (lastActivePlayer === 'audio') {
        audioEl.currentTime = Math.max(0, audioEl.currentTime - 5);
      } else {
        const cur = isCustomVideoLoaded ? videoEl.currentTime : demoCurrentTime;
        seekVideoTo(cur - 5);
      }
    } else if (e.key === 'f' || e.key === 'F') {
      videoFullscreenBtn.click();
    } else if (e.key === 'm' || e.key === 'M') {
      videoMuteBtn.click();
    }
  });
});

