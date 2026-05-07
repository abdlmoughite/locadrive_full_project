import Select from "react-select";
import { useTranslation } from "react-i18next";

import type { SelectOption } from "@/types/common";

interface SearchableSelectProps {
  inputId?: string;
  value: SelectOption | null;
  options: SelectOption[];
  onChange: (option: SelectOption | null) => void;
  placeholder?: string;
  isDisabled?: boolean;
  isLoading?: boolean;
  isClearable?: boolean;
}

export function SearchableSelect({
  inputId,
  value,
  options,
  onChange,
  placeholder,
  isDisabled,
  isLoading,
  isClearable = false,
}: SearchableSelectProps) {
  const { i18n, t } = useTranslation();

  return (
    <Select<SelectOption, false>
      inputId={inputId}
      value={value}
      options={options}
      onChange={(option) => onChange(option)}
      placeholder={placeholder}
      isDisabled={isDisabled}
      isLoading={isLoading}
      isClearable={isClearable}
      isRtl={i18n.dir() === "rtl"}
      unstyled
      classNames={{
        control: (state) =>
          [
            "min-h-11 rounded-2xl border bg-white px-2 text-sm shadow-sm transition",
            state.isFocused ? "border-blue-500 ring-4 ring-blue-100" : "border-slate-300",
            state.isDisabled ? "cursor-not-allowed bg-slate-100 text-slate-400" : "",
          ].join(" "),
        valueContainer: () => "gap-1 px-2 py-1",
        placeholder: () => "text-slate-400",
        input: () => "text-slate-900",
        menu: () => "mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl",
        menuList: () => "max-h-72 p-2",
        option: (state) =>
          [
            "cursor-pointer rounded-xl px-3 py-2 text-sm transition",
            state.isFocused ? "bg-slate-100 text-slate-950" : "text-slate-700",
            state.isSelected ? "bg-blue-600 text-white" : "",
          ].join(" "),
        indicatorSeparator: () => "hidden",
        dropdownIndicator: () => "px-2 text-slate-400",
        clearIndicator: () => "px-2 text-slate-400",
        noOptionsMessage: () => "px-3 py-2 text-sm text-slate-500",
        loadingMessage: () => "px-3 py-2 text-sm text-slate-500"
      }}
      noOptionsMessage={() => t("common.noData", "No results found.")}
      loadingMessage={() => t("common.loading")}
      filterOption={(option, inputValue) => {
        const haystack = `${option.label} ${option.data.description ?? ""}`.toLowerCase();
        return haystack.includes(inputValue.toLowerCase());
      }}
    />
  );
}
