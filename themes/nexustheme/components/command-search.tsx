"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import { Command as CommandPrimitive } from "cmdk"
import {
  Activity,
  BadgeDollarSign,
  CreditCard,
  Files,
  House,
  LayoutDashboard,
  Loader2,
  LogIn,
  Mail,
  Package,
  Palette,
  PanelLeft,
  PanelTopOpen,
  Receipt,
  Search,
  Settings,
  Shield,
  SlidersHorizontal,
  UserPlus,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react"
import type { SearchResultItem } from "@skitsaas/sdk"

import { Dialog, DialogContent, DialogTitle } from "./ui/dialog"
import { cn } from "../lib/utils"

const SEARCH_ICON_MAP: Record<string, LucideIcon> = {
  activity: Activity,
  "badge-dollar-sign": BadgeDollarSign,
  "credit-card": CreditCard,
  files: Files,
  house: House,
  "layout-dashboard": LayoutDashboard,
  "log-in": LogIn,
  mail: Mail,
  package: Package,
  palette: Palette,
  "panel-top-open": PanelTopOpen,
  receipt: Receipt,
  search: Search,
  settings: Settings,
  shield: Shield,
  "sliders-horizontal": SlidersHorizontal,
  "user-plus": UserPlus,
  users: Users,
  wallet: Wallet,
}

const Command = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive>
>(({ className, ...props }, ref) => (
  <CommandPrimitive
    ref={ref}
    className={cn(
      "flex h-full w-full flex-col overflow-hidden rounded-xl bg-white text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50",
      className
    )}
    {...props}
  />
))
Command.displayName = CommandPrimitive.displayName

const CommandInput = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Input>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Input
    ref={ref}
    className={cn(
      "flex h-12 w-full border-none border-b border-zinc-200 bg-transparent px-4 py-3 text-[17px] outline-none placeholder:text-zinc-500 dark:border-zinc-800 dark:placeholder:text-zinc-400",
      className
    )}
    {...props}
  />
))
CommandInput.displayName = CommandPrimitive.Input.displayName

const CommandList = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.List
    ref={ref}
    className={cn("max-h-[420px] overflow-y-auto overflow-x-hidden px-2 pb-3 pt-2", className)}
    {...props}
  />
))
CommandList.displayName = CommandPrimitive.List.displayName

const CommandEmpty = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Empty>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Empty
    ref={ref}
    className={cn(
      "flex min-h-24 items-center justify-center text-sm text-zinc-500 dark:text-zinc-400",
      className
    )}
    {...props}
  />
))
CommandEmpty.displayName = CommandPrimitive.Empty.displayName

const CommandGroup = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Group>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Group
    ref={ref}
    className={cn(
      "overflow-hidden px-1 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.18em] [&_[cmdk-group-heading]]:text-zinc-500 dark:[&_[cmdk-group-heading]]:text-zinc-400 [&:not(:first-child)]:mt-2",
      className
    )}
    {...props}
  />
))
CommandGroup.displayName = CommandPrimitive.Group.displayName

const CommandItem = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex min-h-12 cursor-pointer select-none items-start gap-3 rounded-lg px-3 py-3 text-sm text-zinc-700 outline-none transition-colors data-[disabled=true]:pointer-events-none data-[selected=true]:bg-zinc-100 data-[selected=true]:text-zinc-900 dark:text-zinc-300 dark:data-[selected=true]:bg-zinc-800 dark:data-[selected=true]:text-zinc-100 data-[disabled=true]:opacity-50 [&+[cmdk-item]]:mt-1",
      className
    )}
    {...props}
  />
))
CommandItem.displayName = CommandPrimitive.Item.displayName

type SearchResponsePayload = {
  ok: boolean
  data?: {
    query: string
    results: SearchResultItem[]
  }
}

interface CommandSearchProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  placeholder?: string
}

function groupSearchResults(results: SearchResultItem[]) {
  return results.reduce(
    (acc, item) => {
      const key = item.group?.trim() || "Results"
      if (!acc[key]) {
        acc[key] = []
      }
      acc[key].push(item)
      return acc
    },
    {} as Record<string, SearchResultItem[]>
  )
}

function resolveResultIcon(iconName: string | undefined) {
  if (!iconName) {
    return Search
  }

  return SEARCH_ICON_MAP[iconName] ?? Search
}

async function fetchSearchResults({
  query,
  pathname,
  signal,
}: {
  query: string
  pathname: string
  signal: AbortSignal
}) {
  const params = new URLSearchParams()
  params.set("path", pathname || "/")
  params.set("limit", "12")
  if (query.trim()) {
    params.set("q", query.trim())
  }

  const response = await fetch(`/api/search?${params.toString()}`, {
    method: "GET",
    signal,
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(`Search request failed with ${response.status}`)
  }

  const payload = (await response.json()) as SearchResponsePayload
  return payload.data?.results ?? []
}

export function useCommandSearchHotkey(toggle: () => void) {
  React.useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "k" || (!event.metaKey && !event.ctrlKey)) {
        return
      }

      event.preventDefault()
      toggle()
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [toggle])
}

export function CommandSearch({
  open,
  onOpenChange,
  placeholder = "Search pages, settings, modules...",
}: CommandSearchProps) {
  const router = useRouter()
  const pathname = usePathname()
  const commandRef = React.useRef<HTMLDivElement>(null)
  const [query, setQuery] = React.useState("")
  const [results, setResults] = React.useState<SearchResultItem[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const normalizedQuery = query.trim()
  const shouldRenderResultsPanel =
    normalizedQuery.length > 0 || loading || Boolean(error)

  React.useEffect(() => {
    if (!open) {
      return
    }

    if (!normalizedQuery) {
      setResults([])
      setLoading(false)
      setError(null)
      return
    }

    const controller = new AbortController()
    const timeout = window.setTimeout(async () => {
      try {
        setLoading(true)
        setError(null)
        const nextResults = await fetchSearchResults({
          query: normalizedQuery,
          pathname: pathname || "/",
          signal: controller.signal,
        })
        setResults(nextResults)
      } catch (fetchError) {
        if (controller.signal.aborted) {
          return
        }

        setError(fetchError instanceof Error ? fetchError.message : "Search failed")
        setResults([])
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }, query.trim() ? 140 : 0)

    return () => {
      controller.abort()
      window.clearTimeout(timeout)
    }
  }, [normalizedQuery, open, pathname])

  React.useEffect(() => {
    if (open) {
      return
    }

    const timeout = window.setTimeout(() => {
      setQuery("")
      setResults([])
      setError(null)
      setLoading(false)
    }, 120)

    return () => window.clearTimeout(timeout)
  }, [open])

  const groupedItems = React.useMemo(() => groupSearchResults(results), [results])

  const handleSelect = React.useCallback(
    (url: string) => {
      router.push(url)
      onOpenChange(false)

      if (commandRef.current) {
        commandRef.current.style.transform = "scale(0.985)"
        window.setTimeout(() => {
          if (commandRef.current) {
            commandRef.current.style.transform = ""
          }
        }, 110)
      }
    },
    [onOpenChange, router]
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[680px] overflow-hidden border border-zinc-200 p-0 shadow-2xl dark:border-zinc-800">
        <DialogTitle className="sr-only">Search</DialogTitle>
        <Command
          ref={commandRef}
          value={query}
          onValueChange={setQuery}
          className="transition-transform duration-100 ease-out"
        >
          <div className="flex items-center border-b border-zinc-200 px-1 dark:border-zinc-800">
            <Search className="ml-3 h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-400" />
            <CommandInput placeholder={placeholder} autoFocus />
            {loading ? (
              <Loader2 className="mr-4 h-4 w-4 animate-spin text-zinc-500 dark:text-zinc-400" />
            ) : null}
          </div>
          {shouldRenderResultsPanel ? (
            <CommandList>
              {error ? (
                <div className="px-3 py-4 text-sm text-red-500 dark:text-red-400">
                  {error}
                </div>
              ) : null}
              {!loading && !error ? (
                <CommandEmpty>No results found for this query.</CommandEmpty>
              ) : null}
              {Object.entries(groupedItems).map(([group, items]) => (
                <CommandGroup key={group} heading={group}>
                  {items.map((item) => {
                    const Icon = resolveResultIcon(item.icon)

                    return (
                      <CommandItem
                        key={item.id}
                        value={`${item.title} ${item.description ?? ""} ${item.keywords?.join(" ") ?? ""}`}
                        onSelect={() => handleSelect(item.href)}
                      >
                        <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{item.title}</span>
                          {item.description ? (
                            <span className="mt-0.5 block line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">
                              {item.description}
                            </span>
                          ) : null}
                        </span>
                        <span className="hidden shrink-0 rounded-md border border-zinc-200 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-zinc-500 dark:border-zinc-800 dark:text-zinc-400 md:inline-flex">
                          {item.href}
                        </span>
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              ))}
            </CommandList>
          ) : null}
        </Command>
      </DialogContent>
    </Dialog>
  )
}

export function SearchTrigger({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="relative inline-flex h-8 w-full items-center justify-start gap-2 whitespace-nowrap rounded-md border border-input bg-background px-3 py-1 text-sm font-medium text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 sm:pr-12 md:w-36 lg:w-56"
      type="button"
    >
      <Search className="mr-2 h-3.5 w-3.5" />
      <span>Search...</span>
      <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-4 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
        <span className="text-xs">⌘</span>K
      </kbd>
    </button>
  )
}

export function PrivateSearchTrigger({
  label,
  onClick,
}: {
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-9 w-full max-w-sm items-center gap-2 rounded-md border border-border/70 bg-muted/40 px-3 text-left text-xs text-muted-foreground transition-colors hover:bg-muted/60"
    >
      <Search className="h-3.5 w-3.5 shrink-0" />
      <span>{label}</span>
      <span className="ml-auto rounded border border-border/80 px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
        Ctrl K
      </span>
    </button>
  )
}

export function PrivateSearchIconTrigger({
  label,
  onClick,
}: {
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="ml-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground md:hidden"
    >
      <Search className="h-4 w-4" />
    </button>
  )
}

export function PrivateHeaderSearchBlock({
  open,
  onOpenChange,
  label,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  label: string
}) {
  return (
    <>
      <div className="hidden flex-1 md:mx-3 md:flex">
        <PrivateSearchTrigger label={label} onClick={() => onOpenChange(true)} />
      </div>
      <PrivateSearchIconTrigger label={label} onClick={() => onOpenChange(true)} />
      <CommandSearch open={open} onOpenChange={onOpenChange} />
    </>
  )
}

export function HeaderSidebarToggle({
  onClick,
}: {
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border/70 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
    >
      <PanelLeft className="h-4 w-4" />
    </button>
  )
}
