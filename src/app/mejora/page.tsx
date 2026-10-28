"use client";

import { useState, useEffect, Suspense } from "react";
import { toast } from "sonner";
import Modal from "@/components/Modal";

type Question = {
  id: number;
  text: string;
  active: boolean;
  order: number;
};

type JournalLearning = {
  id: number;
  content: string;
  dateStr: string;
  pinned: boolean;
  createdAt: string;
};

function getArgentinaTodayStr(): string {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

function shiftDateStr(baseDateStr: string, deltaDays: number): string {
  const [y, m, d] = baseDateStr.split("-").map(Number);
  const nextUtc = new Date(Date.UTC(y, m - 1, d + deltaDays, 12, 0, 0));
  return nextUtc.toISOString().split("T")[0];
}

function formatDateDisplay(yyyyMmDd: string): string {
  if (!yyyyMmDd || !/^\d{4}-\d{2}-\d{2}$/.test(yyyyMmDd)) return yyyyMmDd;
  const [y, m, d] = yyyyMmDd.split("-");
  return `${d}/${m}/${y}`;
}

function MejoraContent() {
  const todayStr = getArgentinaTodayStr();

  const [dateStr, setDateStr] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const param = new URLSearchParams(window.location.search).get("date");
      if (param && /^\d{4}-\d{2}-\d{2}$/.test(param)) {
        return param;
      }
    }
    return getArgentinaTodayStr();
  });

  const [activeTab, setActiveTab] = useState<"journal" | "conocimientos">("journal");

  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingEntry, setLoadingEntry] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [note, setNote] = useState("");
  const [answers, setAnswers] = useState<Record<number, string>>({});

  // Conocimientos Adquiridos (Enseñanzas acumuladas)
  const [learnings, setLearnings] = useState<JournalLearning[]>([]);
  const [learningDraft, setLearningDraft] = useState("");
  const [isSavingLearning, setIsSavingLearning] = useState(false);
  const [quickLearningText, setQuickLearningText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingLearningId, setEditingLearningId] = useState<number | null>(null);
  const [editingLearningText, setEditingLearningText] = useState("");

  // Modal de configuración de preguntas
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [newQuestionText, setNewQuestionText] = useState("");
  const [isSubmittingConfig, setIsSubmittingConfig] = useState(false);

  const fetchQuestionsAndLearnings = async () => {
    try {
      const [resQ, resL] = await Promise.all([
        fetch("/api/mejora/questions"),
        fetch("/api/mejora/learnings"),
      ]);
      const [dataQ, dataL] = await Promise.all([resQ.json(), resL.json()]);
      if (Array.isArray(dataQ)) setQuestions(dataQ);
      if (Array.isArray(dataL)) setLearnings(dataL);
    } catch {
      toast.error("Error al cargar configuración y conocimientos");
    }
  };

  const fetchEntryForDate = async (targetDate: string) => {
    setLoadingEntry(true);
    try {
      const resE = await fetch(`/api/mejora/entry?date=${targetDate}`);
      const dataE = await resE.json();

      if (dataE && !dataE.error) {
        setNote(dataE.note || "");
        const loadedAnswers: Record<number, string> = {};
        if (Array.isArray(dataE.answers)) {
          dataE.answers.forEach((a: { questionId: number; answerText: string }) => {
            loadedAnswers[a.questionId] = a.answerText;
          });
        }
        setAnswers(loadedAnswers);
      } else {
        setNote("");
        setAnswers({});
      }
    } catch {
      toast.error("Error al cargar el registro del día");
    } finally {
      setLoadingEntry(false);
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestionsAndLearnings();
  }, []);

  useEffect(() => {
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return;
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `/mejora?date=${dateStr}`);
    }
    fetchEntryForDate(dateStr);
  }, [dateStr]);

  const handleSaveLearningDraft = async (contentText: string, targetDate: string) => {
    const trimmed = contentText.trim();
    if (!trimmed) return false;

    setIsSavingLearning(true);
    try {
      const res = await fetch("/api/mejora/learnings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: trimmed,
          dateStr: targetDate,
        }),
      });
      if (!res.ok) throw new Error();
      const created: JournalLearning = await res.json();
      setLearnings((prev) => [created, ...prev]);
      return true;
    } catch {
      toast.error("No se pudo guardar el conocimiento adquirido");
      return false;
    } finally {
      setIsSavingLearning(false);
    }
  };

  const handleSaveEntry = async () => {
    setIsSubmitting(true);
    try {
      const answersArray = Object.keys(answers).map((qId) => ({
        questionId: parseInt(qId, 10),
        answerText: answers[parseInt(qId, 10)],
      }));

      const res = await fetch("/api/mejora/entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: dateStr,
          note,
          answers: answersArray,
        }),
      });

      if (!res.ok) throw new Error();

      // Si el usuario también escribió un conocimiento adquirido en el campo del día, lo guardamos automáticamente
      let savedLearningToo = false;
      if (learningDraft.trim()) {
        savedLearningToo = await handleSaveLearningDraft(learningDraft, dateStr);
        if (savedLearningToo) {
          setLearningDraft("");
        }
      }

      toast.success(
        savedLearningToo
          ? "Registro del día y conocimiento adquirido guardados"
          : "Registro del día guardado"
      );
    } catch {
      toast.error("Error al guardar el registro");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddStandaloneLearning = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickLearningText.trim()) return;
    const ok = await handleSaveLearningDraft(quickLearningText, dateStr);
    if (ok) {
      setQuickLearningText("");
      toast.success("Conocimiento agregado a tu listado");
    }
  };

  const handleTogglePinLearning = async (item: JournalLearning) => {
    try {
      const res = await fetch("/api/mejora/learnings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, pinned: !item.pinned }),
      });
      if (!res.ok) throw new Error();
      const updated: JournalLearning = await res.json();
      setLearnings((prev) =>
        prev
          .map((l) => (l.id === updated.id ? updated : l))
          .sort((a, b) => {
            if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
            if (a.dateStr !== b.dateStr) return b.dateStr.localeCompare(a.dateStr);
            return b.id - a.id;
          })
      );
      toast.success(updated.pinned ? "Conocimiento fijado arriba" : "Conocimiento desfijado");
    } catch {
      toast.error("Error al actualizar el conocimiento");
    }
  };

  const handleSaveEditedLearning = async (id: number) => {
    if (!editingLearningText.trim()) return;
    try {
      const res = await fetch("/api/mejora/learnings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, content: editingLearningText.trim() }),
      });
      if (!res.ok) throw new Error();
      const updated: JournalLearning = await res.json();
      setLearnings((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
      setEditingLearningId(null);
      setEditingLearningText("");
      toast.success("Conocimiento actualizado");
    } catch {
      toast.error("Error al editar el conocimiento");
    }
  };

  const handleDeleteLearning = async (id: number) => {
    if (!confirm("¿Eliminar este conocimiento adquirido del listado?")) return;
    try {
      const res = await fetch(`/api/mejora/learnings?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      setLearnings((prev) => prev.filter((l) => l.id !== id));
      toast.success("Conocimiento eliminado");
    } catch {
      toast.error("Error al eliminar el conocimiento");
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
        body: JSON.stringify({ text: newQuestionText.trim(), order: questions.length }),
      });
      if (!res.ok) throw new Error();
      toast.success("Pregunta añadida");
      setNewQuestionText("");
      fetchQuestionsAndLearnings();
    } catch {
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
      fetchQuestionsAndLearnings();
    } catch {
      toast.error("Error al eliminar pregunta");
    }
  };

  const dayLearnings = learnings.filter((l) => l.dateStr === dateStr);
  const filteredLearnings = learnings.filter((l) =>
    searchQuery.trim()
      ? l.content.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
        l.dateStr.includes(searchQuery.trim())
      : true
  );

  if (initialLoading && !questions.length) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 relative">
      <header className="pt-8 pb-2 space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-black tracking-tight">Mejora Continua</h1>
          <button
            type="button"
            onClick={() => setIsConfigOpen(true)}
            aria-label="Configurar preguntas del journaling"
            className="text-xl min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-white/10 rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
          >
            ⚙️
          </button>
        </div>

        {/* NAVEGACIÓN ENTRE JOURNALING DIARIO Y BAÚL DE CONOCIMIENTOS ADQUIRIDOS */}
        <div className="grid grid-cols-2 gap-2 bg-card p-1.5 rounded-2xl border border-white/10">
          <button
            type="button"
            aria-pressed={activeTab === "journal"}
            onClick={() => setActiveTab("journal")}
            className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-black transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 ${
              activeTab === "journal"
                ? "bg-white text-black shadow"
                : "text-gray-400 hover:text-white"
            }`}
          >
            📝 Journaling Diario
          </button>
          <button
            type="button"
            aria-pressed={activeTab === "conocimientos"}
            onClick={() => setActiveTab("conocimientos")}
            className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 ${
              activeTab === "conocimientos"
                ? "bg-amber-400 text-black shadow"
                : "text-amber-300/90 hover:text-amber-200"
            }`}
          >
            <span>💡 Conocimientos</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[11px] font-black ${
                activeTab === "conocimientos"
                  ? "bg-black/20 text-black"
                  : "bg-amber-500/20 text-amber-300"
              }`}
            >
              {learnings.length}
            </span>
          </button>
        </div>
      </header>

      {/* ================================================================= */}
      {/* PESTAÑA 1: JOURNALING DIARIO + CAMPO DE CONOCIMIENTO ADQUIRIDO    */}
      {/* ================================================================= */}
      {activeTab === "journal" && (
        <div className="space-y-5">
          {/* Selector de fecha corregido con botones de navegación rápida */}
          <div className="flex items-center gap-2 bg-card p-2 rounded-2xl border border-white/10">
            <button
              type="button"
              onClick={() => setDateStr((prev) => shiftDateStr(prev, -1))}
              aria-label="Día anterior"
              className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl bg-black/50 border border-white/10 hover:bg-white/10 text-sm font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
            >
              ◀
            </button>

            <div className="flex-1 flex items-center gap-2 px-2">
              <label htmlFor="mejora-date" className="text-xs font-bold text-gray-400 shrink-0">
                Día:
              </label>
              <input
                id="mejora-date"
                name="date"
                type="date"
                value={dateStr}
                onChange={(e) => {
                  if (e.target.value) {
                    setDateStr(e.target.value);
                  }
                }}
                className="bg-transparent text-base text-white font-bold w-full min-h-[40px] cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 rounded-lg px-1"
              />
            </div>

            {dateStr !== todayStr && (
              <button
                type="button"
                onClick={() => setDateStr(todayStr)}
                className="px-3 min-h-[40px] rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-black hover:bg-cyan-500/30 transition-colors shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
              >
                Hoy
              </button>
            )}

            <button
              type="button"
              onClick={() => setDateStr((prev) => shiftDateStr(prev, 1))}
              aria-label="Día siguiente"
              className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl bg-black/50 border border-white/10 hover:bg-white/10 text-sm font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
            >
              ▶
            </button>
          </div>

          <section className="bg-card rounded-2xl border border-white/10 p-4 shadow-lg space-y-5 relative">
            {loadingEntry && (
              <div className="text-xs text-cyan-300 font-semibold">
                Sincronizando registro del {formatDateDisplay(dateStr)}...
              </div>
            )}

            <div>
              <label
                htmlFor="journal-general-note"
                className="text-sm font-bold text-gray-200 block mb-2"
              >
                Reflexión / Journaling General
              </label>
              <textarea
                id="journal-general-note"
                name="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full bg-black/50 border border-white/15 rounded-xl p-3 text-base min-h-[120px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 transition-colors placeholder-gray-500"
                placeholder="¿Cómo te sentiste hoy? ¿Qué hiciste bien y qué podés ajustar mañana?"
              />
            </div>

            {questions
              .filter((q) => q.active)
              .map((q) => (
                <div key={q.id}>
                  <label
                    htmlFor={`journal-q-${q.id}`}
                    className="text-sm font-bold text-gray-200 block mb-2"
                  >
                    {q.text}
                  </label>
                  <textarea
                    id={`journal-q-${q.id}`}
                    name={`question_${q.id}`}
                    value={answers[q.id] || ""}
                    onChange={(e) =>
                      setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                    }
                    className="w-full bg-black/50 border border-white/15 rounded-xl p-3 text-base min-h-[84px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 transition-colors placeholder-gray-500"
                    placeholder="Tu respuesta..."
                  />
                </div>
              ))}

            {/* ESPACIO DESTACADO: CONOCIMIENTO ADQUIRIDO / ENSEÑANZA */}
            <div className="bg-gradient-to-br from-amber-950/30 via-black/60 to-black border border-amber-500/30 rounded-2xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <label
                    htmlFor="journal-learning-input"
                    className="text-sm font-black text-amber-300 block"
                  >
                    💡 Conocimiento Adquirido / Enseñanza
                  </label>
                  <p id="journal-learning-hint" className="text-xs text-gray-400 mt-0.5">
                    Toda enseñanza que cargues acá se guarda en tu sección permanente de{" "}
                    <strong className="text-amber-200">Conocimientos</strong> para que nunca
                    quede perdida en un journal pasado.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("conocimientos")}
                  className="text-[11px] font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 px-2.5 py-1.5 rounded-xl shrink-0 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
                >
                  Ver todos ({learnings.length}) →
                </button>
              </div>

              <textarea
                id="journal-learning-input"
                name="learningDraft"
                aria-describedby="journal-learning-hint"
                value={learningDraft}
                onChange={(e) => setLearningDraft(e.target.value)}
                className="w-full bg-black/70 border border-amber-500/30 rounded-xl p-3 text-base min-h-[88px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 transition-colors placeholder-gray-500"
                placeholder="Ej: Descubrí que si dejo el celular fuera de la habitación a las 23:00 me levanto sin fricción..."
              />

              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={!learningDraft.trim() || isSavingLearning}
                  onClick={async () => {
                    const ok = await handleSaveLearningDraft(learningDraft, dateStr);
                    if (ok) {
                      setLearningDraft("");
                      toast.success("Enseñanza guardada en Conocimientos Adquiridos");
                    }
                  }}
                  className="bg-amber-400 hover:bg-amber-300 text-black font-black text-xs px-4 py-2.5 rounded-xl transition-all disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
                >
                  {isSavingLearning
                    ? "Guardando enseñanza..."
                    : "+ Guardar ahora en Conocimientos"}
                </button>
              </div>

              {dayLearnings.length > 0 && (
                <div className="pt-2 border-t border-amber-500/20 space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-amber-300/80">
                    Enseñanzas registradas en este día ({dayLearnings.length})
                  </p>
                  <ul role="list" className="space-y-2">
                    {dayLearnings.map((item) => (
                      <li
                        key={item.id}
                        className="bg-black/60 border border-amber-500/20 rounded-xl p-2.5 text-xs text-gray-200 flex items-start justify-between gap-2"
                      >
                        <span className="leading-relaxed">💡 {item.content}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteLearning(item.id)}
                          aria-label={`Borrar enseñanza: ${item.content.slice(0, 35)}`}
                          className="text-[11px] text-red-400 hover:text-red-300 shrink-0 px-1.5 py-0.5 rounded"
                        >
                          Borrar
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleSaveEntry}
              disabled={isSubmitting}
              className="w-full bg-white text-black font-black py-4 rounded-xl shadow-[0_0_15px_rgba(255,255,255,0.2)] active:scale-95 transition-all disabled:opacity-50 mt-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
            >
              {isSubmitting ? "Guardando..." : "Guardar Registro del Día"}
            </button>
          </section>
        </div>
      )}

      {/* ================================================================= */}
      {/* PESTAÑA 2: SECCIÓN ACUMULADA DE CONOCIMIENTOS ADQUIRIDOS          */}
      {/* ================================================================= */}
      {activeTab === "conocimientos" && (
        <div className="space-y-5">
          {/* Encabezado explicativo y buscador rápido */}
          <section className="bg-gradient-to-br from-amber-950/30 via-card to-black rounded-2xl border border-amber-500/30 p-4 space-y-4">
            <div>
              <h2 className="text-lg font-black text-amber-300">
                💡 Baúl de Conocimientos Adquiridos
              </h2>
              <p className="text-xs text-gray-300 mt-1">
                Acá se acumulan todas tus enseñanzas, descubrimientos y reglas personales que
                vas extrayendo de tu introspección diaria para repasarlas rápido y no
                olvidarlas.
              </p>
            </div>

            {/* Carga rápida directa desde la sección de conocimientos */}
            <form onSubmit={handleAddStandaloneLearning} className="space-y-2">
              <label
                htmlFor="quick-learning-input"
                className="text-xs font-bold text-gray-300 block"
              >
                Agregar nueva enseñanza directamente
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  id="quick-learning-input"
                  name="quickLearning"
                  type="text"
                  value={quickLearningText}
                  onChange={(e) => setQuickLearningText(e.target.value)}
                  placeholder="Escribe una conclusión o aprendizaje clave..."
                  className="flex-1 bg-black border border-white/20 rounded-xl p-3 text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
                />
                <button
                  type="submit"
                  disabled={isSavingLearning || !quickLearningText.trim()}
                  className="bg-amber-400 hover:bg-amber-300 text-black font-black px-5 py-3 rounded-xl text-sm shrink-0 disabled:opacity-40 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
                >
                  + Agregar
                </button>
              </div>
            </form>

            {/* Buscador instantáneo */}
            {learnings.length > 0 && (
              <div>
                <label
                  htmlFor="search-learnings"
                  className="text-xs font-bold text-gray-400 block mb-1"
                >
                  Buscar en tus conocimientos ({filteredLearnings.length} de {learnings.length})
                </label>
                <input
                  id="search-learnings"
                  name="searchLearnings"
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="🔍 Filtrar por palabra clave o fecha..."
                  className="w-full bg-black/70 border border-white/15 rounded-xl p-2.5 text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
                />
              </div>
            )}
          </section>

          {/* Listado acumulado */}
          {filteredLearnings.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-2xl border border-dashed border-white/15 px-4">
              <p className="text-gray-300 font-bold text-sm">
                {learnings.length === 0
                  ? "Todavía no registraste conocimientos adquiridos."
                  : "No se encontraron conocimientos con esa búsqueda."}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {learnings.length === 0
                  ? "Escribí una enseñanza en tu Journaling Diario o agregala arriba para empezar a construir tu base personal."
                  : "Probá con otra palabra clave."}
              </p>
            </div>
          ) : (
            <ul role="list" className="space-y-3">
              {filteredLearnings.map((item) => {
                const isEditing = editingLearningId === item.id;
                const snippet = item.content.slice(0, 35);

                return (
                  <li
                    key={item.id}
                    className={`rounded-2xl p-4 border transition-colors space-y-3 ${
                      item.pinned
                        ? "bg-gradient-to-br from-amber-950/35 via-card to-black border-amber-400/50 shadow-[0_0_20px_rgba(251,191,36,0.08)]"
                        : "bg-card border-white/10"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        {item.pinned && (
                          <span className="text-[10px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/40 px-2 py-0.5 rounded-full">
                            📌 Destacado
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setDateStr(item.dateStr);
                            setActiveTab("journal");
                          }}
                          className="text-xs font-bold text-gray-400 hover:text-cyan-300 bg-black/50 px-2.5 py-1 rounded-lg border border-white/10 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
                        >
                          📅 {formatDateDisplay(item.dateStr)} · Ver journal
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleTogglePinLearning(item)}
                          aria-label={`${
                            item.pinned ? "Desfijar" : "Fijar"
                          } conocimiento: ${snippet}`}
                          className={`text-xs font-bold px-2.5 py-1 rounded-lg border transition-colors ${
                            item.pinned
                              ? "bg-amber-400/20 text-amber-300 border-amber-400/40 hover:bg-amber-400/30"
                              : "bg-black/40 text-gray-400 border-white/10 hover:text-white"
                          }`}
                        >
                          {item.pinned ? "Desfijar" : "📌 Fijar"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingLearningId(item.id);
                            setEditingLearningText(item.content);
                          }}
                          aria-label={`Editar conocimiento: ${snippet}`}
                          className="text-xs font-bold px-2.5 py-1 rounded-lg bg-black/40 text-gray-300 border border-white/10 hover:text-white transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteLearning(item.id)}
                          aria-label={`Borrar conocimiento: ${snippet}`}
                          className="text-xs font-bold px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                        >
                          Borrar
                        </button>
                      </div>
                    </div>

                    {isEditing ? (
                      <div className="space-y-2 pt-1">
                        <label
                          htmlFor={`edit-learning-${item.id}`}
                          className="text-xs font-bold text-amber-300 block"
                        >
                          Editar enseñanza
                        </label>
                        <textarea
                          id={`edit-learning-${item.id}`}
                          value={editingLearningText}
                          onChange={(e) => setEditingLearningText(e.target.value)}
                          className="w-full bg-black border border-amber-400/40 rounded-xl p-3 text-base min-h-[80px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingLearningId(null);
                              setEditingLearningText("");
                            }}
                            className="text-xs font-bold px-3 py-1.5 rounded-lg bg-white/10 text-gray-300 hover:bg-white/20"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEditedLearning(item.id)}
                            className="text-xs font-black px-4 py-1.5 rounded-lg bg-amber-400 text-black hover:bg-amber-300"
                          >
                            Guardar cambios
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm sm:text-base text-gray-100 leading-relaxed whitespace-pre-wrap">
                        {item.content}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* MODAL CONFIGURACIÓN PREGUNTAS */}
      <Modal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        title="Configurar Preguntas"
      >
        <div className="space-y-6">
          <form onSubmit={handleAddQuestion} className="space-y-2">
            <label htmlFor="new-question-input" className="text-xs font-bold text-gray-400 block">
              Nueva pregunta de introspección
            </label>
            <div className="flex gap-2">
              <input
                id="new-question-input"
                type="text"
                value={newQuestionText}
                onChange={(e) => setNewQuestionText(e.target.value)}
                placeholder="Nueva pregunta..."
                className="flex-1 bg-black border border-white/20 rounded-lg p-2.5 text-base"
                required
              />
              <button
                type="submit"
                disabled={isSubmittingConfig}
                className="bg-white text-black font-bold px-4 rounded-lg text-sm disabled:opacity-50"
              >
                {isSubmittingConfig ? "..." : "Añadir"}
              </button>
            </div>
          </form>

          <div className="space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
            {questions.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">
                No hay preguntas configuradas.
              </p>
            ) : (
              <ul role="list" className="space-y-2">
                {questions.map((q) => (
                  <li
                    key={q.id}
                    className="flex justify-between items-center bg-black/40 border border-white/10 p-3 rounded-xl gap-2"
                  >
                    <p className="text-sm flex-1">{q.text}</p>
                    <button
                      type="button"
                      onClick={() => handleDeleteQuestion(q.id)}
                      aria-label={`Borrar pregunta: ${q.text}`}
                      className="text-red-400 text-xs px-2.5 py-1 bg-red-500/10 rounded hover:bg-red-500/20"
                    >
                      Borrar
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function MejoraPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <MejoraContent />
    </Suspense>
  );
}

export const dynamic = "force-dynamic";
