"use client";
import { useActionState, useEffect, useRef, useId, useState } from "react";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchSelect } from "@/components/search-select";
import type { SelectorKind } from "@/lib/selectors";

export type FormState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
};
export type Field = {
  name: string;
  label: string;
  type?: string;
  value?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  min?: string;
  max?: string;
  hint?: string;
  source?: SelectorKind;
  multiple?: boolean;
};
export type FormAction = (
  state: FormState,
  data: FormData,
) => Promise<FormState>;
export function ActionForm({
  action,
  fields,
  hidden = {},
  submit = "Uložiť",
  danger = false,
  variant = "default",
}: {
  action: FormAction;
  fields: Field[];
  hidden?: Record<string, string>;
  submit?: string;
  danger?: boolean;
  variant?: "default" | "secondary" | "ghost";
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const formId = useId();
  const [visiblePasswords, setVisiblePasswords] = useState<
    Record<string, boolean>
  >({});
  const errorRef = useRef<HTMLParagraphElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.error || state.fieldErrors) {
      const invalid = formRef.current?.querySelector<HTMLElement>(
        '[aria-invalid="true"]',
      );
      if (invalid) invalid.focus();
      else errorRef.current?.focus();
    }
  }, [state]);
  return (
    <form
      ref={formRef}
      action={formAction}
      className="action-form"
      aria-busy={pending}
      onSubmit={(e) => {
        if (
          danger &&
          !window.confirm(
            "Potvrdiť zmenu? Skontrolujte, že upravujete správny záznam.",
          )
        )
          e.preventDefault();
      }}
    >
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {fields.map((field) => {
        const error = state.fieldErrors?.[field.name];
        if (field.source)
          return (
            <SearchSelect
              key={field.name}
              name={field.name}
              label={field.label}
              source={field.source}
              multiple={field.multiple}
              value={field.value}
              hint={field.hint}
              error={error}
            />
          );
        const accessibility = {
          "aria-invalid": !!error,
          "aria-describedby":
            [
              field.hint ? `${formId}-${field.name}-hint` : "",
              error ? `${formId}-${field.name}-error` : "",
            ]
              .filter(Boolean)
              .join(" ") || undefined,
        };
        return (
          <div className="field" key={field.name}>
            <label htmlFor={`${formId}-${field.name}`}>{field.label}</label>
            {field.options ? (
              <select
                {...accessibility}
                id={`${formId}-${field.name}`}
                name={field.name}
                defaultValue={field.value || ""}
                required={field.required !== false}
              >
                <option value="">Vyberte možnosť</option>
                {field.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : field.type === "textarea" ? (
              <textarea
                {...accessibility}
                id={`${formId}-${field.name}`}
                name={field.name}
                defaultValue={field.value}
                rows={4}
                maxLength={10000}
                required={field.required !== false}
              />
            ) : (
              <div
                className={
                  field.type === "password" ? "password-control" : undefined
                }
              >
                <input
                  {...accessibility}
                  id={`${formId}-${field.name}`}
                  name={field.name}
                  type={
                    field.type === "password" && visiblePasswords[field.name]
                      ? "text"
                      : field.type || "text"
                  }
                  defaultValue={field.value}
                  required={field.required !== false}
                  min={field.min}
                  max={field.max}
                  inputMode={
                    field.name === "amount_cents" ? "decimal" : undefined
                  }
                  spellCheck={field.type === "email" ? false : undefined}
                  maxLength={field.type === "password" ? 128 : 500}
                  autoComplete={
                    field.type === "password"
                      ? field.label === "Nové heslo"
                        ? "new-password"
                        : "current-password"
                      : field.type === "email"
                        ? "email"
                        : field.name === "full_name"
                          ? "name"
                          : field.type === "tel"
                            ? "tel"
                            : "off"
                  }
                />
                {field.type === "password" && (
                  <button
                    type="button"
                    className="icon-button password-toggle"
                    aria-label={
                      visiblePasswords[field.name]
                        ? "Skryť heslo"
                        : "Zobraziť heslo"
                    }
                    aria-pressed={!!visiblePasswords[field.name]}
                    onClick={() =>
                      setVisiblePasswords((current) => ({
                        ...current,
                        [field.name]: !current[field.name],
                      }))
                    }
                  >
                    {visiblePasswords[field.name] ? (
                      <EyeOff size={18} aria-hidden />
                    ) : (
                      <Eye size={18} aria-hidden />
                    )}
                  </button>
                )}
              </div>
            )}
            {field.hint && (
              <small id={`${formId}-${field.name}-hint`} className="muted">
                {field.hint}
              </small>
            )}
            {error && (
              <small
                id={`${formId}-${field.name}-error`}
                className="feedback-error"
              >
                {error}
              </small>
            )}
          </div>
        );
      })}
      {state.error && (
        <p
          ref={errorRef}
          tabIndex={-1}
          className="feedback feedback-error"
          role="alert"
        >
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="feedback feedback-success" role="status">
          {state.success}
        </p>
      )}
      <Button
        type="submit"
        disabled={pending}
        variant={danger ? "danger" : variant}
      >
        {pending && (
          <LoaderCircle className="pending-icon" size={16} aria-hidden />
        )}
        {pending ? "Ukladám…" : submit}
      </Button>
    </form>
  );
}
