import { ShieldAlert, Ban, TrendingDown } from 'lucide-react';
import { MAX_DAILY_LOSS } from './anchorsData';

const rules = [
  {
    icon: ShieldAlert,
    title: 'חוק 1 - סטופ-לוס קשיח במערכת בלבד',
    description: 'אין כניסה לעסקה בלי פקודת Stop Loss מוזנת ישירות לברוקר. אין ניהול מנטלי.',
  },
  {
    icon: TrendingDown,
    title: `חוק 2 - גג הפסד יומי (Max Daily Loss = $${MAX_DAILY_LOSS})`,
    description: 'הגעת למינוס $300? סוגרים את המערכת ויוצאים מהמחשב ללא ניסיונות נקמה.',
  },
  {
    icon: Ban,
    title: 'חוק 3 - איסור מסחר מתחת ל-$1.00',
    description: 'הימנעות ממניות פני קיצוניות למניעת שחיקת עמלות ומלכודות נזילות.',
  },
];

export default function IronRulesBanner() {
  return (
    <section>
      <div className="rounded-2xl border border-[#ef4444]/50 bg-[#ef4444]/5 p-5 shadow-[0_0_0_1px_rgba(239,68,68,0.5),0_0_24px_rgba(239,68,68,0.25)] sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <span className="text-lg">🛑</span>
          <h2 className="text-base font-bold text-slate-100 sm:text-lg">חוקי הברזל להגנה על החשבון</h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {rules.map((rule) => {
            const Icon = rule.icon;
            return (
              <div
                key={rule.title}
                className="flex gap-3 rounded-xl border border-[#ef4444]/30 bg-[#0f172a]/60 p-4"
              >
                <Icon size={20} className="mt-0.5 flex-shrink-0 text-[#ef4444]" />
                <div>
                  <h3 className="text-sm font-bold text-slate-100">{rule.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">{rule.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
