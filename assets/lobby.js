(function () {
	"use strict";

	var products = [
		{ id: "shield", category: "item", name: "KHIÊN NĂNG LƯỢNG", desc: "Chặn một lần va chạm trong lượt chơi tiếp theo.", price: 180, icon: "⬡", tag: "DÙNG 1 LẦN" },
		{ id: "score_core", category: "item", name: "LÕI NHÂN ĐIỂM", desc: "Nhân đôi điểm trong một lượt chơi.", price: 260, icon: "✦", tag: "DÙNG 1 LẦN" },
		{ id: "scout", category: "character", name: "NEON SCOUT", desc: "Phi công cơ bản, nhanh nhẹn và sẵn sàng ra trận.", price: 0, icon: "◉", color: "#83f5ff", glow: "#53dfff", tag: "MẶC ĐỊNH" },
		{ id: "volt", category: "character", name: "VOLT RUNNER", desc: "Bộ giáp hồ quang với ánh xanh điện.", price: 420, icon: "ϟ", color: "#72d4ff", glow: "#39aaff", tag: "HIẾM" },
		{ id: "nova", category: "character", name: "NOVA PILOT", desc: "Phi công tinh nhuệ với lõi năng lượng tím.", price: 620, icon: "✧", color: "#e7c0ff", glow: "#bd6cff", tag: "SIÊU HIẾM" },
		{ id: "titan", category: "character", name: "TEMPEST TITAN", desc: "Chiến binh bão tố với ánh vàng mạnh mẽ.", price: 850, icon: "♜", color: "#ffe1a1", glow: "#ffb743", tag: "HỮU HẠN" },
		{ id: "ice", category: "effect", name: "HÀO QUANG BĂNG", desc: "Vòng sáng xanh mát bao quanh nhân vật.", price: 0, icon: "❋", color: "#5ce9ff", tag: "MẶC ĐỊNH" },
		{ id: "violet", category: "effect", name: "TIA HỒ QUANG", desc: "Đuôi điện tím nổi bật khi di chuyển.", price: 260, icon: "⌁", color: "#d277ff", tag: "HIẾM" },
		{ id: "gold", category: "effect", name: "LỬA VÀNG", desc: "Hào quang vàng rực và tia lửa vàng.", price: 380, icon: "✦", color: "#ffca62", tag: "SIÊU HIẾM" },
		{ id: "plasma", category: "effect", name: "PLASMA XANH", desc: "Hiệu ứng plasma xanh ngọc quanh người chơi.", price: 520, icon: "◎", color: "#65ffce", tag: "HỮU HẠN" }
	];
	var storageKey = "thunderstorm-profile-v1";
	var bestKey = "thunderstorm-survival-best-v1";

	function defaultProfile() {
		return {
			coins: 900,
			runs: 0,
			inventory: { shield: 0, score_core: 0 },
			ownedCharacters: ["scout"],
			ownedEffects: ["ice"],
			equippedCharacter: "scout",
			equippedEffect: "ice"
		};
	}

	function loadProfile() {
		var base = defaultProfile();
		try {
			var saved = JSON.parse(localStorage.getItem(storageKey) || "null");
			if (!saved || typeof saved !== "object") return base;
			base.coins = Math.max(0, Math.floor(Number(saved.coins) || 0));
			base.runs = Math.max(0, Math.floor(Number(saved.runs) || 0));
			base.inventory.shield = Math.max(0, Math.floor(Number(saved.inventory && saved.inventory.shield) || 0));
			base.inventory.score_core = Math.max(0, Math.floor(Number(saved.inventory && saved.inventory.score_core) || 0));
			if (Array.isArray(saved.ownedCharacters)) base.ownedCharacters = Array.from(new Set(["scout"].concat(saved.ownedCharacters.filter(function (id) { return products.some(function (p) { return p.id === id && p.category === "character"; }); }))));
			if (Array.isArray(saved.ownedEffects)) base.ownedEffects = Array.from(new Set(["ice"].concat(saved.ownedEffects.filter(function (id) { return products.some(function (p) { return p.id === id && p.category === "effect"; }); }))));
			base.equippedCharacter = base.ownedCharacters.indexOf(saved.equippedCharacter) >= 0 ? saved.equippedCharacter : "scout";
			base.equippedEffect = base.ownedEffects.indexOf(saved.equippedEffect) >= 0 ? saved.equippedEffect : "ice";
		} catch (error) {}
		return base;
	}

	function findProduct(id) {
		return products.find(function (item) { return item.id === id; });
	}

	function escapeHtml(value) {
		return String(value).replace(/[&<>"']/g, function (char) {
			return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
		});
	}

	document.querySelectorAll("[data-ts-game]").forEach(function (root) {
		var profile = loadProfile();
		var cart = {};
		var activeCategory = "item";
		var toastTimer = null;
		var lobby = root.querySelector("[data-lobby]");
		var store = root.querySelector("[data-store]");
		var productsBox = root.querySelector("[data-store-products]");
		var cartBox = root.querySelector("[data-cart-items]");
		var cartEmpty = root.querySelector("[data-cart-empty]");
		var checkoutButton = root.querySelector("[data-checkout]");
		var message = root.querySelector("[data-store-message]");
		var toast = root.querySelector("[data-toast]");
		var wallet = root.querySelector("[data-wallet-amount]");
		var storeWallet = root.querySelector("[data-store-wallet]");
		var cartTotal = root.querySelector("[data-cart-total]");
		var cartCounts = root.querySelectorAll("[data-cart-count]");
		var avatar = root.querySelector("[data-avatar]");
		var currencyFormatter = new Intl.NumberFormat("vi-VN");

		function saveProfile() {
			try { localStorage.setItem(storageKey, JSON.stringify(profile)); } catch (error) {}
			renderProfile();
		}

		function owns(item) {
			if (item.category === "character") return profile.ownedCharacters.indexOf(item.id) >= 0;
			if (item.category === "effect") return profile.ownedEffects.indexOf(item.id) >= 0;
			return false;
		}

		function equipped(item) {
			return (item.category === "character" && profile.equippedCharacter === item.id) ||
				(item.category === "effect" && profile.equippedEffect === item.id);
		}

		function cartQuantity() {
			return Object.keys(cart).reduce(function (sum, id) { return sum + cart[id]; }, 0);
		}

		function totalCost() {
			return Object.keys(cart).reduce(function (sum, id) {
				var item = findProduct(id);
				return sum + (item ? item.price * cart[id] : 0);
			}, 0);
		}

		function renderProfile() {
			if (wallet) wallet.textContent = currencyFormatter.format(profile.coins);
			if (storeWallet) storeWallet.textContent = currencyFormatter.format(profile.coins);
			cartCounts.forEach(function (node) { node.textContent = String(cartQuantity()); });
			root.querySelectorAll("[data-lobby-runs]").forEach(function (node) { node.textContent = String(profile.runs); });

			var best = 0;
			try { best = Number(localStorage.getItem(bestKey)) || 0; } catch (error) {}
			root.querySelectorAll("[data-lobby-best]").forEach(function (node) { node.textContent = currencyFormatter.format(best); });

			var character = findProduct(profile.equippedCharacter) || findProduct("scout");
			var effect = findProduct(profile.equippedEffect) || findProduct("ice");
			root.querySelectorAll("[data-character-name]").forEach(function (node) { node.textContent = character.name; });
			root.querySelectorAll("[data-effect-name]").forEach(function (node) { node.textContent = effect.name; });
			root.querySelectorAll("[data-avatar-label]").forEach(function (node) { node.textContent = character.name; });
			if (avatar) {
				avatar.style.setProperty("--avatar-color", character.color || "#83f5ff");
				avatar.style.setProperty("--avatar-glow", effect.color || "#5ce9ff");
				avatar.setAttribute("data-character", character.id);
			}
		}

		function showToast(text) {
			if (!toast) return;
			toast.textContent = text;
			toast.hidden = false;
			if (toastTimer) window.clearTimeout(toastTimer);
			toastTimer = window.setTimeout(function () { toast.hidden = true; }, 2300);
		}

		function renderProducts() {
			var list = products.filter(function (item) { return item.category === activeCategory; });
			productsBox.innerHTML = list.map(function (item) {
				var isOwned = owns(item);
				var isEquipped = equipped(item);
				var inCart = cart[item.id] || 0;
				var count = item.category === "item" ? (profile.inventory[item.id] || 0) : 0;
				var action = "";
				if (item.category === "item") {
					action = '<button class="ts-store__product-action" type="button" data-shop-action="add" data-product-id="' + item.id + '">THÊM VÀO GIỎ <span>+</span></button>';
				} else if (isOwned) {
					action = '<button class="ts-store__product-action ' + (isEquipped ? "is-equipped" : "") + '" type="button" data-shop-action="equip" data-product-id="' + item.id + '">' + (isEquipped ? "ĐANG TRANG BỊ" : "TRANG BỊ") + '</button>';
				} else {
					action = '<button class="ts-store__product-action" type="button" data-shop-action="add" data-product-id="' + item.id + '">THÊM VÀO GIỎ <span>+</span></button>';
				}
				return '<article class="ts-store__product ' + (isOwned ? "is-owned" : "") + '">' +
					'<div class="ts-store__product-top"><span class="ts-store__product-icon" style="--item-color:' + item.color + ';--item-glow:' + item.glow + '">' + item.icon + '</span><span class="ts-store__tag">' + item.tag + '</span></div>' +
					'<h3>' + escapeHtml(item.name) + '</h3><p>' + escapeHtml(item.desc) + '</p>' +
					'<div class="ts-store__product-meta"><strong>ϟ ' + currencyFormatter.format(item.price) + '</strong>' +
					(count ? '<span>ĐANG CÓ ' + count + '</span>' : (inCart ? '<span>TRONG GIỎ ' + inCart + '</span>' : "")) + '</div>' + action + '</article>';
			}).join("");
		}

		function renderCart() {
			var ids = Object.keys(cart);
			var total = totalCost();
			cartEmpty.hidden = ids.length > 0;
			cartBox.hidden = ids.length === 0;
			cartBox.innerHTML = ids.map(function (id) {
				var item = findProduct(id);
				if (!item) return "";
				return '<div class="ts-store__cart-row"><span class="ts-store__cart-icon">' + item.icon + '</span>' +
					'<div class="ts-store__cart-name"><strong>' + escapeHtml(item.name) + '</strong><small>ϟ ' + currencyFormatter.format(item.price) + ' mỗi món</small></div>' +
					'<div class="ts-store__quantity"><button type="button" data-cart-action="minus" data-product-id="' + id + '" aria-label="Giảm số lượng">−</button><b>' + cart[id] + '</b><button type="button" data-cart-action="plus" data-product-id="' + id + '" aria-label="Tăng số lượng">+</button></div>' +
					'<button class="ts-store__remove" type="button" data-cart-action="remove" data-product-id="' + id + '" aria-label="Xóa khỏi giỏ">×</button></div>';
			}).join("");
			cartTotal.textContent = currencyFormatter.format(total);
			checkoutButton.disabled = ids.length === 0 || total > profile.coins;
			if (ids.length && total > profile.coins) {
				message.textContent = "Bạn còn thiếu " + currencyFormatter.format(total - profile.coins) + " năng lượng.";
				message.classList.add("is-warning");
			} else {
				message.textContent = "";
				message.classList.remove("is-warning");
			}
			cartCounts.forEach(function (node) { node.textContent = String(cartQuantity()); });
		}

		function render() {
			renderProfile();
			renderProducts();
			renderCart();
		}

		function addToCart(id) {
			var item = findProduct(id);
			if (!item || owns(item)) return;
			if (item.category !== "item" && cart[id]) {
				showToast("Món này đã có trong giỏ.");
				return;
			}
			cart[id] = (cart[id] || 0) + 1;
			message.textContent = "";
			render();
			showToast("Đã thêm " + item.name + " vào giỏ.");
		}

		function equip(id) {
			var item = findProduct(id);
			if (!item || !owns(item)) return;
			if (item.category === "character") profile.equippedCharacter = item.id;
			if (item.category === "effect") profile.equippedEffect = item.id;
			saveProfile();
			renderProducts();
			showToast("Đã trang bị " + item.name + ".");
		}

		function checkout() {
			var total = totalCost();
			if (!cartQuantity() || total > profile.coins) return;
			Object.keys(cart).forEach(function (id) {
				var item = findProduct(id);
				var quantity = cart[id];
				if (!item) return;
				if (item.category === "item") {
					profile.inventory[item.id] = (profile.inventory[item.id] || 0) + quantity;
				} else if (item.category === "character" && !owns(item)) {
					profile.ownedCharacters.push(item.id);
					profile.equippedCharacter = item.id;
				} else if (item.category === "effect" && !owns(item)) {
					profile.ownedEffects.push(item.id);
					profile.equippedEffect = item.id;
				}
			});
			profile.coins -= total;
			cart = {};
			saveProfile();
			render();
			showToast("Giao dịch thành công. Trang bị mới đã sẵn sàng!");
		}

		function openStore(category) {
			activeCategory = ["item", "character", "effect"].indexOf(category) >= 0 ? category : "item";
			store.hidden = false;
			store.querySelectorAll("[data-store-tab]").forEach(function (tab) {
				tab.classList.toggle("is-active", tab.getAttribute("data-store-tab") === activeCategory);
			});
			message.textContent = "";
			render();
			var close = store.querySelector("[data-close-store]");
			if (close) close.focus({ preventScroll: true });
		}

		function closeStore() {
			if (store.hidden) return;
			store.hidden = true;
			var trigger = root.querySelector("[data-open-shop]");
			if (trigger) trigger.focus({ preventScroll: true });
		}

		function changeTab(category) {
			activeCategory = category;
			store.querySelectorAll("[data-store-tab]").forEach(function (tab) {
				tab.classList.toggle("is-active", tab.getAttribute("data-store-tab") === category);
			});
			message.textContent = "";
			renderProducts();
		}

		root.__tsProfile = {
			getLook: function () {
				return { character: findProduct(profile.equippedCharacter), effect: findProduct(profile.equippedEffect) };
			},
			hasShield: function () { return profile.inventory.shield > 0; },
			consumeShield: function () {
				if (profile.inventory.shield < 1) return false;
				profile.inventory.shield -= 1;
				saveProfile();
				return true;
			},
			consumeScoreCore: function () {
				if (profile.inventory.score_core < 1) return false;
				profile.inventory.score_core -= 1;
				saveProfile();
				return true;
			},
			rewardRun: function (points, seconds) {
				var reward = Math.max(20, Math.floor(points / 4) + Math.floor(seconds * 2));
				profile.coins += reward;
				profile.runs += 1;
				saveProfile();
				return reward;
			}
		};

		root.querySelectorAll("[data-open-shop]").forEach(function (button) {
			button.addEventListener("click", function () { openStore(button.getAttribute("data-shop-start")); });
		});
		root.querySelectorAll("[data-enter-game]").forEach(function (button) {
			button.addEventListener("click", function () {
				lobby.hidden = true;
				root.querySelector("[data-game-view]").hidden = false;
				root.setAttribute("data-lobby-hidden", "true");
				root.dispatchEvent(new CustomEvent("ts:enter-game"));
			});
		});
		root.querySelectorAll("[data-return-lobby]").forEach(function (button) {
			button.addEventListener("click", function () {
				var gameView = root.querySelector("[data-game-view]");
				gameView.hidden = true;
				lobby.hidden = false;
				root.setAttribute("data-lobby-hidden", "false");
				renderProfile();
			});
		});
		root.querySelectorAll("[data-lobby-help]").forEach(function (button) {
			button.addEventListener("click", function () { showToast("Di chuyển bằng A / D hoặc phím mũi tên. Né bóng sét để sống sót."); });
		});
		root.querySelectorAll("[data-store-tab]").forEach(function (button) {
			button.addEventListener("click", function () { changeTab(button.getAttribute("data-store-tab")); });
		});
		root.querySelectorAll("[data-close-store]").forEach(function (button) {
			button.addEventListener("click", closeStore);
		});
		productsBox.addEventListener("click", function (event) {
			var button = event.target.closest("[data-shop-action]");
			if (!button) return;
			if (button.getAttribute("data-shop-action") === "equip") equip(button.getAttribute("data-product-id"));
			else addToCart(button.getAttribute("data-product-id"));
		});
		cartBox.addEventListener("click", function (event) {
			var button = event.target.closest("[data-cart-action]");
			if (!button) return;
			var id = button.getAttribute("data-product-id");
			var action = button.getAttribute("data-cart-action");
			if (action === "remove") delete cart[id];
			else if (action === "minus") {
				cart[id] = Math.max(0, (cart[id] || 0) - 1);
				if (!cart[id]) delete cart[id];
			} else if (action === "plus") {
				var item = findProduct(id);
				if (item && item.category === "item") cart[id] = (cart[id] || 0) + 1;
			}
			render();
		});
		checkoutButton.addEventListener("click", checkout);
		window.addEventListener("keydown", function (event) {
			if (event.key === "Escape" && !store.hidden) closeStore();
		});

		render();
	});
})();