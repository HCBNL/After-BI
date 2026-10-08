/**
 * A person's own to do list, at `users/{uid}/tasks/{taskId}`.
 *
 * Personal on purpose. AfterBI has no messaging between people, and this is
 * not a way round that: nobody assigns anybody else a task here. It is where
 * somebody writes down what they mean to do, and where a reminder the app
 * worked out ("PO-0041 is approved but not fulfilled") can be kept as a task
 * with a date on it rather than snoozed and forgotten.
 *
 * NOTHING GROWS WITHOUT BOUND
 *
 * At most 200 tasks are read, and a task finished more than 30 days ago is
 * deleted the next time the list is opened. A to do list is about what is
 * next; last quarter's ticked boxes are noise and storage.
 */

import { collection, deleteDoc, doc, getDocs, limit, query, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { todayISO } from './format';

export type TaskPriority = 'high' | 'normal';

export interface Task {
  id: string;
  title: string;
  note?: string;
  /** YYYY-MM-DD. Empty means "whenever". */
  due?: string;
  priority: TaskPriority;
  /** A screen in the app this task is about, e.g. `/portal/office/orders`. */
  to?: string;
  /** The reminder it was made from, so the same suggestion is not offered twice. */
  source?: string;
  done: boolean;
  doneAt?: string;
  createdAt: string;
}

const MAX_TASKS = 200;
const KEEP_DONE_DAYS = 30;

const tasksOf = (uid: string) => collection(db, 'users', uid, 'tasks');

function newId(): string {
  return `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

/** Open first by due date (undated last), then finished, newest first. */
export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (a.done) return (b.doneAt ?? '').localeCompare(a.doneAt ?? '');
    if (a.priority !== b.priority) return a.priority === 'high' ? -1 : 1;
    const ad = a.due || '9999';
    const bd = b.due || '9999';
    return ad.localeCompare(bd) || a.createdAt.localeCompare(b.createdAt);
  });
}

export async function listTasks(uid: string): Promise<Task[]> {
  const snap = await getDocs(query(tasksOf(uid), limit(MAX_TASKS)));
  const cutoff = new Date(Date.now() - KEEP_DONE_DAYS * 86_400_000).toISOString();
  const keep: Task[] = [];
  for (const row of snap.docs) {
    const task = { id: row.id, ...(row.data() as Omit<Task, 'id'>) };
    if (task.done && task.doneAt && task.doneAt < cutoff) {
      void deleteDoc(row.ref).catch(() => undefined);
      continue;
    }
    keep.push(task);
  }
  return sortTasks(keep);
}

export async function addTask(uid: string, input: Omit<Task, 'id' | 'done' | 'createdAt'>): Promise<Task> {
  const task: Task = {
    ...input,
    title: input.title.trim().slice(0, 160),
    note: input.note?.trim().slice(0, 600) || undefined,
    id: newId(),
    done: false,
    createdAt: new Date().toISOString(),
  };
  const { id, ...data } = task;
  /* Firestore refuses `undefined`; leave empty fields off the document. */
  const clean = Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));
  await setDoc(doc(tasksOf(uid), id), clean);
  return task;
}

export async function setTaskDone(uid: string, id: string, done: boolean): Promise<void> {
  await updateDoc(doc(tasksOf(uid), id), done ? { done, doneAt: new Date().toISOString() } : { done, doneAt: '' });
}

export async function updateTask(uid: string, id: string, patch: Partial<Pick<Task, 'title' | 'note' | 'due' | 'priority'>>): Promise<void> {
  const clean = Object.fromEntries(Object.entries(patch).map(([key, value]) => [key, value ?? '']));
  await updateDoc(doc(tasksOf(uid), id), clean);
}

export async function removeTask(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(tasksOf(uid), id));
}

/** Where a task stands today, for the badge beside it. */
export function taskTiming(task: Task, today = todayISO()): 'overdue' | 'today' | 'soon' | 'none' {
  if (task.done || !task.due) return 'none';
  if (task.due < today) return 'overdue';
  if (task.due === today) return 'today';
  return 'soon';
}

/** "Tomorrow", "Friday", "3 Oct": a due date as somebody would say it. */
export function dueLabel(due: string | undefined, today = todayISO()): string {
  if (!due) return 'No date';
  if (due === today) return 'Today';
  const day = new Date(`${due}T00:00:00`);
  const base = new Date(`${today}T00:00:00`);
  const diff = Math.round((day.getTime() - base.getTime()) / 86_400_000);
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff < 0) return `${-diff} days late`;
  if (diff < 7) return day.toLocaleDateString('en-NG', { weekday: 'long' });
  return day.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
}
