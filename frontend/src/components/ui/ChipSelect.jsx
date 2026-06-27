export default function ChipSelect({ options, value = [], onChange }) {
  const toggle = (opt) => {
    onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt]);
  };
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = value.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-inset transition ${
              active
                ? 'bg-plum-700 text-white ring-plum-700'
                : 'bg-white text-ink-soft ring-paper-200 hover:ring-plum-300 hover:text-plum-700'
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
