"use client";
import { useActionState, useEffect, useRef, useId } from "react";
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
}: {
  action: FormAction;
  fields: Field[];
  hidden?: Record<string, string>;
  submit?: string;
  danger?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const formId = useId();
  const errorRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (state.error) errorRef.current?.focus();
  }, [state]);
  return (
    <form
      action={formAction}
      className="action-form"
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
          "aria-describedby": error
            ? `${formId}-${field.name}-error`
            : undefined,
        };
        return (
          <label className="field" key={field.name}>
            <span>{field.label}</span>
            {field.options ? (
              <select
                {...accessibility}
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
                name={field.name}
                defaultValue={field.value}
                rows={4}
                maxLength={10000}
                required={field.required !== false}
              />
            ) : (
              <input
                {...accessibility}
                name={field.name}
                type={field.type || "text"}
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
            )}
            {field.hint && <small className="muted">{field.hint}</small>}
            {error && (
              <small
                id={`${formId}-${field.name}-error`}
                className="feedback-error"
              >
                {error}
              </small>
            )}
          </label>
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
        variant={danger ? "danger" : "default"}
      >
        {pending ? "Ukladám…" : submit}
      </Button>
    </form>
  );
}
