/**
 * The AfterBI blog's own articles, written in, so the blog is never empty and
 * every article is in the sitemap. Articles the owner writes in the console
 * live in Firestore (`blogPosts`) and are merged in by lib/blog.ts.
 *
 * No imports: vite.config.ts reads this file to list every article in the
 * sitemap at build time.
 *
 * BODY FORMAT, kept deliberately small:
 *   blank line         new paragraph
 *   ## Heading         a section heading
 *   - item             a bullet (consecutive lines make one list)
 *   1. item            a numbered step
 *   > text             a pulled out note
 *   **bold**, [text](url) inside any line
 *
 * KEEP IT TRUE: every figure names its source and the month it was published.
 */

export type BlogTopic = 'guides' | 'operations' | 'sales' | 'finance' | 'research' | 'product' | 'people';

export interface BlogPostData {
  slug: string;
  title: string;
  excerpt: string;
  topics: BlogTopic[];
  /** ISO date, yyyy-mm-dd. */
  date: string;
  author: string;
  /** One of the owner's Secondary artworks (marketing/scenes.tsx), or an uploaded picture. */
  scene?: string;
  image?: string;
  /** The pale ground behind the artwork. */
  ground?: string;
  body: string;
  featured?: boolean;
  spotlight?: boolean;
}

export const AUTHOR_TEAM = 'AfterBI Research';

export const BUILT_IN_POSTS: BlogPostData[] = [
  {
    slug: 'sme-report-2026-key-findings',
    title: 'The SME Report 2026: seven numbers every Nigerian business owner should know',
    excerpt: 'Inflation is down to 14.06%, diesel nearly doubled in a year and the policy rate was reset at 23%. What the official numbers mean for anyone who buys, stocks and sells.',
    topics: ['research', 'finance'],
    date: '2026-11-23',
    author: AUTHOR_TEAM,
    scene: 'pie-chart',
    ground: '#fff1b8',
    featured: true,
    spotlight: true,
    body: `We went through the official numbers from the National Bureau of Statistics, the Central Bank of Nigeria, the power regulator and independent researchers to see what it now costs to run a small business in Nigeria. The full, animated version is the [SME Report 2026](/reports/sme-2026). These are the seven figures that matter most.

## 1. There are 39.65 million of us

The last national count, by SMEDAN and the NBS, found 39,654,385 micro, small and medium enterprises in 2020. Micro businesses are 96.9% of them. Together they produce about 46% of Nigeria's GDP and hold 87.9% of its jobs, but account for only 6.21% of exports.

## 2. Inflation is falling, food is not keeping up

Headline inflation was 14.06% in October 2026, the fifth monthly fall in a row (NBS, November 2026). Food inflation was higher, at 19.13%, and core inflation lower, at 10.78%. If you sell food or anything bought with food money, your customers still feel the higher number.

## 3. Diesel rose 86.4% in a year

The NBS Price Watch put diesel at ₦3,277.47 a litre in May 2026, up from ₦1,758.26 in May 2025. Petrol rose 55.31% to ₦1,596.25. Every truck, generator and forklift runs on one of the two.

## 4. Money got cheaper, slowly

The Monetary Policy Rate peaked at 27.50% in November 2024. The first cut came in September 2025, and in September 2026 the CBN reset it at 23%. Bank credit is still expensive, which is why PwC found that 38% of small businesses fund themselves mainly through family and friends.

## 5. Two in three saw demand fall

In PwC's 2024 MSME survey, 67% of businesses said demand for their products fell over two years. The top reasons were high product costs (38%) and customers' low purchasing power (36%).

## 6. Owners are buying their own power

Nigeria imported 1,721 MW of Chinese solar panels in the year to June 2025, second in Africa after South Africa (Ember, August 2025). Ember estimates the diesel a panel saves can pay for the panel itself in about six months.

## 7. Only 19 in 100 employees are engaged

Gallup's 2026 State of the Global Workplace puts engagement in Sub-Saharan Africa at 19%, against 20% worldwide. For a distributor that is the depot team and the field reps who carry the brand.

## What to do with this

None of these numbers is in an owner's control. What is in their control is how clearly they see their own business: the true cost of each carton, the stock actually on the shelves, the money owed and the work the team does each day. Read the [full report](/reports/sme-2026) for every chart and source.`,
  },
  {
    slug: 'landed-cost-per-unit',
    title: 'How to work out your true landed cost per unit, with a worked example',
    excerpt: 'The supplier price is only the start. Freight, clearance and delivery belong in every carton, and leaving them out is how a profitable looking product loses money.',
    topics: ['guides', 'finance'],
    date: '2026-11-18',
    author: AUTHOR_TEAM,
    scene: 'budget-calculator',
    ground: '#d7ecff',
    featured: true,
    body: `Most pricing mistakes in distribution start in the same place: the product is priced from what the supplier charged, not from what it cost to put the product on your shelf. The difference is the landed cost, and in a year when diesel and the dollar both moved, it is often the whole margin.

## What goes into landed cost

Landed cost is everything you paid to get one unit into your depot, ready to sell:

- **Product cost**: what the supplier invoiced, converted at the rate you actually paid.
- **Freight**: shipping or haulage to your country or state.
- **Clearance**: duty, port charges, agent fees and any levies.
- **Delivery**: the last leg from the port or factory to your depot.

Add them up and divide by the number of units in the shipment. That is your cost per unit.

## A worked example

> These figures are made up to show the arithmetic. Use your own invoices.

Say you bring in 1,000 cartons of 24 units each, so 24,000 units.

1. Product cost: ₦36,000,000
2. Freight: ₦3,600,000
3. Clearance: ₦2,400,000
4. Delivery to depot: ₦600,000

The total is ₦42,600,000. Divided by 24,000 units, the landed cost is ₦1,775 a unit. Priced from the supplier invoice alone, you would have used ₦1,500, and every unit sold would carry ₦275 of cost you never priced in.

## From landed cost to selling price

Choose the margin you need, then set the price from the landed cost. A useful check is the formula: selling price = landed cost ÷ (1 − margin). For a 20% margin on ₦1,775 that gives ₦2,218.75 a unit; for 30%, ₦2,535.71.

## Do it for every shipment

Freight and exchange rates change from one shipment to the next. Work the landed cost out again every time stock arrives, not once a year. AfterBI's [Costing](/features) screen does exactly this: enter the product cost, freight, clearance and delivery, and it gives the cost per unit and the price at any margin you choose.`,
  },
  {
    slug: 'pricing-when-inflation-moves',
    title: 'Price for the next restock, not the last: pricing when inflation moves',
    excerpt: 'With food prices still rising 19% a year, a price list set from last month’s purchase cost quietly shrinks every time you restock.',
    topics: ['finance', 'guides'],
    date: '2026-11-12',
    author: AUTHOR_TEAM,
    scene: 'price-tag',
    ground: '#fde0d2',
    spotlight: true,
    body: `Headline inflation in Nigeria fell to 14.06% in October 2026, its fifth monthly fall in a row, according to the National Bureau of Statistics. That is good news, but it is still a price level rising every month, and food inflation was higher at 19.13%. A business that prices from what it paid last time is selling today's stock at yesterday's cost.

## The restock trap

Suppose you bought a line at ₦1,000 a unit and sell it at ₦1,250, a 20% margin on the selling price. When the stock runs out, the next delivery costs ₦1,080. If your price list still says ₦1,250, your margin has dropped to 13.6% without anyone deciding to cut it. Do that across a few restocks and the business is working harder for less.

## Price from replacement cost

The fix is simple to say: price from what it will cost to replace the stock, not what it cost to buy it.

1. Before each price review, ask your suppliers for the next delivery price.
2. Work out the landed cost on that price, including freight and delivery. Our guide to [landed cost per unit](/blog/landed-cost-per-unit) shows how.
3. Apply your margin to the replacement cost.
4. Review the price list on a set day each month, so customers expect changes rather than being surprised by them.

## Keep the tiers in line

If you sell to open trade, modern trade and service accounts at different prices, move them together. A gap that grows between tiers invites customers to buy at the cheaper one. See [open trade vs modern trade](/blog/open-trade-vs-modern-trade) for how the tiers work.

## Watch what customers can carry

In PwC's 2024 MSME survey, 36% of businesses blamed falling demand on customers' low purchasing power. Raising prices in step with costs is necessary, but smaller pack sizes, steady prices on your best sellers and clear notice of changes keep customers buying.`,
  },
  {
    slug: 'setting-distributor-credit-limits',
    title: 'How to set credit limits for distributors without losing good customers',
    excerpt: 'Credit sells goods and also ties up your cash. A limit that follows each distributor’s real payment record protects both.',
    topics: ['finance', 'sales'],
    date: '2026-11-05',
    author: AUTHOR_TEAM,
    scene: 'payment-cards',
    ground: '#ecd5f5',
    body: `Selling on credit is how most distribution in Nigeria moves. It is also where most of the cash goes missing. With the Monetary Policy Rate at 23% (CBN, September 2026), money owed to you for sixty days is money you are paying dearly to borrow somewhere else.

## Start from what they buy and how they pay

A credit limit is the most a distributor may owe you at once. A practical starting point:

1. Take their average monthly purchases over the last three to six months.
2. Multiply by the number of months of credit you offer. Thirty day terms on ₦4,000,000 a month gives a limit near ₦4,000,000.
3. Adjust for their record: lower for a customer who pays late, higher for one who pays early and has grown steadily.

A new distributor starts low, on cash or a small limit, and earns more as they pay on time.

## Make the limit mean something

A limit nobody checks is just a number. Three habits make it work:

- **Check before you approve an order.** If a new order would take the account past its limit, it needs a decision, not an automatic yes.
- **Look at overdue, not just outstanding.** A distributor at 60% of their limit with half of it ninety days late is a bigger risk than one at 95% who pays every month.
- **Review every quarter.** Limits set once and never touched drift away from reality.

## Write down every change

When a limit is raised for a good reason, the reason should be on record with who approved it. In AfterBI every credit limit change is kept in the audit log, and anyone over their limit shows up in Reminders and on the [Credit limits](/features) screen with how far over they are.

## Talk before you stop supply

A good customer who goes over their limit usually has a reason: a slow month, a big order from their own buyer. A call agreeing a payment date keeps the relationship and the cash. Stopping supply without warning loses both.`,
  },
  {
    slug: 'monthly-stock-count',
    title: 'How to run a monthly stock count in a busy depot',
    excerpt: 'A count that is quick, repeatable and never edits your records directly. Here is the routine that works when the depot cannot close for a day.',
    topics: ['operations', 'guides'],
    date: '2026-10-29',
    author: AUTHOR_TEAM,
    scene: 'inventory-boxes',
    ground: '#dcf7e3',
    featured: true,
    spotlight: true,
    body: `Stock you cannot count is money you cannot see. Damaged cartons, expired lines and movements nobody recorded rarely show up until someone counts. A monthly count, done the same way each time, finds them while they are still small.

## Before the count

1. **Pick a time with no movement.** First thing in the morning or after the last dispatch.
2. **Map the depot.** Number the sections and letter the rows, so every count says exactly where it was done: Section 2, Row C.
3. **Print the counting list by location,** not by product name, so counters walk the depot in order.
4. **Finish all paperwork first.** Every delivery received and every order dispatched must be recorded before counting starts, or the count compares against the wrong number.

## During the count

- Count cartons by lines: number of lines times cartons per line, then add any loose cartons.
- Count loose units separately and let them roll into cartons. Twenty five loose units of a 24 unit carton is one carton and one unit.
- Two people per section where you can: one counts, one records.
- Set aside damaged and expired stock and count it on its own line.

## After the count

The count is a report. It should never change your stock records by itself. Compare what was found with what the system held, and look at every difference:

- **Small differences** on fast lines are often timing: an order dispatched but not yet recorded.
- **Large or repeated differences** need a reason before anyone corrects anything.

Corrections then go through a stock adjustment that someone other than the counter approves. In AfterBI an adjustment needs both finance and operations to approve it, and only the second approval moves the stock.

## Make it routine

The first count is slow. By the third, a team that counts the same way every month finds most problems within the week they happen. AfterBI prints a sticker for every carton so a count is done by scanning; see [Stock count](/features).`,
  },
  {
    slug: 'sell-in-vs-sell-out',
    title: 'Sell-in vs sell-out: the number behind the number',
    excerpt: 'What you sold to distributors is not what customers bought. Tracking both shows you where stock is piling up before it turns into returns.',
    topics: ['sales'],
    date: '2026-10-22',
    author: AUTHOR_TEAM,
    scene: 'revenue-growth',
    ground: '#fff6e5',
    body: `Ask a brand how sales went this month and you will usually hear the sell-in: what it invoiced to its distributors. It is a real number and it pays the bills. It is also only half the story.

## Two different sales

- **Sell-in** is what you sold into the channel: your invoices to distributors and wholesalers.
- **Sell-out** is what the channel sold on to retailers and shoppers: what actually left the shelves.

When sell-in runs ahead of sell-out for a few months, stock is piling up somewhere. Sooner or later it comes back as returns, discounts or expired goods, and the distributor buys less next quarter.

## What the gap tells you

- **Sell-in above sell-out:** the channel is overstocked. Slow down, or help them sell through with promotions in the right outlets.
- **Sell-out above sell-in:** the channel is running down its stock. A shortage is coming unless the next orders rise.
- **Both rising together:** healthy growth.

## How to collect sell-out

You will rarely get perfect data, and you do not need it. Start with:

1. Your field reps recording what they see on shelves and what outlets reorder, by outlet and by day.
2. Your largest distributors sharing their monthly sales by product.
3. Modern trade accounts, which usually report sales by store.

## Set targets on what matters

Targets set only on sell-in reward pushing stock into the channel. Pairing them with a sell-out measure rewards reps for stock that actually moves. AfterBI's Sell-out screen lets reps key what left the shelves, by outlet and by day, alongside the orders they raise.`,
  },
  {
    slug: 'diesel-vs-solar-for-depots',
    title: 'Diesel nearly doubled. Is solar now the cheaper way to power a depot?',
    excerpt: 'Diesel rose 86.4% in a year while Nigeria became Africa’s second largest buyer of solar panels. What the numbers say, and what to check before you switch.',
    topics: ['operations', 'research'],
    date: '2026-10-15',
    author: AUTHOR_TEAM,
    scene: 'warehouse',
    ground: '#dcf7e3',
    spotlight: true,
    body: `For many depots, the generator is the second biggest running cost after salaries. In May 2026 the NBS Diesel Price Watch put a litre at ₦3,277.47, up 86.4% from ₦1,758.26 a year earlier.

## Businesses are already moving

Nigeria imported 1,721 MW of solar panels from China in the twelve months to June 2025, overtaking Egypt as Africa's second largest importer after South Africa, according to the energy think tank Ember. Across Africa, imports rose 60% to 15,032 MW.

Ember's estimate is that in Nigeria the diesel a solar panel saves can pay for the panel in about six months. A full system with inverter, batteries and installation takes longer, roughly 18 to 36 months by Ember's figures.

## Grid power is no cheaper fallback

Since April 2024, Band A customers, who are promised at least 20 hours of supply a day, pay around ₦209.50 to ₦225 per kilowatt hour, up from ₦66 before the change (NERC).

## What to check before you switch

1. **Your real load.** List what must run: lights, cold rooms, computers, a forklift charger. Cold rooms and heavy motors change the system size a lot.
2. **Hours of use.** A depot that works days only suits solar better than one running cold storage through the night.
3. **Roof and security.** Panels need a strong, shaded free roof and protection from theft.
4. **The full quote.** Ask for panels, inverter, batteries, installation and maintenance as separate lines, and the expected battery replacement date.
5. **Keep the generator.** Most depots run a hybrid: solar for the day, batteries for the evening, the generator only for long cloudy spells.

## Measure it

Record your diesel spend for three months before and after. If the numbers do not move, the system is undersized or the generator is still doing the work.`,
  },
  {
    slug: 'open-trade-vs-modern-trade',
    title: 'Open trade vs modern trade: why one price list is not enough',
    excerpt: 'Market traders, supermarkets and service accounts buy differently, pay differently and cost different amounts to serve. Your prices should reflect it.',
    topics: ['sales', 'guides'],
    date: '2026-10-08',
    author: AUTHOR_TEAM,
    scene: 'retail-store',
    ground: '#ecd5f5',
    body: `In Nigerian distribution the same carton can travel very different roads to a shopper. Treating every customer the same, on one price list, means some channels quietly pay for others.

## The three common channels

- **Open trade (OT):** open markets, wholesalers and small shops. Large volumes, cash or short credit, low cost to serve per carton, very price sensitive.
- **Modern trade (MT):** supermarkets and chains. Listing fees, longer payment terms, promotions, merchandising and strict delivery windows, but steady, visible sales.
- **Service accounts (SA):** hotels, restaurants, offices and institutions. Smaller drops, specific products, often on account.

## Why they need their own prices

A supermarket that pays in 60 days and expects merchandisers in store costs more to serve than a wholesaler who collects 200 cartons and pays cash. If both get the same price, either the wholesaler is overcharged and buys elsewhere, or the supermarket is undercharged and the account loses money.

## Setting the tiers

1. Start from the [landed cost per unit](/blog/landed-cost-per-unit).
2. Add the cost to serve each channel: delivery, credit days, listing and promotion costs, merchandising.
3. Set a margin per tier on top.
4. Keep the gaps between tiers stable, and review them together.

## Keep it tidy

Each customer should sit in exactly one tier, and an order should take its prices from that tier automatically. In AfterBI every distributor has a tier (OT, MT or SA) and the catalogue prices itself for that tier when an order is raised. Any discount on top shows at approval, so it is seen before anyone signs.`,
  },
  {
    slug: 'cutting-damaged-goods',
    title: 'Damaged goods: where stock is lost between the truck and the shelf',
    excerpt: 'An FAO specialist estimates Nigeria loses about half of its farm produce along the supply chain. Packaged goods lose less, but the same weak points apply.',
    topics: ['operations'],
    date: '2026-09-30',
    author: AUTHOR_TEAM,
    scene: 'delivery-truck',
    ground: '#fde0d2',
    body: `Loss in distribution is rarely one big event. It is a carton crushed at loading, a pallet left in the sun, a line that expired at the back of the store. Each one is small. Together they are a margin.

For farm produce the numbers are stark: an FAO food systems specialist said in 2024 that Nigeria loses around 50% of its agricultural products along the supply chain, through poor storage, handling and transport. IFDC's HortiNigeria study puts spoilage of vegetables after harvest at about 30%. Packaged goods lose far less, but the weak points are the same.

## Where loss happens

- **Loading and offloading:** cartons thrown or stacked too high.
- **Transport:** open trucks in heat and rain, rough roads, poorly tied loads.
- **Storage:** damp floors, no pallets, direct sun, pests.
- **Rotation:** new stock in front of old, so older batches expire.
- **Recording:** stock that left without a document, or a return never recorded.

## Simple fixes that pay back

1. **First expiry, first out.** Put the earliest expiry in front, every time.
2. **Pallets and stacking limits.** Mark the maximum stack height for each product.
3. **Covered transport** for heat or moisture sensitive goods.
4. **Check on arrival.** Count and inspect every delivery against the delivery note before signing. A shortage found at the door is a claim; found a week later, it is a loss.
5. **Record every return,** with its reason: damage, shortage or expiry. The reasons show where to fix things.

## Count to find it

Most loss is only seen at a stock count. A [monthly count](/blog/monthly-stock-count) with variances reviewed line by line turns it from a surprise at year end into a list of fixable problems.`,
  },
  {
    slug: 'field-team-engagement',
    title: 'Keeping a field sales team engaged when only 1 in 5 employees is',
    excerpt: 'Gallup finds 19% of employees in Sub-Saharan Africa engaged at work. For distributors the people most at risk are the reps on the road.',
    topics: ['people', 'sales'],
    date: '2026-09-23',
    author: AUTHOR_TEAM,
    scene: 'team-onboarding',
    ground: '#d7ecff',
    body: `Gallup's State of the Global Workplace 2026 report found that 20% of employees worldwide were engaged at work in 2025, and 19% in Sub-Saharan Africa. In the same region 46% said they felt a lot of stress the day before, against 40% worldwide. The drop in engagement in 2024 came mainly from managers, whose engagement fell from 30% to 27%.

For a distributor the people this matters most for are the field reps and their supervisors. They work alone, on the road, measured on numbers they only partly control.

## What reps need

- **A clear number.** One monthly target they understand, and where they stand against it at any time.
- **Fair measurement.** Credit for what they sold, recorded the day they sold it, not reconstructed at month end.
- **Fewer phone calls and spreadsheets.** Every hour spent re-keying orders is an hour not selling.
- **Recognition.** Being seen at the top of a scorecard does more than most people think.

## What supervisors need

Gallup's advice is to start with managers. A supervisor who can see each rep's day, orders raised, outlets visited and what is overdue, coaches instead of chasing.

## Practical steps

1. Share targets and progress weekly, not just at month end.
2. Pay on time. Salary that arrives when promised is the cheapest motivation there is.
3. Make the tools quick: a rep should raise an order in under a minute.
4. Rank fairly, by value against target, and talk about the top performers.

AfterBI shows each rep their target, their sell-out and their place on the scorecard, and gives HR attendance, leave and a salary countdown everyone can see.`,
  },
  {
    slug: 'chasing-overdue-invoices',
    title: 'A simple routine for chasing overdue invoices',
    excerpt: 'Most late payments are not refusals, they are invoices nobody followed up. A weekly routine collects more and keeps customers on side.',
    topics: ['finance', 'guides'],
    date: '2026-09-16',
    author: AUTHOR_TEAM,
    scene: 'billing-calendar',
    ground: '#fff1b8',
    body: `In PwC's 2024 MSME survey, 35% of small businesses named access to finance as their biggest problem. For many, the cheapest finance they will ever find is the money their own customers already owe them.

## Make the invoice easy to pay

1. Send it the day the goods are delivered.
2. Put the due date, the amount and your bank account on the invoice itself.
3. Name the invoice by its number on every reminder, so the customer can find it.

## A weekly routine

Pick one day a week and go through every open invoice:

- **Due in the next 7 days:** a friendly note with the invoice number and amount.
- **1 to 7 days late:** a call. Most late payments are an invoice that was missed, not a refusal.
- **8 to 30 days late:** agree a payment date and write it down. Follow up the day after if it does not arrive.
- **Over 30 days late:** escalate to the owner or manager, and hold new orders until there is a plan.

## Keep records straight

Record every payment the day it lands, including part payments, so the balance is always right. If a price was wrong on a delivered order, issue a credit note rather than editing the invoice, so the history stays clear.

## Look at the pattern

Each month, look at which customers pay late and by how much. Use it when you [set credit limits](/blog/setting-distributor-credit-limits). AfterBI lists every overdue invoice with the days it is late, and puts the late ones in Reminders so nobody has to remember who to call.`,
  },
  {
    slug: 'stock-counts-with-carton-stickers',
    title: 'Product update: stock counts by scanning carton stickers',
    excerpt: 'AfterBI now prints a sticker for every product’s cartons. Scan it during a count to open the product instantly; the count never changes stock on its own.',
    topics: ['product', 'operations'],
    date: '2026-09-09',
    author: 'AfterBI Product',
    scene: 'product-activation',
    ground: '#dcf7e3',
    body: `Counting stock by reading product names off cartons is slow and easy to get wrong. AfterBI now prints a sticker for each product's cartons. During a stock count, scanning the sticker opens the product straight away.

## How it works

1. Print the stickers from **Stickers** and put one on each carton face.
2. Start a count from **Stock count** and choose the depot.
3. Choose where you are counting: the section, then the row.
4. Scan a sticker, then enter lines times cartons per line, plus any loose units. Loose units roll into cartons by themselves.

## A count is a report

Counting never changes stock. When the count is closed, the variance shows what the system held against what was found, with differences in red. Any correction goes through a stock adjustment, and an adjustment needs both finance and operations to approve it before the balance moves.

## Why the sticker only works in AfterBI

The sticker is a plain barcode readable only inside AfterBI, for your company. Any other scanner reads characters that mean nothing, so it gives away nothing about your products or prices.

Read our guide to running a [monthly stock count](/blog/monthly-stock-count) for the routine that gets the most from it.`,
  },
];
