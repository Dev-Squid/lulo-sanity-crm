import {defineField, defineType} from 'sanity'

export const pullQuote = defineType({
  name: 'pullQuote',
  title: 'Pull quote',
  type: 'object',
  fields: [
    defineField({
      name: 'quote',
      title: 'Quote',
      type: 'localeText',
      validation: (rule) =>
        rule.custom((value?: {en?: string}) =>
          value?.en?.trim() ? true : 'English quote text is required',
        ),
    }),
    defineField({
      name: 'attribution',
      title: 'Attribution',
      type: 'string',
      description: 'Who said it. Personal names are not translated, so this is a single value.',
    }),
  ],
  preview: {
    select: {quote: 'quote.en', attribution: 'attribution'},
    prepare({quote, attribution}) {
      const text = (quote || '').replace(/\s+/g, ' ').trim()
      const clipped = text.length > 60 ? `${text.slice(0, 60)}…` : text
      return {
        title: clipped ? `"${clipped}"` : 'Pull quote',
        subtitle: attribution || 'Pull quote',
      }
    },
  },
})
