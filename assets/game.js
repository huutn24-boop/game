(function () {
	"use strict";

	document.querySelectorAll("[data-ts-game]").forEach(function (root) {
		var canvas = root.querySelector("[data-canvas]");
		var ctx = canvas && canvas.getContext("2d");
		if (!ctx) return;

		var overlay = root.querySelector("[data-overlay]");
		var start = root.querySelector("[data-start]");
		var pause = root.querySelector("[data-pause]");
		var restart = root.querySelector("[data-restart]");
		var status = root.querySelector("[data-status]");
		var levelText = root.querySelector("[data-level]");
		var timeText = root.querySelector("[data-time]");
		var scoreText = root.querySelector("[data-score]");
		var comboText = root.querySelector("[data-combo]");
		var bestText = root.querySelector("[data-best]");
		var kicker = root.querySelector("[data-kicker]");
		var title = root.querySelector("[data-title]");
		var copy = root.querySelector("[data-copy]");
		var result = root.querySelector("[data-result]");
		var state = "ready";
		var keys = { left: false, right: false };
		var width = 1, height = 1, ratio = 1, lastFrame = 0;
		var elapsed = 0, score = 0, combo = 0, comboTimer = 0, spawnTimer = 0.55;
		var playerX = 0, shake = 0, balls = [], stars = [];
		var highScore = 0, playerRadius = 11;
		var storageKey = "thunderstorm-survival-best-v1";

		try { highScore = Number(localStorage.getItem(storageKey)) || 0; } catch (error) {}
		bestText.textContent = String(highScore);

		function setState(next) {
			state = next;
			root.setAttribute("data-state", next);
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
		}

		function updatePauseLabel() {
			pause.textContent = state === "paused" ? "TIẾP TỤC" : "TẠM DỪNG";
			pause.setAttribute("aria-label", state === "paused" ? "Tiếp tục trò chơi" : "Tạm dừng trò chơi");
		}

		function showOverlay(kind) {
			overlay.hidden = false;
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
				title.textContent = "Bóng đã chạm bạn!";
				copy.textContent = "Bạn đã sống sót " + timeLabel(elapsed) + ".";
				result.innerHTML = "ĐIỂM <strong>" + score + "</strong> &nbsp;·&nbsp; KỶ LỤC <strong>" + highScore + "</strong>";
				result.hidden = false;
				start.textContent = "CHƠI LẠI";
				status.textContent = "BÃO ĐÃ KẾT THÚC";
			}
			updatePauseLabel();
		}

		function beginGame(forceRestart) {
			if (state === "paused" && !forceRestart) {
				setState("playing");
				overlay.hidden = true;
				status.textContent = "BÃO ĐANG TĂNG";
				updatePauseLabel();
				return;
			}
			setState("playing");
			elapsed = 0;
			score = 0;
			combo = 0;
			comboTimer = 0;
			spawnTimer = 0.55;
			shake = 0;
			balls = [];
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
			if (state === "playing") {
				setState("paused");
				showOverlay("paused");
			} else if (state === "paused") {
				beginGame();
			}
		}

		function endGame() {
			if (state !== "playing") return;
			setState("over");
			shake = 0.32;
			if (score > highScore) {
				highScore = score;
				bestText.textContent = String(highScore);
				try { localStorage.setItem(storageKey, String(highScore)); } catch (error) {}
			}
			showOverlay("over");
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

		function addBall() {
			var radius = 13 + Math.random() * 11;
			balls.push({
				x: radius + 5 + Math.random() * Math.max(1, width - radius * 2 - 10),
				y: -radius - 8,
				r: radius,
				vx: (Math.random() - 0.5) * 35,
				phase: Math.random() * Math.PI * 2,
				near: false
			});
		}

		function update(dt) {
			if (state !== "playing") return;
			elapsed += dt;
			score = Math.max(score, Math.floor(elapsed * 12));
			var stageLevel = level();
			var fallSpeed = Math.min(760, 195 + elapsed * 2.8 + (stageLevel - 1) * 20);
			var moveSpeed = 325 + Math.min(115, (stageLevel - 1) * 8);
			playerX += ((keys.right ? 1 : 0) - (keys.left ? 1 : 0)) * moveSpeed * dt;
			playerX = Math.max(22, Math.min(width - 22, playerX));

			spawnTimer -= dt;
			var interval = Math.max(0.32, 0.92 - elapsed * 0.0046);
			while (spawnTimer <= 0) {
				addBall();
				spawnTimer += interval;
			}
			if (comboTimer > 0 && (comboTimer -= dt) <= 0) combo = 0;

			var playerY = height - 47;
			for (var i = balls.length - 1; i >= 0; i--) {
				var ball = balls[i];
				ball.y += fallSpeed * dt;
				ball.x += ball.vx * dt + Math.sin(elapsed * 1.8 + ball.phase) * 8 * dt;
				ball.x = Math.max(ball.r, Math.min(width - ball.r, ball.x));
				var dx = ball.x - playerX, dy = ball.y - playerY;
				var distance = Math.sqrt(dx * dx + dy * dy);
				if (distance < ball.r + playerRadius) {
					endGame();
					break;
				}
				if (!ball.near && distance < ball.r + playerRadius + 25 && ball.y > playerY - 39) {
					ball.near = true;
					combo += 1;
					comboTimer = 3.3;
					score += 18 + Math.min(combo, 10) * 2;
				}
				if (ball.y - ball.r > height + 8) balls.splice(i, 1);
			}
			score = Math.max(score, Math.floor(elapsed * 12));
			updateHud();
		}

		function background(now) {
			var gradient = ctx.createLinearGradient(0, 0, 0, height);
			gradient.addColorStop(0, "#06132d");
			gradient.addColorStop(0.62, "#07132e");
			gradient.addColorStop(1, "#061a3b");
			ctx.fillStyle = gradient;
			ctx.fillRect(0, 0, width, height);

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

		function drawBall(ball) {
			ctx.save();
			ctx.translate(ball.x, ball.y);
			ctx.strokeStyle = "rgba(92, 199, 255, .33)";
			ctx.lineWidth = 2;
			ctx.shadowColor = "#51bcff";
			ctx.shadowBlur = 18;
			ctx.beginPath();
			ctx.moveTo(-ball.r * 0.34, -ball.r * 2.45);
			ctx.lineTo(ball.r * 0.2, -ball.r * 1.75);
			ctx.lineTo(-ball.r * 0.12, -ball.r * 1.1);
			ctx.stroke();

			ctx.shadowColor = "#4ebaff";
			ctx.shadowBlur = 28;
			var orb = ctx.createRadialGradient(-ball.r * 0.25, -ball.r * 0.32, 1, 0, 0, ball.r * 1.1);
			orb.addColorStop(0, "#ffffff");
			orb.addColorStop(0.28, "#d9faff");
			orb.addColorStop(0.62, "#76d7ff");
			orb.addColorStop(1, "rgba(47, 135, 255, .78)");
			ctx.fillStyle = orb;
			ctx.beginPath();
			ctx.arc(0, 0, ball.r, 0, Math.PI * 2);
			ctx.fill();

			ctx.shadowBlur = 0;
			ctx.strokeStyle = "rgba(188, 239, 255, .82)";
			ctx.lineWidth = 1.4;
			ctx.beginPath();
			ctx.arc(0, 0, ball.r * 0.72, -0.55, 1.6);
			ctx.stroke();
			ctx.restore();
		}

		function drawPlayer(now) {
			var ground = height - 23;
			var head = ground - 40;
			var step = state === "playing" ? Math.sin(now * 0.012) * 3 : 0;
			ctx.save();
			ctx.lineCap = "round";
			ctx.lineJoin = "round";
			ctx.strokeStyle = "#bdf7ff";
			ctx.lineWidth = 3;
			ctx.shadowColor = "#54cfff";
			ctx.shadowBlur = 15;
			ctx.beginPath();
			ctx.arc(playerX, head, 8, 0, Math.PI * 2);
			ctx.stroke();
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
			ctx.shadowBlur = 0;
			ctx.strokeStyle = "rgba(80, 207, 255, .82)";
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.ellipse(playerX, ground + 3, 20, 5, 0, 0, Math.PI * 2);
			ctx.stroke();
			ctx.restore();
		}

		function draw(now) {
			ctx.save();
			if (shake > 0) {
				shake = Math.max(0, shake - 1 / 60);
				ctx.translate((Math.random() - 0.5) * 14 * shake / 0.32, (Math.random() - 0.5) * 10 * shake / 0.32);
			}
			background(now);
			balls.forEach(drawBall);
			drawPlayer(now);
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
			if (!root.contains(document.activeElement)) return;
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

		start.addEventListener("click", beginGame);
		restart.addEventListener("click", function () { beginGame(true); });
		pause.addEventListener("click", togglePause);
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
				event.preventDefault();
				button.setPointerCapture(event.pointerId);
				keys[direction] = true;
			});
			["pointerup", "pointercancel", "lostpointercapture"].forEach(function (type) {
				button.addEventListener(type, function () { keys[direction] = false; });
			});
		});
		canvas.addEventListener("pointerdown", function () { canvas.focus({ preventScroll: true }); });

		resize();
		setState("ready");
		showOverlay("ready");
		updateHud();
		window.addEventListener("resize", resize);
		requestAnimationFrame(frame);
	});
})();