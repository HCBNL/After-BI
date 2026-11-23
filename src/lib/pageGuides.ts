/**
 * The guide behind every page's (i), top right.
 *
 * It replaces the old first-time tour. A page with a few things worth knowing
 * gets a short story (slides that play on their own, tap to move on, hold to
 * pause); every other page gets one card made from its own description. Keyed
 * by the page's title as it is shown in its header.
 *
 * KEEP IT TRUE: every sentence names a real thing on that screen. When a
 * screen changes, its slides change in the same commit.
 */

export interface GuideSlide {
  title: string;
  body: string;
}

export const PAGE_GUIDES: Record<string, GuideSlide[]> = {
  Home: [
    { title: 'Your day starts here', body: 'Your shortcuts or your figure cards sit at the top. Choose which one you prefer in Home screen, inside the plus button.' },
    { title: 'Recent activity', body: 'Your last few actions: orders raised, approvals and payments. Tap one to see its summary.' },
    { title: 'The plus button', body: 'Bottom right: language, hide balances, light or dark mode, your home screen and, on a laptop, full screen.' },
    { title: 'Help on every page', body: 'Every screen has this (i) at the top right. Tap it for a short guide to that page. Step by step guides for everything are in Help.' },
  ],
  Orders: [
    { title: 'From draft to delivered', body: 'Every purchase order, from draft to fulfilment, and who still has to sign before it can move.' },
    { title: 'Raising an order', body: 'Start a new order from the Catalogue. Pick the distributor and the prices follow their tier: OT, MT or SA.' },
    { title: 'Signing', body: 'Orders above the threshold set in Settings wait in Approvals. Any discount shows there, so it is seen before anyone signs.' },
    { title: 'Fulfilled is final', body: 'Once the delivery note is issued, an order can never be edited, not even by the super admin. To reverse it, raise a return on the customer’s account.' },
  ],
  Catalogue: [
    { title: 'Your price list', body: 'Every product you sell, at the price for the tier you choose.' },
    { title: 'Start an order', body: 'Tap New order and choose the distributor. The catalogue prices itself for that distributor’s tier.' },
    { title: 'Units and cartons', body: 'A unit is one single item. A carton is the case it comes in. Orders are keyed in both.' },
  ],
  Approvals: [
    { title: 'Waiting on you', body: 'Everything that needs your signature. Nothing here can move until you decide.' },
    { title: 'Read before you sign', body: 'Open an item to see its lines, and any discount given against the normal price.' },
    { title: 'Approve or reject', body: 'Approving sends it on to the next step. Every approval and rejection is kept in the audit log.' },
  ],
  Invoices: [
    { title: 'Every invoice', body: 'Raised, issued, part paid and overdue, with the days each one is late.' },
    { title: 'Payments', body: 'Record money as it lands. A part payment is fine: the balance left updates itself.' },
    { title: 'Changing a price', body: 'For a delivered order that is not yet paid, issue a credit note. It flows through to the statement and to your analytics.' },
    { title: 'Chasing', body: 'Overdue invoices show in red here and in Reminders, so nobody has to remember who is late.' },
  ],
  'Credit limits': [
    { title: 'How much each can owe', body: 'Each distributor’s ceiling: the most they may owe at once.' },
    { title: 'Who is over', body: 'Anyone above their limit is flagged here and in Reminders, with how far over they are.' },
    { title: 'On the record', body: 'Every change to a limit is kept in the audit log, with who made it.' },
  ],
  Stock: [
    { title: 'What you hold', body: 'Every product in every depot, right now.' },
    { title: 'Running low', body: 'Lines below their threshold are flagged here and in Reminders before they run out.' },
    { title: 'How stock changes', body: 'Only through recorded movements: goods received, orders fulfilled, returns and approved adjustments. Each one is listed in Movements.' },
  ],
  'Stock count': [
    { title: 'Count by scanning', body: 'Scan the AfterBI sticker on a carton to open its product, then enter what you find.' },
    { title: 'Section, then row', body: 'Choose where you are counting: the depot’s section, then its row.' },
    { title: 'Lines and loose units', body: 'Count lines times cartons per line, plus any loose units. Loose units roll into cartons by themselves.' },
    { title: 'A count changes nothing', body: 'It is a report. When it is closed, the variance shows what the system held against what was found. Corrections go through a stock adjustment.' },
  ],
  'Stock adjustments': [
    { title: 'Correcting a balance', body: 'When the system holds the wrong number, raise an adjustment with its reason.' },
    { title: 'Two signatures', body: 'Finance and operations must both approve. The stock moves only when the second one signs.' },
    { title: 'Until then', body: 'The balance is untouched. Once approved, the change appears in Movements like any other.' },
  ],
  Costing: [
    { title: 'Your true unit cost', body: 'Add the product cost and what it took to land it: freight, clearance and delivery. Divided by the quantity, that is your cost per unit.' },
    { title: 'Price at any margin', body: 'Choose a margin, such as 20% or 50%, and the selling price works itself out.' },
    { title: 'Why it matters', body: 'Priced from the landed cost, every carton you sell covers what it really cost to bring in.' },
  ],
  Distributors: [
    { title: 'Your trading partners', body: 'Every distributor with their tier, territory, credit and what they owe right now.' },
    { title: 'Owed and overdue', body: 'Outstanding is what each one owes. Anything overdue is in red, and Credit left goes below zero when they pass their limit.' },
    { title: 'Sales reps', body: 'A distributor can have several sales reps and can be moved to another rep at any time. Reps see only their own accounts.' },
  ],
  Leads: [
    { title: 'Before they buy', body: 'A lead is a business being followed up before it becomes a customer.' },
    { title: 'Log everything', body: 'Add every visit, call and message to the lead’s trail.' },
    { title: 'Make it a customer', body: 'When it is ready to order, ask for it to be confirmed. A manager approves it and its customer account opens.' },
    { title: 'Leads expire', body: 'A lead that is never confirmed is due to be removed, so the list stays real.' },
  ],
  Targets: [
    { title: 'Your number', body: 'The target you are carrying, and how far through it you are.' },
    { title: 'What counts', body: 'Targets count what is invoiced, paid or not.' },
    { title: 'The ranking', body: 'Scorecards ranks every rep and every distributor against target, by value.' },
  ],
  HR: [
    { title: 'Attendance', body: 'See who clocked in each day, and correct a day when it is wrong.' },
    { title: 'Leave', body: 'Approve or decline leave. Annual leave is 10 days a year, after one year with the company.' },
    { title: 'Salaries', body: 'Each person’s monthly salary divided by the working days is their daily rate. Every day they clock in earns it.' },
  ],
  Setup: [
    { title: 'In this order', body: 'Depots first, then products and their OT, MT and SA prices, then distributors, then people. Each step needs the one before it.' },
    { title: 'It ticks itself off', body: 'Each step is marked done as soon as its records exist.' },
    { title: 'Who signs', body: 'Set the approval threshold in Settings, and the roles that sign above it. With no role chosen, orders come to the super admin.' },
  ],
  Settings: [
    { title: 'On every document', body: 'Your company details, bank accounts and logo print on every order, invoice and delivery note.' },
    { title: 'Locked after saving', body: 'Settings lock when saved, so stray typing never reaches a printout. Tap the lock to edit again.' },
    { title: 'Approval threshold', body: 'Orders above this value need a signature before they can move.' },
  ],
  'My tasks': [
    { title: 'Your own list', body: 'Add anything you need to do, give it a day, and flag it Important when it is.' },
    { title: 'Reminders do the watching', body: 'Late invoices, low stock and accounts over their limit are in Reminders. This list is only what you add yourself.' },
    { title: 'Done', body: 'Tick a task when it is done. Finished tasks stay for 30 days, then clear themselves.' },
  ],
};

/** The slides for a page: its own story, or one card from its description. */
export function guideSlides(title: string, description?: string): GuideSlide[] {
  return PAGE_GUIDES[title] ?? (description ? [{ title, body: description }] : []);
}
