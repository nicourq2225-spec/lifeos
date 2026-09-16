"use client";

import { useState, useEffect, Suspense } from "react";
import { toast } from "sonner";
import Modal from "@/components/Modal";
import { useRouter, useSearchParams } from "next/navigation";

type Question = {
  id: number;
  text: string;
  active: boolean;
  order: number;
};

function MejoraContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dateParam = searchParams.get("date");
  
  const [dateStr, setDateStr] = useState(() => {
    return dateParam || new Date().toISOString().split('T')[0];
  });

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [note, setNote] = useState("");
  const [answers, setAnswers] = useState<Record<number, string>>({});

  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [newQuestionText, setNewQuestionText] = useState("");
  const [isSubmittingConfig, setIsSubmittingConfig] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("lifeos_date");
      if (stored && !dateParam) setDateStr(stored);
    }
  }, []);

  useEffect(() => {
    if (dateParam && dateParam !== dateStr) {
      setDateStr(dateParam);
    } else {
      if (typeof window !== "undefined") {
        localStorage.setItem("lifeos_date", dateStr);
      }
      router.replace(`/mejora?date=${dateStr}`, { scroll: false });
    }
    fetchData();
  }, [dateStr, router, dateParam]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch active questions
      const resQ = await fetch("/api/mejora/questions");
      const dataQ = await resQ.json();
      setQuestions(dataQ || []);

      // Fetch entry for date
      const resE = await fetch(`/api/mejora/entry?date=${dateStr}`);
      const dataE = await resE.json();
      
      if (dataE && !dataE.error) {
        setNote(dataE.note || "");
        const loadedAnswers: Record<number, string> = {};
        if (dataE.answers) {
          dataE.answers.forEach((a: any) => {
            loadedAnswers[a.questionId] = a.answerText;
          });
        }
        setAnswers(loadedAnswers);
      } else {
        setNote("");
        setAnswers({});
      }
    } catch (e) {
      toast.error("Error al cargar los datos");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEntry = async () => {
    setIsSubmitting(true);
    try {
      const answersArray = Object.keys(answers).map(qId => ({
        questionId: parseInt(qId),
        answerText: answers[parseInt(qId)]
      }));

      const res = await fetch("/api/mejora/entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: dateStr,
          note,
          answers: answersArray
        })
      });

      if (!res.ok) throw new Error();
      toast.success("Registro guardado");
    } catch (e) {
      toast.error("Error al guardar el registro");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestionText.trim()) return;
    
    setIsSubmittingConfig(true);
    try {
      const res = await fetch("/api/mejora/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: newQuestionText, order: questions.length })
      });
      if (!res.ok) throw new Error();
      toast.success("Pregunta añadida");
      setNewQuestionText("");
      fetchData();
    } catch (e) {
      toast.error("Error al añadir pregunta");
    } finally {
      setIsSubmittingConfig(false);
    }
  };

  const handleDeleteQuestion = async (id: number) => {
    if (!confirm("¿Borrar esta pregunta global? Afectará a los registros históricos.")) return;
    try {
      const res = await fetch(`/api/mejora/questions?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Pregunta eliminada");
      fetchData();
    } catch (e) {
      toast.error("Error al eliminar pregunta");
    }
  };

  if (loading && !questions.length) return (
    <div className="flex h-screen items-center justify-center">
      <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="space-y-6 pb-24 relative">
      <header className="pt-8 pb-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-black tracking-tight">Mejora Continua</h1>
          <button onClick={() => setIsConfigOpen(true)} className="text-xl p-2 hover:bg-white/10 rounded-full transition-colors" title="Configurar Preguntas">
            ⚙️
          </button>
        </div>
        <div className="flex items-center gap-2 bg-card p-2 rounded-xl border border-white/10">
          <span className="text-xs font-bold text-gray-400">Día:</span>
          <input 
            type="date" 
            value={dateStr}
            onChange={(e) => setDateStr(e.target.value)}
            className="bg-transparent text-sm text-white font-bold outline-none flex-1"
          />
        </div>
      </header>

      <section className="bg-card rounded-2xl border border-white/10 p-4 shadow-lg space-y-4">
        <div>
          <label className="text-sm font-bold text-gray-300 block mb-2">Reflexión / Journaling General</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-sm min-h-[120px] focus:outline-none focus:border-white/30 transition-colors placeholder-gray-600"
            placeholder="¿Cómo te sentiste hoy? ¿Qué aprendiste? Escribe libremente aquí..."
          />
        </div>

        {questions.filter(q => q.active).map(q => (
          <div key={q.id}>
            <label className="text-sm font-bold text-gray-300 block mb-2">{q.text}</label>
            <textarea
              value={answers[q.id] || ""}
              onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
              className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-sm min-h-[80px] focus:outline-none focus:border-white/30 transition-colors"
              placeholder="Tu respuesta..."
            />
          </div>
        ))}

        <button 
          onClick={handleSaveEntry}
          disabled={isSubmitting}
          className="w-full bg-white text-black font-black py-4 rounded-xl shadow-[0_0_15px_rgba(255,255,255,0.2)] active:scale-95 transition-all disabled:opacity-50 mt-4"
        >
          {isSubmitting ? "Guardando..." : "Guardar Registro del Día"}
        </button>
      </section>

      {/* MODAL CONFIGURACIÓN PREGUNTAS */}
      <Modal isOpen={isConfigOpen} onClose={() => setIsConfigOpen(false)} title="Configurar Preguntas">
        <div className="space-y-6">
          <form onSubmit={handleAddQuestion} className="flex gap-2">
            <input 
              type="text" 
              value={newQuestionText}
              onChange={(e) => setNewQuestionText(e.target.value)}
              placeholder="Nueva pregunta..."
              className="flex-1 bg-black border border-white/20 rounded-lg p-2 text-sm"
              required
            />
            <button type="submit" disabled={isSubmittingConfig} className="bg-white text-black font-bold px-4 rounded-lg text-sm disabled:opacity-50">
              {isSubmittingConfig ? "..." : "Añadir"}
            </button>
          </form>

          <div className="space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
            {questions.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">No hay preguntas configuradas.</p>
            ) : (
              questions.map(q => (
                <div key={q.id} className="flex justify-between items-center bg-black/40 border border-white/10 p-3 rounded-xl gap-2">
                  <p className="text-sm flex-1">{q.text}</p>
                  <button onClick={() => handleDeleteQuestion(q.id)} className="text-red-500 text-xs px-2 py-1 bg-red-500/10 rounded hover:bg-red-500/20">
                    Borrar
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>

    </div>
  );
}

export default function MejoraPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div></div>}>
      <MejoraContent />
    </Suspense>
  );
}

