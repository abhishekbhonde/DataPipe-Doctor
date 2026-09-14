import { SignUp } from "@clerk/nextjs";
import { SiteHeader } from "@/components/SiteHeader";
import { clerkAppearance } from "@/lib/clerk-appearance";

export default function Page() {
  return (
    <>
      <SiteHeader />
      <div className="authScreen">
        <SignUp appearance={clerkAppearance} />
      </div>
    </>
  );
}
