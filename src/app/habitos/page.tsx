"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/Modal";
import { toast } from "sonner";

type Habit = { id: number; name: string, groupId: number };
type HabitGroup = { id: number; name: string; habits: Habit[] };
type HabitLog = { id: number; habitId: number; status: string; date: string };

export default function HabitosPage() {
  const [groups, setGroups] = useState<HabitGroup[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthFilter, setMonthFilter] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [habitToEdit, setHabitToEdit] = useState<Habit | undefined>(undefined);
  const [habitName, setHabitName] = useState("");
  const [groupId, setGroupId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFilling, setIsFilling] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const res = await fetch(`/api/habitos?month=${monthFilter}`);
    const data = await res.json();
    setGroups(data.groups || []);
    setLogs(data.logs || []);
    
    if (data.groups && data.groups.length > 0 && !groupId) {
      setGroupId(data.groups[0].id.toString());
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [monthFilter]);

  const handleStatusChange = async (logId: number, currentStatus: string) => {
    let newStatus = "DESCANSO";
    if (currentStatus === "DESCANSO") newStatus = "REALIZADO";
    else if (currentStatus === "REALIZADO") newStatus = "NO_REALIZADO";

    setLogs(prev => prev.map(l => l.id === logId ? { ...l, status: newStatus } : l));

    try {
      const res = await fetch("/api/habitos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logId, status: newStatus })
      });
      if(!res.ok) throw new Error();
    } catch {
      toast.error("Error al sincronizar estado");
      fetchData(); // revert
    }
  };

  const handleCreateLog = async (habitId: number, dateString: string) => {
    const [y, m, d] = dateString.split('-');
    const safeDate = new Date(parseInt(y), parseInt(m)-1, parseInt(d), 12, 0, 0).toISOString();
    
    const tempId = Math.random() * -1000;
    setLogs(prev => [...prev, { id: tempId, habitId, status: "DESCANSO", date: safeDate }]);

    try {
      const res = await fetch("/api/habitos/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ habitId, date: safeDate, status: "DESCANSO" })
      });
      if(!res.ok) throw new Error();
      fetchData();
    } catch {
      toast.error("Error al crear registro");
      fetchData();
    }
  };

  const getDaysInMonth = () => {
    const [y, m] = monthFilter.split('-');
    const date = new Date(parseInt(y), parseInt(m), 0);
    return date.getDate();
  };

  const daysCount = getDaysInMonth();
  const daysArray = Array.from({ length: daysCount }, (_, i) => i + 1);

  const openNewModal = () => {
    setHabitToEdit(undefined);
    setHabitName("");
    setIsModalOpen(true);
  };

  const openEditModal = (h: Habit) => {
    setHabitToEdit(h);
    setHabitName(h.name);
    setGroupId(h.groupId.toString());
    setIsModalOpen(true);
  };

  const handleHabitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!habitName || !groupId) return;

    setIsSubmitting(true);
    const payload = { id: habitToEdit?.id, name: habitName, groupId: parseInt(groupId) };

    try {
      if (habitToEdit) {
        await fetch("/api/habitos/crud", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      } else {
        await fetch("/api/habitos/crud", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      }
      toast.success(habitToEdit ? "Hábito actualizado" : "Hábito creado");
      setIsModalOpen(false);
      fetchData();
    } catch {
      toast.error("Error al guardar hábito");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteHabit = async (id: number) => {
    if(!confirm("¿Borrar hábito y todos sus registros?")) return;
    try {
      await fetch(`/api/habitos/crud?id=${id}`, { method: "DELETE" });
      toast.success("Hábito eliminado");
      fetchData();
    } catch {
      toast.error("Error al eliminar hábito");
    }
  };

  const handleFillMonth = async () => {
    if(!confirm("¿Rellenar cuadros vacíos de todo el mes?")) return;
    setIsFilling(true);
    try {
      const [y, m] = monthFilter.split('-');
      await fetch("/api/habitos/fill-month", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: parseInt(y), month: parseInt(m) - 1 })
      });
      toast.success("Mes rellenado");
      fetchData();
    } catch {
      toast.error("Error al rellenar mes");
    } finally {
      setIsFilling(false);
    }
  };

  if (loading && groups.length === 0) return (
    <div className="flex h-screen items-center justify-center">
      <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="space-y-6 pb-24 relative">
      <header>
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Hábitos</h1>
          <div className="flex gap-2">
            <button disabled={isFilling} onClick={handleFillMonth} className="text-[10px] bg-black border border-white/20 text-white font-bold px-3 py-1 rounded-full hover:bg-white/5 transition-colors disabled:opacity-50">
              {isFilling ? "Rellenando..." : "Rellenar Mes"}
            </button>
            <button onClick={openNewModal} className="text-xs bg-white text-black font-bold px-3 py-1 rounded-full">+ Nuevo Hábito</button>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-card p-2 rounded-xl border border-white/10">
          <span className="text-xs font-bold text-gray-400">Mes:</span>
          <input 
            type="month" 
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="bg-transparent text-sm text-white font-bold outline-none flex-1"
          />
        </div>
      </header>

      <section className="grid grid-cols-3 gap-3">
        {groups.map(group => {
          const groupLogs = logs.filter(l => group.habits.some(h => h.id === l.habitId));
          const evaluated = groupLogs.filter(l => l.status !== "DESCANSO").length;
          const completed = groupLogs.filter(l => l.status === "REALIZADO").length;
          const perc = evaluated > 0 ? Math.round((completed / evaluated) * 100) : 0;
          
          return (
            <div key={group.id} className="bg-gradient-to-br from-card to-black p-3 rounded-2xl border border-white/10 text-center shadow-lg">
              <p className="text-[9px] text-gray-400 mb-1 uppercase tracking-wider font-bold truncate">{group.name}</p>
              <p className={`text-xl font-black ${perc >= 80 ? 'text-positive' : perc >= 50 && evaluated > 0 ? 'text-yellow-500' : 'text-negative'}`}>{perc}%</p>
            </div>
          );
        })}
      </section>

      <div className="bg-card rounded-2xl border border-white/10 overflow-hidden shadow-lg mt-6">
        <div className="overflow-x-auto custom-scrollbar relative">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead>
              <tr className="bg-black/50 border-b border-white/10">
                <th className="p-3 font-bold sticky left-0 z-10 bg-card border-r border-white/10 min-w-[120px]">Hábito</th>
                {daysArray.map(day => (
                  <th key={day} className="p-2 font-bold text-gray-500 text-center border-r border-white/10 w-8">{day}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groups.length === 0 ? (
                <tr>
                  <td colSpan={daysCount + 1} className="p-8 text-center text-gray-500">No hay hábitos configurados.</td>
                </tr>
              ) : (
                groups.map((group) => group.habits.map((habit) => (
                  <tr key={habit.id} className="hover:bg-white/5 transition-colors group">
                    <td className="p-2 border-b border-r border-white/10 font-bold sticky left-0 z-10 bg-card group-hover:bg-black/20 flex justify-between items-center transition-colors">
                      <span className="truncate max-w-[90px]">{habit.name}</span>
                      <button onClick={() => openEditModal(habit)} className="text-[10px] text-gray-500 hover:text-white px-1">✏️</button>
                    </td>
                    {daysArray.map(day => {
                      const dateString = `${monthFilter}-${String(day).padStart(2, '0')}`;
                      const log = logs.find(l => l.habitId === habit.id && l.date.startsWith(dateString));
                      
                      return (
                        <td key={day} className="p-1 border-b border-r border-white/10 text-center">
                          {log ? (
                            <button 
                              onClick={() => handleStatusChange(log.id, log.status)}
                              className={`w-7 h-7 rounded-md flex items-center justify-center transition-all mx-auto active:scale-90
                                ${log.status === 'REALIZADO' ? 'bg-positive text-black shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 
                                  log.status === 'NO_REALIZADO' ? 'bg-negative text-black' : 'bg-black border border-white/10'}`}
                            >
                              {log.status === 'REALIZADO' && <span className="text-[10px] font-black">✓</span>}
                              {log.status === 'NO_REALIZADO' && <span className="text-[10px] font-black">✕</span>}
                              {log.status === 'DESCANSO' && <span className="text-[10px] font-black text-gray-600">-</span>}
                            </button>
                          ) : (
                            <button 
                              onClick={() => handleCreateLog(habit.id, dateString)}
                              className="w-7 h-7 rounded-md bg-transparent border border-white/5 mx-auto hover:bg-white/10 transition-colors flex items-center justify-center"
                            >
                              <span className="text-[10px] text-gray-700">+</span>
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                )))
              )}
            </tbody>
          </table>
        </div>
        <div className="p-3 text-[10px] text-gray-400 text-center bg-black font-semibold uppercase tracking-widest border-t border-white/10">
          Toca el cuadro para cambiar estado (+ {'>'} - {'>'} ✓ {'>'} ✕)
        </div>
      </div>

      {/* MODAL */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={habitToEdit ? "Editar Hábito" : "Nuevo Hábito"}>
        <form onSubmit={handleHabitSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-gray-400">Agrupación</label>
            <select 
              value={groupId} onChange={(e) => setGroupId(e.target.value)} required
              className="w-full bg-black border border-white/20 rounded-lg p-2 mt-1 text-sm"
            >
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400">Nombre del Hábito</label>
            <input 
              type="text" 
              value={habitName} onChange={(e) => setHabitName(e.target.value)} required
              placeholder="Ej. Leer 10 páginas, Gym..."
              className="w-full bg-black border border-white/20 rounded-lg p-2 mt-1 text-sm"
            />
          </div>
          <div className="flex gap-2">
            {habitToEdit && (
              <button type="button" onClick={() => handleDeleteHabit(habitToEdit.id)} className="flex-1 bg-red-500/20 text-red-500 font-bold rounded-lg p-3">
                Borrar
              </button>
            )}
            <button type="submit" disabled={isSubmitting} className="flex-[2] bg-white text-black font-bold rounded-lg p-3 disabled:opacity-50">
              {isSubmitting ? "Guardando..." : habitToEdit ? "Actualizar" : "Crear Hábito"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
