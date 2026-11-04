export function FieldFeedback({
  id,
  message,
}: {
  id: string;
  message?: string;
}) {
  return message ? (
    <p id={id} className="field-error" role="alert">
      {message}
    </p>
  ) : null;
}
