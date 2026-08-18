import {defineArrayMember, defineField, defineType} from 'sanity'

export const imageGallery = defineType({
  name: 'imageGallery',
  title: 'Image gallery',
  type: 'object',
  fields: [
    defineField({
      name: 'images',
      title: 'Images',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'image',
          options: {hotspot: true},
          fields: [
            {
              name: 'alt',
              title: 'Alternative text',
              type: 'localeString',
            },
            {
              name: 'caption',
              title: 'Caption',
              type: 'localeString',
            },
          ],
        }),
      ],
      validation: (rule) =>
        rule.required().min(2).max(6).error('A gallery holds between 2 and 6 images'),
    }),
  ],
  preview: {
    select: {images: 'images', media: 'images.0'},
    prepare({images, media}) {
      const count = Array.isArray(images) ? images.length : 0
      return {
        title: `Gallery (${count} image${count === 1 ? '' : 's'})`,
        subtitle: 'Image gallery',
        media,
      }
    },
  },
})
