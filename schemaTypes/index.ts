import {localeString, localeText, localeRichText} from './localeStringType'
import {postType} from './postType'
import {eventType} from './eventType'
import {pageMetrics} from './pageMetrics'
import featureFlags from './featureFlags'
import {inlineImage} from './blocks/inlineImage'
import {imageGallery} from './blocks/imageGallery'
import {pullQuote} from './blocks/pullQuote'
import {statCallout} from './blocks/statCallout'

export const schemaTypes = [
  postType,
  eventType,
  localeString,
  localeText,
  localeRichText,
  pageMetrics,
  featureFlags,
  inlineImage,
  imageGallery,
  pullQuote,
  statCallout,
]
