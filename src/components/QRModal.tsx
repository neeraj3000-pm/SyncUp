"use client";

import { QRCodeSVG } from "qrcode.react";
import { Sheet } from "@/components/Sheet";
import { CopyLinkButton } from "@/components/CopyLinkButton";

// PRD section 25/on sharing: Copy Link, QR Code, and (where supported) the
// native share sheet are parallel ways to invite people to the same
// session — QR specifically for "especially useful when people are
// physically together" (PRD section on sharing methods).
export function QRModal({
  path,
  code,
  onClose,
}: {
  path: string;
  code: string;
  onClose: () => void;
}) {
  const url = `${window.location.origin}${path}`;

  return (
    <Sheet onClose={onClose}>
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-bold leading-tight tracking-tight">Scan to join</h2>
          <p className="text-sm text-foreground-muted">
            Point a phone camera at this — works best when everyone&apos;s in the same room.
          </p>
        </div>

        {/* Fixed black-on-white regardless of theme — a themed QR code risks
            scan reliability if the contrast between fgColor/bgColor ever
            drops, and a scanner failing to read the code entirely is a far
            worse outcome than it not matching the surrounding surface. */}
        <div className="rounded-card border border-border bg-white p-5">
          <QRCodeSVG
            value={url}
            size={200}
            level="M"
            marginSize={0}
            title={`Join SyncUp with code ${code}`}
          />
        </div>

        <p className="font-mono text-2xl font-bold tracking-[0.2em] text-primary">{code}</p>

        <div className="w-full">
          <CopyLinkButton path={path} />
        </div>
      </div>
    </Sheet>
  );
}
