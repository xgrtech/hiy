"use client";
/** Preview → signup handoff: remember which preview to claim across the auth
 *  round-trip (localStorage survives the OAuth/email redirect), then send the
 *  visitor to /app where onboarding offers to claim it. */
import { useRouter } from "next/navigation";

export default function ClaimCTA({
  slug,
  className,
  children,
}: {
  slug: string;
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        try {
          localStorage.setItem("hiy-claim", slug);
        } catch {
          /* private mode — claim just won't pre-fill; not fatal */
        }
        router.push("/app");
      }}
      className={className}
    >
      {children}
    </button>
  );
}
