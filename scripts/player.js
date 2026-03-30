/**
 * Audio Player — Les Sages de Pandarie
 * Player flottant persistant entre les pages via localStorage.
 */

(function () {
    const STORAGE_KEY_POS     = 'guild_player_position';
    const STORAGE_KEY_PLAYING = 'guild_player_playing';

    function injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .audio-player {
                position: fixed;
                bottom: 1.5rem;
                right: 1.5rem;
                z-index: 500;
                background: var(--bg-card);
                border: 1px solid var(--border);
                border-radius: 12px;
                padding: 0.75rem 1rem;
                width: 260px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
                transition: border-color 0.2s;
            }
            .audio-player:hover { border-color: var(--primary); }
            .audio-player-top {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                margin-bottom: 0.6rem;
            }
            .audio-play-btn {
                width: 36px;
                height: 36px;
                border-radius: 50%;
                background: var(--primary);
                border: none;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
                transition: background 0.2s, transform 0.1s;
            }
            .audio-play-btn:hover { background: #fff; transform: scale(1.05); }
            .audio-play-btn svg { fill: var(--bg-deep); width: 14px; height: 14px; }
            .audio-info { flex: 1; min-width: 0; }
            .audio-title {
                font-size: 0.8rem;
                font-weight: 600;
                color: #fff;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .audio-label {
                font-size: 0.7rem;
                color: var(--primary);
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .audio-visualizer {
                width: 100%;
                height: 36px;
                margin-bottom: 0.5rem;
                border-radius: 4px;
                overflow: hidden;
            }
            .audio-progress-bar {
                width: 100%;
                height: 3px;
                background: rgba(255,255,255,0.1);
                border-radius: 2px;
                cursor: pointer;
            }
            .audio-progress-fill {
                height: 100%;
                background: var(--primary);
                border-radius: 2px;
                width: 0%;
                transition: width 0.1s linear;
            }
        `;
        document.head.appendChild(style);
    }

    function injectHTML() {
        const player = document.createElement('div');
        player.className = 'audio-player';
        player.id = 'audioPlayer';
        player.innerHTML = `
            <audio id="audioEl" src="/audio/theme.mp3" preload="metadata"></audio>
            <div class="audio-player-top">
                <button class="audio-play-btn" id="playBtn" title="Lecture / Pause">
                    <svg id="iconPlay" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    <svg id="iconPause" viewBox="0 0 24 24" style="display:none"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                </button>
                <div class="audio-info">
                    <div class="audio-label">Thème de guilde</div>
                    <div class="audio-title">Les Sages de Pandarie</div>
                </div>
            </div>
            <canvas class="audio-visualizer" id="vizCanvas"></canvas>
            <div class="audio-progress-bar" id="progressBar">
                <div class="audio-progress-fill" id="progressFill"></div>
            </div>
        `;
        document.body.appendChild(player);
    }

    function initPlayer() {
        const audioEl      = document.getElementById('audioEl');
        const iconPlay     = document.getElementById('iconPlay');
        const iconPause    = document.getElementById('iconPause');
        const progressFill = document.getElementById('progressFill');
        const progressBar  = document.getElementById('progressBar');
        const vizCanvas    = document.getElementById('vizCanvas');
        const vizCtx       = vizCanvas.getContext('2d');
        const playBtn      = document.getElementById('playBtn');

        let audioCtx   = null;
        let analyser   = null;

        function initAudioContext() {
            if (audioCtx) return;
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioCtx.createAnalyser();
            analyser.fftSize = 64;
            const source = audioCtx.createMediaElementSource(audioEl);
            source.connect(analyser);
            analyser.connect(audioCtx.destination);
            const W = vizCanvas.offsetWidth;
            vizCanvas.width  = W * window.devicePixelRatio;
            vizCanvas.height = 36 * window.devicePixelRatio;
            vizCtx.scale(window.devicePixelRatio, window.devicePixelRatio);
            drawVisualizer(W);
        }

        function drawVisualizer(W) {
            const bins = analyser.frequencyBinCount;
            const data = new Uint8Array(bins);
            const H    = 36;
            const barW = (W / bins) - 1;
            function draw() {
                requestAnimationFrame(draw);
                analyser.getByteFrequencyData(data);
                vizCtx.clearRect(0, 0, W, H);
                for (let i = 0; i < bins; i++) {
                    const ratio = data[i] / 255;
                    const barH  = Math.max(2, ratio * H);
                    const x     = i * (barW + 1);
                    const alpha = 0.3 + ratio * 0.7;
                    vizCtx.fillStyle = `rgba(238, 187, 85, ${alpha})`;
                    vizCtx.beginPath();
                    vizCtx.roundRect(x, H - barH, barW, barH, 2);
                    vizCtx.fill();
                }
            }
            draw();
        }

        function setPlayingUI(playing) {
            iconPlay.style.display  = playing ? 'none' : '';
            iconPause.style.display = playing ? ''     : 'none';
        }

        function saveState() {
            localStorage.setItem(STORAGE_KEY_POS,     audioEl.currentTime);
            localStorage.setItem(STORAGE_KEY_PLAYING, audioEl.paused ? 'false' : 'true');
        }

        function togglePlay() {
            initAudioContext();
            if (audioEl.paused) {
                audioEl.play();
                setPlayingUI(true);
            } else {
                audioEl.pause();
                setPlayingUI(false);
            }
            saveState();
        }

        playBtn.addEventListener('click', togglePlay);

        audioEl.addEventListener('timeupdate', () => {
            if (audioEl.duration) {
                progressFill.style.width = (audioEl.currentTime / audioEl.duration * 100) + '%';
            }
            saveState();
        });

        audioEl.addEventListener('ended', () => {
            setPlayingUI(false);
            progressFill.style.width = '0%';
            localStorage.removeItem(STORAGE_KEY_POS);
            localStorage.removeItem(STORAGE_KEY_PLAYING);
        });

        progressBar.addEventListener('click', (e) => {
            const ratio = e.offsetX / progressBar.offsetWidth;
            audioEl.currentTime = ratio * audioEl.duration;
        });

        // Reprise depuis localStorage
        const savedPos     = parseFloat(localStorage.getItem(STORAGE_KEY_POS));
        const savedPlaying = localStorage.getItem(STORAGE_KEY_PLAYING) === 'true';

        if (savedPlaying && !isNaN(savedPos)) {
            const tryResume = () => {
                audioEl.currentTime = savedPos;
                audioEl.play().then(() => {
                    initAudioContext();
                    setPlayingUI(true);
                }).catch(() => {
                    // Autoplay bloqué — cliquer sur le bouton play suffira
                    setPlayingUI(false);
                });
            };

            if (audioEl.readyState >= 1) {
                tryResume();
            } else {
                audioEl.addEventListener('loadedmetadata', tryResume, { once: true });
            }
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        injectStyles();
        injectHTML();
        initPlayer();
    });
})();
