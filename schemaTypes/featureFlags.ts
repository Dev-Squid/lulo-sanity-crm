// schemas/featureFlags.js

export default {
  name: 'featureFlags',
  title: 'Feature Flags',
  type: 'document',
  fields: [
    {
      name: 'useNewDonationSystem',
      title: 'Use New Donation System',
      type: 'boolean',
      description:
        'Toggle to enable the new donation modal with donor box or switch back to go fund me.',
    },
    {
      name: 'showDonationSection',
      title: 'Show Donation Section',
      type: 'boolean',
      initialValue: true,
      description:
        'Controls visibility of the donation section. When off, the section is not rendered at all.',
    },
    {
      name: 'useEmergencyCallToAction',
      title: 'Use Emergency Call To Action',
      type: 'boolean',
      initialValue: false,
      description:
        'When on, replaces the standard call to action with the emergency variant.',
    },
  ],
}
