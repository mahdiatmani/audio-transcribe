import { createClient } from 'contentful';

// ⚠️ REPLACE THESE WITH YOUR ACTUAL VALUES FROM STEP 4
const SPACE_ID = 'hbaxayqksqth';
const ACCESS_TOKEN = 'OegKA1a49GAaWBrtiZrPL-IcIT3dubVki4vwN9o32W4';

export const contentfulClient = createClient({
  space: SPACE_ID,
  accessToken: ACCESS_TOKEN,
});

// Transform Contentful post to your app format
export const transformContentfulPost = (entry) => {
  return {
    id: entry.sys.id,
    title: entry.fields.title,
    excerpt: entry.fields.excerpt,
    content: documentToHtmlString(entry.fields.content), // We'll handle rich text
    category: entry.fields.category,
    author: entry.fields.author,
    date: new Date(entry.sys.createdAt).toISOString().split('T')[0],
    readTime: entry.fields.readTime,
    image: entry.fields.featuredImage?.fields?.file?.url 
      ? `https:${entry.fields.featuredImage.fields.file.url}`
      : 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=400&fit=crop',
    slug: entry.fields.slug,
    published: entry.fields.published,
  };
};

// Helper to convert Contentful Rich Text to HTML
const documentToHtmlString = (richTextDocument) => {
  if (!richTextDocument) return '';
  
  // Simple converter - you can enhance this
  let html = '';
  
  richTextDocument.content.forEach(node => {
    if (node.nodeType === 'paragraph') {
      const text = node.content?.map(c => c.value || '').join('');
      html += `<p>${text}</p>\n\n`;
    } else if (node.nodeType === 'heading-2') {
      const text = node.content?.map(c => c.value || '').join('');
      html += `<h2>${text}</h2>\n\n`;
    } else if (node.nodeType === 'heading-3') {
      const text = node.content?.map(c => c.value || '').join('');
      html += `<h3>${text}</h3>\n\n`;
    }
  });
  
  return html;
};
