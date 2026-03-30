import { useState } from "react";
import { Button, Field, PanelMessage, SectionCard, TextInput } from "@facility/ui";
import { ApiError } from "../../app/api";
import { useAuth } from "./AuthContext";

export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("admin@facility.local");
  const [password, setPassword] = useState("Facility123!");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await login(email, password);
    } catch (caughtError: unknown) {
      setError(caughtError instanceof ApiError ? caughtError.message : "Unable to sign in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fi-auth-layout">
      <div className="fi-auth-panel">
        <p className="fi-shell__eyebrow">Facility IT Intelligence Platform</p>
        <h1 className="fi-auth-title">Operational intelligence for healthcare facilities</h1>
        <p className="fi-auth-copy">
          Sign in to manage facility hierarchy, key operational records, and the connectivity baseline that later tracks will build on.
        </p>
        <PanelMessage tone="info" title="Bootstrap accounts">
          Use <strong>`admin@facility.local`</strong> or <strong>`ops@facility.local`</strong> with password <strong>`Facility123!`</strong>.
        </PanelMessage>
      </div>
      <SectionCard title="Sign In" description="Local RBAC bootstrap">
        <form className="fi-form-grid" onSubmit={handleSubmit}>
          <Field label="Email" error={error ?? undefined}>
            <TextInput value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
          </Field>
          <Field label="Password" helper="Local bootstrap auth only">
            <TextInput value={password} onChange={(event) => setPassword(event.target.value)} type="password" required />
          </Field>
          <div className="fi-form-actions">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Signing In..." : "Sign In"}
            </Button>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}
