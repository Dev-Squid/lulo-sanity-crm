import {defineField, defineType} from 'sanity'

export const pageMetrics = defineType({
  name: 'pageMetrics',
  title: 'Page Metrics',
  type: 'document',
  fields: [
    defineField({
      name: 'animalesHelped',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'foodDelivered',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'sheltersHelpeed',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'medicalDosis',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
  ],
})
