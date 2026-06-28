"use client";

import { ALL_VIBES, Vibe } from "@/lib/coffeeShops";
import { DEMO_MENU } from "@/lib/menu";

type FilterSheetProps = {
    open: boolean;
    selected: Vibe[];
    selectedDrinks: string[];
    veganOnly: boolean;
    promoOnly: boolean;
    hideChains: boolean;
    onToggleVibe: (vibe: Vibe) => void;
    onToggleDrink: (drinkId: string) => void;
    onToggleVegan: () => void;
    onTogglePromo: () => void;
    onToggleHideChains: () => void;
    onClear: () => void;
    onClose: () => void;
};

export default function FilterSheet({
    open,
    selected,
    selectedDrinks,
    veganOnly,
    promoOnly,
    hideChains,
    onToggleVibe,
    onToggleDrink,
    onToggleVegan,
    onTogglePromo,
    onToggleHideChains,
    onClear,
    onClose,
}: FilterSheetProps) {
    if (!open) return null;

    return (
        <div className="filter-overlay" onClick={onClose}>
            <div className="filter-sheet" onClick={(e) => e.stopPropagation()}>
                <div className="filter-header">
                    <h2 className="filter-title">Filters</h2>
                    <button className="filter-close" onClick={onClose} aria-label="Close filters">
                        ✕
                    </button>
                </div>

                <h3 className="filter-group-title">Drinks</h3>
                <div className="filter-options">
                    {DEMO_MENU.map((item) => {
                        const isActive = selectedDrinks.includes(item.id);
                        return (
                            <button
                                key={item.id}
                                type="button"
                                className={`filter-chip${isActive ? " filter-chip-active" : ""}`}
                                onClick={() => onToggleDrink(item.id)}
                            >
                                {item.name}
                            </button>
                        );
                    })}
                </div>

                <h3 className="filter-group-title">Dietary</h3>
                <div className="filter-options">
                    <button
                        type="button"
                        className={`filter-chip${veganOnly ? " filter-chip-active" : ""}`}
                        onClick={onToggleVegan}
                    >
                        🌱 Vegan options
                    </button>
                </div>

                <h3 className="filter-group-title">Offers</h3>
                <div className="filter-options">
                    <button
                        type="button"
                        className={`filter-chip${promoOnly ? " filter-chip-active" : ""}`}
                        onClick={onTogglePromo}
                    >
                        🏷 Promotional items
                    </button>
                </div>

                <h3 className="filter-group-title">Coffee shops</h3>
                <div className="filter-options">
                    <button
                        type="button"
                        className={`filter-chip${hideChains ? " filter-chip-active" : ""}`}
                        onClick={onToggleHideChains}
                    >
                        🏢 Hide chains
                    </button>
                </div>

                <h3 className="filter-group-title">Vibe</h3>
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
