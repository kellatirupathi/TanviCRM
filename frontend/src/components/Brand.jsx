export default function Brand({ compact = false, onLight = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-plum-600 to-plum-800 font-display text-lg font-bold text-gold-300 shadow-sm">
        T
      </span>
      {!compact && (
        <div className="leading-none">
          <p className={`font-display text-lg font-semibold ${onLight ? 'text-ink' : 'text-white'}`}>
            Tanvi<span className="text-gold-400">CRM</span>
          </p>
          <p className={`mt-0.5 text-[10px] uppercase tracking-[0.16em] ${onLight ? 'text-ink-muted' : 'text-plum-200'}`}>
            Tanvi Boutique
          </p>
        </div>
      )}
    </div>
  );
}
