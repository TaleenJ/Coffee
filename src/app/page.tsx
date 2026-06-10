import BottomNav from "@/components/BottomNav";

export default function HomePage() {
  return (
    <div className="page">
      <main className="scroll-area" aria-label="Main content">
        <div className="scroll-spacer" />
      </main>

      <BottomNav active="nearby" />
    </div>
  );
}
