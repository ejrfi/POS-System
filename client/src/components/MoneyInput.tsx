import { Input, type InputProps } from "@/components/ui/input";
import { extractDigits, formatCurrency } from "@/lib/utils";

type MoneyInputProps = Omit<InputProps, "value" | "onChange" | "type"> & {
  valueDigits: string;
  onValueDigitsChange: (digits: string) => void;
};

export function MoneyInput({ valueDigits, onValueDigitsChange, placeholder, ...props }: MoneyInputProps) {
  const display = valueDigits ? formatCurrency(Number(valueDigits)) : "";
  const safeOnValueDigitsChange =
    typeof onValueDigitsChange === "function" ? onValueDigitsChange : () => {};

  return (
    <Input
      {...props}
      type="text"
      inputMode="numeric"
      placeholder={placeholder ?? "Rp 0"}
      value={display}
      onChange={(e) => safeOnValueDigitsChange(extractDigits(e.target.value))}
    />
  );
}
