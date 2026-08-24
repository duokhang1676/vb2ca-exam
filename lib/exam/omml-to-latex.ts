type XmlNode = {
  tag: string;
  attrs: Record<string, string>;
  children: Array<XmlNode | string>;
};

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function localName(tag: string): string {
  const index = tag.indexOf(":");
  return (index >= 0 ? tag.slice(index + 1) : tag).toLowerCase();
}

function parseAttrs(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /([:\w.]+)\s*=\s*("([^"]*)"|'([^']*)')/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(raw))) {
    attrs[localName(match[1])] = decodeXmlEntities(match[3] ?? match[4] ?? "");
  }
  return attrs;
}

function isTagBoundary(char: string | undefined): boolean {
  return !char || char === ">" || char === "/" || /\s/.test(char);
}

function parseNodes(xml: string): Array<XmlNode | string> {
  const nodes: Array<XmlNode | string> = [];
  let index = 0;
  while (index < xml.length) {
    if (xml[index] !== "<") {
      const next = xml.indexOf("<", index);
      const text = xml.slice(index, next < 0 ? xml.length : next);
      if (text) nodes.push(decodeXmlEntities(text));
      index = next < 0 ? xml.length : next;
      continue;
    }
    if (xml.startsWith("<!--", index)) {
      const end = xml.indexOf("-->", index);
      index = end < 0 ? xml.length : end + 3;
      continue;
    }
    if (xml.startsWith("</", index)) break;

    const gt = xml.indexOf(">", index);
    if (gt < 0) break;
    const raw = xml.slice(index + 1, gt).trim();
    if (raw.startsWith("?") || raw.startsWith("!")) {
      index = gt + 1;
      continue;
    }

    const selfClosing = raw.endsWith("/");
    const body = selfClosing ? raw.slice(0, -1).trim() : raw;
    const space = body.search(/\s/);
    const tag = space < 0 ? body : body.slice(0, space);
    const attrs = parseAttrs(space < 0 ? "" : body.slice(space));
    if (selfClosing) {
      nodes.push({ tag: localName(tag), attrs, children: [] });
      index = gt + 1;
      continue;
    }

    const innerStart = gt + 1;
    let cursor = innerStart;
    let depth = 1;
    let innerEnd = xml.length;
    while (cursor < xml.length && depth > 0) {
      const lt = xml.indexOf("<", cursor);
      if (lt < 0) break;
      if (xml.startsWith(`</${tag}>`, lt)) {
        depth -= 1;
        if (depth === 0) {
          innerEnd = lt;
          cursor = lt + `</${tag}>`.length;
          break;
        }
        cursor = lt + `</${tag}>`.length;
        continue;
      }
      if (xml.startsWith(`<${tag}`, lt) && isTagBoundary(xml[lt + 1 + tag.length])) {
        const openGt = xml.indexOf(">", lt);
        if (openGt < 0) break;
        const openRaw = xml.slice(lt + 1, openGt).trim();
        if (!openRaw.endsWith("/")) depth += 1;
        cursor = openGt + 1;
        continue;
      }
      cursor = lt + 1;
    }

    nodes.push({
      tag: localName(tag),
      attrs,
      children: parseNodes(xml.slice(innerStart, innerEnd)),
    });
    index = cursor;
  }
  return nodes;
}

function childrenOf(node: XmlNode, tag: string): XmlNode[] {
  return node.children.filter(
    (child): child is XmlNode => typeof child !== "string" && child.tag === tag,
  );
}

function firstChild(node: XmlNode, tag: string): XmlNode | undefined {
  return childrenOf(node, tag)[0];
}

function textOf(nodes: Array<XmlNode | string>): string {
  return nodes
    .map((node) => (typeof node === "string" ? node : convertNode(node)))
    .join("");
}

function wrap(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^[A-Za-z0-9]+$/.test(trimmed)) return trimmed;
  return `{${trimmed}}`;
}

const NARY_MAP: Record<string, string> = {
  "∑": "\\sum",
  "∏": "\\prod",
  "∫": "\\int",
  "∮": "\\oint",
  "⋃": "\\bigcup",
  "⋂": "\\bigcap",
  "⋁": "\\bigvee",
  "⋀": "\\bigwedge",
};

const ACCENT_MAP: Record<string, string> = {
  "\u0302": "\\hat",
  "^": "\\hat",
  "\u0303": "\\tilde",
  "~": "\\tilde",
  "\u0304": "\\bar",
  "\u0307": "\\dot",
  "\u0308": "\\ddot",
  "\u20D7": "\\vec",
  "\u2192": "\\vec",
};

function convertNode(node: XmlNode): string {
  switch (node.tag) {
    case "t":
      return node.children.map((child) => (typeof child === "string" ? child : "")).join("");
    case "r":
    case "e":
    case "omath":
    case "omathpara":
    case "box":
    case "borderbox":
    case "phant":
      return textOf(node.children);
    case "f": {
      const num = firstChild(node, "num");
      const den = firstChild(node, "den");
      return `\\frac{${num ? textOf(num.children) : ""}}{${den ? textOf(den.children) : ""}}`;
    }
    case "num":
    case "den":
    case "sub":
    case "sup":
    case "deg":
    case "lim":
    case "fname":
      return textOf(node.children);
    case "rad": {
      const deg = firstChild(node, "deg");
      const base = firstChild(node, "e");
      const inner = base ? textOf(base.children) : textOf(node.children);
      const degree = deg ? textOf(deg.children).trim() : "";
      return degree && degree !== "2"
        ? `\\sqrt[${degree}]{${inner}}`
        : `\\sqrt{${inner}}`;
    }
    case "ssup": {
      const base = firstChild(node, "e");
      const sup = firstChild(node, "sup");
      return `${wrap(base ? textOf(base.children) : "")}^{${sup ? textOf(sup.children) : ""}}`;
    }
    case "ssub": {
      const base = firstChild(node, "e");
      const sub = firstChild(node, "sub");
      return `${wrap(base ? textOf(base.children) : "")}_{${sub ? textOf(sub.children) : ""}}`;
    }
    case "ssubsup": {
      const base = firstChild(node, "e");
      const sub = firstChild(node, "sub");
      const sup = firstChild(node, "sup");
      return `${wrap(base ? textOf(base.children) : "")}_{${sub ? textOf(sub.children) : ""}}^{${sup ? textOf(sup.children) : ""}}`;
    }
    case "spre": {
      const sub = firstChild(node, "sub");
      const sup = firstChild(node, "sup");
      const base = firstChild(node, "e");
      return `{}_{${sub ? textOf(sub.children) : ""}}^{${sup ? textOf(sup.children) : ""}}${base ? textOf(base.children) : ""}`;
    }
    case "nary": {
      const pr = firstChild(node, "narypr");
      const chr = pr ? (firstChild(pr, "chr")?.attrs.val ?? "") : "";
      const op = NARY_MAP[chr] ?? (chr ? `\\operatorname{${chr}}` : "\\int");
      const sub = firstChild(node, "sub");
      const sup = firstChild(node, "sup");
      const arg = firstChild(node, "e");
      return `${op}${sub ? `_{${textOf(sub.children)}}` : ""}${sup ? `^{${textOf(sup.children)}}` : ""} ${arg ? textOf(arg.children) : ""}`;
    }
    case "d": {
      const pr = firstChild(node, "dpr");
      const beg = pr ? firstChild(pr, "begchr")?.attrs.val : "(";
      const end = pr ? firstChild(pr, "endchr")?.attrs.val : ")";
      const inner = childrenOf(node, "e")
        .map((child) => textOf(child.children))
        .join(", ");
      return `\\left${beg || "("}${inner}\\right${end || ")"}`;
    }
    case "m": {
      const rows = childrenOf(node, "mr")
        .map((row) =>
          childrenOf(row, "e")
            .map((cell) => textOf(cell.children))
            .join(" & "),
        )
        .join(" \\\\ ");
      return `\\begin{pmatrix}${rows}\\end{pmatrix}`;
    }
    case "eqarr": {
      const rows = childrenOf(node, "e")
        .map((child) => textOf(child.children))
        .join(" \\\\ ");
      return `\\begin{cases}${rows}\\end{cases}`;
    }
    case "func": {
      const name = firstChild(node, "fname");
      const arg = firstChild(node, "e");
      const fn = name ? textOf(name.children).trim() : "";
      const mapped =
        fn === "sin" ||
        fn === "cos" ||
        fn === "tan" ||
        fn === "ln" ||
        fn === "log" ||
        fn === "lim" ||
        fn === "det"
          ? `\\${fn}`
          : fn
            ? `\\operatorname{${fn}}`
            : "";
      return `${mapped}\\left(${arg ? textOf(arg.children) : ""}\\right)`;
    }
    case "limlow": {
      const base = firstChild(node, "e");
      const lim = firstChild(node, "lim");
      return `\\lim_{${lim ? textOf(lim.children) : ""}} ${base ? textOf(base.children) : ""}`;
    }
    case "limupp": {
      const base = firstChild(node, "e");
      const lim = firstChild(node, "lim");
      return `${base ? textOf(base.children) : ""}^{${lim ? textOf(lim.children) : ""}}`;
    }
    case "acc": {
      const pr = firstChild(node, "accpr");
      const chr = pr ? (firstChild(pr, "chr")?.attrs.val ?? "") : "";
      const cmd = ACCENT_MAP[chr] ?? "\\hat";
      const arg = firstChild(node, "e");
      return `${cmd}{${arg ? textOf(arg.children) : ""}}`;
    }
    case "bar": {
      const arg = firstChild(node, "e");
      return `\\overline{${arg ? textOf(arg.children) : ""}}`;
    }
    case "narypr":
    case "dpr":
    case "accpr":
    case "radpr":
    case "fpr":
    case "mpr":
    case "ctrlpr":
    case "groupchrpr":
    case "ssuppr":
    case "ssubpr":
      return "";
    default:
      return textOf(node.children);
  }
}

export function ommlToLatex(ommlXml: string, display = false): string {
  const body = parseNodes(ommlXml)
    .map((node) => (typeof node === "string" ? node : convertNode(node)))
    .join("")
    .replace(/\s+/g, " ")
    .trim();
  if (!body) return "";
  return display ? `$$${body}$$` : `$${body}$`;
}
