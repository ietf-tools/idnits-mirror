import { ValidationError } from '../helpers/error.mjs'

export async function parse (rawText, filename) {
  let data
  try {

  } catch (err) {
    throw new ValidationError('TXT_PARSING_FAILED', err.message)
  }

  return {
    type: 'txt',
    filename,
    body: rawText,
    data
  }
}
