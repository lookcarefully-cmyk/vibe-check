import Wavelength from "@/components/Wavelength";

// The dial reads live vote data on the client, so nothing here should be
// statically pre-rendered into a stale snapshot.
export const dynamic = "force-dynamic";

export default function Page() {
  return <Wavelength />;
}
