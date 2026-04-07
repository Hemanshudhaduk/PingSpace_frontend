import React, { useEffect, useMemo, useRef, useState } from "react";
import "./InputModel.css";

type SelectOption = { label: string; value: string | number };

type FieldConfig = {
  name: string;
  label?: string;
  type?: "text" | "textarea" | "number" | "email" | "password" | "url" | "select";
  placeholder?: string;
  defaultValue?: string | number;
  required?: boolean;
  options?: SelectOption[];
  rows?: number;
  pattern?: string;
  min?: number;
  max?: number;
  step?: number;
  maxLength?: number;
};

type InputModalProps = {
  isOpen: boolean;
  title: string;
  description?: string;
  fields: FieldConfig[];
  submitLabel?: string;
  icon?: React.ReactNode;
  onClose: () => void;
  onSubmit: (values: Record<string, string | number>) => void | Promise<void>;
  isSubmitting?: boolean;
};

const InputModal: React.FC<InputModalProps> = ({
  isOpen,
  title,
  description,
  fields,
  submitLabel = "Create",
  icon,
  onClose,
  onSubmit,
  isSubmitting,
}) => {
  const [values, setValues]           = useState<Record<string, string | number>>({});
  const [internalSubmitting, setInternalSubmitting] = useState(false);
  const [success, setSuccess]         = useState(false);
  const firstInputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  const initialValues = useMemo(() => {
    const init: Record<string, string | number> = {};
    (fields || []).forEach((f) => { init[f.name] = f.defaultValue ?? ""; });
    return init;
  }, [fields]);

  useEffect(() => {
    if (isOpen) {
      setValues(initialValues);
      setSuccess(false);
      setTimeout(() => firstInputRef.current?.focus(), 80);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") { e.stopPropagation(); onClose(); }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  const handleChange = (name: string, value: string | number) =>
    setValues((prev) => ({ ...prev, [name]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isSubmitting === undefined) setInternalSubmitting(true);
      await onSubmit(values);
      setSuccess(true);
    } finally {
      if (isSubmitting === undefined) setInternalSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const submitting = isSubmitting ?? internalSubmitting;

  return (
    <div
      className="im-overlay"
      aria-modal="true"
      role="dialog"
      aria-labelledby="im-title"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="im-modal" onClick={(e) => e.stopPropagation()}>
        <div className="im-accent" />

        <div className="im-header">
          <div>
            {icon && <div className="im-icon">{icon}</div>}
            <h2 id="im-title" className="im-title">{title}</h2>
            {description && <p className="im-desc">{description}</p>}
          </div>
          <button type="button" aria-label="Close" className="im-close" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="im-form">
          {(fields || []).map((field, i) => {
            const charLen = String(values[field.name] ?? "").length;
            const isFirst = i === 0;

            const commonProps = {
              id: field.name,
              name: field.name,
              placeholder: field.placeholder,
              required: field.required,
              value: values[field.name] ?? "",
              maxLength: field.maxLength,
              onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
                handleChange(field.name, e.target.value),
            };

            return (
              <div key={field.name} className="im-field">
                {field.label && (
                  <label htmlFor={field.name} className="im-label">
                    {field.label}
                    {field.required && <span className="im-required-dot" />}
                  </label>
                )}

                {field.type === "textarea" ? (
                  <textarea
                    {...commonProps  as React.TextareaHTMLAttributes<HTMLTextAreaElement>}
                    rows={field.rows ?? 3}
                    className="im-textarea"
                    ref={isFirst ? (firstInputRef as React.RefObject<HTMLTextAreaElement>) : undefined}
                  />
                ) : field.type === "select" ? (
                  <select
                    {...commonProps as React.SelectHTMLAttributes<HTMLSelectElement>}
                    className="im-select"
                  >
                    <option value="" disabled={field.required}>
                      {field.placeholder ?? "Select an option"}
                    </option>
                    {(field.options || []).map((opt) => (
                      <option key={String(opt.value)} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    {...commonProps }
                    type={field.type ?? "text"}
                    pattern={field.pattern}
                    min={field.min}
                    max={field.max}
                    step={field.step}
                    className="im-input"
                    ref={isFirst ? (firstInputRef as React.RefObject<HTMLInputElement>) : undefined}
                  />
                )}

                {field.maxLength && (
                  <span className={`im-charcount ${charLen > field.maxLength * 0.85 ? "warn" : ""}`}>
                    {charLen} / {field.maxLength}
                  </span>
                )}
              </div>
            );
          })}

          <div className="im-divider" />

          <div className="im-actions">
            <button type="button" className="im-btn-cancel" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className={`im-btn-submit ${success ? "success" : ""}`} disabled={submitting}>
              {submitting ? (
                <><span className="im-spinner" /> Saving...</>
              ) : success ? (
                <><CheckIcon /> Done!</>
              ) : (
                <><ArrowIcon /> {submitLabel}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ArrowIcon = () => (
  <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
    <path d="M7 1L13 7L7 13M1 7H13" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
    <path d="M2 7L6 11L12 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default InputModal;