import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const rules = await prisma.dayRule.findMany({ orderBy: { id: "asc" } });
    return NextResponse.json(rules);
  } catch (error) {
    return NextResponse.json({ error: "Error fetching rules" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, description, reason, applyToAllDays, assignedDays, active } =
      await request.json();

    const daysStr = applyToAllDays
      ? "1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21"
      : Array.isArray(assignedDays)
        ? assignedDays.join(",")
        : String(assignedDays || "");

    const rule = await prisma.dayRule.create({
      data: {
        name,
        description,
        reason,
        applyToAllDays: Boolean(applyToAllDays),
        assignedDays: daysStr,
        active: active !== undefined ? Boolean(active) : true,
      },
    });

    return NextResponse.json(rule, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Error creating rule" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { id, name, description, reason, applyToAllDays, assignedDays, active } =
      await request.json();

    const daysStr = applyToAllDays
      ? "1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21"
      : Array.isArray(assignedDays)
        ? assignedDays.join(",")
        : String(assignedDays || "");

    const rule = await prisma.dayRule.update({
      where: { id: parseInt(String(id), 10) },
      data: {
        name,
        description,
        reason,
        applyToAllDays: Boolean(applyToAllDays),
        assignedDays: daysStr,
        active: active !== undefined ? Boolean(active) : true,
      },
    });

    return NextResponse.json(rule);
  } catch (error) {
    return NextResponse.json({ error: "Error updating rule" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "No ID provided" }, { status: 400 });

    await prisma.dayRule.delete({
      where: { id: parseInt(id, 10) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Error deleting rule" }, { status: 500 });
  }
}
