import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateCycleAndWeek } from "@/lib/agendaDefaults";

export async function GET() {
  try {
    const rewards = await prisma.rewardItem.findMany({
      orderBy: { costPoints: "asc" },
    });
    return NextResponse.json(rewards);
  } catch (error) {
    return NextResponse.json({ error: "Error fetching rewards" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Si es una acción de canje de premio
    if (body.action === "REDEEM") {
      const { rewardItemId } = body;
      const reward = await prisma.rewardItem.findUnique({
        where: { id: parseInt(String(rewardItemId), 10) },
      });

      if (!reward) {
        return NextResponse.json({ error: "Premio no encontrado" }, { status: 404 });
      }

      const settings = await prisma.settings.findFirst();
      const cycleInfo = calculateCycleAndWeek(settings?.cycleStartDate, body.dateStr);

      const [weekLogs, weekRedemptions] = await Promise.all([
        prisma.agendaEventLog.findMany({
          where: { weekStartStr: cycleInfo.weekStartStr, status: "COMPLETADO" },
        }),
        prisma.rewardRedemption.findMany({
          where: { weekStartStr: cycleInfo.weekStartStr },
        }),
      ]);

      const earned = weekLogs.reduce((acc, l) => acc + (l.pointsAwarded || 0), 0);
      const spent = weekRedemptions.reduce((acc, r) => acc + (r.costPoints || 0), 0);
      const available = Math.max(0, earned - spent);

      if (available < reward.costPoints) {
        return NextResponse.json(
          { error: `Puntos insuficientes en la semana actual (${available}/${reward.costPoints} pts)` },
          { status: 400 }
        );
      }

      const redemption = await prisma.rewardRedemption.create({
        data: {
          rewardItemId: reward.id,
          rewardName: reward.name,
          costPoints: reward.costPoints,
          dateStr: cycleInfo.todayStr,
          weekStartStr: cycleInfo.weekStartStr,
        },
      });

      return NextResponse.json({
        redemption,
        newAvailablePoints: available - reward.costPoints,
      });
    }

    // Creación normal en catálogo CRUD de Premios
    const { name, description, costPoints } = body;
    const reward = await prisma.rewardItem.create({
      data: {
        name,
        description: description || null,
        costPoints: Math.max(1, parseInt(String(costPoints || 10), 10) || 10),
      },
    });
    return NextResponse.json(reward, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Error processing reward" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { id, name, description, costPoints } = await request.json();
    const reward = await prisma.rewardItem.update({
      where: { id: parseInt(String(id), 10) },
      data: {
        name,
        description: description || null,
        costPoints: Math.max(1, parseInt(String(costPoints || 10), 10) || 10),
      },
    });
    return NextResponse.json(reward);
  } catch (error) {
    return NextResponse.json({ error: "Error updating reward" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "No ID provided" }, { status: 400 });

    await prisma.rewardItem.delete({
      where: { id: parseInt(id, 10) },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Error deleting reward" }, { status: 500 });
  }
}
