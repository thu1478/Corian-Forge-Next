'use client'

import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  CATALOG_SORT_OPTIONS,
  type CatalogSortKey,
} from '@/logic/equipment/catalog-sort'
import { cn } from '@/lib/utils'

type CatalogSortSelectProps = {
  id?: string
  value: CatalogSortKey
  onChange: (value: CatalogSortKey) => void
  className?: string
  label?: string
  hideLabel?: boolean
}

export function CatalogSortSelect({
  id = 'catalog-sort',
  value,
  onChange,
  className,
  label = 'Sort by',
  hideLabel = false,
}: CatalogSortSelectProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {hideLabel ? (
        <Label htmlFor={id} className="sr-only">
          {label}
        </Label>
      ) : (
        <Label htmlFor={id}>{label}</Label>
      )}
      <Select value={value} onValueChange={(next) => onChange(next as CatalogSortKey)}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CATALOG_SORT_OPTIONS.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
