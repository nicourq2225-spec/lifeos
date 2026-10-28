"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/Modal";
import { toast } from "sonner";

type Punishment = {
  id: number;
  name: string;
  unit: string | null;
  defaultQty: number;
};

type DayRule = {
  id: number;
  name: string;
  description: string;
  reason: string;
  applyToAllDays: boolean;
  assignedDays: string;
  active: boolean;
};

type RewardItem = {
  id: number;
  name: string;
  description: string | null;
  costPoints: number;
};

type RewardRedemption = {
  id: number;
  rewardItemId: number | null;
  rewardName: string;
  costPoints: number;
  dateStr: string;
  weekStartStr: string;
};

type AgendaEvent = {
  id: number;
  dayNumber: number;
  startTime: string;
  endTime: string;
  title: string;
  type: string;
  instructions: string | null;
  rewardPoints: number;
  punishmentId: number | null;
  punishment: Punishment | null;
  punishmentQty: number | null;
};

type AgendaEventLog = {
  id: number;
  eventId: number;
  event?: AgendaEvent;
  dateStr: string;
  weekStartStr: string;
  cycleDay: number;
  status: "COMPLETADO" | "PROCRASTINADO";
  pointsAwarded: number;
  punishmentName: string | null;
  punishmentUnit: string | null;
  punishmentQty: number | null;
  punishmentSettled: boolean;
};

type AgendaBlockTemplate = {
  id: number;
  title: string;
  type: string;
  instructions: string | null;
  rewardPoints: number;
  punishmentId: number | null;
  punishment: Punishment | null;
  punishmentQty: number | null;
};

type PointsSummary = {
  weeklyEarnedPoints: number;
  weeklySpentPoints: number;
  weeklyAvailablePoints: number;
  weekStartStr: string;
  weekEndStr: string;
  currentCycleWeek: number;
  weekStartCycleDay: number;
  weekEndCycleDay: number;
};

function parseInstructions(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch {
    return raw
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

export default function AgendaPage() {
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [rules, setRules] = useState<DayRule[]>([]);
  const [punishments, setPunishments] = useState<Punishment[]>([]);
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [templates, setTemplates] = useState<AgendaBlockTemplate[]>([]);
  const [cycleLogs, setCycleLogs] = useState<AgendaEventLog[]>([]);
  const [weekLogs, setWeekLogs] = useState<AgendaEventLog[]>([]);
  const [pendingPunishments, setPendingPunishments] = useState<AgendaEventLog[]>([]);
  const [weekRedemptions, setWeekRedemptions] = useState<RewardRedemption[]>([]);
  const [pointsSummary, setPointsSummary] = useState<PointsSummary>({
    weeklyEarnedPoints: 0,
    weeklySpentPoints: 0,
    weeklyAvailablePoints: 0,
    weekStartStr: "",
    weekEndStr: "",
    currentCycleWeek: 1,
    weekStartCycleDay: 1,
    weekEndCycleDay: 7,
  });

  const [cycleStartDate, setCycleStartDate] = useState("2026-01-19");
  const [todayStr, setTodayStr] = useState("");
  const [loading, setLoading] = useState(true);

  // Vista de día seleccionado (1..21)
  const [selectedViewDay, setSelectedViewDay] = useState(1);
  const [currentCycleDay, setCurrentCycleDay] = useState(1);

  // Control de instrucciones desplegadas y pasos marcados en cada tarjeta de evento
  const [expandedEvents, setExpandedEvents] = useState<Record<number, boolean>>({});
  const [checkedSteps, setCheckedSteps] = useState<Record<string, boolean>>({});

  // Modal de Ciclo
  const [isCycleModalOpen, setIsCycleModalOpen] = useState(false);

  // Modal de Evento (Crear/Editar)
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<AgendaEvent | undefined>(undefined);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState("");
  const [dayNumber, setDayNumber] = useState("1");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [title, setTitle] = useState("");
  const [type, setType] = useState("obligacion");
  const [rewardPoints, setRewardPoints] = useState("0");
  const [punishmentId, setPunishmentId] = useState<string>("none");
  const [punishmentQty, setPunishmentQty] = useState("1");
  const [instructionsList, setInstructionsList] = useState<string[]>([]);
  const [newInstructionStep, setNewInstructionStep] = useState("");
  const [isSavingEvent, setIsSavingEvent] = useState(false);

  // Modal de Plantillas de Eventos (CRUD)
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);
  const [templateToEdit, setTemplateToEdit] = useState<AgendaBlockTemplate | undefined>(
    undefined
  );
  const [tplTitle, setTplTitle] = useState("");
  const [tplType, setTplType] = useState("obligacion");
  const [tplRewardPoints, setTplRewardPoints] = useState("0");
  const [tplPunishmentId, setTplPunishmentId] = useState<string>("none");
  const [tplPunishmentQty, setTplPunishmentQty] = useState("1");
  const [tplInstructionsList, setTplInstructionsList] = useState<string[]>([]);
  const [newTplInstructionStep, setNewTplInstructionStep] = useState("");
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  // Modal de Reglas del Día (CRUD)
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [ruleToEdit, setRuleToEdit] = useState<DayRule | undefined>(undefined);
  const [ruleName, setRuleName] = useState("");
  const [ruleDescription, setRuleDescription] = useState("");
  const [ruleReason, setRuleReason] = useState("");
  const [ruleApplyAll, setRuleApplyAll] = useState(true);
  const [ruleSelectedDays, setRuleSelectedDays] = useState<number[]>(
    Array.from({ length: 21 }, (_, i) => i + 1)
  );
  const [isSavingRule, setIsSavingRule] = useState(false);

  // Modal de Catálogo de Castigos (CRUD)
  const [isPunishmentsModalOpen, setIsPunishmentsModalOpen] = useState(false);
  const [punishmentToEdit, setPunishmentToEdit] = useState<Punishment | undefined>(
    undefined
  );
  const [punishmentName, setPunishmentName] = useState("");
  const [punishmentUnit, setPunishmentUnit] = useState("repeticiones");
  const [punishmentDefaultQty, setPunishmentDefaultQty] = useState("100");
  const [isSavingPunishment, setIsSavingPunishment] = useState(false);

  // Modal de Tienda / Premios Canjeables (CRUD + Canje)
  const [isRewardsModalOpen, setIsRewardsModalOpen] = useState(false);
  const [rewardToEdit, setRewardToEdit] = useState<RewardItem | undefined>(undefined);
  const [rewardName, setRewardName] = useState("");
  const [rewardDescription, setRewardDescription] = useState("");
  const [rewardCost, setRewardCost] = useState("30");
  const [isSavingReward, setIsSavingReward] = useState(false);

  const getLocalTodayStr = () =>
    new Date().toLocaleDateString("en-CA", {
      timeZone: "America/Argentina/Buenos_Aires",
    });

  const fetchData = async (preserveSelectedDay = false) => {
    try {
      setLoading(true);
      const localDate = getLocalTodayStr();
      const res = await fetch(`/api/agenda?date=${localDate}`);
      if (!res.ok) throw new Error("Error cargando agenda");
      const data = await res.json();

      setEvents(data.events || []);
      setRules(data.rules || []);
      setPunishments(data.punishments || []);
      setRewards(data.rewards || []);
      setTemplates(data.templates || []);
      setCycleLogs(data.cycleLogs || data.weekLogs || []);
      setWeekLogs(data.weekLogs || []);
      setPendingPunishments(data.pendingPunishments || []);
      setWeekRedemptions(data.weekRedemptions || []);

      if (data.pointsSummary) {
        setPointsSummary(data.pointsSummary);
      }

      if (data.cycleInfo) {
        setCycleStartDate(data.cycleInfo.cycleStartDateStr);
        setTodayStr(data.cycleInfo.todayStr);
        setCurrentCycleDay(data.cycleInfo.currentCycleDay);
        if (!preserveSelectedDay) {
          setSelectedViewDay(data.cycleInfo.currentCycleDay);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("No se pudo sincronizar la agenda");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(false);
  }, []);

  // --- CICLO ---
  const handleUpdateCycle = async () => {
    if (!cycleStartDate) return;
    try {
      const res = await fetch("/api/agenda/cycle", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cycleStartDate }),
      });
      if (!res.ok) throw new Error();
      toast.success("Fecha de inicio del ciclo actualizada");
      setIsCycleModalOpen(false);
      fetchData(false);
    } catch {
      toast.error("Error al actualizar el ciclo");
    }
  };

  // --- PLANTILLAS EN FORMULARIO DE EVENTO ---
  const handleApplyTemplate = (templateIdStr: string) => {
    setSelectedTemplateKey(templateIdStr);
    const tpl = templates.find((t) => String(t.id) === templateIdStr);
    if (!tpl) return;

    setTitle(tpl.title);
    setType(tpl.type);
    setInstructionsList(parseInstructions(tpl.instructions));
    setRewardPoints(String(tpl.rewardPoints || 0));

    if (tpl.punishmentId) {
      setPunishmentId(String(tpl.punishmentId));
      setPunishmentQty(String(tpl.punishmentQty || tpl.punishment?.defaultQty || 1));
    } else {
      setPunishmentId("none");
      setPunishmentQty("1");
    }
    toast.success(`Plantilla "${tpl.title}" cargada`);
  };

  // --- CRUD DE PLANTILLAS DE EVENTOS ---
  const openNewTemplateForm = () => {
    setTemplateToEdit(undefined);
    setTplTitle("");
    setTplType("obligacion");
    setTplRewardPoints("0");
    setTplPunishmentId("none");
    setTplPunishmentQty("1");
    setTplInstructionsList([]);
    setNewTplInstructionStep("");
  };

  const openEditTemplateForm = (tpl: AgendaBlockTemplate) => {
    setTemplateToEdit(tpl);
    setTplTitle(tpl.title);
    setTplType(tpl.type || "obligacion");
    setTplRewardPoints(String(tpl.rewardPoints || 0));
    setTplPunishmentId(tpl.punishmentId ? String(tpl.punishmentId) : "none");
    setTplPunishmentQty(String(tpl.punishmentQty || tpl.punishment?.defaultQty || 1));
    setTplInstructionsList(parseInstructions(tpl.instructions));
    setNewTplInstructionStep("");
  };

  const handleAddTplInstructionStep = () => {
    if (!newTplInstructionStep.trim()) return;
    setTplInstructionsList((prev) => [...prev, newTplInstructionStep.trim()]);
    setNewTplInstructionStep("");
  };

  const handleUpdateTplInstructionStep = (index: number, value: string) => {
    setTplInstructionsList((prev) => prev.map((s, i) => (i === index ? value : s)));
  };

  const handleRemoveTplInstructionStep = (index: number) => {
    setTplInstructionsList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMoveTplInstructionStep = (index: number, direction: "up" | "down") => {
    setTplInstructionsList((prev) => {
      const next = [...prev];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= next.length) return prev;
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      return next;
    });
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tplTitle.trim()) return;

    const finalInstructions = [...tplInstructionsList];
    if (newTplInstructionStep.trim()) {
      finalInstructions.push(newTplInstructionStep.trim());
    }

    setIsSavingTemplate(true);
    try {
      const res = await fetch("/api/agenda/templates", {
        method: templateToEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: templateToEdit?.id,
          title: tplTitle.trim(),
          type: tplType,
          instructions: finalInstructions,
          rewardPoints: parseInt(tplRewardPoints || "0", 10) || 0,
          punishmentId: tplPunishmentId === "none" ? null : parseInt(tplPunishmentId, 10),
          punishmentQty:
            tplPunishmentId === "none"
              ? null
              : parseInt(tplPunishmentQty || "1", 10) || 1,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(
        templateToEdit ? "Plantilla actualizada" : "Nueva plantilla guardada"
      );
      openNewTemplateForm();
      fetchData(true);
    } catch {
      toast.error("Error al guardar la plantilla");
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (id: number) => {
    if (!confirm("¿Eliminar esta plantilla del catálogo?")) return;
    try {
      const res = await fetch(`/api/agenda/templates?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      toast.success("Plantilla eliminada");
      if (templateToEdit?.id === id) openNewTemplateForm();
      fetchData(true);
    } catch {
      toast.error("Error al eliminar la plantilla");
    }
  };

  // --- CRUD EVENTOS ---
  const openNewEventModal = () => {
    setEventToEdit(undefined);
    setSelectedTemplateKey("");
    setDayNumber(selectedViewDay.toString());
    setTitle("");
    setStartTime("");
    setEndTime("");
    setType("obligacion");
    setRewardPoints("0");
    setPunishmentId("none");
    setPunishmentQty("1");
    setInstructionsList([]);
    setNewInstructionStep("");
    setIsEventModalOpen(true);
  };

  const openEditEventModal = (ev: AgendaEvent) => {
    setEventToEdit(ev);
    setSelectedTemplateKey("");
    setDayNumber(ev.dayNumber.toString());
    setTitle(ev.title);
    setStartTime(ev.startTime);
    setEndTime(ev.endTime);
    setType(ev.type);
    setRewardPoints(String(ev.rewardPoints || 0));
    setPunishmentId(ev.punishmentId ? String(ev.punishmentId) : "none");
    setPunishmentQty(String(ev.punishmentQty || ev.punishment?.defaultQty || 1));
    setInstructionsList(parseInstructions(ev.instructions));
    setNewInstructionStep("");
    setIsEventModalOpen(true);
  };

  const handleAddInstructionStep = () => {
    if (!newInstructionStep.trim()) return;
    setInstructionsList((prev) => [...prev, newInstructionStep.trim()]);
    setNewInstructionStep("");
  };

  const handleUpdateInstructionStep = (index: number, value: string) => {
    setInstructionsList((prev) => prev.map((item, i) => (i === index ? value : item)));
  };

  const handleRemoveInstructionStep = (index: number) => {
    setInstructionsList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMoveInstructionStep = (index: number, direction: "up" | "down") => {
    setInstructionsList((prev) => {
      const copy = [...prev];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= copy.length) return prev;
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  const handleSubmitEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startTime || !endTime || !title) return;

    // Si quedó algún paso escrito en el input de nueva instrucción, lo agregamos
    const finalInstructions = newInstructionStep.trim()
      ? [...instructionsList, newInstructionStep.trim()]
      : instructionsList;

    setIsSavingEvent(true);
    try {
      const payload = {
        id: eventToEdit?.id,
        dayNumber,
        startTime,
        endTime,
        title,
        type,
        instructions: finalInstructions,
        rewardPoints: parseInt(rewardPoints || "0", 10) || 0,
        punishmentId: punishmentId === "none" ? null : parseInt(punishmentId, 10),
        punishmentQty:
          punishmentId === "none" ? null : parseInt(punishmentQty || "1", 10) || 1,
      };

      const res = await fetch("/api/agenda", {
        method: eventToEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error();
      toast.success(eventToEdit ? "Evento actualizado" : "Evento creado");
      setIsEventModalOpen(false);
      fetchData(true);
    } catch {
      toast.error("Error al guardar el evento");
    } finally {
      setIsSavingEvent(false);
    }
  };

  const handleDeleteEvent = async (id: number) => {
    if (!confirm("¿Borrar este bloque de la agenda?")) return;
    try {
      const res = await fetch(`/api/agenda?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Evento eliminado");
      fetchData(true);
    } catch {
      toast.error("Error al eliminar evento");
    }
  };

  // --- COMPLETAR / PROCRASTINAR EVENTO ---
  const handleMarkEventStatus = async (
    ev: AgendaEvent,
    status: "COMPLETADO" | "PROCRASTINADO"
  ) => {
    try {
      const res = await fetch("/api/agenda/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: ev.id,
          status,
          dateStr: todayStr,
        }),
      });
      if (!res.ok) throw new Error();

      if (status === "COMPLETADO") {
        const eventWeek = Math.floor((ev.dayNumber - 1) / 7) + 1;
        const isCurrentWeek = eventWeek === pointsSummary.currentCycleWeek;
        toast.success(
          ev.rewardPoints > 0
            ? isCurrentWeek
              ? `¡Bloque completado! +${ev.rewardPoints} pts sumados a tu semana`
              : `¡Bloque del Día ${ev.dayNumber} marcado como completado en este ciclo!`
            : "¡Bloque marcado como completado!"
        );
      } else {
        if (ev.punishment) {
          toast.error(
            `Procrastinado: Se activó el castigo "${ev.punishment.name} (${ev.punishmentQty || ev.punishment.defaultQty} ${ev.punishment.unit || ""})"`
          );
        } else {
          toast.error("Bloque marcado como procrastinado");
        }
      }
      fetchData(true);
    } catch {
      toast.error("Error al registrar el estado del evento");
    }
  };

  const handleUndoEventLog = async (logId: number) => {
    try {
      const res = await fetch(`/api/agenda/logs?id=${logId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      toast.success("Registro del evento deshecho");
      fetchData(true);
    } catch {
      toast.error("No se pudo deshacer el registro");
    }
  };

  const handleSettlePunishment = async (logId: number) => {
    try {
      const res = await fetch("/api/agenda/logs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logId, punishmentSettled: true }),
      });
      if (!res.ok) throw new Error();
      toast.success("¡Castigo cumplido y saldado!");
      fetchData(true);
    } catch {
      toast.error("Error al saldar el castigo");
    }
  };

  // --- CRUD REGLAS DEL DÍA ---
  const openNewRuleForm = () => {
    setRuleToEdit(undefined);
    setRuleName("");
    setRuleDescription("");
    setRuleReason("");
    setRuleApplyAll(true);
    setRuleSelectedDays(Array.from({ length: 21 }, (_, i) => i + 1));
  };

  const openEditRuleForm = (rule: DayRule) => {
    setRuleToEdit(rule);
    setRuleName(rule.name);
    setRuleDescription(rule.description);
    setRuleReason(rule.reason);
    setRuleApplyAll(rule.applyToAllDays);
    const parsedDays = (rule.assignedDays || "")
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n) && n >= 1 && n <= 21);
    setRuleSelectedDays(
      parsedDays.length > 0 ? parsedDays : Array.from({ length: 21 }, (_, i) => i + 1)
    );
  };

  const toggleRuleDaySelection = (day: number) => {
    setRuleSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)
    );
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName.trim() || !ruleDescription.trim() || !ruleReason.trim()) return;

    setIsSavingRule(true);
    try {
      const res = await fetch("/api/agenda/rules", {
        method: ruleToEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: ruleToEdit?.id,
          name: ruleName.trim(),
          description: ruleDescription.trim(),
          reason: ruleReason.trim(),
          applyToAllDays: ruleApplyAll,
          assignedDays: ruleApplyAll
            ? "1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21"
            : ruleSelectedDays.join(","),
          active: true,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(ruleToEdit ? "Regla actualizada" : "Regla creada");
      openNewRuleForm();
      fetchData(true);
    } catch {
      toast.error("Error al guardar la regla");
    } finally {
      setIsSavingRule(false);
    }
  };

  const handleDeleteRule = async (id: number) => {
    if (!confirm("¿Eliminar esta regla del día?")) return;
    try {
      const res = await fetch(`/api/agenda/rules?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Regla eliminada");
      if (ruleToEdit?.id === id) openNewRuleForm();
      fetchData(true);
    } catch {
      toast.error("Error al eliminar la regla");
    }
  };

  // --- CRUD CASTIGOS ---
  const openNewPunishmentForm = () => {
    setPunishmentToEdit(undefined);
    setPunishmentName("");
    setPunishmentUnit("repeticiones");
    setPunishmentDefaultQty("100");
  };

  const openEditPunishmentForm = (p: Punishment) => {
    setPunishmentToEdit(p);
    setPunishmentName(p.name);
    setPunishmentUnit(p.unit || "");
    setPunishmentDefaultQty(String(p.defaultQty || 1));
  };

  const handleSavePunishment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!punishmentName.trim()) return;

    setIsSavingPunishment(true);
    try {
      const res = await fetch("/api/agenda/punishments", {
        method: punishmentToEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: punishmentToEdit?.id,
          name: punishmentName.trim(),
          unit: punishmentUnit.trim() || "vez",
          defaultQty: parseInt(punishmentDefaultQty || "1", 10) || 1,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(punishmentToEdit ? "Castigo actualizado" : "Castigo creado");
      openNewPunishmentForm();
      fetchData(true);
    } catch {
      toast.error("Error al guardar castigo");
    } finally {
      setIsSavingPunishment(false);
    }
  };

  const handleDeletePunishment = async (id: number) => {
    if (!confirm("¿Eliminar este castigo del catálogo?")) return;
    try {
      const res = await fetch(`/api/agenda/punishments?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      toast.success("Castigo eliminado");
      if (punishmentToEdit?.id === id) openNewPunishmentForm();
      fetchData(true);
    } catch {
      toast.error("Error al eliminar castigo");
    }
  };

  // --- CRUD PREMIOS Y CANJE ---
  const openNewRewardForm = () => {
    setRewardToEdit(undefined);
    setRewardName("");
    setRewardDescription("");
    setRewardCost("30");
  };

  const openEditRewardForm = (r: RewardItem) => {
    setRewardToEdit(r);
    setRewardName(r.name);
    setRewardDescription(r.description || "");
    setRewardCost(String(r.costPoints));
  };

  const handleSaveReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rewardName.trim()) return;

    setIsSavingReward(true);
    try {
      const res = await fetch("/api/agenda/rewards", {
        method: rewardToEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: rewardToEdit?.id,
          name: rewardName.trim(),
          description: rewardDescription.trim() || null,
          costPoints: parseInt(rewardCost || "10", 10) || 10,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(rewardToEdit ? "Premio actualizado" : "Premio agregado");
      openNewRewardForm();
      fetchData(true);
    } catch {
      toast.error("Error al guardar el premio");
    } finally {
      setIsSavingReward(false);
    }
  };

  const handleDeleteReward = async (id: number) => {
    if (!confirm("¿Eliminar este premio del catálogo?")) return;
    try {
      const res = await fetch(`/api/agenda/rewards?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      toast.success("Premio eliminado");
      if (rewardToEdit?.id === id) openNewRewardForm();
      fetchData(true);
    } catch {
      toast.error("Error al eliminar premio");
    }
  };

  const handleRedeemReward = async (reward: RewardItem) => {
    if (pointsSummary.weeklyAvailablePoints < reward.costPoints) {
      toast.error(
        `Te faltan ${reward.costPoints - pointsSummary.weeklyAvailablePoints} pts para canjear "${reward.name}"`
      );
      return;
    }
    if (
      !confirm(
        `¿Canjear "${reward.name}" por ${reward.costPoints} puntos de tu saldo semanal?`
      )
    )
      return;

    try {
      const res = await fetch("/api/agenda/rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REDEEM",
          rewardItemId: reward.id,
          dateStr: todayStr || getLocalTodayStr(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "No se pudo canjear el premio");
        return;
      }
      toast.success(`🎉 ¡Disfruta tu premio: "${reward.name}"!`);
      fetchData(true);
    } catch {
      toast.error("Error al procesar el canje");
    }
  };

  // Filtrar eventos y reglas para el día seleccionado en el navegador (selectedViewDay)
  const eventsForSelectedDay = events.filter((e) => e.dayNumber === selectedViewDay);
  const selectedDayWeek = Math.floor((selectedViewDay - 1) / 7) + 1;

  const rulesForSelectedDay = rules.filter((r) => {
    if (!r.active) return false;
    if (r.applyToAllDays) return true;
    const days = (r.assignedDays || "")
      .split(",")
      .map((s) => parseInt(s.trim(), 10));
    return days.includes(selectedViewDay);
  });

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

  if (loading && events.length === 0 && rules.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-28">
      {/* CABECERA Y ACCIONES RÁPIDAS */}
      <header className="pt-4 space-y-3">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black tracking-tight">Agenda 21 Días</h1>
            <p className="text-xs text-gray-400">
              Semana {pointsSummary.currentCycleWeek} del ciclo (Días{" "}
              {pointsSummary.weekStartCycleDay} al {pointsSummary.weekEndCycleDay})
            </p>
          </div>
          <button
            onClick={() => setIsCycleModalOpen(true)}
            className="text-xs text-gray-300 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full font-semibold transition-colors"
          >
            ⚙️ Día 1
          </button>
        </div>

        {/* BOTONERA DE CATÁLOGOS CRUD */}
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => {
              openNewTemplateForm();
              setIsTemplatesModalOpen(true);
            }}
            className="bg-card border border-white/10 hover:border-purple-500/40 rounded-xl p-2.5 text-xs font-bold flex flex-col items-center gap-1 active:scale-95 transition-all"
          >
            <span className="text-base">📋</span>
            <span>Plantillas ({templates.length})</span>
          </button>
          <button
            onClick={() => {
              openNewRuleForm();
              setIsRulesModalOpen(true);
            }}
            className="bg-card border border-white/10 hover:border-cyan-500/40 rounded-xl p-2.5 text-xs font-bold flex flex-col items-center gap-1 active:scale-95 transition-all"
          >
            <span className="text-base">📜</span>
            <span>Reglas ({rules.length})</span>
          </button>
          <button
            onClick={() => {
              openNewPunishmentForm();
              setIsPunishmentsModalOpen(true);
            }}
            className="bg-card border border-white/10 hover:border-red-500/40 rounded-xl p-2.5 text-xs font-bold flex flex-col items-center gap-1 active:scale-95 transition-all"
          >
            <span className="text-base">💀</span>
            <span>Castigos ({punishments.length})</span>
          </button>
          <button
            onClick={() => {
              openNewRewardForm();
              setIsRewardsModalOpen(true);
            }}
            className="bg-card border border-white/10 hover:border-yellow-500/40 rounded-xl p-2.5 text-xs font-bold flex flex-col items-center gap-1 active:scale-95 transition-all"
          >
            <span className="text-base">🎁</span>
            <span>Premios ({rewards.length})</span>
          </button>
        </div>
      </header>

      {/* PANEL DE PUNTOS DE LA SEMANA ACTUAL + ESTADO DEL DÍA */}
      <section className="bg-gradient-to-br from-card via-black to-card border border-white/10 rounded-3xl p-4 shadow-lg relative overflow-hidden">
        <div className="absolute -top-6 -right-6 w-32 h-32 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex justify-between items-center mb-3 relative z-10">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              Hoy: Día {currentCycleDay}/21 • Semana {pointsSummary.currentCycleWeek}
            </span>
          </div>
          <button
            onClick={() => {
              openNewRewardForm();
              setIsRewardsModalOpen(true);
            }}
            className="text-xs bg-yellow-500 text-black font-black px-3 py-1.5 rounded-xl shadow hover:bg-yellow-400 active:scale-95 transition-all"
          >
            🎁 Canjear Puntos
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 relative z-10">
          <div className="bg-black/60 border border-white/10 rounded-2xl p-3 text-center">
            <p className="text-[10px] text-gray-400 uppercase font-bold">Disponibles</p>
            <p className="text-2xl font-black text-yellow-400">
              {pointsSummary.weeklyAvailablePoints}
              <span className="text-xs font-normal text-gray-400 ml-0.5">pts</span>
            </p>
          </div>
          <div className="bg-black/60 border border-white/10 rounded-2xl p-3 text-center">
            <p className="text-[10px] text-gray-400 uppercase font-bold">Ganados Sem.</p>
            <p className="text-xl font-black text-positive">
              +{pointsSummary.weeklyEarnedPoints}
            </p>
          </div>
          <div className="bg-black/60 border border-white/10 rounded-2xl p-3 text-center">
            <p className="text-[10px] text-gray-400 uppercase font-bold">Canjeados</p>
            <p className="text-xl font-black text-purple-400">
              -{pointsSummary.weeklySpentPoints}
            </p>
          </div>
        </div>

        <p className="text-[11px] text-gray-400 mt-3 text-center">
          🔄 Los puntos rigen de Lunes a Domingo y se reinician a 0 cada Lunes (Días 1, 8 y 15).
        </p>
      </section>

      {/* ALERTA DE CASTIGOS PENDIENTES POR CUMPLIR */}
      {pendingPunishments.length > 0 && (
        <section className="bg-red-950/30 border-2 border-red-500/60 rounded-3xl p-4 space-y-3 shadow-[0_0_25px_rgba(239,68,68,0.15)]">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-black uppercase tracking-wider text-red-400 flex items-center gap-2">
              <span>⚠️ Castigos Pendientes por Cumplir</span>
            </h2>
            <span className="bg-red-500 text-black text-xs font-black px-2.5 py-0.5 rounded-full">
              {pendingPunishments.length}
            </span>
          </div>
          <div className="space-y-2">
            {pendingPunishments.map((log) => (
              <div
                key={log.id}
                className="bg-black/70 border border-red-500/30 rounded-2xl p-3 flex justify-between items-center gap-3"
              >
                <div>
                  <p className="font-black text-sm text-white">
                    💀 {log.punishmentName}:{" "}
                    <span className="text-red-400">
                      {log.punishmentQty} {log.punishmentUnit || ""}
                    </span>
                  </p>
                  <p className="text-[11px] text-gray-400">
                    Por procrastinar:{" "}
                    <span className="text-gray-200 font-semibold">
                      {log.event?.title || "Evento"}
                    </span>{" "}
                    (Día {log.cycleDay} • {log.dateStr})
                  </p>
                </div>
                <button
                  onClick={() => handleSettlePunishment(log.id)}
                  className="bg-positive text-black text-xs font-black px-3 py-2 rounded-xl shrink-0 active:scale-95 transition-transform"
                >
                  ✓ Cumplido
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* BANNER DESTACADO: REGLAS DEL DÍA (PARA EL DÍA SELECCIONADO) */}
      <section className="bg-card border border-cyan-500/30 rounded-3xl p-4 space-y-3 shadow-lg">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-base font-black flex items-center gap-2 text-cyan-300">
              <span>🛡️ Reglas del Día {selectedViewDay}</span>
            </h2>
            <p className="text-[11px] text-gray-400">
              Principios innegociables activos para este día del ciclo
            </p>
          </div>
          <button
            onClick={() => {
              openNewRuleForm();
              setIsRulesModalOpen(true);
            }}
            className="text-xs bg-white/10 hover:bg-white/20 text-white font-bold px-3 py-1.5 rounded-xl transition-colors"
          >
            + Editar Reglas
          </button>
        </div>

        {rulesForSelectedDay.length > 0 ? (
          <div className="space-y-2.5">
            {rulesForSelectedDay.map((rule, idx) => (
              <div
                key={rule.id}
                className="bg-black/60 border border-white/10 rounded-2xl p-3.5 space-y-1.5"
              >
                <div className="flex justify-between items-start gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-cyan-400">
                    Regla {idx + 1}: {rule.name}
                  </span>
                  <span className="text-[10px] bg-white/10 text-gray-300 px-2 py-0.5 rounded-full">
                    {rule.applyToAllDays ? "Todos los días" : `Días: ${rule.assignedDays}`}
                  </span>
                </div>
                <p className="text-sm font-bold text-white leading-snug">
                  🚫 {rule.description}
                </p>
                <p className="text-xs text-gray-400 italic border-l-2 border-cyan-500/50 pl-2.5">
                  💡 <span className="font-semibold text-gray-300">Razón:</span>{" "}
                  {rule.reason}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 bg-black/40 rounded-2xl border border-dashed border-white/10">
            <p className="text-xs text-gray-400">
              No hay reglas asignadas al Día {selectedViewDay}.
            </p>
          </div>
        )}
      </section>

      {/* NAVEGADOR DE DÍAS (1 AL 21) Y LÍNEA DE TIEMPO */}
      <section>
        <div className="flex justify-between items-center mb-3 bg-card p-2 rounded-2xl border border-white/10 shadow-lg">
          <button
            onClick={() => setSelectedViewDay(Math.max(1, selectedViewDay - 1))}
            className="px-5 py-2 bg-black rounded-xl border border-white/10 hover:bg-white/10 text-xl font-bold"
          >
            {"<"}
          </button>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2">
              <h2 className="text-xl font-black">Día {selectedViewDay}</h2>
              {selectedViewDay === currentCycleDay && (
                <span className="text-[10px] bg-positive text-black font-black px-2 py-0.5 rounded-full">
                  HOY
                </span>
              )}
            </div>
            <p className="text-[11px] text-gray-400">
              Semana {selectedDayWeek} del ciclo{" "}
              {[1, 8, 15].includes(selectedViewDay) && "• Lunes (Inicio de Semana)"}
            </p>
          </div>
          <button
            onClick={() => setSelectedViewDay(Math.min(21, selectedViewDay + 1))}
            className="px-5 py-2 bg-black rounded-xl border border-white/10 hover:bg-white/10 text-xl font-bold"
          >
            {">"}
          </button>
        </div>

        {/* Selector rápido de los 21 días */}
        <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4">
          {Array.from({ length: 21 }, (_, i) => i + 1).map((d) => {
            const isSelected = d === selectedViewDay;
            const isToday = d === currentCycleDay;
            return (
              <button
                key={d}
                onClick={() => setSelectedViewDay(d)}
                className={`min-w-[36px] h-9 rounded-xl text-xs font-black border transition-all shrink-0 ${
                  isSelected
                    ? "bg-white text-black border-white shadow"
                    : isToday
                      ? "bg-positive/20 text-positive border-positive/50"
                      : "bg-card text-gray-400 border-white/10 hover:text-white"
                }`}
              >
                {d}
              </button>
            );
          })}
        </div>

        <div className="mb-6">
          <button
            onClick={openNewEventModal}
            className="w-full bg-white text-black font-black rounded-xl p-3.5 text-sm shadow-[0_4px_14px_0_rgba(255,255,255,0.3)] hover:scale-[1.01] active:scale-98 transition-transform"
          >
            + Agregar Bloque / Evento al Día {selectedViewDay}
          </button>
        </div>

        {/* LÍNEA DE TIEMPO */}
        <div className="space-y-4 relative pl-4 border-l-2 border-white/10 ml-2 mt-6">
          {eventsForSelectedDay.length > 0 ? (
            eventsForSelectedDay.map((event) => {
              const steps = parseInstructions(event.instructions);
              const isExpanded = Boolean(expandedEvents[event.id]);
              const eventCycleLog = cycleLogs.find((l) => l.eventId === event.id);

              return (
                <div key={event.id} className="relative pl-6">
                  {/* Punto en la Línea de Tiempo */}
                  <div
                    className={`absolute -left-[29px] top-4 w-4 h-4 rounded-full border-4 ${
                      typeColors[event.type] || "border-gray-400"
                    } bg-black shadow-[0_0_10px_rgba(255,255,255,0.2)]`}
                  ></div>

                  {/* Tarjeta del Evento */}
                  <div
                    className={`p-4 rounded-2xl border-l-4 ${
                      typeColors[event.type] || "border-gray-400"
                    } ${
                      typeBgColors[event.type] || "bg-gray-400/10"
                    } border border-white/10 space-y-3`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <h3 className="font-black text-lg leading-tight">{event.title}</h3>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider ${
                            (typeColors[event.type] || "border-gray-400").replace(
                              "border",
                              "text"
                            )
                          }`}
                        >
                          {event.type}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-mono text-xs font-bold bg-black/60 px-2.5 py-1 rounded-lg border border-white/10">
                          {event.startTime} - {event.endTime}
                        </p>
                      </div>
                    </div>

                    {/* Insignias de Recompensa y Castigo */}
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border ${
                          event.rewardPoints > 0
                            ? "bg-yellow-500/15 text-yellow-300 border-yellow-500/30"
                            : "bg-black/40 text-gray-400 border-white/10"
                        }`}
                      >
                        🏆{" "}
                        {event.rewardPoints > 0
                          ? `+${event.rewardPoints} pts`
                          : "Sin Recompensa (0 pts)"}
                      </span>

                      <span
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border ${
                          event.punishment
                            ? "bg-red-500/15 text-red-300 border-red-500/30"
                            : "bg-black/40 text-gray-400 border-white/10"
                        }`}
                      >
                        💀{" "}
                        {event.punishment
                          ? `${event.punishment.name}: ${
                              event.punishmentQty || event.punishment.defaultQty
                            } ${event.punishment.unit || ""}`
                          : "Sin Castigo"}
                      </span>
                    </div>

                    {/* Desplegable de Instrucciones Paso a Paso */}
                    {steps.length > 0 && (
                      <div className="bg-black/50 rounded-xl border border-white/10 overflow-hidden">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedEvents((prev) => ({
                              ...prev,
                              [event.id]: !prev[event.id],
                            }))
                          }
                          className="w-full px-3 py-2 text-left text-xs font-bold text-cyan-300 flex justify-between items-center hover:bg-white/5"
                        >
                          <span>📋 Instrucciones paso a paso ({steps.length})</span>
                          <span>{isExpanded ? "▲ Ocultar" : "▼ Ver pasos"}</span>
                        </button>

                        {isExpanded && (
                          <div className="p-3 pt-1 space-y-1.5 border-t border-white/10">
                            {steps.map((step, idx) => {
                              const stepKey = `${event.id}-${idx}`;
                              const isChecked = Boolean(checkedSteps[stepKey]);
                              return (
                                <label
                                  key={idx}
                                  className="flex items-start gap-2.5 text-xs cursor-pointer py-1 hover:bg-white/5 rounded px-1"
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() =>
                                      setCheckedSteps((prev) => ({
                                        ...prev,
                                        [stepKey]: !prev[stepKey],
                                      }))
                                    }
                                    className="mt-0.5 accent-cyan-400 rounded"
                                  />
                                  <span
                                    className={
                                      isChecked
                                        ? "line-through text-gray-500"
                                        : "text-gray-200"
                                    }
                                  >
                                    <strong className="text-gray-400 mr-1">
                                      {idx + 1}.
                                    </strong>
                                    {step}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Botones de Acción: Completado / Procrastinado */}
                    <div className="pt-2 border-t border-white/10 space-y-2">
                      {eventCycleLog ? (
                        <div className="flex items-center justify-between bg-black/60 px-3 py-2 rounded-xl border border-white/10">
                          <span
                            className={`text-xs font-black ${
                              eventCycleLog.status === "COMPLETADO"
                                ? "text-positive"
                                : "text-negative"
                            }`}
                          >
                            {eventCycleLog.status === "COMPLETADO"
                              ? `✅ COMPLETADO (+${eventCycleLog.pointsAwarded} pts)`
                              : `❌ PROCRASTINADO ${
                                  eventCycleLog.punishmentName
                                    ? `(${eventCycleLog.punishmentQty} ${eventCycleLog.punishmentUnit || ""} ${eventCycleLog.punishmentName})`
                                    : ""
                                }`}
                          </span>
                          <button
                            onClick={() => handleUndoEventLog(eventCycleLog.id)}
                            className="text-[11px] text-gray-400 hover:text-white underline ml-2"
                          >
                            Deshacer
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => handleMarkEventStatus(event, "COMPLETADO")}
                            className="bg-positive/20 hover:bg-positive/30 border border-positive/40 text-positive font-black text-xs py-2 rounded-xl active:scale-95 transition-all"
                          >
                            ✅ Completar{" "}
                            {event.rewardPoints > 0 ? `(+${event.rewardPoints} pts)` : ""}
                          </button>
                          <button
                            onClick={() => handleMarkEventStatus(event, "PROCRASTINADO")}
                            className="bg-negative/20 hover:bg-negative/30 border border-negative/40 text-negative font-black text-xs py-2 rounded-xl active:scale-95 transition-all"
                          >
                            ❌ Procrastiné
                          </button>
                        </div>
                      )}

                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => openEditEventModal(event)}
                          className="text-xs font-semibold text-gray-300 hover:text-white flex-1 text-center py-1.5 bg-black/40 rounded-lg transition-colors hover:bg-black/60"
                        >
                          ✏️ Editar
                        </button>
                        <button
                          onClick={() => handleDeleteEvent(event.id)}
                          className="text-xs font-semibold text-negative hover:text-red-400 flex-1 text-center py-1.5 bg-black/40 rounded-lg transition-colors hover:bg-black/60"
                        >
                          🗑️ Borrar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-10 bg-card rounded-2xl border border-dashed border-white/20">
              <p className="text-gray-400 font-semibold">
                No hay bloques cargados en el Día {selectedViewDay}.
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Toca &quot;+ Agregar Bloque&quot; para usar una plantilla o crear uno a medida.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ===================================================================== */}
      {/* MODAL 1: CREAR / EDITAR EVENTO (CON PLANTILLAS, INSTRUCCIONES, ETC.) */}
      {/* ===================================================================== */}
      <Modal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        title={eventToEdit ? "Editar Bloque de Agenda" : "Nuevo Bloque de Agenda"}
      >
        <form onSubmit={handleSubmitEvent} className="space-y-4">
          {/* Selector de Plantillas Predefinidas */}
          <div className="bg-cyan-950/30 border border-cyan-500/30 p-3 rounded-xl space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-cyan-300">
                ⚡ Cargar Plantilla Predefinida (Opcional)
              </label>
              <button
                type="button"
                onClick={() => {
                  setIsEventModalOpen(false);
                  openNewTemplateForm();
                  setIsTemplatesModalOpen(true);
                }}
                className="text-[11px] bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-bold px-2.5 py-1 rounded-lg transition-colors"
              >
                ⚙️ Gestionar Plantillas
              </button>
            </div>
            <select
              value={selectedTemplateKey}
              onChange={(e) => handleApplyTemplate(e.target.value)}
              className="w-full bg-black border border-white/20 rounded-lg p-2 text-xs text-white"
            >
              <option value="">-- Seleccionar plantilla para autocompletar --</option>
              {templates.map((tpl) => (
                <option key={tpl.id} value={String(tpl.id)}>
                  {tpl.title} ({parseInstructions(tpl.instructions).length} pasos)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400">Día del ciclo (1-21)</label>
              <input
                type="number"
                min="1"
                max="21"
                value={dayNumber}
                onChange={(e) => setDayNumber(e.target.value)}
                className="w-full bg-black border border-white/20 rounded-lg p-2 mt-1 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400">Categoría / Tipo</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full bg-black border border-white/20 rounded-lg p-2 mt-1 text-sm capitalize"
              >
                {Object.keys(typeColors).map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400">Hora Inicio</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="w-full bg-black border border-white/20 rounded-lg p-2 mt-1 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400">Hora Fin</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                className="w-full bg-black border border-white/20 rounded-lg p-2 mt-1 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400">Título del Bloque</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Ej. Gimnasio, 24hs Security..."
              className="w-full bg-black border border-white/20 rounded-lg p-2 mt-1 text-sm"
            />
          </div>

          {/* Recompensa y Castigo con Cantidad Editable */}
          <div className="bg-black/60 border border-white/10 rounded-xl p-3 space-y-3">
            <div>
              <label className="text-xs font-bold text-yellow-400 block">
                🏆 Puntos de Recompensa al Completar (0 = Sin Recompensa)
              </label>
              <input
                type="number"
                min="0"
                value={rewardPoints}
                onChange={(e) => setRewardPoints(e.target.value)}
                className="w-full bg-black border border-white/20 rounded-lg p-2 mt-1 text-sm font-bold text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-red-400 block">
                  💀 Castigo si Procrastinas
                </label>
                <select
                  value={punishmentId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPunishmentId(val);
                    if (val !== "none") {
                      const found = punishments.find((p) => String(p.id) === val);
                      if (found) setPunishmentQty(String(found.defaultQty));
                    }
                  }}
                  className="w-full bg-black border border-white/20 rounded-lg p-2 mt-1 text-xs text-white"
                >
                  <option value="none">Sin Castigo</option>
                  {punishments.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.unit})
                    </option>
                  ))}
                </select>
              </div>

              {punishmentId !== "none" && (
                <div>
                  <label className="text-xs font-bold text-red-300 block">
                    Cantidad{" "}
                    {punishments.find((p) => String(p.id) === punishmentId)?.unit
                      ? `(${punishments.find((p) => String(p.id) === punishmentId)?.unit})`
                      : ""}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={punishmentQty}
                    onChange={(e) => setPunishmentQty(e.target.value)}
                    className="w-full bg-black border border-red-500/40 rounded-lg p-2 mt-1 text-sm font-bold text-white"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Instrucciones Paso a Paso Dinámicas */}
          <div className="bg-black/60 border border-white/10 rounded-xl p-3 space-y-2.5">
            <label className="text-xs font-bold text-cyan-300 block">
              📋 Instrucciones Paso a Paso ({instructionsList.length})
            </label>

            {instructionsList.length > 0 && (
              <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                {instructionsList.map((step, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-gray-400 w-5">
                      {idx + 1}.
                    </span>
                    <input
                      type="text"
                      value={step}
                      onChange={(e) => handleUpdateInstructionStep(idx, e.target.value)}
                      className="flex-1 bg-black border border-white/15 rounded-lg p-1.5 text-xs text-white"
                    />
                    <button
                      type="button"
                      onClick={() => handleMoveInstructionStep(idx, "up")}
                      disabled={idx === 0}
                      className="px-1.5 py-1 bg-white/10 rounded text-xs disabled:opacity-30"
                      title="Subir paso"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveInstructionStep(idx, "down")}
                      disabled={idx === instructionsList.length - 1}
                      className="px-1.5 py-1 bg-white/10 rounded text-xs disabled:opacity-30"
                      title="Bajar paso"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveInstructionStep(idx)}
                      className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs font-bold"
                      title="Eliminar paso"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <input
                type="text"
                value={newInstructionStep}
                onChange={(e) => setNewInstructionStep(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddInstructionStep();
                  }
                }}
                placeholder="Escribir nuevo paso..."
                className="flex-1 bg-black border border-white/20 rounded-lg p-2 text-xs text-white"
              />
              <button
                type="button"
                onClick={handleAddInstructionStep}
                className="bg-cyan-500 text-black font-black px-3 py-2 rounded-lg text-xs shrink-0"
              >
                + Paso
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSavingEvent}
            className="w-full bg-white text-black font-black rounded-xl p-3 text-sm disabled:opacity-50"
          >
            {isSavingEvent
              ? "Guardando..."
              : eventToEdit
                ? "Actualizar Bloque"
                : "Guardar Bloque en Agenda"}
          </button>
        </form>
      </Modal>

      {/* ===================================================================== */}
      {/* MODAL 2: CRUD DE REGLAS DEL DÍA Y ASIGNACIÓN A DÍAS 1..21              */}
      {/* ===================================================================== */}
      <Modal
        isOpen={isRulesModalOpen}
        onClose={() => setIsRulesModalOpen(false)}
        title="📜 Gestión de Reglas del Día"
      >
        <div className="space-y-5">
          <form
            onSubmit={handleSaveRule}
            className="bg-black/60 border border-white/10 p-3.5 rounded-2xl space-y-3"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-black uppercase tracking-wider text-cyan-400">
                {ruleToEdit ? `Editando: ${ruleToEdit.name}` : "Nueva Regla del Día"}
              </h3>
              {ruleToEdit && (
                <button
                  type="button"
                  onClick={openNewRuleForm}
                  className="text-[11px] text-gray-400 underline"
                >
                  Cancelar edición
                </button>
              )}
            </div>

            <div>
              <label className="text-xs text-gray-400">Nombre de la Regla</label>
              <input
                type="text"
                value={ruleName}
                onChange={(e) => setRuleName(e.target.value)}
                required
                placeholder="Ej. Dopamina, Sueño de Calidad..."
                className="w-full bg-black border border-white/20 rounded-lg p-2 mt-1 text-xs"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400">Descripción (Qué está prohibido / exigido)</label>
              <textarea
                rows={2}
                value={ruleDescription}
                onChange={(e) => setRuleDescription(e.target.value)}
                required
                placeholder="Ej. Está prohibido consumir cualquier cosa que genere dopamina rápida"
                className="w-full bg-black border border-white/20 rounded-lg p-2 mt-1 text-xs"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400">Razón (Por qué existe esta regla)</label>
              <textarea
                rows={2}
                value={ruleReason}
                onChange={(e) => setRuleReason(e.target.value)}
                required
                placeholder="Ej. La dopamina rápida consume energía necesaria..."
                className="w-full bg-black border border-white/20 rounded-lg p-2 mt-1 text-xs"
              />
            </div>

            <div className="space-y-2 pt-1">
              <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={ruleApplyAll}
                  onChange={(e) => setRuleApplyAll(e.target.checked)}
                  className="accent-cyan-400"
                />
                <span>Aplicar a todos los 21 días del ciclo</span>
              </label>

              {!ruleApplyAll && (
                <div>
                  <p className="text-[11px] text-gray-400 mb-1.5">
                    Selecciona los días del ciclo donde rige esta regla:
                  </p>
                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: 21 }, (_, i) => i + 1).map((d) => {
                      const active = ruleSelectedDays.includes(d);
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => toggleRuleDaySelection(d)}
                          className={`py-1.5 rounded-lg text-xs font-bold border ${
                            active
                              ? "bg-cyan-400 text-black border-cyan-400"
                              : "bg-black text-gray-400 border-white/10"
                          }`}
                        >
                          {d}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isSavingRule}
              className="w-full bg-white text-black font-black rounded-xl p-2.5 text-xs"
            >
              {isSavingRule
                ? "Guardando..."
                : ruleToEdit
                  ? "Actualizar Regla"
                  : "+ Guardar Regla"}
            </button>
          </form>

          {/* Listado de reglas existentes */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase text-gray-400">
              Reglas Registradas ({rules.length})
            </h4>
            {rules.map((r) => (
              <div
                key={r.id}
                className="bg-black/40 border border-white/10 rounded-xl p-3 space-y-1.5"
              >
                <div className="flex justify-between items-center">
                  <span className="font-bold text-sm text-cyan-300">{r.name}</span>
                  <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-gray-300">
                    {r.applyToAllDays ? "Días 1-21" : `Días: ${r.assignedDays}`}
                  </span>
                </div>
                <p className="text-xs text-white">{r.description}</p>
                <p className="text-[11px] text-gray-400 italic">Razón: {r.reason}</p>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => openEditRuleForm(r)}
                    className="flex-1 bg-white/10 hover:bg-white/20 text-xs py-1 rounded-lg font-semibold"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteRule(r.id)}
                    className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs py-1 rounded-lg font-semibold"
                  >
                    Borrar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* ===================================================================== */}
      {/* MODAL 3: CATÁLOGO CRUD DE CASTIGOS                                    */}
      {/* ===================================================================== */}
      <Modal
        isOpen={isPunishmentsModalOpen}
        onClose={() => setIsPunishmentsModalOpen(false)}
        title="💀 Catálogo de Castigos"
      >
        <div className="space-y-5">
          <form
            onSubmit={handleSavePunishment}
            className="bg-black/60 border border-white/10 p-3.5 rounded-2xl space-y-3"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-black uppercase tracking-wider text-red-400">
                {punishmentToEdit
                  ? `Editando: ${punishmentToEdit.name}`
                  : "Nuevo Tipo de Castigo"}
              </h3>
              {punishmentToEdit && (
                <button
                  type="button"
                  onClick={openNewPunishmentForm}
                  className="text-[11px] text-gray-400 underline"
                >
                  Cancelar
                </button>
              )}
            </div>

            <div>
              <label className="text-xs text-gray-400">Nombre del Castigo</label>
              <input
                type="text"
                value={punishmentName}
                onChange={(e) => setPunishmentName(e.target.value)}
                required
                placeholder="Ej. Flexiones de brazos, Ducha Fría, Caminar..."
                className="w-full bg-black border border-white/20 rounded-lg p-2 mt-1 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400">Unidad (Ej. repeticiones, km, vez)</label>
                <input
                  type="text"
                  value={punishmentUnit}
                  onChange={(e) => setPunishmentUnit(e.target.value)}
                  placeholder="repeticiones"
                  className="w-full bg-black border border-white/20 rounded-lg p-2 mt-1 text-xs"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400">Cantidad sugerida por defecto</label>
                <input
                  type="number"
                  min="1"
                  value={punishmentDefaultQty}
                  onChange={(e) => setPunishmentDefaultQty(e.target.value)}
                  className="w-full bg-black border border-white/20 rounded-lg p-2 mt-1 text-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSavingPunishment}
              className="w-full bg-white text-black font-black rounded-xl p-2.5 text-xs"
            >
              {isSavingPunishment
                ? "Guardando..."
                : punishmentToEdit
                  ? "Actualizar Castigo"
                  : "+ Agregar al Catálogo"}
            </button>
          </form>

          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase text-gray-400">
              Castigos Disponibles ({punishments.length})
            </h4>
            {punishments.map((p) => (
              <div
                key={p.id}
                className="bg-black/40 border border-white/10 rounded-xl p-3 flex justify-between items-center"
              >
                <div>
                  <p className="font-bold text-sm text-white">💀 {p.name}</p>
                  <p className="text-xs text-gray-400">
                    Por defecto: {p.defaultQty} {p.unit || ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => openEditPunishmentForm(p)}
                    className="bg-white/10 hover:bg-white/20 text-xs px-3 py-1.5 rounded-lg font-semibold"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeletePunishment(p.id)}
                    className="bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs px-3 py-1.5 rounded-lg font-semibold"
                  >
                    Borrar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* ===================================================================== */}
      {/* MODAL 4: TIENDA / PREMIOS CANJEABLES (CRUD + CANJE DE PUNTOS)         */}
      {/* ===================================================================== */}
      <Modal
        isOpen={isRewardsModalOpen}
        onClose={() => setIsRewardsModalOpen(false)}
        title="🎁 Tienda de Premios Semanales"
      >
        <div className="space-y-5">
          {/* Saldo disponible en el modal */}
          <div className="bg-yellow-500/15 border border-yellow-500/40 rounded-2xl p-3 flex justify-between items-center">
            <div>
              <p className="text-[11px] uppercase font-bold text-yellow-200">
                Saldo Disponible (Semana {pointsSummary.currentCycleWeek})
              </p>
              <p className="text-[11px] text-gray-400">
                Vigencia: {pointsSummary.weekStartStr} al {pointsSummary.weekEndStr}
              </p>
            </div>
            <p className="text-2xl font-black text-yellow-400">
              {pointsSummary.weeklyAvailablePoints} pts
            </p>
          </div>

          {/* Lista de premios para canjear */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase text-gray-400">
              Premios para Canjear ({rewards.length})
            </h4>
            {rewards.map((r) => {
              const canAfford = pointsSummary.weeklyAvailablePoints >= r.costPoints;
              return (
                <div
                  key={r.id}
                  className="bg-black/50 border border-white/10 rounded-2xl p-3 space-y-2"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <p className="font-bold text-sm text-white">{r.name}</p>
                      {r.description && (
                        <p className="text-xs text-gray-400">{r.description}</p>
                      )}
                    </div>
                    <span className="bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 text-xs font-black px-2.5 py-1 rounded-lg shrink-0">
                      {r.costPoints} pts
                    </span>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleRedeemReward(r)}
                      disabled={!canAfford}
                      className={`flex-[2] py-1.5 rounded-lg text-xs font-black transition-all ${
                        canAfford
                          ? "bg-yellow-400 text-black hover:bg-yellow-300"
                          : "bg-white/5 text-gray-500 cursor-not-allowed"
                      }`}
                    >
                      {canAfford ? "🎁 Canjear Ahora" : "Puntos insuficientes"}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditRewardForm(r)}
                      className="px-2.5 py-1.5 bg-white/10 rounded-lg text-xs"
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteReward(r.id)}
                      className="px-2.5 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-xs"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Formulario CRUD de Premios */}
          <form
            onSubmit={handleSaveReward}
            className="bg-black/60 border border-white/10 p-3.5 rounded-2xl space-y-3"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-black uppercase tracking-wider text-yellow-400">
                {rewardToEdit
                  ? `Editando Premio: ${rewardToEdit.name}`
                  : "+ Crear Nuevo Premio Canjeable"}
              </h3>
              {rewardToEdit && (
                <button
                  type="button"
                  onClick={openNewRewardForm}
                  className="text-[11px] text-gray-400 underline"
                >
                  Cancelar
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="text-xs text-gray-400">Nombre del Premio</label>
                <input
                  type="text"
                  value={rewardName}
                  onChange={(e) => setRewardName(e.target.value)}
                  required
                  placeholder="Ej. Noche de Cine, Cheat Meal..."
                  className="w-full bg-black border border-white/20 rounded-lg p-2 mt-1 text-xs"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400">Costo (Pts)</label>
                <input
                  type="number"
                  min="1"
                  value={rewardCost}
                  onChange={(e) => setRewardCost(e.target.value)}
                  required
                  className="w-full bg-black border border-white/20 rounded-lg p-2 mt-1 text-xs font-bold"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400">Descripción (Opcional)</label>
              <input
                type="text"
                value={rewardDescription}
                onChange={(e) => setRewardDescription(e.target.value)}
                placeholder="Detalles de la recompensa..."
                className="w-full bg-black border border-white/20 rounded-lg p-2 mt-1 text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={isSavingReward}
              className="w-full bg-white text-black font-black rounded-xl p-2.5 text-xs"
            >
              {isSavingReward
                ? "Guardando..."
                : rewardToEdit
                  ? "Actualizar Premio"
                  : "Guardar Premio en Catálogo"}
            </button>
          </form>

          {/* Historial de canjes de esta semana */}
          {weekRedemptions.length > 0 && (
            <div className="space-y-1.5 border-t border-white/10 pt-3">
              <h4 className="text-xs font-bold uppercase text-gray-400">
                Canjes realizados esta semana ({weekRedemptions.length})
              </h4>
              {weekRedemptions.map((red) => (
                <div
                  key={red.id}
                  className="flex justify-between items-center text-xs bg-black/40 px-3 py-2 rounded-lg border border-white/5"
                >
                  <span className="text-gray-200">
                    🎉 {red.rewardName}{" "}
                    <span className="text-gray-500">({red.dateStr})</span>
                  </span>
                  <span className="text-purple-400 font-bold">-{red.costPoints} pts</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* ===================================================================== */}
      {/* MODAL 5: CONFIGURAR FECHA DE INICIO DEL CICLO (DÍA 1)                 */}
      {/* ===================================================================== */}
      <Modal
        isOpen={isCycleModalOpen}
        onClose={() => setIsCycleModalOpen(false)}
        title="⚙️ Configurar Ciclo de 21 Días"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-400">
            Define qué lunes del calendario representa el <strong>&quot;Día 1&quot;</strong> de tu
            ciclo de 21 días. Los días 1, 8 y 15 corresponden siempre a los lunes donde se
            reinicia el saldo semanal de puntos.
          </p>
          <div>
            <label className="text-xs text-gray-400">Fecha del Día 1 (Lunes)</label>
            <input
              type="date"
              value={cycleStartDate}
              onChange={(e) => setCycleStartDate(e.target.value)}
              className="w-full bg-black border border-white/20 rounded-lg p-2 mt-1 text-sm"
            />
          </div>
          <button
            onClick={handleUpdateCycle}
            className="w-full bg-white text-black font-bold rounded-lg p-3"
          >
            Guardar Configuración
          </button>
        </div>
      </Modal>

      {/* ===================================================================== */}
      {/* MODAL 6: CATÁLOGO CRUD DE PLANTILLAS DE EVENTOS                       */}
      {/* ===================================================================== */}
      <Modal
        isOpen={isTemplatesModalOpen}
        onClose={() => setIsTemplatesModalOpen(false)}
        title="📋 Catálogo de Plantillas de Eventos"
      >
        <div className="space-y-5">
          {/* Formulario Crear / Editar Plantilla */}
          <form
            onSubmit={handleSaveTemplate}
            className="bg-black/60 border border-white/10 rounded-2xl p-4 space-y-3"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-black uppercase tracking-wider text-purple-300">
                {templateToEdit
                  ? `Editando Plantilla: ${templateToEdit.title}`
                  : "+ Crear Nueva Plantilla de Bloque"}
              </h3>
              {templateToEdit && (
                <button
                  type="button"
                  onClick={openNewTemplateForm}
                  className="text-[11px] text-gray-400 hover:text-white underline"
                >
                  Cancelar edición
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="text-xs text-gray-400">Nombre de la Plantilla</label>
                <input
                  type="text"
                  value={tplTitle}
                  onChange={(e) => setTplTitle(e.target.value)}
                  required
                  placeholder="Ej. Gimnasio, Estudio, 24hs Security..."
                  className="w-full bg-black border border-white/20 rounded-lg p-2 mt-1 text-xs"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400">Categoría</label>
                <select
                  value={tplType}
                  onChange={(e) => setTplType(e.target.value)}
                  className="w-full bg-black border border-white/20 rounded-lg p-2 mt-1 text-xs capitalize"
                >
                  {Object.keys(typeColors).map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Puntos y Castigo por defecto de la plantilla */}
            <div className="bg-black/50 border border-white/10 rounded-xl p-3 space-y-2.5">
              <div>
                <label className="text-[11px] font-bold text-yellow-400 block">
                  🏆 Puntos de Recompensa por defecto (0 = Sin Recompensa)
                </label>
                <input
                  type="number"
                  min="0"
                  value={tplRewardPoints}
                  onChange={(e) => setTplRewardPoints(e.target.value)}
                  className="w-full bg-black border border-white/20 rounded-lg p-1.5 mt-1 text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-red-400 block">
                    💀 Castigo por defecto
                  </label>
                  <select
                    value={tplPunishmentId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTplPunishmentId(val);
                      if (val !== "none") {
                        const found = punishments.find((p) => String(p.id) === val);
                        if (found) setTplPunishmentQty(String(found.defaultQty));
                      }
                    }}
                    className="w-full bg-black border border-white/20 rounded-lg p-1.5 mt-1 text-xs"
                  >
                    <option value="none">Ninguno (Sin Castigo)</option>
                    {punishments.map((p) => (
                      <option key={p.id} value={String(p.id)}>
                        {p.name} ({p.unit || "u."})
                      </option>
                    ))}
                  </select>
                </div>

                {tplPunishmentId !== "none" && (
                  <div>
                    <label className="text-[11px] font-bold text-red-400 block">
                      Cantidad ({punishments.find((p) => String(p.id) === tplPunishmentId)?.unit || "unidades"})
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={tplPunishmentQty}
                      onChange={(e) => setTplPunishmentQty(e.target.value)}
                      className="w-full bg-black border border-white/20 rounded-lg p-1.5 mt-1 text-xs font-bold"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Editor de Instrucciones paso a paso de la plantilla */}
            <div className="bg-black/50 border border-white/10 rounded-xl p-3 space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-bold text-cyan-300">
                  📋 Instrucciones paso a paso ({tplInstructionsList.length})
                </label>
                {tplInstructionsList.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setTplInstructionsList([])}
                    className="text-[10px] text-gray-400 hover:text-red-400"
                  >
                    Limpiar pasos
                  </button>
                )}
              </div>

              {tplInstructionsList.length > 0 && (
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {tplInstructionsList.map((step, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <span className="text-[11px] font-mono text-gray-400 w-5 shrink-0">
                        {idx + 1}.
                      </span>
                      <input
                        type="text"
                        value={step}
                        onChange={(e) =>
                          handleUpdateTplInstructionStep(idx, e.target.value)
                        }
                        className="flex-1 bg-black border border-white/15 rounded-lg px-2 py-1 text-xs text-white"
                      />
                      <button
                        type="button"
                        onClick={() => handleMoveTplInstructionStep(idx, "up")}
                        disabled={idx === 0}
                        className="px-1.5 py-1 text-[10px] bg-white/10 rounded disabled:opacity-30"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveTplInstructionStep(idx, "down")}
                        disabled={idx === tplInstructionsList.length - 1}
                        className="px-1.5 py-1 text-[10px] bg-white/10 rounded disabled:opacity-30"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveTplInstructionStep(idx)}
                        className="px-1.5 py-1 text-[10px] bg-red-500/20 text-red-400 rounded"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTplInstructionStep}
                  onChange={(e) => setNewTplInstructionStep(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddTplInstructionStep();
                    }
                  }}
                  placeholder="Agregar paso a la plantilla..."
                  className="flex-1 bg-black border border-white/20 rounded-lg p-2 text-xs"
                />
                <button
                  type="button"
                  onClick={handleAddTplInstructionStep}
                  className="bg-cyan-500 text-black font-black px-3 rounded-lg text-xs shrink-0"
                >
                  + Paso
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSavingTemplate}
              className="w-full bg-white text-black font-black rounded-xl p-2.5 text-xs"
            >
              {isSavingTemplate
                ? "Guardando..."
                : templateToEdit
                  ? "Actualizar Plantilla"
                  : "Guardar Nueva Plantilla"}
            </button>
          </form>

          {/* Lista de Plantillas Existentes */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase text-gray-400">
              Plantillas Guardadas ({templates.length})
            </h4>
            {templates.map((tpl) => {
              const steps = parseInstructions(tpl.instructions);
              return (
                <div
                  key={tpl.id}
                  className="bg-black/40 border border-white/10 rounded-xl p-3 space-y-2"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <p className="font-black text-sm text-white">{tpl.title}</p>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        <span className="text-[10px] uppercase font-bold bg-white/10 text-gray-300 px-2 py-0.5 rounded">
                          {tpl.type}
                        </span>
                        <span className="text-[10px] font-bold bg-yellow-500/15 text-yellow-300 px-2 py-0.5 rounded">
                          🏆 +{tpl.rewardPoints || 0} pts
                        </span>
                        <span className="text-[10px] font-bold bg-red-500/15 text-red-300 px-2 py-0.5 rounded">
                          💀{" "}
                          {tpl.punishment
                            ? `${tpl.punishment.name} (${tpl.punishmentQty || tpl.punishment.defaultQty} ${tpl.punishment.unit || ""})`
                            : "Sin Castigo"}
                        </span>
                        <span className="text-[10px] font-bold bg-cyan-500/15 text-cyan-300 px-2 py-0.5 rounded">
                          📋 {steps.length} pasos
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        onClick={() => openEditTemplateForm(tpl)}
                        className="text-[11px] bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-lg font-bold"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(tpl.id)}
                        className="text-[11px] bg-red-500/20 text-red-400 px-2.5 py-1 rounded-lg font-bold"
                      >
                        Borrar
                      </button>
                    </div>
                  </div>

                  {steps.length > 0 && (
                    <ol className="text-[11px] text-gray-400 list-decimal list-inside space-y-0.5 bg-black/40 p-2 rounded-lg border border-white/5">
                      {steps.map((s, idx) => (
                        <li key={idx} className="truncate">
                          {s}
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </Modal>
    </div>
  );
}
