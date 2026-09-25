import { getSessionWithCreatorByCode } from "@/services/sessions";
import { ErrorScreen } from "@/components/ErrorScreen";
import { JoinSessionView } from "./JoinSessionView";

const TRY_ANOTHER_CODE = { label: "Try another code", href: "/join" } as const;

export default async function JoinByCodePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const found = await getSessionWithCreatorByCode(code);

  if (!found) {
    return (
      <ErrorScreen
        title="We couldn't find that SyncUp."
        body="Check the code and try again."
        action={TRY_ANOTHER_CODE}
      />
    );
  }

  const { session, creatorName } = found;

  if (session.status === "ACTIVE") {
    return (
      <ErrorScreen
        title="This SyncUp has already started."
        body="Ask for a new invite once they start another one."
        action={TRY_ANOTHER_CODE}
      />
    );
  }

  if (session.status !== "WAITING") {
    return (
      <ErrorScreen
        title="This SyncUp has ended."
        body="Start a new one instead."
        action={{ label: "Start a new SyncUp!", href: "/create" }}
      />
    );
  }

  return (
    <main className="mx-auto flex w-full min-h-0 max-w-md flex-1 flex-col items-center gap-8 overflow-y-auto overscroll-contain px-6 py-12">
      <JoinSessionView
        sessionId={session.id}
        category={session.category}
        creatorName={creatorName}
      />
    </main>
  );
}
