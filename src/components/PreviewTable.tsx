import type { OutputRow } from '../lib/types'

const PREVIEW_COLUMNS = [
  'cedula',
  'cliente',
  'tiene_tarjeta',
  'tiene_prestamo',
  'monto_total_consolidado',
  'max_atraso_global',
  'foco_de_atencion',
] as const

interface PreviewTableProps {
  rows: OutputRow[]
}

export function PreviewTable({ rows }: PreviewTableProps) {
  if (rows.length === 0) {
    return (
      <section className="panel preview-panel">
        <div className="section-heading">
          <h2>Previsualización</h2>
          <p>Procesa ambos archivos para ver los primeros 5 resultados.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="panel preview-panel">
      <div className="section-heading">
        <h2>Previsualización</h2>
        <p>Se muestran las primeras {Math.min(rows.length, 5)} filas del CSV final.</p>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {PREVIEW_COLUMNS.map((column) => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 5).map((row) => (
              <tr key={row.cedula}>
                {PREVIEW_COLUMNS.map((column) => (
                  <td key={`${row.cedula}-${column}`}>{row[column]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
