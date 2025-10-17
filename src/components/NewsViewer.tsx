import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { NewsData } from "@/lib/api";

interface NewsViewerProps {
  data: NewsData;
  fontSize: string;
  fontWeight: string;
  onSelectionChange?: (text: string | null) => void;
  activeSelectionNormalized?: string | null;
  translatedWord?: string | null;
  isTranslating?: boolean;
}

const normalizeTokenForTranslation = (token: string) =>
  token
    .replace(/^[^\p{L}\p{N}'-]+/u, "")
    .replace(/[^\p{L}\p{N}'-]+$/u, "")
    .trim();

type TokenRecord = {
  key: string;
  token: string;
  normalized: string;
  leading: string;
  trailing: string;
};

const primaryPointerTypes = new Set(["mouse", "touch", "pen"]);

const NewsViewer = ({
  data,
  fontSize,
  fontWeight,
  onSelectionChange,
  activeSelectionNormalized,
  translatedWord,
  isTranslating
}: NewsViewerProps) => {
  const tokenRegistryRef = useRef<{ tokens: TokenRecord[] }>({ tokens: [] });
  const [selectionKeys, setSelectionKeys] = useState<string[]>([]);
  const [selectionNormalized, setSelectionNormalized] = useState<string | null>(null);
  const anchorKeyRef = useRef<string | null>(null);
  const pointerSelectingRef = useRef(false);
  const lastSelectionRef = useRef<{ keys: string[]; normalized: string | null } | null>(null);

  const selectionKeySet = useMemo(() => new Set(selectionKeys), [selectionKeys]);
  const firstSelectionKey = selectionKeys[0] ?? null;
  const isSingleSelection = selectionKeys.length === 1;

  tokenRegistryRef.current.tokens = [];

  const applySelection = useCallback((startKey: string, endKey: string) => {
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

    setSelectionKeys(keys);
    setSelectionNormalized(normalizedValue);
    lastSelectionRef.current = {
      keys,
      normalized: normalizedValue
    };

    return lastSelectionRef.current;
  }, []);

  const clearSelection = useCallback(() => {
    setSelectionKeys([]);
    setSelectionNormalized(null);
    lastSelectionRef.current = null;
    pointerSelectingRef.current = false;
    anchorKeyRef.current = null;
    onSelectionChange?.(null);
  }, [onSelectionChange]);

  const finalizeSelection = useCallback(() => {
    if (!pointerSelectingRef.current) {
      return;
    }

    pointerSelectingRef.current = false;
    anchorKeyRef.current = null;
    onSelectionChange?.(lastSelectionRef.current?.normalized ?? null);
  }, [onSelectionChange]);

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
  }, [clearSelection, data]);

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

  const renderInteractiveText = useCallback(
    (text: string, keyPrefix: string): ReactNode[] => {
      const tokens = text.split(/(\s+)/);

      return tokens.flatMap((token, index) => {
        if (!token.length) {
          return [];
        }

        if (/^\s+$/.test(token)) {
          return token.split("\n").flatMap((segment, segIndex) => {
            const nodes: ReactNode[] = [];

            if (segIndex > 0) {
              nodes.push(<br key={`${keyPrefix}-br-${index}-${segIndex}`} />);
            }

            if (segment) {
              nodes.push(
                <span key={`${keyPrefix}-space-${index}-${segIndex}`} className="interactive-word__gap">
                  {segment}
                </span>
              );
            }

            return nodes;
          });
        }

        const tokenKey = `${keyPrefix}-word-${index}`;
        const leadingBoundary = token.match(/^[^\p{L}\p{N}'-]+/u)?.[0] ?? "";
        const trailingBoundary = token.match(/[^\p{L}\p{N}'-]+$/u)?.[0] ?? "";
        const normalizedToken = normalizeTokenForTranslation(token);

        tokenRegistryRef.current.tokens.push({
          key: tokenKey,
          token,
          normalized: normalizedToken,
          leading: leadingBoundary,
          trailing: trailingBoundary
        });

        const isSelected = selectionKeySet.has(tokenKey);
        const isSelectionStart = isSelected && firstSelectionKey === tokenKey;
        const showInlineTranslation =
          isSelected &&
          isSelectionStart &&
          isSingleSelection &&
          Boolean(translatedWord) &&
          !isTranslating &&
          selectionNormalized &&
          activeSelectionNormalized &&
          activeSelectionNormalized === selectionNormalized;

        const displayValue = showInlineTranslation
          ? `${leadingBoundary}${translatedWord}${trailingBoundary}`
          : token;

        return (
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
              data-original={token}
              data-translation-active={showInlineTranslation ? "true" : undefined}
            >
              {displayValue}
            </span>
          </span>
        );
      });
    },
    [
      activeSelectionNormalized,
      clearSelection,
      handleKeySelection,
      handlePointerDown,
      handlePointerEnter,
      isSingleSelection,
      isTranslating,
      selectionKeySet,
      selectionNormalized,
      translatedWord,
      firstSelectionKey
    ]
  );

  return (
    <div
      className="h-full overflow-y-auto bg-[#fffef8] border-4 border-foreground shadow-[20px_24px_0_-6px_#111,20px_24px_0_0_#fffef8]"
      style={{ fontFamily: "'Patrick Hand', cursive", fontSize, fontWeight }}
    >
      <div className="news-frame">
        <header className="mb-12 flex flex-col gap-6">
          <div className="grid gap-5">
            <h1 style={{ fontFamily: "'Gloria Hallelujah', cursive", fontSize: "3em", fontWeight: 700 }}>
              {renderInteractiveText(data.title || "Sem título", "headline")}
            </h1>
            <p style={{ fontSize: "1.8em" }}>
              {renderInteractiveText(data.subtitle || "", "subtitle")}
            </p>
            <div
              className="inline-flex items-center gap-2 px-4 py-2 border-2 border-foreground bg-background shadow-[6px_6px_0_0_#111] transform -rotate-1"
              style={{ fontSize: "1em" }}
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
            <figcaption className="mt-2 text-center">{data.title || ""}</figcaption>
          </figure>
        )}
        <section className="grid gap-11">
          {(data.sections || []).map((section, index) => (
            <article
              key={index}
              className="relative border-4 border-foreground bg-gradient-to-br from-foreground/5 to-transparent p-9"
            >
              <div className="pointer-events-none absolute inset-3 border-2 border-foreground/10"></div>
              {section.heading ? (
                <h2 style={{ fontSize: "1.75em" }}>
                  {renderInteractiveText(section.heading, `section-${index}-heading`)}
                </h2>
              ) : null}
              {(section.blocks || []).map((block, bIndex) => {
                if (block.type === "paragraph") {
                  return (
                    <p key={bIndex} style={{ fontSize: "1.25em" }}>
                      {renderInteractiveText(block.text || "", `section-${index}-paragraph-${bIndex}`)}
                    </p>
                  );
                }
                if (block.type === "list") {
                  return (
                    <ul key={bIndex} className="list-none p-0 my-4">
                      {(block.items || []).map((item, iIndex) => (
                        <li key={iIndex} className="relative mb-3 pl-8" style={{ fontSize: "1.25em" }}>
                          <span className="absolute left-2 top-0" style={{ fontSize: "1em" }}>
                            ✦
                          </span>
                          {renderInteractiveText(item || "", `section-${index}-list-${bIndex}-${iIndex}`)}
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