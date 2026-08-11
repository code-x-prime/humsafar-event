// Central query-key factory so every module's TanStack Query hooks share one
// convention instead of hand-rolling array keys per file.
export const qk = {
  cities: {
    all: ['cities'] as const,
    list: (filters?: Record<string, unknown>) => ['cities', 'list', filters] as const,
    detail: (id: string) => ['cities', 'detail', id] as const,
  },
  pincodes: {
    all: ['pincodes'] as const,
    list: (filters?: Record<string, unknown>) => ['pincodes', 'list', filters] as const,
  },
}
