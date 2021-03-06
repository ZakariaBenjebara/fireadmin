import { get, isFunction } from 'lodash'
const functions = require('firebase-functions')
const algoliasearch = require('algoliasearch')

// Authenticate to Algolia Database.
// TODO: Make sure you configure the `algolia.app_id` and `algolia.api_key`
// Google Cloud environment variables.
const client = algoliasearch(
  functions.config().algolia.app_id,
  functions.config().algolia.api_key
)

/**
 * Creates a function indexs item within Algolia from a function event.
 * @param  {String} indexName - name of Algolia index under which to place item
 * @param  {String} idParam - Parameter which contains id
 * @param  {Function} indexCondition - Function that decides conditions under
 * which item is index. If provided, it must return truthy in order for item
 * to be indexed.
 * @return {Function} Cloud Function event handler function
 */
export function createIndexFunc({
  indexName,
  idParam,
  indexCondition,
  otherPromises = []
}) {
  return event => {
    const index = client.initIndex(indexName)
    const objectID = get(event, `params.${idParam}`)
    // Remove the item from algolia if it is being deleted
    if (!event.data.exists) {
      console.log(
        `Object with ID: ${objectID} being deleted, deleting from Algolia index: ${indexName} ... `
      )
      return index.deleteObject(objectID).then(() => {
        console.log(
          `Object with ID: ${objectID} successfully deleted from index: ${indexName} on Algolia. Exiting.`
        )
        return null
      })
    }
    const data = event.data.data()
    // Check if index indexCondition is a function
    if (isFunction(indexCondition)) {
      // Only re-index if indexCondition function returns truthy
      if (!indexCondition(data, event.data)) {
        console.log('Item index indexCondition provided and not met. Exiting.')
        return null
      }
      console.log('Item index indexCondition provided met. Indexing item.')
    }
    const firebaseObject = Object.assign({}, data, { objectID })
    return Promise.all([
      index.saveObject(firebaseObject).then(algoliaResponse => {
        console.log(
          `Object with ID: ${objectID} successfully saved to index: ${indexName} on Algolia successfully. Exiting.`
        )
        return algoliaResponse
      }),
      ...otherPromises.map(otherPromiseCreator =>
        otherPromiseCreator(data, objectID)
      )
    ]).then(() => firebaseObject)
  }
}
