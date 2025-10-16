import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Globe } from "lucide-react";

import Logo from "@/components/Logo";
import NewsViewer from "@/components/NewsViewer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { extractWords, NewsData, scrapeUrl, updateSpaceContent, upsertSpace } from "@/lib/api";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<SaveStatus, string> = {
  idle: "",
  saving: "Saving…",
  saved: "All changes saved",
  error: "Error saving"
};

type SaveStatus = "idle" | "saving" | "saved" | "error";

type Params = {
  spaceName?: string;
};

const getContentFromDocument = (content: string[] | undefined) => content?.join("\n\n") ?? "";

const toggleButtons = ["≡"] as const;

const SCRAPE_CACHE_KEY = "lingo-scraper-cache-v1";
const SCRAPE_CACHE_TTL = 1000 * 60 * 60 * 12; // 12 hours

type CachedScrapeEntry = {
  data: NewsData;
  timestamp: number;
};

const normalizeCacheKey = (url: string) => url.trim();

const SCRAPE_HISTORY_STORAGE_KEY = "lingo-scraper-history-v1";
const SCRAPE_HISTORY_LIMIT = 100;

const getScrapeHistoryKey = (space: string) => `${SCRAPE_HISTORY_STORAGE_KEY}:${space}`;

const loadScrapeHistory = (space: string): string[] => {
  if (typeof window === "undefined") {
    return [];
  }

  const storageKey = getScrapeHistoryKey(space);

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    const unique = new Set<string>();
    const cleaned: string[] = [];

    for (const entry of parsed) {
      if (typeof entry !== "string") {
        continue;
      }

      const normalized = normalizeCacheKey(entry);

      if (!normalized || unique.has(normalized)) {
        continue;
      }

      unique.add(normalized);
      cleaned.push(normalized);

      if (cleaned.length >= SCRAPE_HISTORY_LIMIT) {
        break;
      }
    }

    return cleaned;
  } catch {
    return [];
  }
};

const saveScrapeHistory = (space: string, history: string[]) => {
  if (typeof window === "undefined") {
    return;
  }

  const storageKey = getScrapeHistoryKey(space);

  try {
    const safe = history.slice(0, SCRAPE_HISTORY_LIMIT);
    window.localStorage.setItem(storageKey, JSON.stringify(safe));
  } catch {
    // Ignore storage write errors (quota exceeded, etc.)
  }
};

const loadScrapeCache = (): Record<string, CachedScrapeEntry> => {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(SCRAPE_CACHE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as Record<string, CachedScrapeEntry> | null;
    if (!parsed || typeof parsed !== "object") {
      return {};
    }

    return parsed;
  } catch {
    return {};
  }
};

const saveScrapeCache = (cache: Record<string, CachedScrapeEntry>) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(SCRAPE_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore storage write errors (quota exceeded, etc.)
  }
};

const getCachedScrape = (url: string): NewsData | null => {
  const key = normalizeCacheKey(url);

  if (!key) {
    return null;
  }

  const cache = loadScrapeCache();
  const entry = cache[key];

  if (!entry) {
    return null;
  }

  if (Date.now() - entry.timestamp > SCRAPE_CACHE_TTL) {
    delete cache[key];
    saveScrapeCache(cache);
    return null;
  }

  return entry.data;
};

const setCachedScrape = (url: string, data: NewsData) => {
  const key = normalizeCacheKey(url);

  if (!key) {
    return;
  }

  const cache = loadScrapeCache();
  cache[key] = {
    data,
    timestamp: Date.now()
  };
  saveScrapeCache(cache);
};

const Space = () => {
  const { spaceName } = useParams<Params>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const lastSyncedRef = useRef("");
  const name = spaceName?.trim();
  const [scrapedData, setScrapedData] = useState<NewsData | null>(null);
  const [scrapeInput, setScrapeInput] = useState("");
  const [fontSizeMultiplier, setFontSizeMultiplier] = useState(1);
  const [isBold, setIsBold] = useState(false);
  const [showLinks, setShowLinks] = useState(true);
  const [scrapeHistory, setScrapeHistory] = useState<string[]>([]);

  useEffect(() => {
    if (!name) {
      navigate("/", { replace: true });
    }
  }, [name, navigate]);

  const spaceQuery = useQuery({
    queryKey: ["space", name],
    queryFn: () => upsertSpace(name!),
    enabled: Boolean(name),
    staleTime: Infinity,
    retry: 1
  });

  useEffect(() => {
    if (!name) {
      return;
    }

    setScrapeHistory(loadScrapeHistory(name));
  }, [name]);

  useEffect(() => {
    if (!name) {
      return;
    }

    saveScrapeHistory(name, scrapeHistory);
  }, [name, scrapeHistory]);

  useEffect(() => {
    if (!spaceQuery.data) {
      return;
    }

    const content = getContentFromDocument(spaceQuery.data.content);

    setDraft((previous) => {
      if (previous === content) {
        return previous;
      }
      return content;
    });

    lastSyncedRef.current = content;
  }, [spaceQuery.data]);

  const mutation = useMutation({
    mutationFn: ({ id, text, words }: { id: string; text: string; words: string[] }) =>
      updateSpaceContent({
        id,
        content: text
          .split(/\n{2,}/)
          .map((block) => block.trim())
          .filter(Boolean),
        words
      }),
    onSuccess: (updated, variables) => {
      queryClient.setQueryData(["space", name], updated);
      lastSyncedRef.current = variables.text;
      setStatus("saved");
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Unknown error";
      setStatus("error");
      toast.error("We couldn’t save your notes", {
        description: message
      });
    }
  });

  useEffect(() => {
    if (!spaceQuery.data) {
      return;
    }

    if (draft === lastSyncedRef.current) {
      return;
    }

    setStatus("saving");

    const handle = window.setTimeout(() => {
      mutation.mutate({
        id: spaceQuery.data._id,
        text: draft,
        words: extractWords(draft)
      });
    }, 900);

    return () => window.clearTimeout(handle);
  }, [draft, mutation, spaceQuery.data]);

  const shareLink = useMemo(() => {
    if (typeof window === "undefined" || !name) {
      return "";
    }

    return `${window.location.origin}/${name}`;
  }, [name]);

  const savedLinks = useMemo(() => {
    const pattern = /(https?:\/\/[^\s]+)/g;
    const matches = draft.match(pattern) ?? [];
    const fromNotes = Array.from(new Set(matches.map(normalizeCacheKey)));
    const unique = new Set<string>();
    const combined: string[] = [];

    for (const url of [...scrapeHistory, ...fromNotes]) {
      const normalized = normalizeCacheKey(url);

      if (!normalized || unique.has(normalized)) {
        continue;
      }

      unique.add(normalized);
      combined.push(normalized);
    }

    return combined;
  }, [draft, scrapeHistory]);

  const savedWords = useMemo(() => spaceQuery.data?.words ?? [], [spaceQuery.data?.words]);

  const recordScrapeHistoryEntry = (url: string) => {
    const normalized = normalizeCacheKey(url);

    if (!normalized) {
      return;
    }

    setScrapeHistory((previous) => {
      const next = [normalized, ...previous.filter((entry) => entry !== normalized)];
      return next.slice(0, SCRAPE_HISTORY_LIMIT);
    });
  };

  const handleScrape = async (targetUrl: string, { showToast = true }: { showToast?: boolean } = {}) => {
    const url = normalizeCacheKey(targetUrl);

    if (!url) {
      return;
    }

    const cached = getCachedScrape(url);

    if (cached) {
      setScrapedData(cached);
      recordScrapeHistoryEntry(url);
      if (showToast) {
        toast.success("Conteúdo carregado do cache!");
      }
      return;
    }

    try {
      const data = await scrapeUrl({ url, space_name: name! });
      setScrapedData(data);
      setCachedScrape(url, data);
      recordScrapeHistoryEntry(url);
      if (showToast) {
        toast.success("Página raspada com sucesso!");
      }
    } catch (error) {
      toast.error("Erro ao raspar: " + (error instanceof Error ? error.message : "Erro desconhecido"));
    }
  };

  if (!name) {
    return null;
  }

  const toggleSidebar = () => setIsSidebarOpen((previous) => !previous);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <header className="flex items-center justify-between border-b-4 border-foreground/60 px-6 py-2 sm:px-10">
        <Link
          to="/"
          className="origin-top-left transform transition duration-300 hover:-translate-y-1 hover:-rotate-1"
          aria-label="Back to home"
        >
          <Logo />
        </Link>
        <div className="flex items-center gap-4 ml-12">
          <div className="sketch-input w-80">
            <Input
              placeholder="start scraping"
              className="h-10 w-full border-0 bg-transparent text-center text-base shadow-none"
              value={scrapeInput}
              onChange={(e) => setScrapeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void handleScrape(scrapeInput, { showToast: false });
                }
              }}
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            className="px-3 hover:bg-foreground/10"
            onClick={() => void handleScrape(scrapeInput)}
          >
            <Globe size={16} />
          </Button>
        </div>
        <div className="space-y-2 text-right">
          <div className="flex items-center gap-4 justify-end">
            <span className="sketch-input px-4 py-2 text-sm uppercase tracking-[0.35em] text-foreground">/{name}</span>
            <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{STATUS_LABELS[status]}</span>
          </div>
          <p className="text-sm text-foreground/70">Your personal space stays private to whoever knows the link.</p>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside
          className={cn(
            "relative z-10 hidden h-full flex-col border-r-4 border-foreground bg-background transition-all duration-500 ease-in-out lg:flex",
            isSidebarOpen ? "w-80" : "w-24"
          )}
        >
          <div className="absolute -right-10 top-1/2 flex -translate-y-1/2 flex-col gap-3">
            {toggleButtons.map((symbol, index) => (
              <button
                key={symbol}
                type="button"
                aria-label="Toggle sidebar"
                onClick={toggleSidebar}
                className="sketch-border sidebar-toggle-frame inline-flex h-12 w-12 items-center justify-center border-2 border-foreground bg-background text-2xl text-foreground transition-transform duration-300 hover:-translate-y-1 hover:rotate-2"
                style={{ transitionDelay: `${index * 40}ms` }}
              >
                {symbol}
              </button>
            ))}
          </div>

          <div className="flex h-full flex-col gap-6 px-6 py-10">
            <div
              className={cn(
                "space-y-2 transition-all duration-300",
                isSidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
              )}
            >
              <h2 className="text-2xl font-bold uppercase tracking-[0.35em]">{showLinks ? "Saved links" : "Saved words"}</h2>
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => setShowLinks((previous) => !previous)}
                  className="relative inline-flex h-10 w-48 items-center rounded-full border-2 border-foreground bg-background px-1 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-foreground/30"
                  aria-label="Toggle between saved links and saved words"
                  aria-pressed={!showLinks}
                >
                  <span
                    className="pointer-events-none absolute top-1 bottom-1 rounded-full bg-foreground transition-all duration-300"
                    style={{ left: showLinks ? "4px" : "calc(50% + 4px)", width: "calc(50% - 8px)" }}
                  />
                  <span
                    className={cn(
                      "relative z-10 flex-1 text-center transition-colors",
                      showLinks ? "text-background" : "text-foreground/70"
                    )}
                  >
                    Links
                  </span>
                  <span
                    className={cn(
                      "relative z-10 flex-1 text-center transition-colors",
                      showLinks ? "text-foreground/70" : "text-background"
                    )}
                  >
                    Words
                  </span>
                </button>
              </div>
              <p className="text-sm text-foreground/70">Quick access to every URL you’ve written.</p>
            </div>

            <div className="relative flex-1 overflow-hidden">
              <div
                className={cn(
                  "absolute inset-0 overflow-y-auto pr-2",
                  isSidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
                )}
              >
                {showLinks ? (
                  savedLinks.length === 0 ? (
                    <p className="text-sm text-foreground/60">
                      Drop any link inside your notes to see it here.
                    </p>
                  ) : (
                    <ul className="space-y-3 text-sm">
                      {savedLinks.map((url) => (
                        <li key={url} className="sketch-border border-2 border-foreground/50 bg-background px-3 py-2 shadow-[6px_6px_0_rgba(0,0,0,0.35)]">
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block truncate text-left text-foreground underline-offset-2 hover:underline"
                            onClick={(e) => {
                              e.preventDefault();
                              void handleScrape(url);
                            }}
                          >
                            {url}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )
                ) : (
                  savedWords.length === 0 ? (
                    <p className="text-sm text-foreground/60">
                      No words found in your notes.
                    </p>
                  ) : (
                    <ul className="space-y-3 text-sm">
                      {savedWords.slice(0, 50).map((word) => (
                        <li key={word} className="sketch-border border-2 border-foreground/50 bg-background px-3 py-2 shadow-[6px_6px_0_rgba(0,0,0,0.35)]">
                          {word}
                        </li>
                      ))}
                    </ul>
                  )
                )}
              </div>
            </div>
          </div>
        </aside>

        <section className={cn("flex flex-1 flex-col overflow-hidden", scrapedData ? "p-0" : "px-6 py-6 sm:px-10 sm:py-10")}>
          {spaceQuery.isPending ? (
            <div className="flex flex-1 items-center justify-center">
              <span className="sketch-border px-6 py-3 text-sm uppercase tracking-[0.3em] text-foreground">Loading space…</span>
            </div>
          ) : spaceQuery.isError ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
              <p className="text-lg text-foreground/70">We couldn’t open this space.</p>
              <Button onClick={() => spaceQuery.refetch()} className="px-8">
                try again
              </Button>
            </div>
          ) : (
            <div className="flex h-full flex-col gap-6 overflow-hidden">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <label className="text-sm" htmlFor="font-size-control">Font size</label>
                  <div className="flex items-center">
                    <button onClick={() => setFontSizeMultiplier(prev => Math.max(0.5, prev - 0.1))} className="sketch-input px-2 py-1 rounded-l" aria-label="Decrease font size">-</button>
                    <input
                      id="font-size-control"
                      type="number"
                      value={fontSizeMultiplier}
                      onChange={(e) => setFontSizeMultiplier(parseFloat(e.target.value) || 1)}
                      className="sketch-input px-2 py-1 w-16 border-l-0 border-r-0"
                      step="0.1"
                      min="0.5"
                      max="3"
                    />
                    <button onClick={() => setFontSizeMultiplier(prev => Math.min(3, prev + 0.1))} className="sketch-input px-2 py-1 rounded-r" aria-label="Increase font size">+</button>
                  </div>
                  <button onClick={() => setIsBold(!isBold)} className={`sketch-input px-2 py-1 ${isBold ? 'bg-foreground text-background' : ''}`}>
                    Bold
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <div className="sketch-input">
                    <Input
                      readOnly
                      value={shareLink}
                      onFocus={(event) => event.currentTarget.select()}
                      className="h-12 cursor-copy border-0 bg-transparent text-center text-base shadow-none"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    className="px-6"
                    onClick={() => {
                      if (!shareLink) {
                        return;
                      }
                      void navigator.clipboard?.writeText(shareLink);
                      toast.success("Link copied to clipboard");
                    }}
                  >
                    copy link
                  </Button>
                </div>
              </div>

              <div className="flex flex-1 flex-col overflow-hidden">
                {scrapedData ? (
                  <NewsViewer data={scrapedData} fontSize={`${fontSizeMultiplier}em`} fontWeight={isBold ? 'bold' : 'normal'} />
                ) : (
                  <div className="flex flex-1 items-center justify-center">
                    <p className="text-lg text-foreground/70">Enter a URL in the header to start scraping and view the content here.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Space;
