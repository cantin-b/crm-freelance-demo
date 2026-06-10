"use client";

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = ["00", "15", "30", "45"];

const SELECT_CLASS =
  "h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

type Props = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export function TimePicker({ value, onChange, disabled }: Props) {
  const [selectedHour = "", selectedMinute = ""] = value ? value.split(":") : ["", ""];

  function handleHourChange(h: string) {
    if (h && selectedMinute) {
      onChange(`${h}:${selectedMinute}`);
    } else {
      onChange("");
    }
  }

  function handleMinuteChange(m: string) {
    if (selectedHour && m) {
      onChange(`${selectedHour}:${m}`);
    } else {
      onChange("");
    }
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={selectedHour}
        onChange={(e) => handleHourChange(e.target.value)}
        disabled={disabled}
        className={SELECT_CLASS}
      >
        <option value="">--</option>
        {HOURS.map((h) => (
          <option key={h} value={h}>{h}</option>
        ))}
      </select>

      <span className="text-zinc-400">:</span>

      <select
        value={selectedMinute}
        onChange={(e) => handleMinuteChange(e.target.value)}
        disabled={disabled}
        className={SELECT_CLASS}
      >
        <option value="">--</option>
        {MINUTES.map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>
    </div>
  );
}
