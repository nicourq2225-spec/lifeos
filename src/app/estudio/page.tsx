"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/Modal";

type StudyTask = { id: number; date: string; subject: string; completed: boolean };

export default function EstudioPage() {
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [loading, setLoading] = useState(true);

  // Form Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<StudyTask | undefined>(undefined);
  
  // Form fields
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [subject, setSubject] = useState("");

  const fetchTasks = async () => {
    setLoading(true);
    const res = await fetch("/api/estudio");
    const data = await res.json();
    setTasks(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const openNewModal = () => {
    setTaskToEdit(undefined);
    setDate(new Date().toISOString().split('T')[0]);
    setSubject("");
    setIsModalOpen(true);
  };

  const openEditModal = (t: StudyTask) => {
    setTaskToEdit(t);
    setDate(t.date.split('T')[0]);
    setSubject(t.subject);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !date) return;
    
    const [y, m, d] = date.split('-');
    const safeDate = new Date(parseInt(y), parseInt(m)-1, parseInt(d), 12, 0, 0).toISOString();

    if (taskToEdit) {
      await fetch("/api/estudio", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: taskToEdit.id, date: safeDate, subject, completed: taskToEdit.completed })
      });
    } else {
      await fetch("/api/estudio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: safeDate, subject })
      });
    }
    
    setIsModalOpen(false);
    fetchTasks();
  };

  const toggleTask = async (id: number, completed: boolean) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !completed } : t));
    await fetch("/api/estudio", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, completed: !completed })
    });
    fetchTasks(); // fetch complete task to be safe, since PUT in backend only updates completed currently.
    // wait, I need to update the backend to support editing `date` and `subject`.
  };

  const deleteTask = async (id: number) => {
    if (!confirm("¿Eliminar tarea de estudio?")) return;
    setTasks(prev => prev.filter(t => t.id !== id));
    await fetch(`/api/estudio?id=${id}`, { method: "DELETE" });
  };

  if (loading) return <div className="p-4">Cargando tareas de estudio...</div>;

  return (
    <div className="space-y-6 pb-24">
      <header className="py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Estudio</h1>
        <button onClick={openNewModal} className="bg-white text-black font-bold text-xs px-3 py-1 rounded-full">
          + Planificar
        </button>
      </header>

      {/* TABLA DE TAREAS */}
      <section>
        <div className="space-y-3">
          {tasks.map(task => (
            <div key={task.id} className={`bg-card p-4 rounded-xl border flex justify-between items-center transition-colors ${task.completed ? 'border-positive/50 bg-positive/10' : 'border-white/5'}`}>
              <div>
                <p className={`font-semibold ${task.completed ? 'line-through text-gray-400' : ''}`}>{task.subject}</p>
                <p className="text-xs text-gray-500">{new Date(task.date).toLocaleDateString()}</p>
              </div>
              <div className="flex gap-2 items-center">
                <button onClick={() => openEditModal(task)} className="text-[10px] text-gray-400">Editar</button>
                <button onClick={() => deleteTask(task.id)} className="text-[10px] text-negative mr-2">Borrar</button>
                
                <button 
                  onClick={() => toggleTask(task.id, task.completed)}
                  className={`w-8 h-8 flex items-center justify-center rounded-full border ${task.completed ? 'bg-positive border-positive text-black' : 'border-white/20 text-white'}`}
                >
                  ✓
                </button>
              </div>
            </div>
          ))}
          {tasks.length === 0 && <p className="text-sm text-gray-400">No hay materias planificadas.</p>}
        </div>
      </section>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={taskToEdit ? "Editar Materia" : "Planificar Materia"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400">Fecha</label>
              <input 
                type="date" 
                value={date} onChange={(e) => setDate(e.target.value)}
                className="w-full bg-black border border-white/20 rounded-lg p-2 mt-1 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400">Materia / Tema</label>
              <input 
                type="text" 
                value={subject} onChange={(e) => setSubject(e.target.value)}
                placeholder="Ej. Matemáticas" required
                className="w-full bg-black border border-white/20 rounded-lg p-2 mt-1 text-sm"
              />
            </div>
          </div>
          <button type="submit" className="w-full bg-white text-black font-bold rounded-lg p-3">
            {taskToEdit ? "Actualizar" : "Agregar"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
