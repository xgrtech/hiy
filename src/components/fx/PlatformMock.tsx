/**
 * The real product, not a fabricated mock: actual screenshots of the
 * creator dashboard (light + dark, swapped to match the visitor's theme),
 * in a minimal frame. Re-shoot after major dashboard changes:
 * see public/demo/.
 */
import Image from "next/image";
import OnView from "./OnView";
import type { CSSProperties } from "react";

export default function PlatformMock() {
  return (
    <OnView className="mx-auto max-w-4xl">
      <div
        className="ov-chip overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_2px_10px_rgba(10,37,64,.06),0_32px_80px_rgba(10,37,64,.14)]"
        style={{ "--i": 0 } as CSSProperties}
      >
        <Image
          src="/demo/dashboard-light.png"
          alt="The hiy creator dashboard: live link, conversation stats, recent visitor questions, and the teach-your-hiy queue showing an unanswered question."
          width={2560}
          height={1600}
          className="demo-light h-auto w-full"
          priority={false}
        />
        <Image
          src="/demo/dashboard-dark.png"
          alt=""
          aria-hidden
          width={2560}
          height={1600}
          className="demo-dark h-auto w-full"
          priority={false}
        />
      </div>
      <p className="mt-3 text-center text-xs text-inkfaint">
        The actual dashboard — real conversations, and the one question this
        hiy couldn&apos;t answer yet, waiting to be taught.
      </p>
    </OnView>
  );
}
