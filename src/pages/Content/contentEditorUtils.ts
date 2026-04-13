import type { ContentBlock } from '../../types/notification.types';

// ─── SLUG / FILENAME ────────────────────────────────
export function slugify(text: string): string {
  const trMap: Record<string, string> = {
    'ç': 'c', 'Ç': 'c', 'ğ': 'g', 'Ğ': 'g', 'ı': 'i', 'İ': 'i',
    'ö': 'o', 'Ö': 'o', 'ş': 's', 'Ş': 's', 'ü': 'u', 'Ü': 'u',
  };
  return text
    .split('').map(c => trMap[c] || c).join('')
    .toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function sanitizeFileName(fileName: string): string {
  const dotIndex = fileName.lastIndexOf('.');
  const baseName = dotIndex >= 0 ? fileName.slice(0, dotIndex) : fileName;
  const extension = dotIndex >= 0 ? fileName.slice(dotIndex + 1).toLowerCase() : 'jpg';
  const safeBase = slugify(baseName) || 'image';
  return `${safeBase}.${extension.replace(/[^a-z0-9]/g, '') || 'jpg'}`;
}

export function buildUploadPath(prefix: string, file: File): string {
  const timestamp = Date.now();
  return `${prefix}/${timestamp}-${sanitizeFileName(file.name)}`;
}

// ─── HTML HELPERS ───────────────────────────────────
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function sanitizeHtml(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  doc.querySelectorAll('script, style, iframe, link, object, embed, form, input, button, noscript').forEach(el => el.remove());
  doc.querySelectorAll('img').forEach((img) => {
    const currentSrc = img.getAttribute('src')?.trim();
    const dataSrc = img.getAttribute('data-src')?.trim()
      || img.getAttribute('data-original')?.trim()
      || img.getAttribute('data-lazy-src')?.trim();
    const srcSet = img.getAttribute('srcset')?.split(',')[0]?.trim().split(' ')[0];
    const fallbackSrc = currentSrc || dataSrc || srcSet || '';
    if (fallbackSrc) {
      img.setAttribute('src', fallbackSrc.startsWith('//') ? `https:${fallbackSrc}` : fallbackSrc);
    }
  });
  doc.querySelectorAll('*').forEach(el => {
    Array.from(el.attributes).forEach(attr => {
      if (attr.name.startsWith('on') || (attr.name === 'href' && attr.value.trim().toLowerCase().startsWith('javascript:'))) {
        el.removeAttribute(attr.name);
      }
    });
  });
  return doc.body.innerHTML;
}

export function isDataUrl(value?: string | null): boolean {
  return !!value && value.trim().toLowerCase().startsWith('data:');
}

export function looksLikeHtml(value: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

export function looksLikeImageUrl(value: string): boolean {
  return /^https?:\/\/\S+\.(png|jpe?g|gif|webp|avif|svg)(\?\S*)?$/i.test(value.trim());
}

export function normalizeHtmlInput(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (looksLikeHtml(trimmed)) return sanitizeHtml(trimmed);
  if (looksLikeImageUrl(trimmed)) return `<p><img src="${escapeHtml(trimmed)}" alt="" /></p>`;
  return value;
}

export function stripHtmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

// ─── BLOCK ↔ HTML CONVERSION ────────────────────────
export function htmlToBlocks(html?: string): ContentBlock[] {
  if (!html?.trim()) return [];

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const nodes = Array.from(doc.body.children);
  const blocks: ContentBlock[] = [];

  for (const node of nodes) {
    const tag = node.tagName.toLowerCase();

    if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
      blocks.push({ type: 'heading', level: Number(tag[1]) as 1 | 2 | 3, text: (node.textContent || '').trim() });
      continue;
    }
    if (tag === 'p') {
      const containsMedia = node.querySelector('img, figure, video, audio, iframe');
      if (containsMedia) {
        const sanitized = sanitizeHtml(node.outerHTML);
        if (sanitized.trim()) blocks.push({ type: 'paragraph', text: sanitized });
        continue;
      }
      const text = stripHtmlToText(node.innerHTML);
      if (text) blocks.push({ type: 'paragraph', text });
      continue;
    }
    if (tag === 'ul' || tag === 'ol') {
      const items = Array.from(node.querySelectorAll('li')).map(li => (li.textContent || '').trim()).filter(Boolean);
      if (items.length) blocks.push({ type: tag === 'ul' ? 'bullet_list' : 'ordered_list', items });
      continue;
    }
    if (tag === 'figure') {
      const img = node.querySelector('img');
      if (img?.getAttribute('src')) {
        blocks.push({ type: 'image', url: img.getAttribute('src') || '', caption: node.querySelector('figcaption')?.textContent?.trim() || '', width: 'full' });
      }
      continue;
    }
    if (tag === 'img') {
      const src = node.getAttribute('src');
      if (src) blocks.push({ type: 'image', url: src, caption: node.getAttribute('alt') || '', width: 'full' });
      continue;
    }
    if (tag === 'hr') { blocks.push({ type: 'divider' }); continue; }
    if (tag === 'blockquote') {
      const variant = node.getAttribute('data-callout');
      const footer = node.querySelector('footer');
      const footerText = footer?.textContent?.trim() || '';
      if (variant === 'info' || variant === 'warning' || variant === 'success') {
        blocks.push({ type: 'callout', text: stripHtmlToText(node.innerHTML), variant });
      } else {
        const quoteText = stripHtmlToText(node.innerHTML.replace(footer?.outerHTML || '', ''));
        blocks.push({ type: 'quote', text: quoteText, author: footerText });
      }
      continue;
    }
    const fallbackText = stripHtmlToText(node.innerHTML);
    if (fallbackText) blocks.push({ type: 'paragraph', text: fallbackText });
  }

  if (blocks.length > 0) return blocks;
  const text = stripHtmlToText(html);
  return text ? [{ type: 'paragraph', text }] : [];
}

export function blocksToHtml(blocks: ContentBlock[]): string {
  return blocks
    .map((block) => {
      switch (block.type) {
        case 'heading':
          return `<h${block.level}>${escapeHtml(block.text || '')}</h${block.level}>`;
        case 'paragraph':
          return `<p>${escapeHtml(block.text || '').replace(/\n/g, '<br />')}</p>`;
        case 'bullet_list':
          return `<ul>${block.items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
        case 'ordered_list':
          return `<ol>${block.items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ol>`;
        case 'image':
          if (!block.url) return '';
          return `<figure><img src="${escapeHtml(block.url)}" alt="${escapeHtml(block.caption || '')}" />${block.caption ? `<figcaption>${escapeHtml(block.caption)}</figcaption>` : ''}</figure>`;
        case 'divider':
          return '<hr />';
        case 'callout':
          return `<blockquote data-callout="${block.variant}">${escapeHtml(block.text || '').replace(/\n/g, '<br />')}</blockquote>`;
        case 'quote':
          return `<blockquote><p>${escapeHtml(block.text || '').replace(/\n/g, '<br />')}</p>${block.author ? `<footer>${escapeHtml(block.author)}</footer>` : ''}</blockquote>`;
        default:
          return '';
      }
    })
    .filter(Boolean)
    .join('\n');
}

export function blocksToPlainText(blocks: ContentBlock[]): string {
  return blocks
    .map((block) => {
      switch (block.type) {
        case 'heading':
        case 'paragraph':
        case 'callout':
        case 'quote':
          return [block.text, block.type === 'quote' ? block.author : ''].filter(Boolean).join(' ');
        case 'bullet_list':
        case 'ordered_list':
          return block.items.join(' ');
        case 'image':
          return block.caption || '';
        default:
          return '';
      }
    })
    .filter(Boolean)
    .join(' ');
}

export function hasMeaningfulBlockContent(blocks: ContentBlock[]): boolean {
  return blocks.some((block) => {
    switch (block.type) {
      case 'heading':
      case 'paragraph':
      case 'callout':
      case 'quote':
        return Boolean(block.text?.trim() || (block.type === 'quote' && block.author?.trim()));
      case 'bullet_list':
      case 'ordered_list':
        return block.items.some((item) => item.trim());
      case 'image':
        return Boolean(block.url?.trim());
      case 'divider':
        return true;
      default:
        return false;
    }
  });
}
