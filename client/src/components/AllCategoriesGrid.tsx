import Link from "next/link";
import { Gift, ChevronRight } from "lucide-react";

export interface MenuCategory {
  id: string;
  name: string;
  slug: string;
  children: MenuCategory[];
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
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {categories.map((category) => (
        <div key={category.id} className="rounded-2xl border border-(--ink-100) bg-white p-5">
          <Link
            href={`/category/${category.slug}`}
            className="flex items-center gap-3 font-heading text-base font-semibold text-(--navy-800) hover:text-(--orange-600)"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-(--orange-50)">
              <Gift className="h-5 w-5 text-(--orange-600)" strokeWidth={1.75} />
            </span>
            {category.name}
          </Link>

          {category.children.length > 0 && (
            <ul className="mt-3 flex flex-col gap-1.5 border-t border-(--ink-100) pt-3">
              {category.children.map((child) => (
                <li key={child.id}>
                  <Link
                    href={`/category/${child.slug}`}
                    className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 font-sans text-sm text-(--ink-700) hover:bg-(--surface-alt,#F7F9FC) hover:text-(--orange-600)"
                  >
                    {child.name}
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-(--ink-500)" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
