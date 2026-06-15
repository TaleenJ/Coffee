"use client";

import { ALL_VIBES, Vibe } from "@/lib/coffeeShops";

type FilterSheetProps = {
    open: boolean;
    selected: Vibe[];
    onToggleVibe: (vibe: Vibe) => void;
    onClear: () => void;
    onClose: () => void;
};

export default function FilterSheet({
    open,
    selected,
    onToggleVibe,
    onClear,
    onClose,
}: FilterSheetProps) {
    if (!open) return null;

    return (
        <div className="filter-overlay" onClick={onClose}>
            <div className="filter-sheet" onClick={(e) => e.stopPropagation()}>
                <div className="filter-header">
                    <h2 className="filter-title">Vibe</h2>
                    <button className="filter-close" onClick={onClose} aria-label="Close filters">
                        ✕
                    </button>
                </div>

                <div className="filter-options">
                    {ALL_VIBES.map((vibe) => {
                        const isActive = selected.includes(vibe);
                        return (
                            <button
                                key={vibe}
                                type="button"
                                className={`filter-chip${isActive ? " filter-chip-active" : ""}`}
                                onClick={() => onToggleVibe(vibe)}
                            >
                                {vibe}
                            </button>
                        );
                    })}
                </div>

                <div className="filter-actions">
                    <button type="button" className="filter-clear" onClick={onClear}>
                        Clear
                    </button>
                    <button type="button" className="filter-apply" onClick={onClose}>
                        Show results
                    </button>
                </div>
            </div>
        </div>
    );
}