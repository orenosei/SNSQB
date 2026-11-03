import { useId, type FormEvent } from "react";
import { Search } from "lucide-react";

export function SearchForm({
  label,
  value,
  onChange,
  onSubmit,
  placeholder,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  placeholder: string;
  required?: boolean;
}) {
  const id = useId();
  return (
    <form
      className="surface search-form"
      onSubmit={onSubmit}
      role="search"
      aria-label="Tra cứu nội dung"
    >
      <Search size={21} />
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
      />
      <button className="button button-primary" type="submit">
        Tìm kiếm
      </button>
    </form>
  );
}
