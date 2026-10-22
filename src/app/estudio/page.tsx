"use client";

import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import Modal from "@/components/Modal";

type StudyLesson = {
  id: number;
  title: string;
  min: number;
  completed?: boolean;
};

type StudyTask = {
  id: number;
  sessionNumber: number | null;
  date: string;
  dateStr: string | null;
  dayOfWeek: string | null;
  subject: string;
  totalMin: number;
  lessonsCount: number;
  lessons: string | null;
  completed: boolean;
};

type StudyCourse = {
  id: number;
  title: string;
  platform: string;
  totalLessons: number;
  totalDurationMin: number;
  totalSessions: number;
  daysOfWeek: string;
  targetDurationMin: number;
  startDate: string;
  endDate: string;
};

function parseLessons(raw: string | null | undefined): StudyLesson[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    return [];
  }
  return [];
}

function formatDateDisplay(dateStr: string | null | undefined, fallbackIso: string): string {
  const clean = dateStr || fallbackIso.split("T")[0];
  const [y, m, d] = clean.split("-");
  if (!y || !m || !d) return clean;
  return `${d}/${m}/${y}`;
}

function formatDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function EstudioPage() {
  const [course, setCourse] = useState<StudyCourse | null>(null);
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "COMPLETED">("ALL");
  const [expandedSessions, setExpandedSessions] = useState<Record<number, boolean>>({});

  // Form Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<StudyTask | undefined>(undefined);

  // Form fields
  const [sessionNumber, setSessionNumber] = useState("");
  const [date, setDate] = useState(() =>
    new Date().toLocaleDateString("en-CA", {
      timeZone: "America/Argentina/Buenos_Aires",
    })
  );
  const [dayOfWeek, setDayOfWeek] = useState("Jueves");
  const [subject, setSubject] = useState("");
  const [totalMin, setTotalMin] = useState("90");
  const [lessonsList, setLessonsList] = useState<StudyLesson[]>([]);
  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [newLessonMin, setNewLessonMin] = useState("10");

  const todayStr = useMemo(
    () =>
      new Date().toLocaleDateString("en-CA", {
        timeZone: "America/Argentina/Buenos_Aires",
      }),
    []
  );

  const fetchStudyData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/estudio");
      const data = await res.json();
      if (Array.isArray(data)) {
        setTasks(data);
      } else {
        setCourse(data.course || null);
        setTasks(data.tasks || []);
        // Expandir automáticamente la jornada de hoy o la primera pendiente
        const list: StudyTask[] = data.tasks || [];
        const todaySession =
          list.find((t) => (t.dateStr || t.date.split("T")[0]) === todayStr) ||
          list.find((t) => !t.completed);
        if (todaySession) {
          setExpandedSessions((prev) =>
            Object.keys(prev).length === 0 ? { [todaySession.id]: true } : prev
          );
        }
      }
    } catch {
      toast.error("Error al cargar el plan de estudio");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudyData();
  }, []);

  // Cálculos de progreso general
  const stats = useMemo(() => {
    const totalSessions = tasks.length || course?.totalSessions || 39;
    const completedSessions = tasks.filter((t) => t.completed).length;

    let totalLessons = 0;
    let completedLessons = 0;
    let totalMin = 0;
    let completedMin = 0;

    tasks.forEach((t) => {
      const parsed = parseLessons(t.lessons);
      if (parsed.length > 0) {
        parsed.forEach((l) => {
          totalLessons += 1;
          const m = Number(l.min) || 0;
          totalMin += m;
          if (t.completed || l.completed) {
            completedLessons += 1;
            completedMin += m;
          }
        });
      } else {
        const count = t.lessonsCount || 1;
        const m = t.totalMin || 0;
        totalLessons += count;
        totalMin += m;
        if (t.completed) {
          completedLessons += count;
          completedMin += m;
        }
      }
    });

    if (totalLessons === 0 && course) {
      totalLessons = course.totalLessons;
      totalMin = course.totalDurationMin;
    }

    const progressPct =
      totalLessons > 0
        ? Math.round((completedLessons / totalLessons) * 100)
        : totalSessions > 0
          ? Math.round((completedSessions / totalSessions) * 100)
          : 0;

    return {
      totalSessions,
      completedSessions,
      totalLessons,
      completedLessons,
      totalMin,
      completedMin,
      progressPct,
    };
  }, [tasks, course]);

  const filteredTasks = useMemo(() => {
    if (filter === "PENDING") return tasks.filter((t) => !t.completed);
    if (filter === "COMPLETED") return tasks.filter((t) => t.completed);
    return tasks;
  }, [tasks, filter]);

  const openNewModal = () => {
    setTaskToEdit(undefined);
    setSessionNumber(String(tasks.length + 1));
    setDate(todayStr);
    setDayOfWeek("Jueves");
    setSubject("");
    setTotalMin("90");
    setLessonsList([]);
    setNewLessonTitle("");
    setNewLessonMin("10");
    setIsModalOpen(true);
  };

  const openEditModal = (t: StudyTask) => {
    setTaskToEdit(t);
    setSessionNumber(t.sessionNumber ? String(t.sessionNumber) : "");
    setDate(t.dateStr || t.date.split("T")[0]);
    setDayOfWeek(t.dayOfWeek || "Jueves");
    setSubject(t.subject);
    setTotalMin(String(t.totalMin || 90));
    setLessonsList(parseLessons(t.lessons));
    setNewLessonTitle("");
    setNewLessonMin("10");
    setIsModalOpen(true);
  };

  const handleAddLessonInModal = () => {
    if (!newLessonTitle.trim()) return;
    const nextId =
      lessonsList.length > 0
        ? Math.max(...lessonsList.map((l) => l.id)) + 1
        : 1;
    const nextLessons = [
      ...lessonsList,
      {
        id: nextId,
        title: newLessonTitle.trim(),
        min: parseInt(newLessonMin || "10", 10) || 10,
        completed: false,
      },
    ];
    setLessonsList(nextLessons);
    setTotalMin(
      String(nextLessons.reduce((acc, l) => acc + (Number(l.min) || 0), 0))
    );
    setNewLessonTitle("");
    setNewLessonMin("10");
  };

  const handleRemoveLessonInModal = (id: number) => {
    const nextLessons = lessonsList.filter((l) => l.id !== id);
    setLessonsList(nextLessons);
    if (nextLessons.length > 0) {
      setTotalMin(
        String(nextLessons.reduce((acc, l) => acc + (Number(l.min) || 0), 0))
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !date) return;

    try {
      const payload = {
        id: taskToEdit?.id,
        sessionNumber: sessionNumber ? parseInt(sessionNumber, 10) : null,
        dateStr: date,
        dayOfWeek,
        subject,
        totalMin: parseInt(totalMin || "90", 10) || 90,
        lessons: lessonsList,
        completed: taskToEdit?.completed ?? false,
      };

      const res = await fetch("/api/estudio", {
        method: taskToEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error();
      toast.success(
        taskToEdit ? "Jornada actualizada" : "Jornada de estudio creada"
      );
      setIsModalOpen(false);
      fetchStudyData();
    } catch {
      toast.error("Error al guardar la jornada de estudio");
    }
  };

  const toggleTask = async (task: StudyTask) => {
    const newCompleted = !task.completed;
    const currentLessons = parseLessons(task.lessons);
    const updatedLessons = currentLessons.map((l) => ({
      ...l,
      completed: newCompleted,
    }));

    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? {
              ...t,
              completed: newCompleted,
              lessons: JSON.stringify(updatedLessons),
            }
          : t
      )
    );

    try {
      const res = await fetch("/api/estudio", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: task.id, completed: newCompleted }),
      });
      if (!res.ok) throw new Error();
      toast.success(
        newCompleted
          ? `¡Jornada ${task.sessionNumber ? `#${task.sessionNumber}` : ""} completada!`
          : "Jornada marcada como pendiente"
      );
    } catch {
      toast.error("Error al actualizar estado");
      fetchStudyData();
    }
  };

  const toggleLesson = async (task: StudyTask, lessonId: number) => {
    const currentLessons = parseLessons(task.lessons);
    const updatedLessons = currentLessons.map((l) =>
      l.id === lessonId ? { ...l, completed: !l.completed } : l
    );
    const allCompleted =
      updatedLessons.length > 0 &&
      updatedLessons.every((l) => Boolean(l.completed));

    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? {
              ...t,
              completed: allCompleted,
              lessons: JSON.stringify(updatedLessons),
            }
          : t
      )
    );

    try {
      const res = await fetch("/api/estudio", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: task.id, toggleLessonId: lessonId }),
      });
      if (!res.ok) throw new Error();
    } catch {
      toast.error("Error al sincronizar la clase");
      fetchStudyData();
    }
  };

  const deleteTask = async (id: number) => {
    if (!confirm("¿Eliminar esta jornada de estudio?")) return;
    setTasks((prev) => prev.filter((t) => t.id !== id));
    await fetch(`/api/estudio?id=${id}`, { method: "DELETE" });
    toast.success("Jornada eliminada");
  };

  if (loading && tasks.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-28">
      {/* CABECERA */}
      <header className="pt-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black tracking-tight">📚 Plan de Estudio</h1>
          <p className="text-xs text-gray-400">
            Seguimiento de curso, clases y jornadas programadas
          </p>
        </div>
        <button
          onClick={openNewModal}
          className="bg-white text-black font-black text-xs px-3.5 py-2 rounded-full shadow active:scale-95 transition-transform"
        >
          + Planificar
        </button>
      </header>

      {/* PANEL SUPERIOR: CURSO + BARRA DE PROGRESO */}
      <section className="bg-gradient-to-br from-blue-950/40 via-card to-black rounded-3xl p-5 border border-blue-500/25 shadow-lg space-y-4 relative overflow-hidden">
        <div className="absolute -top-8 -right-8 w-36 h-36 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex justify-between items-start gap-3 relative z-10">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                {course?.platform || "Udemy"}
              </span>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/25">
                🗓️ {course?.daysOfWeek?.replace(",", " y ") || "Martes y Jueves"} •{" "}
                {course?.targetDurationMin || 90} min/jornada
              </span>
            </div>
            <h2 className="text-lg font-black text-white leading-snug">
              {course?.title || "Full Stack JavaScript Developer en Español"}
            </h2>
            {course && (
              <p className="text-[11px] text-gray-400 mt-0.5">
                Inicio: {formatDateDisplay(course.startDate, course.startDate)} • Fin
                estimado: {formatDateDisplay(course.endDate, course.endDate)}
              </p>
            )}
          </div>

          <div className="text-right shrink-0">
            <span
              role="status"
              aria-live="polite"
              className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-positive"
            >
              {stats.progressPct}%
            </span>
            <p className="text-[10px] text-gray-400 uppercase font-bold">
              Completado
            </p>
          </div>
        </div>

        {/* BARRA DE PROGRESO ACCESIBLE (<progress>) */}
        <div className="space-y-1.5 relative z-10">
          <div className="flex justify-between items-center text-xs">
            <label
              id="study-progress-label"
              htmlFor="study-course-progress"
              className="font-bold text-gray-300"
            >
              Progreso General del Curso
            </label>
            <span className="text-gray-400 font-semibold">
              {stats.completedLessons} de {stats.totalLessons} clases
            </span>
          </div>
          <progress
            id="study-course-progress"
            aria-labelledby="study-progress-label"
            className="lifeos-progress w-full h-3.5 block"
            value={stats.completedLessons}
            max={Math.max(1, stats.totalLessons)}
          />
        </div>

        {/* MÉTRICAS DEL CURSO */}
        <div className="grid grid-cols-3 gap-2 pt-1 relative z-10">
          <div className="bg-black/60 border border-white/10 rounded-2xl p-2.5 text-center">
            <p className="text-[10px] text-gray-400 uppercase font-bold">Jornadas</p>
            <p className="text-sm font-black text-white mt-0.5">
              {stats.completedSessions}
              <span className="text-xs text-gray-500 font-normal">
                /{stats.totalSessions}
              </span>
            </p>
          </div>
          <div className="bg-black/60 border border-white/10 rounded-2xl p-2.5 text-center">
            <p className="text-[10px] text-gray-400 uppercase font-bold">Clases</p>
            <p className="text-sm font-black text-cyan-400 mt-0.5">
              {stats.completedLessons}
              <span className="text-xs text-gray-500 font-normal">
                /{stats.totalLessons}
              </span>
            </p>
          </div>
          <div className="bg-black/60 border border-white/10 rounded-2xl p-2.5 text-center">
            <p className="text-[10px] text-gray-400 uppercase font-bold">Tiempo</p>
            <p className="text-sm font-black text-positive mt-0.5">
              {formatDuration(stats.completedMin)}
              <span className="text-[10px] text-gray-500 font-normal block">
                de {formatDuration(stats.totalMin)}
              </span>
            </p>
          </div>
        </div>
      </section>

      {/* FILTROS RÁPIDOS */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => setFilter("ALL")}
          className={`py-2 px-3 rounded-xl text-xs font-black border transition-all ${
            filter === "ALL"
              ? "bg-white text-black border-white"
              : "bg-card text-gray-400 border-white/10"
          }`}
        >
          Todas ({tasks.length})
        </button>
        <button
          onClick={() => setFilter("PENDING")}
          className={`py-2 px-3 rounded-xl text-xs font-black border transition-all ${
            filter === "PENDING"
              ? "bg-cyan-400 text-black border-cyan-400"
              : "bg-card text-gray-400 border-white/10"
          }`}
        >
          Pendientes ({tasks.length - stats.completedSessions})
        </button>
        <button
          onClick={() => setFilter("COMPLETED")}
          className={`py-2 px-3 rounded-xl text-xs font-black border transition-all ${
            filter === "COMPLETED"
              ? "bg-positive text-black border-positive"
              : "bg-card text-gray-400 border-white/10"
          }`}
        >
          Completadas ({stats.completedSessions})
        </button>
      </div>

      {/* LISTA DE JORNADAS DE ESTUDIO */}
      <section className="space-y-3">
        {filteredTasks.map((task) => {
          const lessons = parseLessons(task.lessons);
          const doneLessonsCount = lessons.filter(
            (l) => task.completed || l.completed
          ).length;
          const isExpanded = Boolean(expandedSessions[task.id]);
          const taskDateStr = task.dateStr || task.date.split("T")[0];
          const isToday = taskDateStr === todayStr;

          return (
            <div
              key={task.id}
              className={`bg-card rounded-2xl border p-4 space-y-3 transition-all ${
                task.completed
                  ? "border-positive/50 bg-positive/5"
                  : isToday
                    ? "border-cyan-400/70 shadow-[0_0_20px_rgba(34,211,238,0.12)]"
                    : "border-white/10"
              }`}
            >
              {/* Encabezado de la Jornada */}
              <div className="flex justify-between items-start gap-3">
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {task.sessionNumber && (
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        Jornada #{task.sessionNumber}
                      </span>
                    )}
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/10 text-gray-300">
                      📅 {task.dayOfWeek ? `${task.dayOfWeek} ` : ""}
                      {formatDateDisplay(task.dateStr, task.date)}
                    </span>
                    {isToday && (
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-cyan-400 text-black">
                        HOY
                      </span>
                    )}
                  </div>

                  <h3
                    className={`font-black text-sm leading-snug ${
                      task.completed ? "line-through text-gray-400" : "text-white"
                    }`}
                  >
                    {task.subject}
                  </h3>

                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    <span className="text-[11px] text-amber-300 font-bold">
                      ⏱️ {task.totalMin || 90} min
                    </span>
                    {lessons.length > 0 && (
                      <span className="text-[11px] text-cyan-300 font-bold">
                        🎬 {doneLessonsCount}/{lessons.length} clases
                      </span>
                    )}
                  </div>
                </div>

                {/* Botón Completar Jornada */}
                <button
                  onClick={() => toggleTask(task)}
                  title={
                    task.completed
                      ? "Marcar jornada como pendiente"
                      : "Marcar jornada como completada"
                  }
                  className={`w-9 h-9 shrink-0 flex items-center justify-center rounded-xl border-2 font-black transition-all active:scale-95 ${
                    task.completed
                      ? "bg-positive border-positive text-black shadow-[0_0_12px_rgba(34,197,94,0.35)]"
                      : "border-white/20 text-white hover:border-positive/60"
                  }`}
                >
                  ✓
                </button>
              </div>

              {/* Desplegable de Clases de la Jornada */}
              {lessons.length > 0 && (
                <div className="bg-black/50 rounded-xl border border-white/10 overflow-hidden">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedSessions((prev) => ({
                        ...prev,
                        [task.id]: !prev[task.id],
                      }))
                    }
                    className="w-full px-3 py-2 text-left text-xs font-bold text-cyan-300 flex justify-between items-center hover:bg-white/5 transition-colors"
                  >
                    <span>
                      📋 Ver Clases de la Jornada ({doneLessonsCount}/{lessons.length})
                    </span>
                    <span>{isExpanded ? "▲" : "▼"}</span>
                  </button>

                  {isExpanded && (
                    <div className="p-2.5 pt-1 space-y-1.5 border-t border-white/10">
                      {lessons.map((lesson) => {
                        const isLessonDone = Boolean(
                          task.completed || lesson.completed
                        );
                        return (
                          <label
                            key={lesson.id}
                            onClick={() => toggleLesson(task, lesson.id)}
                            className={`flex items-center justify-between gap-2.5 p-2 rounded-lg cursor-pointer transition-colors border ${
                              isLessonDone
                                ? "bg-positive/10 border-positive/30 text-gray-400 line-through"
                                : "bg-black/40 border-white/5 text-gray-200 hover:bg-white/5"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <input
                                type="checkbox"
                                checked={isLessonDone}
                                onChange={() => {}}
                                className="accent-green-500 rounded w-4 h-4 shrink-0"
                              />
                              <span className="text-xs leading-snug">
                                <strong className="text-cyan-400 font-mono mr-1">
                                  #{lesson.id}
                                </strong>
                                {lesson.title}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono font-bold text-gray-400 bg-white/5 px-2 py-0.5 rounded shrink-0">
                              {lesson.min} min
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Acciones Editar / Borrar */}
              <div className="flex justify-end gap-2 pt-1 border-t border-white/5">
                <button
                  onClick={() => openEditModal(task)}
                  className="text-[11px] text-gray-400 hover:text-white px-2.5 py-1 rounded-lg bg-black/40"
                >
                  ✏️ Editar
                </button>
                <button
                  onClick={() => deleteTask(task.id)}
                  className="text-[11px] text-negative hover:text-red-400 px-2.5 py-1 rounded-lg bg-black/40"
                >
                  🗑️ Borrar
                </button>
              </div>
            </div>
          );
        })}

        {filteredTasks.length === 0 && (
          <div className="text-center py-8 bg-card rounded-2xl border border-dashed border-white/10">
            <p className="text-sm text-gray-400">
              No hay jornadas de estudio para este filtro.
            </p>
          </div>
        )}
      </section>

      {/* MODAL CREAR / EDITAR JORNADA DE ESTUDIO */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          taskToEdit ? "Editar Jornada de Estudio" : "Planificar Jornada de Estudio"
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-gray-400">N° Jornada</label>
              <input
                type="number"
                min="1"
                value={sessionNumber}
                onChange={(e) => setSessionNumber(e.target.value)}
                placeholder="Ej. 40"
                className="w-full bg-black border border-white/20 rounded-lg p-2 mt-1 text-xs"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400">Fecha</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full bg-black border border-white/20 rounded-lg p-2 mt-1 text-xs"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400">Duración (min)</label>
              <input
                type="number"
                min="1"
                value={totalMin}
                onChange={(e) => setTotalMin(e.target.value)}
                className="w-full bg-black border border-white/20 rounded-lg p-2 mt-1 text-xs font-bold"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400">Título / Tema de la Jornada</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Ej. Jornada #1: Introducción a HTML"
              required
              className="w-full bg-black border border-white/20 rounded-lg p-2 mt-1 text-sm"
            />
          </div>

          {/* Clases de la Jornada */}
          <div className="bg-black/60 border border-white/10 rounded-xl p-3 space-y-2.5">
            <label className="text-xs font-bold text-cyan-300 block">
              🎬 Clases incluidas en esta jornada ({lessonsList.length})
            </label>

            {lessonsList.length > 0 && (
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {lessonsList.map((l) => (
                  <div
                    key={l.id}
                    className="flex items-center justify-between gap-2 bg-black border border-white/10 rounded-lg px-2.5 py-1.5 text-xs"
                  >
                    <span className="truncate">
                      <strong className="text-cyan-400 mr-1">#{l.id}</strong>
                      {l.title} ({l.min} min)
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveLessonInModal(l.id)}
                      className="text-red-400 text-[10px] px-1.5 py-0.5 bg-red-500/15 rounded shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-4 gap-2">
              <input
                type="text"
                value={newLessonTitle}
                onChange={(e) => setNewLessonTitle(e.target.value)}
                placeholder="Título de la clase..."
                className="col-span-2 bg-black border border-white/20 rounded-lg p-2 text-xs"
              />
              <input
                type="number"
                min="1"
                value={newLessonMin}
                onChange={(e) => setNewLessonMin(e.target.value)}
                placeholder="Min"
                className="bg-black border border-white/20 rounded-lg p-2 text-xs"
              />
              <button
                type="button"
                onClick={handleAddLessonInModal}
                className="bg-cyan-500 text-black font-black rounded-lg text-xs"
              >
                + Clase
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-white text-black font-black rounded-xl p-3 text-sm"
          >
            {taskToEdit ? "Guardar Cambios" : "Crear Jornada"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
