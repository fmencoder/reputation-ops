"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  EMPTY_SUBMISSION,
  FIELD_ORDER,
  HONEYPOT_FIELD,
  INQUIRY_TYPES,
  LIMITS,
  type ContactSubmission,
  type FieldErrors,
  type FieldName,
  validateContact,
} from "@/lib/contact/schema";
import styles from "./ContactForm.module.css";

type Status = "default" | "submitting" | "success" | "error";

const SUCCESS_MESSAGE = "Thank you. Your message has been sent successfully.";
const ERROR_MESSAGE =
  "We couldn't send your message. Please try again or email contact@novraintelligence.com.";

/**
 * The inquiry form.
 *
 * A client component because it owns four states and per-field messages, and
 * because it submits with fetch rather than a navigation — the visitor stays on
 * the page and the confirmation appears where they were looking.
 *
 * It validates with the same module the route handler uses, so a message shown
 * next to a field is the message the server would have produced. That is the
 * only reason to validate here at all: the server's answer is the one that
 * counts, and this just saves a round trip to hear it.
 */
export function ContactForm({ email }: { email: string }) {
  const id = useId();
  const [values, setValues] = useState<ContactSubmission>(EMPTY_SUBMISSION);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<Status>("default");
  const formRef = useRef<HTMLFormElement>(null);
  /*
   * When the form became interactive, used only to notice a submission that
   * arrived faster than a person could have typed one.
   *
   * Seeded in an effect rather than in the ref initialiser: Date.now() is
   * impure, and reading it during render makes the value depend on which
   * render happened to run first. 0 means "not started yet", and the elapsed
   * figure is simply omitted in that case rather than being reported as a
   * suspiciously small number.
   */
  const openedAt = useRef<number>(0);
  useEffect(() => {
    openedAt.current = Date.now();
  }, []);

  const fieldId = (name: FieldName) => `${id}-${name}`;
  const errorId = (name: FieldName) => `${id}-${name}-error`;

  const set = (name: FieldName) => (value: string) => {
    setValues((current) => ({ ...current, [name]: value }));
    // Clear a field's error as soon as it is edited. Leaving it up while
    // someone is fixing it reads as though the fix is not working.
    setErrors((current) => (current[name] ? { ...current, [name]: undefined } : current));
  };

  /** Move the caret to the first field the visitor has to deal with. */
  const focusFirstError = (found: FieldErrors) => {
    const first = FIELD_ORDER.find((name) => found[name]);
    if (!first) return;
    document.getElementById(fieldId(first))?.focus();
  };

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // The one guard against a double submission: a second click while the
    // first request is open does nothing at all.
    if (status === "submitting") return;

    const result = validateContact(values);
    if (!result.ok) {
      setErrors(result.errors);
      setStatus("default");
      focusFirstError(result.errors);
      return;
    }

    setErrors({});
    setStatus("submitting");

    try {
      const honeypotValue =
        (formRef.current?.elements.namedItem(HONEYPOT_FIELD) as HTMLInputElement | null)?.value ?? "";

      const response = await fetch("/api/contact/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...result.values,
          [HONEYPOT_FIELD]: honeypotValue,
          ...(openedAt.current ? { elapsedMs: Date.now() - openedAt.current } : {}),
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; errors?: FieldErrors }
        | null;

      if (response.ok && payload?.ok) {
        // Cleared only on success. Every other outcome keeps what was typed,
        // so a retry is a second click and not a second draft.
        setValues(EMPTY_SUBMISSION);
        setStatus("success");
        openedAt.current = Date.now();
        return;
      }

      if (response.status === 400 && payload?.errors) {
        setErrors(payload.errors);
        setStatus("default");
        focusFirstError(payload.errors);
        return;
      }

      setStatus("error");
    } catch {
      // Offline, DNS, an aborted request. Same outcome for the visitor, and
      // their text is still in the fields.
      setStatus("error");
    }
  }

  const submitting = status === "submitting";

  const describedBy = (name: FieldName) => (errors[name] ? errorId(name) : undefined);

  return (
    <form ref={formRef} className={styles.form} onSubmit={onSubmit} noValidate>
      <div className={styles.grid}>
        <Field
          label="Name"
          id={fieldId("name")}
          error={errors.name}
          errorId={errorId("name")}
          required
        >
          <input
            id={fieldId("name")}
            name="name"
            type="text"
            className={styles.input}
            value={values.name}
            onChange={(e) => set("name")(e.target.value)}
            maxLength={LIMITS.name}
            autoComplete="name"
            required
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={describedBy("name")}
            disabled={submitting}
          />
        </Field>

        <Field
          label="Email"
          id={fieldId("email")}
          error={errors.email}
          errorId={errorId("email")}
          required
        >
          <input
            id={fieldId("email")}
            name="email"
            type="email"
            className={styles.input}
            value={values.email}
            onChange={(e) => set("email")(e.target.value)}
            maxLength={LIMITS.email}
            autoComplete="email"
            inputMode="email"
            required
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={describedBy("email")}
            disabled={submitting}
          />
        </Field>

        <Field
          label="Organization"
          id={fieldId("organization")}
          error={errors.organization}
          errorId={errorId("organization")}
          optional
        >
          <input
            id={fieldId("organization")}
            name="organization"
            type="text"
            className={styles.input}
            value={values.organization}
            onChange={(e) => set("organization")(e.target.value)}
            maxLength={LIMITS.organization}
            autoComplete="organization"
            aria-invalid={errors.organization ? true : undefined}
            aria-describedby={describedBy("organization")}
            disabled={submitting}
          />
        </Field>

        <Field
          label="Inquiry type"
          id={fieldId("inquiryType")}
          error={errors.inquiryType}
          errorId={errorId("inquiryType")}
          required
        >
          <select
            id={fieldId("inquiryType")}
            name="inquiryType"
            className={styles.select}
            value={values.inquiryType}
            onChange={(e) => set("inquiryType")(e.target.value)}
            required
            aria-invalid={errors.inquiryType ? true : undefined}
            aria-describedby={describedBy("inquiryType")}
            disabled={submitting}
          >
            <option value="">Select an inquiry type</option>
            {INQUIRY_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field
        label="Subject"
        id={fieldId("subject")}
        error={errors.subject}
        errorId={errorId("subject")}
        required
      >
        <input
          id={fieldId("subject")}
          name="subject"
          type="text"
          className={styles.input}
          value={values.subject}
          onChange={(e) => set("subject")(e.target.value)}
          maxLength={LIMITS.subject}
          required
          aria-invalid={errors.subject ? true : undefined}
          aria-describedby={describedBy("subject")}
          disabled={submitting}
        />
      </Field>

      <Field
        label="Message"
        id={fieldId("message")}
        error={errors.message}
        errorId={errorId("message")}
        required
      >
        <textarea
          id={fieldId("message")}
          name="message"
          className={styles.textarea}
          value={values.message}
          onChange={(e) => set("message")(e.target.value)}
          maxLength={LIMITS.message}
          rows={7}
          required
          aria-invalid={errors.message ? true : undefined}
          aria-describedby={describedBy("message")}
          disabled={submitting}
        />
      </Field>

      {/*
        The honeypot. Hidden from sight with a class rather than display:none,
        kept out of the tab order, and hidden from assistive technology — so no
        visitor, sighted or otherwise, is ever asked to fill it in. It is
        uncontrolled: React never writes to it, only a filler does.
      */}
      <div className={styles.honeypot} aria-hidden="true">
        <label htmlFor={`${id}-website`}>Website</label>
        <input
          id={`${id}-website`}
          name={HONEYPOT_FIELD}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
      </div>

      <div className={styles.actions}>
        <button type="submit" className={styles.submit} disabled={submitting}>
          {submitting ? "Sending…" : "Send Message"}
        </button>
      </div>

      {/*
        One live region, always present.

        Rendering it unconditionally matters: a region inserted at the same
        moment as its text is frequently not announced, because the assistive
        technology never observed it empty. This one is observed from first
        paint, so the change is what gets announced.
      */}
      <p
        className={`${styles.status} ${
          status === "success" ? styles.success : status === "error" ? styles.failure : ""
        }`}
        role="status"
        aria-live="polite"
      >
        {status === "success" ? SUCCESS_MESSAGE : status === "error" ? ERROR_MESSAGE : ""}
      </p>

      <p className={styles.fallback}>
        Prefer email?{" "}
        <a className={styles.fallbackLink} href={`mailto:${email}`}>
          {email}
        </a>
      </p>
    </form>
  );
}

/** Label above the control, error below it, both tied to it by id. */
function Field({
  label,
  id,
  error,
  errorId,
  required = false,
  optional = false,
  children,
}: {
  label: string;
  id: string;
  error?: string;
  errorId: string;
  required?: boolean;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
        {required ? (
          <span className={styles.required} aria-hidden="true">
            *
          </span>
        ) : null}
        {optional ? <span className={styles.optional}>(optional)</span> : null}
      </label>
      {children}
      {/* Rendered only when there is something to say; the field points at it
          with aria-describedby at the same time, so the association is never
          dangling. */}
      {error ? (
        <p className={styles.error} id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
