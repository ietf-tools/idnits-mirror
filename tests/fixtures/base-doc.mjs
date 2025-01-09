export const baseTXTDoc = {
  type: 'txt',
  filename: '',
  body: '',
  data: {
    pageCount: 1,
    content: {
      abstract: ['This document obsoletes RFC 5678.']
    },
    extractedElements: {
      obsoletesRfc: ['5678'],
      updatesRfc: ['1234']
    },
    header: {
      authors: [],
      date: null,
      source: null,
      expires: null
    },
    title: null,
    slug: null
  }
}

export const baseXMLDoc = {
  type: 'xml',
  filename: '',
  externalEntities: [],
  data: {
    rfc: { }
  }
}
