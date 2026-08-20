import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {table} from '@sanity/table'
import {schemaTypes} from './schemaTypes'

export default defineConfig({
  name: 'default',
  title: 'Lulo Animal Foundation',
  studioHost: 'fundacionlulo',
  projectId: 'tp4j6k1k',
  // The dataset can be overridden for local development via SANITY_STUDIO_DATASET
  // in .env.local (git-ignored). The override is deliberately honoured only in dev:
  // the Sanity CLI injects SANITY_STUDIO_* at build and deploy time too, so without
  // this guard a deploy from a checkout carrying .env.local would publish the hosted
  // Studio pointed at a non-production dataset. Anything but dev gets production.
  dataset:
    (process.env.NODE_ENV === 'development' && process.env.SANITY_STUDIO_DATASET) || 'production',

  plugins: [structureTool(), visionTool(), table()],

  schema: {
    types: schemaTypes,
  },
})
