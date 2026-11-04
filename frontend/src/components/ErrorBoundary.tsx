import { Component, type ErrorInfo, type ReactNode } from "react";

export class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // Do not log server payloads, credentials or personal content.
  }
  render() {
    if (this.state.failed)
      return (
        <main className="fatal-error" role="alert">
          <p className="eyebrow text-brand">SNSQB</p>
          <h1>Chưa thể mở nội dung này</h1>
          <p>
            Hãy tải lại ứng dụng để thử lại. Nếu cần, bạn sẽ được yêu cầu đăng
            nhập.
          </p>
          <button
            className="button button-primary"
            onClick={() => window.location.reload()}
          >
            Tải lại ứng dụng
          </button>
        </main>
      );
    return this.props.children;
  }
}
