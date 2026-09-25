import { getCreatorName, getSessionByCode } from "@/services/sessions";
import { ErrorScreen } from "@/components/ErrorScreen";
import { JoinSessionView } from "./JoinSessionView";

const ENDED_STATUSES = new Set(["COMPLETED", "EXPIRED", "CANCELLED"]);
const TRY_ANOTHER_CODE = { label: "Try another code", href: "/join" } as const;

export default async function JoinByCodePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const session = await getSessionByCode(code);

  if (!session) {
    return (
      <ErrorScreen
        title="We couldn't find that SyncUp."
        body="Check the code and try again."
        action={TRY_ANOTHER_CODE}
      />
    );
  }

  if (session.status === "ACTIVE") {
    return (
      <ErrorScreen
        title="This SyncUp has already started."
        body="Ask for a new invite once they start another one."
        action={TRY_ANOTHER_CODE}
      />
    );
  }

  if (ENDED_STATUSES.has(session.status)) {
    return (
      <ErrorScreen
        title="This SyncUp has ended."
        body="Start a new one instead."
        action={TRY_ANOTHER_CODE}
      />
    );
  }

  const creatorName = await getCreatorName(session.id);

  return (
    <main className="mx-auto flex w-full min-h-0 max-w-md flex-1 flex-col items-center justify-end gap-8 overflow-y-auto overscroll-contain px-6 pb-28 pt-12">
      <JoinSessionView
        sessionId={session.id}
        category={session.category}
        creatorName={creatorName}
      />
    </main>
  );
}
