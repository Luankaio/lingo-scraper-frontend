import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { NewsData } from "@/lib/api";

interface NewsViewerProps {
  data: NewsData;
  fontSize: string;
  fontWeight: string;
  fontFamily?: string;
  headlineFontFamily?: string;
  onSelectionChange?: (text: string | null) => void;
  activeSelectionNormalized?: string | null;
  translatedWord?: string | null;
  isTranslating?: boolean;
}

type TokenRecord = {
  key: string;
  token: string;
  normalized: string;
  leading: string;
  trailing: string;
  separatorAfter: string;
};

const normalizeTokenForTranslation = (token: string) =>
  token
    .replace(/^[^\p{L}\p{N}'-]+/u, "")
    .replace(/[^\p{L}\p{N}'-]+$/u, "")
    .trim();

const primaryPointerTypes = new Set(["mouse", "touch", "pen"]);

type Section = NonNullable<NewsData["sections"]>[number];
type SectionBlock = Section["blocks"][number];

type SelectionSnapshot = {
  keys: string[];
  normalized: string | null;
};

const NewsViewer = ({
  data,
  fontSize,
  fontWeight,
  fontFamily,
  headlineFontFamily,
  onSelectionChange,
  activeSelectionNormalized,
  translatedWord,
  isTranslating
}: NewsViewerProps) => {
  const tokenRegistryRef = useRef<{ tokens: TokenRecord[] }>({ tokens: [] });
  const anchorKeyRef = useRef<string | null>(null);
  const pointerSelectingRef = useRef(false);
  const lastSelectionRef = useRef<SelectionSnapshot | null>(null);

  const [selectionKeys, setSelectionKeys] = useState<string[]>([]);
  const [selectionNormalized, setSelectionNormalized] = useState<string | null>(null);
  const [selectionBoundaries, setSelectionBoundaries] = useState<{ leading: string; trailing: string } | null>(null);
  const [selectionOriginalLabel, setSelectionOriginalLabel] = useState<string | null>(null);

  const selectionKeySet = useMemo(() => new Set(selectionKeys), [selectionKeys]);
  const firstSelectionKey = selectionKeys[0] ?? null;
  const effectiveFontFamily = fontFamily ?? "'Patrick Hand', 'Gloria Hallelujah', cursive";
  const effectiveHeadlineFontFamily =
    headlineFontFamily ??
    (fontFamily ? fontFamily : "'Gloria Hallelujah', 'Patrick Hand', cursive");

  tokenRegistryRef.current.tokens = [];

  tokenRegistryRef.current.tokens = [];

  const clearSelection = useCallback(() => {
    setSelectionKeys([]);
    setSelectionNormalized(null);
    setSelectionBoundaries(null);
    setSelectionOriginalLabel(null);
    lastSelectionRef.current = null;
    pointerSelectingRef.current = false;
    anchorKeyRef.current = null;
    onSelectionChange?.(null);
  }, [onSelectionChange]);

  const applySelection = useCallback(
    (startKey: string, endKey: string) => {
      const tokens = tokenRegistryRef.current.tokens;

      if (!tokens.length) {
        return null;
      }

      const startIndex = tokens.findIndex((item) => item.key === startKey);
      const endIndex = tokens.findIndex((item) => item.key === endKey);

      if (startIndex === -1 || endIndex === -1) {
        return null;
      }

      const [from, to] = startIndex <= endIndex ? [startIndex, endIndex] : [endIndex, startIndex];
      const slice = tokens.slice(from, to + 1);
      const keys = slice.map((item) => item.key);

      const normalizedJoined = slice
        .map((item) => item.normalized)
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      const normalizedValue = normalizedJoined.length > 0 ? normalizedJoined : null;
      const firstToken = slice[0];
      const lastToken = slice[slice.length - 1];

      const originalPieces = slice.map((record, index) => {
        const separator = index < slice.length - 1 ? record.separatorAfter : "";
        return `${record.token}${separator}`;
      });
      const originalLabel = originalPieces.join("").trim();

      setSelectionKeys(keys);
      setSelectionNormalized(normalizedValue);
      setSelectionBoundaries(
        slice.length > 0 ? { leading: firstToken?.leading ?? "", trailing: lastToken?.trailing ?? "" } : null
      );
      setSelectionOriginalLabel(originalLabel || null);
      lastSelectionRef.current = {
        keys,
        normalized: normalizedValue
      };

      return lastSelectionRef.current;
    },
    []
  );

  const finalizeSelection = useCallback(() => {
    if (!pointerSelectingRef.current) {
      return;
    }

    pointerSelectingRef.current = false;
    anchorKeyRef.current = null;
    onSelectionChange?.(lastSelectionRef.current?.normalized ?? null);
  }, [onSelectionChange]);

  const handlePointerDown = useCallback(
    (tokenKey: string) => (event: React.PointerEvent<HTMLSpanElement>) => {
      if (!primaryPointerTypes.has(event.pointerType)) {
        return;
      }

      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.focus();

      if (!event.shiftKey && selectionKeys.length === 1 && selectionKeys[0] === tokenKey) {
        clearSelection();
        return;
      }

      const anchorKey = event.shiftKey && selectionKeys.length > 0 ? selectionKeys[0] : tokenKey;

      anchorKeyRef.current = anchorKey;
      pointerSelectingRef.current = true;

      const result = applySelection(anchorKey, tokenKey);

      if (!result) {
        pointerSelectingRef.current = false;
        anchorKeyRef.current = null;
      }
    },
    [applySelection, clearSelection, selectionKeys]
  );

  const handlePointerEnter = useCallback(
    (tokenKey: string) => () => {
      if (!pointerSelectingRef.current || !anchorKeyRef.current) {
        return;
      }

      applySelection(anchorKeyRef.current, tokenKey);
    },
    [applySelection]
  );

  const handleKeySelection = useCallback(
    (tokenKey: string) => {
      const result = applySelection(tokenKey, tokenKey);

      pointerSelectingRef.current = false;
      anchorKeyRef.current = null;

      if (result) {
        onSelectionChange?.(result.normalized);
      } else {
        onSelectionChange?.(null);
      }
    },
    [applySelection, onSelectionChange]
  );

  const registerToken = useCallback((record: TokenRecord) => {
    tokenRegistryRef.current.tokens.push(record);
  }, []);

  const renderInteractiveText = useCallback(
    (text: string, keyPrefix: string): ReactNode[] => {
      type WordSegment = {
        type: "word";
        key: string;
        token: string;
        record: TokenRecord;
      };

      type GapSegment = {
        type: "whitespace";
        key: string;
        value: string;
        prevWordKey: string | null;
        nextWordKey: string | null;
      };

      const rawSegments = text.split(/(\s+)/);
      const segments: Array<WordSegment | GapSegment> = [];
      let wordCounter = 0;
      let lastWordKey: string | null = null;
      let lastWordRecord: TokenRecord | null = null;

      rawSegments.forEach((fragment, fragmentIndex) => {
        if (!fragment.length) {
          return;
        }

        if (/^\s+$/.test(fragment)) {
          const gapSegment: GapSegment = {
            type: "whitespace",
            key: `${keyPrefix}-gap-${fragmentIndex}`,
            value: fragment,
            prevWordKey: lastWordKey,
            nextWordKey: null
          };

          segments.push(gapSegment);

          if (lastWordRecord) {
            lastWordRecord.separatorAfter = fragment;
          }

          return;
        }

        const tokenKey = `${keyPrefix}-word-${wordCounter}`;
        wordCounter += 1;

        const leadingBoundary = fragment.match(/^[^\p{L}\p{N}'-]+/u)?.[0] ?? "";
        const trailingBoundary = fragment.match(/[^\p{L}\p{N}'-]+$/u)?.[0] ?? "";
        const normalizedToken = normalizeTokenForTranslation(fragment);

        const record: TokenRecord = {
          key: tokenKey,
          token: fragment,
          normalized: normalizedToken,
          leading: leadingBoundary,
          trailing: trailingBoundary,
          separatorAfter: ""
        };

        registerToken(record);

        segments.push({
          type: "word",
          key: tokenKey,
          token: fragment,
          record
        });

        lastWordKey = tokenKey;
        lastWordRecord = record;
      });

      for (let index = segments.length - 1, nextWordKey: string | null = null; index >= 0; index -= 1) {
        const segment = segments[index];

        if (segment.type === "word") {
          nextWordKey = segment.key;
        } else {
          segment.nextWordKey = nextWordKey;
        }
      }

      const hasActiveTranslation =
        Boolean(
          selectionNormalized &&
            activeSelectionNormalized &&
            translatedWord &&
            activeSelectionNormalized === selectionNormalized &&
            !isTranslating
        );

      const translationLeading = selectionBoundaries?.leading ?? "";
      const translationTrailing = selectionBoundaries?.trailing ?? "";
      const translationLabel = selectionOriginalLabel ?? selectionNormalized ?? "";

      const nodes: ReactNode[] = [];

      segments.forEach((segment) => {
        if (segment.type === "whitespace") {
          if (
            hasActiveTranslation &&
            segment.prevWordKey &&
            segment.nextWordKey &&
            selectionKeySet.has(segment.prevWordKey) &&
            selectionKeySet.has(segment.nextWordKey)
          ) {
            return;
          }

          const parts = segment.value.split("\n");

          parts.forEach((part, partIndex) => {
            if (partIndex > 0) {
              nodes.push(<br key={`${segment.key}-br-${partIndex}`} />);
            }

            if (part) {
              nodes.push(
                <span key={`${segment.key}-space-${partIndex}`} className="interactive-word__gap">
                  {part}
                </span>
              );
            }
          });

          return;
        }

        const tokenKey = segment.key;
        const isSelected = selectionKeySet.has(tokenKey);
        const isSelectionStart = isSelected && firstSelectionKey === tokenKey;
        const showInlineTranslation = isSelectionStart && hasActiveTranslation;

        if (isSelected && hasActiveTranslation && !isSelectionStart) {
          return;
        }

  const leadingBoundary = segment.record.leading;
  const trailingBoundary = segment.record.trailing;

        const displayValue = showInlineTranslation
          ? `${leadingBoundary}${translatedWord}${trailingBoundary}`
          : segment.token;

        const dataOriginal = showInlineTranslation ? translationLabel || segment.token : segment.token;

        nodes.push(
          <span
            key={tokenKey}
            role="button"
            tabIndex={0}
            aria-pressed={isSelected}
            className={`interactive-word${isSelected ? " interactive-word--active" : ""}${
              showInlineTranslation ? " interactive-word--translated" : ""
            }${isSelected && isTranslating ? " interactive-word--loading" : ""}`}
            onPointerDown={handlePointerDown(tokenKey)}
            onPointerEnter={handlePointerEnter(tokenKey)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                handleKeySelection(tokenKey);
              }

              if (event.key === "Escape") {
                event.preventDefault();
                clearSelection();
              }
            }}
          >
            <span
              className="interactive-word__label"
              data-original={dataOriginal}
              data-translation-active={showInlineTranslation ? "true" : undefined}
            >
              {displayValue}
            </span>
          </span>
        );
      });

      return nodes;
    },
    [
      activeSelectionNormalized,
      clearSelection,
      firstSelectionKey,
      handleKeySelection,
      handlePointerDown,
      handlePointerEnter,
      isTranslating,
      registerToken,
      selectionBoundaries,
      selectionKeySet,
      selectionNormalized,
      selectionOriginalLabel,
      translatedWord
    ]
  );

  useEffect(() => {
    const handlePointerUp = () => finalizeSelection();

    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [finalizeSelection]);

  useEffect(() => {
    clearSelection();
    tokenRegistryRef.current = { tokens: [] };
  }, [clearSelection, data]);

  useEffect(() => {
    const current = lastSelectionRef.current;

    if (!current) {
      return;
    }

    const isSameSelection =
      current.normalized === selectionNormalized &&
      current.keys.length === selectionKeys.length &&
      current.keys.every((key, index) => key === selectionKeys[index]);

    if (isSameSelection) {
      return;
    }

    lastSelectionRef.current = {
      keys: selectionKeys,
      normalized: selectionNormalized
    };
  }, [selectionKeys, selectionNormalized]);

  return (
    <div
      className="h-full overflow-y-auto bg-[#fffef8] border-4 border-foreground shadow-[20px_24px_0_-6px_#111,20px_24px_0_0_#fffef8]"
      style={{ fontFamily: effectiveFontFamily, fontSize, fontWeight }}
    >
      <div className="news-frame">
        <header className="mb-12 flex flex-col gap-6">
          <div className="grid gap-5">
            <h1 style={{ fontFamily: effectiveHeadlineFontFamily, fontSize: "3em", fontWeight: 700 }}>
              {renderInteractiveText(data.title || "Sem título", "headline")}
            </h1>
            <p style={{ fontSize: "1.8em", fontFamily: effectiveFontFamily }}>
              {renderInteractiveText(data.subtitle || "", "subtitle")}
            </p>
            <div
              className="inline-flex items-center gap-2 px-4 py-2 border-2 border-foreground bg-background shadow-[6px_6px_0_0_#111] transform -rotate-1"
              style={{ fontSize: "1em", fontFamily: effectiveFontFamily }}
            >
              Fonte: {data.source_url ? new URL(data.source_url).hostname : "Desconhecida"}
            </div>
          </div>
        </header>
        {data.top_image && (
          <figure className="my-10">
            <img
              src={data.top_image}
              alt={data.title ? `Imagem para ${data.title}` : "Imagem da matéria"}
              className="w-full border-4 border-foreground shadow-[12px_12px_0_0_#111] grayscale"
            />
            <figcaption className="mt-2 text-center" style={{ fontFamily: effectiveFontFamily }}>
              {data.title || ""}
            </figcaption>
          </figure>
        )}
        <section className="grid gap-11">
          {(data.sections ?? []).map((section: Section, index) => (
            <article
              key={index}
              className="relative border-4 border-foreground bg-gradient-to-br from-foreground/5 to-transparent p-9"
            >
              <div className="pointer-events-none absolute inset-3 border-2 border-foreground/10" />
              {section.heading ? (
                <h2 style={{ fontSize: "1.75em", fontFamily: effectiveFontFamily }}>
                  {renderInteractiveText(section.heading, `section-${index}-heading`)}
                </h2>
              ) : null}
              {(section.blocks ?? []).map((block: SectionBlock, bIndex) => {
                if (block.type === "paragraph") {
                  return (
                    <p key={bIndex} style={{ fontSize: "1.25em", fontFamily: effectiveFontFamily }}>
                      {renderInteractiveText(block.text ?? "", `section-${index}-paragraph-${bIndex}`)}
                    </p>
                  );
                }

                if (block.type === "list") {
                  return (
                    <ul key={bIndex} className="list-none p-0 my-4">
                      {(block.items ?? []).map((item: string, iIndex) => (
                        <li
                          key={iIndex}
                          className="relative mb-3 pl-8"
                          style={{ fontSize: "1.25em", fontFamily: effectiveFontFamily }}
                        >
                          <span className="absolute left-2 top-0" style={{ fontSize: "1em", fontFamily: effectiveFontFamily }}>
                            ✦
                          </span>
                          {renderInteractiveText(item ?? "", `section-${index}-list-${bIndex}-${iIndex}`)}
                        </li>
                      ))}
                    </ul>
                  );
                }

                return null;
              })}
            </article>
          ))}
        </section>
      </div>
    </div>
  );
};

export default NewsViewer;