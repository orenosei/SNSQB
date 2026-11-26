import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal } from "../../components/Modal";
import { ErrorNotice } from "../../components/Feedback";
import { api, type ApiEnvelope, errorMessage, unwrap } from "../../lib/api";
import { profileKey } from "../profile/api";

export function VerifyEmailButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="button button-secondary" onClick={() => setOpen(true)}>
        Xác thực email
      </button>
      {open && <EmailVerification onClose={() => setOpen(false)} />}
    </>
  );
}

function EmailVerification({ onClose }: { onClose: () => void }) {
  const [code, setCode] = useState("");
  const client = useQueryClient();
  const request = useMutation({
    mutationFn: async () =>
      unwrap(
        await api.post<ApiEnvelope<unknown>>(
          "/auth/email-verification/request",
        ),
      ),
  });
  const confirm = useMutation({
    mutationFn: async (verify_code: string) =>
      unwrap(
        await api.post<ApiEnvelope<unknown>>(
          "/auth/email-verification/confirm",
          { verify_code },
        ),
      ),
    onSuccess: async () => {
      setCode("");
      client.setQueryData(
        profileKey,
        (current: object | undefined) =>
          current && { ...current, verified: true },
      );
      await client.invalidateQueries({ queryKey: profileKey });
    },
  });
  const busy = request.isPending || confirm.isPending;
  return (
    <Modal title="Xác thực email" onClose={onClose} pending={busy}>
      {confirm.isSuccess ? (
        <p role="status">Đã xác thực email.</p>
      ) : (
        <>
          <button
            className="button button-secondary"
            disabled={busy}
            onClick={() => request.mutate()}
          >
            {request.isSuccess ? "Gửi lại mã" : "Gửi mã xác thực"}
          </button>
          {request.isSuccess && (
            <p role="status">Mã xác thực đã được gửi đến email của bạn.</p>
          )}
          <form
            className="rewards-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (/^[0-9]{6}$/.test(code.trim()) && !busy)
                confirm.mutate(code.trim());
            }}
          >
            <label>
              Mã xác thực{" "}
              <input
                autoComplete="one-time-code"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                required
                onChange={(event) => setCode(event.target.value)}
              />
            </label>
            <button
              className="button button-primary"
              disabled={busy || !/^[0-9]{6}$/.test(code.trim())}
            >
              Xác nhận mã
            </button>
          </form>
          {(confirm.isError || request.isError) && (
            <ErrorNotice
              message={errorMessage(confirm.error || request.error)}
            />
          )}
        </>
      )}
    </Modal>
  );
}
