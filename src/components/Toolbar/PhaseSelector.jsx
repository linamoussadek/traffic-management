import { useAppStore } from '../../store/appStore'

export default function PhaseSelector() {
  const { selectedPhase, setSelectedPhase, getPhases } = useAppStore()
  const phases = getPhases()
  
  return (
    <div style={{ 
      padding: '12px', 
      background: '#fff', 
      borderBottom: '1px solid #ddd',
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    }}>
      <label style={{ fontWeight: '600', fontSize: '14px' }}>Phase:</label>
      <select
        value={selectedPhase}
        onChange={(e) => setSelectedPhase(e.target.value)}
        style={{
          padding: '6px 12px',
          border: '1px solid #ddd',
          borderRadius: '4px',
          fontSize: '14px',
          cursor: 'pointer'
        }}
      >
        <option value="all">All Phases</option>
        {phases.map(phase => (
          <option key={phase.id} value={phase.id}>
            {phase.time}
          </option>
        ))}
      </select>
    </div>
  )
}
