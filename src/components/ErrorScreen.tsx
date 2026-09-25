import Link from "next/link";
import { buttonSecondary } from "@/lib/ui";

type Action = { label: string } & ({ href: string } | { onClick: () => void });

// The one shape every "this screen can't show what it meant to" state in
// the app uses — a title, a plain-language explanation, and exactly one
// way forward (PRD's "one obvious primary action per screen" applies here
// too: never leave someone looking at an error with no next step).
export function ErrorScreen({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action: Action;
}) {
  return (
    <main className="mx-auto flex w-full min-h-0 max-w-md flex-1 flex-col items-center justify-center gap-6 overflow-y-auto overscroll-contain px-6 py-12 text-center">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold leading-tight tracking-tight">{title}</h1>
        <p className="text-foreground-muted">{body}</p>
      </div>
      {"href" in action ? (
        <Link href={action.href} className={buttonSecondary}>
          {action.label}
        </Link>
      ) : (
        <button type="button" onClick={action.onClick} className={buttonSecondary}>
          {action.label}
        </button>
      )}
    </main>
  );
}
