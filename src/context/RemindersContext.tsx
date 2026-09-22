/**
 * One place that works out what needs somebody, and keeps doing it while the
 * app is open: on sign-in, every fifteen minutes, and whenever the window is
 * brought back after a while. Everything else (the sidebar count, the
 * Reminders screen) reads from here, so it is one set of queries per refresh.
 *
 * If the person turns them on, the browser raises a notification when
 * something new appears while they are working in another tab. Nothing is
 * sent to anybody else: this is their own data, read back to them.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useToast } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useOptionalOrg } from '@/context/OrgContext';
import { useAsync } from '@/hooks/useAsync';
import { listInvoices, listOrders, listReturns, listSales, lowStock } from '@/lib/db';
import { isAdmin, partnerScope } from '@/lib/roles';
import { todayISO } from '@/lib/format';
import { PORTAL_ROOT } from '@/lib/tiles';
import { buildReminders, tally, thresholdsFrom, type Reminder } from '@/lib/reminders';

interface RemindersValue {
  reminders: Reminder[];
  counts: { critical: number; warning: number; later: number; action: number };
  loading: boolean;
  checkedAt: Date | null;
  reload: () => void;
  snooze: (id: string) => void;
  notify: boolean;
  setNotify: (on: boolean) => Promise<void>;
}

const EMPTY: RemindersValue = {
  reminders: [],
  counts: { critical: 0, warning: 0, later: 0, action: 0 },
  loading: false,
  checkedAt: null,
  reload: () => {},
  snooze: () => {},
  notify: false,
  setNotify: async () => {},
};

const RemindersContext = createContext<RemindersValue>(EMPTY);

const SNOOZE_KEY = 'afterbi.reminders.snoozed';
const NOTIFY_KEY = 'afterbi.reminders.notify';
const DIGEST_KEY = 'afterbi.reminders.digest';
const EVERY = 15 * 60 * 1000;

function readSnoozed(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(SNOOZE_KEY) ?? '{}') as Record<string, string>;
  } catch {
    return {};
  }
}

export function RemindersProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const org = useOptionalOrg();
  const toast = useToast();

  const [tick, setTick] = useState(0);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);
  const [snoozed, setSnoozed] = useState<Record<string, string>>(readSnoozed);
  const [notify, setNotifyState] = useState(() => {
    try {
      return localStorage.getItem(NOTIFY_KEY) === '1';
    } catch {
      return false;
    }
  });

  const role = user?.role;
  const scope = partnerScope(user);
  const live = Boolean(user && role && role !== 'owner' && org && !org.loading && !org.error);

  const { data, loading, reload } = useAsync(
    async () => {
      if (!live || !user || !role) return null;
      const ops = isAdmin(role) || ['staff', 'operations_manager', 'warehouse_manager'].includes(role);
      const [orders, invoices, stock, returns, sales] = await Promise.all([
        listOrders({ distributorId: scope, max: 300 }),
        listInvoices({ distributorId: scope, max: 300 }),
        ops ? lowStock() : Promise.resolve([]),
        ops ? listReturns(scope) : Promise.resolve([]),
        role === 'sales_rep'
          ? listSales({ distributorId: scope, from: new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10), max: 200 })
          : Promise.resolve([]),
      ]);
      setCheckedAt(new Date());
      return { orders, invoices, stock, returns, sales };
    },
    [user?.id, role, scope, live, tick],
    { handleError: false },
  );

  /* Keep looking while the tab is open, and catch up when it comes back. */
  useEffect(() => {
    if (!live) return;
    const timer = window.setInterval(() => setTick((n) => n + 1), EVERY);
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      if (checkedAt && Date.now() - checkedAt.getTime() < 5 * 60 * 1000) return;
      setTick((n) => n + 1);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [live, checkedAt]);

  const all = useMemo(() => {
    if (!data || !user || !role) return [];
    return buildReminders({
      role,
      uid: user.id,
      root: PORTAL_ROOT[role],
      thresholds: thresholdsFrom(org?.settings?.reminders),
      orders: data.orders,
      invoices: data.invoices,
      stock: data.stock,
      returns: data.returns,
      sales: data.sales,
      distributors: org?.distributors ?? [],
    });
  }, [data, user, role, org?.settings?.reminders, org?.distributors]);

  const today = todayISO();
  const reminders = useMemo(() => all.filter((r) => snoozed[r.id] !== today), [all, snoozed, today]);
  const counts = useMemo(() => tally(reminders), [reminders]);

  const snooze = useCallback(
    (id: string) => {
      setSnoozed((current) => {
        const next = { ...current, [id]: todayISO() };
        try {
          localStorage.setItem(SNOOZE_KEY, JSON.stringify(next));
        } catch {
          /* private mode: it holds for this visit */
        }
        return next;
      });
    },
    [],
  );

  const setNotify = useCallback(async (on: boolean) => {
    if (on && typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
      const answer = await Notification.requestPermission();
      if (answer !== 'granted') {
        setNotifyState(false);
        return;
      }
    }
    setNotifyState(on);
    try {
      localStorage.setItem(NOTIFY_KEY, on ? '1' : '0');
    } catch {
      /* nothing to do */
    }
  }, []);

  /* Anything new since the last look, raised where they are working. */
  const seen = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!data) return;
    const ids = new Set(reminders.map((r) => r.id));
    if (seen.current === null) {
      seen.current = ids;
      return;
    }
    const fresh = reminders.filter((r) => r.severity !== 'later' && !seen.current?.has(r.id));
    seen.current = ids;
    if (!fresh.length || !notify) return;
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    new Notification(fresh.length === 1 ? 'AfterBI' : `AfterBI: ${fresh.length} new reminders`, {
      body: fresh[0].title,
      tag: 'afterbi-reminders',
    });
  }, [data, reminders, notify]);

  /* One quiet line a day, the first time they open the app. */
  const greeted = useRef(false);
  useEffect(() => {
    if (greeted.current || !data || counts.action === 0) return;
    greeted.current = true;
    try {
      if (localStorage.getItem(DIGEST_KEY) === todayISO()) return;
      localStorage.setItem(DIGEST_KEY, todayISO());
    } catch {
      return;
    }
    toast.info(
      counts.action === 1 ? 'One thing needs you today' : `${counts.action} things need you today`,
      'Open Reminders to see them.',
    );
  }, [data, counts.action, toast]);

  const value = useMemo<RemindersValue>(
    () => ({ reminders, counts, loading, checkedAt, reload, snooze, notify, setNotify }),
    [reminders, counts, loading, checkedAt, reload, snooze, notify, setNotify],
  );

  return <RemindersContext.Provider value={value}>{children}</RemindersContext.Provider>;
}

export function useReminders(): RemindersValue {
  return useContext(RemindersContext);
}
