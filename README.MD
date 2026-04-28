# React Story Facebook V6

Tiện ích nhỏ giúp bạn thả emoji/reaction tùy chỉnh trên Facebook Story nhanh hơn, dễ dùng hơn và vui hơn một chút.

Ở bản **V6 - 1.0.6**, extension có thêm 2 tính năng mới:

- Lưu danh sách **reaction yêu thích**, có thể sắp xếp lại thứ tự.
- Tạo nhiều **combo reaction**, đặt tên từng combo và gửi cả danh sách reaction chỉ với một lần chọn.

---

## Tính Năng

- Mở popup reaction ngay trên trang Facebook Story.
- Tìm kiếm emoji theo tên hoặc ký tự.
- Chọn nhanh reaction yêu thích.
- Quản lý danh sách yêu thích bằng dialog riêng, nút bấm to hơn để đỡ click nhầm.
- Tạo combo từ 1 reaction trở lên, ví dụ: `Vui vẻ`, `Ủng hộ`, `Cute`.
- Gửi lần lượt toàn bộ reaction trong combo.
- Hỗ trợ giao diện sáng/tối theo trình duyệt.
- Dữ liệu emoji nằm sẵn trong extension, không cần tải từ nguồn ngoài khi sử dụng.

---

## Hình Minh Họa

### Popup cơ bản

![Ảnh popup cơ bản](https://s6.imgcdn.dev/YVVv4a.png)

### Cài đặt danh sách yêu thích

![Ảnh popup cài đặt danh sách yêu thích](https://s6.imgcdn.dev/YVVx0w.png)

### Cài đặt gửi theo combo

![Ảnh popup cài đặt gửi theo combo](https://s6.imgcdn.dev/YVV2dt.png)

---

## Cài Đặt

Bạn có thể tải source theo 1 trong 2 cách.

### Cách 1: Download và giải nén

1. Tải project về máy dưới dạng file `.zip`.
2. Giải nén file vừa tải.
3. Ghi nhớ thư mục đã giải nén, lát nữa sẽ chọn thư mục này trong Chrome hoặc Edge.

### Cách 2: Clone bằng Git

```bash
git clone https://github.com/KimiZK-Dev/Story-Reaction.git
```

Sau đó mở thư mục project vừa clone.

### Load extension vào Chrome hoặc Edge

1. Mở `chrome://extensions/` hoặc `edge://extensions/`.
2. Bật **Developer mode** / **Chế độ nhà phát triển**.
3. Bấm **Load unpacked**.
4. Chọn đúng thư mục extension đã giải nén hoặc clone.
5. Mở lại Facebook hoặc bấm `F5` để tải lại trang Facebook.

---

## Cách Sử Dụng

1. Mở một link Facebook Story, ví dụ `https://www.facebook.com/stories/...`.
2. Bấm nút reaction nổi ở góc dưới bên phải.
3. Chọn emoji để gửi reaction ngay.
4. Bấm **Sắp xếp** để thêm/xóa/sắp xếp danh sách yêu thích.
5. Bấm **Quản lý** trong phần combo để tạo combo mới.
6. Đặt tên combo, chọn các reaction muốn gửi, rồi bấm **Lưu**.
7. Lần sau chỉ cần bấm combo đó, extension sẽ gửi lần lượt các reaction trong danh sách.

Mẹo nhỏ: nếu vừa cài hoặc vừa cập nhật extension, hãy reload extension ở trang `chrome://extensions/`, sau đó `F5` lại tab Facebook.

---

## Cấu Trúc Dự Án

```text
Story-Reaction
├── background.js
├── content.js
├── story.js
├── styles.css
├── js/
│   └── notification.js
├── data/
│   └── emojis.json
├── icons/
└── manifest.json
```

---

## Ghi Chú Phiên Bản V6

- V6 thêm **danh sách yêu thích có thể sắp xếp**, giúp thao tác nhanh và hạn chế click nhầm.
- V6 thêm **combo reaction**, cải thiện trải nghiệm từ bản V5 của **[KimiZK-Dev](https://github.com/KimiZK-Dev/Story-Reaction)**.
- Dự án vẫn trân trọng nền tảng ban đầu từ **[whoant/react-story-facebook](https://github.com/whoant/react-story-facebook)**.

---

## Khắc Phục Sự Cố

### Không thấy nút reaction?

- Kiểm tra bạn đang ở trang Facebook Story.
- Bấm `F5` để tải lại trang Facebook.
- Vào `chrome://extensions/`, bấm reload extension rồi mở lại tab Facebook.

### Popup không cập nhật sau khi sửa code?

- Reload extension.
- Đóng tab story cũ và mở tab mới.
- Kiểm tra Console nếu vẫn có lỗi.

### Facebook thay đổi giao diện?

Facebook có thể thay đổi DOM bất cứ lúc nào. Khi đó có thể cần cập nhật selector trong `story.js`.

---

## Tác Giả Và Ghi Nhận

- Bản cải tiến V5: **[KimiZK-Dev](https://github.com/KimiZK-Dev/Story-Reaction)**.
- Bản đầu tiên / dự án gốc: **[whoant/react-story-facebook](https://github.com/whoant/react-story-facebook)**.

Cảm ơn các tác giả đầu tiên đã đặt nền móng cho extension này. Bản V6 tiếp tục phát triển thêm phần yêu thích và combo để sử dụng hằng ngày dễ hơn, gọn hơn và thân thiện hơn.
