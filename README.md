# FB RealCheck

FB RealCheck là tiện ích mở rộng (Manifest V3) giúp người dùng nhanh chóng kiểm tra dấu hiệu buff like ảo trên bài đăng Facebook.

## Tính năng
- Nút nổi **RealCheck** xuất hiện trên trang Facebook để mở bảng điều khiển phân tích.
- Bộ chấm điểm rủi ro cho từng tài khoản like dựa trên: độ tuổi tài khoản, số bạn bè, hoạt động gần đây, trạng thái ảnh đại diện và dấu hiệu tên ngẫu nhiên.
- Phân tích tỉ lệ like/bình luận/chia sẻ hiển thị trên trang để gợi ý bất thường về tương tác.
- Cho phép nhập danh sách like thủ công dạng JSON để đánh giá dữ liệu xuất từ công cụ quản trị hoặc tự điền từ danh sách đang mở trên Facebook.
- Kèm sẵn bộ dữ liệu mẫu để thử nghiệm nhanh.

## Cài đặt thủ công
1. Mở Chrome/Edge → `chrome://extensions` (bật chế độ Nhà phát triển).
2. Chọn **Tải tiện ích đã giải nén** và trỏ tới thư mục `src`.
3. Truy cập Facebook, mở một bài đăng.
4. Bấm vào bộ đếm like/reaction để mở danh sách người đã tương tác (để công cụ đọc được dữ liệu trực tiếp), sau đó nhấn nút **RealCheck** ở góc dưới phải để xem báo cáo. Nếu không mở danh sách, công cụ sẽ dùng dữ liệu mẫu minh hoạ.

## Cách phân tích dữ liệu thủ công
Trong cửa sổ RealCheck, bạn có 3 lựa chọn:
- **Lấy dữ liệu từ trang:** mở danh sách người đã reaction, bấm vào nút này để tiện ích tự lấy thông tin hiển thị và điền vào ô JSON (không cần tải file ngoài).
- **Sao chép/Tải JSON:** sau khi ô JSON đã được điền (từ trang hoặc nhập thủ công), có thể sao chép vào clipboard hoặc tải xuống file `realcheck-likers.json` để lưu trữ/chia sẻ.
- **Dùng dữ liệu mẫu:** phù hợp để thử nhanh nếu chưa mở được danh sách like.
- **Nhập JSON thủ công:** dán JSON dạng:
  ```json
  [
    {"name":"User A","accountAgeDays":120,"friendsCount":200,"recentPosts":4,"avatarPresent":true},
    {"name":"User B","accountAgeDays":14,"friendsCount":30,"recentPosts":0,"avatarPresent":false}
  ]
  ```
- Nhấn **Phân tích** để xem điểm rủi ro, kết quả được tính dựa trên các quy tắc đã thiết lập sẵn.

## Lưu ý
- Các bộ chọn DOM để đọc số reaction/bình luận/chia sẻ có thể thay đổi khi Facebook cập nhật giao diện; hãy điều chỉnh lại nếu cần.
- Công cụ không đăng nhập hoặc gửi dữ liệu ra ngoài; toàn bộ xử lý thực hiện cục bộ trên trình duyệt.
