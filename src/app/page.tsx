"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Modal from "@/components/Modal";
import TransactionForm from "@/components/TransactionForm";

const quotes = [
  "El éxito es la suma de pequeños esfuerzos repetidos día tras día.",
  "No cuentes los días, haz que los días cuenten.",
  "La disciplina es el puente entre metas y logros.",
  "Enfócate en el proceso, los resultados llegarán solos.",
  "Hoy es una nueva oportunidad para ser tu mejor versión."
];

function DashboardContent() {
  const router = useRouter();
  const dateParam = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("date") : null;
  
  const [data, setData] = useState<any>(null);
  
  // Usar dateParam, o localStorage, o la fecha actual
  const [dateStr, setDateStr] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("lifeOs_dashboard_date");
      if (dateParam) return dateParam;
      if (stored) return stored;
    }
    return new Date().toLocaleDateString('en-CA');
  });

  const [loading, setLoading] = useState(true);
  const [isFinanzasModalOpen, setFinanzasModalOpen] = useState(false);
  const [showRutina, setShowRutina] = useState(false);
  const [quote] = useState(() => quotes[Math.floor(Math.random() * quotes.length)]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("lifeOs_dashboard_date", dateStr);
    }
    if (dateStr !== dateParam) {
      router.push(`/?date=${dateStr}`);
    }
  }, [dateStr, router, dateParam]);

  const fetchDashboard = async () => {
    setLoading(true);
    const res = await fetch(`/api/dashboard?date=${dateStr}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  };

  useEffect(() => {
    fetchDashboard();
  }, [dateStr]);

  const handleHabitToggle = async (logId: number, currentStatus: string) => {
    const newStatus = currentStatus === "REALIZADO" ? "NO_REALIZADO" : currentStatus === "NO_REALIZADO" ? "DESCANSO" : "REALIZADO";
    
    setData((prev: any) => ({
      ...prev,
      todaysHabitLogs: prev.todaysHabitLogs.map((log: any) => 
        log.id === logId ? { ...log, status: newStatus } : log
      )
    }));

    try {
      const res = await fetch("/api/habitos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logId, status: newStatus })
      });
      if(!res.ok) throw new Error();
    } catch {
      toast.error("Error al sincronizar");
      fetchDashboard();
    }
  };

  const handleStudyToggle = async () => {
    if (!data.studyTask) return;
    const newStatus = !data.studyTask.completed;
    
    setData((prev: any) => ({
      ...prev,
      studyTask: { ...prev.studyTask, completed: newStatus }
    }));

    try {
      const res = await fetch("/api/estudio", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: data.studyTask.id, completed: newStatus })
      });
      if(!res.ok) throw new Error();
    } catch {
      toast.error("Error al sincronizar");
      fetchDashboard();
    }
  };

  if (loading && !data) return (
    <div className="flex h-screen items-center justify-center">
      <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  const { todaysExpenses, savings, savingsGoal, todaysHabitLogs, studyTask, dayNumber, todaysEvents } = data || {};

  const totalEvaluatedHabits = todaysHabitLogs?.filter((log: any) => log.status !== 'DESCANSO').length || 0;
  const completedHabits = todaysHabitLogs?.filter((log: any) => log.status === 'REALIZADO').length || 0;
  const habitsPercentage = totalEvaluatedHabits > 0 ? Math.round((completedHabits / totalEvaluatedHabits) * 100) : 0;
  const savingsProgress = savingsGoal > 0 ? Math.min(100, Math.max(0, (savings / savingsGoal) * 100)) : 0;

  return (
    <div className="space-y-6 pb-20 relative">
      
      {/* MODAL RUTINA DIARIA */}
      {showRutina && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          <div className="overflow-y-auto flex-1">
            <img src="/rutina-diaria.jpg" alt="Mi Rutina Diaria" className="w-full h-auto" />
          </div>
          <div className="flex justify-center py-4 bg-black border-t border-white/10 shrink-0">
            <button
              onClick={() => setShowRutina(false)}
              className="bg-white text-black font-black px-8 py-3 rounded-2xl text-sm shadow-lg active:scale-95 transition-transform"
            >
              ✕ Cerrar
            </button>
          </div>
        </div>
      )}

      {/* HEADER VISUAL */}
      <div className="absolute top-0 left-0 w-full h-48 bg-gradient-to-b from-blue-900/40 via-black to-black -z-10 blur-xl"></div>
      
      <header className="pt-8 pb-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">Life OS</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowRutina(true)}
              className="bg-card border border-white/20 text-white text-xs font-bold px-3 py-2 rounded-xl shadow-lg active:scale-95 transition-transform"
              title="Ver mi rutina diaria"
            >
              📋 Rutina
            </button>
            <input 
              type="date" 
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="bg-card text-sm text-white font-bold border border-white/20 rounded-xl p-2 px-3 shadow-lg"
            />
          </div>
        </div>
        <p className="text-sm text-gray-400 italic border-l-2 border-blue-500 pl-3 py-1">"{quote}"</p>
      </header>

      {/* FINANZAS */}
      <section className="bg-gradient-to-br from-card to-black rounded-3xl p-5 border border-white/10 shadow-lg relative overflow-hidden">
        <div className="absolute -right-4 -top-4 w-24 h-24 bg-green-500/10 rounded-full blur-2xl"></div>
        <div className="flex justify-between items-center mb-4 relative z-10">
          <h2 className="text-xl font-bold flex items-center gap-2">💰 Finanzas</h2>
          <Link href="/finanzas" className="text-xs bg-white/10 hover:bg-white/20 transition-colors px-4 py-1.5 rounded-full font-semibold">Ver detalles</Link>
        </div>
        <div className="grid grid-cols-2 gap-4 relative z-10">
          <div className="bg-black/50 p-3 rounded-2xl border border-white/5 flex flex-col justify-between">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Gastos Hoy</p>
            <p className="text-2xl font-black text-negative">${todaysExpenses?.toLocaleString('es-AR') || '0'}</p>
          </div>
          <div className="bg-black/50 p-3 rounded-2xl border border-white/5 relative overflow-hidden">
            <div className="absolute inset-0 bg-positive/10" style={{ width: `${savingsProgress}%` }}></div>
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Progreso Ahorro</p>
                <div className="flex items-end gap-1">
                  <p className={`text-3xl font-black ${savings >= 0 ? 'text-positive' : 'text-negative'}`}>
                    {savingsGoal > 0 ? Math.round((savings / savingsGoal) * 100) : 0}%
                  </p>
                </div>
              </div>
              <p className={`text-lg font-black ${savings >= 0 ? 'text-positive' : 'text-negative'} mt-1`}>
                ${Math.abs(savings || 0).toLocaleString('es-AR')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* HÁBITOS */}
      <section className="bg-card rounded-3xl p-5 border border-white/10 shadow-lg relative overflow-hidden">
        <div className="absolute -left-4 top-1/2 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl"></div>
        <div className="flex justify-between items-center mb-4 relative z-10">
          <h2 className="text-xl font-bold flex items-center gap-2">✅ Hábitos</h2>
          <div className="bg-black/50 px-3 py-1 rounded-full border border-white/5">
            <span className={`text-sm font-black ${habitsPercentage >= 80 ? 'text-positive' : habitsPercentage >= 50 && totalEvaluatedHabits > 0 ? 'text-yellow-500' : 'text-negative'}`}>
              {habitsPercentage}%
            </span>
          </div>
        </div>
        <div className="space-y-2 relative z-10">
          {todaysHabitLogs?.map((log: any) => (
            <div key={log.id} className="flex justify-between items-center bg-black/40 p-3 rounded-xl border border-white/5 hover:bg-black/60 transition-colors">
              <span className={`text-sm font-semibold ${log.status === 'REALIZADO' ? 'text-gray-400 line-through' : 'text-white'}`}>{log.habit.name}</span>
              <button 
                onClick={() => handleHabitToggle(log.id, log.status)}
                className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-all transform active:scale-95
                  ${log.status === 'REALIZADO' ? 'bg-positive border-positive shadow-[0_0_10px_rgba(34,197,94,0.3)]' : 
                    log.status === 'NO_REALIZADO' ? 'bg-negative border-negative' : 'bg-card border-gray-600'}`}
              >
                {log.status === 'REALIZADO' && <span className="text-black text-sm font-black">✓</span>}
                {log.status === 'NO_REALIZADO' && <span className="text-black text-sm font-black">✕</span>}
                {log.status === 'DESCANSO' && <span className="text-gray-500 text-sm font-black">-</span>}
              </button>
            </div>
          ))}
          {todaysHabitLogs?.length === 0 && <p className="text-sm text-gray-500 text-center py-2">No hay hábitos configurados aún.</p>}
        </div>
      </section>

      {/* ESTUDIO & AGENDA EN GRID */}
      <div className="flex flex-col gap-6">
        
        {/* ESTUDIO */}
        <section className="bg-card rounded-3xl p-5 border border-white/10 shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">📚 Estudio</h2>
          </div>
          {studyTask ? (
            <div className="bg-black/50 p-4 rounded-2xl border border-white/5 flex justify-between items-center gap-4">
              <span className={`text-sm font-bold truncate ${studyTask.completed ? 'line-through text-gray-500' : 'text-white'}`}>
                {studyTask.subject}
              </span>
              <button 
                onClick={handleStudyToggle}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all shadow-lg
                  ${studyTask.completed ? 'bg-card text-gray-400 border border-white/10' : 'bg-white text-black hover:bg-gray-200'}`}
              >
                {studyTask.completed ? 'Deshacer' : 'Completar'}
              </button>
            </div>
          ) : (
            <div className="text-center py-6 bg-black/30 rounded-2xl border border-dashed border-white/10">
              <p className="text-sm text-gray-400">Día libre 🎉</p>
            </div>
          )}
        </section>

        {/* AGENDA */}
        <section className="bg-card rounded-3xl p-5 border border-white/10 shadow-lg relative overflow-hidden">
          <div className="absolute right-0 bottom-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl"></div>
          <div className="flex justify-between items-center mb-4 relative z-10">
            <h2 className="text-xl font-bold flex items-center gap-2">📅 Agenda</h2>
            <span className="text-xs bg-black px-3 py-1 rounded-full border border-white/5 font-bold text-gray-300">Día {dayNumber}/21</span>
          </div>
          {todaysEvents?.length > 0 ? (
            <div className="space-y-3 relative z-10">
              {todaysEvents.sort((a:any,b:any) => a.startTime.localeCompare(b.startTime)).map((event: any) => (
                <div key={event.id} className="flex gap-4 items-center bg-black/40 p-3 rounded-2xl border border-white/5">
                  <div className="bg-card px-2 py-1 rounded-lg text-center border border-white/5 shadow-inner">
                    <p className="text-xs font-bold text-white">{event.startTime}</p>
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm leading-tight">{event.title}</p>
                    <p className="text-[10px] text-gray-500 uppercase font-semibold mt-0.5">{event.type}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 bg-black/30 rounded-2xl border border-dashed border-white/10">
              <p className="text-sm text-gray-400">Agenda libre.</p>
            </div>
          )}
        </section>
      </div>

      {/* BOTONES FLOTANTES */}
      <button 
        onClick={() => setFinanzasModalOpen(true)}
        className="fixed bottom-24 right-4 bg-positive text-black font-black w-14 h-14 rounded-full shadow-[0_0_20px_rgba(34,197,94,0.4)] z-50 flex items-center justify-center text-3xl hover:scale-105 transition-transform"
      >
        +
      </button>

      {/* Modal Finanzas */}
      <Modal isOpen={isFinanzasModalOpen} onClose={() => setFinanzasModalOpen(false)} title="Nueva Transacción">
        <TransactionForm 
          onSuccess={() => {
            setFinanzasModalOpen(false);
            fetchDashboard();
          }}
          initialDate={dateStr}
        />
      </Modal>
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div></div>}>
      <DashboardContent />
    </Suspense>
  );
}
