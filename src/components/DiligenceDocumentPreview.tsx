import { useEffect, useRef, useState, type UIEvent } from "react";
import { AlertTriangle, FileText } from "lucide-react";

let pdfModulePromise: Promise<any> | null = null;

async function loadPdfModule() {
  if (!pdfModulePromise) {
    pdfModulePromise = Promise.all([
      import("pdfjs-dist/build/pdf.mjs"),
      import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
    ]).then(([pdfjs, worker]) => {
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
      return pdfjs;
    });
  }
  return pdfModulePromise;
}

function looksLikeImage(url: string): boolean {
  return /\.(png|jpe?g|webp)(\?|$)/i.test(url);
}

export function DiligenceDocumentPreview({
  title,
  url,
  version,
  onScrolledToEnd,
}: {
  title: string;
  url: string | null;
  version: string;
  onScrolledToEnd: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const pagesRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const pagesEl = pagesRef.current;
    if (pagesEl) pagesEl.replaceChildren();
    setError(null);
    setPageCount(0);
    if (!url) return;
    if (looksLikeImage(url)) return;

    setLoading(true);
    (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error("Document could not be loaded.");
        const bytes = await res.arrayBuffer();
        const pdfjs = await loadPdfModule();
        const pdf = await pdfjs.getDocument({ data: bytes }).promise;
        if (cancelled) return;
        setPageCount(pdf.numPages);

        const target = pagesRef.current;
        if (!target) return;
        target.replaceChildren();

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          if (cancelled) return;
          const page = await pdf.getPage(pageNumber);
          const viewport = page.getViewport({ scale: 1.35 });
          const wrapper = document.createElement("div");
          wrapper.className = "rounded-md border border-border bg-card p-3 shadow-sm";
          const label = document.createElement("p");
          label.className = "mb-2 text-xs font-medium text-muted-foreground";
          label.textContent = `Page ${pageNumber} of ${pdf.numPages}`;
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          if (!context) throw new Error("Document preview is unavailable in this browser.");
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          canvas.className = "h-auto w-full rounded bg-background";
          wrapper.append(label, canvas);
          target.append(wrapper);
          await page.render({ canvasContext: context, viewport }).promise;
        }
        if (!cancelled) {
          setLoading(false);
          requestAnimationFrame(() => {
            const el = scrollRef.current;
            if (el && el.scrollHeight - el.clientHeight <= 8) onScrolledToEnd();
          });
        }
      } catch (err) {
        if (!cancelled) {
          setLoading(false);
          setError(err instanceof Error ? err.message : "Document preview is unavailable.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [onScrolledToEnd, url, version]);

  function handleScroll(event: UIEvent<HTMLDivElement>) {
    if (loading) return;
    const el = event.currentTarget;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 12) onScrolledToEnd();
  }

  if (!url) {
    return (
      <div className="rounded-lg border border-border bg-background p-6 text-sm text-muted-foreground">
        This document is temporarily unavailable. Please refresh.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background">
      <div className="flex items-center justify-between border-b border-border px-4 py-3 text-xs text-muted-foreground">
        <span className="inline-flex min-w-0 items-center gap-2">
          <FileText className="h-4 w-4 shrink-0" />
          <span className="truncate">{title}</span>
        </span>
        {pageCount > 0 ? <span className="shrink-0">{pageCount} pages</span> : null}
      </div>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="h-[34rem] overflow-y-auto bg-secondary/30 p-4"
      >
        {looksLikeImage(url) ? (
          <img
            src={url}
            alt={title}
            className="mx-auto max-h-none w-full rounded-md border border-border bg-card object-contain shadow-sm"
            onLoad={() => {
              const el = scrollRef.current;
              if (el && el.scrollHeight - el.clientHeight <= 8) onScrolledToEnd();
            }}
          />
        ) : (
          <div ref={pagesRef} className="mx-auto max-w-3xl space-y-4" />
        )}
        {loading ? (
          <div className="flex h-72 items-center justify-center rounded-md border border-border bg-card text-sm text-muted-foreground">
            Rendering document…
          </div>
        ) : null}
        {error ? (
          <div className="flex items-start gap-3 rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-foreground">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <span>{error}</span>
          </div>
        ) : null}
        <p className="py-4 text-center text-xs text-muted-foreground">— end of document —</p>
      </div>
    </div>
  );
}