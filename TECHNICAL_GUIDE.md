# Lulo Animal Foundation - Technical Setup Guide

## 🏗️ Current Architecture

### Content Management System

- **Platform**: Sanity Studio v3
- **Languages**: English (default) + Spanish
- **Deployment**: Hosted Studio at `fundacionlulo.sanity.studio`
- **Dataset**: Production

### Schema Overview

#### Post Type (`postType.ts`)

```typescript
{
  name: 'post',
  type: 'document',
  fields: [
    { name: 'title', type: 'localeString', required: true },
    { name: 'slug', type: 'slug', required: true },
    { name: 'publishedAt', type: 'datetime', required: true },
    { name: 'image', type: 'image', optional: true },
    { name: 'body', type: 'localeRichText', optional: true }
  ]
}
```

#### Localization Types (`localeStringType.ts`)

- **localeString**: Short text (titles, labels)
- **localeText**: Longer plain text (descriptions)
- **localeRichText**: Rich text content (main article body)

### Data Structure

```json
{
  "title": {
    "en": "English Title",
    "es": "Título en Español"
  },
  "body": {
    "en": [{ "_type": "block", "children": [...] }],
    "es": [{ "_type": "block", "children": [...] }]
  }
}
```

## 🔧 Development

### Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev
# Runs on http://localhost:3333

# Build for production
npm run build

# Deploy to Sanity
npm run deploy
```

### Environment Configuration

- **Project ID**: `tp4j6k1k`
- **Dataset**: `production`
- **Studio Host**: `fundacionlulo`

## 📊 Content Querying

### Basic Queries (GROQ)

```groq
// Get all posts with English content
*[_type == "post"]{
  "title": title.en,
  "body": body.en,
  slug,
  publishedAt,
  image
}

// Get posts with language fallback
*[_type == "post"]{
  "title": coalesce(title[$language], title.en),
  "body": coalesce(body[$language], body.en),
  slug,
  publishedAt,
  image
}

// Get posts for specific language
*[_type == "post"]{
  "title": title.es,
  "body": body.es,
  slug,
  publishedAt,
  image
}[defined(title)]
```

## 🎯 Content Guidelines for Developers

### Adding New Fields

When adding new fields that need localization:

1. **String fields**: Use `localeString` type
2. **Text fields**: Use `localeText` type
3. **Rich text**: Use `localeRichText` type
4. **Non-localized**: Use standard Sanity types

### Validation Rules

```typescript
defineField({
  name: 'title',
  type: 'localeString',
  validation: (rule) =>
    rule.required().custom((value) => {
      if (!value?.en) return 'English title is required'
      if (!value?.es) return 'Spanish title is required'
      return true
    }),
})
```

## 🚀 Deployment

### Studio Deployment

```bash
# Deploy studio to Sanity's CDN
sanity deploy

# Custom domain deployment
sanity deploy --studio-host=your-custom-domain
```

### Content Delivery

- **API Endpoint**: `https://tp4j6k1k.api.sanity.io/v2021-10-21/data/query/production`
- **CDN**: Images served via Sanity's CDN
- **Real-time**: Use Sanity's real-time API for live updates

## 📋 Maintenance Tasks

### Regular Maintenance

- Monitor content creation patterns
- Backup content regularly
- Update dependencies monthly
- Review user permissions quarterly

### Content Moderation

- Review new posts for quality
- Ensure both languages are complete
- Validate image quality and appropriateness
- Check for SEO optimization

---

_For questions about this technical setup, contact the development team._
