import type { ChangeEvent } from 'react'

interface FileInputCardProps {
  id: string
  label: string
  description: string
  fileName: string | null
  error: string | null
  onChange: (file: File | null) => void
  onRemove?: () => void
}

export function FileInputCard({
  id,
  label,
  description,
  fileName,
  error,
  onChange,
  onRemove,
}: FileInputCardProps) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onChange(event.target.files?.[0] ?? null)
  }

  return (
    <div className="file-card">
      <span className="file-card__eyebrow">Carga</span>
      <span className="file-card__title">{label}</span>
      <span className="file-card__description">{description}</span>
      <div className="file-card__actions">
        <label className="file-card__button" htmlFor={id}>
          Seleccionar CSV o XLSX
        </label>
        {fileName ? (
          <button
            type="button"
            className="file-card__remove"
            onClick={(event) => {
              event.stopPropagation()
              onRemove?.()
            }}
          >
            X
          </button>
        ) : null}
      </div>
      <span className="file-card__filename">{fileName ?? 'Ningún archivo seleccionado'}</span>
      {error ? <span className="file-card__error">{error}</span> : null}
      <input
        id={id}
        type="file"
        accept=".csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        onChange={handleChange}
      />
    </div>
  )
}
