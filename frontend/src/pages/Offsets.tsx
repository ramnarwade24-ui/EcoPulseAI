import { Card } from '../components/Card'

export default function Offsets() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Carbon Offsets</h1>
        <p className="mt-1 text-sm text-slate-400">Placeholder UI (offset integration can be added next).</p>
      </div>

      <Card title="Coming soon">
        <div className="text-sm text-slate-300">
          Offset purchase + registry integration will plug into the backend’s `/api/offsets` endpoints.
        </div>
      </Card>
    </div>
  )
}
