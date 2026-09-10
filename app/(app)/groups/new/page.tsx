"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { apiFetch, ApiError } from "@/lib/api-client";

export default function NewGroupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { group } = await apiFetch<{ group: { id: string } }>(
        "/api/groups",
        {
          method: "POST",
          body: JSON.stringify({ name, description: description || undefined }),
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
      <h1 className="text-2xl font-semibold text-ink">Create a group</h1>
      <p className="mt-1.5 text-sm text-muted">
        Usually a household or a small circle of people you trust.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <Field label="Group name">
          <Input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="The Sharma Household"
          />
        </Field>
        <Field label="Description (optional)">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What this group is for"
            rows={3}
          />
        </Field>

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}

        <Button type="submit" loading={loading} className="mt-2 w-full">
          Create group
        </Button>
      </form>
    </div>
  );
}
