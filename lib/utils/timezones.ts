/**
 * Comprehensive timezone list with user-friendly labels
 * Format: { value: IANA timezone, label: Display name with offset }
 */

export interface TimezoneOption {
  value: string
  label: string
  offset: string
  abbr: string
}

export function getTimezoneOptions(): TimezoneOption[] {
  const now = new Date()
  
  return [
    // UTC
    { value: 'UTC', label: 'UTC (Coordinated Universal Time)', offset: '+00:00', abbr: 'UTC' },
    
    // North America - Eastern
    { value: 'America/New_York', label: 'EST - Eastern Time (US & Canada)', offset: getOffset('America/New_York', now), abbr: 'EST/EDT' },
    { value: 'America/Toronto', label: 'EST - Toronto', offset: getOffset('America/Toronto', now), abbr: 'EST/EDT' },
    { value: 'America/Detroit', label: 'EST - Detroit', offset: getOffset('America/Detroit', now), abbr: 'EST/EDT' },
    
    // North America - Central
    { value: 'America/Chicago', label: 'CST - Central Time (US & Canada)', offset: getOffset('America/Chicago', now), abbr: 'CST/CDT' },
    { value: 'America/Mexico_City', label: 'CST - Mexico City', offset: getOffset('America/Mexico_City', now), abbr: 'CST/CDT' },
    
    // North America - Mountain
    { value: 'America/Denver', label: 'MST - Mountain Time (US & Canada)', offset: getOffset('America/Denver', now), abbr: 'MST/MDT' },
    { value: 'America/Phoenix', label: 'MST - Arizona (no DST)', offset: getOffset('America/Phoenix', now), abbr: 'MST' },
    
    // North America - Pacific
    { value: 'America/Los_Angeles', label: 'PST - Pacific Time (US & Canada)', offset: getOffset('America/Los_Angeles', now), abbr: 'PST/PDT' },
    { value: 'America/Vancouver', label: 'PST - Vancouver', offset: getOffset('America/Vancouver', now), abbr: 'PST/PDT' },
    
    // North America - Alaska & Hawaii
    { value: 'America/Anchorage', label: 'AKST - Alaska', offset: getOffset('America/Anchorage', now), abbr: 'AKST/AKDT' },
    { value: 'Pacific/Honolulu', label: 'HST - Hawaii', offset: getOffset('Pacific/Honolulu', now), abbr: 'HST' },
    
    // Europe - Western
    { value: 'Europe/London', label: 'GMT - London, Dublin', offset: getOffset('Europe/London', now), abbr: 'GMT/BST' },
    { value: 'Europe/Lisbon', label: 'WET - Lisbon', offset: getOffset('Europe/Lisbon', now), abbr: 'WET/WEST' },
    
    // Europe - Central
    { value: 'Europe/Paris', label: 'CET - Paris, Brussels, Amsterdam', offset: getOffset('Europe/Paris', now), abbr: 'CET/CEST' },
    { value: 'Europe/Berlin', label: 'CET - Berlin, Frankfurt', offset: getOffset('Europe/Berlin', now), abbr: 'CET/CEST' },
    { value: 'Europe/Rome', label: 'CET - Rome, Milan', offset: getOffset('Europe/Rome', now), abbr: 'CET/CEST' },
    { value: 'Europe/Madrid', label: 'CET - Madrid', offset: getOffset('Europe/Madrid', now), abbr: 'CET/CEST' },
    { value: 'Europe/Vienna', label: 'CET - Vienna', offset: getOffset('Europe/Vienna', now), abbr: 'CET/CEST' },
    { value: 'Europe/Prague', label: 'CET - Prague', offset: getOffset('Europe/Prague', now), abbr: 'CET/CEST' },
    { value: 'Europe/Budapest', label: 'CET - Budapest', offset: getOffset('Europe/Budapest', now), abbr: 'CET/CEST' },
    { value: 'Europe/Warsaw', label: 'CET - Warsaw', offset: getOffset('Europe/Warsaw', now), abbr: 'CET/CEST' },
    { value: 'Europe/Stockholm', label: 'CET - Stockholm', offset: getOffset('Europe/Stockholm', now), abbr: 'CET/CEST' },
    { value: 'Europe/Copenhagen', label: 'CET - Copenhagen', offset: getOffset('Europe/Copenhagen', now), abbr: 'CET/CEST' },
    { value: 'Europe/Zurich', label: 'CET - Zurich', offset: getOffset('Europe/Zurich', now), abbr: 'CET/CEST' },
    
    // Europe - Eastern
    { value: 'Europe/Athens', label: 'EET - Athens', offset: getOffset('Europe/Athens', now), abbr: 'EET/EEST' },
    { value: 'Europe/Bucharest', label: 'EET - Bucharest', offset: getOffset('Europe/Bucharest', now), abbr: 'EET/EEST' },
    { value: 'Europe/Helsinki', label: 'EET - Helsinki', offset: getOffset('Europe/Helsinki', now), abbr: 'EET/EEST' },
    { value: 'Europe/Istanbul', label: 'TRT - Istanbul', offset: getOffset('Europe/Istanbul', now), abbr: 'TRT' },
    { value: 'Europe/Moscow', label: 'MSK - Moscow', offset: getOffset('Europe/Moscow', now), abbr: 'MSK' },
    
    // Asia - Middle East
    { value: 'Asia/Dubai', label: 'GST - Dubai, Abu Dhabi', offset: getOffset('Asia/Dubai', now), abbr: 'GST' },
    { value: 'Asia/Jerusalem', label: 'IST - Jerusalem', offset: getOffset('Asia/Jerusalem', now), abbr: 'IST' },
    { value: 'Asia/Riyadh', label: 'AST - Riyadh', offset: getOffset('Asia/Riyadh', now), abbr: 'AST' },
    
    // Asia - South
    { value: 'Asia/Kolkata', label: 'IST - India (Mumbai, Delhi)', offset: getOffset('Asia/Kolkata', now), abbr: 'IST' },
    { value: 'Asia/Karachi', label: 'PKT - Karachi', offset: getOffset('Asia/Karachi', now), abbr: 'PKT' },
    { value: 'Asia/Dhaka', label: 'BST - Dhaka', offset: getOffset('Asia/Dhaka', now), abbr: 'BST' },
    
    // Asia - Southeast
    { value: 'Asia/Bangkok', label: 'ICT - Bangkok', offset: getOffset('Asia/Bangkok', now), abbr: 'ICT' },
    { value: 'Asia/Singapore', label: 'SGT - Singapore', offset: getOffset('Asia/Singapore', now), abbr: 'SGT' },
    { value: 'Asia/Jakarta', label: 'WIB - Jakarta', offset: getOffset('Asia/Jakarta', now), abbr: 'WIB' },
    { value: 'Asia/Manila', label: 'PHT - Manila', offset: getOffset('Asia/Manila', now), abbr: 'PHT' },
    { value: 'Asia/Ho_Chi_Minh', label: 'ICT - Ho Chi Minh', offset: getOffset('Asia/Ho_Chi_Minh', now), abbr: 'ICT' },
    
    // Asia - East
    { value: 'Asia/Hong_Kong', label: 'HKT - Hong Kong', offset: getOffset('Asia/Hong_Kong', now), abbr: 'HKT' },
    { value: 'Asia/Shanghai', label: 'CST - Beijing, Shanghai', offset: getOffset('Asia/Shanghai', now), abbr: 'CST' },
    { value: 'Asia/Taipei', label: 'CST - Taipei', offset: getOffset('Asia/Taipei', now), abbr: 'CST' },
    { value: 'Asia/Tokyo', label: 'JST - Tokyo, Osaka', offset: getOffset('Asia/Tokyo', now), abbr: 'JST' },
    { value: 'Asia/Seoul', label: 'KST - Seoul', offset: getOffset('Asia/Seoul', now), abbr: 'KST' },
    
    // Australia & Pacific
    { value: 'Australia/Sydney', label: 'AEDT - Sydney, Melbourne', offset: getOffset('Australia/Sydney', now), abbr: 'AEDT/AEST' },
    { value: 'Australia/Brisbane', label: 'AEST - Brisbane', offset: getOffset('Australia/Brisbane', now), abbr: 'AEST' },
    { value: 'Australia/Perth', label: 'AWST - Perth', offset: getOffset('Australia/Perth', now), abbr: 'AWST' },
    { value: 'Pacific/Auckland', label: 'NZDT - Auckland', offset: getOffset('Pacific/Auckland', now), abbr: 'NZDT/NZST' },
    { value: 'Pacific/Fiji', label: 'FJT - Fiji', offset: getOffset('Pacific/Fiji', now), abbr: 'FJT' },
    
    // South America
    { value: 'America/Sao_Paulo', label: 'BRT - São Paulo, Rio', offset: getOffset('America/Sao_Paulo', now), abbr: 'BRT/BRST' },
    { value: 'America/Buenos_Aires', label: 'ART - Buenos Aires', offset: getOffset('America/Buenos_Aires', now), abbr: 'ART' },
    { value: 'America/Santiago', label: 'CLT - Santiago', offset: getOffset('America/Santiago', now), abbr: 'CLT/CLST' },
    { value: 'America/Bogota', label: 'COT - Bogotá', offset: getOffset('America/Bogota', now), abbr: 'COT' },
    { value: 'America/Lima', label: 'PET - Lima', offset: getOffset('America/Lima', now), abbr: 'PET' },
    
    // Africa
    { value: 'Africa/Cairo', label: 'EET - Cairo', offset: getOffset('Africa/Cairo', now), abbr: 'EET' },
    { value: 'Africa/Johannesburg', label: 'SAST - Johannesburg', offset: getOffset('Africa/Johannesburg', now), abbr: 'SAST' },
    { value: 'Africa/Lagos', label: 'WAT - Lagos', offset: getOffset('Africa/Lagos', now), abbr: 'WAT' },
    { value: 'Africa/Nairobi', label: 'EAT - Nairobi', offset: getOffset('Africa/Nairobi', now), abbr: 'EAT' },
  ]
}

function getOffset(timezone: string, date: Date): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'longOffset',
    })
    const parts = formatter.formatToParts(date)
    const offsetPart = parts.find(part => part.type === 'timeZoneName')
    return offsetPart?.value.replace('GMT', '') || '+00:00'
  } catch {
    return '+00:00'
  }
}

export function findTimezoneByValue(value: string): TimezoneOption | undefined {
  return getTimezoneOptions().find(tz => tz.value === value)
}

export function searchTimezones(query: string): TimezoneOption[] {
  const lowerQuery = query.toLowerCase()
  return getTimezoneOptions().filter(tz => 
    tz.label.toLowerCase().includes(lowerQuery) ||
    tz.value.toLowerCase().includes(lowerQuery) ||
    tz.abbr.toLowerCase().includes(lowerQuery)
  )
}