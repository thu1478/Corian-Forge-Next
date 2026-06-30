import { catalogItemZennyCost } from '@/logic/equipment/item-cost'
import {
  getItemRankPalette,
  resolveItemRank,
  type RulesWithItemRanks,
} from '@/logic/equipment/item-rank-display'

export type CatalogSortKey = 'alphabetical' | 'price' | 'rank'

export const CATALOG_SORT_OPTIONS: { id: CatalogSortKey; label: string }[] = [
  { id: 'alphabetical', label: 'Alphabetical' },
  { id: 'price', label: 'Price' },
  { id: 'rank', label: 'Item rank' },
]

const DEFAULT_RANK_ORDER = [
  'common',
  'intermediate',
  'advanced',
  'masterwork',
] as const

export type CatalogSortEntry = {
  id: string
  def: Record<string, unknown>
}

function itemRankSortIndex(
  rankId: string,
  rules?: RulesWithItemRanks | null,
): number {
  const palette = getItemRankPalette(rules)
  const orderedIds = [
    ...DEFAULT_RANK_ORDER.filter((id) => palette[id] || id === 'common'),
    ...Object.keys(palette).filter(
      (id) => !DEFAULT_RANK_ORDER.includes(id as (typeof DEFAULT_RANK_ORDER)[number]),
    ),
  ]
  const index = orderedIds.indexOf(rankId)
  return index >= 0 ? index : orderedIds.length
}

export function compareCatalogEntries(
  a: CatalogSortEntry,
  b: CatalogSortEntry,
  sort: CatalogSortKey,
  rules?: RulesWithItemRanks | null,
): number {
  switch (sort) {
    case 'price': {
      const diff = catalogItemZennyCost(a.def) - catalogItemZennyCost(b.def)
      if (diff !== 0) return diff
      break
    }
    case 'rank': {
      const rankA = resolveItemRank(
        { rank: typeof a.def.rank === 'string' ? a.def.rank : undefined },
        rules,
      )
      const rankB = resolveItemRank(
        { rank: typeof b.def.rank === 'string' ? b.def.rank : undefined },
        rules,
      )
      const diff = itemRankSortIndex(rankA, rules) - itemRankSortIndex(rankB, rules)
      if (diff !== 0) return diff
      break
    }
    case 'alphabetical':
    default:
      break
  }

  return String(a.def.name ?? a.id).localeCompare(String(b.def.name ?? b.id))
}

export function sortCatalogEntries<T extends CatalogSortEntry>(
  entries: T[],
  sort: CatalogSortKey,
  rules?: RulesWithItemRanks | null,
): T[] {
  return [...entries].sort((a, b) => compareCatalogEntries(a, b, sort, rules))
}
