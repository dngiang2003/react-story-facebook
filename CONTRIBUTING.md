# Đóng Góp

Cảm ơn bạn muốn đóng góp cho React Story Facebook.

## Báo Lỗi

Khi mở issue, vui lòng ghi rõ:

- Trình duyệt đang dùng và phiên bản nếu có.
- URL dạng `www.facebook.com` hay `web.facebook.com`.
- Các bước tái hiện lỗi.
- Ảnh chụp màn hình hoặc log Console nếu có.

## Đề Xuất Tính Năng

Vui lòng mô tả:

- Tính năng muốn thêm.
- Lý do tính năng đó hữu ích.
- Cách bạn kỳ vọng extension hoạt động.

## Chạy Và Test Local

Dự án không có build step. Sau khi clone:

1. Mở `chrome://extensions/` hoặc `edge://extensions/`.
2. Bật **Developer mode**.
3. Bấm **Load unpacked** và chọn thư mục root của repo.
4. Mở một Facebook Story và kiểm tra popup reaction.

Các kiểm tra nhanh trước khi gửi pull request:

```bash
node --check src/background.js
node --check src/content.js
node --check src/story.js
node --check src/notification.js
```

## Pull Request

- Giữ thay đổi tập trung vào một mục tiêu.
- Không commit dữ liệu cá nhân, cookie, token hoặc log nhạy cảm.
- Nếu thay đổi path runtime, hãy cập nhật `manifest.json` và README tương ứng.
