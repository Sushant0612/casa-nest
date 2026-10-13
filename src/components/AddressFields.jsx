export const emptyAddress = {
  label: 'Home',
  full_name: '',
  phone: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  postal_code: '',
  country: 'India',
}

const FIELDS = [
  ['full_name', 'Full name', ''],
  ['phone', 'Phone', ''],
  ['line1', 'Address line 1', 'sm:col-span-2'],
  ['line2', 'Address line 2 (optional)', 'sm:col-span-2'],
  ['city', 'City', ''],
  ['state', 'State', ''],
  ['postal_code', 'PIN code', ''],
  ['country', 'Country', ''],
]

export default function AddressFields({ value, onChange }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="label">Label</label>
        <select
          className="input"
          value={value.label || 'Home'}
          onChange={(e) => onChange({ ...value, label: e.target.value })}
        >
          <option>Home</option>
          <option>Work</option>
          <option>Other</option>
        </select>
      </div>
      {FIELDS.map(([key, label, span]) => (
        <div key={key} className={span}>
          <label className="label">{label}</label>
          <input
            className="input"
            value={value[key] || ''}
            required={key !== 'line2'}
            onChange={(e) => onChange({ ...value, [key]: e.target.value })}
          />
        </div>
      ))}
    </div>
  )
}
