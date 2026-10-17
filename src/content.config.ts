import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const posts = defineCollection({
	// Load markdown files from src/content/posts; slug comes from the filename.
	loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
	schema: z.object({
		title: z.string(),
		pubDate: z.coerce.date(),
		// Optional per-post meta description. Without one the layout falls
		// back to the site tagline, which is not a summary of the piece.
		description: z.string().optional(),
	}),
});

export const collections = { posts };
