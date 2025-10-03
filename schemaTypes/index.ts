import {localeString, localeText, localeRichText} from './localeStringType'
import {postType} from './postType'
import {eventType} from './eventType'
import {pageMetrics} from './pageMetrics'
import featureFlags from './featureFlags'

export const schemaTypes = [
  postType,
  eventType,
  localeString,
  localeText,
  localeRichText,
  pageMetrics,
  featureFlags,
]
