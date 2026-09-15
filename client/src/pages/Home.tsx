import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  Coins,
  Gamepad2,
  Lightbulb,
  MinusCircle,
  Pencil,
  Plus,
  RotateCcw,
  ShoppingBag,
  Sparkles,
  Utensils,
  WalletCards,
  X,
} from "lucide-react";
import { toast } from "sonner";

type Budget = {
  ocio: number;
  ahorros: number;
  emprendimiento: number;
  alimento: number;
  productos: number;
  juegos: number;
};

type EditableKey = keyof Budget;

const INITIAL_BUDGET: Budget = {
  ocio: 0,
  ahorros: 0,
  emprendimiento: 0,
  alimento: 0,
  productos: 0,
  juegos: 0,
};

const money = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

const formatMoney = (value: number) => money.format(Math.max(0, Math.round(value)));

function splitEqually(amount: number, parts: number) {
  const base = Math.floor(amount / parts);
  const remainder = amount % parts;
  return Array.from({ length: parts }, (_, index) => base + (index < remainder ? 1 : 0));
}

function splitLeisure(amount: number) {
  const products = Math.floor(amount / 2);
  const remaining = amount - products;
  const food = Math.floor(remaining / 2);
  const games = remaining - food;
  return [food, products, games];
}

function distributeAmount(amount: number): Budget {
  const [ocio, ahorros, emprendimiento] = splitEqually(amount, 3);
  const [alimento, productos, juegos] = splitLeisure(ocio);
  return { ocio, ahorros, emprendimiento, alimento, productos, juegos };
}

function readStoredBudget(): Budget {
  try {
    const stored = localStorage.getItem("dinero-en-tres-budget");
    if (!stored) return INITIAL_BUDGET;
    const parsed = JSON.parse(stored) as Partial<Budget>;
    return Object.keys(INITIAL_BUDGET).reduce((budget, key) => {
      const value = Number(parsed[key as EditableKey]);
      budget[key as EditableKey] = Number.isFinite(value) && value >= 0 ? Math.round(value) : 0;
      return budget;
    }, { ...INITIAL_BUDGET });
  } catch {
    return INITIAL_BUDGET;
  }
}

function EditField({
  label,
  value,
  onSave,
  onCancel,
}: {
  label: string;
  value: number;
  onSave: (value: number) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(String(value));

  return (
    <div className="edit-field" onClick={(event) => event.stopPropagation()}>
      <label htmlFor={`edit-${label}`}>{label}</label>
      <div className="edit-field-row">
        <span className="input-prefix">$</span>
        <input
          id={`edit-${label}`}
          autoFocus
          inputMode="numeric"
          value={draft}
          onChange={(event) => setDraft(event.target.value.replace(/[^0-9]/g, ""))}
          onKeyDown={(event) => {
            if (event.key === "Enter") onSave(Number(draft));
            if (event.key === "Escape") onCancel();
          }}
          aria-label={`Editar ${label}`}
        />
        <button className="icon-button save" type="button" onClick={() => onSave(Number(draft))} aria-label="Guardar">
          <Check size={16} strokeWidth={2.5} />
        </button>
        <button className="icon-button cancel" type="button" onClick={onCancel} aria-label="Cancelar">
          <X size={16} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}

function SubtractField({
  label,
  maxValue,
  onSave,
  onCancel,
}: {
  label: string;
  maxValue: number;
  onSave: (value: number) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState("");

  return (
    <div className="edit-field" onClick={(event) => event.stopPropagation()}>
      <label htmlFor={`subtract-${label}`}>Restar de {label} · disponible {formatMoney(maxValue)}</label>
      <div className="edit-field-row">
        <span className="input-prefix">−$</span>
        <input
          id={`subtract-${label}`}
          autoFocus
          inputMode="numeric"
          placeholder="0"
          value={draft}
          onChange={(event) => setDraft(event.target.value.replace(/[^0-9]/g, ""))}
          onKeyDown={(event) => {
            if (event.key === "Enter") onSave(Number(draft));
            if (event.key === "Escape") onCancel();
          }}
          aria-label={`Restar presupuesto de ${label}`}
        />
        <button className="icon-button save" type="button" onClick={() => onSave(Number(draft))} aria-label="Confirmar resta">
          <Check size={16} strokeWidth={2.5} />
        </button>
        <button className="icon-button cancel" type="button" onClick={onCancel} aria-label="Cancelar resta">
          <X size={16} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}

function StatCard({
  label,
  icon,
  value,
  tone,
  percent,
  onEdit,
  onSubtract,
}: {
  label: string;
  icon: React.ReactNode;
  value: number;
  tone: "coral" | "blue" | "yellow";
  percent: string;
  onEdit: () => void;
  onSubtract?: () => void;
}) {
  return (
    <article className={`stat-card ${tone}`}>
      <div className="stat-card-top">
        <div className="stat-icon">{icon}</div>
        <div className="stat-actions">
          <button className="edit-link" type="button" onClick={onEdit}>
            <Pencil size={13} /> Editar
          </button>
          {onSubtract && <button className="subtract-link" type="button" onClick={onSubtract}>
            <MinusCircle size={13} /> Restar
          </button>}
        </div>
      </div>
      <p className="stat-label">{label}</p>
      <p className="stat-value">{formatMoney(value)}</p>
      <div className="stat-card-footer">
        <span className="percent-pill">{percent}</span>
        <span className="stat-hint">del total</span>
      </div>
    </article>
  );
}

export default function Home() {
  const [budget, setBudget] = useState<Budget>(() => readStoredBudget());
  const [isAdding, setIsAdding] = useState(false);
  const [amountDraft, setAmountDraft] = useState("");
  const [editing, setEditing] = useState<EditableKey | null>(null);
  const [subtracting, setSubtracting] = useState<EditableKey | null>(null);
  const [showDetails, setShowDetails] = useState(true);

  useEffect(() => {
    localStorage.setItem("dinero-en-tres-budget", JSON.stringify(budget));
  }, [budget]);

  const total = useMemo(() => budget.ocio + budget.ahorros + budget.emprendimiento, [budget]);
  const leisureTotal = budget.alimento + budget.productos + budget.juegos;
  const hasBudget = total > 0;
  const leisurePercent = total ? Math.round((leisureTotal / total) * 100) : 0;
  const savingsPercent = total ? Math.round((budget.ahorros / total) * 100) : 0;
  const businessPercent = total ? Math.round((budget.emprendimiento / total) * 100) : 0;

  const addMoney = () => {
    const amount = Number(amountDraft);
    if (!amountDraft || !Number.isFinite(amount) || amount <= 0) {
      toast.error("Escribe una cantidad mayor que cero.");
      return;
    }
    const incoming = distributeAmount(Math.round(amount));
    setBudget((current) => ({
      ocio: current.ocio + incoming.ocio,
      ahorros: current.ahorros + incoming.ahorros,
      emprendimiento: current.emprendimiento + incoming.emprendimiento,
      alimento: current.alimento + incoming.alimento,
      productos: current.productos + incoming.productos,
      juegos: current.juegos + incoming.juegos,
    }));
    setAmountDraft("");
    setIsAdding(false);
    toast.success(`${formatMoney(amount)} se repartió correctamente.`);
  };

  const saveEdit = (key: EditableKey, nextValue: number) => {
    if (!Number.isFinite(nextValue) || nextValue < 0) {
      toast.error("Usa un valor válido de pesos colombianos.");
      return;
    }
    const value = Math.round(nextValue);
    setBudget((current) => {
      if (key === "ocio") {
        const [alimento, productos, juegos] = splitLeisure(value);
        return { ...current, ocio: value, alimento, productos, juegos };
      }
      if (key === "alimento" || key === "productos" || key === "juegos") {
        return { ...current, [key]: value, ocio: key === "alimento" ? value + current.productos + current.juegos : key === "productos" ? current.alimento + value + current.juegos : current.alimento + current.productos + value };
      }
      return { ...current, [key]: value };
    });
    setEditing(null);
    setSubtracting(null);
    toast.success("Cambio guardado.");
  };

  const subtractBudget = (key: Exclude<EditableKey, "ocio">, amount: number) => {
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Escribe una cantidad mayor que cero.");
      return;
    }
    const roundedAmount = Math.round(amount);
    const available = budget[key];
    if (roundedAmount > available) {
      toast.error(`No puedes restar más de ${formatMoney(available)}.`);
      return;
    }
    setBudget((current) => {
      const nextValue = current[key] - roundedAmount;
      if (key === "alimento" || key === "productos" || key === "juegos") {
        return { ...current, [key]: nextValue, ocio: current.ocio - roundedAmount };
      }
      return { ...current, [key]: nextValue };
    });
    setSubtracting(null);
    const label = key === "ahorros" ? "Ahorros" : key === "emprendimiento" ? "Emprendimiento" : key;
    toast.success(`${formatMoney(roundedAmount)} restados de ${label}.`);
  };

  const resetBudget = () => {
    setBudget(INITIAL_BUDGET);
    toast.success("Presupuesto reiniciado.");
  };

  return (
    <main className="app-shell">
      <div className="ambient-shape shape-one" />
      <div className="ambient-shape shape-two" />
      <div className="container app-container">
        <header className="topbar">
          <div className="brand-lockup">
            <div className="brand-mark"><WalletCards size={21} strokeWidth={2.2} /></div>
            <div>
              <p className="brand-name">Bolsillo claro</p>
              <p className="brand-subtitle">tu dinero, con intención</p>
            </div>
          </div>
          <div className="topbar-note"><Sparkles size={15} /> Presupuesto personal</div>
        </header>

        <section className="hero-section">
          <div className="hero-copy">
            <p className="eyebrow"><span className="eyebrow-dot" /> Vista general</p>
            <h1>Haz que cada peso<br /><em>cuente.</em></h1>
            <p className="hero-description">Organiza tus ingresos en lo que disfrutas hoy, lo que construyes para mañana y tus próximas grandes ideas.</p>
          </div>
          <div className="hero-action">
            {!isAdding ? (
              <button className="add-button" type="button" onClick={() => setIsAdding(true)}>
                <span className="add-button-icon"><Plus size={22} strokeWidth={2.6} /></span>
                <span>AGREGAR <span className="money-emoji">💸</span></span>
                <ArrowUpRight size={19} className="add-arrow" />
              </button>
            ) : (
              <div className="add-form">
                <div className="add-form-heading"><span>¿Cuánto recibiste?</span><button type="button" onClick={() => setIsAdding(false)} aria-label="Cerrar"><X size={18} /></button></div>
                <div className="amount-input-wrap"><span>$</span><input autoFocus inputMode="numeric" placeholder="0" value={amountDraft} onChange={(event) => setAmountDraft(event.target.value.replace(/[^0-9]/g, ""))} onKeyDown={(event) => event.key === "Enter" && addMoney()} /><small>COP</small></div>
                <button className="confirm-add" type="button" onClick={addMoney}>Repartir dinero <ArrowUpRight size={17} /></button>
              </div>
            )}
            <p className="action-caption">Se divide automáticamente en 3 partes iguales</p>
          </div>
        </section>

        <section className="total-panel" aria-label="Total administrado">
          <div className="total-panel-content">
            <div className="total-heading"><span className="total-icon"><Coins size={17} /></span><span>Total administrado</span></div>
            <p className="total-value">{formatMoney(total)}</p>
            <p className="total-caption">{hasBudget ? "Tu presupuesto está tomando forma." : "Agrega dinero para comenzar a organizarlo."}</p>
          </div>
          <div className="total-orbit orbit-one" /><div className="total-orbit orbit-two" />
          <div className="total-ratio"><span>100%</span><small>de tu dinero</small></div>
        </section>

        <section className="section-heading">
          <div><p className="eyebrow">Distribución</p><h2>Tus tres caminos</h2></div>
          <p className="section-help">Puedes editar cualquier cantidad<br className="desktop-break" /> cuando lo necesites.</p>
        </section>

        <section className="stats-grid">
          <StatCard label="Ocio" icon={<Gamepad2 size={21} />} value={leisureTotal} tone="coral" percent={`${leisurePercent}%`} onEdit={() => setEditing("ocio")} />
          <StatCard label="Ahorros" icon={<Coins size={21} />} value={budget.ahorros} tone="blue" percent={`${savingsPercent}%`} onEdit={() => setEditing("ahorros")} onSubtract={() => setSubtracting("ahorros")} />
          <StatCard label="Emprendimiento" icon={<Lightbulb size={21} />} value={budget.emprendimiento} tone="yellow" percent={`${businessPercent}%`} onEdit={() => setEditing("emprendimiento")} onSubtract={() => setSubtracting("emprendimiento")} />
        </section>

        {editing && !["alimento", "productos", "juegos"].includes(editing) && (
          <div className="inline-editor main-editor">
            <EditField label={editing === "ocio" ? "Nuevo total de Ocio" : editing === "ahorros" ? "Nuevo total de Ahorros" : "Nuevo total de Emprendimiento"} value={editing === "ocio" ? leisureTotal : budget[editing]} onSave={(value) => saveEdit(editing, value)} onCancel={() => setEditing(null)} />
          </div>
        )}

        {subtracting && ["ahorros", "emprendimiento"].includes(subtracting) && (
          <div className="inline-editor main-editor">
            <SubtractField label={subtracting === "ahorros" ? "Ahorros" : "Emprendimiento"} maxValue={budget[subtracting]} onSave={(value) => subtractBudget(subtracting as "ahorros" | "emprendimiento", value)} onCancel={() => setSubtracting(null)} />
          </div>
        )}

        <section className="leisure-section">
          <button className="leisure-header" type="button" onClick={() => setShowDetails(!showDetails)} aria-expanded={showDetails}>
            <div className="leisure-title-wrap"><div className="leisure-icon"><Gamepad2 size={21} /></div><div><p className="eyebrow">Detalle de ocio</p><h2>Donde lo disfrutas</h2></div></div>
            <div className="leisure-total"><span>Total ocio</span><strong>{formatMoney(leisureTotal)}</strong><ChevronDown size={18} className={showDetails ? "rotated" : ""} /></div>
          </button>
          {showDetails && <div className="subcategories-grid">
            <Subcategory icon={<Utensils size={18} />} label="Alimento" hint="25% de ocio" value={budget.alimento} color="orange" editing={editing === "alimento"} subtracting={subtracting === "alimento"} onEdit={() => setEditing("alimento")} onSubtract={() => setSubtracting("alimento")} onSave={(value) => saveEdit("alimento", value)} onSubtractSave={(value) => subtractBudget("alimento", value)} onCancel={() => { setEditing(null); setSubtracting(null); }} />
            <Subcategory icon={<ShoppingBag size={18} />} label="Productos" hint="50% de ocio" value={budget.productos} color="pink" editing={editing === "productos"} subtracting={subtracting === "productos"} onEdit={() => setEditing("productos")} onSubtract={() => setSubtracting("productos")} onSave={(value) => saveEdit("productos", value)} onSubtractSave={(value) => subtractBudget("productos", value)} onCancel={() => { setEditing(null); setSubtracting(null); }} />
            <Subcategory icon={<Gamepad2 size={18} />} label="Juegos" hint="25% de ocio" value={budget.juegos} color="purple" editing={editing === "juegos"} subtracting={subtracting === "juegos"} onEdit={() => setEditing("juegos")} onSubtract={() => setSubtracting("juegos")} onSave={(value) => saveEdit("juegos", value)} onSubtractSave={(value) => subtractBudget("juegos", value)} onCancel={() => { setEditing(null); setSubtracting(null); }} />
          </div>}
        </section>

        <footer className="footer-row"><span><span className="status-dot" /> Guardado localmente en este dispositivo</span><button type="button" onClick={resetBudget}><RotateCcw size={14} /> Reiniciar presupuesto</button></footer>
      </div>
    </main>
  );
}

function Subcategory({ icon, label, hint, value, color, editing, subtracting, onEdit, onSubtract, onSave, onSubtractSave, onCancel }: { icon: React.ReactNode; label: string; hint: string; value: number; color: string; editing: boolean; subtracting: boolean; onEdit: () => void; onSubtract: () => void; onSave: (value: number) => void; onSubtractSave: (value: number) => void; onCancel: () => void }) {
  return <article className={`subcategory-card ${color}`}>
    <div className="subcat-top"><div className="subcat-icon">{icon}</div><span className="subcat-hint">{hint}</span></div>
    <p className="subcat-label">{label}</p>
    {editing ? <EditField label={label} value={value} onSave={onSave} onCancel={onCancel} /> : subtracting ? <SubtractField label={label} maxValue={value} onSave={onSubtractSave} onCancel={onCancel} /> : <div className="subcat-bottom"><strong>{formatMoney(value)}</strong><div className="subcat-actions"><button type="button" onClick={onEdit} aria-label={`Editar ${label}`}><Pencil size={14} /></button><button type="button" onClick={onSubtract} aria-label={`Restar de ${label}`}><MinusCircle size={14} /></button></div></div>}
  </article>;
}
