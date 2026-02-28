/**
 * Conversion Markdown → HTML minimale (Documentation).
 * Titres, listes, liens, images, gras, italique, paragraphes, lignes horizontales, citations.
 */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Applique les remplacements inline (gras, italique, liens, images) sur un texte déjà échappé partiellement. */
function applyInline(html: string): string {
  let out = html;
  out = out.replace(/\*\*(.+?)\*\*/g, (_, t) => `<strong>${t}</strong>`);
  out = out.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, (_, t) => `<em>${t}</em>`);
  out = out.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, url) => {
    const u = escapeHtml(url.trim());
    const a = escapeHtml(alt.trim());
    return `<img src="${u}" alt="${a}" loading="lazy">`;
  });
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, url) => {
    const u = escapeHtml(url.trim());
    return `<a href="${u}" target="_blank" rel="noopener noreferrer">${escapeHtml(text.trim())}</a>`;
  });
  return out;
}

/** Convertit une chaîne Markdown en HTML (sous-ensemble raisonnable). */
export function markdownToHtml(md: string): string {
  const lines = md.split(/\r?\n/);
  const blocks: string[] = [];
  let listItems: string[] = [];
  let listOrdered = false;
  let inBlockquote = false;
  let blockquoteLines: string[] = [];

  const flushList = () => {
    if (listItems.length === 0) return;
    const tag = listOrdered ? 'ol' : 'ul';
    blocks.push(`<${tag}>\n${listItems.map((li) => '  <li>' + applyInline(escapeHtml(li)) + '</li>').join('\n')}\n</${tag}>`);
    listItems = [];
  };
  const flushBlockquote = () => {
    if (blockquoteLines.length === 0) return;
    blocks.push('<blockquote>\n' + blockquoteLines.map((l) => escapeHtml(l)).join('\n') + '\n</blockquote>');
    blockquoteLines = [];
    inBlockquote = false;
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();

    if (trimmed === '') {
      flushList();
      flushBlockquote();
      continue;
    }

    if (/^#{1,6}\s+.+/.test(trimmed)) {
      flushList();
      flushBlockquote();
      const match = trimmed.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        const text = escapeHtml(match[2].trim());
        blocks.push(`<h${level}>${text}</h${level}>`);
      }
      continue;
    }

    if (/^---$|^\*\*\*$|^___$/.test(trimmed)) {
      flushList();
      flushBlockquote();
      blocks.push('<hr>');
      continue;
    }

    if (trimmed.startsWith('>')) {
      flushList();
      const content = trimmed.slice(1).trim();
      if (!inBlockquote) inBlockquote = true;
      blockquoteLines.push(content);
      continue;
    }
    if (inBlockquote) {
      flushBlockquote();
    }

    if (/^[-*+]\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed)) {
      flushBlockquote();
      const isOrdered = /^\d+\.\s+/.test(trimmed);
      if (listItems.length > 0 && listOrdered !== isOrdered) flushList();
      listOrdered = isOrdered;
      const content = trimmed.replace(/^[-*+]\s+/, '').replace(/^\d+\.\s+/, '');
      listItems.push(content);
      continue;
    }

    flushList();
    flushBlockquote();
    blocks.push('<p>' + applyInline(escapeHtml(trimmed)) + '</p>');
  }

  flushList();
  flushBlockquote();
  return blocks.join('\n\n');
}
