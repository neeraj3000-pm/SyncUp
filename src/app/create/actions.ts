"use server";

import { redirect } from "next/navigation";
import {
  createSession,
  type SessionCategory,
} from "@/services/sessions";

const VALID_CATEGORIES: SessionCategory[] = ["WATCH", "EAT"];
const VALID_DURATIONS = [120, 300, 600]; // 2 / 5 / 10 minutes, PRD section 15

export async function createSessionAction(formData: FormData) {
  const category = formData.get("category");
  const durationSeconds = Number(formData.get("duration"));

  if (
    typeof category !== "string" ||
    !VALID_CATEGORIES.includes(category as SessionCategory) ||
    !VALID_DURATIONS.includes(durationSeconds)
  ) {
    throw new Error("Invalid session configuration.");
  }

  const session = await createSession({
    category: category as SessionCategory,
    durationSeconds,
  });

  redirect(`/session/${session.id}`);
}
