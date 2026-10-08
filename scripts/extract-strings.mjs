/**
 * Collects every user-facing English string in src/ into i18n/strings.json.
 * Run: node scripts/extract-strings.mjs
 * Translations live in src/i18n/zh.json (English text -> Chinese text).
 * Interpolated text is stored with {0}, {1} ... placeholders.
 */
import ts from 'typescript';
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SRC = path.join(ROOT, 'src');
const SKIP_FILES = /(\.d\.ts$|\/i18n\/|\/data\/|firestoreRest|firebase\.ts$|tenant\.ts$|queryCache|lockZoom|pwa\.ts$|cloudinary|lib\/proposal\.ts|lib\/print\.ts|staffCardPdf|businessCard\.ts|siteJsonLd|download\.ts|lib\/theme\.ts|lib\/demo\.ts|lib\/programme\.ts|lib\/i18n\.ts|LanguageSwitch)/;
const SKIP_ATTR = new Set(['className','class','key','id','type','name','href','to','src','role','autoComplete','inputMode','rel','target','htmlFor','method','accept','viewBox','d','fill','stroke','strokeLinecap','strokeLinejoin','strokeWidth','strokeDasharray','path','lang','as','tone','variant','size','align','kind','shape','layout','value','defaultValue','encType','loading','decoding','preserveAspectRatio','xmlns','dir','mode','icon','side','pattern','min','max','step','form','tabIndex','format','slot','imgClassName','inner','spellCheck','hrefLang','property','content','charSet','media','crossOrigin','sizes','fetchPriority','referrerPolicy','allow']);
const SKIP_PROP = new Set(['className','id','to','href','src','icon','key','slug','path','tone','kind','role','status','group','image','art','field','value','type','variant','size','href','url','collection','orderBy','where','format','unit','currency','color','accent','mode','layout','align','sort','dir','pattern']);

const out = new Map();
const add = (text, file, jsx = false) => {
  const t = text.replace(/\s+/g, ' ').trim();
  if (!t || !/[A-Za-z]/.test(t)) return;
  if (!(jsx ? /[A-Za-z]{2}/.test(t) : keep(t))) return;
  const prev = out.get(t);
  if (prev) prev.add(file); else out.set(t, new Set([file]));
};

function keep(t) {
  if (t.length > 900) return true;
  if (/gradient\(|rgba?\(|var\(--|<\/?[a-z]+[ >]|\bpx\b|^\d+(\.\d+)?(px|rem|em|%|ms|s)$/.test(t)) return false;
  if (/^https?:|^mailto:|^tel:|^\/|^#|^\.|^@/.test(t)) return false;
  if (/^[a-z0-9_.\-/:]+$/.test(t)) return false; // identifiers, keys, paths
  if (/^[a-z]+[A-Z][A-Za-z0-9]*$/.test(t)) return false; // camelCase
  if (/^[A-Z0-9_]+$/.test(t) && t.length > 1 && !/^[A-Z]{2,5}$/.test(t)) return false; // CONSTANT
  if (/^#[0-9a-f]{3,8}$/i.test(t)) return false;
  if (/[{};]\s*$|^\s*[<{]/.test(t) && /[:;]/.test(t) && !/ [a-z]+ [a-z]+ /.test(t)) return false; // css/html
  const words = t.split(' ');
  const classy = words.filter((w) => /^(!?[a-z0-9]+:)*!?-?[a-z]+(-[a-z0-9.\[\]#%/()_,]+)+$|^(flex|grid|hidden|block|inline|relative|absolute|fixed|sticky|truncate|uppercase|italic|underline|shrink-0|grow|tabular|tap|ink|site|surface-card|surface-page|transition|rounded|border|shadow|ring|container|sr-only)$/.test(w)).length;
  if (classy >= Math.max(1, words.length * 0.5)) return false;
  if (/^[a-z][\w-]*\.(tsx?|png|jpe?g|svg|webp|pdf|csv|json)$/i.test(t)) return false;
  if (/^(GET|POST|PUT|DELETE)$/.test(t)) return false;
  return true;
}

function templateText(node) {
  let s = node.head.text;
  node.templateSpans.forEach((span, i) => {
    s += `{${i}}` + span.literal.text;
  });
  return s;
}

function attrName(node) {
  let p = node.parent;
  while (p && (ts.isParenthesizedExpression(p) || ts.isConditionalExpression(p) || ts.isBinaryExpression(p) || ts.isJsxExpression(p) || ts.isCallExpression(p) && /^(cn|clsx)$/.test(p.expression.getText()))) {
    if (ts.isJsxAttribute(p.parent ?? {})) return p.parent.name.getText();
    p = p.parent;
  }
  if (p && ts.isJsxAttribute(p)) return p.name.getText();
  return null;
}

function propName(node) {
  let p = node.parent;
  while (p && (ts.isParenthesizedExpression(p) || ts.isConditionalExpression(p) || ts.isBinaryExpression(p) || ts.isAsExpression(p))) p = p.parent;
  if (p && ts.isPropertyAssignment(p) && p.initializer) return p.name.getText().replace(/['"]/g, '');
  return null;
}

function skipContext(node) {
  for (let p = node.parent; p; p = p.parent) {
    if (ts.isImportDeclaration(p) || ts.isExportDeclaration(p)) return true;
    if (ts.isCallExpression(p)) {
      const callee = p.expression.getText();
      if (/^console\.|^(cn|clsx|import|require|doc\.|collection|where|orderBy|query|getDoc|setDoc|updateDoc|addDoc|deleteDoc|restGet|restWhere|localStorage|sessionStorage|document\.(querySelector|getElementById|createElement)|.*addEventListener|.*removeEventListener|.*\.setAttribute|.*\.getAttribute|new URL|.*\.startsWith|.*\.endsWith|.*\.includes|.*\.replace|.*\.split|.*\.join|.*\.toLocaleString|.*toLocaleDateString|Intl\.|.*\.setFont|.*\.addImage|.*\.output|.*\.save)\b/.test(callee)) return true;
    }
    if (ts.isElementAccessExpression(p)) return true;
    if (ts.isCaseClause(p) && p.expression && p.expression === node) return true;
    if (ts.isBinaryExpression(p) && /===|!==|==|!=/.test(p.operatorToken.getText())) return true;
    if (ts.isTypeNode && ts.isTypeNode(p)) return true;
    if (ts.isLiteralTypeNode(p)) return true;
    if (ts.isJsxAttribute(p) && SKIP_ATTR.has(p.name.getText())) return true;
    if (ts.isPropertyAssignment(p) && SKIP_PROP.has(p.name.getText().replace(/['"]/g, ''))) return true;
    if (ts.isTaggedTemplateExpression(p)) return true;
    if (ts.isStatement(p) || ts.isSourceFile(p)) break;
  }
  return false;
}

function walk(file) {
  const text = readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const rel = path.relative(ROOT, file);
  const visit = (node) => {
    if (ts.isJsxText(node)) add(node.text, rel, true);
    else if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      if (!skipContext(node)) add(node.text, rel);
    } else if (ts.isTemplateExpression(node)) {
      if (!skipContext(node)) add(templateText(node), rel);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return files(full);
    return /\.(tsx?|)$/.test(name) && /\.tsx?$/.test(name) && !SKIP_FILES.test(full) ? [full] : [];
  });
}

files(SRC).forEach(walk);
const list = [...out.entries()].map(([text, set]) => ({ text, files: [...set] })).sort((a, b) => a.files[0].localeCompare(b.files[0]) || a.text.localeCompare(b.text));
mkdirSync(path.join(ROOT, 'i18n'), { recursive: true });
writeFileSync(path.join(ROOT, 'i18n', 'strings.json'), JSON.stringify(list, null, 1));
console.log(list.length, 'strings');
