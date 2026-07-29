import { useEffect, useRef } from "react";
import type { Map as LeafletMap, LayerGroup } from "leaflet";

export interface MapPin {
  id: string;
  lat: number;
  lng: number;
  title: string;
  subtitle: string;
  dimmed?: boolean;
}

/**
 * Leaflet is browser-only: the library is imported dynamically inside an
 * effect so it never runs during SSR.
 */
export function PropertyMap({
  pins,
  onSelect,
  className,
}: {
  pins: MapPin[];
  onSelect?: (id: string) => void;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<LayerGroup | null>(null);
  const pinsRef = useRef(pins);
  const selectRef = useRef(onSelect);
  pinsRef.current = pins;
  selectRef.current = onSelect;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, { scrollWheelZoom: false }).setView(
        [39.5, -98.35],
        4,
      );
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 18,
      }).addTo(map);

      mapRef.current = map;
      layerRef.current = L.layerGroup().addTo(map);
      render(L);
    })();

    function render(L: typeof import("leaflet")) {
      const map = mapRef.current;
      const layer = layerRef.current;
      if (!map || !layer) return;
      layer.clearLayers();

      const current = pinsRef.current;
      current.forEach((p) => {
        const marker = L.circleMarker([p.lat, p.lng], {
          radius: 9,
          weight: 2,
          color: p.dimmed ? "#94a3b8" : "#0f2c4a",
          fillColor: p.dimmed ? "#cbd5e1" : "#46ACB4",
          fillOpacity: 0.9,
        });
        marker.bindTooltip(`<strong>${p.title}</strong><br/>${p.subtitle}`);
        marker.on("click", () => selectRef.current?.(p.id));
        marker.addTo(layer);
      });

      if (current.length > 0) {
        map.fitBounds(
          L.latLngBounds(current.map((p) => [p.lat, p.lng] as [number, number])),
          { padding: [40, 40], maxZoom: 12 },
        );
      }
      map.invalidateSize();
    }

    // Re-render pins whenever they change while the map is alive.
    const id = window.setInterval(async () => {
      if (!mapRef.current) return;
      const L = (await import("leaflet")).default;
      render(L);
      window.clearInterval(id);
    }, 0);

    return () => {
      cancelled = true;
      window.clearInterval(id);
      mapRef.current?.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, [pins]);

  return <div ref={containerRef} className={className} />;
}
