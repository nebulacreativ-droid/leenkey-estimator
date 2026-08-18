import type { statsLocatives } from "./immeuble-calc";

type Stats = ReturnType<typeof statsLocatives>;

/**
 * Panneau latéral de l'étape Situation locative.
 *
 * Les chiffres se recalculent à chaque loyer saisi. Posés en tête de page, ils
 * défilaient hors de vue dès le troisième lot, au moment précis où le vendeur
 * a besoin de voir l'effet de ce qu'il tape.
 */
export function RentabilitePanel({ stats }: { stats: Stats }) {
  const vacance = 100 - stats.tauxOccupation;

  return (
    <aside className="sticky top-32 z-20 rounded-[16px] border-2 border-sky-mid bg-card p-5 shadow-[0_10px_30px_-18px_rgba(15,30,53,0.35)] lg:top-40">
      <div className="text-[11px] font-bold uppercase tracking-wider text-primary">
        Rentabilité de l'immeuble
      </div>

      <div className="mt-4">
        <div className="text-xs font-semibold text-sub">Revenus annuels</div>
        <div className="font-display text-[26px] font-bold leading-tight text-navy">
          {stats.revenusAnnuels.toLocaleString("fr-FR")} €
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
          C'est ce revenu, plus que la surface, qui fixe le prix d'un immeuble de rapport.
        </p>
      </div>

      {/* Les loyers saisis sur les lots vides ne sont pas des revenus perçus :
          ils ne peuvent pas grossir la ligne du dessus. Mais les taire donnait
          l'impression qu'ils n'étaient pas pris en compte. */}
      {stats.potentielVacance > 0 && (
        <div className="mt-4 rounded-[10px] border border-dashed border-sky-mid bg-sky/30 p-3">
          <div className="text-xs font-semibold text-sub">Une fois l'immeuble plein</div>
          <div className="font-display text-lg font-bold text-navy">
            {stats.revenusPotentiels.toLocaleString("fr-FR")} €
            <span className="ml-1 text-xs font-semibold text-sub">par an</span>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            {stats.potentielVacance.toLocaleString("fr-FR")} € de loyers à récupérer sur les lots
            libres
            {stats.potentielDeclare > 0 ? ", d'après les loyers que vous avez indiqués." : "."}
          </p>
        </div>
      )}

      <div className="mt-5 grid grid-cols-2 gap-3">
        {[
          {
            l: stats.surLoyersAttendus ? "Loyer moyen attendu" : "Loyer moyen",
            v: `${stats.loyerMoyen.toLocaleString("fr-FR")} €`,
            u: "par mois",
          },
          {
            l: stats.surLoyersAttendus ? "Loyer attendu au m²" : "Loyer au m²",
            v: stats.loyerM2 ? `${stats.loyerM2} €` : "—",
            u: "par mois",
          },
        ].map((s) => (
          <div key={s.l} className="rounded-[10px] bg-sky/50 p-3">
            <div className="text-[11px] font-semibold text-sub">{s.l}</div>
            <div className="mt-0.5 font-display text-base font-bold text-navy">{s.v}</div>
            <div className="text-[10px] text-muted-foreground">{s.u}</div>
          </div>
        ))}
      </div>

      <div className="mt-5 border-t border-border pt-4">
        <div className="flex items-baseline justify-between">
          <span className="text-xs font-semibold text-sub">Taux d'occupation</span>
          <span
            className={
              "font-display text-lg font-bold " +
              (stats.tauxOccupation === 100
                ? "text-success"
                : stats.tauxOccupation >= 70
                  ? "text-navy"
                  : "text-destructive")
            }
          >
            {stats.tauxOccupation} %
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-sky">
          <div
            className={
              "h-full rounded-full transition-all duration-500 " +
              (stats.tauxOccupation === 100 ? "bg-success" : "bg-primary")
            }
            style={{ width: `${stats.tauxOccupation}%` }}
          />
        </div>
        <div className="mt-1.5 text-[11px] text-muted-foreground">
          {stats.nbOccupes} lot{stats.nbOccupes > 1 ? "s" : ""} loué
          {stats.nbOccupes > 1 ? "s" : ""} sur {stats.nbLots}
        </div>
      </div>

      {vacance > 0 && (
        <div className="mt-4 rounded-[10px] border-2 border-amber-200 bg-amber-50 p-3">
          <div className="text-xs font-bold text-amber-900">{vacance} % de vacance</div>
          <p className="mt-1 text-[11px] leading-relaxed text-amber-900">
            Un acquéreur y verra soit un risque, soit un potentiel de revalorisation. Renseignez le
            loyer attendu de chaque lot libre pour montrer le second.
          </p>
        </div>
      )}

      <div className="mt-5 rounded-[12px] border-2 border-primary/25 bg-primary/5 p-4">
        <div className="text-xs font-bold text-primary">À retenir</div>
        <p className="mt-1.5 text-xs leading-relaxed text-navy">
          {stats.revenusAnnuels === 0
            ? "Sans loyer déclaré, l'immeuble sera valorisé sur son seul patrimoine, ce qui le dessert le plus souvent."
            : stats.tauxOccupation === 100
              ? "Immeuble entièrement loué : le revenu est démontré, c'est l'argument le plus solide face à un investisseur."
              : "Renseignez les loyers de tous les lots, y compris libres, pour montrer le revenu atteignable."}
        </p>
      </div>
    </aside>
  );
}
