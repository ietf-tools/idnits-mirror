/**
 * Recursively extract all values of a specific tag and attribute from an XML document.
 *
 * This function traverses the XML document to find all elements matching the specified
 * tag name and extracts the values of the specified attribute.
 *
 * @param {Object} node The root node of the XML document to traverse.
 * @param {string} tagName The tag name to search for.
 * @param {string} attributeName The attribute to extract values from.
 * @param {Array<string>} [extractedValues=[]] An array to accumulate found attribute values.
 * @returns {Array<string>} An array of attribute values from matching tags.
 */
export function extractRecursiveByTagAndAttribute (node, tagName, attributeName, extractedValues = []) {
  if (node[tagName]) {
    const tags = Array.isArray(node[tagName]) ? node[tagName] : [node[tagName]]
    tags.forEach(tag => {
      if (tag._attr && tag._attr[attributeName]) {
        extractedValues.push(tag._attr[attributeName])
      }
    })
  }

  Object.keys(node).forEach(key => {
    if (typeof node[key] === 'object') {
      extractRecursiveByTagAndAttribute(node[key], tagName, attributeName, extractedValues)
    }
  })

  return extractedValues
}
