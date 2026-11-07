(function () {
	"use strict";

	// --- BỘ TỔNG HỢP ÂM THANH SẤM SÉT VÀ ĐIỆN TỬ (WEB AUDIO API) ---
	var Sound = (function () {
		var AudioCtx = window.AudioContext || window.webkitAudioContext;
		var ctx = null;
		var masterGain = null;
		var ambientGain = null;
		var noiseBuffer = null;
		var isMuted = false;
		var lastMoveSound = 0;
		var storageKey = "thunderstorm-survival-sound-muted";

		try {
			isMuted = localStorage.getItem(storageKey) === "true";
		} catch (e) {}

		function init() {
			if (!AudioCtx || ctx) return;
			try {
				ctx = new AudioCtx();
				masterGain = ctx.createGain();
				masterGain.gain.setValueAtTime(isMuted ? 0 : 0.42, ctx.currentTime);
				masterGain.connect(ctx.destination);

				// Tạo buffer nhiễu hồng (Pink Noise) cho tiếng sấm, bão và tia lửa
				var bufferSize = ctx.sampleRate * 2;
				noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
				var output = noiseBuffer.getChannelData(0);
				var b0 = 0, b1 = 0, b2 = 0;
				for (var i = 0; i < bufferSize; i++) {
					var white = Math.random() * 2 - 1;
					b0 = 0.99886 * b0 + white * 0.0555179;
					b1 = 0.99332 * b1 + white * 0.0750759;
					b2 = 0.96900 * b2 + white * 0.1538520;
					output[i] = (b0 + b1 + b2 + white * 0.05) * 0.2;
				}

				setupAmbient();
			} catch (err) {
				console.warn("Không thể khởi tạo Web Audio:", err);
			}
		}

		function ensureRunning() {
			init();
			if (ctx && ctx.state === "suspended") {
				ctx.resume();
			}
		}

		function setupAmbient() {
			if (!ctx || !noiseBuffer) return;
			try {
				var noise = ctx.createBufferSource();
				noise.buffer = noiseBuffer;
				noise.loop = true;

				var filter = ctx.createBiquadFilter();
				filter.type = "lowpass";
				filter.frequency.setValueAtTime(260, ctx.currentTime);

				ambientGain = ctx.createGain();
				ambientGain.gain.setValueAtTime(0, ctx.currentTime);

				noise.connect(filter);
				filter.connect(ambientGain);
				ambientGain.connect(masterGain);
				noise.start(0);
			} catch (err) {}
		}

		function setAmbientState(isPlaying, level) {
			if (!ambientGain || !ctx) return;
			var now = ctx.currentTime;
			if (isPlaying && !isMuted) {
				var targetVol = Math.min(0.18, 0.06 + ((level || 1) - 1) * 0.02);
				ambientGain.gain.cancelScheduledValues(now);
				ambientGain.gain.setTargetAtTime(targetVol, now, 0.4);
			} else {
				ambientGain.gain.cancelScheduledValues(now);
				ambientGain.gain.setTargetAtTime(0.0001, now, 0.25);
			}
		}

		function toggleMute() {
			isMuted = !isMuted;
			try {
				localStorage.setItem(storageKey, isMuted ? "true" : "false");
			} catch (e) {}

			if (ctx && masterGain) {
				var now = ctx.currentTime;
				masterGain.gain.cancelScheduledValues(now);
				masterGain.gain.setTargetAtTime(isMuted ? 0 : 0.42, now, 0.05);
			}
			if (!isMuted) ensureRunning();
			return isMuted;
		}

		function playStart() {
			ensureRunning();
			if (!ctx || isMuted) return;
			var now = ctx.currentTime;
			// Hợp âm khởi động bão sét điện tử
			[329.63, 440, 554.37, 659.25, 880].forEach(function (freq, idx) {
				var osc = ctx.createOscillator();
				var gain = ctx.createGain();
				osc.type = "sawtooth";
				osc.frequency.setValueAtTime(freq, now + idx * 0.055);
				gain.gain.setValueAtTime(0.11, now + idx * 0.055);
				gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.055 + 0.24);

				var filter = ctx.createBiquadFilter();
				filter.type = "lowpass";
				filter.frequency.setValueAtTime(1900, now);

				osc.connect(filter);
				filter.connect(gain);
				gain.connect(masterGain);

				osc.start(now + idx * 0.055);
				osc.stop(now + idx * 0.055 + 0.25);
			});

			// Âm trầm sub-bass xung kích
			var sub = ctx.createOscillator();
			var subGain = ctx.createGain();
			sub.type = "sine";
			sub.frequency.setValueAtTime(130, now);
			sub.frequency.exponentialRampToValueAtTime(36, now + 0.38);
			subGain.gain.setValueAtTime(0.32, now);
			subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
			sub.connect(subGain);
			subGain.connect(masterGain);
			sub.start(now);
			sub.stop(now + 0.41);
		}

		function playZap(combo) {
			ensureRunning();
			if (!ctx || isMuted) return;
			var now = ctx.currentTime;
			var baseFreq = Math.min(1900, 680 + (combo || 0) * 85);

			// Tia điện xẹt quét nhanh
			var osc = ctx.createOscillator();
			var gain = ctx.createGain();
			osc.type = "sawtooth";
			osc.frequency.setValueAtTime(baseFreq, now);
			osc.frequency.exponentialRampToValueAtTime(240, now + 0.095);

			gain.gain.setValueAtTime(0.24, now);
			gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

			var filter = ctx.createBiquadFilter();
			filter.type = "bandpass";
			filter.frequency.setValueAtTime(baseFreq * 1.15, now);
			filter.Q.setValueAtTime(2.4, now);

			osc.connect(filter);
			filter.connect(gain);
			gain.connect(masterGain);

			osc.start(now);
			osc.stop(now + 0.1);

			// Nhiễu tĩnh điện giật
			if (noiseBuffer) {
				var noiseSource = ctx.createBufferSource();
				noiseSource.buffer = noiseBuffer;
				var noiseFilter = ctx.createBiquadFilter();
				noiseFilter.type = "highpass";
				noiseFilter.frequency.setValueAtTime(2400, now);

				var noiseGain = ctx.createGain();
				noiseGain.gain.setValueAtTime(0.18, now);
				noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);

				noiseSource.connect(noiseFilter);
				noiseFilter.connect(noiseGain);
				noiseGain.connect(masterGain);

				noiseSource.start(now);
				noiseSource.stop(now + 0.07);
			}
		}

		function playThunderStrike() {
			ensureRunning();
			if (!ctx || isMuted) return;
			var now = ctx.currentTime;

			// 1. Tiếng nổ xé toạc ban đầu (Crack)
			if (noiseBuffer) {
				var crack = ctx.createBufferSource();
				crack.buffer = noiseBuffer;
				var crackFilter = ctx.createBiquadFilter();
				crackFilter.type = "bandpass";
				crackFilter.frequency.setValueAtTime(3400, now);
				crackFilter.Q.setValueAtTime(1.1, now);

				var crackGain = ctx.createGain();
				crackGain.gain.setValueAtTime(0.55, now);
				crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

				crack.connect(crackFilter);
				crackFilter.connect(crackGain);
				crackGain.connect(masterGain);

				crack.start(now);
				crack.stop(now + 0.1);
			}

			// 2. Tiếng sấm rền lan tỏa (Thunder Rumble)
			if (noiseBuffer) {
				var rumble = ctx.createBufferSource();
				rumble.buffer = noiseBuffer;
				var rumbleFilter = ctx.createBiquadFilter();
				rumbleFilter.type = "lowpass";
				rumbleFilter.frequency.setValueAtTime(780, now);
				rumbleFilter.frequency.exponentialRampToValueAtTime(55, now + 1.8);

				var rumbleGain = ctx.createGain();
				rumbleGain.gain.setValueAtTime(0.65, now);
				rumbleGain.gain.exponentialRampToValueAtTime(0.001, now + 1.85);

				rumble.connect(rumbleFilter);
				rumbleFilter.connect(rumbleGain);
				rumbleGain.connect(masterGain);

				rumble.start(now);
				rumble.stop(now + 1.9);
			}

			// 3. Xung điện giật méo tiếng (Distorted Electric Arc)
			var saw = ctx.createOscillator();
			var sawGain = ctx.createGain();
			saw.type = "sawtooth";
			saw.frequency.setValueAtTime(360, now);
			saw.frequency.exponentialRampToValueAtTime(45, now + 0.36);
			sawGain.gain.setValueAtTime(0.35, now);
			sawGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

			saw.connect(sawGain);
			sawGain.connect(masterGain);
			saw.start(now);
			saw.stop(now + 0.41);

			// 4. Âm trầm cực mạnh rung chuyển (Sub-bass Shockwave)
			var sub = ctx.createOscillator();
			var subGain = ctx.createGain();
			sub.type = "sine";
			sub.frequency.setValueAtTime(115, now);
			sub.frequency.exponentialRampToValueAtTime(26, now + 0.65);
			subGain.gain.setValueAtTime(0.7, now);
			subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

			sub.connect(subGain);
			subGain.connect(masterGain);
			sub.start(now);
			sub.stop(now + 0.72);
		}

		function playLevelUp() {
			ensureRunning();
			if (!ctx || isMuted) return;
			var now = ctx.currentTime;
			[523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) {
				var osc = ctx.createOscillator();
				var g = ctx.createGain();
				osc.type = "triangle";
				osc.frequency.setValueAtTime(f, now + i * 0.075);
				g.gain.setValueAtTime(0.16, now + i * 0.075);
				g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.075 + 0.24);
				osc.connect(g);
				g.connect(masterGain);
				osc.start(now + i * 0.075);
				osc.stop(now + i * 0.075 + 0.25);
			});
		}

		function playMove() {
			ensureRunning();
			if (!ctx || isMuted) return;
			var now = performance.now();
			if (now - lastMoveSound < 110) return;
			lastMoveSound = now;

			var audioTime = ctx.currentTime;
			var osc = ctx.createOscillator();
			var gain = ctx.createGain();
			osc.type = "sine";
			osc.frequency.setValueAtTime(340, audioTime);
			osc.frequency.exponentialRampToValueAtTime(580, audioTime + 0.04);
			gain.gain.setValueAtTime(0.04, audioTime);
			gain.gain.exponentialRampToValueAtTime(0.001, audioTime + 0.045);
			osc.connect(gain);
			gain.connect(masterGain);
			osc.start(audioTime);
			osc.stop(audioTime + 0.05);
		}

		function playGroundSnap() {
			ensureRunning();
			if (!ctx || isMuted) return;
			var now = ctx.currentTime;
			var osc = ctx.createOscillator();
			var gain = ctx.createGain();
			osc.type = "sine";
			osc.frequency.setValueAtTime(170, now);
			osc.frequency.exponentialRampToValueAtTime(45, now + 0.08);
			gain.gain.setValueAtTime(0.06, now);
			gain.gain.exponentialRampToValueAtTime(0.001, now + 0.085);
			osc.connect(gain);
			gain.connect(masterGain);
			osc.start(now);
			osc.stop(now + 0.09);
		}

		return {
			init: ensureRunning,
			isMuted: function () { return isMuted; },
			toggleMute: toggleMute,
			playStart: playStart,
			playZap: playZap,
			playThunderStrike: playThunderStrike,
			playLevelUp: playLevelUp,
			playMove: playMove,
			playGroundSnap: playGroundSnap,
			setAmbientState: setAmbientState
		};
	})();

	// --- CÀI ĐẶT TRÒ CHƠI ---
	document.querySelectorAll("[data-ts-game]").forEach(function (root) {
		var canvas = root.querySelector("[data-canvas]");
		var ctx = canvas && canvas.getContext("2d");
		if (!ctx) return;

		var overlay = root.querySelector("[data-overlay]");
		var start = root.querySelector("[data-start]");
		var pause = root.querySelector("[data-pause]");
		var restart = root.querySelector("[data-restart]");
		var soundBtn = root.querySelector("[data-sound]");
		var status = root.querySelector("[data-status]");
		var levelText = root.querySelector("[data-level]");
		var timeText = root.querySelector("[data-time]");
		var scoreText = root.querySelector("[data-score]");
		var comboText = root.querySelector("[data-combo]");
		var livesText = root.querySelector("[data-lives]");
		var coinsText = root.querySelector("[data-coins]");
		var bestText = root.querySelector("[data-best]");
		var kicker = root.querySelector("[data-kicker]");
		var title = root.querySelector("[data-title]");
		var copy = root.querySelector("[data-copy]");
		var result = root.querySelector("[data-result]");

		var state = "ready";
		var keys = { left: false, right: false };
		var width = 1, height = 1, ratio = 1, lastFrame = 0;
		var elapsed = 0, score = 0, combo = 0, coinsCollected = 0, comboTimer = 0, spawnTimer = 0.55;
		var playerX = 0, shake = 0, balls = [], pickups = [], stars = [];
		var playerMoveDir = 0, extraLives = 0, invulnerable = 0, pickupTimer = 8;
		var highScore = 0, playerRadius = 11;
		var storageKey = "thunderstorm-survival-best-v1";
		var lastLevel = 1;
		var skyFlash = 0;
		var particles = [];
		var shockwaves = [];
		var comboFloaters = [];
		var strikeBolts = [];
		var touchActive = false;
		var touchTargetX = null;
		var touchPointerId = null;
		var endOverlayTimer = null;
		var playerColor = "#83f5ff";
		var playerGlowColor = "#53dfff";
		var effectColor = "#5ce9ff";
		var equippedEffectId = "ice";

		try { highScore = Number(localStorage.getItem(storageKey)) || 0; } catch (error) {}
		bestText.textContent = String(highScore);

		function updateSoundButton() {
			if (!soundBtn) return;
			var muted = Sound.isMuted();
			soundBtn.textContent = muted ? "🔇 TẮT ÂM" : "🔊 ÂM THANH";
			soundBtn.setAttribute("aria-label", muted ? "Bật âm thanh" : "Tắt âm thanh");
			if (muted) {
				soundBtn.classList.add("is-muted");
			} else {
				soundBtn.classList.remove("is-muted");
			}
		}
		updateSoundButton();

		if (soundBtn) {
			soundBtn.addEventListener("click", function () {
				Sound.toggleMute();
				updateSoundButton();
				soundBtn.blur();
			});
		}

		function setState(next) {
			state = next;
			root.setAttribute("data-state", next);
			Sound.setAmbientState(next === "playing", level());
		}

		function level() { return Math.floor(elapsed / 15) + 1; }

		function timeLabel(value) {
			var whole = Math.floor(value);
			return String(Math.floor(whole / 60)).padStart(2, "0") + ":" +
				String(whole % 60).padStart(2, "0") + "." + Math.floor((value % 1) * 10);
		}

		function updateHud() {
			levelText.textContent = String(level());
			timeText.textContent = timeLabel(elapsed);
			scoreText.textContent = String(score);
			comboText.textContent = "x" + combo;
			coinsText.textContent = String(coinsCollected);
			livesText.textContent = (extraLives ? 2 : 1) + "/2";
		}

		function updatePauseLabel() {
			pause.textContent = state === "paused" ? "TIẾP TỤC" : "TẠM DỪNG";
			pause.setAttribute("aria-label", state === "paused" ? "Tiếp tục trò chơi" : "Tạm dừng trò chơi");
		}

		function showOverlay(kind) {
			overlay.hidden = false;
			overlay.classList.remove("is-ending", "is-visible");
			result.hidden = true;
			if (kind === "ready") {
				kicker.textContent = "THỬ THÁCH SINH TỒN";
				title.textContent = "Sẵn sàng né bóng?";
				copy.textContent = "Những quả cầu sét sẽ rơi nhanh dần. Né càng lâu, điểm càng cao.";
				start.textContent = "BẮT ĐẦU";
				status.textContent = "BÃO ĐANG TẠM LẶNG";
			} else if (kind === "paused") {
				kicker.textContent = "TẠM DỪNG";
				title.textContent = "Nghỉ một nhịp";
				copy.textContent = "Bấm tiếp tục khi bạn sẵn sàng trở lại.";
				start.textContent = "TIẾP TỤC";
				status.textContent = "TRÒ CHƠI ĐANG TẠM DỪNG";
			} else {
				kicker.textContent = "KẾT THÚC LƯỢT CHƠI";
				title.textContent = "Sét đã đánh trúng bạn!";
				copy.textContent = "Bạn đã sống sót " + timeLabel(elapsed) + ".";
				result.innerHTML = "ĐIỂM <strong>" + score + "</strong> &nbsp;·&nbsp; KỶ LỤC <strong>" + highScore + "</strong>";
				result.hidden = false;
				start.textContent = "CHƠI LẠI";
				status.textContent = "BÃO ĐÃ KẾT THÚC";
			}
			updatePauseLabel();
		}

		function beginGame(forceRestart) {
			Sound.init();
			if (endOverlayTimer !== null) {
				window.clearTimeout(endOverlayTimer);
				endOverlayTimer = null;
			}
			overlay.classList.remove("is-ending", "is-visible");
			if (state === "paused" && !forceRestart) {
				setState("playing");
				overlay.hidden = true;
				status.textContent = "BÃO ĐANG TĂNG";
				updatePauseLabel();
				return;
			}
			Sound.playStart();
			setState("playing");
			elapsed = 0;
			score = 0;
			combo = 0;
			coinsCollected = 0;
			comboTimer = 0;
			spawnTimer = 0.55;
			shake = 0;
			skyFlash = 0.35;
			lastLevel = 1;
			balls = [];
			pickups = [];
			extraLives = 0;
			invulnerable = 1;
			pickupTimer = 7 + Math.random() * 3;
			playerMoveDir = 0;
			particles = [];
			shockwaves = [];
			comboFloaters = [];
			strikeBolts = [];
			touchActive = false;
			touchTargetX = null;
			touchPointerId = null;
			playerX = width / 2;
			keys.left = false;
			keys.right = false;
			overlay.hidden = true;
			status.textContent = "BÃO ĐANG TĂNG";
			updateHud();
			updatePauseLabel();
			canvas.focus({ preventScroll: true });
		}

		function togglePause() {
			Sound.init();
			touchActive = false;
			touchTargetX = null;
			touchPointerId = null;
			if (state === "playing") {
				setState("paused");
				showOverlay("paused");
			} else if (state === "paused") {
				beginGame();
			}
		}

		function spawnSparks(x, y, count, baseColor, spreadSpeed) {
			spreadSpeed = spreadSpeed || 140;
			for (var i = 0; i < count; i++) {
				var angle = Math.random() * Math.PI * 2;
				var spd = Math.random() * spreadSpeed + 30;
				particles.push({
					x: x,
					y: y,
					vx: Math.cos(angle) * spd,
					vy: Math.sin(angle) * spd - (Math.random() * 45),
					life: Math.random() * 0.45 + 0.2,
					maxLife: 0.65,
					size: Math.random() * 2.8 + 1.2,
					color: baseColor || "#5ce9ff"
				});
			}
		}

		function endGame() {
			if (state !== "playing") return;
			setState("over");
			touchActive = false;
			touchTargetX = null;
			touchPointerId = null;
			shake = 0.48;
			skyFlash = 0.95;
			overlay.hidden = true;
			overlay.classList.remove("is-ending", "is-visible");

			var playerY = height - 47;
			// Tạo tia sét khổng lồ giáng thẳng từ trời xuống người chơi
			strikeBolts.push({
				x1: playerX + (Math.random() - 0.5) * 40,
				y1: 0,
				x2: playerX,
				y2: playerY,
				width: 5.5,
				color: "#ffffff",
				glow: "#5ce9ff",
				life: 0.38,
				maxLife: 0.38
			});

			spawnSparks(playerX, playerY, 45, "#ffffff", 260);
			spawnSparks(playerX, playerY, 35, "#5ce9ff", 190);

			shockwaves.push({
				x: playerX,
				y: height - 23,
				r: 5,
				maxR: Math.max(90, width * 0.28),
				alpha: 1,
				color: "#5ce9ff"
			});

			Sound.playThunderStrike();

			if (score > highScore) {
				highScore = score;
				bestText.textContent = String(highScore);
				try { localStorage.setItem(storageKey, String(highScore)); } catch (error) {}
			}
			if (root.__tsProfile) root.__tsProfile.rewardRun(score, elapsed);
			endOverlayTimer = window.setTimeout(function () {
				endOverlayTimer = null;
				showOverlay("over");
				overlay.classList.add("is-ending");
				requestAnimationFrame(function () {
					requestAnimationFrame(function () {
						overlay.classList.add("is-visible");
					});
				});
			}, 900);
		}

		function resize() {
			var rect = canvas.getBoundingClientRect();
			ratio = Math.min(window.devicePixelRatio || 1, 2);
			width = Math.max(1, rect.width);
			height = Math.max(1, rect.height);
			canvas.width = Math.round(width * ratio);
			canvas.height = Math.round(height * ratio);
			ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
			playerX = Math.max(22, Math.min(width - 22, playerX || width / 2));
			var starCount = Math.max(28, Math.round(width * height / 10500));
			stars = Array.from({ length: starCount }, function () {
				return {
					x: Math.random() * width,
					y: Math.random() * height * 0.82,
					r: Math.random() * 1.35 + 0.3,
					alpha: Math.random() * 0.48 + 0.16,
					phase: Math.random() * Math.PI * 2
				};
			});
		}

		// --- TẠO QUẢ BÓNG SÉT RƠI ---
		function addBall() {
			var radius = 13 + Math.random() * 11;
			// Phân loại bóng sét: Xanh cyan (chuẩn), Tím sét (năng lượng cao), Vàng rực (siêu tích điện)
			var roll = Math.random();
			var type = "cyan";
			if (roll > 0.78) {
				type = "violet";
			} else if (roll > 0.58) {
				type = "gold";
			}

			balls.push({
				x: radius + 5 + Math.random() * Math.max(1, width - radius * 2 - 10),
				y: -radius - 15,
				r: radius,
				vx: (Math.random() - 0.5) * 38,
				phase: Math.random() * Math.PI * 2,
				type: type,
				arcs: [],
				arcTimer: 0,
				trail: [],
				near: false,
				groundHit: false
			});
		}

		function addPickup() {
			var reviveAvailable = extraLives === 0 && Math.random() < 0.36;
			var type = reviveAvailable ? "revive" : "coin";
			pickups.push({
				x: 32 + Math.random() * Math.max(1, width - 64),
				y: -24,
				r: type === "revive" ? 12 : 10,
				vy: 105 + Math.random() * 45,
				vx: (Math.random() - 0.5) * 20,
				type: type,
				phase: Math.random() * Math.PI * 2
			});
		}

		function update(dt) {
			if (state !== "playing") return;
			elapsed += dt;
			score = Math.max(score, Math.floor(elapsed * 12));
			var stageLevel = level();

			if (stageLevel > lastLevel) {
				lastLevel = stageLevel;
				skyFlash = 0.45;
				Sound.playLevelUp();
				Sound.setAmbientState(true, stageLevel);
			}

			// Thỉnh thoảng có chớp sấm chân trời ngẫu nhiên khi bão lớn
			if (Math.random() < 0.007 && skyFlash <= 0.05) {
				skyFlash = 0.22;
			}

			var fallSpeed = Math.min(780, 195 + elapsed * 2.8 + (stageLevel - 1) * 20);
			var moveSpeed = 330 + Math.min(120, (stageLevel - 1) * 8);
			playerMoveDir = 0;
			if (invulnerable > 0) invulnerable -= dt;

			var moveDir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
			if (touchActive && touchTargetX !== null) {
				var diff = touchTargetX - playerX;
				if (Math.abs(diff) > 1.5) {
					var tDir = diff > 0 ? 1 : -1;
					playerMoveDir = tDir;
					// Phản hồi điều khiển cảm ứng tay cực nhạy và mượt mà trên điện thoại
					var touchSpeed = Math.max(moveSpeed * 1.6, Math.abs(diff) * 28);
					var moveAmt = Math.min(Math.abs(diff), touchSpeed * dt);
					playerX += tDir * moveAmt;
					playerX = Math.max(22, Math.min(width - 22, playerX));
					Sound.playMove();

					if (Math.random() < 0.4) {
						particles.push({
							x: playerX + (Math.random() - 0.5) * 12,
							y: height - 23,
							vx: -tDir * (Math.random() * 60 + 20),
							vy: -Math.random() * 25,
							life: 0.24,
							maxLife: 0.24,
							size: Math.random() * 2.2 + 1,
							color: effectColor
						});
					}
				}
			} else if (moveDir !== 0) {
				playerMoveDir = moveDir;
				playerX += moveDir * moveSpeed * dt;
				playerX = Math.max(22, Math.min(width - 22, playerX));
				Sound.playMove();
				// Bụi tàn điện khi di chuyển
				if (Math.random() < 0.35) {
					particles.push({
						x: playerX + (Math.random() - 0.5) * 12,
						y: height - 23,
						vx: -moveDir * (Math.random() * 60 + 20),
						vy: -Math.random() * 25,
						life: 0.24,
						maxLife: 0.24,
						size: Math.random() * 2.2 + 1,
						color: effectColor
					});
				}
			}

			spawnTimer -= dt;
			var interval = Math.max(0.31, 0.92 - elapsed * 0.0048);
			while (spawnTimer <= 0) {
				addBall();
				spawnTimer += interval;
			}

			pickupTimer -= dt;
			if (pickupTimer <= 0) {
				addPickup();
				pickupTimer = Math.max(5.8, 9.5 - elapsed * 0.025) + Math.random() * 3.5;
			}
			if (comboTimer > 0 && (comboTimer -= dt) <= 0) combo = 0;

			var playerY = height - 47;
			for (var i = balls.length - 1; i >= 0; i--) {
				var ball = balls[i];
				ball.y += fallSpeed * dt;
				ball.x += ball.vx * dt + playerMoveDir * 34 * dt + Math.sin(elapsed * 1.8 + ball.phase) * 8 * dt;
				ball.x = Math.max(ball.r, Math.min(width - ball.r, ball.x));

				// Cập nhật vết đuôi tia sét rơi
				ball.trail.push({ x: ball.x, y: ball.y });
				if (ball.trail.length > 5) ball.trail.shift();

				// Phát tia lửa tàn điện rơi theo mỗi quả bóng sét
				if (Math.random() < 0.45) {
					var sparkColor = ball.type === "violet" ? "#e57cff" : (ball.type === "gold" ? "#ffd55e" : "#5ce9ff");
					particles.push({
						x: ball.x + (Math.random() - 0.5) * ball.r,
						y: ball.y - ball.r * 0.5 + (Math.random() - 0.5) * 6,
						vx: (Math.random() - 0.5) * 40,
						vy: -Math.random() * 55 - 10,
						life: Math.random() * 0.28 + 0.12,
						maxLife: 0.4,
						size: Math.random() * 2.2 + 1,
						color: sparkColor
					});
				}

				// Cập nhật các nhánh tia sét giật xung quanh bóng
				ball.arcTimer -= dt;
				if (ball.arcTimer <= 0) {
					ball.arcTimer = 0.045 + Math.random() * 0.035;
					var arcCount = 4 + Math.floor(Math.random() * 3);
					ball.arcs = [];
					for (var a = 0; a < arcCount; a++) {
						var angle = (a / arcCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
						var length = ball.r * (1.15 + Math.random() * 0.55);
						ball.arcs.push({
							angle: angle,
							length: length,
							jitter1: (Math.random() - 0.5) * ball.r * 0.45,
							jitter2: (Math.random() - 0.5) * ball.r * 0.45
						});
					}
				}

				var dx = ball.x - playerX, dy = ball.y - playerY;
				var distance = Math.sqrt(dx * dx + dy * dy);

				// Va chạm với người chơi: Game Over
				if (distance < ball.r + playerRadius) {
					if (invulnerable <= 0 && extraLives > 0) {
						extraLives = 0;
						invulnerable = 2;
						balls.splice(i, 1);
						shake = 0.35;
						spawnSparks(playerX, playerY, 32, "#5ce9ff", 210);
						comboFloaters.push({ x: playerX, y: playerY - 42, text: "MẠNG DỰ PHÒNG ĐÃ DÙNG", vy: -35, alpha: 1, color: "#8affc1" });
						updateHud();
					} else if (invulnerable <= 0) {
						endGame();
						break;
					}
				}

				// Né sát quả bóng (Graze / Near Miss)
				if (!ball.near && distance < ball.r + playerRadius + 28 && ball.y > playerY - 39) {
					ball.near = true;
					combo += 1;
					comboTimer = 3.3;
					var bonus = 18 + Math.min(combo, 10) * 2;
					score += bonus;

					// Tia điện hồ quang phóng giữa bóng sét và người chơi
					strikeBolts.push({
						x1: ball.x,
						y1: ball.y,
						x2: playerX,
						y2: playerY - 10,
						width: 2.2,
						color: "#ffffff",
						glow: ball.type === "gold" ? "#ffcc33" : "#5ce9ff",
						life: 0.18,
						maxLife: 0.18
					});

					var comboColor = combo > 4 ? "#ffd58a" : "#78e8ff";
					spawnSparks((ball.x + playerX) * 0.5, (ball.y + playerY) * 0.5, 14, comboColor, 120);

					comboFloaters.push({
						x: playerX,
						y: playerY - 35,
						text: "+" + bonus + " (x" + combo + ")",
						vy: -48,
						alpha: 1,
						color: comboColor
					});

					Sound.playZap(combo);
				}

				// Chạm mặt đất: Tạo hiệu ứng sóng điện và tóe tia lửa
				if (!ball.groundHit && ball.y >= height - 32) {
					ball.groundHit = true;
					Sound.playGroundSnap();
					shockwaves.push({
						x: ball.x,
						y: height - 23,
						r: 3,
						maxR: ball.r * 2.2,
						alpha: 0.85,
						color: ball.type === "violet" ? "#d25fff" : (ball.type === "gold" ? "#ffbc36" : "#5ce9ff")
					});
					spawnSparks(ball.x, height - 23, 8, ball.type === "violet" ? "#e28aff" : "#72edff", 90);
				}

				// Xóa bóng khi ra khỏi màn hình
				if (ball.y - ball.r > height + 24) {
					balls.splice(i, 1);
				}
			}

			for (var k = pickups.length - 1; k >= 0; k--) {
				var pickup = pickups[k];
				pickup.y += pickup.vy * dt;
				pickup.x += pickup.vx * dt;
				pickup.phase += dt * 4;
				pickup.x = Math.max(pickup.r, Math.min(width - pickup.r, pickup.x));

				var pickupDx = pickup.x - playerX;
				var pickupDy = pickup.y - playerY;
				if (Math.sqrt(pickupDx * pickupDx + pickupDy * pickupDy) < pickup.r + playerRadius + 3) {
					if (pickup.type === "revive" && extraLives === 0) {
						extraLives = 1;
						spawnSparks(pickup.x, pickup.y, 28, "#8affc1", 180);
						comboFloaters.push({ x: playerX, y: playerY - 42, text: "MẠNG THỨ 2", vy: -38, alpha: 1, color: "#8affc1" });
					} else if (pickup.type === "coin") {
						var coinReward = 5;
						score += 25;
						coinsCollected += 1;
						if (root.__tsProfile) root.__tsProfile.addCoins(coinReward);
						spawnSparks(pickup.x, pickup.y, 18, "#ffd55e", 150);
						comboFloaters.push({ x: pickup.x, y: pickup.y - 12, text: "+" + coinReward + " XU", vy: -42, alpha: 1, color: "#ffd55e" });
					}
					pickups.splice(k, 1);
					updateHud();
					continue;
				}

				if (pickup.y - pickup.r > height + 20) pickups.splice(k, 1);
			}

			// Cập nhật hạt tia lửa (particles)
			for (var p = particles.length - 1; p >= 0; p--) {
				var pt = particles[p];
				pt.life -= dt;
				if (pt.life <= 0) {
					particles.splice(p, 1);
					continue;
				}
				pt.x += pt.vx * dt;
				pt.y += pt.vy * dt;
				pt.vy += 150 * dt; // Trọng lực nhẹ rơi xuống
				pt.vx *= 0.985;
			}

			// Cập nhật vòng sóng điện mặt đất (shockwaves)
			for (var w = shockwaves.length - 1; w >= 0; w--) {
				var sw = shockwaves[w];
				sw.r += (sw.maxR - sw.r) * 12 * dt;
				sw.alpha -= 2.2 * dt;
				if (sw.alpha <= 0 || sw.r >= sw.maxR - 1) {
					shockwaves.splice(w, 1);
				}
			}

			// Cập nhật chữ combo bay (comboFloaters)
			for (var f = comboFloaters.length - 1; f >= 0; f--) {
				var cf = comboFloaters[f];
				cf.y += cf.vy * dt;
				cf.alpha -= 1.35 * dt;
				if (cf.alpha <= 0) {
					comboFloaters.splice(f, 1);
				}
			}

			// Cập nhật tia sét phóng (strikeBolts)
			for (var b = strikeBolts.length - 1; b >= 0; b--) {
				var sb = strikeBolts[b];
				sb.life -= dt;
				if (sb.life <= 0) {
					strikeBolts.splice(b, 1);
				}
			}

			score = Math.max(score, Math.floor(elapsed * 12));
			updateHud();
		}

		// Vẽ đường tia sét răng cưa tự nhiên (Jagged Lightning Bolt)
		function drawLightningBolt(x1, y1, x2, y2, displace, segments, width, coreColor, glowColor) {
			ctx.save();
			ctx.shadowColor = glowColor;
			ctx.shadowBlur = 14;
			ctx.strokeStyle = coreColor;
			ctx.lineWidth = width;
			ctx.lineCap = "round";
			ctx.lineJoin = "round";
			ctx.beginPath();
			ctx.moveTo(x1, y1);

			var dx = (x2 - x1) / segments;
			var dy = (y2 - y1) / segments;
			for (var s = 1; s < segments; s++) {
				var px = x1 + dx * s + (Math.random() - 0.5) * displace;
				var py = y1 + dy * s + (Math.random() - 0.5) * displace;
				ctx.lineTo(px, py);
			}
			ctx.lineTo(x2, y2);
			ctx.stroke();
			ctx.restore();
		}

		function background(now) {
			var gradient = ctx.createLinearGradient(0, 0, 0, height);
			gradient.addColorStop(0, "#06132d");
			gradient.addColorStop(0.62, "#07132e");
			gradient.addColorStop(1, "#061a3b");
			ctx.fillStyle = gradient;
			ctx.fillRect(0, 0, width, height);

			// Ánh sáng chớp sấm sét bầu trời (Sky Lightning Flash)
			if (skyFlash > 0.005) {
				ctx.fillStyle = "rgba(165, 230, 255, " + (skyFlash * 0.42) + ")";
				ctx.fillRect(0, 0, width, height);
				skyFlash = Math.max(0, skyFlash - 0.035);
			}

			var glow = ctx.createRadialGradient(width * 0.5, height * 0.42, 5, width * 0.5, height * 0.42, width * 0.72);
			glow.addColorStop(0, "rgba(29, 94, 194, .19)");
			glow.addColorStop(1, "rgba(5, 13, 34, 0)");
			ctx.fillStyle = glow;
			ctx.fillRect(0, 0, width, height);

			stars.forEach(function (star) {
				var blink = 0.66 + Math.sin(now * 0.0012 + star.phase) * 0.34;
				ctx.fillStyle = "rgba(140, 202, 255, " + (star.alpha * blink) + ")";
				ctx.beginPath();
				ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
				ctx.fill();
			});

			var horizon = height * 0.79;
			ctx.save();
			ctx.beginPath();
			ctx.rect(0, horizon, width, height - horizon);
			ctx.clip();
			ctx.strokeStyle = "rgba(53, 151, 255, .14)";
			ctx.lineWidth = 1;
			for (var i = 0; i <= 9; i++) {
				var t = i / 9;
				var y = horizon + (height - horizon) * t * t;
				ctx.beginPath();
				ctx.moveTo(0, y);
				ctx.lineTo(width, y);
				ctx.stroke();
			}
			for (var j = -7; j <= 7; j++) {
				ctx.beginPath();
				ctx.moveTo(width / 2 + j * 3, horizon);
				ctx.lineTo(width / 2 + j * width * 0.115, height);
				ctx.stroke();
			}
			ctx.restore();

			ctx.strokeStyle = "rgba(82, 201, 255, .68)";
			ctx.shadowColor = "#42d8ff";
			ctx.shadowBlur = 12;
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.moveTo(0, horizon);
			ctx.lineTo(width, horizon);
			ctx.stroke();
			ctx.shadowBlur = 0;
		}

		// --- VẼ QUẢ BÓNG SÉT RƠI (BALL LIGHTNING) VỚI ĐẦY ĐỦ HIỆU ỨNG TIA ĐIỆN VÀ TÀN LỬA ---
		function drawPickup(pickup, now) {
			var pulse = 1 + Math.sin(now * 0.006 + pickup.phase) * 0.08;
			ctx.save();
			ctx.translate(pickup.x, pickup.y);
			ctx.scale(pulse, pulse);
			if (pickup.type === "revive") {
				ctx.shadowColor = "#7affbc";
				ctx.shadowBlur = 18;
				ctx.strokeStyle = "#9affd1";
				ctx.fillStyle = "rgba(73, 230, 166, .18)";
				ctx.lineWidth = 2;
				ctx.beginPath();
				ctx.arc(0, 0, pickup.r + 2, 0, Math.PI * 2);
				ctx.fill();
				ctx.stroke();
				ctx.fillStyle = "#9affd1";
				ctx.beginPath();
				ctx.moveTo(3, -10);
				ctx.lineTo(-3, -1);
				ctx.lineTo(3, 1);
				ctx.lineTo(-2, 11);
				ctx.lineTo(1, 3);
				ctx.lineTo(-5, 1);
				ctx.closePath();
				ctx.fill();
			} else {
				ctx.shadowColor = "#ffd55e";
				ctx.shadowBlur = 14;
				ctx.strokeStyle = "#ffe99a";
				ctx.fillStyle = "#ffc94d";
				ctx.lineWidth = 2;
				ctx.beginPath();
				ctx.arc(0, 0, pickup.r, 0, Math.PI * 2);
				ctx.fill();
				ctx.stroke();
				ctx.fillStyle = "#fff2aa";
				ctx.font = "900 11px system-ui";
				ctx.textAlign = "center";
				ctx.textBaseline = "middle";
				ctx.fillText("ϟ", 0, 0);
			}
			ctx.restore();
		}

		function drawBall(ball, now) {
			ctx.save();
			var r = ball.r;
			var pulse = Math.sin(now * 0.016 + ball.phase) * 1.5;
			var effectiveR = Math.max(6, r + pulse);

			// Thiết lập bảng màu sét tùy theo loại bóng
			var glowColor = "#4ebaff";
			var edgeColor = "rgba(47, 135, 255, .78)";
			var midColor = "#76d7ff";
			var sparkColor = "#b8f4ff";

			if (ball.type === "violet") {
				glowColor = "#d64aff";
				edgeColor = "rgba(165, 30, 255, .82)";
				midColor = "#d982ff";
				sparkColor = "#fcd4ff";
			} else if (ball.type === "gold") {
				glowColor = "#ffb020";
				edgeColor = "rgba(255, 130, 0, .85)";
				midColor = "#ffd666";
				sparkColor = "#fff7c7";
			}

			// 1. Đuôi sét kéo dài ngược chiều rơi (Lightning Comet Tail)
			if (ball.trail && ball.trail.length > 1) {
				ctx.save();
				ctx.strokeStyle = glowColor;
				ctx.shadowColor = glowColor;
				ctx.shadowBlur = 10;
				ctx.lineWidth = 2;
				ctx.beginPath();
				ctx.moveTo(ball.trail[0].x, ball.trail[0].y);
				for (var t = 1; t < ball.trail.length; t++) {
					var jitter = (Math.random() - 0.5) * 6;
					ctx.lineTo(ball.trail[t].x + jitter, ball.trail[t].y);
				}
				ctx.stroke();
				ctx.restore();
			}

			// 2. Vệt tia sét kéo ngược lên trên đầu quả bóng
			ctx.save();
			ctx.strokeStyle = sparkColor;
			ctx.shadowColor = glowColor;
			ctx.shadowBlur = 16;
			ctx.lineWidth = 2.2;
			ctx.beginPath();
			ctx.moveTo(ball.x - r * 0.35, ball.y - r * 2.6);
			ctx.lineTo(ball.x + (Math.random() - 0.5) * 8, ball.y - r * 1.7);
			ctx.lineTo(ball.x - (Math.random() - 0.5) * 6, ball.y - r * 0.9);
			ctx.stroke();
			ctx.restore();

			// 3. Vầng hào quang ngoài (Outer Corona Glow)
			ctx.save();
			ctx.translate(ball.x, ball.y);
			ctx.shadowColor = glowColor;
			ctx.shadowBlur = 28 + Math.abs(pulse) * 4;

			var orb = ctx.createRadialGradient(-r * 0.22, -r * 0.28, 1, 0, 0, effectiveR * 1.25);
			orb.addColorStop(0, "#ffffff");
			orb.addColorStop(0.24, sparkColor);
			orb.addColorStop(0.6, midColor);
			orb.addColorStop(0.92, edgeColor);
			orb.addColorStop(1, "rgba(0, 0, 0, 0)");

			ctx.fillStyle = orb;
			ctx.beginPath();
			ctx.arc(0, 0, effectiveR, 0, Math.PI * 2);
			ctx.fill();

			// 4. Các nhánh tia sét nhỏ co giật xung quanh quả cầu (Crackling Arcs)
			ctx.shadowBlur = 12;
			ctx.strokeStyle = "#ffffff";
			ctx.lineWidth = 1.6;
			ctx.lineCap = "round";
			if (ball.arcs && ball.arcs.length) {
				for (var a = 0; a < ball.arcs.length; a++) {
					var arc = ball.arcs[a];
					var midDist = arc.length * 0.55;
					var endDist = arc.length;
					var cosA = Math.cos(arc.angle);
					var sinA = Math.sin(arc.angle);
					var normX = -sinA;
					var normY = cosA;

					ctx.beginPath();
					ctx.moveTo(cosA * (r * 0.4), sinA * (r * 0.4));
					ctx.lineTo(cosA * midDist + normX * arc.jitter1, sinA * midDist + normY * arc.jitter1);
					ctx.lineTo(cosA * endDist + normX * arc.jitter2, sinA * endDist + normY * arc.jitter2);
					ctx.stroke();
				}
			}

			// 5. Vòng ion hóa sáng quanh lõi (Ionization Ring)
			ctx.shadowBlur = 0;
			ctx.strokeStyle = sparkColor;
			ctx.lineWidth = 1.5;
			ctx.beginPath();
			var ringRot = (now * 0.004 + ball.phase) % (Math.PI * 2);
			ctx.arc(0, 0, effectiveR * 0.72, ringRot, ringRot + 2.1);
			ctx.stroke();

			ctx.restore();
			ctx.restore();
		}

		function drawPlayer(now) {
			var ground = height - 23;
			var head = ground - 40;
			var step = state === "playing" ? Math.sin(now * 0.012) * 3 : 0;
			ctx.save();
			ctx.lineCap = "round";
			ctx.lineJoin = "round";
			ctx.strokeStyle = playerColor;
			ctx.lineWidth = 3;
			ctx.shadowColor = effectColor;
			ctx.shadowBlur = 15;

			// Đầu
			ctx.beginPath();
			ctx.arc(playerX, head, 8, 0, Math.PI * 2);
			ctx.stroke();

			// Thân và tứ chi
			ctx.beginPath();
			ctx.moveTo(playerX, head + 9);
			ctx.lineTo(playerX, ground - 17);
			ctx.moveTo(playerX, head + 15);
			ctx.lineTo(playerX - 11, head + 22);
			ctx.lineTo(playerX - 15, head + 31);
			ctx.moveTo(playerX, head + 15);
			ctx.lineTo(playerX + 11, head + 22);
			ctx.lineTo(playerX + 15, head + 31);
			ctx.moveTo(playerX, ground - 17);
			ctx.lineTo(playerX - 9 + step, ground);
			ctx.moveTo(playerX, ground - 17);
			ctx.lineTo(playerX + 10 - step, ground);
			ctx.stroke();

			// Lõi ngực năng lượng phát sáng theo hiệu ứng
			ctx.fillStyle = effectColor;
			ctx.shadowBlur = 12;
			ctx.beginPath();
			ctx.arc(playerX, head + 15, 2.5, 0, Math.PI * 2);
			ctx.fill();

			// Khiên từ trường bảo vệ dưới chân
			ctx.shadowBlur = 10;
			ctx.strokeStyle = effectColor;
			ctx.lineWidth = 2.2;
			ctx.beginPath();
			ctx.ellipse(playerX, ground + 3, 21, 5.5, 0, 0, Math.PI * 2);
			ctx.stroke();

			// Hào quang bảo vệ nhấp nháy đa sắc quanh nhân vật
			if (state === "playing") {
				var auraPulse = Math.sin(now * 0.008) * 2.5;
				var baseR = 24 + auraPulse;
				ctx.save();
				ctx.strokeStyle = effectColor;
				ctx.shadowColor = effectColor;
				ctx.shadowBlur = 14;
				ctx.lineWidth = 1.6;
				ctx.globalAlpha = 0.38 + Math.sin(now * 0.006) * 0.12;

				ctx.beginPath();
				ctx.arc(playerX, ground - 22, baseR, 0, Math.PI * 2);
				ctx.stroke();

				// Các chi tiết hiệu ứng đặc trưng theo từng loại effect
				if (equippedEffectId === "crimson_fire") {
					// Lửa đỏ ma quái: vệt lửa bập bùng
					var f1 = Math.sin(now * 0.02) * 5;
					var f2 = Math.cos(now * 0.025) * 5;
					ctx.lineWidth = 2;
					ctx.beginPath();
					ctx.moveTo(playerX - 14, ground);
					ctx.quadraticCurveTo(playerX - 10, ground - 26 + f1, playerX - 6, ground - 34 + f1);
					ctx.moveTo(playerX + 14, ground);
					ctx.quadraticCurveTo(playerX + 10, ground - 26 + f2, playerX + 6, ground - 34 + f2);
					ctx.stroke();
				} else if (equippedEffectId === "violet") {
					// Tia hồ quang: phóng điện mini
					var a1 = now * 0.006;
					ctx.lineWidth = 1.5;
					ctx.beginPath();
					ctx.arc(playerX, ground - 22, baseR + 5, a1, a1 + 1.2);
					ctx.moveTo(playerX + Math.cos(a1 + 3.14) * (baseR + 5), ground - 22 + Math.sin(a1 + 3.14) * (baseR + 5));
					ctx.arc(playerX, ground - 22, baseR + 5, a1 + 3.14, a1 + 4.3);
					ctx.stroke();
				} else if (equippedEffectId === "emerald_pulse") {
					// Ma trận lục bảo: vòng xung nhịp điện tử
					ctx.lineWidth = 1.2;
					ctx.strokeRect(playerX - 16, ground - 38, 32, 32);
				} else if (equippedEffectId === "gold") {
					// Lửa hoàng kim: vòng hào quang vương giả phát quang
					ctx.lineWidth = 1.2;
					ctx.beginPath();
					ctx.arc(playerX, ground - 22, baseR + 7, 0, Math.PI * 2);
					ctx.stroke();
				} else if (equippedEffectId === "plasma") {
					// Plasma xanh ngọc: 2 hạt plasma quay quanh
					var pRot = now * 0.005;
					var px1 = playerX + Math.cos(pRot) * (baseR + 4);
					var py1 = ground - 22 + Math.sin(pRot) * (baseR * 0.6);
					var px2 = playerX - Math.cos(pRot) * (baseR + 4);
					var py2 = ground - 22 - Math.sin(pRot) * (baseR * 0.6);
					ctx.fillStyle = effectColor;
					ctx.beginPath();
					ctx.arc(px1, py1, 3, 0, Math.PI * 2);
					ctx.arc(px2, py2, 3, 0, Math.PI * 2);
					ctx.fill();
				} else if (equippedEffectId === "sakura") {
					// Bão hồng neon: cánh hoa hồng bay nhẹ
					var sRot = now * 0.003;
					ctx.fillStyle = effectColor;
					ctx.beginPath();
					ctx.arc(playerX + Math.cos(sRot) * 18, ground - 30 + Math.sin(sRot * 1.5) * 8, 2.5, 0, Math.PI * 2);
					ctx.arc(playerX - Math.cos(sRot * 0.8) * 16, ground - 18 + Math.sin(sRot * 1.2) * 8, 2.2, 0, Math.PI * 2);
					ctx.fill();
				} else if (equippedEffectId === "prism") {
					// Sao băng cầu vồng: vòng xoay hào quang đa sắc
					var hue = Math.floor((now * 0.08) % 360);
					ctx.strokeStyle = "hsl(" + hue + ", 100%, 70%)";
					ctx.shadowColor = "hsl(" + hue + ", 100%, 70%)";
					ctx.lineWidth = 2;
					ctx.beginPath();
					ctx.arc(playerX, ground - 22, baseR + 4, 0, Math.PI * 2);
					ctx.stroke();
				} else if (equippedEffectId === "divine") {
					// Hào quang bạch ngọc: vòng thánh quang kép
					ctx.lineWidth = 1.2;
					ctx.strokeStyle = "#ffffff";
					ctx.shadowColor = "#ffffff";
					ctx.beginPath();
					ctx.arc(playerX, ground - 22, baseR + 6, 0, Math.PI * 2);
					ctx.arc(playerX, ground - 22, baseR - 6, 0, Math.PI * 2);
					ctx.stroke();
				}
				ctx.restore();
			}

			ctx.restore();
		}

		// Vẽ các hiệu ứng phụ: Sóng chấn điện, Hạt tàn lửa, Chữ điểm bay, Tia sét giáng xuống
		function drawEffects(now) {
			// 1. Vẽ vòng sóng điện mặt đất (Shockwaves)
			shockwaves.forEach(function (sw) {
				ctx.save();
				ctx.strokeStyle = sw.color;
				ctx.shadowColor = sw.color;
				ctx.shadowBlur = 10;
				ctx.globalAlpha = Math.max(0, sw.alpha);
				ctx.lineWidth = 2.5;
				ctx.beginPath();
				ctx.ellipse(sw.x, sw.y, sw.r, sw.r * 0.32, 0, 0, Math.PI * 2);
				ctx.stroke();
				ctx.restore();
			});

			// 2. Vẽ hạt tàn lửa điện rơi (Particles)
			particles.forEach(function (pt) {
				ctx.save();
				var alpha = Math.max(0, pt.life / pt.maxLife);
				ctx.fillStyle = pt.color;
				ctx.shadowColor = pt.color;
				ctx.shadowBlur = 6;
				ctx.globalAlpha = alpha;
				ctx.beginPath();
				ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
				ctx.fill();
				ctx.restore();
			});

			// 3. Vẽ tia sét đánh (Strike Bolts)
			strikeBolts.forEach(function (sb) {
				var alpha = Math.max(0, sb.life / sb.maxLife);
				ctx.save();
				ctx.globalAlpha = alpha;
				drawLightningBolt(sb.x1, sb.y1, sb.x2, sb.y2, 24, 10, sb.width, sb.color, sb.glow);
				ctx.restore();
			});

			// 4. Vẽ chữ điểm combo bay (Combo Floaters)
			comboFloaters.forEach(function (cf) {
				ctx.save();
				ctx.font = "bold 13px Inter, sans-serif";
				ctx.fillStyle = cf.color;
				ctx.shadowColor = cf.color;
				ctx.shadowBlur = 8;
				ctx.globalAlpha = Math.max(0, cf.alpha);
				ctx.textAlign = "center";
				ctx.fillText(cf.text, cf.x, cf.y);
				ctx.restore();
			});
		}

		// Vẽ vòng định vị cảm ứng ngón tay trên điện thoại
		function drawTouchIndicator(now) {
			if (!touchActive || touchTargetX === null || state !== "playing") return;
			var ground = height - 23;
			var pulse = Math.sin(now * 0.016) * 2;
			ctx.save();
			ctx.shadowColor = "#5ce9ff";
			ctx.shadowBlur = 12;

			// Vạch laser định hướng nối giữa người chơi và ngón tay
			if (Math.abs(touchTargetX - playerX) > 8) {
				ctx.strokeStyle = "rgba(92, 233, 255, 0.35)";
				ctx.lineWidth = 1.5;
				ctx.setLineDash([4, 4]);
				ctx.beginPath();
				ctx.moveTo(playerX, ground - 10);
				ctx.lineTo(touchTargetX, ground - 10);
				ctx.stroke();
				ctx.setLineDash([]);
			}

			// Vòng tròn cảm ứng neon
			ctx.strokeStyle = "rgba(92, 233, 255, 0.85)";
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.arc(touchTargetX, ground - 10, 16 + pulse, 0, Math.PI * 2);
			ctx.stroke();

			// Điểm chạm tâm ngón tay
			ctx.fillStyle = "#ffffff";
			ctx.beginPath();
			ctx.arc(touchTargetX, ground - 10, 3.5, 0, Math.PI * 2);
			ctx.fill();

			ctx.restore();
		}

		function draw(now) {
			ctx.save();
			if (shake > 0) {
				shake = Math.max(0, shake - 1 / 60);
				ctx.translate((Math.random() - 0.5) * 16 * (shake / 0.48), (Math.random() - 0.5) * 12 * (shake / 0.48));
			}
			background(now);
			balls.forEach(function (ball) { drawBall(ball, now); });
			pickups.forEach(function (pickup) { drawPickup(pickup, now); });
			drawTouchIndicator(now);
			drawPlayer(now);
			drawEffects(now);
			ctx.restore();
		}

		function frame(now) {
			var dt = lastFrame ? Math.min((now - lastFrame) / 1000, 0.05) : 0;
			lastFrame = now;
			update(dt);
			draw(now);
			requestAnimationFrame(frame);
		}

		function keyDown(event) {
			Sound.init();
			if (!root.contains(document.activeElement) && document.activeElement !== document.body) return;
			var key = event.key.toLowerCase();
			if (key === "a" || key === "arrowleft") {
				keys.left = true;
				event.preventDefault();
			} else if (key === "d" || key === "arrowright") {
				keys.right = true;
				event.preventDefault();
			} else if ((key === "p" || key === "escape") && !event.repeat && (state === "playing" || state === "paused")) {
				togglePause();
				event.preventDefault();
			}
		}

		function keyUp(event) {
			var key = event.key.toLowerCase();
			if (key === "a" || key === "arrowleft") keys.left = false;
			if (key === "d" || key === "arrowright") keys.right = false;
		}

		start.addEventListener("click", function () {
			Sound.init();
			beginGame();
		});
		restart.addEventListener("click", function () {
			Sound.init();
			beginGame(true);
		});
		pause.addEventListener("click", function () {
			Sound.init();
			togglePause();
		});
		window.addEventListener("keydown", keyDown);
		window.addEventListener("keyup", keyUp);
		window.addEventListener("blur", function () {
			keys.left = false;
			keys.right = false;
			if (state === "playing") togglePause();
		});

		root.querySelectorAll("[data-move]").forEach(function (button) {
			var direction = button.getAttribute("data-move");
			button.addEventListener("pointerdown", function (event) {
				Sound.init();
				event.preventDefault();
				button.setPointerCapture(event.pointerId);
				keys[direction] = true;
			});
			["pointerup", "pointercancel", "lostpointercapture"].forEach(function (type) {
				button.addEventListener(type, function () { keys[direction] = false; });
			});
		});

		function updateTouchPos(clientX) {
			var rect = canvas.getBoundingClientRect();
			var scaleX = width / Math.max(1, rect.width);
			var canvasX = (clientX - rect.left) * scaleX;
			touchTargetX = Math.max(22, Math.min(width - 22, canvasX));
		}

		canvas.addEventListener("pointerdown", function (event) {
			Sound.init();
			canvas.focus({ preventScroll: true });
			if (state !== "playing") return;
			touchActive = true;
			touchPointerId = event.pointerId;
			updateTouchPos(event.clientX);
			try { canvas.setPointerCapture(event.pointerId); } catch (e) {}
			event.preventDefault();
		});

		canvas.addEventListener("pointermove", function (event) {
			if (!touchActive) return;
			if (touchPointerId !== null && event.pointerId !== touchPointerId) return;
			updateTouchPos(event.clientX);
			event.preventDefault();
		});

		function endTouch(event) {
			if (touchPointerId !== null && event && event.pointerId !== undefined && event.pointerId !== touchPointerId) return;
			touchActive = false;
			touchTargetX = null;
			touchPointerId = null;
		}

		["pointerup", "pointercancel", "lostpointercapture"].forEach(function (type) {
			canvas.addEventListener(type, endTouch);
		});

		// Hỗ trợ Touch Events trực tiếp cho trình duyệt điện thoại di động
		canvas.addEventListener("touchstart", function (event) {
			Sound.init();
			if (state !== "playing" || !event.touches.length) return;
			touchActive = true;
			updateTouchPos(event.touches[0].clientX);
			event.preventDefault();
		}, { passive: false });

		canvas.addEventListener("touchmove", function (event) {
			if (!touchActive || !event.touches.length) return;
			updateTouchPos(event.touches[0].clientX);
			event.preventDefault();
		}, { passive: false });

		["touchend", "touchcancel"].forEach(function (type) {
			canvas.addEventListener(type, function () {
				touchActive = false;
				touchTargetX = null;
			}, { passive: false });
		});

		function updateEquippedLook() {
			if (root.__tsProfile) {
				var look = root.__tsProfile.getLook();
				playerColor = look.character && look.character.color ? look.character.color : "#83f5ff";
				playerGlowColor = look.character && look.character.glow ? look.character.glow : playerColor;
				effectColor = look.effect && look.effect.color ? look.effect.color : "#5ce9ff";
				equippedEffectId = look.effect && look.effect.id ? look.effect.id : "ice";
			}
			requestAnimationFrame(function () {
				resize();
				canvas.focus({ preventScroll: true });
			});
		}
		updateEquippedLook();
		root.addEventListener("ts:enter-game", updateEquippedLook);

		resize();
		setState("ready");
		showOverlay("ready");
		updateHud();
		window.addEventListener("resize", resize);
		requestAnimationFrame(frame);
	});
})();
