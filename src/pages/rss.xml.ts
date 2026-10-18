import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { excerptOf, postHtml, stripEmbeds } from '../lib/post-text';

// RSS: the only subscription channel a blog has. Generated at build time like
// everything else -- no endpoint, no runtime.
//
// Items carry content rather than the excerpt: a feed reader shows the whole
// post, so a subscriber gets the piece without visiting the site.

const SITE_TITLE = 'chenxiaotian';
const AUTHOR = 'chenxiaotian';

const posts = (await getCollection('posts')).sort(
	(a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
);

export async function GET(context: APIContext) {
	return rss({
		title: SITE_TITLE,
		// The site tagline, matching <meta name="description"> on the index.
		description: '写作与笔记',
		site: context.site ?? new URL('https://chenxiaotian.com'),
		// Match the site's own URLs. rss() appends a trailing slash to every
		// item link unless told not to, which would point the feed at
		// /<slug>/ while the page's canonical is /<slug>.
		trailingSlash: false,
		items: posts.map((post) => {
			const html = stripEmbeds(postHtml(post));
			return {
				title: post.data.title,
				pubDate: post.data.pubDate,
				// The canonical form, /<slug>: trailingSlash 'never' in
				// astro.config, and the <link rel="canonical"> of the page
				// agrees. Held to that only by trailingSlash: false above.
				link: `/${post.id}`,
				// First paragraph, capped: a feed reader shows it beside the
				// title before the entry is opened, and an uncapped paragraph
				// turns that preview into a wall of text.
				description: excerptOf(html),
				content: html,
				// No <author> field: the RSS spec wants an email there, and
				// readers that honour it show the whole string or mangle it.
				// dc:creator (set below) takes a plain name, which is what
				// this site has -- the article pages carry no byline either.
			};
		}),
		// The language lets readers pick the right shaping rules for Chinese.
		//
		// customData is injected raw, so the dc namespace has to be declared
		// here or the dc:creator below it is an unbound prefix and the feed
		// fails to parse -- which makes it useless to every reader.
		customData: `<language>zh-CN</language><dc:creator xmlns:dc="http://purl.org/dc/elements/1.1/">${AUTHOR}</dc:creator>`,
	});
}
