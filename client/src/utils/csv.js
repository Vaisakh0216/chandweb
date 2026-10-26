// Minimal CSV parser: handles quoted fields, escaped quotes and CRLF line endings
export const parseCSV = (text) => {
  const rows = []
  let row = [], field = '', inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++ }
      else if (ch === '"') inQuotes = false
      else field += ch
    } else if (ch === '"') inQuotes = true
    else if (ch === ',') { row.push(field); field = '' }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(field); rows.push(row); row = []; field = ''
    } else field += ch
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row) }
  return rows.filter(r => r.some(c => c.trim() !== ''))
}

// Sheet column header -> packing material field
const PMST_COLUMNS = {
  storecode: 'storeCode',
  storename: 'storeName',
  brand: 'brand',
  department: 'department',
  class: 'materialClass',
  productcode: 'productCode',
  productname: 'productName',
  availablestock: 'availableStock',
  mrp: 'mrp',
  lastreceivedate: 'lastReceiveDate',
  unit: 'unit',
}
const NUMERIC = ['availableStock', 'mrp']

// dd/mm/yyyy (as in the sheet) -> yyyy-mm-dd
const parseSheetDate = (value) => {
  const m = value.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/)
  if (!m) return value
  return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
}

const pad = n => String(n).padStart(2, '0')

// Excel cell value -> text. Dates use local parts, as SheetJS builds them in local time
const cellText = (value) => {
  if (value instanceof Date) return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`
  return value == null ? '' : String(value)
}

// Turns the PMST sheet CSV into rows for /packing-materials/import
export const mapPmstRows = (text) => mapPmstTable(parseCSV(text))

// Reads every sheet of an .xls / .xlsx workbook into { name, rows, missing }
export const readWorkbook = async (buffer) => {
  const XLSX = await import('xlsx')
  const workbook = XLSX.read(buffer, { cellDates: true })
  return workbook.SheetNames.map(name => {
    const table = XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, raw: true, blankrows: false, defval: '' })
    return { name, ...mapPmstTable(table.map(row => row.map(cellText))) }
  })
}

// Header row + data rows (arrays of text) -> rows for /packing-materials/import
const mapPmstTable = (table) => {
  const [header, ...data] = table
  if (!header) return { rows: [], missing: ['Product Code', 'Product Name'] }
  const fields = header.map(h => PMST_COLUMNS[String(h).toLowerCase().replace(/[^a-z]/g, '')])
  const missing = ['productCode', 'productName'].filter(f => !fields.includes(f))
    .map(f => (f === 'productCode' ? 'Product Code' : 'Product Name'))

  const rows = data.map((cells, i) => {
    const row = { rowNumber: i + 2 }
    fields.forEach((field, col) => {
      if (!field) return
      let value = String(cells[col] ?? '').trim()
      if (NUMERIC.includes(field)) value = value.replace(/,/g, '')
      if (field === 'lastReceiveDate' && value) value = parseSheetDate(value)
      if (field === 'unit') value = value.toLowerCase()
      row[field] = value
    })
    return row
  }).filter(row => row.productCode || row.productName)
  return { rows, missing }
}
