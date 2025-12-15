import { createClient } from 'contentful';
import { documentToHtmlString } from '@contentful/rich-text-html-renderer';
import { BLOCKS, INLINES } from '@contentful/rich-text-types';

// ⚠️ REPLACE THESE WITH YOUR ACTUAL VALUES
const SPACE_ID = 'hbaxayqksqth';
const ACCESS_TOKEN = 'OegKA1a49GAaWBrtiZrPL-IcIT3dubVki4vwN9o32W4';

export const contentfulClient = createClient({
  space: SPACE_ID,
  accessToken: ACCESS_TOKEN,
});

// Options to correctly render images and links inside Rich Text
const renderOptions = {
  renderNode: {
    // 1. Render Images (Embedded Assets)
    [BLOCKS.EMBEDDED_ASSET]: (node) => {
      // Check if the asset is resolved and has a file
      const { file, title } = node.data.target.fields || {};
      const imageUrl = file?.url ? `https:${file.url}` : '';
      
      if (!imageUrl) return ''; // Skip if no image found

      return `
        <figure class="my-8">
          <img 
            src="${imageUrl}" 
            alt="${title || 'Blog post image'}" 
            class="w-full h-auto rounded-xl shadow-lg"
            loading="lazy"
          />
          ${title ? `<figcaption class="text-center text-gray-500 text-sm mt-2">${title}</figcaption>` : ''}
        </figure>
      `;
    },
    // 2. Render Internal Links (Links to other blog posts)
    [INLINES.ENTRY_HYPERLINK]: (node) => {
      const { slug } = node.data.target.fields || {};
      const text = node.content[0].value;
      
      if (!slug) return `<span>${text}</span>`;
      
      // Use your app's hash routing format
      return `<a href="#/blog/${slug}" class="text-cyan-400 hover:text-cyan-300 font-medium transition-colors">${text}</a>`;
    },
    // 3. Render External Links (Standard web links)
    [INLINES.HYPERLINK]: (node, next) => {
      return `<a href="${node.data.uri}" target="_blank" rel="noopener noreferrer" class="text-cyan-400 hover:text-cyan-300 underline decoration-cyan-500/30 hover:decoration-cyan-300 transition-all">${next(node.content)}</a>`;
    }
  }
};

// Transform Contentful post to your app format
export const transformContentfulPost = (entry) => {
  // Helper to find the image field (handles different naming conventions)
  const getImage = (fields) => {
    const asset = fields.featuredImage || fields.image || fields.coverImage;
    return asset?.fields?.file?.url ? `https:${asset.fields.file.url}` : null;
  };

  const imageUrl = getImage(entry.fields);

  return {
    id: entry.sys.id,
    title: entry.fields.title,
    excerpt: entry.fields.excerpt,
    // Pass the renderOptions to documentToHtmlString
    content: entry.fields.content 
      ? documentToHtmlString(entry.fields.content, renderOptions)
      : '',
    category: entry.fields.category || 'AI Trends',
    author: entry.fields.author || 'AI Need Tools Team',
    date: new Date(entry.sys.createdAt).toISOString().split('T')[0],
    readTime: entry.fields.readTime || '5 min read',
    image: imageUrl || 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=400&fit=crop',
    slug: entry.fields.slug,
    published: entry.fields.published !== false,
  };
};
