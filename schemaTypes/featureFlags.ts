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
  ],
}
