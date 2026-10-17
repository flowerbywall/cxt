// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
	// Custom domain (worth.ee-style deploy), so no `base` subpath: assets and
	// routes stay at the root and the local dev server keeps clean paths.
	site: 'https://chenxiaotian.com',
	trailingSlash: 'never',
	integrations: [
		sitemap({
			// A 404 is a real file (/404.html) but not a real page: listing it
			// advertises a URL that by definition does not resolve. Every other
			// route on the site is genuine, so this filter only has to drop the
			// one.
			filter: (page) => !page.endsWith('/404'),
		}),
	],
	build: {
		// 'file' emits dist/<slug>.html. The default ('directory') emits
		// dist/<slug>/index.html, which Cloudflare Pages serves at /<slug>/ and
		// answers /<slug> with a 308 -- so with trailingSlash 'never' every
		// canonical, sitemap entry and feed link pointed at a redirect.
		// Astro.url.pathname then carries the .html, which Base.astro strips.
		format: 'file',
		// One stylesheet, inlined and minified into every page. A separate CSS
		// request would be render-blocking; inlining takes it off the critical
		// path entirely.
		inlineStylesheets: 'always',
	},
});
