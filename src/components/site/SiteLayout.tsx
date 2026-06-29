import { Navbar } from "./Navbar";
import { Footer } from "./Footer";

export function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="lk-site">
      <Navbar />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
