import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const punishments = await prisma.punishment.findMany({
      orderBy: { id: "asc" },
    });
    return NextResponse.json(punishments);
  } catch (error) {
    return NextResponse.json({ error: "Error fetching punishments" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, unit, defaultQty } = await request.json();
    const punishment = await prisma.punishment.create({
      data: {
        name,
        unit: unit || "repeticiones",
        defaultQty: Math.max(1, parseInt(String(defaultQty || 1), 10) || 1),
      },
    });
    return NextResponse.json(punishment, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Error creating punishment" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { id, name, unit, defaultQty } = await request.json();
    const punishment = await prisma.punishment.update({
      where: { id: parseInt(String(id), 10) },
      data: {
        name,
        unit: unit || "repeticiones",
        defaultQty: Math.max(1, parseInt(String(defaultQty || 1), 10) || 1),
      },
    });
    return NextResponse.json(punishment);
  } catch (error) {
    return NextResponse.json({ error: "Error updating punishment" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "No ID provided" }, { status: 400 });

    await prisma.punishment.delete({
      where: { id: parseInt(id, 10) },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Error deleting punishment" }, { status: 500 });
  }
}
