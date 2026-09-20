/**
 * The panel behind the sign-in form: the objects of the trade — cartons,
 * trucks, depots, invoices — drifting behind a green light. A dozen icons and
 * two gradients, so it weighs nothing and stays sharp on any screen. Dark in
 * both themes on purpose: it is a material, not a theme state.
 */
import {
  Boxes,
  Building2,
  Calculator,
  ClipboardList,
  Package,
  Percent,
  Receipt,
  ShoppingCart,
  TrendingUp,
  Truck,
  Warehouse,
} from 'lucide-react';

const OBJECTS = [
  { Icon: Truck, top: '10%', left: '14%', size: 76, delay: 0, duration: 15, tone: 'ink' },
  { Icon: Package, top: '25%', left: '66%', size: 62, delay: 1.4, duration: 17, tone: 'ink' },
  { Icon: Calculator, top: '51%', left: '8%', size: 56, delay: 0.7, duration: 19, tone: 'gold' },
  { Icon: Warehouse, top: '67%', left: '72%', size: 66, delay: 2.1, duration: 16, tone: 'ink' },
  { Icon: ClipboardList, top: '37%', left: '36%', size: 50, delay: 3.2, duration: 21, tone: 'ink' },
  { Icon: TrendingUp, top: '7%', left: '76%', size: 54, delay: 1.1, duration: 18, tone: 'gold' },
  { Icon: Boxes, top: '79%', left: '28%', size: 58, delay: 2.7, duration: 20, tone: 'ink' },
  { Icon: Receipt, top: '59%', left: '50%', size: 48, delay: 0.4, duration: 22, tone: 'ink' },
  { Icon: Building2, top: '19%', left: '42%', size: 44, delay: 3.9, duration: 17, tone: 'ink' },
  { Icon: Percent, top: '45%', left: '84%', size: 42, delay: 1.8, duration: 23, tone: 'ink' },
  { Icon: ShoppingCart, top: '87%', left: '56%', size: 46, delay: 3.4, duration: 19, tone: 'gold' },
] as const;

export function AuthArt() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(80% 60% at 78% 8%, rgba(16,185,129,.28), transparent 62%), radial-gradient(70% 55% at 12% 92%, rgba(20,90,122,.28), transparent 60%)',
        }}
      />
      {OBJECTS.map(({ Icon, top, left, size, delay, duration, tone }, index) => (
        <span
          key={index}
          className="drift absolute"
          style={{
            top,
            left,
            animationDelay: `${delay}s`,
            animationDuration: `${duration}s`,
            color: tone === 'gold' ? 'rgba(251,191,36,.46)' : 'rgba(255,255,255,.20)',
          }}
        >
          <span className="block scale-[0.78] sm:scale-[0.9] lg:scale-100">
            <Icon size={size} strokeWidth={2.1} />
          </span>
        </span>
      ))}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#080a0e] via-[#080a0e]/55 to-transparent" />
    </div>
  );
}
