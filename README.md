# Thunderstorm Survival

Game né những quả cầu sét rơi liên tục, theo phong cách neon của ảnh tham khảo.

## Chạy game trên máy

Mở Terminal tại thư mục này, chạy:

    python -m http.server 8000

Sau đó mở http://localhost:8000. Không cần Docker để chơi bản web độc lập.

Điều khiển bằng A / D hoặc phím mũi tên. Trên điện thoại, chạm hai nút mũi tên. Bóng rơi nhanh hơn theo thời gian; né sát bóng để tăng combo. Kỷ lục được lưu trong trình duyệt.

## Dùng trong WordPress

Plugin Thunderstorm Survival nằm ở thunderstorm-survival.php. Chép cả thư mục game (gồm thư mục assets) vào wp-content/plugins, kích hoạt plugin trong trang quản trị, rồi thêm shortcode sau vào trang:

    [thunderstorm_survival]
