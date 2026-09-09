"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/Modal";

type AgendaEvent = { id: number; dayNumber: number; startTime: string; endTime: string; title: string; type: string };

export default function AgendaPage() {
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [cycleStartDate, setCycleStartDate] = useState("");
  const [loading, setLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<AgendaEvent | undefined>(undefined);

  // Form
  const [dayNumber, setDayNumber] = useState("1");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [title, setTitle] = useState("");
  const [type, setType] = useState("obligacion");

  // View state
  const [selectedViewDay, setSelectedViewDay] = useState(1);
  const [currentCycleDay, setCurrentCycleDay] = useState(1);

  const [isCycleModalOpen, setIsCycleModalOpen] = useState(false);
  
  // existing fetch logic
  const fetchData = async () => {
    setLoading(true);
    const res = await fetch("/api/agenda");
    const data = await res.json();
    setEvents(data.events || []);
    
    const dateToUseStr = data.cycleStartDate ? data.cycleStartDate.split('T')[0] : "2026-01-19";
    setCycleStartDate(dateToUseStr);
    
    // Parse target Date
    const [sy, sm, sd] = dateToUseStr.split('-');
    const start = new Date(parseInt(sy), parseInt(sm) - 1, parseInt(sd));
    
    // Today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffTime = today.getTime() - start.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    // Si diffDays es negativo, usar formula con modulo ajustado, sino modulo normal
    const current = diffDays >= 0 ? (diffDays % 21) + 1 : ((21 + (diffDays % 21)) % 21) + 1;
    setCurrentCycleDay(current);
    setSelectedViewDay(current);
    
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateCycle = async () => {
    if (!cycleStartDate) return;
    await fetch("/api/agenda/cycle", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cycleStartDate })
    });
    setIsCycleModalOpen(false);
    fetchData();
  };

  // ... (keeping other handlers the same)
  const openNewModal = () => {
    setEventToEdit(undefined);
    setDayNumber(selectedViewDay.toString());
    setTitle("");
    setStartTime("");
    setEndTime("");
    setType("obligacion");
    setIsModalOpen(true);
  };

  const openEditModal = (e: AgendaEvent) => {
    setEventToEdit(e);
    setDayNumber(e.dayNumber.toString());
    setTitle(e.title);
    setStartTime(e.startTime);
    setEndTime(e.endTime);
    setType(e.type);
    setIsModalOpen(true);
  };

  const handleSubmitEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startTime || !endTime || !title) return;

    if (eventToEdit) {
      await fetch("/api/agenda", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: eventToEdit.id, dayNumber, startTime, endTime, title, type })
      });
    } else {
      await fetch("/api/agenda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dayNumber, startTime, endTime, title, type })
      });
    }
    
    setIsModalOpen(false);
    fetchData();
  };

  const handleDelete = async (id: number) => {
    if(!confirm("¿Borrar evento?")) return;
    await fetch(`/api/agenda?id=${id}`, { method: "DELETE" });
    fetchData();
  };

  const eventsForSelectedDay = events.filter(e => e.dayNumber === selectedViewDay);

  const typeColors: Record<string, string> = {
    obligacion: "border-red-500",
    salud: "border-green-500",
    estudio: "border-blue-500",
    rutina: "border-gray-400",
    ocio: "border-yellow-500",
    auditoria: "border-purple-500",
  };
  
  const typeBgColors: Record<string, string> = {
    obligacion: "bg-red-500/10",
    salud: "bg-green-500/10",
    estudio: "bg-blue-500/10",
    rutina: "bg-gray-400/10",
    ocio: "bg-yellow-500/10",
    auditoria: "bg-purple-500/10",
  };

  if (loading && events.length === 0) return (
    <div className="flex h-screen items-center justify-center">
      <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="space-y-6 pb-24">
      <header className="py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Agenda</h1>
        <button onClick={() => setIsCycleModalOpen(true)} className="text-xs text-gray-400 bg-white/10 px-3 py-1 rounded-full">
          Configurar Ciclo
        </button>
      </header>

      {/* DÍA ACTUAL INFO */}
      <div className="text-center py-3 bg-gradient-to-r from-card to-black border border-white/10 rounded-2xl relative overflow-hidden shadow-lg">
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl -z-0"></div>
        <div className="relative z-10">
          <p className="text-sm text-gray-400 font-semibold uppercase tracking-widest mb-1">Hoy es el día</p>
          <p className="text-4xl font-black text-positive drop-shadow-md">{currentCycleDay} <span className="text-xl text-gray-600">/ 21</span></p>
        </div>
      </div>

      {/* VISUALIZADOR */}
      <section>
        <div className="flex justify-between items-center mb-6 bg-card p-2 rounded-2xl border border-white/10 shadow-lg">
          <button onClick={() => setSelectedViewDay(Math.max(1, selectedViewDay - 1))} className="px-5 py-2 bg-black rounded-xl border border-white/10 hover:bg-white/10 text-xl font-bold">{'<'}</button>
          <div className="text-center">
            <h2 className="text-xl font-black">Día {selectedViewDay}</h2>
          </div>
          <button onClick={() => setSelectedViewDay(Math.min(21, selectedViewDay + 1))} className="px-5 py-2 bg-black rounded-xl border border-white/10 hover:bg-white/10 text-xl font-bold">{'>'}</button>
        </div>
        
        <div className="mb-6">
           <button onClick={openNewModal} className="w-full bg-white text-black font-black rounded-xl p-3 text-sm shadow-[0_4px_14px_0_rgba(255,255,255,0.39)] hover:scale-[1.02] transition-transform">
             + Agregar Evento
           </button>
        </div>

        <div className="space-y-4 relative pl-4 border-l-2 border-white/10 ml-2 mt-8">
          {eventsForSelectedDay.length > 0 ? eventsForSelectedDay.map(event => (
            <div key={event.id} className="relative pl-6">
              {/* Timeline Dot */}
              <div className={`absolute -left-[29px] top-4 w-4 h-4 rounded-full border-4 ${typeColors[event.type]} bg-black shadow-[0_0_10px_rgba(255,255,255,0.2)]`}></div>
              
              {/* Event Card */}
              <div className={`p-4 rounded-2xl border-l-4 ${typeColors[event.type]} ${typeBgColors[event.type]} border border-white/5`}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold text-lg leading-none">{event.title}</h3>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${typeColors[event.type].replace('border', 'text')}`}>{event.type}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm font-bold bg-black/50 px-2 py-1 rounded-lg border border-white/5">{event.startTime}</p>
                    <p className="font-mono text-xs text-gray-400 mt-1 mr-1">{event.endTime}</p>
                  </div>
                </div>
                <div className="flex gap-4 mt-3 border-t border-white/10 pt-3">
                  <button onClick={() => openEditModal(event)} className="text-xs font-semibold text-gray-300 hover:text-white flex-1 text-center py-2 bg-black/30 rounded-lg transition-colors hover:bg-black/50">Editar</button>
                  <button onClick={() => handleDelete(event.id)} className="text-xs font-semibold text-negative hover:text-red-400 flex-1 text-center py-2 bg-black/30 rounded-lg transition-colors hover:bg-black/50">Borrar</button>
                </div>
              </div>
            </div>
          )) : (
            <div className="text-center py-10 bg-card rounded-2xl border border-dashed border-white/20">
              <p className="text-gray-500 font-semibold">Día libre de eventos.</p>
            </div>
          )}
        </div>
      </section>

      {/* Modal Cycle Config */}
      <Modal isOpen={isCycleModalOpen} onClose={() => setIsCycleModalOpen(false)} title="Configurar Ciclo">
        <div className="space-y-4">
          <p className="text-sm text-gray-400">Define qué fecha de calendario representa el "Día 1" de tu ciclo de 21 días. A partir de esa fecha, la app calculará automáticamente qué número de día es hoy.</p>
          <div>
            <label className="text-xs text-gray-400">Fecha del Día 1</label>
            <input 
              type="date" 
              value={cycleStartDate} 
              onChange={(e) => setCycleStartDate(e.target.value)}
              className="w-full bg-black border border-white/20 rounded-lg p-2 mt-1 text-sm"
            />
          </div>
          <button onClick={handleUpdateCycle} className="w-full bg-white text-black font-bold rounded-lg p-3">
            Guardar Configuración
          </button>
        </div>
      </Modal>

      {/* Modal Event */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={eventToEdit ? "Editar Evento" : "Nuevo Evento"}>
        <form onSubmit={handleSubmitEvent} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400">Día del ciclo</label>
              <input 
                type="number" min="1" max="21"
                value={dayNumber} onChange={(e) => setDayNumber(e.target.value)}
                className="w-full bg-black border border-white/20 rounded-lg p-2 mt-1 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400">Tipo</label>
              <select 
                value={type} onChange={(e) => setType(e.target.value)}
                className="w-full bg-black border border-white/20 rounded-lg p-2 mt-1 text-sm capitalize"
              >
                {Object.keys(typeColors).map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400">Hora Inicio</label>
              <input 
                type="time" 
                value={startTime} onChange={(e) => setStartTime(e.target.value)} required
                className="w-full bg-black border border-white/20 rounded-lg p-2 mt-1 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400">Hora Fin</label>
              <input 
                type="time" 
                value={endTime} onChange={(e) => setEndTime(e.target.value)} required
                className="w-full bg-black border border-white/20 rounded-lg p-2 mt-1 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400">Título</label>
            <input 
              type="text" 
              value={title} onChange={(e) => setTitle(e.target.value)} required
              placeholder="Ej. Gimnasio"
              className="w-full bg-black border border-white/20 rounded-lg p-2 mt-1 text-sm"
            />
          </div>

          <button type="submit" className="w-full bg-white text-black font-bold rounded-lg p-3">
            {eventToEdit ? "Actualizar" : "Crear Evento"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
