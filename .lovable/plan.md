
# Adjust Pot and Community Card Vertical Positions

Two small positioning tweaks in `src/components/poker/PokerTablePro.tsx`:

1. **Pot display**: Move from `top: 14%` down to `top: 20%` so the dealer character no longer overlaps it.
2. **Community cards**: Move from `top: 42%` down to `top: 48%` to better center them vertically on the felt.
3. **Phase indicator** and **hand name** will also shift down proportionally (from `60%`/`62%` to `66%`/`68%`) to maintain spacing below the cards.

### File: `src/components/poker/PokerTablePro.tsx`

| Element | Current | New |
|---------|---------|-----|
| Pot display | `top: 14%` | `top: 20%` |
| Community cards | `top: 42%` | `top: 48%` |
| Hand name reveal | `top: 60%` | `top: 66%` |
| Phase indicator | `top: 62%` | `top: 68%` |
