import { prisma } from "@csaladi-utazas/database";
import { requireAuthUserId } from "@/lib/auth";

export async function fetchPendingFamilyLinkRequests() {
  const userId = await requireAuthUserId();

  return prisma.familyMember.findMany({
    where: {
      pendingLinkUserId: userId,
      linkedUserId: null,
      userId: { not: null },
    },
    select: {
      id: true,
      name: true,
      email: true,
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { name: "asc" },
  });
}

export async function fetchUnseenFamilyLinkProposalOutcomes() {
  const userId = await requireAuthUserId();

  return prisma.familyMember.findMany({
    where: {
      userId,
      linkProposalOutcome: { in: ["ACCEPTED", "REJECTED"] },
      linkProposalOutcomeSeenAt: null,
    },
    select: {
      id: true,
      name: true,
      linkProposalOutcome: true,
      linkProposalOutcomeAt: true,
      linkedUser: { select: { id: true, name: true, email: true } },
      linkProposalRespondedUser: { select: { id: true, name: true, email: true } },
    },
    orderBy: { linkProposalOutcomeAt: "desc" },
  });
}

export type PendingFamilyLinkRequest = Awaited<
  ReturnType<typeof fetchPendingFamilyLinkRequests>
>[number];

export type FamilyLinkProposalOutcome = Awaited<
  ReturnType<typeof fetchUnseenFamilyLinkProposalOutcomes>
>[number];
