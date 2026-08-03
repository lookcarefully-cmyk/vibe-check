import Featured from "@/components/Featured";

// The featured shelf and (when the experiment is live) arm assignment both read
// browser state, so this page cannot be prerendered into a fixed destination.
export const dynamic = "force-dynamic";

export default function Home() {
  return <Featured />;
}
