import {localeString, localeText, localeRichText} from './localeStringType'
import {postType} from './postType'
import {pageMetrics} from './pageMetrics'
import featureFlags from './featureFlags'

export const schemaTypes = [
  postType,
  localeString,
  localeText,
  localeRichText,
  pageMetrics,
  featureFlags,
]
