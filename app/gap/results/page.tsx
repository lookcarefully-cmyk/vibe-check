import { redirect } from "next/navigation";

// The score page moved under its battery. Anyone with an old /gap/results link
// (or an old in-app link) lands on the original battery's score.
export default function GapResultsRedirect() {
  redirect("/gap/perception/results");
}
