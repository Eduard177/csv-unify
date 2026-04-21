interface StatusPanelProps {
  loadedFiles: number
  processedRows: number
  groupedClients: number
  warningSummary: string
}

export function StatusPanel({
  loadedFiles,
  processedRows,
  groupedClients,
  warningSummary,
}: StatusPanelProps) {
  return (
    <section className="panel status-panel" aria-label="Estado del procesamiento">
      <div>
        <p className="panel__label">Estado</p>
        <strong>Archivos cargados: {loadedFiles}/2</strong>
      </div>
      <div>
        <p className="panel__label">Filas procesadas</p>
        <strong>{processedRows}</strong>
      </div>
      <div>
        <p className="panel__label">Clientes unificados</p>
        <strong>{groupedClients}</strong>
      </div>
      <div>
        <p className="panel__label">Alertas</p>
        <strong>{warningSummary || 'Sin alertas'}</strong>
      </div>
    </section>
  )
}
