import { profilEnergetique } from "./energie";
import type { LeenkeyForm } from "./types";

/**
 * Panneau latéral de l'étape Énergie.
 *
 * Il rend visible, pendant la saisie, ce que chaque réponse fait à la valeur.
 * Le vendeur découvrait jusqu'ici l'effet du DPE seulement à la fin, dans le
 * rapport.
 */
export function ProfilEnergetiquePanel({ form }: { form: LeenkeyForm }) {
  const p = profilEnergetique(form);

  // Jauge circulaire : 2πr pour r = 34.
  const circonference = 2 * Math.PI * 34;
  const rempli = (p.score / 100) * circonference;
  const couleur =
    p.score >= 80 ? "#16a34a" : p.score >= 60 ? "#16a34a" : p.score >= 40 ? "#f59e0b" : "#dc2626";

  return (
    <aside className="rounded-[16px] border-2 border-sky-mid bg-card p-5 lg:sticky lg:top-40">
      <div className="text-[11px] font-bold uppercase tracking-wider text-primary">
        Votre profil énergétique
      </div>

      <div className="mt-4 flex items-center gap-4">
        <div className="relative h-[86px] w-[86px] shrink-0">
          <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
            <circle cx="40" cy="40" r="34" fill="none" stroke="#e2e8f0" strokeWidth="7" />
            <circle
              cx="40"
              cy="40"
              r="34"
              fill="none"
              stroke={couleur}
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={`${rempli} ${circonference}`}
              className="transition-all duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-xl font-bold leading-none text-navy">
              {p.score}
              <span className="text-xs font-semibold text-sub">/100</span>
            </span>
            <span className="mt-0.5 text-[10px] font-semibold text-sub">{p.mention}</span>
          </div>
        </div>
        <div>
          <div className="font-display text-base font-bold leading-tight text-navy">{p.titre}</div>
          <p className="mt-1 text-xs leading-relaxed text-sub">{p.description}</p>
        </div>
      </div>

      {/* Les deux blocs restent toujours visibles : un panneau qui disparaît
          donne l'impression que le calcul ne marche pas. */}
      <div className="mt-5">
        <div className="text-xs font-bold text-navy">Points forts</div>
        {p.forts.length > 0 ? (
          <ul className="mt-2 space-y-1.5">
            {p.forts.slice(0, 8).map((f) => (
              <li key={f} className="flex items-start gap-2 text-xs text-sub">
                <span className="mt-px font-bold text-success">✓</span>
                {f}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs italic text-muted-foreground">Ils apparaîtront ici.</p>
        )}
      </div>

      <div className="mt-5">
        <div className="text-xs font-bold text-navy">Points à améliorer</div>
        {p.ameliorer.length > 0 ? (
          <ul className="mt-2 space-y-1.5">
            {p.ameliorer.slice(0, 8).map((a) => (
              <li key={a} className="flex items-start gap-2 text-xs text-sub">
                <span className="mt-px text-amber-500">⚠</span>
                {a}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs italic text-muted-foreground">Ils apparaîtront ici.</p>
        )}
      </div>

      {p.manquants.length > 0 && (
        <div className="mt-5 rounded-[10px] bg-sky/60 p-3">
          <div className="text-xs font-bold text-navy">Pour affiner le profil</div>
          <p className="mt-1 text-xs leading-relaxed text-sub">
            Renseignez {p.manquants.slice(0, 4).join(", ")}
            {p.manquants.length > 4 ? "…" : "."}
          </p>
        </div>
      )}

      <div className="mt-5 border-t border-border pt-4">
        <div className="text-xs font-semibold text-sub">Impact estimé sur la valeur</div>
        <div className="mt-1 font-display text-xl font-bold text-success">
          {p.impactMax === 0
            ? "À calculer"
            : p.impactMin === p.impactMax
              ? `+${p.impactMax} %`
              : `+${p.impactMin} % à +${p.impactMax} %`}
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
          {p.impactMax > 0
            ? "Gain atteignable en traitant les points ci-dessus."
            : "L'estimation se met à jour selon vos réponses."}
        </p>
      </div>

      <div className="mt-5 rounded-[12px] border-2 border-primary/25 bg-primary/5 p-4">
        <div className="text-xs font-bold text-primary">Recommandation Leenkey</div>
        <p className="mt-1.5 text-xs leading-relaxed text-navy">
          {p.recommandation ??
            "Complétez quelques critères pour recevoir une recommandation personnalisée."}
        </p>
      </div>
    </aside>
  );
}
