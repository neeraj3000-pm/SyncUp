import { ErrorScreen } from "@/components/ErrorScreen";

// Renders for any route Next can't match, and for every explicit
// notFound() call elsewhere in the app that doesn't already have its own
// more specific message (e.g. join/[code]'s own "we couldn't find that
// SyncUp" — that one stays local since it has somewhere more useful to
// send someone than home).
export default function NotFound() {
  return (
    <ErrorScreen
      title="We couldn't find that."
      body="This page doesn't exist, or the link might be out of date."
      action={{ label: "Back home", href: "/" }}
    />
  );
}
