import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPhone(phone: string | number | undefined | null) {
  if (!phone) return ""
  let clean = String(phone).replace(/\D/g, "")

  // Auto-prepend '0' if 9 digits and starts with 6, 8, 9 (Thai mobile pattern)
  if (clean.length === 9 && /^[689]/.test(clean)) {
    clean = "0" + clean
  }

  // Mobile (10 digits): 000-000-0000
  if (clean.length === 10) {
    return `${clean.slice(0, 3)}-${clean.slice(3, 6)}-${clean.slice(6)}`
  }

  // Fixed line (9 digits starting with 0): 0X-XXX-XXXX or 02-XXX-XXXX
  if (clean.length === 9 && clean.startsWith("0")) {
    return `${clean.slice(0, 2)}-${clean.slice(2, 5)}-${clean.slice(5)}`
  }

  return String(phone)
}

/**
 * Formats a date value (Excel serial number or ISO string) to dd/mm/yyyy
 */
export function formatDate(val: any): string {
  if (!val) return ""

  let date: Date

  // Handle Excel serial number (number of days since Jan 1, 1900)
  const num = Number(val)
  if (!isNaN(num) && num > 20000 && num < 60000) {
    // Excel date offset
    date = new Date((num - 25569) * 86400 * 1000)
  } else {
    date = new Date(val)
  }

  if (isNaN(date.getTime())) return String(val)

  const dd = String(date.getDate()).padStart(2, "0")
  const mm = String(date.getMonth() + 1).padStart(2, "0")
  const yyyy = date.getFullYear()

  return `${dd}/${mm}/${yyyy}`
}

/**
 * Calculates duration from startDate to now, returning "x ปี y เดือน"
 */
export function calculateDuration(startDate: any): string {
  if (!startDate) return ""

  let date: Date
  const num = Number(startDate)
  // Handle Excel serial number
  if (!isNaN(num) && num > 20000 && num < 60000) {
    date = new Date((num - 25569) * 86400 * 1000)
  } else {
    date = new Date(startDate)
  }

  if (isNaN(date.getTime())) return ""

  const now = new Date()
  let years = now.getFullYear() - date.getFullYear()
  let months = now.getMonth() - date.getMonth()

  if (months < 0) {
    years--
    months += 12
  }

  // Handle case where day of month is earlier than start day
  if (now.getDate() < date.getDate()) {
    months--
    if (months < 0) {
      years--
      months += 12
    }
  }

  if (years === 0 && months === 0) return "น้อยกว่า 1 เดือน"

  let res = ""
  if (years > 0) res += `${years} ปี `
  if (months > 0) res += `${months} เดือน`

  return res.trim()
}

/**
 * Parses a date value (Excel serial, dd/mm/yyyy string, or ISO string) into a Date object.
 * Returns null if parsing fails.
 */
function parseAnyDate(val: any): Date | null {
  if (!val) return null

  const num = Number(val)
  // Handle Excel serial number
  if (!isNaN(num) && num > 20000 && num < 60000) {
    return new Date((num - 25569) * 86400 * 1000)
  }

  const str = String(val).trim()

  // Handle dd/mm/yyyy format
  const ddmmyyyy = str.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/)
  if (ddmmyyyy) {
    const [, dd, mm, yyyy] = ddmmyyyy
    const d = new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd))
    if (!isNaN(d.getTime())) return d
  }

  // Fallback to Date constructor
  const d = new Date(str)
  return isNaN(d.getTime()) ? null : d
}

/**
 * Calculates Year of Service from Hiring Date to now.
 * Returns formatted string like "5 Y 3 M" or "0 Y 8 M"
 */
export function calculateYearOfService(hiringDate: any): string {
  const date = parseAnyDate(hiringDate)
  if (!date) return ""

  const now = new Date()
  let years = now.getFullYear() - date.getFullYear()
  let months = now.getMonth() - date.getMonth()

  if (months < 0) {
    years--
    months += 12
  }

  if (now.getDate() < date.getDate()) {
    months--
    if (months < 0) {
      years--
      months += 12
    }
  }

  if (years < 0) return ""

  return `${years} Y ${months} M`
}

/**
 * Returns numeric years of service from Hiring Date (for bucket calculations).
 * Returns NaN if the date is invalid.
 */
export function getServiceYears(hiringDate: any): number {
  const date = parseAnyDate(hiringDate)
  if (!date) return NaN

  const now = new Date()
  let years = now.getFullYear() - date.getFullYear()
  let months = now.getMonth() - date.getMonth()

  if (months < 0) {
    years--
    months += 12
  }

  if (now.getDate() < date.getDate()) {
    months--
    if (months < 0) {
      years--
      months += 12
    }
  }

  return years + months / 12
}
