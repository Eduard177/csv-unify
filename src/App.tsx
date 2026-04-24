import { useMemo, useState } from 'react'
import { FileInputCard } from './components/FileInputCard'
import { PreviewTable } from './components/PreviewTable'
import { StatusPanel } from './components/StatusPanel'
import {
  consolidateCsvData,
  buildOutputFileName,
  getAcceptedFileError,
  getFileLabel,
  getMissingRequiredColumnsMessage,
  summarizeWarnings,
} from './lib/consolidation'
import { buildCsvContent, parseInputFile, triggerCsvDownload } from './lib/csv'
import type { FileState, InputDataset, ProcessingSummary } from './lib/types'

const EMPTY_FILE_STATE: FileState = {
  file: null,
  parsed: null,
  error: null,
}

function App() {
  const [tarjetas, setTarjetas] = useState<FileState>(EMPTY_FILE_STATE)
  const [prestamos, setPrestamos] = useState<FileState>(EMPTY_FILE_STATE)
  const [summary, setSummary] = useState<ProcessingSummary | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)

  const loadedFiles = Number(Boolean(tarjetas.parsed)) + Number(Boolean(prestamos.parsed))

  const warningSummary = useMemo(
    () => summarizeWarnings(summary?.warnings ?? []),
    [summary?.warnings],
  )

  async function handleFileSelection(dataset: InputDataset, file: File | null) {
    const setState = dataset === 'tarjetas' ? setTarjetas : setPrestamos

    setGlobalError(null)
    setSummary(null)

    if (!file) {
      setState(EMPTY_FILE_STATE)
      return
    }

    const validationError = getAcceptedFileError(file)
    if (validationError) {
      setState({
        file,
        parsed: null,
        error: validationError,
      })
      return
    }

    try {
      const parsed = await parseInputFile(file)
      const schemaError = getMissingRequiredColumnsMessage(parsed.rows, dataset)

      if (schemaError) {
        setState({ file, parsed: null, error: schemaError })
        return
      }

      setState({ file, parsed, error: null })
    } catch (error) {
      setState({
        file,
        parsed: null,
        error: error instanceof Error ? error.message : 'No se pudo leer el archivo.',
      })
    }
  }

  function handleProcess() {
    if (!tarjetas.parsed || !prestamos.parsed) {
      setGlobalError('Debes cargar ambos archivos antes de procesar.')
      return
    }

    setIsProcessing(true)
    setGlobalError(null)

    try {
      const nextSummary = consolidateCsvData(tarjetas.parsed.rows, prestamos.parsed.rows)
      setSummary(nextSummary)

      if (nextSummary.outputRows.length === 0) {
        setGlobalError('No se encontraron filas válidas para exportar.')
        return
      }

      const csv = buildCsvContent(nextSummary.outputRows)
      triggerCsvDownload(csv, buildOutputFileName())
    } catch (error) {
      setGlobalError(error instanceof Error ? error.message : 'No se pudo procesar la información.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Consolidador de Deudas</p>
          <h1>Unifica tarjetas y préstamos en un solo CSV listo para reportes.</h1>
          <p className="hero-copy">
            Carga ambos archivos, consolida por cédula, revisa una vista previa y descarga
            el resultado final sin enviar datos a un servidor.
          </p>
        </div>
        <button className="primary-button" onClick={handleProcess} disabled={isProcessing}>
          {isProcessing ? 'Procesando...' : 'Procesar y Descargar CSV Unificado'}
        </button>
      </section>

      <section className="upload-grid" aria-label="Carga de archivos CSV">
        <FileInputCard
          id="tarjetas-file"
          label={getFileLabel('tarjetas')}
          description="Carga el corte de tarjetas en CSV o XLSX. Se consolidará por cédula y moneda."
          fileName={tarjetas.file?.name ?? null}
          error={tarjetas.error}
          onChange={(file) => handleFileSelection('tarjetas', file)}
          onRemove={() => handleFileSelection('tarjetas', null)}
        />
        <FileInputCard
          id="prestamos-file"
          label={getFileLabel('prestamos')}
          description="Carga el corte de préstamos en CSV o XLSX. Se conservará el contacto más reciente."
          fileName={prestamos.file?.name ?? null}
          error={prestamos.error}
          onChange={(file) => handleFileSelection('prestamos', file)}
          onRemove={() => handleFileSelection('prestamos', null)}
        />
      </section>

      <StatusPanel
        loadedFiles={loadedFiles}
        processedRows={summary?.processedRows ?? 0}
        groupedClients={summary?.groupedClients ?? 0}
        warningSummary={warningSummary}
      />

      {globalError ? <p className="global-error">{globalError}</p> : null}

      <PreviewTable rows={summary?.outputRows ?? []} />
    </main>
  )
}

export default App
