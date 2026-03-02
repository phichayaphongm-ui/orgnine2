export interface OrgRecord {
  'ST ID': string
  'Title': string
  'Store Manager Name'?: string
  'Gender'?: string
  'Position (TH)'?: string
  'Mobile'?: string
  'Age'?: string
  'Hi Educ Level'?: string
  'Hiring Date'?: string
  'Year of Service'?: string
  'Line Manager name'?: string
  "LM's Position title"?: string
  'Region': string
  'AGM Mobile'?: string
  'AGM Image URL'?: string
  'Store Manager Image URL'?: string
  _imageFileId?: string
  _localImage?: string
}

export interface AgmRecord {
  'AGM Name': string
  'AGM ZONE': string
  'Mobile Phone': string
  Email?: string
  'Image URL': string
  Remark: string
  Position?: string
  _imageFileId?: string
  _localImage?: string
}

export type PageId = 'dash' | 'org' | 'agm' | 'data'
