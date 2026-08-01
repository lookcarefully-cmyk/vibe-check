import Start from "@/components/Start";

// Arm assignment happens in the browser, so this page cannot be prerendered
// into a fixed destination.
export const dynamic = "force-dynamic";

export default function Home() {
  return <Start />;
}
