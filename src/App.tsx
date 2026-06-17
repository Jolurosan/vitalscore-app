import { useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent, ReactNode } from 'react'
import readXlsxFile from 'read-excel-file/browser'
import type { SheetData } from 'read-excel-file/browser'
import {
  Activity,
  CalendarDays,
  Dumbbell,
  FileSpreadsheet,
  HeartPulse,
  Plus,
  Scale,
  Trophy,
  Upload,
} from 'lucide-react'
import './App.css'

type ExerciseType = {
  id: string
  name: string
  pointsPerMinute: number
}

type ExerciseEntry = {
  id: string
  date: string
  exercise: string
  description: string
  minutes: number
  points: number
}

type CholesterolEntry = {
  id: string
  date: string
  total: number
  triglycerides: number
  hdl: number
  ldl: number
  device: string
}

type WeightEntry = {
  id: string
  date: string
  weightKg: number
  muscleKg: number
  musclePct: number
  fatKg: number
  fatPct: number
  scale: string
}

type HealthData = {
  exerciseTypes: ExerciseType[]
  exercises: ExerciseEntry[]
  cholesterol: CholesterolEntry[]
  weights: WeightEntry[]
}

type SheetRow = SheetData[number]

const STORAGE_KEY = 'vitalscore.data.v1'

const defaultData: HealthData = {
  exerciseTypes: [
    { id: crypto.randomUUID(), name: 'Caminata', pointsPerMinute: 1 },
    { id: crypto.randomUUID(), name: 'Entrenamiento', pointsPerMinute: 3 },
  ],
  exercises: [],
  cholesterol: [],
  weights: [],
}

const formatMonth = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' })
const formatDate = new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })

function App() {
  const [data, setData] = useState<HealthData>(() => loadData())
  const [selectedMonth, setSelectedMonth] = useState(() => monthKey(new Date()))
  const [importStatus, setImportStatus] = useState('')
  const [exerciseForm, setExerciseForm] = useState({
    date: today(),
    exercise: data.exerciseTypes[0]?.name ?? '',
    description: '',
    minutes: 45,
  })
  const [typeForm, setTypeForm] = useState({ name: '', pointsPerMinute: 1 })
  const [cholesterolForm, setCholesterolForm] = useState({
    date: today(),
    total: 0,
    triglycerides: 0,
    hdl: 0,
    ldl: 0,
    device: '',
  })
  const [weightForm, setWeightForm] = useState({
    date: today(),
    weightKg: 0,
    muscleKg: 0,
    musclePct: 0,
    fatKg: 0,
    fatPct: 0,
    scale: '',
  })

  const selectedType = data.exerciseTypes.find((type) => type.name === exerciseForm.exercise)
  const projectedPoints = Math.round((Number(exerciseForm.minutes) || 0) * (selectedType?.pointsPerMinute ?? 0))

  const monthlyExercises = useMemo(
    () => data.exercises.filter((entry) => entry.date.startsWith(selectedMonth)),
    [data.exercises, selectedMonth],
  )
  const monthlyPoints = monthlyExercises.reduce((sum, entry) => sum + entry.points, 0)
  const totalPoints = data.exercises.reduce((sum, entry) => sum + entry.points, 0)
  const lastWeight = latestByDate(data.weights)
  const lastCholesterol = latestByDate(data.cholesterol)
  const calendarDays = useMemo(() => buildCalendar(selectedMonth, monthlyExercises), [selectedMonth, monthlyExercises])

  function updateData(nextData: HealthData) {
    setData(nextData)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextData))
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const sheets = await readXlsxFile(file)
      const sheetsByName = new Map(sheets.map((sheet) => [sheet.sheet, sheet.data]))

      const importedData: HealthData = {
        exerciseTypes: parseExerciseTypes(sheetsByName.get('Tipos de ejercicio') ?? []),
        exercises: parseExercises(sheetsByName.get('Ejercicio') ?? []),
        cholesterol: parseCholesterol(sheetsByName.get('Colesterol') ?? []),
        weights: parseWeights(sheetsByName.get('Peso') ?? []),
      }

      updateData({
        exerciseTypes: importedData.exerciseTypes.length ? importedData.exerciseTypes : data.exerciseTypes,
        exercises: importedData.exercises,
        cholesterol: importedData.cholesterol,
        weights: importedData.weights,
      })
      setExerciseForm((form) => ({
        ...form,
        exercise: importedData.exerciseTypes[0]?.name ?? form.exercise,
      }))
      setImportStatus(`Excel importado: ${importedData.exercises.length} ejercicios, ${importedData.weights.length} pesos y ${importedData.cholesterol.length} analíticas.`)
    } catch (error) {
      setImportStatus(error instanceof Error ? error.message : 'No se pudo importar el Excel.')
    } finally {
      event.target.value = ''
    }
  }

  function addExerciseType(event: FormEvent) {
    event.preventDefault()
    const name = typeForm.name.trim()
    if (!name) return

    const nextTypes = [
      ...data.exerciseTypes.filter((type) => type.name.toLocaleLowerCase() !== name.toLocaleLowerCase()),
      { id: crypto.randomUUID(), name, pointsPerMinute: Number(typeForm.pointsPerMinute) || 1 },
    ].sort((a, b) => a.name.localeCompare(b.name, 'es'))

    updateData({ ...data, exerciseTypes: nextTypes })
    setTypeForm({ name: '', pointsPerMinute: 1 })
    setExerciseForm((form) => ({ ...form, exercise: name }))
  }

  function addExercise(event: FormEvent) {
    event.preventDefault()
    const minutes = Number(exerciseForm.minutes) || 0
    const nextEntry: ExerciseEntry = {
      id: crypto.randomUUID(),
      date: exerciseForm.date,
      exercise: exerciseForm.exercise,
      description: exerciseForm.description.trim(),
      minutes,
      points: Math.round(minutes * (selectedType?.pointsPerMinute ?? 0)),
    }
    updateData({ ...data, exercises: sortByDateDesc([...data.exercises, nextEntry]) })
    setExerciseForm((form) => ({ ...form, description: '', minutes: 45 }))
  }

  function addCholesterol(event: FormEvent) {
    event.preventDefault()
    const nextEntry: CholesterolEntry = {
      id: crypto.randomUUID(),
      date: cholesterolForm.date,
      total: Number(cholesterolForm.total) || 0,
      triglycerides: Number(cholesterolForm.triglycerides) || 0,
      hdl: Number(cholesterolForm.hdl) || 0,
      ldl: Number(cholesterolForm.ldl) || 0,
      device: cholesterolForm.device.trim(),
    }
    updateData({ ...data, cholesterol: sortByDateDesc([...data.cholesterol, nextEntry]) })
  }

  function addWeight(event: FormEvent) {
    event.preventDefault()
    const nextEntry: WeightEntry = {
      id: crypto.randomUUID(),
      date: weightForm.date,
      weightKg: Number(weightForm.weightKg) || 0,
      muscleKg: Number(weightForm.muscleKg) || 0,
      musclePct: Number(weightForm.musclePct) || 0,
      fatKg: Number(weightForm.fatKg) || 0,
      fatPct: Number(weightForm.fatPct) || 0,
      scale: weightForm.scale.trim(),
    }
    updateData({ ...data, weights: sortByDateDesc([...data.weights, nextEntry]) })
  }

  return (
    <main className="app-shell">
      <header className="hero-card">
        <div className="brand-mark" aria-hidden="true">
          <Activity size={34} />
        </div>
        <div>
          <p className="eyebrow">PWA privada para navegador y movil</p>
          <h1>VitalScore</h1>
          <p className="hero-copy">
            Calendario de ejercicio, puntuacion diaria y seguimiento de peso y colesterol inspirado en tu Excel.
            Los datos se guardan en este dispositivo.
          </p>
        </div>
        <label className="import-button">
          <Upload size={18} />
          Importar Excel
          <input type="file" accept=".xlsx,.xls" onChange={handleImport} />
        </label>
      </header>

      {importStatus && <p className="status-message">{importStatus}</p>}

      <section className="metric-grid" aria-label="Resumen">
        <Metric icon={<Trophy />} label="Puntos este mes" value={monthlyPoints.toLocaleString('es-ES')} />
        <Metric icon={<Dumbbell />} label="Sesiones registradas" value={data.exercises.length.toString()} />
        <Metric icon={<Scale />} label="Peso actual" value={lastWeight ? `${lastWeight.weightKg.toLocaleString('es-ES')} kg` : 'Sin datos'} />
        <Metric icon={<HeartPulse />} label="Colesterol LDL" value={lastCholesterol ? `${lastCholesterol.ldl} mg/dl` : 'Sin datos'} />
      </section>

      <section className="content-grid">
        <article className="panel calendar-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Calendario</p>
              <h2>{formatMonth.format(parseMonth(selectedMonth))}</h2>
            </div>
            <input
              type="month"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
              aria-label="Mes del calendario"
            />
          </div>
          <div className="calendar-grid">
            {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day) => (
              <span className="weekday" key={day}>{day}</span>
            ))}
            {calendarDays.map((day) => (
              <div className={`calendar-day ${day.inMonth ? '' : 'muted-day'}`} key={day.key}>
                <span>{day.label}</span>
                {day.points > 0 && <strong>{day.points}</strong>}
                {day.count > 0 && <small>{day.count} act.</small>}
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Ejercicio</p>
              <h2>Anadir sesion</h2>
            </div>
            <CalendarDays />
          </div>
          <form className="form-stack" onSubmit={addExercise}>
            <label>
              Fecha
              <input type="date" value={exerciseForm.date} onChange={(event) => setExerciseForm({ ...exerciseForm, date: event.target.value })} required />
            </label>
            <label>
              Ejercicio
              <select value={exerciseForm.exercise} onChange={(event) => setExerciseForm({ ...exerciseForm, exercise: event.target.value })} required>
                {data.exerciseTypes.map((type) => (
                  <option key={type.id} value={type.name}>{type.name}</option>
                ))}
              </select>
            </label>
            <label>
              Descripcion
              <input value={exerciseForm.description} onChange={(event) => setExerciseForm({ ...exerciseForm, description: event.target.value })} placeholder="Entrenamiento, caminata, niveles..." />
            </label>
            <div className="two-columns">
              <label>
                Minutos
                <input type="number" min="0" value={exerciseForm.minutes} onChange={(event) => setExerciseForm({ ...exerciseForm, minutes: Number(event.target.value) })} required />
              </label>
              <label>
                Puntos
                <input value={projectedPoints} readOnly />
              </label>
            </div>
            <button type="submit"><Plus size={18} /> Guardar ejercicio</button>
          </form>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Catalogo</p>
              <h2>Tipos de ejercicio</h2>
            </div>
            <Dumbbell />
          </div>
          <form className="form-stack" onSubmit={addExerciseType}>
            <label>
              Nombre
              <input value={typeForm.name} onChange={(event) => setTypeForm({ ...typeForm, name: event.target.value })} placeholder="Yoga, natacion..." required />
            </label>
            <label>
              Puntos por minuto
              <input type="number" min="0" step="0.5" value={typeForm.pointsPerMinute} onChange={(event) => setTypeForm({ ...typeForm, pointsPerMinute: Number(event.target.value) })} required />
            </label>
            <button type="submit"><Plus size={18} /> Anadir tipo</button>
          </form>
          <div className="chip-list">
            {data.exerciseTypes.map((type) => (
              <span className="chip" key={type.id}>{type.name} · {type.pointsPerMinute} p/min</span>
            ))}
          </div>
        </article>
      </section>

      <section className="content-grid">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Analiticas</p>
              <h2>Colesterol</h2>
            </div>
            <HeartPulse />
          </div>
          <form className="form-stack" onSubmit={addCholesterol}>
            <label>Fecha<input type="date" value={cholesterolForm.date} onChange={(event) => setCholesterolForm({ ...cholesterolForm, date: event.target.value })} required /></label>
            <div className="two-columns">
              <label>Total<input type="number" value={cholesterolForm.total} onChange={(event) => setCholesterolForm({ ...cholesterolForm, total: Number(event.target.value) })} /></label>
              <label>Trigliceridos<input type="number" value={cholesterolForm.triglycerides} onChange={(event) => setCholesterolForm({ ...cholesterolForm, triglycerides: Number(event.target.value) })} /></label>
              <label>HDL<input type="number" value={cholesterolForm.hdl} onChange={(event) => setCholesterolForm({ ...cholesterolForm, hdl: Number(event.target.value) })} /></label>
              <label>LDL<input type="number" value={cholesterolForm.ldl} onChange={(event) => setCholesterolForm({ ...cholesterolForm, ldl: Number(event.target.value) })} /></label>
            </div>
            <label>Dispositivo o centro<input value={cholesterolForm.device} onChange={(event) => setCholesterolForm({ ...cholesterolForm, device: event.target.value })} /></label>
            <button type="submit"><Plus size={18} /> Guardar colesterol</button>
          </form>
          <MiniTable
            headers={['Fecha', 'Total', 'HDL', 'LDL']}
            rows={data.cholesterol.slice(0, 5).map((entry) => [friendlyDate(entry.date), entry.total, entry.hdl, entry.ldl])}
          />
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Composicion corporal</p>
              <h2>Peso</h2>
            </div>
            <Scale />
          </div>
          <form className="form-stack" onSubmit={addWeight}>
            <label>Fecha<input type="date" value={weightForm.date} onChange={(event) => setWeightForm({ ...weightForm, date: event.target.value })} required /></label>
            <div className="two-columns">
              <label>Peso kg<input type="number" step="0.1" value={weightForm.weightKg} onChange={(event) => setWeightForm({ ...weightForm, weightKg: Number(event.target.value) })} /></label>
              <label>Musculo kg<input type="number" step="0.1" value={weightForm.muscleKg} onChange={(event) => setWeightForm({ ...weightForm, muscleKg: Number(event.target.value) })} /></label>
              <label>Musculo %<input type="number" step="0.1" value={weightForm.musclePct} onChange={(event) => setWeightForm({ ...weightForm, musclePct: Number(event.target.value) })} /></label>
              <label>Grasa %<input type="number" step="0.1" value={weightForm.fatPct} onChange={(event) => setWeightForm({ ...weightForm, fatPct: Number(event.target.value) })} /></label>
            </div>
            <label>Bascula<input value={weightForm.scale} onChange={(event) => setWeightForm({ ...weightForm, scale: event.target.value })} /></label>
            <button type="submit"><Plus size={18} /> Guardar peso</button>
          </form>
          <MiniTable
            headers={['Fecha', 'Peso', 'Musculo %', 'Grasa %']}
            rows={data.weights.slice(0, 5).map((entry) => [friendlyDate(entry.date), `${entry.weightKg} kg`, `${entry.musclePct.toFixed(1)}%`, `${entry.fatPct.toFixed(1)}%`])}
          />
        </article>

        <article className="panel history-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Historial</p>
              <h2>Ultimos ejercicios</h2>
            </div>
            <FileSpreadsheet />
          </div>
          <div className="history-list">
            {data.exercises.slice(0, 10).map((entry) => (
              <div className="history-item" key={entry.id}>
                <div>
                  <strong>{entry.exercise}</strong>
                  <p>{friendlyDate(entry.date)} · {entry.description || 'Sin descripcion'}</p>
                </div>
                <span>{entry.points} p</span>
              </div>
            ))}
            {!data.exercises.length && <p className="empty-state">Importa tu Excel o anade tu primer ejercicio.</p>}
          </div>
          <p className="total-line">Puntos totales: <strong>{totalPoints.toLocaleString('es-ES')}</strong></p>
        </article>
      </section>
    </main>
  )
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <article className="metric-card">
      {icon}
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
    </article>
  )
}

function MiniTable({ headers, rows }: { headers: string[]; rows: (string | number)[][] }) {
  if (!rows.length) return <p className="empty-state">Sin registros todavia.</p>

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function parseExerciseTypes(rows: SheetRow[]): ExerciseType[] {
  return rows.slice(1)
    .map((row) => ({
      id: crypto.randomUUID(),
      name: stringValue(row[1]),
      pointsPerMinute: numberValue(row[2]),
    }))
    .filter((row) => row.name && row.pointsPerMinute > 0)
}

function parseExercises(rows: SheetRow[]): ExerciseEntry[] {
  return sortByDateDesc(rows.slice(1)
    .map((row) => ({
      id: crypto.randomUUID(),
      date: dateValue(row[1]),
      exercise: stringValue(row[2]),
      description: stringValue(row[3]),
      minutes: numberValue(row[4]),
      points: numberValue(row[5]),
    }))
    .filter((row) => row.date && row.exercise))
}

function parseCholesterol(rows: SheetRow[]): CholesterolEntry[] {
  return sortByDateDesc(rows.slice(1)
    .map((row) => ({
      id: crypto.randomUUID(),
      total: numberValue(row[1]),
      triglycerides: numberValue(row[2]),
      hdl: numberValue(row[3]),
      ldl: numberValue(row[4]),
      date: dateValue(row[5]),
      device: stringValue(row[6]),
    }))
    .filter((row) => row.date))
}

function parseWeights(rows: SheetRow[]): WeightEntry[] {
  return sortByDateDesc(rows.slice(1)
    .map((row) => ({
      id: crypto.randomUUID(),
      date: dateValue(row[1]),
      weightKg: numberValue(row[2]),
      muscleKg: numberValue(row[3]),
      musclePct: numberValue(row[4]),
      fatKg: numberValue(row[5]),
      fatPct: numberValue(row[6]),
      scale: stringValue(row[7]),
    }))
    .filter((row) => row.date && row.weightKg > 0))
}

function buildCalendar(selectedMonth: string, entries: ExerciseEntry[]) {
  const firstDay = parseMonth(selectedMonth)
  const startOffset = (firstDay.getDay() + 6) % 7
  const start = new Date(firstDay)
  start.setDate(firstDay.getDate() - startOffset)

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    const key = toDateInput(date)
    const dayEntries = entries.filter((entry) => entry.date === key)
    return {
      key,
      label: date.getDate(),
      inMonth: key.startsWith(selectedMonth),
      points: dayEntries.reduce((sum, entry) => sum + entry.points, 0),
      count: dayEntries.length,
    }
  })
}

function loadData(): HealthData {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return defaultData

  try {
    return JSON.parse(stored) as HealthData
  } catch {
    return defaultData
  }
}

function latestByDate<T extends { date: string }>(items: T[]) {
  return [...items].sort((a, b) => b.date.localeCompare(a.date))[0]
}

function sortByDateDesc<T extends { date: string }>(items: T[]) {
  return [...items].sort((a, b) => b.date.localeCompare(a.date))
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim()
}

function numberValue(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : Number(stringValue(value).replace(',', '.')) || 0
}

function dateValue(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return toDateInput(value)
  const text = stringValue(value)
  if (!text) return ''
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10)
  const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (match) {
    const [, day, month, year] = match
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }
  return ''
}

function friendlyDate(date: string) {
  return date ? formatDate.format(new Date(`${date}T00:00:00`)) : '-'
}

function today() {
  return toDateInput(new Date())
}

function monthKey(date: Date) {
  return toDateInput(date).slice(0, 7)
}

function parseMonth(month: string) {
  return new Date(`${month}-01T00:00:00`)
}

function toDateInput(date: Date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default App
