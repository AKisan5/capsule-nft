'use client';

import Image from 'next/image';
import { usePreMintStore } from '@/stores/preMint';

export function PhotoBanner() {
  const { photoPreviewUrl, eventName, fighterTag } = usePreMintStore();

  if (!photoPreviewUrl) return null;

  return (
    <div className="sticky top-12 z-20 w-full">
      <div className="relative h-28 w-full overflow-hidden">
        <Image
          src={photoPreviewUrl}
          alt="Selected moment"
          fill
          className="object-cover"
          priority
          unoptimized
        />
        {/* dark scrim */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-transparent" />
        <div className="absolute bottom-2 left-4 flex items-end gap-3">
          {fighterTag && (
            <span className="rounded bg-primary/80 px-2 py-0.5 text-xs font-semibold text-primary-foreground backdrop-blur-sm">
              #{fighterTag}
            </span>
          )}
          {eventName && (
            <span className="text-xs font-medium text-white/90 drop-shadow">
              {eventName}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
