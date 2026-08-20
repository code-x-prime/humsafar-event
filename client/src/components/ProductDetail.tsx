"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Star, Clock, CheckCircle2, XCircle, MapPin, ChevronRight, ZoomIn } from "lucide-react";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";
import type { ProductDetailData } from "@/app/decoration/[slug]/page";
import { CustomizeOrderDialog } from "./CustomizeOrderDialog";
import { CitySelector } from "./CitySelector";
import { useCity } from "@/context/CityContext";
import { getJson } from "@/lib/api";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";

const TABS = ["Included", "FAQs", "Delivery", "Care Info"] as const;
type Tab = (typeof TABS)[number];

export function ProductDetail({ product }: { product: ProductDetailData }) {
  const [activeImage, setActiveImage] = useState(0);
  const [galleryApi, setGalleryApi] = useState<CarouselApi>();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeVariant, setActiveVariant] = useState(0);
  const [activeTab, setActiveTab] = useState<Tab>("Included");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState<string | null>(null);
  const { selectedCity } = useCity();

  useEffect(() => {
    if (!galleryApi) return;
    setActiveImage(galleryApi.selectedScrollSnap());
    galleryApi.on("select", () => setActiveImage(galleryApi.selectedScrollSnap()));
  }, [galleryApi]);

  useEffect(() => {
    getJson<{ whatsappNumber: string }>("/settings/contact")
      .then((data) => setWhatsappNumber(data.whatsappNumber))
      .catch(() => {
        // Contact settings unreachable — WhatsApp CTA stays hidden rather than showing a wrong number.
      });
  }, []);

  const images = product.media.length > 0 ? product.media : null;
  const category = product.categories[0]?.category;
  const whatsappMessage = `Hi! I'm interested in "${product.title}"${typeof window !== "undefined" ? ` — ${window.location.href}` : ""
    }`;

  return (
    <div className="mt-4 grid grid-cols-1 gap-6 pb-20 lg:grid-cols-[1fr_1fr] lg:pb-0">
      {/* Gallery */}
      <div>
        {images ? (
          <Carousel setApi={setGalleryApi} className="w-full">
            <CarouselContent className="ml-0">
              {images.map((img, i) => (
                <CarouselItem key={img.id} className="pl-0">
                  <button
                    type="button"
                    onClick={() => setLightboxOpen(true)}
                    className="group relative aspect-square w-full cursor-zoom-in overflow-hidden rounded-(--radius-card,16px) border border-(--ink-100) bg-white"
                  >
                    <Image
                      src={img.url}
                      alt={img.alt || product.title}
                      fill
                      quality={90}
                      sizes="(max-width: 1024px) 100vw, 600px"
                      className="object-cover"
                      priority={i === 0}
                    />
                    <span className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100">
                      <ZoomIn className="h-4 w-4" />
                    </span>
                  </button>
                </CarouselItem>
              ))}
            </CarouselContent>
            {images.length > 1 && (
              <>
                <CarouselPrevious className="left-3 hidden bg-white/90 shadow hover:bg-white sm:flex" />
                <CarouselNext className="right-3 hidden bg-white/90 shadow hover:bg-white sm:flex" />
              </>
            )}
          </Carousel>
        ) : (
          <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-(--radius-card,16px) border border-(--ink-100) bg-white font-sans text-sm text-(--ink-500)">
            No image available
          </div>
        )}

        {images && images.length > 1 && (
          <div className="mt-3 flex gap-2 overflow-x-auto">
            {images.map((img, i) => (
              <button
                key={img.id}
                onClick={() => galleryApi?.scrollTo(i)}
                className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-md border-2 ${i === activeImage ? "border-(--blue-600)" : "border-(--ink-100)"
                  }`}
              >
                <Image src={img.url} alt="" fill quality={90} sizes="64px" className="object-cover" />
              </button>
            ))}
          </div>
        )}

        {images && (
          <Lightbox
            open={lightboxOpen}
            index={activeImage}
            close={() => setLightboxOpen(false)}
            slides={images.map((img) => ({ src: img.url, alt: img.alt || product.title }))}
            plugins={[Zoom]}
            zoom={{ maxZoomPixelRatio: 3, doubleTapDelay: 300, doubleClickDelay: 300 }}
            on={{ view: ({ index }) => setActiveImage(index) }}
          />
        )}
      </div>

      {/* Info panel */}
      <div>
        <h1 className="font-display text-2xl font-semibold text-primary sm:text-3xl">{product.title}</h1>

        {product.reviewCount > 0 && (
          <div className="mt-2 flex items-center gap-1.5 font-sans text-sm text-(--ink-700)">
            <span className="flex items-center gap-1 rounded-full bg-(--success,#15803D) px-2 py-0.5 text-xs font-semibold text-white">
              <Star className="h-3 w-3 fill-current" />
              {product.avgRating}
            </span>
            {product.reviewCount} reviews
          </div>
        )}

        {product.shortDescription && (
          <p className="mt-3 font-sans text-sm text-(--ink-700)">{product.shortDescription}</p>
        )}

        <div className="mt-5 flex items-end gap-3">
          <span className="font-heading text-3xl font-semibold text-(--navy-800)">&#8377;{product.price}</span>
          {product.mrp && Number(product.mrp) > Number(product.price) && (
            <>
              <span className="mb-1 font-sans text-sm text-(--ink-500) line-through">&#8377;{product.mrp}</span>
              <span className="mb-1 font-sans text-sm font-semibold text-(--success,#15803D)">
                {Math.round((1 - Number(product.price) / Number(product.mrp)) * 100)}% off
              </span>
            </>
          )}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
          {product.setupTimeMinutes && (
            <div className="flex items-center gap-1.5 font-sans text-sm text-(--ink-500)">
              <Clock className="h-4 w-4" />
              Setup time: {product.setupTimeMinutes} minutes
            </div>
          )}
          <div className="font-sans text-sm text-(--ink-500)">
            Inclusive of all charges{category ? ` · ${category.name}` : ""}
          </div>
        </div>

        {selectedCity && (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-(--radius-card,16px) border border-(--orange-100) bg-(--orange-50) px-4 py-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0 text-(--orange-600)" />
              <div>
                <p className="font-sans text-xs text-(--ink-500)">Serving in</p>
                <p className="font-heading text-sm font-semibold text-(--navy-800)">{selectedCity.name}</p>
              </div>
            </div>
            <CitySelector />
          </div>
        )}

        {product.variants.length > 0 && (
          <div className="mt-6">
            <p className="font-heading text-sm font-semibold text-(--navy-800)">Choose Colors</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {product.variants.map((variant, i) => (
                <button
                  key={variant.id}
                  onClick={() => setActiveVariant(i)}
                  className={`flex items-center gap-2 rounded-full border px-3 py-1.5 font-sans text-xs transition-colors ${i === activeVariant
                    ? "border-(--blue-600) bg-(--surface-alt,#F7F9FC) text-accent"
                    : "border-(--ink-300) text-(--ink-700) hover:border-(--blue-600)"
                    }`}
                >
                  {variant.swatches.length > 0 && (
                    <span className="flex overflow-hidden rounded-full border border-(--ink-100)">
                      {variant.swatches.slice(0, 2).map((color, ci) => (
                        <span key={ci} className="h-3.5 w-3.5" style={{ backgroundColor: color }} />
                      ))}
                    </span>
                  )}
                  {variant.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 hidden gap-3 lg:flex">
          {whatsappNumber && (
            <a
              href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-(--radius-btn,12px) bg-[#25D366] px-6 py-3 font-heading text-sm font-semibold text-white hover:bg-[#20bd5a]"
            >
              <Image src="/whatsapp.png" alt="" width={18} height={18} quality={90} className="h-4.5 w-4.5" />
              WhatsApp
            </a>
          )}
          <button
            onClick={() => setDialogOpen(true)}
            className="flex-1 rounded-(--radius-btn,12px) bg-primary px-10 py-3 font-heading text-base font-semibold text-primary-foreground"
          >
            Book Now
          </button>
        </div>

        <CustomizeOrderDialog
          productId={product.id}
          productTitle={product.title}
          variantId={product.variants[activeVariant]?.id}
          addOns={product.addOns.map((a) => a.addOn)}
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
        />

        {/* Tabs: Included / FAQs / Delivery / Care Info */}
        <div className="mt-8 rounded-(--radius-card,16px) border border-(--ink-100) bg-white">
          <div className="flex flex-wrap gap-2 border-b border-(--ink-100) p-3">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-full px-3.5 py-1.5 font-heading text-sm transition-colors ${activeTab === tab
                  ? "bg-primary text-primary-foreground"
                  : "bg-(--surface-alt,#F7F9FC) text-(--ink-700) hover:text-accent"
                  }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="p-5">
            {activeTab === "Included" && (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {product.inclusions.length > 0 && (
                  <div>
                    <h3 className="font-heading text-sm font-semibold text-(--navy-800)">Included</h3>
                    <ul className="mt-2 flex flex-col gap-1.5">
                      {product.inclusions.map((item) => (
                        <li key={item} className="flex items-start gap-2 font-sans text-sm text-(--ink-700)">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-(--success,#15803D)" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {product.exclusions.length > 0 && (
                  <div>
                    <h3 className="font-heading text-sm font-semibold text-(--navy-800)">Not Included</h3>
                    <ul className="mt-2 flex flex-col gap-1.5">
                      {product.exclusions.map((item) => (
                        <li key={item} className="flex items-start gap-2 font-sans text-sm text-(--ink-700)">
                          <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-(--coral-600)" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {product.inclusions.length === 0 && product.exclusions.length === 0 && (
                  <p className="font-sans text-sm text-(--ink-500)">No details added yet.</p>
                )}
              </div>
            )}

            {activeTab === "FAQs" && (
              <div className="flex flex-col gap-4">
                {product.faqItems.length === 0 && (
                  <p className="font-sans text-sm text-(--ink-500)">No FAQs added yet.</p>
                )}
                {product.faqItems.map((faq) => (
                  <div key={faq.id}>
                    <p className="font-heading text-sm font-semibold text-(--navy-800)">{faq.question}</p>
                    <p className="mt-1 font-sans text-sm text-(--ink-700)">{faq.answer}</p>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "Delivery" && (
              <p className="font-sans text-sm leading-6 text-(--ink-700)">
                {product.deliveryInfo || "Delivery information will be shared during booking confirmation."}
              </p>
            )}

            {activeTab === "Care Info" && (
              <div>
                {product.careInfo.length === 0 ? (
                  <p className="font-sans text-sm text-(--ink-500)">No care instructions added yet.</p>
                ) : (
                  <ol className="flex flex-col gap-2">
                    {product.careInfo.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 font-sans text-sm text-(--ink-700)">
                        <span className="mt-0.5 font-heading text-xs font-semibold text-(--blue-600)">{i + 1}.</span>
                        {item}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            )}
          </div>
        </div>

        {product.description && (
          <div className="mt-8 rounded-(--radius-card,16px) border border-(--ink-100) bg-white p-5">
            <h2 className="font-display text-lg font-semibold text-(--navy-800)">About This Package</h2>
            <div
              className="prose prose-sm mt-2 max-w-none font-sans text-sm leading-6 text-(--ink-700)"
              dangerouslySetInnerHTML={{ __html: product.description }}
            />
          </div>
        )}
      </div>

      {/* Mobile-only fixed bottom action bar: WhatsApp circle + Book Now pill */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-(--ink-100) bg-background px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] lg:hidden">
        {whatsappNumber && (
          <a
            href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Chat on WhatsApp"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-[#25D366] shadow-md"
          >
            <Image src="/whatsapp.png" alt="" width={26} height={26} quality={90} className="h-6.5 w-6.5" />
          </a>
        )}

        <button
          onClick={() => setDialogOpen(true)}
          className="flex flex-1 items-center justify-center gap-2 rounded-md bg-primary py-3 font-heading text-sm font-semibold text-primary-foreground shadow-md"
        >
          Book Now
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
