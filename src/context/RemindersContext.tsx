/**
 * One place that works out what needs somebody, and keeps doing it while the
 * app is open: on sign-in, a second after anything is saved (a payment, an
 * invoice, an account's limit), when moving to another screen after a minute,
 * every fifteen minutes, and whenever the window is brought back after a while.
 * So what it says is what the records say now, not what they said this morning.
 *
 * A task kept from a reminder follows it (see `withTasks`) and ticks itself
 * off once the reminder no longer applies. A reminder already dealt with can
 * be dismissed: it stays away until its figures change.
 *
 * SEEN, NOT NEW
 *
 * Opening Reminders (or tapping one on Home) marks what is on it as seen. The
 * count on the menu is only what is new: not seen yet, seen more than a day
 * ago and still not dealt with, or changed since (bigger amount, more urgent).
 * Seen reminders stay on the list until they are dealt with; they just stop
 * shouting. Remembered per person on this device. Everything else (the sidebar count, the
 * Reminders screen) reads from here, so it is one set of queries per refresh.
 *
 * If the person turns them on, the browser raises a notification when
 * something new appears while they are working in another tab. Nothing is
 * sent to anybody else: this is their own data, read back to them.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { onDataChanged } from '@/lib/changes';
import { useToast } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useOptionalOrg } from '@/context/OrgContext';
import { useAsync } from '@/hooks/useAsync';
import { listInvoices, listOrders, listReturns, listSales, lowStock } from '@/lib/db';
import { isAdmin, partnerScope } from '@/lib/roles';
import { todayISO } from '@/lib/format';
import { PORTAL_ROOT } from '@/lib/tiles';
import { baseReminders, resolvedTasks, tally, thresholdsFrom, withTasks, type Reminder } from '@/lib/reminders';
import { buildBrief, type Brief } from '@/lib/brief';
import { addTask, listTasks, removeTask, setTaskDone, sortTasks, updateTask, type Task } from '@/lib/tasks';
import type { Invoice, Order } from '@/types';

interface RemindersValue {
  reminders: Reminder[];
  counts: { critical: number; warning: number; later: number; action: number };
  /** The same, counting only what is new to this person (see "Seen, not new" above). */
  fresh: { critical: number; warning: number; later: number; action: number };
  /** Not seen yet, seen over a day ago, or changed since. */
  isNew: (reminder: Reminder) => boolean;
  /** Marks these as seen now. */
  markSeen: (ids: string[]) => void;
  loading: boolean;
  checkedAt: Date | null;
  reload: () => void;
  snooze: (id: string) => void;
  /** Hides a reminder until its figures change. */
  dismiss: (id: string) => void;
  notify: boolean;
  setNotify: (on: boolean) => Promise<void>;

  /** The records the reminders were worked out from, for the brief and the pipeline. */
  orders: Order[];
  invoices: Invoice[];
  /** The rule-based daily brief. Null until the first read lands. */
  brief: Brief | null;

  /** The person's own to do list. */
  tasks: Task[];
  tasksLoading: boolean;
  tasksError: Error | null;
  createTask: (input: Omit<Task, 'id' | 'done' | 'createdAt'>) => Promise<void>;
  /** Keep a reminder as a task, due today unless a date is given. */
  keepAsTask: (reminder: Reminder, due?: string) => Promise<void>;
  toggleTask: (id: string, done: boolean) => Promise<void>;
  editTask: (id: string, patch: Partial<Pick<Task, 'title' | 'note' | 'due' | 'priority'>>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
}

const EMPTY: RemindersValue = {
  reminders: [],
  counts: { critical: 0, warning: 0, later: 0, action: 0 },
  fresh: { critical: 0, warning: 0, later: 0, action: 0 },
  isNew: () => false,
  markSeen: () => {},
  loading: false,
  checkedAt: null,
  reload: () => {},
  snooze: () => {},
  dismiss: () => {},
  notify: false,
  setNotify: async () => {},
  orders: [],
  invoices: [],
  brief: null,
  tasks: [],
  tasksLoading: false,
  tasksError: null,
  createTask: async () => {},
  keepAsTask: async () => {},
  toggleTask: async () => {},
  editTask: async () => {},
  deleteTask: async () => {},
};

const RemindersContext = createContext<RemindersValue>(EMPTY);

const SNOOZE_KEY = 'afterbi.reminders.snoozed';
const DISMISS_KEY = 'afterbi.reminders.dismissed';
const SEEN_KEY = 'afterbi.reminders.seen';
/* Seen, still not dealt with, and this long since: it is news again. */
const SEEN_FOR = 24 * 60 * 60 * 1000;

/**
 * What counts as the same reminder for "seen": how urgent and how much. The
 * wording moves with the clock ("raised 3 hours ago"); that is not news.
 */
const seenMark = (r: Reminder) => `${r.severity}|${Math.round(r.amount ?? 0)}`;

interface Seen {
  /** `seenMark` when it was seen. */
  m: string;
  /** When, in ms. */
  at: number;
}

function readSeen(key: string): Record<string, Seen> {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '{}') as Record<string, Seen>;
  } catch {
    return {};
  }
}
/* Moving to another screen looks again if the last look is older than this. */
const STALE = 60 * 1000;
const NOTIFY_KEY = 'afterbi.reminders.notify';
const DIGEST_KEY = 'afterbi.reminders.digest';
const EVERY = 15 * 60 * 1000;

function readMap(key: string): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '{}') as Record<string, string>;
  } catch {
    return {};
  }
}

function writeMap(key: string, map: Record<string, string>) {
  try {
    localStorage.setItem(key, JSON.stringify(map));
  } catch {
    /* private mode: it holds for this visit */
  }
}

/** What a reminder says. Dismissed holds while this is the same; new figures bring it back. */
const fingerprint = (r: Reminder) => `${r.title}|${r.detail}`;

export function RemindersProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const org = useOptionalOrg();
  const toast = useToast();

  const [tick, setTick] = useState(0);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);
  const [snoozed, setSnoozed] = useState<Record<string, string>>(() => readMap(SNOOZE_KEY));
  const [dismissed, setDismissed] = useState<Record<string, string>>(() => readMap(DISMISS_KEY));
  /* Per person: two people on one laptop have not seen each other's. */
  const seenKey = `${SEEN_KEY}.${user?.id ?? ''}`;
  const [seenMap, setSeenMap] = useState<Record<string, Seen>>(() => readSeen(seenKey));
  useEffect(() => setSeenMap(readSeen(seenKey)), [seenKey]);
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

  const { data, loading, error: dataError, reload } = useAsync(
    async () => {
      if (!live || !user || !role) return null;
      /* An HR officer has no orders or invoices to be reminded of; only their own tasks. */
      if (role === 'hr') {
        setCheckedAt(new Date());
        return { orders: [], invoices: [], stock: [], returns: [], sales: [] };
      }
      const ops = isAdmin(role) || ['staff', 'operations_manager', 'warehouse_manager'].includes(role);
      const [orders, invoices, stock, returns, sales] = await Promise.all([
        listOrders({ distributorId: scope, max: 300 }),
        listInvoices({ distributorId: scope, max: 300 }),
        ops ? lowStock() : Promise.resolve([]),
        ops || isAdmin(role) || role === 'finance_manager' ? listReturns(scope) : Promise.resolve([]),
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

  /*
   * The to do list, read on its own.
   *
   * Separate from the records above so that ticking a task off re-reads one
   * small collection, not three hundred orders. Changes are applied to the
   * list on the screen at once and written behind it.
   */
  const [tasks, setTasks] = useState<Task[]>([]);
  const {
    data: taskData,
    loading: tasksLoading,
    error: tasksError,
  } = useAsync(
    async () => (live && user ? listTasks(user.id) : []),
    [user?.id, live],
    /* Handled: a refused read (rules not yet published) must not take the
       whole portal down with it. The Tasks screen says what is wrong. */
    { handleError: true },
  );
  useEffect(() => {
    if (taskData) setTasks(taskData);
  }, [taskData]);

  const uid = user?.id;
  const createTask = useCallback(
    async (input: Omit<Task, 'id' | 'done' | 'createdAt'>) => {
      if (!uid) return;
      const task = await addTask(uid, input);
      setTasks((current) => sortTasks([...current, task]));
    },
    [uid],
  );
  const keepAsTask = useCallback(
    async (reminder: Reminder, due?: string) => {
      await createTask({
        title: reminder.title,
        note: reminder.detail,
        due: due ?? todayISO(),
        priority: reminder.severity === 'critical' ? 'high' : 'normal',
        to: reminder.to,
        source: reminder.id,
      });
    },
    [createTask],
  );
  const toggleTask = useCallback(
    async (id: string, done: boolean) => {
      if (!uid) return;
      const doneAt = done ? new Date().toISOString() : '';
      setTasks((current) => sortTasks(current.map((t) => (t.id === id ? { ...t, done, doneAt } : t))));
      try {
        await setTaskDone(uid, id, done);
      } catch (error) {
        setTasks((current) => sortTasks(current.map((t) => (t.id === id ? { ...t, done: !done } : t))));
        throw error;
      }
    },
    [uid],
  );
  const editTask = useCallback(
    async (id: string, patch: Partial<Pick<Task, 'title' | 'note' | 'due' | 'priority'>>) => {
      if (!uid) return;
      await updateTask(uid, id, patch);
      setTasks((current) => sortTasks(current.map((t) => (t.id === id ? { ...t, ...patch } : t))));
    },
    [uid],
  );
  const deleteTask = useCallback(
    async (id: string) => {
      if (!uid) return;
      await removeTask(uid, id);
      setTasks((current) => current.filter((t) => t.id !== id));
    },
    [uid],
  );

  /*
   * Something was saved: look again a moment later (several saves in a row,
   * a payment and its receipt, become one look). The accounts are re-read
   * too, so a limit just raised is the limit the reminders use.
   */
  const refreshAccounts = org?.refreshAccounts;
  useEffect(() => {
    if (!live) return;
    let timer = 0;
    const off = onDataChanged(() => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        void refreshAccounts?.();
        setTick((n) => n + 1);
      }, 1000);
    });
    return () => {
      off();
      window.clearTimeout(timer);
    };
  }, [live, refreshAccounts]);

  /* Moving to another screen after a minute or more: look again, so Home is never behind. */
  const { pathname } = useLocation();
  const lastPath = useRef(pathname);
  useEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    if (live && checkedAt && Date.now() - checkedAt.getTime() > STALE) setTick((n) => n + 1);
  }, [pathname, live, checkedAt]);

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

  const base = useMemo(() => {
    if (!data || !user || !role) return [];
    return baseReminders({
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

  const all = useMemo(
    () => (role ? withTasks(base, { role, root: PORTAL_ROOT[role], tasks }) : []),
    [base, role, tasks],
  );

  const today = todayISO();
  const reminders = useMemo(
    () => all.filter((r) => snoozed[r.id] !== today && dismissed[r.id] !== fingerprint(r)),
    [all, snoozed, dismissed, today],
  );

  /*
   * A task kept from a reminder that has since cleared (the invoice was
   * paid, the limit raised) ticks itself off. Only on a full, fresh read:
   * a failed or half-finished one must not close anything.
   */
  const closing = useRef(new Set<string>());
  useEffect(() => {
    if (!data || loading || dataError || tasksLoading || !role || !uid) return;
    const done = resolvedTasks(base, tasks, role).filter((t) => !closing.current.has(t.id));
    if (!done.length) return;
    done.forEach((t) => closing.current.add(t.id));
    void Promise.all(done.map((t) => toggleTask(t.id, true).catch(() => closing.current.delete(t.id)))).then(() =>
      toast.info(
        done.length === 1 ? 'A task closed itself' : `${done.length} tasks closed themselves`,
        done.length === 1 ? `No longer needed: ${done[0].title}` : 'What they were about has been dealt with.',
      ),
    );
  }, [data, loading, dataError, tasksLoading, base, tasks, role, uid, toggleTask, toast]);
  const counts = useMemo(() => tally(reminders), [reminders]);

  /* A minute clock, so a reminder seen yesterday turns new again without a reload. */
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const isNew = useCallback(
    (r: Reminder) => {
      const mark = seenMap[r.id];
      return !mark || mark.m !== seenMark(r) || now - mark.at > SEEN_FOR;
    },
    [seenMap, now],
  );
  const fresh = useMemo(() => tally(reminders.filter(isNew)), [reminders, isNew]);

  const markSeen = useCallback(
    (ids: string[]) => {
      const byId = new Map(all.map((r) => [r.id, r]));
      setSeenMap((current) => {
        const at = Date.now();
        let changed = false;
        /* Only what is still on the list is kept; the rest has been dealt with. */
        const next: Record<string, Seen> = {};
        for (const [id, value] of Object.entries(current)) if (byId.has(id)) next[id] = value;
        if (Object.keys(next).length !== Object.keys(current).length) changed = true;
        for (const id of ids) {
          const r = byId.get(id);
          if (!r) continue;
          const old = next[id];
          /* Seeing it again within the day does not restart the day. */
          if (old && old.m === seenMark(r) && at - old.at <= SEEN_FOR) continue;
          next[id] = { m: seenMark(r), at };
          changed = true;
        }
        if (!changed) return current;
        try {
          localStorage.setItem(seenKey, JSON.stringify(next));
        } catch {
          /* private mode: it holds for this visit */
        }
        return next;
      });
    },
    [all, seenKey],
  );

  const brief = useMemo(() => {
    if (!data || !user || !role) return null;
    return buildBrief({
      role,
      firstName: user.firstName,
      root: PORTAL_ROOT[role],
      reminders,
      orders: data.orders,
      invoices: data.invoices,
      tasks,
      thresholds: thresholdsFrom(org?.settings?.reminders),
    });
  }, [data, user, role, reminders, tasks, org?.settings?.reminders]);

  const snooze = useCallback(
    (id: string) => {
      setSnoozed((current) => {
        /* Yesterday's snoozes have run out; drop them so the list does not grow. */
        const day = todayISO();
        const next: Record<string, string> = { [id]: day };
        for (const [key, value] of Object.entries(current)) if (value === day) next[key] = value;
        writeMap(SNOOZE_KEY, next);
        return next;
      });
    },
    [],
  );

  const dismiss = useCallback(
    (id: string) => {
      const reminder = all.find((r) => r.id === id);
      if (!reminder) return;
      setDismissed((current) => {
        /* Only what is still on the list is worth remembering. */
        const live = new Set(all.map((r) => r.id));
        const next: Record<string, string> = { [id]: fingerprint(reminder) };
        for (const [key, value] of Object.entries(current)) if (live.has(key) && key !== id) next[key] = value;
        writeMap(DISMISS_KEY, next);
        return next;
      });
    },
    [all],
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
    if (greeted.current || !data || fresh.action === 0) return;
    /* Already on Reminders: they are looking at it, no need to say so. */
    if (pathname.endsWith('/reminders')) return;
    greeted.current = true;
    try {
      if (localStorage.getItem(DIGEST_KEY) === todayISO()) return;
      localStorage.setItem(DIGEST_KEY, todayISO());
    } catch {
      return;
    }
    toast.info(
      fresh.action === 1 ? 'One new thing needs you' : `${fresh.action} new things need you`,
      'Open Reminders to see them.',
    );
  }, [data, fresh.action, toast, pathname]);

  const value = useMemo<RemindersValue>(
    () => ({
      reminders,
      counts,
      fresh,
      isNew,
      markSeen,
      loading,
      checkedAt,
      reload,
      snooze,
      dismiss,
      notify,
      setNotify,
      orders: data?.orders ?? [],
      invoices: data?.invoices ?? [],
      brief,
      tasks,
      tasksLoading,
      tasksError: tasksError ?? null,
      createTask,
      keepAsTask,
      toggleTask,
      editTask,
      deleteTask,
    }),
    [
      reminders, counts, fresh, isNew, markSeen, loading, checkedAt, reload, snooze, dismiss, notify, setNotify, data, brief,
      tasks, tasksLoading, tasksError, createTask, keepAsTask, toggleTask, editTask, deleteTask,
    ],
  );

  return <RemindersContext.Provider value={value}>{children}</RemindersContext.Provider>;
}

export function useReminders(): RemindersValue {
  return useContext(RemindersContext);
}
