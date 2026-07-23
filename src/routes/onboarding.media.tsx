import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { OnboardingStepper } from "@/components/OnboardingStepper";
import { cn } from "@/lib/utils";
import { logAudit } from "@/lib/audit";

export const Route = createFileRoute("/onboarding/media")({
  head: () => ({
    meta: [
      { title: "Add photos & media — divieight" },
      { name: "description", content: "Upload photos and a virtual tour narrative for your fractional listing." },
    ],
  }),
  component: MediaScreen,
});

const MIN_IMAGES = 5;
const MAX_IMAGES = 25;
const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

type Item = {
  key: string;
  file: File;
  previewUrl: string;
  progress: number; // 0-100
  status: "queued" | "uploading" | "done" | "error";
  error?: string;
  storagePath?: string;
  caption: string;
};

function randomId() {
  return Math.random().toString(36).slice(2, 10);
}

function MediaScreen() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [loadingProperty, setLoadingProperty] = useState(true);

  const [items, setItems] = useState<Item[]>([]);
  const [narrative, setNarrative] = useState("");
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const dragIndex = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    (async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error || !data) {
        toast.error("Couldn't find your property. Please complete the previous step first.");
        navigate({ to: "/onboarding/property" });
        return;
      }
      setPropertyId(data.id);
      setLoadingProperty(false);
    })();
  }, [user, loading, navigate]);

  useEffect(() => {
    return () => {
      items.forEach((i) => URL.revokeObjectURL(i.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const uploadOne = useCallback(
    async (item: Item, pid: string) => {
      // Approximate progress ticker while the upload is in-flight; Supabase JS v2
      // does not expose upload progress events for storage.upload().
      let progress = 5;
      setItems((prev) => prev.map((p) => (p.key === item.key ? { ...p, status: "uploading", progress } : p)));
      const ticker = setInterval(() => {
        progress = Math.min(90, progress + Math.max(2, (90 - progress) * 0.15));
        setItems((prev) => prev.map((p) => (p.key === item.key ? { ...p, progress } : p)));
      }, 200);

      const ext = item.file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${pid}/${randomId()}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("property-media")
        .upload(path, item.file, { contentType: item.file.type, upsert: false });

      clearInterval(ticker);
      if (error) {
        setItems((prev) =>
          prev.map((p) =>
            p.key === item.key ? { ...p, status: "error", progress: 0, error: error.message } : p,
          ),
        );
        return;
      }
      setItems((prev) =>
        prev.map((p) =>
          p.key === item.key ? { ...p, status: "done", progress: 100, storagePath: path } : p,
        ),
      );
    },
    [],
  );

  const addFiles = useCallback(
    (fileList: FileList | File[]) => {
      if (!propertyId) return;
      const incoming = Array.from(fileList);
      const currentCount = items.length;
      const remainingSlots = MAX_IMAGES - currentCount;
      if (remainingSlots <= 0) {
        toast.error(`You can upload up to ${MAX_IMAGES} photos.`);
        return;
      }

      const accepted: Item[] = [];
      for (const file of incoming.slice(0, remainingSlots)) {
        if (!ACCEPTED.includes(file.type)) {
          toast.error(`${file.name}: only JPG, PNG, or WEBP allowed.`);
          continue;
        }
        if (file.size > MAX_BYTES) {
          toast.error(`${file.name}: exceeds 10MB limit.`);
          continue;
        }
        accepted.push({
          key: randomId(),
          file,
          previewUrl: URL.createObjectURL(file),
          progress: 0,
          status: "queued",
          caption: "",
        });
      }

      if (incoming.length > remainingSlots) {
        toast.error(`Only added ${remainingSlots} of ${incoming.length} files (max ${MAX_IMAGES}).`);
      }

      if (accepted.length === 0) return;
      setItems((prev) => [...prev, ...accepted]);
      accepted.forEach((it) => void uploadOne(it, propertyId));
    },
    [items.length, propertyId, uploadOne],
  );

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDraggingFile(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  }

  function removeItem(key: string) {
    setItems((prev) => {
      const found = prev.find((p) => p.key === key);
      if (found) URL.revokeObjectURL(found.previewUrl);
      return prev.filter((p) => p.key !== key);
    });
  }

  function updateCaption(key: string, caption: string) {
    setItems((prev) => prev.map((p) => (p.key === key ? { ...p, caption } : p)));
  }

  function onItemDragStart(idx: number) {
    dragIndex.current = idx;
  }
  function onItemDragOver(e: React.DragEvent, idx: number) {
    if (dragIndex.current === null || dragIndex.current === idx) return;
    e.preventDefault();
  }
  function onItemDrop(idx: number) {
    const from = dragIndex.current;
    dragIndex.current = null;
    if (from === null || from === idx) return;
    setItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(idx, 0, moved);
      return next;
    });
  }

  const uploadedCount = items.filter((i) => i.status === "done").length;
  const anyUploading = items.some((i) => i.status === "uploading" || i.status === "queued");
  const canSubmit = uploadedCount >= MIN_IMAGES && !anyUploading && !submitting && !!propertyId;

  async function handleSubmit() {
    if (!propertyId) return;
    if (uploadedCount < MIN_IMAGES) {
      toast.error(`Please upload at least ${MIN_IMAGES} photos.`);
      return;
    }
    if (anyUploading) {
      toast.error("Please wait for uploads to finish.");
      return;
    }
    setSubmitting(true);

    type MediaInsert = {
      property_id: string;
      url: string | null;
      caption: string | null;
      display_order: number;
      media_type: string;
      narrative?: string | null;
    };
    const photoRows: MediaInsert[] = items
      .filter((i) => i.status === "done" && i.storagePath)
      .map((i, idx) => ({
        property_id: propertyId,
        url: i.storagePath!,
        caption: i.caption.trim() || null,
        display_order: idx,
        media_type: "photo",
      }));

    const rows: MediaInsert[] = [...photoRows];
    const narrativeTrimmed = narrative.trim();
    if (narrativeTrimmed) {
      rows.push({
        property_id: propertyId,
        url: null,
        caption: null,
        display_order: photoRows.length,
        media_type: "virtual_tour",
        narrative: narrativeTrimmed,
      });
    }

    const { error: insertErr } = await supabase.from("property_media").insert(rows);
    if (insertErr) {
      setSubmitting(false);
      toast.error(insertErr.message);
      return;
    }

    const { error: updateErr } = await supabase
      .from("properties")
      .update({ status: "pending_review" })
      .eq("id", propertyId);

    setSubmitting(false);
    if (updateErr) {
      toast.error(updateErr.message);
      return;
    }
    await logAudit({
      actorId: user!.id,
      actionType: "seller.property_media_uploaded",
      entityType: "property",
      entityId: propertyId,
      metadata: { photo_count: photoRows.length, has_narrative: Boolean(narrativeTrimmed) },
    });
    toast.success("Media saved. Listing moved to review.");
    navigate({ to: "/onboarding/agreement" });
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <OnboardingStepper current={4} />

      <div className="mt-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
          Step 4 · Media
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Add photos & media
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          Upload at least {MIN_IMAGES} photos (up to {MAX_IMAGES}). Drag to reorder — the first
          photo is your cover image.
        </p>
      </div>

      {loadingProperty ? (
        <div className="mt-10 rounded-xl border border-dashed border-border bg-card/50 p-10 text-center text-sm text-muted-foreground">
          Loading your property…
        </div>
      ) : (
        <div className="mt-10 space-y-8">
          {/* Dropzone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingFile(true);
            }}
            onDragLeave={() => setIsDraggingFile(false)}
            onDrop={onDrop}
            className={cn(
              "flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition-colors",
              isDraggingFile
                ? "border-accent bg-accent/10"
                : "border-border bg-card/50 hover:border-accent/60",
            )}
          >
            <p className="font-display text-lg font-semibold text-foreground">
              Drag & drop your photos here
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              JPG, PNG, or WEBP · up to 10MB each · {items.length}/{MAX_IMAGES} added
            </p>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="mt-4 inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              Browse files
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              hidden
              onChange={(e) => {
                if (e.target.files?.length) addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>

          {/* Grid */}
          {items.length > 0 ? (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item, idx) => (
                <li
                  key={item.key}
                  draggable
                  onDragStart={() => onItemDragStart(idx)}
                  onDragOver={(e) => onItemDragOver(e, idx)}
                  onDrop={() => onItemDrop(idx)}
                  className="group relative overflow-hidden rounded-xl border border-border bg-card shadow-sm"
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
                    <img
                      src={item.previewUrl}
                      alt={item.caption || item.file.name}
                      className="h-full w-full object-cover"
                      draggable={false}
                    />
                    <div className="absolute left-2 top-2 flex items-center gap-2">
                      <span className="rounded-full bg-primary/90 px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
                        #{idx + 1}
                      </span>
                      {idx === 0 ? (
                        <span className="rounded-full bg-accent/95 px-2 py-0.5 text-[11px] font-semibold text-accent-foreground">
                          Cover
                        </span>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.key)}
                      className="absolute right-2 top-2 rounded-full bg-background/95 px-2 py-0.5 text-[11px] font-medium text-foreground shadow-sm hover:bg-background"
                      aria-label="Remove"
                    >
                      Remove
                    </button>
                    {item.status !== "done" ? (
                      <div className="absolute inset-x-0 bottom-0 h-1.5 bg-background/60">
                        <div
                          className={cn(
                            "h-full transition-all",
                            item.status === "error" ? "bg-destructive" : "bg-accent",
                          )}
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                    ) : null}
                  </div>
                  <div className="space-y-2 p-3">
                    <input
                      type="text"
                      value={item.caption}
                      onChange={(e) => updateCaption(item.key, e.target.value)}
                      placeholder="Optional caption"
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      {item.status === "uploading" && `Uploading… ${Math.round(item.progress)}%`}
                      {item.status === "queued" && "Queued…"}
                      {item.status === "done" && "Uploaded"}
                      {item.status === "error" && (item.error || "Upload failed")}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}

          {/* Virtual tour narrative */}
          <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-display text-lg font-semibold text-foreground">
              Virtual tour narrative
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Optional. Walk buyers through the property in your own words — we'll pair it with
              your photos on the listing.
            </p>
            <textarea
              value={narrative}
              onChange={(e) => setNarrative(e.target.value)}
              rows={5}
              placeholder="Start at the front entry, describe the flow of the main living areas, highlight views and outdoor spaces…"
              className="mt-4 w-full rounded-md border border-input bg-background p-3 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
            />
          </section>

          {/* Footer */}
          <div className="flex flex-col-reverse items-stretch justify-between gap-3 sm:flex-row sm:items-center">
            <p className="text-sm text-muted-foreground">
              {uploadedCount} of at least {MIN_IMAGES} photos uploaded
              {anyUploading ? " · uploads in progress…" : ""}
            </p>
            <button
              type="button"
              disabled={!canSubmit}
              onClick={handleSubmit}
              className={cn(
                "inline-flex h-11 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow-sm transition-colors",
                canSubmit ? "hover:bg-primary/90" : "cursor-not-allowed opacity-60",
              )}
            >
              {submitting ? "Submitting…" : "Continue to agreement"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
