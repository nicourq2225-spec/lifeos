import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateCycleAndWeek } from "@/lib/agendaDefaults";

export async function POST(request: Request) {
  try {
    const { eventId, status, dateStr } = await request.json();

    const event = await prisma.agendaEvent.findUnique({
      where: { id: parseInt(String(eventId), 10) },
      include: { punishment: true },
    });

    if (!event) {
      return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });
    }

    const settings = await prisma.settings.findFirst();
    const cycleInfo = calculateCycleAndWeek(settings?.cycleStartDate, dateStr);

    const targetDateStr = cycleInfo.todayStr;
    const weekStartStr = cycleInfo.weekStartStr;

    const existingLog = await prisma.agendaEventLog.findFirst({
      where: {
        eventId: event.id,
        dateStr: targetDateStr,
      },
    });

    const isCompleted = status === "COMPLETADO";
    const pointsAwarded = isCompleted ? event.rewardPoints || 0 : 0;
    const hasPunishment = !isCompleted && event.punishment;

    const logData = {
      eventId: event.id,
      dateStr: targetDateStr,
      weekStartStr,
      cycleDay: event.dayNumber,
      status: isCompleted ? "COMPLETADO" : "PROCRASTINADO",
      pointsAwarded,
      punishmentName: hasPunishment ? event.punishment!.name : null,
      punishmentUnit: hasPunishment ? event.punishment!.unit : null,
      punishmentQty: hasPunishment
        ? event.punishmentQty || event.punishment!.defaultQty || 1
        : null,
      punishmentSettled: isCompleted ? true : !hasPunishment,
    };

    const savedLog = existingLog
      ? await prisma.agendaEventLog.update({
          where: { id: existingLog.id },
          data: logData,
          include: { event: true },
        })
      : await prisma.agendaEventLog.create({
          data: logData,
          include: { event: true },
        });

    return NextResponse.json(savedLog);
  } catch (error) {
    console.error("Error logging agenda event:", error);
    return NextResponse.json({ error: "Error logging event status" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { logId, punishmentSettled } = await request.json();

    const updated = await prisma.agendaEventLog.update({
      where: { id: parseInt(String(logId), 10) },
      data: {
        punishmentSettled:
          punishmentSettled !== undefined ? Boolean(punishmentSettled) : true,
      },
      include: { event: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: "Error settling punishment" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "No ID provided" }, { status: 400 });

    await prisma.agendaEventLog.delete({
      where: { id: parseInt(id, 10) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Error deleting event log" }, { status: 500 });
  }
}
