import "./globals.css";
import FavoritesProvider from "@/components/FavoritesProvider";
import ShopDetailProvider from "@/components/ShopDetailProvider";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <FavoritesProvider>
          <ShopDetailProvider>{children}</ShopDetailProvider>
        </FavoritesProvider>
      </body>
    </html>
  );
}
