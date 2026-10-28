import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { databaseErrorResponse, withDbRetry } from "@/lib/db";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();

  if (!user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  const { id } = await context.params;
  const payload = (await request.json()) as {
    text: string;
    source?: "voice" | "typed";
    latitude?: number;
    longitude?: number;
    locationStatus?: string;
  };

  if (!payload.text?.trim()) {
    return NextResponse.json({ error: "Note text is required" }, { status: 400 });
  }

  try {
    const job = await withDbRetry(() =>
      prisma.job.findUnique({
        where: { id },
        select: { id: true, status: true },
      }),
    );

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const note = await withDbRetry(() =>
      prisma.jobNote.create({
        data: {
          jobId: id,
          userId: user.userId,
          text: payload.text.trim(),
          source: payload.source === "voice" ? "voice" : "typed",
          latitude: payload.latitude,
          longitude: payload.longitude,
          locationStatus: payload.locationStatus,
        },
        include: {
          user: {
            select: {
              name: true,
              username: true,
            },
          },
        },
      }),
    );

    if (job.status === "TODO") {
      await withDbRetry(() =>
        prisma.job.update({
          where: { id },
          data: {
            status: "ACTIVE",
          },
        }),
      );
    }

    return NextResponse.json({ note }, { status: 201 });
  } catch (error) {
    const { error: message, status } = databaseErrorResponse(error, "Could not save note");
    return NextResponse.json({ error: message }, { status });
  }
}
