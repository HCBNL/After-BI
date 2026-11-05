# AfterBI type manual

How text looks inside the AfterBI app: one scale, two typefaces, four weights. Every screen uses these steps and nothing in between, so a title always looks like a title and a label always looks like a label, on every page and every device.

The public website (`src/components/marketing`, `src/pages/public`) and printed documents (`src/lib/print.ts`, ID card previews) have their own larger, louder rules and are not covered here.

## 1. Typefaces

| Face | Role | Where |
|---|---|---|
| **Inter** | The worker. Clear at small sizes, built for screens, with figures that line up. | Everything by default: navigation, labels, forms, tables, body text, buttons. |
| **Sora** | The voice. Wider and more geometric, so a large line reads as the brand, not as a big label. | Page titles in the coloured panel, the large figures on stat cards, the wordmark. Never below 20px. |

Numbers that are compared or added up (money, counts, quantities) use **tabular figures** (`tabular`), so columns line up.

## 2. The scale

Ten steps. Each carries its own line height and letter spacing (set in `src/index.css`, `@theme`). Use the token, never a pixel value.

| Token | Size / line | Weight | Use it for |
|---|---|---|---|
| `text-micro` | 11 / 14 | 600, often UPPERCASE + 0.08em tracking | Section labels in the sidebar, table column headers, badges, tiny counters. |
| `text-caption` | 12 / 16 | 400 or 500 | Meta lines: dates, "raised by", hints under fields, helper text, role under a name. |
| `text-label` | 13 / 18 | 500 | Sidebar items, form labels, small buttons, secondary text in lists. |
| `text-body` | 14 / 21 | 400 (600 for the key value in a row) | Default reading text, table cells, list rows, inputs, standard buttons. |
| `text-lead` | 15 / 22 | 600 | Card titles, list item titles, the first line of a notification. |
| `text-title` | 17 / 24 | 600 | Drawer and modal titles, section headings inside a page. |
| `text-heading` | 20 / 26 | 600 to 700 | Large section headings, the big date on the calendar card. |
| `text-headline` | 24 / 30 | 700, Sora | Stat card figures on phones, greeting lines. |
| `text-display` | 30 / 36 | 700, Sora | The page title in the coloured panel; stat figures on laptops. |
| `text-jumbo` | 40 / 44 | 700, Sora | One per screen at most: a hero figure. |

## 3. Weight carries rank

Weight, not size alone, tells the eye what matters. Four weights only:

- **400 Regular**: reading. Body text, descriptions, table cells.
- **500 Medium**: controls and navigation. Sidebar items, form labels, menu rows, bottom bar labels.
- **600 Semibold**: titles and emphasis. Card and drawer titles, the active sidebar item, the key value in a row, buttons.
- **700 Bold**: only page titles, large figures and money totals.

800 and 900 are not used in the app. Nothing at `text-label` size or smaller is bold.

## 4. Left is quieter than right

The navigation frames the work; it should never compete with it.

- **Sidebar**: items `text-label` at 500 in the secondary colour; only the active item steps up to 600 and the primary colour. Group names are `text-micro`, uppercase, muted. The organisation name and your role are `text-caption`.
- **Main content**: the page title is the loudest thing on screen (`text-display`, Sora 700). Card titles are `text-lead` 600. Body is `text-body` 400.
- **Bottom bar (phones)**: `text-micro` at 500.

## 5. Colour of text

Three levels, already in the theme: `text-primary` (titles, values), `text-secondary` (body, sidebar items), `text-muted` (captions, hints, column headers). On coloured panels: white for titles, white at 75% for descriptions, white at 60% for labels.

## 6. Patterns

- **A list row**: title `text-lead`/600 or `text-body`/600, detail `text-label` secondary, meta `text-caption` muted.
- **A stat card**: label `text-micro` uppercase muted, figure `text-headline sm:text-display` Sora 700 tabular, hint `text-caption` muted.
- **A form field**: label `text-label`/500 secondary, input `text-body`, help behind the (i), error `text-caption` red.
- **A table**: headers `text-micro` uppercase muted, cells `text-body`, the key column 600, money tabular.
- **A drawer or modal**: title `text-title`/600, body `text-body`.

## 7. Rules

1. Use a token. A new pixel size is a new step on the scale, and the scale does not grow without updating this manual.
2. One loud thing per screen: the page title, or a single hero figure.
3. Never set body text below 13px on a phone.
4. Uppercase only at `text-micro`, always with letter spacing.
5. Money and counts are always tabular.
