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
import { buildBrief, type Brief } from '@/lib/brief';
import { addTask, listTasks, removeTask, setTaskDone, sortTasks, updateTask, type Task } from '@/lib/tasks';
import type { Invoice, Order } from '@/types';

interface RemindersValue {
  reminders: Reminder[];
  counts: { critical: number; warning: number; later: number; action: number };
  loading: boolean;
  checkedAt: Date | null;
  reload: () => void;
  snooze: (id: string) => void;
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
  loading: false,
  checkedAt: null,
  reload: () => {},
  snooze: () => {},
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
      tasks,
    });
  }, [data, user, role, org?.settings?.reminders, org?.distributors, tasks]);

  const today = todayISO();
  const reminders = useMemo(() => all.filter((r) => snoozed[r.id] !== today), [all, snoozed, today]);
  const counts = useMemo(() => tally(reminders), [reminders]);

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
    () => ({
      reminders,
      counts,
      loading,
      checkedAt,
      reload,
      snooze,
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
      reminders, counts, loading, checkedAt, reload, snooze, notify, setNotify, data, brief,
      tasks, tasksLoading, tasksError, createTask, keepAsTask, toggleTask, editTask, deleteTask,
    ],
  );

  return <RemindersContext.Provider value={value}>{children}</RemindersContext.Provider>;
}

export function useReminders(): RemindersValue {
  return useContext(RemindersContext);
}
