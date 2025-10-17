import { ReactNode, useCallback, useEffect, useState } from "react";
import { NewsData } from "@/lib/api";

interface NewsViewerProps {
  data: NewsData;
  fontSize: string;
  fontWeight: string;
  onWordClick?: (word: string | null) => void;
  activeNormalizedWord?: string | null;
  translatedWord?: string | null;
  isTranslating?: boolean;
}

const normalizeTokenForTranslation = (token: string) =>
  token
    .replace(/^[^\p{L}\p{N}'-]+/u, "")
    .replace(/[^\p{L}\p{N}'-]+$/u, "")
    .trim();

const NewsViewer = ({
  data,
  fontSize,
  fontWeight,
  onWordClick,
  activeNormalizedWord,
  translatedWord,
  isTranslating
}: NewsViewerProps) => {
  const [selectedWordKey, setSelectedWordKey] = useState<string | null>(null);

  const handleWordSelect = useCallback(
    (wordKey: string, token: string) => {
      if (selectedWordKey === wordKey) {
        setSelectedWordKey(null);
        onWordClick?.(null);
        return;
      }

      setSelectedWordKey(wordKey);

      const normalized = normalizeTokenForTranslation(token);

      if (normalized) {
        onWordClick?.(normalized);
      } else {
        onWordClick?.(null);
      }
    },
    [onWordClick, selectedWordKey]
  );

  useEffect(() => {
    if (!activeNormalizedWord) {
      setSelectedWordKey(null);
    }
  }, [activeNormalizedWord]);

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
              nodes.push(
                <br key={`${keyPrefix}-br-${index}-${segIndex}`} />
              );
            }

            if (segment) {
              nodes.push(
                <span
                  key={`${keyPrefix}-space-${index}-${segIndex}`}
                  style={{ whiteSpace: "pre" }}
                >
                  {segment}
                </span>
              );
            }

            return nodes;
          });
        }

        const tokenKey = `${keyPrefix}-word-${index}`;
        const isActive = selectedWordKey === tokenKey;
        const leadingBoundary = token.match(/^[^\p{L}\p{N}'-]+/u)?.[0] ?? "";
        const trailingBoundary = token.match(/[^\p{L}\p{N}'-]+$/u)?.[0] ?? "";
        const normalizedToken = normalizeTokenForTranslation(token);
        const hasActiveTranslation =
          isActive &&
          Boolean(normalizedToken) &&
          activeNormalizedWord === normalizedToken &&
          Boolean(translatedWord) &&
          !isTranslating;
        const translatedDisplay = hasActiveTranslation
          ? `${leadingBoundary}${translatedWord}${trailingBoundary}`
          : null;

        return (
          <span
            key={tokenKey}
            role="button"
            tabIndex={0}
            aria-pressed={isActive}
            className={`interactive-word${isActive ? " interactive-word--active" : ""}${hasActiveTranslation ? " interactive-word--translated" : ""}${
              isActive && isTranslating ? " interactive-word--loading" : ""
            }`}
            onClick={() => handleWordSelect(tokenKey, token)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                handleWordSelect(tokenKey, token);
              }
            }}
          >
            <span
              className="interactive-word__label"
              data-original={token}
              data-translation-active={hasActiveTranslation ? "true" : undefined}
            >
              {translatedDisplay ?? token}
            </span>
          </span>
        );
      });
    },
    [activeNormalizedWord, handleWordSelect, isTranslating, selectedWordKey, translatedWord]
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
            <article key={index} className="relative border-4 border-foreground bg-gradient-to-br from-foreground/5 to-transparent p-9">
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