import type { Metadata } from "next";
import AdminBoards from "@/components/AdminBoards";

export const dynamic = "force-dynamic";

// Not linked from anywhere. Gated by the admin token entered in the page.
export const metadata: Metadata = {
  title: "Moderation",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminBoards />;
}
