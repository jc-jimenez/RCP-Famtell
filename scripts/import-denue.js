/**
 * Importar CSVs de DENUE a Supabase
 *
 * Uso:
 *   node scripts/import-denue.js ruta/al/archivo.csv [código_estado]
 *
 * Ejemplo:
 *   node scripts/import-denue.js ./denue/DENUE_14_Jalisco.csv 14
 *
 * Requiere: SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local
 */

const fs = require('fs')
const path = require('path')
const readline = require('readline')
require('dotenv').config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY
const BATCH_SIZE   = 500

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local')
  process.exit(1)
}

const filePath   = process.argv[2]
const estadoCode = process.argv[3] ?? '00'

if (!filePath) {
  console.error('❌ Uso: node scripts/import-denue.js ruta/archivo.csv [código_estado]')
  process.exit(1)
}

async function upsertBatch(rows) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/denue_empresas`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'apikey': SERVICE_KEY,
      'Prefer': 'resolution=merge-duplicates',
    },
    body: JSON.stringify(rows),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Supabase error ${res.status}: ${text.slice(0, 200)}`)
  }
}

function parseCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') { inQuotes = !inQuotes }
    else if (ch === ',' && !inQuotes) { result.push(current.trim()); current = '' }
    else { current += ch }
  }
  result.push(current.trim())
  return result
}

async function main() {
  console.log(`📂 Leyendo: ${filePath}`)
  const rl = readline.createInterface({ input: fs.createReadStream(filePath, { encoding: 'latin1' }) })

  let headers = null
  let batch = []
  let total = 0
  let errors = 0

  for await (const line of rl) {
    if (!line.trim()) continue

    if (!headers) {
      headers = parseCSVLine(line).map(h => h.toLowerCase().trim())
      console.log(`📋 Columnas: ${headers.join(', ')}`)
      continue
    }

    const cols = parseCSVLine(line)
    const row = {}
    headers.forEach((h, i) => row[h] = cols[i] ?? '')

    // Mapear columnas DENUE al esquema
    const empresa = {
      id:                  row['id'] || row['cve_estab'] || row['id_estab'],
      nombre:              row['nom_estab'] || row['nombre'] || '',
      razon_social:        row['raz_social'] || row['razon_social'] || '',
      codigo_actividad:    row['codigo_act'] || row['cve_act'] || '',
      clase_actividad:     row['nombre_act'] || row['clase_actividad'] || '',
      estrato:             row['estrato'] || '',
      tipo_vialidad:       row['tipo_vial'] || '',
      nombre_vialidad:     row['nom_vial'] || '',
      numero_exterior:     row['num_ext'] || '',
      nombre_asentamiento: row['nom_asen'] || '',
      municipio:           row['nommun'] || row['municipio'] || '',
      entidad:             row['nomest'] || row['entidad'] || '',
      estado_code:         estadoCode,
      codigo_postal:       row['cp'] || '',
      telefono:            row['telefono'] || '',
      correo_e:            row['correoelec'] || row['correo_e'] || '',
      latitud:             parseFloat(row['latitud']) || null,
      longitud:            parseFloat(row['longitud']) || null,
      fecha_alta:          row['fecha_alta'] || '',
    }

    if (!empresa.id) continue

    batch.push(empresa)
    total++

    if (batch.length >= BATCH_SIZE) {
      try {
        await upsertBatch(batch)
        process.stdout.write(`\r✅ ${total.toLocaleString()} registros importados`)
      } catch (e) {
        errors++
        if (errors <= 3) console.error(`\n⚠️  Error en batch: ${e.message}`)
      }
      batch = []
    }
  }

  // Último batch
  if (batch.length > 0) {
    try {
      await upsertBatch(batch)
      total += batch.length
    } catch (e) {
      errors++
    }
  }

  console.log(`\n\n🎉 Importación completa: ${total.toLocaleString()} empresas, ${errors} errores`)
}

main().catch(console.error)
