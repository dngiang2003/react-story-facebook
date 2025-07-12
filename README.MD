# 🚀 Tiện Ích Thả Cảm Xúc Story Facebook 😄🎉

Chào mừng bạn đến với **Tiện ích Thả Cảm Xúc Story Facebook**!
Đây là một **tiện ích trình duyệt** cải tiến từ [dự án gốc của whoant](https://github.com/whoant/react-story-facebook), giúp bạn **thả biểu tượng cảm xúc (emoji) tùy chỉnh** lên các story Facebook một cách thông minh, mượt mà và thân thiện. Dự án đã được nâng cấp toàn diện với sự hỗ trợ của AI (Grok & Claude) nhằm tối ưu hiệu suất, giao diện và trải nghiệm người dùng. ✨

---

## ✨ Tính Năng Nổi Bật

* 🖱️ **Nút cảm xúc thông minh**: Hiển thị tự động khi mở story, nằm ở góc dưới bên phải, dễ thao tác.
* 🔍 **Tìm kiếm emoji theo từ khóa hoặc ký tự**: Hiển thị kết quả ngay khi gõ.
* 📚 **Emoji phân loại theo danh mục**: Như *Smileys & Emotion*, *Animals & Nature*, v.v... Giao diện tab dễ sử dụng.
* 🎯 **Giữ bảng emoji mở sau khi chọn**: Cho phép chọn liên tục nhiều emoji mà không cần mở lại.
* ⚡ **Emoji tải nhanh và có cache**: Dữ liệu emoji được lấy từ [emoji.json (UNPKG)](https://unpkg.com/emoji.json/emoji.json) và lưu cache cục bộ.
* 🌙 **Tự động hỗ trợ chế độ tối**: Giao diện thay đổi theo theme trình duyệt.
* 📱 **Tương thích cả desktop và mobile**: Thiết kế responsive phù hợp nhiều thiết bị.
* 🔄 **Tự động phát hiện & hoạt động mượt mà trên story**: Dù giao diện Facebook thay đổi.

---

## 📋 Yêu Cầu

* 🌐 **Trình duyệt hỗ trợ**:

  * Google Chrome
  * Microsoft Edge
  * Hoặc bất kỳ trình duyệt nào tương thích với **Chrome Extensions (Manifest V3)**

* 🔐 **Quyền cần cấp**:

  * `https://www.facebook.com/*` – để nhận diện và tương tác với story.
  * `https://raw.githubusercontent.com/*` – để tải danh sách emoji.

---

## 🛠️ Hướng Dẫn Cài Đặt

### 1. Tải mã nguồn

```bash
git clone https://github.com/KimiZK-Dev/Story-Reaction.git
```

### 2. Cài vào Chrome

1. Truy cập `chrome://extensions/`
2. Bật **Developer mode** (Chế độ nhà phát triển) ở góc phải trên.
3. Nhấn **Load unpacked** → Chọn thư mục `Story-Reaction` vừa tải về.

### 3. Kiểm Tra

* Mở story trên Facebook (URL dạng: `https://www.facebook.com/stories/...`)
* Nút emoji sẽ hiển thị ở góc dưới bên phải. Nhấn vào để bắt đầu thả cảm xúc! 🎉

---

## 📖 Cách Sử Dụng

1. Truy cập một **Facebook story** bất kỳ.
2. Tìm **nút emoji nổi** ở góc dưới bên phải story.
3. **Chọn emoji**:

   * Gõ từ khóa để tìm nhanh.
   * Dùng tab để chuyển danh mục.
4. **Thả cảm xúc** bằng cách nhấn emoji bạn muốn – emoji sẽ được gắn vào story (giả lập tương tác).
5. Đóng bảng chọn bằng cách nhấn lại nút hoặc nhấn ra ngoài.

---

## 📁 Cấu Trúc Dự Án

```
📦 Story-Reaction
├── background.js         # Script nền xử lý sự kiện cài đặt & cấp quyền
├── content.js            # Inject script vào story Facebook
├── story.js              # Logic chính: giao diện, emoji, phản hồi
├── styles.css            # Giao diện và hiệu ứng
├── icons/                # Icon tiện ích
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── manifest.json         # Cấu hình tiện ích (Manifest V3)
```

---

## 🧰 Khắc Phục Sự Cố

### ❌ Nút emoji không xuất hiện?

* Đảm bảo URL đúng: `https://www.facebook.com/stories/...`
* Kiểm tra console (DevTools) để xem thông báo lỗi (`F12 → Console`)
* Facebook có thể thay đổi class hoặc DOM → Cần cập nhật lại `story.js`

### 🚫 Không tải được emoji?

* Kiểm tra kết nối internet
* Đảm bảo `manifest.json` có quyền `https://raw.githubusercontent.com/*`
* Mở DevTools → tab **Network** → tìm yêu cầu đến `emoji.json`

### 🌀 Bảng emoji tự đóng sau khi chọn?

* Đã được cải tiến để giữ bảng mở. Nếu vẫn xảy ra, hãy tải lại bản mới nhất.

### 🐌 Giao diện chậm hoặc không ổn định?

* Đảm bảo trình duyệt được cập nhật.
* Kiểm tra console để xem các lỗi JavaScript hoặc CSS.

---

## ⚠️ Lưu Ý Quan Trọng

* 🔄 **Tương thích Facebook**: Nếu Facebook thay đổi DOM, bạn có thể cần chỉnh lại `querySelector` trong `story.js`
* 🧠 **AI hỗ trợ cải tiến**: Dự án đã được nâng cấp bằng Grok & Claude (AI) để tăng độ ổn định, thân thiện và tối ưu hiệu năng.
* 📦 **Nguồn emoji**:
  Emoji được lấy từ [UNPKG](https://unpkg.com/emoji.json/emoji.json), sau đó lưu vào:
  `https://raw.githubusercontent.com/KimiZK-Dev/Tao-lao/refs/heads/main/emoji.json`

---

## 💡 Góp Ý & Liên Hệ

* 🐛 Gặp lỗi? → [Tạo issue tại GitHub](https://github.com/KimiZK-Dev/Story-Reaction/issues)
* 🌟 Đóng góp ý tưởng hoặc mã nguồn? → Gửi pull request!
* 💬 Cần hỗ trợ riêng? → Nhắn qua GitHub hoặc email trong hồ sơ cá nhân.

---

## 👨‍💻 Tác Giả & Ghi Nhận

* Cải tiến bởi: **[KimiZK-Dev](https://github.com/KimiZK-Dev)**
* Dựa trên dự án gốc: [whoant/react-story-facebook](https://github.com/whoant/react-story-facebook)
* Hỗ trợ bởi AI: **Grok**, **Claude**

