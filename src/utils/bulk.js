/**
 * One card per line: "armenian - translation - image url".
 * Tab (pasted from a spreadsheet) and ";" also work as separators.
 */
export function parseBulk(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      let parts
      if (line.includes('\t')) parts = line.split('\t')
      else if (line.includes(';')) parts = line.split(';')
      else parts = line.split(/\s+[-–—=]\s+/)
      parts = parts.map((p) => p.trim())
      return { armenian: parts[0] || '', translation: parts[1] || '', imageUrl: parts[2] || '' }
    })
    .filter((c) => c.armenian && c.translation)
}
