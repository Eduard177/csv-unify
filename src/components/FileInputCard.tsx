import type { ChangeEvent } from 'react'

interface FileInputCardProps {
  id: string
  label: string
  description: string
  fileName: string | null
  error: string | null
  onChange: (file: File | null) => void
}

export function FileInputCard({
  id,
  label,
  description,
  fileName,
  error,
  onChange,
}: FileInputCardProps) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onChange(event.target.files?.[0] ?? null)
  }

  return (
    <label className="file-card" htmlFor={id}>
      <span className="file-card__eyebrow">Carga</span>
      <span className="file-card__title">{label}</span>
      <span className="file-card__description">{description}</span>
      <span className="file-card__button">Seleccionar CSV</span>
      <span className="file-card__filename">{fileName ?? 'Ningún archivo seleccionado'}</span>
      {error ? <span className="file-card__error">{error}</span> : null}
      <input id={id} type="file" accept=".csv,text/csv" onChange={handleChange} />
    </label>
  )
}
