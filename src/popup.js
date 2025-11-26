(function () {
  const guide = `
1. Truy cập bài đăng cần kiểm tra trên Facebook.
2. Nhấn nút RealCheck nổi ở góc dưới phải để mở báo cáo.
3. Nếu đã có danh sách like (xuất từ tool quản trị hoặc file CSV), dán JSON vào ô nhập để phân tích sâu.
4. Đọc kết quả: Rủi ro cao thường gắn với tài khoản mới, ít bạn bè, ít hoạt động hoặc tên ngẫu nhiên.
`;

  document.getElementById('open-guide').addEventListener('click', () => {
    alert(guide);
  });
})();
