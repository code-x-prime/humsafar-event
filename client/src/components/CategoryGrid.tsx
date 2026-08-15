import Link from "next/link";
import Image from "next/image";
import {
  PartyPopper,
  Baby,
  Heart,
  BookOpenText,
  HeartHandshake,
  Wine,
  Gem,
  Sparkles,
  Briefcase,
  Gift,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  PartyPopper,
  Baby,
  Heart,
  BookOpenText,
  HeartHandshake,
  Wine,
  Gem,
  Sparkles,
  Briefcase,
};

export interface HomeCategory {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  icon: string | null;
  _count: { products: number };
}

export function CategoryGrid({ categories }: { categories: HomeCategory[] }) {
  if (categories.length === 0) return null;

  return (
    <section className="border-t border-(--ink-100) bg-(--surface-warm,#FFF9F2) py-10 sm:py-14">
      <div className="mx-auto max-w-7xl px-4">
        <div className="text-center">
          <p className="font-heading text-xs font-semibold uppercase tracking-[.18em] text-(--orange-600)">
            Browse by Category
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold text-(--navy-800) sm:text-3xl">
            Decorations for Every Occasion
          </h2>
          <p className="mx-auto mt-2.5 max-w-md font-sans text-sm text-(--ink-500)">
            Discover decorations for every celebration
          </p>
        </div>

        <div className="mt-9 grid grid-cols-3 gap-4 sm:grid-cols-4 sm:gap-5 md:grid-cols-6 lg:grid-cols-9">
          {categories.map((category) => {
            const Icon = (category.icon && ICONS[category.icon]) || Gift;
            return (
              <Link key={category.id} href={`/category/${category.slug}`} className="group flex flex-col items-center gap-2.5">
                <span className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-3xl border border-(--ink-100) bg-white shadow-[0_2px_8px_rgba(11,22,32,0.05)] transition-all duration-300 group-hover:-translate-y-1.5 group-hover:border-(--orange-200) group-hover:shadow-[0_16px_32px_rgba(14,42,77,0.14)]">
                  {category.image ? (
                    <Image
                      src={category.image}
                      alt={category.name}
                      fill
                      sizes="(max-width: 640px) 96px, 120px"
                      quality={90}
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-(--orange-50) transition-colors duration-300 group-hover:bg-(--orange-100) sm:h-14 sm:w-14">
                      <Icon className="h-6 w-6 text-(--orange-600) sm:h-7 sm:w-7" strokeWidth={1.75} />
                    </span>
                  )}
                </span>
                <span className="flex h-8 items-start justify-center text-center font-heading text-[11px] font-semibold leading-tight text-(--navy-800) transition-colors duration-200 group-hover:text-(--orange-600) sm:h-9 sm:text-xs">
                  <span className="line-clamp-2">{category.name}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
