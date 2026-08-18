import {defineField, defineType} from 'sanity'

export const inlineImage = defineType({
  name: 'inlineImage',
  title: 'Image',
  type: 'object',
  fields: [
    defineField({
      name: 'image',
      title: 'Image',
      type: 'image',
      options: {hotspot: true},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'alt',
      title: 'Alternative text',
      type: 'localeString',
      description: 'Describes the image for screen readers and search engines. English is required.',
      validation: (rule) =>
        rule.custom((value?: {en?: string}) =>
          value?.en?.trim() ? true : 'English alternative text is required',
        ),
    }),
    defineField({
      name: 'caption',
      title: 'Caption',
      type: 'localeString',
      description: 'Optional. Shown beneath the image.',
    }),
    defineField({
      name: 'size',
      title: 'Size',
      type: 'string',
      options: {
        list: [
          {title: 'Inline (text width)', value: 'inline'},
          {title: 'Wide', value: 'wide'},
          {title: 'Full width', value: 'full'},
        ],
      },
      initialValue: 'wide',
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: {media: 'image', caption: 'caption.en', alt: 'alt.en', size: 'size'},
    prepare({media, caption, alt, size}) {
      return {
        title: caption || alt || 'Image',
        subtitle: `Image • ${size || 'wide'}`,
        media,
      }
    },
  },
})
