"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/Modal";
import TransactionForm from "@/components/TransactionForm";
import { toast } from "sonner";

type Category = { id: number; name: string; type: string; parentName: string | null };
type Transaction = { id: number; amount: number; date: string; description: string; type: string; banco: string | null; category: Category };
type DeliverySession = { id: number; date: string; startTime: string | null; endTime: string | null; hours: number | null; earnings: number | null; orders: number | null };

export default function FinanzasPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [indicators, setIndicators] = useState({ ingresos: 0, gastosNecesarios: 0, gastosInnecesarios: 0, totalGastos: 0, restante: 0 });
  const [deliverySessions, setDeliverySessions] = useState<DeliverySession[]>([]);
  const [historicalDeliveryEarnings, setHistoricalDeliveryEarnings] = useState(0);
  const [ahorroData, setAhorroData] = useState({ totalIngresos: 0, totalGastos: 0, balanceHistorico: 0, savingGoal: 0 });

  const [year, setYear] = useState(() => new Date().getFullYear().toString());
  const [month, setMonth] = useState(() => String(new Date().getMonth() + 1).padStart(2, '0'));
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("lifeos_finanzas_tab") || "general";
    }
    return "general";
  });
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("lifeos_finanzas_tab", activeTab);
    }
  }, [activeTab]);

  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | undefined>();
  const [categoryToEdit, setCategoryToEdit] = useState<Category | undefined>();
  const [deliveryToEdit, setDeliveryToEdit] = useState<any | undefined>();

  const [isSubmittingCat, setIsSubmittingCat] = useState(false);
  const [isSubmittingDel, setIsSubmittingDel] = useState(false);
  const [isSubmittingAhorro, setIsSubmittingAhorro] = useState(false);

  useEffect(() => {
    fetchData();
  }, [year, month]);

  const fetchData = async () => {
    setLoading(true);
    const res = await fetch(`/api/finanzas?year=${year}&month=${month}`);
    const data = await res.json();
    setTransactions(data.transactions || []);
    setCategories(data.categories || []);
    setIndicators(data.indicators || { ingresos: 0, gastosNecesarios: 0, gastosInnecesarios: 0, totalGastos: 0, restante: 0 });
    
    const resDel = await fetch(`/api/finanzas/delivery?year=${year}&month=${month}`);
    const dataDel = await resDel.json();
    setDeliverySessions(dataDel.sessions || []);
    setHistoricalDeliveryEarnings(dataDel.historicalEarnings || 0);

    const resAh = await fetch(`/api/finanzas/ahorro`);
    const dataAh = await resAh.json();
    setAhorroData(dataAh || { totalIngresos: 0, totalGastos: 0, balanceHistorico: 0, savingGoal: 0 });

    setLoading(false);
  };

  const handleDeleteTransaction = async (id: number) => {
    if(!confirm("¿Borrar transacción?")) return;
    try {
      await fetch(`/api/finanzas?id=${id}`, { method: "DELETE" });
      toast.success("Transacción eliminada");
      fetchData();
    } catch {
      toast.error("Error al eliminar");
    }
  };

  const openNewModal = () => {
    setTransactionToEdit(undefined);
    setIsModalOpen(true);
  };

  const openEditModal = (t: Transaction) => {
    setTransactionToEdit(t);
    setIsModalOpen(true);
  };

  // CATEGORIA LOGIC
  const [catName, setCatName] = useState("");
  const [catType, setCatType] = useState("GASTO_NECESARIO");
  const [catParent, setCatParent] = useState("");

  const openNewCategory = () => {
    setCategoryToEdit(undefined);
    setCatName("");
    setCatType("GASTO_NECESARIO");
    setCatParent("");
    setIsCategoryModalOpen(true);
  };

  const openEditCategory = (cat: Category) => {
    setCategoryToEdit(cat);
    setCatName(cat.name);
    setCatType(cat.type);
    setCatParent(cat.parentName || "");
    setIsCategoryModalOpen(true);
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName) return;

    setIsSubmittingCat(true);
    const payload = { id: categoryToEdit?.id, name: catName, type: catType, parentName: catParent || null };

    try {
      if (categoryToEdit) {
        await fetch("/api/finanzas/categorias", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      } else {
        await fetch("/api/finanzas/categorias", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      }
      toast.success("Categoría guardada");
      setIsCategoryModalOpen(false);
      fetchData();
    } catch {
      toast.error("Error al guardar categoría");
    } finally {
      setIsSubmittingCat(false);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if(!confirm("¿Borrar categoría y TODAS sus transacciones?")) return;
    try {
      await fetch(`/api/finanzas/categorias?id=${id}`, { method: "DELETE" });
      toast.success("Categoría eliminada");
      fetchData();
    } catch {
      toast.error("Error al eliminar categoría");
    }
  };

  // DELIVERY LOGIC
  const [delDate, setDelDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [delStartTime, setDelStartTime] = useState("");
  const [delEndTime, setDelEndTime] = useState("");
  const [delHours, setDelHours] = useState("");
  const [delEarnings, setDelEarnings] = useState("");
  const [delOrders, setDelOrders] = useState("");

  useEffect(() => {
    if(delStartTime && delEndTime) {
      const [h1, m1] = delStartTime.split(':').map(Number);
      const [h2, m2] = delEndTime.split(':').map(Number);
      let diff = (h2 + m2/60) - (h1 + m1/60);
      if (diff < 0) diff += 24;
      setDelHours(diff.toFixed(1));
    }
  }, [delStartTime, delEndTime]);

  const openNewDelivery = () => {
    setDeliveryToEdit(undefined);
    setDelDate(new Date().toISOString().split('T')[0]);
    setDelStartTime("");
    setDelEndTime("");
    setDelHours("");
    setDelEarnings("");
    setDelOrders("");
    setIsDeliveryModalOpen(true);
  };

  const openEditDelivery = (d: any) => {
    setDeliveryToEdit(d);
    setDelDate(d.date.split('T')[0]);
    setDelStartTime(d.startTime || "");
    setDelEndTime(d.endTime || "");
    setDelHours(d.hours?.toString() || "");
    setDelEarnings(d.earnings?.toString() || "");
    setDelOrders(d.orders?.toString() || "");
    setIsDeliveryModalOpen(true);
  };

  const handleDeliverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!delDate) return;

    setIsSubmittingDel(true);
    const payload = { 
      id: deliveryToEdit?.id, 
      date: delDate, 
      startTime: delStartTime || null,
      endTime: delEndTime || null,
      hours: delHours || null, 
      earnings: delEarnings || null, 
      orders: delOrders || null 
    };
    
    try {
      await fetch("/api/finanzas/delivery", { 
        method: deliveryToEdit ? "PUT" : "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify(payload) 
      });
      toast.success("Turno guardado");
      setIsDeliveryModalOpen(false);
      fetchData();
    } catch {
      toast.error("Error al guardar el turno");
    } finally {
      setIsSubmittingDel(false);
    }
  };

  const handleDeleteDelivery = async (id: number) => {
    if(!confirm("¿Borrar turno?")) return;
    try {
      await fetch(`/api/finanzas/delivery?id=${id}`, { method: "DELETE" });
      toast.success("Turno eliminado");
      fetchData();
    } catch {
      toast.error("Error al eliminar turno");
    }
  };

  // AHORRO LOGIC
  const [newGoal, setNewGoal] = useState("");
  const handleGoalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoal) return;
    setIsSubmittingAhorro(true);
    try {
      await fetch("/api/finanzas/ahorro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ savingGoal: newGoal })
      });
      toast.success("Meta actualizada");
      setNewGoal("");
      fetchData();
    } catch {
      toast.error("Error al actualizar la meta");
    } finally {
      setIsSubmittingAhorro(false);
    }
  };

  return (
    <div className="space-y-6 pb-24 flex flex-col min-h-screen relative">
      <header className="py-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Finanzas</h1>
          <button 
            onClick={() => setActiveTab("categorias")} 
            className="text-lg bg-card border border-white/10 w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10"
            title="Administrar Categorías"
          >
            ⚙️
          </button>
        </div>
        
        {/* TABS */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {["general", "auditoria", "ahorro", "delivery"].map(tab => (
            <button 
              key={tab} 
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-full text-sm font-semibold capitalize whitespace-nowrap transition-colors ${activeTab === tab ? 'bg-white text-black' : 'bg-card border border-white/10 text-gray-400'}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      {/* VISTA GENERAL */}
      {activeTab === "general" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-card p-2 rounded-xl border border-white/10">
            <span className="text-sm font-bold pl-2">Mes:</span>
            <input 
              type="month" 
              value={`${year}-${month}`}
              onChange={(e) => {
                const val = e.target.value;
                if(val) {
                  const [y, m] = val.split('-');
                  setYear(y);
                  setMonth(m);
                }
              }}
              className="bg-black border border-white/20 rounded-lg p-1 text-sm"
            />
          </div>

          <section className="grid grid-cols-2 gap-4">
            <div className="bg-card p-4 rounded-2xl border border-white/10 text-center">
              <p className="text-xs text-gray-400 mb-1">Ingresos</p>
              <p className="text-xl font-bold text-positive">${indicators.ingresos.toLocaleString('es-AR')}</p>
            </div>
            <div className="bg-card p-4 rounded-2xl border border-white/10 text-center">
              <p className="text-xs text-gray-400 mb-1">Gastos Totales</p>
              <p className="text-xl font-bold text-negative">${indicators.totalGastos.toLocaleString('es-AR')}</p>
            </div>
            <div className="bg-card p-4 rounded-2xl border border-white/10 text-center">
              <p className="text-xs text-gray-400 mb-1">Necesarios</p>
              <p className="text-lg font-bold text-yellow-500">${indicators.gastosNecesarios.toLocaleString('es-AR')}</p>
            </div>
            <div className="bg-card p-4 rounded-2xl border border-white/10 text-center">
              <p className="text-xs text-gray-400 mb-1">Innecesarios</p>
              <p className="text-lg font-bold text-red-500">${indicators.gastosInnecesarios.toLocaleString('es-AR')}</p>
            </div>
            <section className="col-span-2 bg-black border border-white/20 p-4 rounded-2xl text-center">
              <p className="text-sm text-gray-400 mb-1">Dinero Restante (Flujo de Caja)</p>
              <p className={`text-3xl font-bold ${indicators.restante >= 0 ? 'text-positive' : 'text-negative'}`}>
                ${indicators.restante.toLocaleString('es-AR')}
              </p>
            </section>
          </section>

          <section>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Historial del Mes</h2>
              <button onClick={openNewModal} className="text-xs bg-white text-black font-bold px-3 py-1 rounded-full">+ Nuevo</button>
            </div>
            
            {loading ? <p className="text-sm text-gray-500">Cargando...</p> : (
              <div className="space-y-3">
                {transactions.map(t => (
                  <div key={t.id} className="bg-card p-3 rounded-xl border border-white/5 flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-sm">{t.category.name} <span className="text-xs text-gray-500 bg-black px-1 rounded ml-1">{t.banco || 'Efectivo'}</span></p>
                      <p className="text-xs text-gray-500">{new Date(t.date).toLocaleDateString()} {t.description && `• ${t.description}`}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${t.type === 'INGRESO' ? 'text-positive' : 'text-negative'}`}>
                        {t.type === 'INGRESO' ? '+' : '-'}${t.amount.toLocaleString('es-AR')}
                      </p>
                      <div className="flex gap-2 justify-end mt-1">
                        <button onClick={() => openEditModal(t)} className="text-[10px] text-gray-400 hover:text-white">Editar</button>
                        <button onClick={() => handleDeleteTransaction(t.id)} className="text-[10px] text-negative hover:underline">Borrar</button>
                      </div>
                    </div>
                  </div>
                ))}
                {transactions.length === 0 && <p className="text-sm text-gray-400">No hay transacciones.</p>}
              </div>
            )}
          </section>
        </div>
      )}

      {activeTab === "auditoria" && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold">Auditoría del Mes</h2>
          
          {['GASTO_NECESARIO', 'GASTO_INNECESARIO', 'INGRESO'].map(type => {
            const txs = transactions.filter(t => t.type === type);
            if(txs.length === 0) return null;
            
            const total = txs.reduce((a,b) => a + b.amount, 0);
            
            // Group by Parent -> Subcategory
            const grouped = txs.reduce((acc, t) => {
              const parent = t.category?.parentName || t.category?.name || 'Sin Categoría';
              const sub = t.category?.name || 'Sin Categoría';
              
              if (!acc[parent]) acc[parent] = { total: 0, subs: {} };
              acc[parent].total += t.amount;
              if (t.category?.parentName) {
                acc[parent].subs[sub] = (acc[parent].subs[sub] || 0) + t.amount;
              }
              
              return acc;
            }, {} as Record<string, { total: number, subs: Record<string, number> }>);
            
            const sortedParents = Object.entries(grouped).sort((a,b) => b[1].total - a[1].total);

            return (
              <div key={type} className="bg-card p-4 rounded-2xl border border-white/10">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-300 capitalize">{type.replace('_', ' ').toLowerCase()}</h3>
                  <p className={`font-black ${type === 'INGRESO' ? 'text-positive' : 'text-negative'}`}>
                    ${total.toLocaleString('es-AR')}
                  </p>
                </div>
                
                <div className="space-y-4">
                  {sortedParents.map(([parent, data]) => {
                    const parentPerc = Math.round((data.total / total) * 100);
                    const sortedSubs = Object.entries(data.subs).sort((a,b) => b[1] - a[1]);
                    
                    return (
                      <div key={parent} className="space-y-1">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-bold">{parent}</span>
                          <span className="text-gray-400">${data.total.toLocaleString('es-AR')} ({parentPerc}%)</span>
                        </div>
                        <div className="w-full bg-black rounded-full h-1.5 border border-white/5 overflow-hidden">
                          <div className={`h-full rounded-full ${type === 'INGRESO' ? 'bg-positive' : 'bg-negative'}`} style={{ width: `${parentPerc}%` }}></div>
                        </div>
                        
                        {/* SUBCATEGORIAS */}
                        {sortedSubs.length > 0 && (
                          <div className="pl-4 pt-1 space-y-1">
                            {sortedSubs.map(([sub, amount]) => (
                              <div key={sub} className="flex justify-between text-xs text-gray-500">
                                <span>↳ {sub}</span>
                                <span>${amount.toLocaleString('es-AR')}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === "ahorro" && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold">Ahorro Histórico</h2>
          
          <div className="bg-card p-5 rounded-3xl border border-white/10 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-positive to-blue-500"></div>
            <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-2">Balance Histórico Total</p>
            <p className={`text-5xl font-black ${ahorroData.balanceHistorico >= 0 ? 'text-positive' : 'text-negative'} tracking-tighter`}>
              ${ahorroData.balanceHistorico.toLocaleString('es-AR')}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-black/50 p-4 rounded-2xl border border-white/5 text-center">
              <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Total Ingresado (Vida)</p>
              <p className="text-lg font-bold text-gray-300">${ahorroData.totalIngresos.toLocaleString('es-AR')}</p>
            </div>
            <div className="bg-black/50 p-4 rounded-2xl border border-white/5 text-center">
              <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Total Gastado (Vida)</p>
              <p className="text-lg font-bold text-gray-300">${ahorroData.totalGastos.toLocaleString('es-AR')}</p>
            </div>
          </div>

          <div className="bg-card p-5 rounded-3xl border border-white/10">
            <h3 className="font-bold mb-3">Configurar Meta de Ahorro</h3>
            <p className="text-xs text-gray-400 mb-4">La meta de ahorro actual es de <b>${ahorroData.savingGoal.toLocaleString('es-AR')}</b>.</p>
            
            <form onSubmit={handleGoalSubmit} className="flex gap-2">
              <input 
                type="number" 
                value={newGoal} 
                onChange={(e) => setNewGoal(e.target.value)} 
                placeholder="Ej: 1500000" 
                className="flex-1 bg-black border border-white/20 rounded-xl px-3 py-2 text-sm"
              />
              <button type="submit" disabled={isSubmittingAhorro} className="bg-white text-black font-bold px-4 py-2 rounded-xl text-sm disabled:opacity-50 min-w-[120px]">
                {isSubmittingAhorro ? "Guardando..." : "Guardar Meta"}
              </button>
            </form>
          </div>
        </div>
      )}

      {activeTab === "delivery" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Turnos de Delivery</h2>
            <button onClick={openNewDelivery} className="text-xs bg-white text-black font-bold px-3 py-1 rounded-full">
              + Cargar Turno
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-card p-4 rounded-2xl border border-white/10 text-center">
              <p className="text-xs text-gray-400 mb-1">Total Ganado (Mes)</p>
              <p className="text-xl font-bold text-positive">
                ${deliverySessions.reduce((a, b) => a + (b.earnings || 0), 0).toLocaleString('es-AR')}
              </p>
            </div>
            <div className="bg-card p-4 rounded-2xl border border-white/10 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-blue-500/10"></div>
              <div className="relative z-10">
                <p className="text-xs text-gray-400 mb-1">Ganancia Histórica</p>
                <p className="text-xl font-bold text-blue-400">
                  ${historicalDeliveryEarnings.toLocaleString('es-AR')}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {deliverySessions.map(d => (
              <div key={d.id} className="bg-card p-4 rounded-2xl border border-white/5 flex justify-between items-center">
                <div>
                  <p className="font-bold text-positive text-lg">
                    {d.earnings ? `$${d.earnings.toLocaleString('es-AR')}` : 'Planificado'}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(d.date).toLocaleDateString()} 
                    {d.startTime && d.endTime ? ` • ${d.startTime} - ${d.endTime}` : ''}
                    {d.hours ? ` • ${d.hours} hrs` : ''} 
                    {d.orders ? ` • ${d.orders} pedidos` : ''}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEditDelivery(d)} className="text-xl">✏️</button>
                  <button onClick={() => handleDeleteDelivery(d.id)} className="text-xl text-red-500">🗑️</button>
                </div>
              </div>
            ))}
            {deliverySessions.length === 0 && <p className="text-center text-gray-500 text-sm py-10">No hay turnos cargados este mes.</p>}
          </div>
        </div>
      )}

      {activeTab === "categorias" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">Administrar Categorías</h2>
            <button onClick={openNewCategory} className="text-xs bg-white text-black font-bold px-3 py-1 rounded-full">+ Nueva</button>
          </div>
          
          <div className="space-y-3">
            {categories.map(c => (
              <div key={c.id} className="bg-card p-3 rounded-xl border border-white/5 flex justify-between items-center">
                <div>
                  <p className="font-semibold text-sm">{c.name}</p>
                  <p className="text-xs text-gray-500">
                    {c.parentName ? `${c.parentName} • ` : ''} 
                    <span className="capitalize">{c.type.replace('_', ' ').toLowerCase()}</span>
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEditCategory(c)} className="text-[10px] text-gray-400 hover:text-white bg-black px-2 py-1 rounded">Editar</button>
                  <button onClick={() => handleDeleteCategory(c.id)} className="text-[10px] text-negative hover:text-red-400 bg-black px-2 py-1 rounded">Borrar</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL CATEGORIAS */}
      <Modal isOpen={isCategoryModalOpen} onClose={() => setIsCategoryModalOpen(false)} title={categoryToEdit ? "Editar Categoría" : "Nueva Categoría"}>
        <form onSubmit={handleCategorySubmit} className="space-y-4">
          <div>
            <label className="text-xs text-gray-400">Nombre</label>
            <input required type="text" value={catName} onChange={e => setCatName(e.target.value)} className="w-full bg-black border border-white/20 rounded-lg p-2 mt-1" />
          </div>
          <div>
            <label className="text-xs text-gray-400">Tipo</label>
            <select value={catType} onChange={e => setCatType(e.target.value)} className="w-full bg-black border border-white/20 rounded-lg p-2 mt-1">
              <option value="GASTO_NECESARIO">Gasto Necesario</option>
              <option value="GASTO_INNECESARIO">Gasto Innecesario</option>
              <option value="INGRESO">Ingreso</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400">Grupo Padre (Opcional)</label>
            <input 
              type="text" 
              value={catParent} onChange={(e) => setCatParent(e.target.value)}
              placeholder="Ej. Casa, Auto..."
              className="w-full bg-black border border-white/20 rounded-lg p-2 mt-1 text-sm"
            />
          </div>
          <button type="submit" disabled={isSubmittingCat} className="w-full bg-white text-black font-bold py-3 rounded-xl mt-4 disabled:opacity-50">
            {isSubmittingCat ? "Guardando..." : "Guardar Categoría"}
          </button>
        </form>
      </Modal>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={transactionToEdit ? "Editar Transacción" : "Nueva Transacción"}>
        <TransactionForm 
          transactionToEdit={transactionToEdit}
          onSuccess={() => {
            setIsModalOpen(false);
            fetchData();
          }} 
        />
      </Modal>

      {/* MODAL DELIVERY */}
      <Modal isOpen={isDeliveryModalOpen} onClose={() => setIsDeliveryModalOpen(false)} title={deliveryToEdit ? "Editar Turno" : "Nuevo Turno"}>
        <form onSubmit={handleDeliverySubmit} className="space-y-4">
          <div>
            <label className="text-xs text-gray-400">Fecha</label>
            <input required type="date" value={delDate} onChange={e => setDelDate(e.target.value)} className="w-full bg-black border border-white/20 rounded-lg p-2 mt-1 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400">Hora de Inicio</label>
              <input type="time" value={delStartTime} onChange={e => setDelStartTime(e.target.value)} className="w-full bg-black border border-white/20 rounded-lg p-2 mt-1 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-400">Hora de Fin</label>
              <input type="time" value={delEndTime} onChange={e => setDelEndTime(e.target.value)} className="w-full bg-black border border-white/20 rounded-lg p-2 mt-1 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400">Horas Trabajadas</label>
              <input type="number" step="0.1" value={delHours} onChange={e => setDelHours(e.target.value)} className="w-full bg-black border border-white/20 rounded-lg p-2 mt-1 text-sm" placeholder="Opcional" />
            </div>
            <div>
              <label className="text-xs text-gray-400">Cant. de Pedidos</label>
              <input type="number" value={delOrders} onChange={e => setDelOrders(e.target.value)} className="w-full bg-black border border-white/20 rounded-lg p-2 mt-1 text-sm" placeholder="Opcional" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400">Ganancia Neta ($)</label>
            <input type="number" value={delEarnings} onChange={e => setDelEarnings(e.target.value)} className="w-full bg-black border border-white/20 rounded-lg p-2 mt-1 text-sm" placeholder="Se carga al terminar el turno" />
          </div>
          <button type="submit" disabled={isSubmittingDel} className="w-full bg-white text-black font-bold py-3 rounded-xl mt-4 disabled:opacity-50">
            {isSubmittingDel ? "Guardando..." : "Guardar Turno"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
