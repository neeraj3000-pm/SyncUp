import { notFound } from "next/navigation";
import { getSessionById } from "@/services/sessions";
import { CopyLinkButton } from "@/components/CopyLinkButton";

const CATEGORY_LABEL: Record<string, string> = {
  WATCH: "what to watch 🎬",
  EAT: "where to eat 🍔",
};

export default async function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSessionById(id);
  if (!session) notFound();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center gap-8 px-6 py-12 text-center">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">Your SyncUp</h1>
        <p className="text-foreground-muted">
          Deciding {CATEGORY_LABEL[session.category] ?? session.category}
        </p>
      </div>

      <div className="rounded-card border border-border bg-surface px-10 py-6">
        <p className="text-sm text-foreground-muted">Share this code</p>
        <p className="font-mono text-4xl font-bold tracking-[0.2em] text-primary">
          {session.code}
        </p>
      </div>

      <div className="w-full">
        <CopyLinkButton path={`/join/${session.code}`} />
      </div>

      <p className="text-sm text-foreground-muted">
        Waiting for people to join — the live waiting room lands in the next
        build. Anyone with the code above can already join a SyncUp for{" "}
        {CATEGORY_LABEL[session.category] ?? session.category}.
      </p>
    </main>
  );
}
