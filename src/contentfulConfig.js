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
    // 1. Render Images (Embedded Assets) inside the text
    [BLOCKS.EMBEDDED_ASSET]: (node) => {
      // Safety check: ensure fields exist
      const fields = node.data?.target?.fields;
      if (!fields || !fields.file) {
        console.warn('⚠️ Embedded asset missing fields:', node);
        return ''; 
      }

      const { file, title } = fields;
      // Handle URL protocol
      const imageUrl = file.url.startsWith('//') ? `https:${file.url}` : file.url;
      
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
    // 2. Render Internal Links
    [INLINES.ENTRY_HYPERLINK]: (node) => {
      const { slug } = node.data.target.fields || {};
      const text = node.content[0].value;
      if (!slug) return `<span>${text}</span>`;
      return `<a href="#/blog/${slug}" class="text-cyan-400 hover:text-cyan-300 font-medium transition-colors">${text}</a>`;
    },
    // 3. Render External Links
    [INLINES.HYPERLINK]: (node, next) => {
      return `<a href="${node.data.uri}" target="_blank" rel="noopener noreferrer" class="text-cyan-400 hover:text-cyan-300 underline decoration-cyan-500/30 hover:decoration-cyan-300 transition-all">${next(node.content)}</a>`;
    }
  }
};

// Transform Contentful post to your app format
export const transformContentfulPost = (entry) => {
  // 🔍 DEBUG: Log the entry to console so you can see the field names
  console.log(`Processing Post: "${entry.fields.title}"`, entry.fields);

  // HELPER: "Smart" Image Finder
  const getSmartImage = (fields) => {
    // 1. Try common names
    let asset = fields.featuredImage || fields.image || fields.coverImage || fields.banner || fields.thumbnail || fields.picture;

    // 2. If not found, look for ANY field that is an Asset
    if (!asset) {
      const allFields = Object.values(fields);
      asset = allFields.find(f => f?.sys?.type === 'Asset' || (f?.fields?.file?.contentType?.startsWith('image')));
    }

    // 3. Extract URL if asset exists
    if (asset?.fields?.file?.url) {
       const url = asset.fields.file.url;
       return url.startsWith('//') ? `https:${url}` : url;
    }
    
    return null;
  };

  const imageUrl = getSmartImage(entry.fields);

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
    // Use found image OR fallback
    image: imageUrl || 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=400&fit=crop',
    slug: entry.fields.slug,
    published: entry.fields.published !== false,
  };
};
