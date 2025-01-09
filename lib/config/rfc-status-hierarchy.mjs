export const rfcStatusHierarchy = [
  {
    name: 'Internet Standard',
    regex: /internet standard/ig,
    weight: 7
  },
  {
    name: 'Draft Standard',
    regex: /draft standard/ig,
    weight: 6
  },
  {
    name: 'Proposed Standard',
    regex: /proposed standard/ig,
    weight: 5
  },
  {
    name: 'Standards Track',
    regex: /standards track/ig,
    weight: 5
  },
  {
    name: 'Best Current Practice',
    regex: /best current practice|bcp/ig,
    weight: 4
  },
  {
    name: 'Informational',
    regex: /informational/ig,
    weight: 3
  },
  {
    name: 'Experimental',
    regex: /experimental/ig,
    weight: 2
  },
  {
    name: 'Historic',
    regex: /historic/ig,
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
  for (const status of rfcStatusHierarchy) {
    if (status.regex.test(statusText)) {
      return status.weight
    }
  }
  return null
}
