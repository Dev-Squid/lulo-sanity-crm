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
  // Override locally with SANITY_STUDIO_DATASET in .env.local (git-ignored) to
  // point the Studio at a non-production dataset. Defaults to production.
  dataset: process.env.SANITY_STUDIO_DATASET || 'production',

  plugins: [structureTool(), visionTool(), table()],

  schema: {
    types: schemaTypes,
  },
})
