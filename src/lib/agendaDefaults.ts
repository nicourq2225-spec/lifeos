import { prisma } from "./prisma";

export const INITIAL_DAY_RULES = [
  {
    name: "Dopamina",
    description: "Está prohibido consumir cualquier cosa que genere dopamina rápida",
    reason:
      "La dopamina rápida consume energía necesaria para la realización de las tareas productivas llevando al usuario a procrastinar",
    applyToAllDays: true,
    assignedDays: "1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21",
    active: true,
  },
  {
    name: "Sueño de Calidad",
    description: "Prohibido consumir después de las 21:30 y dormirse a las 23:30",
    reason:
      "Acostarse a dormir en ese estado requiere más de 9 horas de sueño y al no dormir lo suficiente nos despertamos cansados y cuesta más levantarse",
    applyToAllDays: true,
    assignedDays: "1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21",
    active: true,
  },
  {
    name: "Inercia Conductual",
    description: 'Prohibido acostarse en el sillón o en la cama a "descansar un rato"',
    reason:
      "El cuerpo tiende a sentirse cansado al ponerse cómodo y cuesta más arrancar una vez que estás quieto",
    applyToAllDays: true,
    assignedDays: "1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21",
    active: true,
  },
];

export const INITIAL_PUNISHMENTS = [
  { name: "Flexiones de brazos", unit: "repeticiones", defaultQty: 100 },
  { name: "Ducha Fría", unit: "vez", defaultQty: 1 },
  { name: "Caminar", unit: "km", defaultQty: 5 },
];

export const INITIAL_REWARDS = [
  {
    name: "1 Hora de Videojuegos / Ocio Libre",
    description: "Sesión recreativa sin culpa tras cumplir tus objetivos semanales",
    costPoints: 30,
  },
  {
    name: "Comida Libre (Cheat Meal)",
    description: "Permitido pedir o salir a comer tu plato favorito el fin de semana",
    costPoints: 50,
  },
  {
    name: "Salida / Noche Libre",
    description: "Actividad social o recreativa especial con puntos acumulados de la semana",
    costPoints: 80,
  },
];

export interface AgendaBlockTemplate {
  key: string;
  title: string;
  type: "obligacion" | "salud" | "estudio" | "rutina" | "ocio" | "auditoria";
  instructions: string[];
  defaultRewardPoints: number;
  defaultPunishmentName: string | null;
  defaultPunishmentQty: number;
}

export const AGENDA_TEMPLATES: AgendaBlockTemplate[] = [
  {
    key: "24hs-security",
    title: "24hs Security",
    type: "obligacion",
    instructions: [
      "Limpieza general",
      "Abertura y exposición",
      "Conteo de Efectivo",
      "Registro de gastos y hábitos de ayer",
      "Entrar en actividad comercial",
    ],
    defaultRewardPoints: 0,
    defaultPunishmentName: null,
    defaultPunishmentQty: 1,
  },
  {
    key: "gimnasio",
    title: "Gimnasio",
    type: "salud",
    instructions: [
      "Vestir ropa de vestir",
      "Preparar botella de agua y auriculares",
      "Viajar en moto hasta el gimnasio",
      "Entrenar siguiendo el plan de entrenamiento",
      "Finalizar entrenamiento con estiramiento",
      "Volver a casa en moto",
      "Bañarse",
      "Meter la ropa sucia al lavarropas",
    ],
    defaultRewardPoints: 10,
    defaultPunishmentName: "Flexiones de brazos",
    defaultPunishmentQty: 100,
  },
  {
    key: "estudio",
    title: "Estudio / Estudiar",
    type: "estudio",
    instructions: [
      "Limpiar y Ordenar el espacio de estudio",
      "Preparar una infusión",
      "Iniciar el temporizador Pomodoro",
      "Al finalizar registrar turno de estudio como completado",
    ],
    defaultRewardPoints: 10,
    defaultPunishmentName: "Ducha Fría",
    defaultPunishmentQty: 1,
  },
  {
    key: "soluciones-it",
    title: "Soluciones y Sistemas IT",
    type: "obligacion",
    instructions: [
      "Limpiar y Ordenar el espacio de trabajo",
      "Preparar una infusión",
      "Iniciar el temporizador Pomodoro",
      "Al finalizar registrar tareas completadas y tareas pendientes",
    ],
    defaultRewardPoints: 10,
    defaultPunishmentName: "Flexiones de brazos",
    defaultPunishmentQty: 50,
  },
  {
    key: "esencial-sneakers",
    title: "Esencial Sneakers",
    type: "obligacion",
    instructions: [
      "Limpiar y Ordenar el espacio de trabajo",
      "Preparar una infusión",
      "Iniciar el temporizador Pomodoro",
      "Al finalizar registrar tareas completadas y tareas pendientes",
    ],
    defaultRewardPoints: 10,
    defaultPunishmentName: "Flexiones de brazos",
    defaultPunishmentQty: 50,
  },
  {
    key: "delivery",
    title: "Delivery",
    type: "obligacion",
    instructions: [
      "Agendar turno de trabajo",
      "Cargar batería del celular y los auriculares",
      "Preparar mochila de reparto y botella con agua",
      "Completar jornada de trabajo",
      "Registrar dinero generado",
    ],
    defaultRewardPoints: 15,
    defaultPunishmentName: "Caminar",
    defaultPunishmentQty: 5,
  },
  {
    key: "rutina-matutina",
    title: "Rutina Matutina",
    type: "rutina",
    instructions: [
      "Levantarse de la cama",
      "Apagar la alarma",
      "Vestirse",
      "Lavarse la cara y los dientes",
      "Tomar un vaso de agua",
      "Cocinar y comer desayuno",
      "Preparar tupper de almuerzo en la mochila",
      "Viajar en la moto al trabajo",
    ],
    defaultRewardPoints: 5,
    defaultPunishmentName: "Ducha Fría",
    defaultPunishmentQty: 1,
  },
  {
    key: "rutina-nocturna",
    title: "Rutina Nocturna",
    type: "rutina",
    instructions: [
      "Cocinar Cena y Almuerzo del día siguiente",
      "Limpieza Express (Lavar platos, ordenar comedor y habitación, ordenar y lavar ropa)",
      "Preparación: Preparar la mochila para mañana y la ropa para mañana",
      "Descanso de Calidad: Dormir a las 23:30 y dejar el celular cargando lejos de la cama",
    ],
    defaultRewardPoints: 5,
    defaultPunishmentName: "Flexiones de brazos",
    defaultPunishmentQty: 50,
  },
  {
    key: "cocina-meal-prep",
    title: "Cocina (Meal Prep)",
    type: "salud",
    instructions: [
      "Definir qué se va a cocinar",
      "Buscar receta e ingredientes",
      "Comprar ingredientes",
      "Cocinar siguiendo la receta",
      "Separar en 8 tuppers (4 Almuerzos y 4 Cenas)",
      "Lavar los elementos utilizados",
    ],
    defaultRewardPoints: 10,
    defaultPunishmentName: "Caminar",
    defaultPunishmentQty: 3,
  },
];

/**
 * Calcula información matemática exacta del ciclo de 21 días y la semana en curso:
 * - Lunes son siempre los días 1, 8 y 15 del ciclo:
 *   Semana 1: Días 1 al 7
 *   Semana 2: Días 8 al 14
 *   Semana 3: Días 15 al 21
 * - Devuelve `weekStartStr` (YYYY-MM-DD del lunes en que inició la semana actual del ciclo)
 *   para que los puntos sólo tengan vigencia dentro de la semana actual (Lunes a Domingo)
 *   y se reinicien automáticamente a 0 al llegar al próximo lunes (días 1, 8 o 15).
 */
export function getArgentinaDateStr(date: Date = new Date()): string {
  return date.toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

export function calculateCycleAndWeek(
  cycleStartDate?: Date | string | null,
  targetDateStr?: string | null
) {
  const dateToUseStr = cycleStartDate
    ? typeof cycleStartDate === "string"
      ? cycleStartDate.split("T")[0]
      : cycleStartDate.toISOString().split("T")[0]
    : "2026-01-19";

  const [sy, sm, sd] = dateToUseStr.split("-").map(Number);
  const startUtcMs = Date.UTC(sy, sm - 1, sd);

  const todayStr =
    targetDateStr && /^\d{4}-\d{2}-\d{2}$/.test(targetDateStr)
      ? targetDateStr
      : getArgentinaDateStr();

  const [ty, tm, td] = todayStr.split("-").map(Number);
  const todayUtcMs = Date.UTC(ty, tm - 1, td);

  const diffDays = Math.round((todayUtcMs - startUtcMs) / (1000 * 60 * 60 * 24));

  const currentCycleDay =
    diffDays >= 0 ? (diffDays % 21) + 1 : ((21 + (diffDays % 21)) % 21) + 1;

  // Semana del ciclo: 1 (Días 1-7), 2 (Días 8-14), 3 (Días 15-21)
  const currentCycleWeek = Math.floor((currentCycleDay - 1) / 7) + 1;
  // Día dentro de la semana actual (0 = Lunes [Días 1, 8, 15] ... 6 = Domingo [Días 7, 14, 21])
  const offsetFromWeekMonday = (currentCycleDay - 1) % 7;

  const weekMonday = new Date(todayUtcMs - offsetFromWeekMonday * 86400000);
  const weekStartStr = weekMonday.toISOString().split("T")[0];

  const weekSunday = new Date(weekMonday.getTime() + 6 * 86400000);
  const weekEndStr = weekSunday.toISOString().split("T")[0];

  const weekStartCycleDay = (currentCycleWeek - 1) * 7 + 1; // 1, 8 o 15
  const weekEndCycleDay = currentCycleWeek * 7; // 7, 14 o 21

  return {
    cycleStartDateStr: dateToUseStr,
    todayStr,
    currentCycleDay,
    currentCycleWeek,
    weekStartCycleDay,
    weekEndCycleDay,
    weekStartStr,
    weekEndStr,
  };
}

/**
 * Lazy-seed de datos base de Agenda (Reglas del Día iniciales, Castigos base y Premios base)
 * si las tablas están vacías, para que la app tenga todo listo de inmediato.
 */
export async function ensureAgendaDefaults() {
  const [rulesCount, punishmentsCount, rewardsCount, templatesCount] = await Promise.all([
    prisma.dayRule.count(),
    prisma.punishment.count(),
    prisma.rewardItem.count(),
    prisma.agendaTemplate.count(),
  ]);

  if (rulesCount === 0) {
    await prisma.dayRule.createMany({
      data: INITIAL_DAY_RULES,
    });
  }

  if (punishmentsCount === 0) {
    await prisma.punishment.createMany({
      data: INITIAL_PUNISHMENTS,
    });
  }

  if (rewardsCount === 0) {
    await prisma.rewardItem.createMany({
      data: INITIAL_REWARDS,
    });
  }

  if (templatesCount === 0) {
    const allPunishments = await prisma.punishment.findMany();
    for (const tpl of AGENDA_TEMPLATES) {
      const matchedPunishment = tpl.defaultPunishmentName
        ? allPunishments.find(
            (p) => p.name.toLowerCase() === tpl.defaultPunishmentName!.toLowerCase()
          )
        : null;

      await prisma.agendaTemplate.create({
        data: {
          title: tpl.title,
          type: tpl.type,
          instructions: JSON.stringify(tpl.instructions),
          rewardPoints: tpl.defaultRewardPoints,
          punishmentId: matchedPunishment ? matchedPunishment.id : null,
          punishmentQty: matchedPunishment ? tpl.defaultPunishmentQty : null,
        },
      });
    }
  }
}
