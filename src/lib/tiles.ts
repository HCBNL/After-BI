/**
 * Everything a person can do, as one flat catalogue.
 *
 * The home screen is a grid of tiles, the way a banking app's home is. That
 * shape only works if there is a single list of actions that the grid, the
 * desktop rail, the phone's menu sheet and the "All actions" page all read from
 * — the moment those drift, a rep finds a tile that does not appear in the
 * menu, or worse, a screen that exists in the app and cannot be reached from
 * anywhere.
 *
 * The AfterBI this replaces had that drift built in: `NAV_CONFIG` in
 * `DashboardLayout.jsx` was 250 lines of hand-maintained menu, repeated almost
 * verbatim for each of eight roles, plus a separate `more:` array per role
 * holding the screens that did not fit. Nine of the app's routes appeared in no
 * role's menu at all, reachable only by typing the URL. One array fixes that by
 * construction: a screen with no row here is a screen nobody can reach, which
 * is a thing you notice, and a row here with no route is a 404 the first time
 * anyone taps it.
 *
 * So: one `ACTIONS` array. Roles filter it, `GROUP_ORDER` sections it, and
 * nothing else in the app hard-codes a destination.
 *
 * Ordering inside a group is not alphabetical, it is frequency. A rep opens
 * Orders every single morning and Targets once a month, and the array says so.
 */

import {
  Boxes,
  Building2,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  Factory,
  FileSpreadsheet,
  FileText,
  Globe,
  LineChart,
  MapPin,
  Megaphone,
  Package,
  PackageCheck,
  Receipt,
  RotateCcw,
  Settings,
  ShoppingCart,
  Sun,
  Target as TargetIcon,
  TrendingUp,
  Truck,
  UserPlus,
  Users,
  Wallet,
  Warehouse,
  type LucideIcon,
} from 'lucide-react';
import type { Role } from '@/types';

/**
 * Groups exist for the rail, the menu sheet and the "All actions" page, which
 * are long lists and need headings. The tile grid ignores them.
 */
export type ActionGroup =
  | 'Daily'
  | 'Sales'
  | 'Stock'
  | 'Money'
  | 'Partners'
  | 'Company'
  /*
   * The platform owner's two. Nobody inside a customer's organisation ever
   * sees either.
   *
   * Split because they are two different jobs done on two different days:
   * `Platform` is running the business — who is on it, what they pay — and
   * `Content` is what every tenant sees. Six items under one heading is a
   * list, not a section.
   */
  | 'Platform'
  | 'Content';

/**
 * The categories, in the order they are shown everywhere.
 *
 * One list, read by the desktop rail, the phone's menu sheet and the All
 * actions page, so the three cannot drift into three different shapes of the
 * same app.
 */
export const GROUP_ORDER: ActionGroup[] = [
  'Daily',
  'Sales',
  'Stock',
  'Money',
  'Partners',
  'Company',
  'Platform',
  'Content',
];

export const GROUP_ICON: Record<ActionGroup, LucideIcon> = {
  Daily: Sun,
  Sales: TrendingUp,
  Stock: Boxes,
  Money: Wallet,
  Partners: Building2,
  Company: Settings,
  Platform: Globe,
  Content: Megaphone,
};

export interface AppAction {
  /** Stable across releases. Referred to by `BAR` below and by nothing else. */
  id: string;
  /** What the tile says. Two words at most; it sits under a 44px icon. */
  label: string;
  /** Sentence for the "All actions" page, and the tile's accessible name. */
  description: string;
  icon: LucideIcon;
  /**
   * A leaf path, resolved against the role's portal root by `resolveTo`.
   *
   * Leaf rather than absolute for almost everything, because the same screen
   * appears under several portals — Orders is `/portal/office/orders` for an
   * administrator and `/portal/sales/orders` for a rep, and it is the same
   * component either way. Anything starting with `/` is absolute and passes
   * through untouched.
   */
  to: string;
  roles: Role[];
  group: ActionGroup;
  /** Marks a destination that is not built yet, so the grid can dim it. */
  soon?: boolean;
}

/* ------------------------------------------------------------ role bundles */

const ADMINS: Role[] = ['super_admin', 'admin'];
const OFFICE: Role[] = ['super_admin', 'admin', 'staff'];
const SELLING: Role[] = ['super_admin', 'admin', 'staff', 'sales_rep'];
const OPS: Role[] = ['super_admin', 'admin', 'operations_manager', 'warehouse_manager'];
const MONEY: Role[] = ['super_admin', 'admin', 'finance_manager'];
/** Everybody inside a tenant. Deliberately excludes `owner`. */
const EVERYONE: Role[] = [
  'super_admin',
  'admin',
  'staff',
  'sales_rep',
  'distributor',
  'warehouse_manager',
  'finance_manager',
  'operations_manager',
];

/* -------------------------------------------------------------- catalogue */

export const ACTIONS: AppAction[] = [
  /* --------------------------------------------------------------- platform */
  /*
   * The owner's five. They are in the same catalogue as everything else, and
   * that is the point: the tile grid, the menu sheet and the bottom bar all
   * read this array, so the platform console gets the shape of the rest of the
   * app for free rather than growing its own navigation that drifts from it.
   *
   * `roles: ['owner']` keeps them out of every tenant. An administrator cannot
   * see them because `actionsForRole` never returns them, and could not reach
   * them anyway — `firestore.rules` refuses every collection behind them to
   * anybody but the owner.
   */
  {
    id: 'platform-orgs',
    label: 'Organisations',
    description: 'Every business on the platform: seats, subscription, status, and the way in.',
    icon: Building2,
    to: 'organisations',
    roles: ['owner'],
    group: 'Platform',
  },
  {
    id: 'platform-pricing',
    label: 'Pricing',
    description: 'Plans in naira, per seat per month, and what every organisation actually pays.',
    icon: Wallet,
    to: 'pricing',
    roles: ['owner'],
    group: 'Platform',
  },

  /* ------------------------------------------------------------------ daily */
  /*
   * First in almost everyone's list, because an order is the one thing in this
   * product that has to happen at a particular time or the depot misses the
   * loading window. Everything else can wait until after lunch.
   */
  {
    id: 'orders',
    label: 'Orders',
    description: 'Purchase orders from draft to fulfilment, with who still has to sign.',
    icon: ShoppingCart,
    to: 'orders',
    roles: EVERYONE,
    group: 'Daily',
  },
  {
    id: 'approvals',
    label: 'Approvals',
    description: 'Everything waiting on your signature: orders, returns and credit.',
    icon: ClipboardCheck,
    to: 'approvals',
    roles: [
      'super_admin',
      'admin',
      'staff',
      'finance_manager',
      'operations_manager',
      'warehouse_manager',
    ],
    group: 'Daily',
  },
  {
    /*
     * After orders, because that is the order of the work: the distributor buys
     * in, then the shops buy out, and only the second one tells you whether the
     * first was real. A depot full of stock that never left is a sale on paper.
     */
    id: 'sell-out',
    label: 'Sell-out',
    description: 'What actually left the shelves, by outlet and by day. The number behind the number.',
    icon: TrendingUp,
    to: 'sell-out',
    roles: SELLING.concat('distributor'),
    group: 'Daily',
  },
  {
    id: 'deliveries',
    label: 'Deliveries',
    description: 'Confirm what arrived, against what was sent. A shortage raises a return here.',
    icon: Truck,
    to: 'deliveries',
    roles: ['super_admin', 'admin', 'distributor', 'warehouse_manager', 'operations_manager'],
    group: 'Daily',
  },

  /* ------------------------------------------------------------------ sales */
  {
    id: 'catalogue',
    label: 'Catalogue',
    description: 'What is for sale, at your price, with what is actually in stock.',
    icon: Package,
    to: 'catalogue',
    roles: EVERYONE,
    group: 'Sales',
  },
  {
    id: 'leads',
    label: 'Leads',
    description: 'Businesses you are working on, by stage, with what each is worth.',
    icon: ClipboardList,
    to: 'leads',
    roles: SELLING,
    group: 'Sales',
  },
  {
    id: 'targets',
    label: 'Targets',
    description: 'The number you are carrying this month, and how far through it you are.',
    icon: TargetIcon,
    to: 'targets',
    roles: EVERYONE,
    group: 'Sales',
  },
  {
    id: 'scorecards',
    label: 'Scorecards',
    description: 'Every rep and every distributor against target, ranked, for the monthly pack.',
    icon: LineChart,
    to: 'scorecards',
    roles: ADMINS.concat('operations_manager'),
    group: 'Sales',
  },
  {
    id: 'territories',
    label: 'Territories',
    description: 'Who covers where, and which states have nobody in them.',
    icon: MapPin,
    to: 'territories',
    roles: ADMINS,
    group: 'Sales',
  },

  /* ------------------------------------------------------------------ stock */
  {
    id: 'stock',
    label: 'Stock',
    description: 'What is in each depot right now, and what has fallen below its threshold.',
    icon: Warehouse,
    to: 'stock',
    roles: OPS.concat('staff', 'distributor'),
    group: 'Stock',
  },
  {
    id: 'products',
    label: 'Products',
    description: 'The catalogue itself: names, units, the three price tiers, minimum order.',
    icon: Package,
    to: 'products',
    roles: ADMINS,
    group: 'Stock',
  },
  {
    id: 'movements',
    label: 'Movements',
    description: 'Every unit in and out, who moved it and what the balance was after.',
    icon: FileSpreadsheet,
    to: 'movements',
    roles: OPS.concat('staff'),
    group: 'Stock',
  },
  {
    id: 'warehouses',
    label: 'Depots',
    description: 'Where stock is held, and which manager is responsible for each.',
    icon: Factory,
    to: 'warehouses',
    roles: ADMINS.concat('operations_manager'),
    group: 'Stock',
  },
  {
    id: 'returns',
    label: 'Returns',
    description: 'Goods coming back — damage, shortage, expiry — and the credit each one raises.',
    icon: RotateCcw,
    to: 'returns',
    roles: OPS.concat('staff', 'distributor'),
    group: 'Stock',
  },

  /* ------------------------------------------------------------------ money */
  {
    id: 'invoices',
    label: 'Invoices',
    description: 'Raised, issued, part paid and overdue — with the days each one is late.',
    icon: Receipt,
    to: 'invoices',
    roles: EVERYONE,
    group: 'Money',
  },
  {
    id: 'statement',
    label: 'Statement',
    description: 'One account, every invoice and payment, to the balance carried forward.',
    icon: FileText,
    to: 'statement',
    roles: EVERYONE,
    group: 'Money',
  },
  {
    id: 'credit',
    label: 'Credit limits',
    description: 'What each distributor may owe at once, and who is against their ceiling.',
    icon: CreditCard,
    to: 'credit',
    roles: MONEY,
    group: 'Money',
  },
  {
    id: 'reports',
    label: 'Reports',
    description: 'Sales, stock and debtors, as a spreadsheet, for whoever asked for it in Excel.',
    icon: FileSpreadsheet,
    to: 'reports',
    roles: MONEY.concat('staff', 'operations_manager'),
    group: 'Money',
  },

  /* --------------------------------------------------------------- partners */
  {
    id: 'distributors',
    label: 'Distributors',
    description: 'Every trading partner: tier, territory, credit, and the people on the account.',
    icon: Building2,
    to: 'distributors',
    roles: OFFICE.concat('operations_manager', 'finance_manager'),
    group: 'Partners',
  },

  /* ---------------------------------------------------------------- company */
  {
    id: 'setup',
    label: 'Setup',
    description: 'The whole setup in order: depots, products, price tiers, distributors, people.',
    icon: PackageCheck,
    to: 'setup',
    roles: ADMINS,
    group: 'Company',
  },
  {
    id: 'users',
    label: 'People',
    description: 'Who has an account, what they may open, and who has been suspended.',
    icon: Users,
    to: 'users',
    roles: ADMINS,
    group: 'Company',
  },
  {
    id: 'invite',
    label: 'Add person',
    description: 'Create a sign-in for someone in your organisation.',
    icon: UserPlus,
    to: 'invite',
    roles: ADMINS,
    group: 'Company',
  },
  {
    id: 'settings',
    label: 'Settings',
    description: 'Company details, logo, invoice footer, tax ID and the approval threshold.',
    icon: Settings,
    to: 'settings',
    roles: ADMINS,
    group: 'Company',
  },
];

/* ----------------------------------------------------------------- lookup */

const BY_ID = new Map(ACTIONS.map((a) => [a.id, a]));

export function actionById(id: string): AppAction | undefined {
  return BY_ID.get(id);
}

/**
 * The portal root for a role.
 *
 * Six roots for nine roles, and the sharing is deliberate. `super_admin`,
 * `admin` and `staff` share `/portal/office` because they do the same job at
 * three levels of authority — the catalogue already differs by role, so a
 * fourth root would buy nothing but three more route blocks to keep in step.
 * `warehouse_manager` and `operations_manager` share `/portal/operations` for
 * the same reason.
 *
 * What the roots are NOT is a permission boundary. A staff member who types
 * `/portal/office/settings` is refused by `RequireRole` on that route and by
 * the rules behind it, not by the root they land on.
 */
export const PORTAL_ROOT: Record<Role, string> = {
  owner: '/portal/platform',
  super_admin: '/portal/office',
  admin: '/portal/office',
  staff: '/portal/office',
  sales_rep: '/portal/sales',
  distributor: '/portal/partner',
  warehouse_manager: '/portal/operations',
  operations_manager: '/portal/operations',
  finance_manager: '/portal/finance',
};

/**
 * A leaf path resolved against the role's root. Absolute paths pass through.
 */
export function resolveTo(action: AppAction, role: Role): string {
  return action.to.startsWith('/') ? action.to : `${PORTAL_ROOT[role]}/${action.to}`;
}

export function actionsForRole(role: Role): AppAction[] {
  return ACTIONS.filter((a) => a.roles.includes(role));
}

/** The groups this role has anything in, in `GROUP_ORDER` order. */
export function groupsForRole(role: Role): { group: ActionGroup; actions: AppAction[] }[] {
  const available = actionsForRole(role);
  return GROUP_ORDER.filter((g) => available.some((a) => a.group === g)).map((group) => ({
    group,
    actions: available.filter((a) => a.group === group),
  }));
}

/* ------------------------------------------------------------- bottom bar */

/**
 * Five slots, and the fifth is always the full menu.
 *
 * A bottom bar that tries to hold every section ends up with six-point labels
 * nobody reads. Two role-specific destinations, home, everything else behind
 * `Menu`, and the person. The bar is for the things you reach for without
 * thinking.
 *
 * Each role's two are the two screens that role opens daily — not the two most
 * important screens, which is a different and much less useful list. A finance
 * manager's most important screen is Credit limits; the one they open every
 * morning is Invoices, and that is the one that gets the thumb.
 */
export interface BarSlot {
  /** An action id, or one of the two built-ins (`home`, `profile`, `menu`). */
  id: string;
  label: string;
}

export const BAR: Record<Role, BarSlot[]> = {
  owner: [
    { id: 'home', label: 'Home' },
    { id: 'platform-orgs', label: 'Orgs' },
    { id: 'platform-pricing', label: 'Pricing' },
    { id: 'menu', label: 'Menu' },
    { id: 'profile', label: 'Profile' },
  ],
  super_admin: [
    { id: 'home', label: 'Home' },
    { id: 'orders', label: 'Orders' },
    { id: 'approvals', label: 'Approvals' },
    { id: 'menu', label: 'Menu' },
    { id: 'profile', label: 'Profile' },
  ],
  admin: [
    { id: 'home', label: 'Home' },
    { id: 'orders', label: 'Orders' },
    { id: 'approvals', label: 'Approvals' },
    { id: 'menu', label: 'Menu' },
    { id: 'profile', label: 'Profile' },
  ],
  staff: [
    { id: 'home', label: 'Home' },
    { id: 'orders', label: 'Orders' },
    { id: 'stock', label: 'Stock' },
    { id: 'menu', label: 'Menu' },
    { id: 'profile', label: 'Profile' },
  ],
  sales_rep: [
    { id: 'home', label: 'Home' },
    { id: 'orders', label: 'Orders' },
    { id: 'sell-out', label: 'Sell-out' },
    { id: 'menu', label: 'Menu' },
    { id: 'profile', label: 'Profile' },
  ],
  /*
   * A distributor's second slot is Invoices rather than Catalogue, because they
   * browse what to buy once a week and check what they owe every day — and an
   * overdue invoice is the thing that stops the next order shipping.
   */
  distributor: [
    { id: 'home', label: 'Home' },
    { id: 'orders', label: 'Orders' },
    { id: 'invoices', label: 'Invoices' },
    { id: 'menu', label: 'Menu' },
    { id: 'profile', label: 'Profile' },
  ],
  warehouse_manager: [
    { id: 'home', label: 'Home' },
    { id: 'stock', label: 'Stock' },
    { id: 'movements', label: 'Movements' },
    { id: 'menu', label: 'Menu' },
    { id: 'profile', label: 'Profile' },
  ],
  operations_manager: [
    { id: 'home', label: 'Home' },
    { id: 'stock', label: 'Stock' },
    { id: 'returns', label: 'Returns' },
    { id: 'menu', label: 'Menu' },
    { id: 'profile', label: 'Profile' },
  ],
  finance_manager: [
    { id: 'home', label: 'Home' },
    { id: 'invoices', label: 'Invoices' },
    { id: 'credit', label: 'Credit' },
    { id: 'menu', label: 'Menu' },
    { id: 'profile', label: 'Profile' },
  ],
};

/* ------------------------------------------------------------ the laptop rail */

/**
 * The rail's shortlist per role: the screens a role opens every day, grouped
 * under their sections. `extra` rows show only on a screen tall enough for
 * them (`.rail-extra` in index.css). An id the role cannot open is skipped,
 * so the rail can never offer a screen the role is not allowed.
 */
export interface RailPick {
  id: string;
  extra?: boolean;
}

const OFFICE_RAIL: RailPick[] = [
  { id: 'orders' },
  { id: 'approvals' },
  { id: 'sell-out' },
  { id: 'stock' },
  { id: 'invoices' },
  { id: 'statement', extra: true },
  { id: 'distributors' },
  { id: 'products', extra: true },
  { id: 'users' },
  { id: 'invite', extra: true },
  { id: 'settings', extra: true },
];

export const RAIL: Record<Role, RailPick[]> = {
  owner: [{ id: 'platform-orgs' }, { id: 'platform-pricing' }],
  super_admin: OFFICE_RAIL,
  admin: OFFICE_RAIL,
  staff: [
    { id: 'orders' },
    { id: 'approvals' },
    { id: 'sell-out' },
    { id: 'catalogue' },
    { id: 'stock' },
    { id: 'movements', extra: true },
    { id: 'invoices' },
    { id: 'distributors' },
  ],
  sales_rep: [
    { id: 'orders' },
    { id: 'sell-out' },
    { id: 'catalogue' },
    { id: 'leads' },
    { id: 'targets' },
    { id: 'invoices' },
    { id: 'statement', extra: true },
  ],
  distributor: [
    { id: 'orders' },
    { id: 'catalogue' },
    { id: 'deliveries' },
    { id: 'invoices' },
    { id: 'statement' },
    { id: 'returns' },
    { id: 'sell-out', extra: true },
  ],
  warehouse_manager: [
    { id: 'stock' },
    { id: 'movements' },
    { id: 'deliveries' },
    { id: 'orders' },
    { id: 'approvals' },
    { id: 'returns' },
    { id: 'warehouses', extra: true },
  ],
  operations_manager: [
    { id: 'stock' },
    { id: 'movements' },
    { id: 'orders' },
    { id: 'approvals' },
    { id: 'deliveries' },
    { id: 'returns' },
    { id: 'warehouses', extra: true },
    { id: 'scorecards', extra: true },
  ],
  finance_manager: [
    { id: 'invoices' },
    { id: 'statement' },
    { id: 'credit' },
    { id: 'reports' },
    { id: 'approvals' },
    { id: 'orders' },
    { id: 'distributors', extra: true },
  ],
};

export function railFor(role: Role): { group: ActionGroup; items: { action: AppAction; extra: boolean }[] }[] {
  const mine = new Map(actionsForRole(role).filter((a) => !a.soon).map((a) => [a.id, a] as const));
  const groups = new Map<ActionGroup, { action: AppAction; extra: boolean }[]>();
  for (const pick of RAIL[role] ?? []) {
    const action = mine.get(pick.id);
    if (!action) continue;
    const list = groups.get(action.group) ?? [];
    list.push({ action, extra: Boolean(pick.extra) });
    groups.set(action.group, list);
  }
  return GROUP_ORDER.filter((g) => groups.has(g)).map((g) => ({ group: g, items: groups.get(g)! }));
}
