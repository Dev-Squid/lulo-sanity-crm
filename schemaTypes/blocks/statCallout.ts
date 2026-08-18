import {defineField, defineType} from 'sanity'

export const statCallout = defineType({
  name: 'statCallout',
  title: 'Stat callout',
  type: 'object',
  fields: [
    defineField({
      name: 'value',
      title: 'Value',
      type: 'string',
      description: 'The headline figure, for example "450" or "23".',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'label',
      title: 'Label',
      type: 'localeString',
      description: 'What the figure counts, for example "hearts reached". English is required.',
      validation: (rule) =>
        rule.custom((value?: {en?: string}) =>
          value?.en?.trim() ? true : 'English label is required',
        ),
    }),
    defineField({
      name: 'tone',
      title: 'Tone',
      type: 'string',
      options: {
        list: [
          {title: 'Info', value: 'info'},
          {title: 'Success', value: 'success'},
          {title: 'Warning', value: 'warning'},
        ],
      },
      initialValue: 'info',
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: {value: 'value', label: 'label.en', tone: 'tone'},
    prepare({value, label, tone}) {
      return {
        title: `${value || '—'} ${label || ''}`.trim(),
        subtitle: `Stat callout • ${tone || 'info'}`,
      }
    },
  },
})
