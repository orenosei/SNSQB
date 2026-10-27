# SNSQB

Web Frontend cho Social Network for Student-Generated Question Bank, kết nối backend có sẵn và kiểm thử bằng Playwright/Vitest.

## Quy tắc dự án

- **Nguồn chính:** [docs/source/openapi.json](docs/source/openapi.json). Swagger do giảng viên cung cấp, không sửa file này hoặc backend.
- **Nguồn phụ:** `docs/source/requirements.pdf`, chỉ dùng cho bối cảnh, UX và yêu cầu bổ sung không trái Swagger. Khi khác nhau, làm theo Swagger, không cần hỏi lại.
- Không invent endpoint, request/response field hoặc quyền. Chi tiết chưa rõ: chọn giả định an toàn, ghi ngắn trong [PLAN](docs/PLAN.md); chỉ hỏi khi thực sự không thể tiếp tục.
- Không gọi `/admin/**`, `/auth/admin/**` hoặc operation khác được chỉ định Admin-only, kể cả để tạo fixture. AI chat dưới `/admin/ai/chat**` cũng bị loại.
- Có thể test server thật bằng tài khoản test chuyên dụng và dữ liệu riêng. Không thay đổi dữ liệu người dùng thật, hardcode credentials hoặc chạy destructive/load tests trên server dùng chung.
- Ưu tiên code chạy được, UI tốt và test có ý nghĩa. Mock chỉ dùng trong test frontend cô lập; kết quả mock không chứng minh backend hoạt động.

## Trạng thái hiện tại

Phase 0 đã được rút gọn. Có 124 API được phép trong tổng 146 operations; chưa có frontend, `package.json`, test runner hoặc credentials. **Chưa bắt đầu Phase 1, chưa chạy test server.**

Chỉ duy trì bốn tài liệu:

| Tài liệu | Nội dung |
|---|---|
| [API_CHECKLIST](docs/API_CHECKLIST.md) | 124 API theo module, trạng thái tích hợp và API test |
| [PLAN](docs/PLAN.md) | Các phase, checklist tiến độ và giả định đang dùng |
| [TEST_REPORT](docs/TEST_REPORT.md) | Kết quả thực tế, coverage và vấn đề backend đáng chú ý |
| [README](README.md) | Quy tắc, setup, công nghệ và cách sử dụng |

Dữ liệu hỗ trợ được giữ gọn, không phải bộ tài liệu phê duyệt:

- [api-inventory.csv](docs/analysis/api-inventory.csv): đủ 146 operations, đánh dấu 124 non-Admin/22 excluded; giữ parameters, request/response, schema closure và metadata coverage.
- [test-case-matrix.csv](docs/testing/test-case-matrix.csv): giữ nguyên 2.119 dòng thiết kế testcase, chưa implement/chạy. Không bắt buộc chuyển mọi dòng thành test tự động.
- [test-reference-data.csv](docs/testing/test-reference-data.csv): 101 ngữ cảnh yêu cầu + 33 khác biệt lịch sử để các ID trong testcase/inventory không mất nghĩa. `current_policy` nhắc Swagger ưu tiên, không yêu cầu trả lời conflict cũ.

Các tài liệu phân tích/architecture/roadmap/test strategy cũ đã được gộp phần hữu ích vào PLAN và TEST_REPORT rồi bỏ bản trùng. Không có test data thực hoặc credentials trong repository.

## Công nghệ đã chọn

React + TypeScript + Vite + Tailwind CSS; React Router; TanStack Query; Axios; React Hook Form + Zod. Playwright cho API/E2E, Vitest cho unit/component test khi hữu ích. STOMP client cho realtime ở phase tương ứng. Giữ cấu trúc đơn giản, component tái sử dụng, responsive và accessible; giao diện riêng lấy cảm hứng từ Facebook + Quizlet.

## Cấu trúc

```text
README.md
docs/
  API_CHECKLIST.md
  PLAN.md
  TEST_REPORT.md
  source/
    openapi.json
    requirements.pdf
  analysis/
    api-inventory.csv
    generate-api-audit.py
  testing/
    test-case-matrix.csv
    test-reference-data.csv
```

Dự kiến Phase 1 bổ sung `src/` và `tests/{api,e2e}/`; hiện chưa tạo.

## Regenerate inventory (chạy được ngay, offline)

```sh
python3 docs/analysis/generate-api-audit.py
python3 docs/analysis/generate-api-audit.py --check
```

Script chỉ dùng Python standard library, chỉ ghi `api-inventory.csv`; không gọi backend, không sinh lại tài liệu cũ hoặc testcase, không sửa Swagger/checklist/kết quả test. Cần giữ hai CSV trong `docs/testing/` để lấy traceability/categories. Metadata feature/priority/phase và trạng thái xác minh được giữ từ inventory hiện có theo method/path; chúng là ghi chú kế hoạch, không phải contract Swagger. `historical_reference_ids` trong inventory tra ở reference CSV, không phải blocker.

Snapshot nguồn SHA-256 sau cleanup:

- `openapi.json`: `2a37c0824fcccdade48250463ba67874976732a380335e663942fed1bb2f7f00`.
- `requirements.pdf`: `4352d4feef48259256c9f00dfeb1bddd34d7b2f6fdde204ac3e6f8a26cf2e151`.

## Setup và commands

Hiện chưa có ứng dụng để cài/chạy; không có lệnh npm nào sẵn dùng. Khi triển khai Phase 1, tạo lockfile và ghi phiên bản Node được chọn; bổ sung các scripts dự kiến sau, rồi cập nhật mục này bằng lệnh đã kiểm chứng:

| Lệnh dự kiến, **chưa tồn tại** | Mục đích |
|---|---|
| `npm install` | Cài dependencies khi đã có package.json |
| `npm run dev` | Vite dev server |
| `npm run build` | Typecheck và production build |
| `npm run test:unit` | Vitest |
| `npm run test:api` | Playwright API tests |
| `npm run test:e2e` | Playwright browser E2E |

REST base URL: `https://snsqb.duckdns.org/api/v1`. Swagger UI: `https://snsqb.duckdns.org/api/v1/docs`. Các URL này chưa được kiểm tra kết nối trong đợt cập nhật tài liệu.

Khi có code: cấu hình base URL công khai cho frontend; credentials test chỉ ở environment riêng không commit, không đặt trong biến `VITE_*`. Đăng nhập bằng tài khoản được cấp; không có self-service register/reset vì các API đó thuộc Admin. API/E2E thật chỉ chạy khi có credentials và fixture phù hợp; báo cáo giữ NOT_RUN/BLOCKED cho phần chưa chạy.
