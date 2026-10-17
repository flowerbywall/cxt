// Shared helpers for reading a rendered post: its HTML as a string, and the
// plain-text excerpt that both the feed and <meta name="description"> are
// built from. Two callers need each of them -- rss.xml.ts and [slug].astro --
// and two copies of a caption-stripping regex drift apart the moment either
// one is edited, which is how this file came to exist.

/** The rendered HTML of a collection entry, as a plain string.
 *
 *  The glob loader pre-renders the markdown at build time and hangs the
 *  result on entry.rendered.html, which is not on the public type, so every
 *  reader has to cast for it. One cast in one place beats the same cast
 *  written out at each call site: they drift the moment the loader's shape
 *  changes.
 *
 *  Throws if the loader did not pre-render: the fallback would be raw
 *  markdown, which excerptOf() cannot parse and would silently produce an
 *  empty string. */
export function postHtml(post: unknown): string {
	const entry = post as { rendered?: { html?: string } };
	if (!entry.rendered?.html) throw new Error('postHtml: entry.rendered.html is missing -- did the loader pre-render?');
	return entry.rendered.html;
}

/** Drops the embed placeholders: a feed has nowhere to put a video or an
 *  iframe, and the caption alone reads as an orphaned fragment. */
export function stripEmbeds(html: string): string {
	return html.replace(/<div class="embed"[\s\S]*?<\/div>\s*<\/div>/g, '').trim();
}

/** The excerpt cap. Both callers go through excerptOf(), so the feed and
 *  the meta description are the same length by construction. */
const EXCERPT_LIMIT = 110;

/** First paragraph as plain text, capped at EXCERPT_LIMIT characters.
 *
 *  [slug].astro reads its meta description through this same function, so
 *  the feed excerpt and the description are one sentence.
 *
 *  Truncated on a character count rather than at a sentence boundary:
 *  cutting mid-sentence is the honest signal that this is an excerpt,
 *  whereas a "clever" trim to the nearest period reads as a sentence the
 *  author wrote. */
export function excerptOf(html: string): string {
	const match = /<p>([\s\S]*?)<\/p>/.exec(html);
	if (!match) return '';
	const text = match[1]
		.replace(/<[^>]*>/g, '')
		.replace(/&#39;/g, "'")
		.replace(/&quot;/g, '"')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&amp;/g, '&')
		.replace(/\s+/g, ' ')
		.trim();
	return text.slice(0, EXCERPT_LIMIT);
}
