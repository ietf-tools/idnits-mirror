export const rfcStatusHierarchy = [
  {
    name: 'Internet Standard',
    regex: /internet standard/i,
    weight: 7
  },
  {
    name: 'Draft Standard',
    regex: /draft standard/i,
    weight: 6
  },
  {
    name: 'Proposed Standard',
    regex: /proposed standard/i,
    weight: 5
  },
  {
    name: 'Standards Track',
    regex: /standards track/i,
    weight: 5
  },
  {
    name: 'Best Current Practice',
    regex: /best current practice|bcp/i,
    weight: 4
  },
  {
    name: 'Informational',
    regex: /informational/i,
    weight: 3
  },
  {
    name: 'Experimental',
    regex: /experimental/i,
    weight: 2
  },
  {
    name: 'Historic',
    regex: /historic/i,
    weight: 1
  }
]

/**
 * Extracts the highest status weight based on RFC status hierarchy.
 *
 * @param {string} statusText - The status text to check.
 * @returns {number|null} - The weight of the status or null if not found.
 */
export function getStatusWeight (statusText) {
  const cleanedStatus = statusText.trim()
  for (const status of rfcStatusHierarchy) {
    if (status.regex.test(cleanedStatus)) {
      return status.weight
    }
  }
  return null
}
