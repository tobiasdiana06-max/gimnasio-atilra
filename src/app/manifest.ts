import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/mi-credencial",
    name: "Mi Credencial ATILRA",
    short_name: "ATILRA",
    description: "Credencial digital y servicios para afiliados e invitados del Gimnasio ATILRA.",
    start_url: "/mi-credencial",
    scope: "/",
    display: "standalone",
    background_color: "#f5f7f4",
    theme_color: "#292929",
    icons: [
      { src: "/icons/atilra-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/atilra-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
