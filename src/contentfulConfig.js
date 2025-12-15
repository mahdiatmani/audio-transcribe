import { createClient } from 'contentful';
import { documentToHtmlString } from '@contentful/rich-text-html-renderer';

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
    content: entry.fields.content 
      ? documentToHtmlString(entry.fields.content)
      : '',
    category: entry.fields.category || 'AI Trends',
    author: entry.fields.author || 'AI Need Tools Team',
    date: new Date(entry.sys.createdAt).toISOString().split('T')[0],
    readTime: entry.fields.readTime || '5 min read',
    image: entry.fields.featuredImage?.fields?.file?.url 
      ? `https:${entry.fields.featuredImage.fields.file.url}`
      : 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=400&fit=crop',
    slug: entry.fields.slug,
    published: entry.fields.published !== false,
  };
};
