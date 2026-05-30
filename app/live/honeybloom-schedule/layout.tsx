import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Honey Bloom Battle Schedule",
  description: "Today's Honey Bloom Agency battle schedule.",
  openGraph: {
    title: "Honey Bloom Battle Schedule",
    description: "Today's Honey Bloom Agency battle schedule.",
    siteName: "Honey Bloom Agency",
    images: [
      {
        url: "/honeybloom-share.jpg",
        width: 1200,
        height: 630,
        alt: "Honey Bloom Battle Schedule",
      },
    ],
  },
};

export default function HoneyBloomScheduleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}