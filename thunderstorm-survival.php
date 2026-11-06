<?php
/**
 * Plugin Name: Thunderstorm
 * Description: Game né bóng rơi theo phong cách neon. Dùng shortcode [thunderstorm_survival] để hiển thị.
 * Version: 1.0.0
 * Author: Site Admin
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

function thunderstorm_survival_register_assets() {
	$version = '1.0.0';
	wp_register_style( 'thunderstorm-survival', plugin_dir_url( __FILE__ ) . 'assets/game.css', array(), $version );
	wp_register_script( 'thunderstorm-survival', plugin_dir_url( __FILE__ ) . 'assets/game.js', array(), $version, true );
}
add_action( 'wp_enqueue_scripts', 'thunderstorm_survival_register_assets' );

function thunderstorm_survival_shortcode() {
	static $instance = 0;
	$instance++;
	wp_enqueue_style( 'thunderstorm-survival' );
	wp_enqueue_script( 'thunderstorm-survival' );
	$game_id = 'thunderstorm-survival-' . $instance;

	ob_start();
	?>
	<section class="ts-game" id="<?php echo esc_attr( $game_id ); ?>" data-ts-game aria-label="Thunderstorm">
		<header class="ts-game__header">
			<div class="ts-game__brand">
				<p class="ts-game__eyebrow">NEON ARCADE <span>//</span> SURVIVAL MODE</p>
				<h2>THUNDERSTORM</h2>
			</div>
			<div class="ts-game__hud" aria-label="Thông tin ván chơi">
				<div class="ts-game__stat"><span>CẤP ĐỘ</span><strong data-level>1</strong></div>
				<div class="ts-game__stat"><span>THỜI GIAN</span><strong data-time>00:00.0</strong></div>
				<div class="ts-game__stat"><span>ĐIỂM</span><strong data-score>0</strong></div>
				<div class="ts-game__stat ts-game__stat--combo"><span>COMBO</span><strong data-combo>x0</strong></div>
			</div>
		</header>
		<div class="ts-game__frame">
			<div class="ts-game__stage">
				<canvas class="ts-game__canvas" data-canvas tabindex="0" role="img" aria-label="Dùng A, D hoặc phím mũi tên để di chuyển và né bóng."></canvas>
				<div class="ts-game__status" aria-live="polite"><i></i><span data-status>BÃO ĐANG TẠM LẶNG</span></div>
				<div class="ts-game__key-hint" aria-hidden="true">A / D <span>← / →</span> HOẶC CHẠM VUỐT</div>
				<div class="ts-game__overlay" data-overlay role="status" aria-live="polite">
					<div class="ts-game__card">
						<p class="ts-game__kicker" data-kicker>THỬ THÁCH SINH TỒN</p>
						<h3 data-title>Sẵn sàng né bóng?</h3>
						<p data-copy>Những quả cầu sét sẽ rơi nhanh dần. Né càng lâu, điểm càng cao.</p>
						<p class="ts-game__result" data-result hidden></p>
						<button class="ts-game__start" type="button" data-start>BẮT ĐẦU</button>
						<small>A / D, phím mũi tên hoặc chạm vuốt màn hình để né</small>
					</div>
				</div>
			</div>
			<div class="ts-game__controls">
				<div class="ts-game__touch" aria-label="Điều khiển cảm ứng">
					<button type="button" data-move="left" aria-label="Sang trái">←</button>
					<button type="button" data-move="right" aria-label="Sang phải">→</button>
				</div>
				<p class="ts-game__record">KỶ LỤC <strong data-best>0</strong></p>
				<div class="ts-game__actions">
					<button type="button" data-sound aria-label="Bật hoặc tắt âm thanh">🔊 ÂM THANH</button>
					<button type="button" data-pause>TẠM DỪNG</button>
					<button type="button" data-restart>CHƠI LẠI</button>
				</div>
			</div>
		</div>
		<p class="ts-game__footnote">Sống sót càng lâu, bóng rơi càng nhanh. Né sát bóng để tăng combo.</p>
	</section>
	<?php
	return ob_get_clean();
}
add_shortcode( 'thunderstorm_survival', 'thunderstorm_survival_shortcode' );