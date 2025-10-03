import {defineField, defineType} from 'sanity'
import {baseLanguage} from './localeStringType'

export const eventType = defineType({
  name: 'event',
  title: 'Event',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'localeString',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {source: 'title'},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'localeText',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'images',
      title: 'Images',
      type: 'array',
      of: [
        {
          type: 'image',
          options: {
            hotspot: true,
          },
          fields: [
            {
              name: 'alt',
              type: 'string',
              title: 'Alternative text',
              description: 'Important for SEO and accessibility.',
            },
            {
              name: 'caption',
              type: 'localeString',
              title: 'Caption',
            },
          ],
        },
      ],
      validation: (rule) => rule.min(1).error('At least one image is required'),
    }),
    defineField({
      name: 'eventDate',
      title: 'Date of Event',
      type: 'datetime',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'location',
      title: 'Location',
      type: 'string',
      description: 'Event location or venue',
    }),
    defineField({
      name: 'storyLink',
      title: 'Link to Story',
      type: 'reference',
      to: [{type: 'post'}],
      description: 'Link to a related story/post about this event',
    }),
    defineField({
      name: 'externalLink',
      title: 'Link to External Site',
      type: 'url',
      description: 'External website link related to this event',
      validation: (rule) =>
        rule.uri({
          scheme: ['http', 'https'],
        }),
    }),
    defineField({
      name: 'currentGoal',
      title: 'Current Goal Amount',
      type: 'number',
      description: 'Current amount raised for this event',
      validation: (rule) => rule.min(0),
    }),
    defineField({
      name: 'goalTarget',
      title: 'Goal Target',
      type: 'number',
      description: 'Target amount to raise for this event',
      validation: (rule) => rule.min(0).required(),
    }),
    defineField({
      name: 'currency',
      title: 'Currency',
      type: 'string',
      options: {
        list: [
          {title: 'USD ($)', value: 'USD'},
          {title: 'EUR (€)', value: 'EUR'},
          {title: 'COP ($)', value: 'COP'},
        ],
      },
      initialValue: 'COP',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'status',
      title: 'Event Status',
      type: 'string',
      options: {
        list: [
          {title: 'Upcoming', value: 'upcoming'},
          {title: 'Active', value: 'active'},
          {title: 'Completed', value: 'completed'},
          {title: 'Cancelled', value: 'cancelled'},
        ],
      },
      initialValue: 'upcoming',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'publishedAt',
      title: 'Published At',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
    }),
  ],
  preview: {
    select: {
      title: `title.${baseLanguage?.id ?? 'en'}`,
      subtitle: 'eventDate',
      media: 'images.0',
      status: 'status',
      currentGoal: 'currentGoal',
      goalTarget: 'goalTarget',
      currency: 'currency',
    },
    prepare(selection) {
      const {title, subtitle, media, status, currentGoal, goalTarget, currency} = selection
      const eventDate = subtitle ? new Date(subtitle).toLocaleDateString() : 'No date'
      const progress = currentGoal && goalTarget ? `${currentGoal}/${goalTarget} ${currency}` : ''
      
      return {
        title: title || 'Untitled Event',
        subtitle: `${eventDate} • ${status}${progress ? ` • ${progress}` : ''}`,
        media: media,
      }
    },
  },
  orderings: [
    {
      title: 'Event Date, New',
      name: 'eventDateDesc',
      by: [{field: 'eventDate', direction: 'desc'}],
    },
    {
      title: 'Event Date, Old',
      name: 'eventDateAsc',
      by: [{field: 'eventDate', direction: 'asc'}],
    },
    {
      title: 'Published Date, New',
      name: 'publishedAtDesc',
      by: [{field: 'publishedAt', direction: 'desc'}],
    },
  ],
})