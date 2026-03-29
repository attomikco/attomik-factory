import { NextRequest, NextResponse } from 'next/server';

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const FETCH_TIMEOUT = 8000;

interface ScrapedBrand {
  name: string;
  colors: string[];
  fonts: string[];
  logo: string | null;
  images: { url: string; tag: string }[];
  products: { title: string; description: string; image: string | null }[];
  platform: string | null;
  url: string;
}

async function fetchWithTimeout(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal,
      redirect: 'follow',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timeout);
  }
}

function extractBrandName(html: string): string {
  // og:site_name first
  const ogMatch = html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:site_name["']/i);
  if (ogMatch) return ogMatch[1].trim();

  // <title> fallback — strip common suffixes
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) {
    let title = titleMatch[1].trim();
    title = title.split(/\s*[|–—-]\s*/)[0].trim();
    return title;
  }

  return '';
}

function extractColors(html: string): string[] {
  const colors = new Set<string>();

  // CSS custom properties
  const cssVarPatterns = [
    /--(?:primary|color-primary|brand-color|accent|main-color|theme-color)\s*:\s*(#[0-9a-fA-F]{3,8})/gi,
    /--(?:secondary|color-secondary)\s*:\s*(#[0-9a-fA-F]{3,8})/gi,
  ];
  for (const pattern of cssVarPatterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      colors.add(match[1].toLowerCase());
    }
  }

  // Hex values from style blocks
  const styleBlocks = html.match(/<style[^>]*>[\s\S]*?<\/style>/gi) || [];
  for (const block of styleBlocks) {
    const hexes = block.match(/#[0-9a-fA-F]{6}/g) || [];
    for (const hex of hexes) {
      colors.add(hex.toLowerCase());
    }
  }

  // Meta theme-color
  const themeColor = html.match(/<meta[^>]+name=["']theme-color["'][^>]+content=["'](#[0-9a-fA-F]{3,8})["']/i);
  if (themeColor) colors.add(themeColor[1].toLowerCase());

  // Filter out whites, blacks, grays
  const filtered = Array.from(colors).filter(c => {
    const hex = c.replace('#', '');
    if (hex.length !== 6) return false;
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    // Skip near-white, near-black, and grays
    if (r > 240 && g > 240 && b > 240) return false;
    if (r < 15 && g < 15 && b < 15) return false;
    if (Math.abs(r - g) < 10 && Math.abs(g - b) < 10 && r > 50 && r < 200) return false;
    return true;
  });

  return filtered.slice(0, 5);
}

function extractFonts(html: string): string[] {
  const fonts = new Set<string>();

  // Google Fonts links
  const gfMatches = html.match(/fonts\.googleapis\.com\/css2?\?family=([^"'&]+)/gi) || [];
  for (const match of gfMatches) {
    const familyMatch = match.match(/family=([^"'&]+)/i);
    if (familyMatch) {
      const families = decodeURIComponent(familyMatch[1]).split('|');
      for (const f of families) {
        const name = f.split(':')[0].replace(/\+/g, ' ').trim();
        if (name) fonts.add(name);
      }
    }
  }

  // CSS font-family declarations
  const ffMatches = html.match(/font-family\s*:\s*["']?([^;}"']+)/gi) || [];
  const systemFonts = new Set(['arial', 'helvetica', 'verdana', 'georgia', 'times', 'courier', 'system-ui', 'sans-serif', 'serif', 'monospace', '-apple-system', 'blinkmacsystemfont', 'segoe ui', 'roboto', 'inherit', 'initial']);
  for (const match of ffMatches) {
    const value = match.replace(/font-family\s*:\s*/i, '').trim();
    const first = value.split(',')[0].replace(/["']/g, '').trim();
    if (first && !systemFonts.has(first.toLowerCase())) {
      fonts.add(first);
    }
  }

  return Array.from(fonts).slice(0, 5);
}

function extractImages(html: string): { url: string; tag: string }[] {
  const images: { url: string; score: number; tag: string }[] = [];

  // og:image first
  const ogImage = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  if (ogImage) {
    images.push({ url: ogImage[1], score: 100, tag: 'hero' });
  }

  // img tags
  const imgPattern = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = imgPattern.exec(html)) !== null) {
    const src = match[1];
    const fullTag = match[0].toLowerCase();

    if (src.includes('data:') || src.includes('pixel') || src.includes('spacer') || src.includes('svg+xml')) continue;
    if (src.includes('.svg') && !src.includes('logo')) continue;

    let score = 10;
    if (/product/i.test(fullTag) || /product/i.test(src)) score += 30;
    if (/hero|banner|feature/i.test(fullTag) || /hero|banner|feature/i.test(src)) score += 25;
    if (/lifestyle|collection/i.test(fullTag) || /lifestyle|collection/i.test(src)) score += 15;
    if (/icon|badge|payment|flag/i.test(src)) score -= 20;

    let tag = 'other';
    if (/product/i.test(src)) tag = 'product';
    else if (/hero|banner/i.test(src)) tag = 'hero';
    else if (/lifestyle/i.test(src)) tag = 'lifestyle';
    else if (/collection/i.test(src)) tag = 'collection';

    images.push({ url: src, score, tag });
  }

  // Dedupe by URL, sort by score, top 12
  const seen = new Set<string>();
  return images
    .sort((a, b) => b.score - a.score)
    .filter(img => {
      if (seen.has(img.url)) return false;
      seen.add(img.url);
      return true;
    })
    .slice(0, 12)
    .map(({ url, tag }) => ({ url, tag }));
}

function extractLogo(html: string): string | null {
  // img tags with logo in src/alt/class
  const logoPattern = /<img[^>]+(?:src|alt|class)=["'][^"']*logo[^"']*["'][^>]*src=["']([^"']+)["']/gi;
  let match = logoPattern.exec(html);
  if (match) return match[1];

  // Try src first then look for logo in the rest
  const imgPattern = /<img[^>]+src=["']([^"']*logo[^"']+)["']/gi;
  match = imgPattern.exec(html);
  if (match) return match[1];

  // Fallback to og:image
  const ogImage = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
  if (ogImage) return ogImage[1];

  return null;
}

async function extractProducts(baseUrl: string, html: string): Promise<{ title: string; description: string; image: string | null }[]> {
  // Try Shopify products.json
  try {
    const productsUrl = `${baseUrl.replace(/\/$/, '')}/products.json?limit=6`;
    const productsHtml = await fetchWithTimeout(productsUrl);
    const productsData = JSON.parse(productsHtml);
    if (productsData.products?.length) {
      return productsData.products.slice(0, 6).map((p: { title: string; body_html: string; images: { src: string }[] }) => ({
        title: p.title,
        description: (p.body_html || '').replace(/<[^>]+>/g, '').slice(0, 150),
        image: p.images?.[0]?.src || null,
      }));
    }
  } catch {
    // Not Shopify or no products endpoint
  }

  // JSON-LD fallback
  const jsonLdPattern = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = jsonLdPattern.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1]);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item['@type'] === 'Product' || item['@type'] === 'ItemList') {
          const products = item.itemListElement || [item];
          return products.slice(0, 6).map((p: { name?: string; description?: string; image?: string | string[] }) => ({
            title: p.name || '',
            description: (p.description || '').slice(0, 150),
            image: Array.isArray(p.image) ? p.image[0] : p.image || null,
          }));
        }
      }
    } catch {
      continue;
    }
  }

  return [];
}

function detectPlatform(html: string): string | null {
  if (html.includes('cdn.shopify.com')) return 'shopify';
  if (html.includes('bigcommerce.com')) return 'bigcommerce';
  if (html.includes('woocommerce') || html.includes('wp-content')) return 'woocommerce';
  if (html.includes('squarespace')) return 'squarespace';
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Normalize URL
    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith('http')) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    const html = await fetchWithTimeout(normalizedUrl);

    const [name, colors, fonts, logo, images, products] = await Promise.all([
      Promise.resolve(extractBrandName(html)),
      Promise.resolve(extractColors(html)),
      Promise.resolve(extractFonts(html)),
      Promise.resolve(extractLogo(html)),
      Promise.resolve(extractImages(html)),
      extractProducts(normalizedUrl, html),
    ]);

    const brand: ScrapedBrand = {
      name,
      colors,
      fonts,
      logo,
      images,
      products,
      platform: detectPlatform(html),
      url: normalizedUrl,
    };

    return NextResponse.json({ brand });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Scrape failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
