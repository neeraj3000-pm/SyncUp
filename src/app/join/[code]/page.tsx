import Link from "next/link";
import { getCreatorName, getSessionByCode } from "@/services/sessions";
import { JoinSessionView } from "./JoinSessionView";

const ENDED_STATUSES = new Set(["COMPLETED", "EXPIRED", "CANCELLED"]);

export default async function JoinByCodePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const session = await getSessionByCode(code);

  if (!session) {
    return (
      <ErrorCard
        title="We couldn't find that SyncUp."
        body="Check the code and try again."
      />
    );
  }

  if (session.status === "ACTIVE") {
    return (
      <ErrorCard
        title="This SyncUp has already started."
        body="Ask for a new invite once they start another one."
      />
    );
  }

  if (ENDED_STATUSES.has(session.status)) {
    return <ErrorCard title="This SyncUp has ended." body="Start a new one instead." />;
  }

  const creatorName = await getCreatorName(session.id);

  return (
    <main className="mx-auto flex w-full min-h-0 max-w-md flex-1 flex-col items-center justify-center gap-8 overflow-y-auto overscroll-contain px-6 py-12">
      <JoinSessionView
        sessionId={session.id}
        category={session.category}
        creatorName={creatorName}
      />
    </main>
  );
}

function ErrorCard({ title, body }: { title: string; body: string }) {
  return (
    <main className="mx-auto flex w-full min-h-0 max-w-md flex-1 flex-col items-center justify-center gap-6 overflow-y-auto overscroll-contain px-6 py-12 text-center">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-foreground-muted">{body}</p>
      </div>
      <Link
        href="/join"
        className="rounded-pill border border-border px-8 py-4 text-lg font-semibold transition-colors hover:bg-surface-raised"
      >
        Try another code
      </Link>
    </main>
  );
}
