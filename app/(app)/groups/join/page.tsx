"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { apiFetch, ApiError } from "@/lib/api-client";

export default function JoinGroupPage() {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { group } = await apiFetch<{ group: { id: string } }>(
        "/api/groups/join",
        {
          method: "POST",
          body: JSON.stringify({ inviteCode }),
        }
      );
      router.push(`/groups/${group.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-semibold text-ink">Join a group</h1>
      <p className="mt-1.5 text-sm text-muted">
        Ask whoever invited you for their group&apos;s invite code.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <Field label="Invite code">
          <Input
            required
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            placeholder="e.g. 7QK2P9XZ"
            className="tracking-widest"
          />
        </Field>

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}

        <Button type="submit" loading={loading} className="mt-2 w-full">
          Join group
        </Button>
      </form>
    </div>
  );
}
