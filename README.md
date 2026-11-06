# Thunderstorm

Game né những quả cầu sét rơi liên tục trong khung cảnh neon.

**Chơi ngay:** [https://huutn24-boop.github.io/game/](https://huutn24-boop.github.io/game/)

## Cách chơi

- Bấm **BẮT ĐẦU** để vào game.
- Di chuyển bằng **A / D** hoặc **← / →**.
- Trên điện thoại: Có thể chạm vuốt trực tiếp ngón tay trên màn hình để điều khiển nhân vật né bóng mượt mà, hoặc giữ các nút mũi tên ở cạnh dưới.
- Né bóng càng lâu càng tốt. Bóng rơi nhanh và dày hơn theo thời gian.
- Né sát bóng để tăng combo. Kỷ lục được lưu trong trình duyệt.
- Dùng **TẠM DỪNG** hoặc phím **P / Esc** để tạm dừng; bấm **CHƠI LẠI** để bắt đầu lượt mới.

## Chạy trên máy tính

Mở Terminal trong thư mục dự án, rồi chạy:

    python -m http.server 8000

Mở [http://localhost:8000](http://localhost:8000) trong trình duyệt. Bản web độc lập không cần Docker hay cài thư viện.

## Cập nhật bản web công khai

GitHub Pages lấy nội dung từ nhánh main, thư mục gốc. Sau khi sửa game hoặc README, đẩy thay đổi lên GitHub:

    git add .
    git commit -m "Mô tả thay đổi"
    git push

GitHub Pages sẽ tự triển khai lại sau khi nhận commit.

## Dùng trong WordPress

Chép thư mục dự án (gồm thunderstorm-survival.php và thư mục assets) vào wp-content/plugins, kích hoạt plugin **Thunderstorm**, rồi thêm shortcode này vào trang:

    [thunderstorm_survival]

## Cấu trúc chính

- index.html — trang game độc lập, dùng cho GitHub Pages.
- assets/game.css — giao diện responsive.
- assets/game.js — điều khiển, bóng rơi, điểm và combo.
- thunderstorm-survival.php — plugin WordPress.
