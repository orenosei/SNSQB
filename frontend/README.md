# SNSQB Frontend

Frontend client cho mạng xã hội và ngân hàng câu hỏi trắc nghiệm sinh viên SNSQB.

> **Ghi chú:** Thư mục `frontend_sample/` là tài liệu mẫu tham khảo nội bộ và không nằm trong luồng build của dự án.

## Khởi chạy cục bộ

Yêu cầu: **Node.js 22.12+** và **npm**.

```sh
npm ci
cp .env.example .env
npm run dev
```

Cấu hình biến `VITE_API_BASE_URL` trong `.env`. Mặc định kết nối tới `https://snsqb.duckdns.org/api/v1`.

Khi deploy lên Vercel, cấu hình reverse proxy trong `vercel.json` và `api/proxy.js` sẽ chuyển tiếp các request `/api/v1/*` về backend để xử lý CORS.

## Kiểm thử và Build

```sh
npm run typecheck    # Kiểm tra kiểu TypeScript
npm run build        # Build production vào dist/
npm run test:e2e     # Chạy kiểm thử giao diện E2E Playwright
npm run test:api     # Chạy kiểm thử kết nối API backend thật
```

## Cấu trúc mã nguồn

- `src/app/`: Điều hướng (routing), AppShell responsive và animation chuyển trang.
- `src/components/`: Các component dùng chung (Modal, ConfirmDialog, PageHeader, Avatar, ErrorBoundary,...).
- `src/features/`: Các module tính năng (auth, profile, social posts, academic, chat, course-classes, devices, notifications,...).
- `src/lib/`: Khởi tạo Axios client, xử lý token và API boundary.
- `src/tokens.css` & `src/workspace.css`: Design tokens và layout workspace.
