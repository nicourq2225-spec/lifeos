import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  AGENDA_TEMPLATES,
  calculateCycleAndWeek,
  ensureAgendaDefaults,
} from "@/lib/agendaDefaults";

export async function GET(request: Request) {
  try {
    await ensureAgendaDefaults();

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");

    const settings = await prisma.settings.findFirst();
    const cycleInfo = calculateCycleAndWeek(settings?.cycleStartDate, dateParam);

    // Registrar reinicio semanal automático cada lunes (Días 1, 8 y 15 del ciclo)
    if (settings?.lastPointsResetDate !== cycleInfo.weekStartStr) {
      await prisma.settings.upsert({
        where: { id: 1 },
        update: { lastPointsResetDate: cycleInfo.weekStartStr },
        create: {
          id: 1,
          cycleStartDate: new Date("2026-01-19T00:00:00"),
          lastPointsResetDate: cycleInfo.weekStartStr,
        },
      });
    }

    const [
      events,
      rules,
      punishments,
      rewards,
      weekLogs,
      pendingPunishments,
      weekRedemptions,
    ] = await Promise.all([
      prisma.agendaEvent.findMany({
        include: { punishment: true },
        orderBy: [{ dayNumber: "asc" }, { startTime: "asc" }],
      }),
      prisma.dayRule.findMany({
        orderBy: { id: "asc" },
      }),
      prisma.punishment.findMany({
        orderBy: { id: "asc" },
      }),
      prisma.rewardItem.findMany({
        orderBy: { costPoints: "asc" },
      }),
      prisma.agendaEventLog.findMany({
        where: { weekStartStr: cycleInfo.weekStartStr },
        include: { event: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.agendaEventLog.findMany({
        where: {
          status: "PROCRASTINADO",
          punishmentSettled: false,
          punishmentName: { not: null },
        },
        include: { event: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.rewardRedemption.findMany({
        where: { weekStartStr: cycleInfo.weekStartStr },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const weeklyEarnedPoints = weekLogs
      .filter((l) => l.status === "COMPLETADO")
      .reduce((acc, curr) => acc + (curr.pointsAwarded || 0), 0);

    const weeklySpentPoints = weekRedemptions.reduce(
      (acc, curr) => acc + (curr.costPoints || 0),
      0
    );

    const weeklyAvailablePoints = Math.max(0, weeklyEarnedPoints - weeklySpentPoints);

    return NextResponse.json({
      events,
      cycleStartDate: settings?.cycleStartDate || "2026-01-19T00:00:00.000Z",
      cycleInfo,
      rules,
      punishments,
      rewards,
      templates: AGENDA_TEMPLATES,
      weekLogs,
      pendingPunishments,
      weekRedemptions,
      pointsSummary: {
        weeklyEarnedPoints,
        weeklySpentPoints,
        weeklyAvailablePoints,
        weekStartStr: cycleInfo.weekStartStr,
        weekEndStr: cycleInfo.weekEndStr,
        currentCycleWeek: cycleInfo.currentCycleWeek,
        weekStartCycleDay: cycleInfo.weekStartCycleDay,
        weekEndCycleDay: cycleInfo.weekEndCycleDay,
      },
    });
  } catch (error) {
    console.error("Error fetching agenda:", error);
    return NextResponse.json({ error: "Error fetching agenda" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      dayNumber,
      startTime,
      endTime,
      title,
      type,
      instructions,
      rewardPoints,
      punishmentId,
      punishmentQty,
    } = body;

    const serializedInstructions = Array.isArray(instructions)
      ? JSON.stringify(instructions.filter((s: string) => s.trim() !== ""))
      : typeof instructions === "string"
        ? instructions
        : JSON.stringify([]);

    const parsedPunishmentId =
      punishmentId && punishmentId !== "" && punishmentId !== "none"
        ? parseInt(String(punishmentId), 10)
        : null;

    const event = await prisma.agendaEvent.create({
      data: {
        dayNumber: parseInt(String(dayNumber), 10),
        startTime,
        endTime,
        title,
        type,
        instructions: serializedInstructions,
        rewardPoints: Math.max(0, parseInt(String(rewardPoints || 0), 10) || 0),
        punishmentId: parsedPunishmentId,
        punishmentQty: parsedPunishmentId
          ? Math.max(1, parseInt(String(punishmentQty || 1), 10) || 1)
          : null,
      },
      include: { punishment: true },
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error("Error creating event:", error);
    return NextResponse.json({ error: "Error creating event" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      dayNumber,
      startTime,
      endTime,
      title,
      type,
      instructions,
      rewardPoints,
      punishmentId,
      punishmentQty,
    } = body;

    const serializedInstructions = Array.isArray(instructions)
      ? JSON.stringify(instructions.filter((s: string) => s.trim() !== ""))
      : typeof instructions === "string"
        ? instructions
        : JSON.stringify([]);

    const parsedPunishmentId =
      punishmentId && punishmentId !== "" && punishmentId !== "none"
        ? parseInt(String(punishmentId), 10)
        : null;

    const event = await prisma.agendaEvent.update({
      where: { id: parseInt(String(id), 10) },
      data: {
        dayNumber: parseInt(String(dayNumber), 10),
        startTime,
        endTime,
        title,
        type,
        instructions: serializedInstructions,
        rewardPoints: Math.max(0, parseInt(String(rewardPoints || 0), 10) || 0),
        punishmentId: parsedPunishmentId,
        punishmentQty: parsedPunishmentId
          ? Math.max(1, parseInt(String(punishmentQty || 1), 10) || 1)
          : null,
      },
      include: { punishment: true },
    });

    return NextResponse.json(event);
  } catch (error) {
    console.error("Error updating event:", error);
    return NextResponse.json({ error: "Error updating event" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "No ID provided" }, { status: 400 });

    await prisma.agendaEvent.delete({
      where: { id: parseInt(id, 10) },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting event:", error);
    return NextResponse.json({ error: "Error deleting event" }, { status: 500 });
  }
}
