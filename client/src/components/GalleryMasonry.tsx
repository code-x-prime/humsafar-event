"use client";

import { useState } from "react";
import Image from "next/image";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";

export interface GalleryImage {
  id: string;
  image: string;
  title: string | null;
}

export function GalleryMasonry({ images }: { images: GalleryImage[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (images.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-(--ink-100) py-16 text-center font-sans text-sm text-(--ink-500)">
        No photos in the gallery yet — check back soon.
      </p>
    );
  }

  return (
    <>
      <div className="columns-2 gap-3 sm:columns-3 sm:gap-4 lg:columns-4">
        {images.map((img, i) => (
          <button
            key={img.id}
            onClick={() => setOpenIndex(i)}
            className="group relative mb-3 block w-full break-inside-avoid overflow-hidden rounded-2xl border border-(--ink-100) bg-white shadow-[0_2px_8px_rgba(11,22,32,0.05)] sm:mb-4"
          >
            <Image
              src={img.image}
              alt={img.title || "Gallery photo"}
              width={600}
              height={800}
              quality={90}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            {img.title && (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <p className="font-heading text-sm font-semibold text-white">{img.title}</p>
              </div>
            )}
          </button>
        ))}
      </div>

      <Lightbox
        open={openIndex !== null}
        index={openIndex ?? 0}
        close={() => setOpenIndex(null)}
        slides={images.map((img) => ({ src: img.image, alt: img.title || "Gallery photo", title: img.title || undefined }))}
        plugins={[Zoom]}
        zoom={{ maxZoomPixelRatio: 3, doubleTapDelay: 300, doubleClickDelay: 300 }}
      />
    </>
  );
}
