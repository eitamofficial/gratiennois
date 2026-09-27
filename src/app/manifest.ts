import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Wiki du IIIe Delphinat de Gratianopolis",
    short_name: "Gratianopolis",
    description:
      "Encyclopédie officielle du IIIe Delphinat de Gratianopolis : Constitution, institutions et personnalités.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a1322",
    theme_color: "#0a1322",
    lang: "fr",
    categories: ["education", "reference"],
    icons: [
      { src: "/flag-192.png", sizes: "192x192", type: "image/png" },
      { src: "/flag-512.png", sizes: "512x512", type: "image/png" },
      { src: "/flag-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
