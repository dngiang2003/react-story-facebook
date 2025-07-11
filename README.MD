# 🚀 Tiện ích Thả Cảm xúc Story Facebook 😄🎉

Tiện ích trình duyệt này cho phép bạn **thả các biểu tượng cảm xúc (emoji) tùy chỉnh** trên các story của Facebook, mang đến trải nghiệm tương tác sinh động và thú vị với **giao diện thân thiện**!

---

## ✨ Tính năng

* 🖱️ **Nút thả cảm xúc**: Nút nổi hiển thị trên story Facebook, cho phép chọn emoji để thả.
* 🔍 **Tìm kiếm emoji**: Hỗ trợ tìm kiếm theo tên hoặc ký tự emoji.
* 📚 **Phân loại emoji**: Emoji được nhóm theo danh mục (ví dụ: *Smileys & Emotion*) và hiển thị theo tab.
* ⚡ **Tự động tải dữ liệu**: Emoji được tải tự động từ nguồn trực tuyến.
* 🎯 **Chỉ hoạt động trên Story**: Chỉ hiển thị với URL dạng `https://www.facebook.com/stories/...`.

---

## 📋 Yêu cầu

* 🌐 **Trình duyệt**: Google Chrome hoặc các trình duyệt hỗ trợ Chrome Extensions (Manifest V3).
* 🔐 **Quyền truy cập**:

  * `https://www.facebook.com/*`
  * `https://raw.githubusercontent.com/*`

---

## 🛠️ Hướng dẫn cài đặt

### 1. Tải mã nguồn

Tải hoặc clone repository về máy tính của bạn.

```bash
git clone https://github.com/KimiZK-Dev/Tao-lao.git
```

### 2. Cài đặt tiện ích vào Chrome

1. Mở trình duyệt và truy cập: `chrome://extensions/`
2. Bật **Chế độ nhà phát triển** (Developer mode) ở góc trên bên phải.
3. Nhấn **Load unpacked** và chọn thư mục chứa mã nguồn vừa tải.

### 3. Kiểm tra hoạt động

* Truy cập một story Facebook (URL dạng `https://www.facebook.com/stories/...`)
* Nút thả cảm xúc sẽ hiển thị ở **góc dưới bên phải** story 🎈

---

## 📁 Cấu trúc dự án

```
📦 facebook-story-reaction
├── background.js         # Script xử lý sự kiện và inject
├── content.js            # Script inject story.js vào trang
├── story.js              # Logic chính: UI, xử lý emoji, tương tác
├── styles.css            # Giao diện của tiện ích
├── icons/                # Biểu tượng tiện ích
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── manifest.json         # Cấu hình tiện ích (Manifest V3)
```

---

## 📖 Cách sử dụng

1. Truy cập một story Facebook.
2. Nút emoji sẽ hiển thị ở góc dưới bên phải story.
3. Nhấn để mở bảng chọn emoji.
4. Tìm kiếm hoặc chuyển danh mục emoji bằng tab.
5. Nhấn emoji để thả cảm xúc lên story. 🎉

---

## ⚠️ Lưu ý

* 🌐 **Nguồn emoji**: Tải từ
  `https://raw.githubusercontent.com/KimiZK-Dev/Tao-lao/refs/heads/main/emoji.json`
* ⚡ **Hiệu suất**: Sử dụng `MutationObserver` và cơ chế retry để đảm bảo nút luôn hiển thị đúng lúc.
* 🔄 **Tương thích giao diện**: Nếu Facebook cập nhật UI, có thể cần chỉnh selector trong `story.js`.
* 🛠️ **Debug**:

  * Mở DevTools (F12), xem console log nếu nút không hiển thị.
  * Kiểm tra thông báo như `"Could not find stories footer after retries"`.

---

## 🧰 Giải quyết sự cố

### Nút không hiển thị?

* Kiểm tra DevTools (Console) để tìm lỗi.
* Đảm bảo URL đúng định dạng:
  `https://www.facebook.com/stories/[story_id]/UzpfSVNDOj...?bucket_count=...&source=story_tray`
* Reload trang hoặc cập nhật selector trong `story.js`.

### Không tải được emoji?

* Kiểm tra kết nối mạng.
* Kiểm tra quyền truy cập tới `https://raw.githubusercontent.com/*` trong `manifest.json`.
* Vào tab **Network** trong DevTools để kiểm tra lệnh `fetch`.

---

## 💡 Góp ý & Liên hệ

* Gặp lỗi hoặc có ý tưởng mới?
  → [Tạo issue trên GitHub](https://github.com/KimiZK-Dev/Tao-lao/issues) hoặc liên hệ trực tiếp với tác giả.

---

## 👨‍💻 Tác giả: KimiZK-Dev
