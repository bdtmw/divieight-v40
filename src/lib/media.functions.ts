import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Signs storage paths in the private `property-media` bucket so browser
 * surfaces (wishlist cards, etc.) can render photos.
 */
export const signPropertyPhotos = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ paths: z.array(z.string()).max(100) }).parse(data))
  .handler(async ({ data }): Promise<Record<string, string>> => {
    if (data.paths.length === 0) return {};
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: signed } = await supabaseAdmin.storage
        .from("property-media")
        .createSignedUrls(data.paths, 60 * 60);
      const out: Record<string, string> = {};
      (signed ?? []).forEach((s) => {
        if (s.path && s.signedUrl) out[s.path] = s.signedUrl;
      });
      return out;
    } catch {
      return {};
    }
  });
