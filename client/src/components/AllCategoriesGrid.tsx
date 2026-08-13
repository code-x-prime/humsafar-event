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

export interface MenuCategory {
  id: string;
  name: string;
  slug: string;
  image?: string | null;
  icon?: string | null;
  children: MenuCategory[];
}

function CategoryCard({ category }: { category: MenuCategory }) {
  const Icon = (category.icon && ICONS[category.icon]) || Gift;

  return (
    <Link
      href={`/category/${category.slug}`}
      className="group flex flex-col items-center gap-2.5"
    >
      <span className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-3xl border border-(--ink-100) bg-white shadow-[0_2px_8px_rgba(11,22,32,0.05)] transition-all duration-300 group-hover:-translate-y-1.5 group-hover:border-(--orange-200) group-hover:shadow-[0_16px_32px_rgba(14,42,77,0.14)]">
        {category.image ? (
          <Image
            src={category.image}
            alt={category.name}
            fill
            sizes="(max-width: 640px) 96px, 160px"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-(--orange-50) transition-colors duration-300 group-hover:bg-(--orange-100) sm:h-14 sm:w-14">
            <Icon className="h-6 w-6 text-(--orange-600) sm:h-7 sm:w-7" strokeWidth={1.75} />
          </span>
        )}
      </span>
      <span className="flex min-h-8 items-start justify-center text-center font-heading text-[11px] font-semibold leading-tight text-(--navy-800) transition-colors duration-200 group-hover:text-(--orange-600) sm:min-h-9 sm:text-xs">
        <span className="line-clamp-2">{category.name}</span>
      </span>
    </Link>
  );
}

export function AllCategoriesGrid({ categories }: { categories: MenuCategory[] }) {
  if (categories.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-(--ink-100) py-12 text-center font-sans text-sm text-(--ink-500)">
        No categories available right now.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      {categories.map((category) => (
        <section key={category.id}>
          <div className="mb-4 flex items-center gap-2">
            <h2 className="font-display text-lg font-semibold text-(--navy-800) sm:text-xl">
              <Link href={`/category/${category.slug}`} className="hover:text-(--orange-600)">
                {category.name}
              </Link>
            </h2>
          </div>

          <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 sm:gap-5 md:grid-cols-6 lg:grid-cols-8">
            {category.children.length > 0 ? (
              category.children.map((child) => <CategoryCard key={child.id} category={child} />)
            ) : (
              <CategoryCard category={category} />
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
