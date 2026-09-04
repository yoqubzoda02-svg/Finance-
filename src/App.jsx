import React, { useState, useCallback } from 'react';
import { Plus, Trash2, Wallet, Send, AlertCircle, TrendingUp } from 'lucide-react';

const STORAGE_KEY = 'amir-finance-v1';
const FIXED_DAILY = 2000;
const ACCRUED_DAILY = 500;

const emptyData = {
  salaryEntries: [],
  transfers: [],
  debts: [],
  penalties: [],
};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function startOfWeek(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function fmt(n) {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(Math.round(n || 0));
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', weekday: 'short' });
}

const TABS = [
  { id: 'salary', label: 'ЗП', icon: Wallet },
  { id: 'transfers', label: 'Домой', icon: Send },
  { id: 'debts', label: 'Долги', icon: AlertCircle },
  { id: 'summary', label: 'Итого', icon: TrendingUp },
];

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...emptyData, ...JSON.parse(raw) };
  } catch (e) {
    // ignore
  }
  return emptyData;
}

export default function App() {
  const [data, setData] = useState(loadData);
  const [tab, setTab] = useState('salary');
  const [toast, setToast] = useState(null);

  const save = useCallback((next) => {
    setData(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      setToast('Не удалось сохранить данные.');
      setTimeout(() => setToast(null), 3000);
    }
  }, []);

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div style={styles.headerTitle}>Финансы</div>
        <div style={styles.headerSub}>Амир · личный учёт</div>
      </header>

      <SummaryStrip data={data} />

      <main style={styles.main}>
        {tab === 'salary' && <SalaryTab data={data} save={save} />}
        {tab === 'transfers' && <TransfersTab data={data} save={save} />}
        {tab === 'debts' && <DebtsTab data={data} save={save} />}
        {tab === 'summary' && <SummaryTab data={data} />}
      </main>

      <nav style={styles.nav}>
        {TABS.map((t) => {
          const IconComp = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{ ...styles.navBtn, color: active ? '#F2EEE7' : '#8A8681' }}
            >
              <IconComp size={20} strokeWidth={active ? 2.4 : 1.8} />
              <span style={{ fontSize: 11, marginTop: 4 }}>{t.label}</span>
              {active && <div style={styles.navIndicator} />}
            </button>
          );
        })}
      </nav>

      {toast && <div style={styles.toast}>{toast}</div>}
    </div>
  );
}

function SummaryStrip({ data }) {
  const weekStart = startOfWeek(new Date());
  const weekEntries = data.salaryEntries.filter((e) => new Date(e.date) >= weekStart);
  const weekPenalties = data.penalties.filter((p) => new Date(p.date) >= weekStart);

  const accruedThisWeek = weekEntries.length * ACCRUED_DAILY;
  const revenueThisWeek = weekEntries.reduce((s, e) => s + (e.revenuePercent || 0), 0);
  const penaltyThisWeek = weekPenalties.reduce((s, p) => s + (p.amount || 0), 0);
  const weekPayout = accruedThisWeek + revenueThisWeek - penaltyThisWeek;

  const todayEntry = data.salaryEntries.find((e) => e.date === todayStr());
  const todayTotal = FIXED_DAILY + (todayEntry ? todayEntry.revenuePercent || 0 : 0);

  return (
    <div style={styles.stripWrap}>
      <div style={styles.stripCard}>
        <div style={styles.stripLabel}>Сегодня</div>
        <div style={styles.stripValue}>
          {fmt(todayTotal)} <span style={styles.stripUnit}>₽</span>
        </div>
      </div>
      <div style={styles.stripCard}>
        <div style={styles.stripLabel}>Накопилось за неделю</div>
        <div style={{ ...styles.stripValue, color: weekPayout < 0 ? '#C4573F' : '#D4A24C' }}>
          {fmt(weekPayout)} <span style={styles.stripUnit}>₽</span>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section style={{ marginBottom: 24 }}>
      <h2 style={styles.sectionTitle}>{title}</h2>
      {children}
    </section>
  );
}

function EmptyState({ text }) {
  return <div style={styles.empty}>{text}</div>;
}

function SalaryTab({ data, save }) {
  const [showForm, setShowForm] = useState(false);
  const [date, setDate] = useState(todayStr());
  const [revenuePercent, setRevenuePercent] = useState('');
  const [note, setNote] = useState('');
  const [penaltyMode, setPenaltyMode] = useState(false);
  const [penaltyAmount, setPenaltyAmount] = useState('');
  const [penaltyReason, setPenaltyReason] = useState('');

  const addEntry = () => {
    const entry = { id: uid(), date, revenuePercent: parseFloat(revenuePercent) || 0, note: note.trim() };
    save({ ...data, salaryEntries: [entry, ...data.salaryEntries] });
    setRevenuePercent('');
    setNote('');
    setShowForm(false);
  };

  const addPenalty = () => {
    if (!penaltyAmount) return;
    const p = { id: uid(), date, amount: parseFloat(penaltyAmount) || 0, reason: penaltyReason.trim() };
    save({ ...data, penalties: [p, ...data.penalties] });
    setPenaltyAmount('');
    setPenaltyReason('');
    setPenaltyMode(false);
  };

  const removeEntry = (id) => save({ ...data, salaryEntries: data.salaryEntries.filter((e) => e.id !== id) });
  const removePenalty = (id) => save({ ...data, penalties: data.penalties.filter((p) => p.id !== id) });

  const sortedEntries = [...data.salaryEntries].sort((a, b) => b.date.localeCompare(a.date));
  const sortedPenalties = [...data.penalties].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div>
      <Section title="Каждый день">
        <div style={styles.infoRow}>Фикс: {fmt(FIXED_DAILY)} ₽/день (сразу)</div>
        <div style={styles.infoRow}>Накопительно: {fmt(ACCRUED_DAILY)} ₽/день + 5% (в конце недели)</div>

        {!showForm ? (
          <button style={styles.addBtn} onClick={() => setShowForm(true)}>
            <Plus size={16} /> Записать сегодняшний %
          </button>
        ) : (
          <div style={styles.form}>
            <label style={styles.label}>Дата</label>
            <input style={styles.input} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <label style={styles.label}>5% от выручки (сумма в рублях)</label>
            <input
              style={styles.input}
              type="number"
              inputMode="decimal"
              placeholder="0"
              value={revenuePercent}
              onChange={(e) => setRevenuePercent(e.target.value)}
            />
            <label style={styles.label}>Заметка (необязательно)</label>
            <input style={styles.input} type="text" value={note} onChange={(e) => setNote(e.target.value)} />
            <div style={styles.formRow}>
              <button style={styles.cancelBtn} onClick={() => setShowForm(false)}>Отмена</button>
              <button style={styles.saveBtn} onClick={addEntry}>Сохранить</button>
            </div>
          </div>
        )}
      </Section>

      <Section title="Записи">
        {sortedEntries.length === 0 ? (
          <EmptyState text="Пока нет записей. Добавь первую." />
        ) : (
          sortedEntries.map((e) => (
            <div key={e.id} style={styles.listItem}>
              <div>
                <div style={styles.listItemTitle}>{formatDate(e.date)}</div>
                <div style={styles.listItemSub}>
                  {fmt(FIXED_DAILY)} ₽ фикс + {fmt(ACCRUED_DAILY)} ₽ накоп. + {fmt(e.revenuePercent)} ₽ (5%)
                  {e.note && ` · ${e.note}`}
                </div>
              </div>
              <button style={styles.deleteBtn} onClick={() => removeEntry(e.id)}>
                <Trash2 size={16} />
              </button>
            </div>
          ))
        )}
      </Section>

      <Section title="Штрафы (списываются в конце недели)">
        {!penaltyMode ? (
          <button style={styles.addBtnPenalty} onClick={() => setPenaltyMode(true)}>
            <Plus size={16} /> Записать штраф
          </button>
        ) : (
          <div style={styles.form}>
            <label style={styles.label}>Дата</label>
            <input style={styles.input} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <label style={styles.label}>Сумма штрафа (₽)</label>
            <input
              style={styles.input}
              type="number"
              inputMode="decimal"
              placeholder="0"
              value={penaltyAmount}
              onChange={(e) => setPenaltyAmount(e.target.value)}
            />
            <label style={styles.label}>За что</label>
            <input style={styles.input} type="text" value={penaltyReason} onChange={(e) => setPenaltyReason(e.target.value)} />
            <div style={styles.formRow}>
              <button style={styles.cancelBtn} onClick={() => setPenaltyMode(false)}>Отмена</button>
              <button style={styles.savePenaltyBtn} onClick={addPenalty}>Сохранить</button>
            </div>
          </div>
        )}

        {sortedPenalties.length > 0 && (
          <div style={{ marginTop: 12 }}>
            {sortedPenalties.map((p) => (
              <div key={p.id} style={styles.listItem}>
                <div>
                  <div style={{ ...styles.listItemTitle, color: '#C4573F' }}>
                    −{fmt(p.amount)} ₽ · {formatDate(p.date)}
                  </div>
                  {p.reason && <div style={styles.listItemSub}>{p.reason}</div>}
                </div>
                <button style={styles.deleteBtn} onClick={() => removePenalty(p.id)}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function TransfersTab({ data, save }) {
  const [showForm, setShowForm] = useState(false);
  const [date, setDate] = useState(todayStr());
  const [amountSomoni, setAmountSomoni] = useState('');
  const [note, setNote] = useState('');

  const addTransfer = () => {
    if (!amountSomoni) return;
    const t = { id: uid(), date, amountSomoni: parseFloat(amountSomoni) || 0, note: note.trim() };
    save({ ...data, transfers: [t, ...data.transfers] });
    setAmountSomoni('');
    setNote('');
    setShowForm(false);
  };

  const removeTransfer = (id) => save({ ...data, transfers: data.transfers.filter((t) => t.id !== id) });
  const sorted = [...data.transfers].sort((a, b) => b.date.localeCompare(a.date));
  const totalSomoni = data.transfers.reduce((s, t) => s + t.amountSomoni, 0);

  return (
    <div>
      <Section title="Всего отправлено домой">
        <div style={styles.bigNumber}>
          {fmt(totalSomoni)} <span style={styles.stripUnit}>сомони</span>
        </div>
      </Section>

      <Section title="Переводы">
        {!showForm ? (
          <button style={styles.addBtn} onClick={() => setShowForm(true)}>
            <Plus size={16} /> Записать перевод
          </button>
        ) : (
          <div style={styles.form}>
            <label style={styles.label}>Дата</label>
            <input style={styles.input} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <label style={styles.label}>Сумма в сомони</label>
            <input
              style={styles.input}
              type="number"
              inputMode="decimal"
              placeholder="0"
              value={amountSomoni}
              onChange={(e) => setAmountSomoni(e.target.value)}
            />
            <label style={styles.label}>Заметка (необязательно)</label>
            <input
              style={styles.input}
              type="text"
              placeholder="напр. родителям на еду"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <div style={styles.formRow}>
              <button style={styles.cancelBtn} onClick={() => setShowForm(false)}>Отмена</button>
              <button style={styles.saveBtn} onClick={addTransfer}>Сохранить</button>
            </div>
          </div>
        )}

        {sorted.length === 0 ? (
          <EmptyState text="Переводов ещё не было." />
        ) : (
          <div style={{ marginTop: 12 }}>
            {sorted.map((t) => (
              <div key={t.id} style={styles.listItem}>
                <div>
                  <div style={styles.listItemTitle}>{fmt(t.amountSomoni)} сомони · {formatDate(t.date)}</div>
                  {t.note && <div style={styles.listItemSub}>{t.note}</div>}
                </div>
                <button style={styles.deleteBtn} onClick={() => removeTransfer(t.id)}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function DebtsTab({ data, save }) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [payOpenId, setPayOpenId] = useState(null);
  const [payAmount, setPayAmount] = useState('');

  const addDebt = () => {
    if (!name || !totalAmount) return;
    const d = {
      id: uid(),
      name: name.trim(),
      totalAmount: parseFloat(totalAmount) || 0,
      paidAmount: parseFloat(paidAmount) || 0,
    };
    save({ ...data, debts: [d, ...data.debts] });
    setName('');
    setTotalAmount('');
    setPaidAmount('');
    setShowForm(false);
  };

  const removeDebt = (id) => save({ ...data, debts: data.debts.filter((d) => d.id !== id) });

  const addPayment = (id) => {
    const amt = parseFloat(payAmount) || 0;
    if (!amt) return;
    const debts = data.debts.map((d) => (d.id === id ? { ...d, paidAmount: d.paidAmount + amt } : d));
    save({ ...data, debts });
    setPayAmount('');
    setPayOpenId(null);
  };

  const totalDebt = data.debts.reduce((s, d) => s + (d.totalAmount - d.paidAmount), 0);

  return (
    <div>
      <Section title="Осталось выплатить всего">
        <div style={{ ...styles.bigNumber, color: '#C4573F' }}>
          {fmt(totalDebt)} <span style={styles.stripUnit}>₽</span>
        </div>
      </Section>

      <Section title="Долги">
        {!showForm ? (
          <button style={styles.addBtnPenalty} onClick={() => setShowForm(true)}>
            <Plus size={16} /> Добавить долг
          </button>
        ) : (
          <div style={styles.form}>
            <label style={styles.label}>Название (напр. Золотая Корона)</label>
            <input style={styles.input} type="text" value={name} onChange={(e) => setName(e.target.value)} />
            <label style={styles.label}>Общая сумма долга (₽)</label>
            <input style={styles.input} type="number" inputMode="decimal" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} />
            <label style={styles.label}>Уже выплачено (₽)</label>
            <input
              style={styles.input}
              type="number"
              inputMode="decimal"
              placeholder="0"
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
            />
            <div style={styles.formRow}>
              <button style={styles.cancelBtn} onClick={() => setShowForm(false)}>Отмена</button>
              <button style={styles.savePenaltyBtn} onClick={addDebt}>Сохранить</button>
            </div>
          </div>
        )}

        {data.debts.length === 0 ? (
          <EmptyState text="Долгов не добавлено." />
        ) : (
          <div style={{ marginTop: 12 }}>
            {data.debts.map((d) => {
              const remaining = d.totalAmount - d.paidAmount;
              const pct = d.totalAmount > 0 ? Math.min(100, (d.paidAmount / d.totalAmount) * 100) : 0;
              return (
                <div key={d.id} style={styles.debtCard}>
                  <div style={styles.debtHeader}>
                    <div style={styles.listItemTitle}>{d.name}</div>
                    <button style={styles.deleteBtn} onClick={() => removeDebt(d.id)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div style={styles.progressTrack}>
                    <div style={{ ...styles.progressFill, width: `${pct}%` }} />
                  </div>
                  <div style={styles.listItemSub}>
                    Осталось {fmt(remaining)} ₽ из {fmt(d.totalAmount)} ₽
                  </div>
                  {payOpenId === d.id ? (
                    <div style={{ ...styles.form, marginTop: 8 }}>
                      <input
                        style={styles.input}
                        type="number"
                        inputMode="decimal"
                        placeholder="Сумма платежа"
                        value={payAmount}
                        onChange={(e) => setPayAmount(e.target.value)}
                      />
                      <div style={styles.formRow}>
                        <button style={styles.cancelBtn} onClick={() => { setPayOpenId(null); setPayAmount(''); }}>Отмена</button>
                        <button style={styles.saveBtn} onClick={() => addPayment(d.id)}>Внести</button>
                      </div>
                    </div>
                  ) : (
                    <button style={styles.smallAddBtn} onClick={() => setPayOpenId(d.id)}>+ Внести платёж</button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}

function SummaryTab({ data }) {
  const totalFixed = data.salaryEntries.length * FIXED_DAILY;
  const totalAccrued = data.salaryEntries.length * ACCRUED_DAILY;
  const totalRevenue = data.salaryEntries.reduce((s, e) => s + (e.revenuePercent || 0), 0);
  const totalPenalties = data.penalties.reduce((s, p) => s + (p.amount || 0), 0);
  const totalEarned = totalFixed + totalAccrued + totalRevenue - totalPenalties;
  const totalTransferredSomoni = data.transfers.reduce((s, t) => s + t.amountSomoni, 0);
  const totalDebtRemaining = data.debts.reduce((s, d) => s + (d.totalAmount - d.paidAmount), 0);

  return (
    <div>
      <Section title="Заработано всего">
        <SummaryRow label="Фикс (2000/день)" value={`${fmt(totalFixed)} ₽`} />
        <SummaryRow label="Накопительно (500/день)" value={`${fmt(totalAccrued)} ₽`} />
        <SummaryRow label="5% от выручки" value={`${fmt(totalRevenue)} ₽`} />
        <SummaryRow label="Штрафы" value={`−${fmt(totalPenalties)} ₽`} negative />
        <div style={styles.divider} />
        <SummaryRow label="Итого заработано" value={`${fmt(totalEarned)} ₽`} bold />
      </Section>

      <Section title="Отправлено домой">
        <SummaryRow label="Всего переводов" value={`${fmt(totalTransferredSomoni)} сомони`} bold />
      </Section>

      <Section title="Долги">
        <SummaryRow label="Осталось выплатить" value={`${fmt(totalDebtRemaining)} ₽`} negative={totalDebtRemaining > 0} bold />
      </Section>
    </div>
  );
}

function SummaryRow({ label, value, bold, negative }) {
  return (
    <div style={styles.summaryRow}>
      <span style={{ color: '#B3AFA9', fontSize: 14 }}>{label}</span>
      <span
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: bold ? 16 : 14,
          fontWeight: bold ? 600 : 400,
          color: negative ? '#C4573F' : '#F2EEE7',
        }}
      >
        {value}
      </span>
    </div>
  );
}

const styles = {
  app: {
    minHeight: '100vh',
    background: '#1C1B1A',
    fontFamily: "'Inter', sans-serif",
    color: '#F2EEE7',
    paddingBottom: 84,
    maxWidth: 480,
    margin: '0 auto',
    position: 'relative',
  },
  header: { padding: '24px 20px 8px' },
  headerTitle: { fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em' },
  headerSub: { fontSize: 13, color: '#8A8681', marginTop: 2 },
  stripWrap: { display: 'flex', gap: 10, padding: '12px 20px 8px' },
  stripCard: { flex: 1, background: '#242320', borderRadius: 14, padding: '14px 16px', border: '1px solid #302E2A' },
  stripLabel: { fontSize: 12, color: '#8A8681', marginBottom: 6 },
  stripValue: { fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 600, color: '#2F9E6E' },
  stripUnit: { fontSize: 13, fontWeight: 400, color: '#8A8681' },
  main: { padding: '16px 20px 20px' },
  sectionTitle: { fontSize: 13, fontWeight: 600, color: '#8A8681', marginBottom: 10, marginTop: 0 },
  infoRow: { fontSize: 13, color: '#B3AFA9', marginBottom: 4 },
  addBtn: {
    display: 'flex', alignItems: 'center', gap: 6, background: '#2F9E6E', color: '#0F1F17',
    border: 'none', borderRadius: 12, padding: '11px 16px', fontSize: 14, fontWeight: 600,
    marginTop: 10, cursor: 'pointer', width: '100%', justifyContent: 'center',
  },
  addBtnPenalty: {
    display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', color: '#C4573F',
    border: '1px solid #4A332C', borderRadius: 12, padding: '11px 16px', fontSize: 14, fontWeight: 500,
    cursor: 'pointer', width: '100%', justifyContent: 'center',
  },
  smallAddBtn: { background: 'transparent', color: '#D4A24C', border: 'none', fontSize: 13, fontWeight: 500, padding: '6px 0', cursor: 'pointer', marginTop: 4 },
  form: { background: '#242320', borderRadius: 14, padding: 14, marginTop: 10, border: '1px solid #302E2A' },
  label: { fontSize: 12, color: '#8A8681', display: 'block', marginBottom: 4, marginTop: 10 },
  input: {
    width: '100%', background: '#1C1B1A', border: '1px solid #302E2A', borderRadius: 9,
    padding: '10px 12px', color: '#F2EEE7', fontSize: 14, fontFamily: "'Inter', sans-serif", boxSizing: 'border-box',
  },
  formRow: { display: 'flex', gap: 8, marginTop: 14 },
  cancelBtn: { flex: 1, background: 'transparent', border: '1px solid #302E2A', color: '#B3AFA9', borderRadius: 9, padding: '10px 0', fontSize: 14, cursor: 'pointer' },
  saveBtn: { flex: 1, background: '#2F9E6E', border: 'none', color: '#0F1F17', borderRadius: 9, padding: '10px 0', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  savePenaltyBtn: { flex: 1, background: '#D4A24C', border: 'none', color: '#2A1F0D', borderRadius: 9, padding: '10px 0', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  listItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '12px 0', borderBottom: '1px solid #262420' },
  listItemTitle: { fontSize: 14, fontWeight: 500, color: '#F2EEE7' },
  listItemSub: { fontSize: 12, color: '#8A8681', marginTop: 3 },
  deleteBtn: { background: 'transparent', border: 'none', color: '#8A8681', cursor: 'pointer', padding: 4 },
  bigNumber: { fontFamily: "'JetBrains Mono', monospace", fontSize: 32, fontWeight: 600, color: '#D4A24C' },
  debtCard: { background: '#242320', borderRadius: 14, padding: 14, marginBottom: 10, border: '1px solid #302E2A' },
  debtHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  progressTrack: { height: 6, background: '#1C1B1A', borderRadius: 999, overflow: 'hidden', marginBottom: 6 },
  progressFill: { height: '100%', background: '#2F9E6E', borderRadius: 999 },
  divider: { height: 1, background: '#302E2A', margin: '8px 0' },
  summaryRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' },
  nav: {
    position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480,
    background: '#242320', borderTop: '1px solid #302E2A', display: 'flex', padding: '8px 8px calc(8px + env(safe-area-inset-bottom))',
  },
  navBtn: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px 0', position: 'relative' },
  navIndicator: { position: 'absolute', top: -8, width: 4, height: 4, borderRadius: '50%', background: '#2F9E6E' },
  toast: { position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)', background: '#C4573F', color: '#fff', padding: '10px 16px', borderRadius: 10, fontSize: 13 },
};
