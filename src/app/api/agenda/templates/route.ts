import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function normalizeInstructions(instructions: unknown): string {
  if (!instructions) return JSON.stringify([]);
  if (Array.isArray(instructions)) {
    return JSON.stringify(
      instructions.map((s) => String(s).trim()).filter(Boolean)
    );
  }
  if (typeof instructions === "string") {
    try {
      const parsed = JSON.parse(instructions);
      if (Array.isArray(parsed)) {
        return JSON.stringify(parsed.map((s) => String(s).trim()).filter(Boolean));
      }
    } catch {
      const lines = instructions
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      return JSON.stringify(lines);
    }
  }
  return JSON.stringify([]);
}

export async function GET() {
  try {
    const templates = await prisma.agendaTemplate.findMany({
      include: { punishment: true },
      orderBy: { id: "asc" },
    });
    return NextResponse.json(templates);
  } catch (error) {
    return NextResponse.json(
      { error: "Error fetching templates" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const {
      title,
      type,
      instructions,
      rewardPoints,
      punishmentId,
      punishmentQty,
    } = await request.json();

    const parsedRewardPoints = Math.max(
      0,
      parseInt(String(rewardPoints ?? 0), 10) || 0
    );
    const parsedPunishmentId =
      punishmentId && punishmentId !== "none"
        ? parseInt(String(punishmentId), 10)
        : null;
    const parsedPunishmentQty = parsedPunishmentId
      ? Math.max(1, parseInt(String(punishmentQty ?? 1), 10) || 1)
      : null;

    const template = await prisma.agendaTemplate.create({
      data: {
        title,
        type: type || "obligacion",
        instructions: normalizeInstructions(instructions),
        rewardPoints: parsedRewardPoints,
        punishmentId: parsedPunishmentId,
        punishmentQty: parsedPunishmentQty,
      },
      include: { punishment: true },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Error creating template" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const {
      id,
      title,
      type,
      instructions,
      rewardPoints,
      punishmentId,
      punishmentQty,
    } = await request.json();

    const parsedRewardPoints = Math.max(
      0,
      parseInt(String(rewardPoints ?? 0), 10) || 0
    );
    const parsedPunishmentId =
      punishmentId && punishmentId !== "none"
        ? parseInt(String(punishmentId), 10)
        : null;
    const parsedPunishmentQty = parsedPunishmentId
      ? Math.max(1, parseInt(String(punishmentQty ?? 1), 10) || 1)
      : null;

    const template = await prisma.agendaTemplate.update({
      where: { id: parseInt(String(id), 10) },
      data: {
        title,
        type: type || "obligacion",
        instructions: normalizeInstructions(instructions),
        rewardPoints: parsedRewardPoints,
        punishmentId: parsedPunishmentId,
        punishmentQty: parsedPunishmentQty,
      },
      include: { punishment: true },
    });

    return NextResponse.json(template);
  } catch (error) {
    return NextResponse.json(
      { error: "Error updating template" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "No ID provided" }, { status: 400 });
    }

    await prisma.agendaTemplate.delete({
      where: { id: parseInt(id, 10) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Error deleting template" },
      { status: 500 }
    );
  }
}
