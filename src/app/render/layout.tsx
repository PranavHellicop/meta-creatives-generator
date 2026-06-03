import { Playfair_Display, Oswald, Poppins } from "next/font/google";

const serif = Playfair_Display({ subsets: ["latin"], weight: ["700", "800"], variable: "--font-serif" });
const condensed = Oswald({ subsets: ["latin"], weight: ["500", "700"], variable: "--font-condensed" });
const geometric = Poppins({ subsets: ["latin"], weight: ["500", "700", "800", "900"], variable: "--font-geometric" });

// Isolated render context: app fonts + no app chrome. Used by both preview and Playwright export.
export default function RenderLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`render-isolate ${serif.variable} ${condensed.variable} ${geometric.variable}`}>
      {children}
    </div>
  );
}
