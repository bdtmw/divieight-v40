import { useRef, type InputHTMLAttributes } from "react";
import { Field } from "@/components/Field";

type CurrencyInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type"
> & {
  label: string;
  error?: string;
  hint?: string;
  /** Plain digits only, e.g. "200000". Never contains commas. */
  value: string;
  /** Receives the plain (comma-free) value. */
  onValueChange: (plain: string) => void;
};

/** "200000" -> "200,000" (digits only; no decimals for money fields here). */
export function formatWithCommas(plain: string): string {
  if (!plain) return "";
  return plain.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function toPlainDigits(input: string): string {
  return input.replace(/[^0-9]/g, "").replace(/^0+(?=\d)/, "");
}

/**
 * Reusable money input: displays live comma thousand-separators while the
 * stored value stays a plain number string. Cursor position is preserved by
 * counting the digits to the left of the caret after reformatting.
 */
export function CurrencyInput({
  label,
  error,
  hint,
  value,
  onValueChange,
  ...props
}: CurrencyInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const el = e.target;
    const caret = el.selectionStart ?? el.value.length;
    const digitsBeforeCaret = el.value.slice(0, caret).replace(/[^0-9]/g, "").length;

    const plain = toPlainDigits(el.value);
    onValueChange(plain);

    const formatted = formatWithCommas(plain);
    // Restore the caret after React re-renders the formatted value.
    requestAnimationFrame(() => {
      const node = inputRef.current;
      if (!node) return;
      let seen = 0;
      let pos = formatted.length;
      for (let i = 0; i < formatted.length; i++) {
        if (/[0-9]/.test(formatted[i])) seen++;
        if (seen === digitsBeforeCaret) {
          pos = i + 1;
          break;
        }
      }
      if (digitsBeforeCaret === 0) pos = 0;
      node.setSelectionRange(pos, pos);
    });
  }

  return (
    <Field
      {...props}
      ref={inputRef}
      label={label}
      error={error}
      hint={hint}
      type="text"
      inputMode="numeric"
      value={formatWithCommas(value)}
      onChange={handleChange}
    />
  );
}
