/**
 * The organisation's own reference data, loaded once and shared.
 *
 * WHY THIS EXISTS AT ALL
 *
 * Nine screens need the product list. Six need the distributor list. Four need
 * the depots. Without this they each query for themselves, which on a cold
 * start means the same three collections read four times over a connection that
 * is already the slowest thing in the app — and worse, they disagree while
 * loading: Orders shows twelve distributors and Catalogue shows eleven for the
 * second and a half it takes the second query to land.
 *
 * WHY THE SHELL WAITS FOR IT
 *
 * Every screen underneath resolves a product or a distributor by id from these
 * lists. Letting them mount a moment early means they all render "Unknown
 * product" for a beat and then repaint — so the wait in `OrgGate` is a real
 * feature, not a courtesy. It also means no screen needs the lists in its
 * dependency array.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { getOrgSettings, listDistributors, listProducts, listWarehouses } from '@/lib/db';
import { getActiveOrg } from '@/lib/tenant';
import { useAuth } from '@/context/AuthContext';
import type { Distributor, OrgSettings, Product, Warehouse } from '@/types';

interface OrgValue {
  settings: OrgSettings | null;
  products: Product[];
  distributors: Distributor[];
  warehouses: Warehouse[];
  loading: boolean;
  error: string | null;
  reload(): void;
  /** Resolve by id without every screen writing its own `.find`. */
  productById(id: string): Product | undefined;
  distributorById(id: string): Distributor | undefined;
  warehouseById(id: string): Warehouse | undefined;
  /** The depot a movement defaults to: the org's, or the only one there is. */
  defaultWarehouse: Warehouse | undefined;
}

const OrgContext = createContext<OrgValue | null>(null);

export function OrgProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<OrgSettings | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    /* An owner has no organisation. The platform console reads tenants, not
       products, so there is nothing here for it to wait on. */
    if (!user || user.role === 'owner' || !getActiveOrg()) {
      setLoading(false);
      return;
    }

    let live = true;
    setLoading(true);
    setError(null);

    Promise.all([getOrgSettings(), listProducts(), listDistributors(), listWarehouses()])
      .then(([s, p, d, w]) => {
        if (!live) return;
        setSettings(s);
        setProducts(p);
        setDistributors(d);
        setWarehouses(w);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!live) return;
        setError(err instanceof Error ? err.message : 'Could not load this organisation.');
        setLoading(false);
      });

    return () => {
      live = false;
    };
  }, [user?.id, user?.orgId, nonce]);

  const value = useMemo<OrgValue>(() => {
    const productMap = new Map(products.map((p) => [p.id, p]));
    const distributorMap = new Map(distributors.map((d) => [d.id, d]));
    const warehouseMap = new Map(warehouses.map((w) => [w.id, w]));

    return {
      settings,
      products,
      distributors,
      warehouses,
      loading,
      error,
      reload,
      productById: (id) => productMap.get(id),
      distributorById: (id) => distributorMap.get(id),
      warehouseById: (id) => warehouseMap.get(id),
      defaultWarehouse:
        (settings?.defaultWarehouseId ? warehouseMap.get(settings.defaultWarehouseId) : undefined) ??
        warehouses.find((w) => w.kind === 'company') ??
        warehouses[0],
    };
  }, [settings, products, distributors, warehouses, loading, error, reload]);

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrg(): OrgValue {
  const value = useContext(OrgContext);
  if (!value) throw new Error('useOrg must be used inside <OrgProvider>.');
  return value;
}

/**
 * The same context, for a screen that may legitimately render without one.
 *
 * There is exactly one such screen today — the profile, which is shared between
 * every tenant portal and the platform console. `PlatformShell` deliberately
 * mounts no `OrgProvider`, because an owner belongs to no organisation and
 * `requireOrg()` would throw on the first read. So the profile asked for a
 * context that was correctly absent and took the error boundary down with it.
 *
 * The strict `useOrg` stays strict on purpose: for every other screen, a
 * missing provider is a wiring mistake and a loud failure is what finds it. A
 * hook that silently returned null everywhere would turn that into thirty
 * screens quietly rendering empty states.
 */
export function useOptionalOrg(): OrgValue | null {
  return useContext(OrgContext);
}
