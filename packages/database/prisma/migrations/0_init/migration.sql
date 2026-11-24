-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatarStoragePath" TEXT,
    "avatarMimeType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "family_members" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "isChild" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT,
    "linkedUserId" TEXT,
    "pendingLinkUserId" TEXT,
    "linkProposalOutcome" TEXT,
    "linkProposalOutcomeAt" TIMESTAMP(3),
    "linkProposalOutcomeSeenAt" TIMESTAMP(3),
    "linkProposalRespondedUserId" TEXT,

    CONSTRAINT "family_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trips" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "budgetAmount" DOUBLE PRECISION,
    "budgetCurrency" TEXT NOT NULL DEFAULT 'HUF',
    "coverStoragePath" TEXT,
    "coverMimeType" TEXT,
    "tripType" TEXT,
    "isTemplate" BOOLEAN NOT NULL DEFAULT false,
    "contentUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "inviteCode" TEXT,

    CONSTRAINT "trips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_collaborators" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'EDITOR',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_collaborators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_participants" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "familyMemberId" TEXT NOT NULL,

    CONSTRAINT "trip_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "programs" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "ideaId" TEXT,
    "title" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "location" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "url" TEXT NOT NULL,

    CONSTRAINT "programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_ideas" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "amount" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'HUF',
    "amountScope" TEXT NOT NULL DEFAULT 'TOTAL',
    "category" TEXT NOT NULL DEFAULT 'OTHER',
    "date" TIMESTAMP(3),
    "startTime" TEXT,
    "endTime" TEXT,
    "checkInDate" TIMESTAMP(3),
    "checkOutDate" TIMESTAMP(3),
    "note" TEXT,
    "voteDeadline" TIMESTAMP(3),
    "decision" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_ideas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accommodations" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "ideaId" TEXT,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "checkIn" TIMESTAMP(3) NOT NULL,
    "checkOut" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "note" TEXT,

    CONSTRAINT "accommodations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accommodation_participants" (
    "id" TEXT NOT NULL,
    "accommodationId" TEXT NOT NULL,
    "familyMemberId" TEXT NOT NULL,

    CONSTRAINT "accommodation_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transports" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "ideaId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'OTHER',
    "title" TEXT NOT NULL,
    "departureDate" TIMESTAMP(3) NOT NULL,
    "departureTime" TEXT,
    "arrivalDate" TIMESTAMP(3),
    "arrivalTime" TEXT,
    "fromLocation" TEXT,
    "toLocation" TEXT,
    "fromLat" DOUBLE PRECISION,
    "fromLng" DOUBLE PRECISION,
    "toLat" DOUBLE PRECISION,
    "toLng" DOUBLE PRECISION,
    "bookingRef" TEXT,
    "url" TEXT,
    "note" TEXT,

    CONSTRAINT "transports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transport_participants" (
    "id" TEXT NOT NULL,
    "transportId" TEXT NOT NULL,
    "familyMemberId" TEXT NOT NULL,

    CONSTRAINT "transport_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_idea_messages" (
    "id" TEXT NOT NULL,
    "ideaId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_idea_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_idea_interests" (
    "id" TEXT NOT NULL,
    "ideaId" TEXT NOT NULL,
    "familyMemberId" TEXT NOT NULL,

    CONSTRAINT "trip_idea_interests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "program_participants" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "familyMemberId" TEXT NOT NULL,

    CONSTRAINT "program_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "costs" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "programId" TEXT,
    "accommodationId" TEXT,
    "transportId" TEXT,
    "paidByFamilyMemberId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'HUF',
    "amountScope" TEXT NOT NULL DEFAULT 'TOTAL',
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,

    CONSTRAINT "costs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "programId" TEXT,
    "accommodationId" TEXT,
    "transportId" TEXT,
    "familyMemberId" TEXT,
    "category" TEXT NOT NULL DEFAULT 'OTHER',
    "fileName" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "takenAt" TIMESTAMP(3),
    "locationLabel" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_activities" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settlement_payments" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "fromFamilyMemberId" TEXT NOT NULL,
    "toFamilyMemberId" TEXT NOT NULL,
    "amountHuf" INTEGER NOT NULL,
    "note" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" TEXT NOT NULL,

    CONSTRAINT "settlement_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packing_items" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "assigneeFamilyMemberId" TEXT,
    "isPacked" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "packing_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_notification_dismissals" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reminderKey" TEXT NOT NULL,
    "dismissedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_notification_dismissals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_inbox_notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "href" TEXT,
    "tripId" TEXT,
    "tripTitle" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dismissedAt" TIMESTAMP(3),

    CONSTRAINT "user_inbox_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "lastDigestDay" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_push_preferences" (
    "userId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "categories" TEXT NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_push_preferences_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "family_members_userId_idx" ON "family_members"("userId");

-- CreateIndex
CREATE INDEX "family_members_linkedUserId_idx" ON "family_members"("linkedUserId");

-- CreateIndex
CREATE INDEX "family_members_pendingLinkUserId_idx" ON "family_members"("pendingLinkUserId");

-- CreateIndex
CREATE INDEX "family_members_email_idx" ON "family_members"("email");

-- CreateIndex
CREATE UNIQUE INDEX "trips_inviteCode_key" ON "trips"("inviteCode");

-- CreateIndex
CREATE INDEX "trips_userId_startDate_idx" ON "trips"("userId", "startDate");

-- CreateIndex
CREATE INDEX "trips_startDate_endDate_idx" ON "trips"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "trips_isTemplate_idx" ON "trips"("isTemplate");

-- CreateIndex
CREATE INDEX "trip_collaborators_userId_idx" ON "trip_collaborators"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "trip_collaborators_tripId_userId_key" ON "trip_collaborators"("tripId", "userId");

-- CreateIndex
CREATE INDEX "trip_participants_tripId_idx" ON "trip_participants"("tripId");

-- CreateIndex
CREATE UNIQUE INDEX "trip_participants_tripId_familyMemberId_key" ON "trip_participants"("tripId", "familyMemberId");

-- CreateIndex
CREATE INDEX "programs_tripId_idx" ON "programs"("tripId");

-- CreateIndex
CREATE INDEX "programs_ideaId_idx" ON "programs"("ideaId");

-- CreateIndex
CREATE INDEX "programs_date_idx" ON "programs"("date");

-- CreateIndex
CREATE INDEX "trip_ideas_tripId_idx" ON "trip_ideas"("tripId");

-- CreateIndex
CREATE INDEX "accommodations_tripId_idx" ON "accommodations"("tripId");

-- CreateIndex
CREATE INDEX "accommodations_ideaId_idx" ON "accommodations"("ideaId");

-- CreateIndex
CREATE INDEX "accommodations_checkIn_idx" ON "accommodations"("checkIn");

-- CreateIndex
CREATE INDEX "accommodation_participants_accommodationId_idx" ON "accommodation_participants"("accommodationId");

-- CreateIndex
CREATE UNIQUE INDEX "accommodation_participants_accommodationId_familyMemberId_key" ON "accommodation_participants"("accommodationId", "familyMemberId");

-- CreateIndex
CREATE INDEX "transports_tripId_idx" ON "transports"("tripId");

-- CreateIndex
CREATE INDEX "transports_ideaId_idx" ON "transports"("ideaId");

-- CreateIndex
CREATE INDEX "transports_departureDate_idx" ON "transports"("departureDate");

-- CreateIndex
CREATE INDEX "transport_participants_transportId_idx" ON "transport_participants"("transportId");

-- CreateIndex
CREATE UNIQUE INDEX "transport_participants_transportId_familyMemberId_key" ON "transport_participants"("transportId", "familyMemberId");

-- CreateIndex
CREATE INDEX "trip_idea_messages_ideaId_createdAt_idx" ON "trip_idea_messages"("ideaId", "createdAt");

-- CreateIndex
CREATE INDEX "trip_idea_interests_ideaId_idx" ON "trip_idea_interests"("ideaId");

-- CreateIndex
CREATE UNIQUE INDEX "trip_idea_interests_ideaId_familyMemberId_key" ON "trip_idea_interests"("ideaId", "familyMemberId");

-- CreateIndex
CREATE INDEX "program_participants_programId_idx" ON "program_participants"("programId");

-- CreateIndex
CREATE UNIQUE INDEX "program_participants_programId_familyMemberId_key" ON "program_participants"("programId", "familyMemberId");

-- CreateIndex
CREATE INDEX "costs_tripId_idx" ON "costs"("tripId");

-- CreateIndex
CREATE INDEX "costs_programId_idx" ON "costs"("programId");

-- CreateIndex
CREATE INDEX "costs_accommodationId_idx" ON "costs"("accommodationId");

-- CreateIndex
CREATE INDEX "costs_transportId_idx" ON "costs"("transportId");

-- CreateIndex
CREATE INDEX "costs_paidByFamilyMemberId_idx" ON "costs"("paidByFamilyMemberId");

-- CreateIndex
CREATE INDEX "documents_tripId_idx" ON "documents"("tripId");

-- CreateIndex
CREATE INDEX "documents_programId_idx" ON "documents"("programId");

-- CreateIndex
CREATE INDEX "documents_accommodationId_idx" ON "documents"("accommodationId");

-- CreateIndex
CREATE INDEX "documents_transportId_idx" ON "documents"("transportId");

-- CreateIndex
CREATE INDEX "documents_category_idx" ON "documents"("category");

-- CreateIndex
CREATE INDEX "documents_familyMemberId_idx" ON "documents"("familyMemberId");

-- CreateIndex
CREATE INDEX "documents_takenAt_idx" ON "documents"("takenAt");

-- CreateIndex
CREATE INDEX "trip_activities_tripId_createdAt_idx" ON "trip_activities"("tripId", "createdAt");

-- CreateIndex
CREATE INDEX "settlement_payments_tripId_idx" ON "settlement_payments"("tripId");

-- CreateIndex
CREATE INDEX "packing_items_tripId_idx" ON "packing_items"("tripId");

-- CreateIndex
CREATE INDEX "user_notification_dismissals_userId_idx" ON "user_notification_dismissals"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_notification_dismissals_userId_reminderKey_key" ON "user_notification_dismissals"("userId", "reminderKey");

-- CreateIndex
CREATE INDEX "user_inbox_notifications_userId_dismissedAt_idx" ON "user_inbox_notifications"("userId", "dismissedAt");

-- CreateIndex
CREATE INDEX "user_inbox_notifications_userId_createdAt_idx" ON "user_inbox_notifications"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "push_subscriptions_userId_idx" ON "push_subscriptions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_userId_endpoint_key" ON "push_subscriptions"("userId", "endpoint");

-- AddForeignKey
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_linkedUserId_fkey" FOREIGN KEY ("linkedUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_pendingLinkUserId_fkey" FOREIGN KEY ("pendingLinkUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_linkProposalRespondedUserId_fkey" FOREIGN KEY ("linkProposalRespondedUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_collaborators" ADD CONSTRAINT "trip_collaborators_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_collaborators" ADD CONSTRAINT "trip_collaborators_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_participants" ADD CONSTRAINT "trip_participants_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_participants" ADD CONSTRAINT "trip_participants_familyMemberId_fkey" FOREIGN KEY ("familyMemberId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programs" ADD CONSTRAINT "programs_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programs" ADD CONSTRAINT "programs_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "trip_ideas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_ideas" ADD CONSTRAINT "trip_ideas_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accommodations" ADD CONSTRAINT "accommodations_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accommodations" ADD CONSTRAINT "accommodations_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "trip_ideas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accommodation_participants" ADD CONSTRAINT "accommodation_participants_accommodationId_fkey" FOREIGN KEY ("accommodationId") REFERENCES "accommodations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accommodation_participants" ADD CONSTRAINT "accommodation_participants_familyMemberId_fkey" FOREIGN KEY ("familyMemberId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transports" ADD CONSTRAINT "transports_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transports" ADD CONSTRAINT "transports_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "trip_ideas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_participants" ADD CONSTRAINT "transport_participants_transportId_fkey" FOREIGN KEY ("transportId") REFERENCES "transports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_participants" ADD CONSTRAINT "transport_participants_familyMemberId_fkey" FOREIGN KEY ("familyMemberId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_idea_messages" ADD CONSTRAINT "trip_idea_messages_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "trip_ideas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_idea_messages" ADD CONSTRAINT "trip_idea_messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_idea_interests" ADD CONSTRAINT "trip_idea_interests_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "trip_ideas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_idea_interests" ADD CONSTRAINT "trip_idea_interests_familyMemberId_fkey" FOREIGN KEY ("familyMemberId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_participants" ADD CONSTRAINT "program_participants_programId_fkey" FOREIGN KEY ("programId") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_participants" ADD CONSTRAINT "program_participants_familyMemberId_fkey" FOREIGN KEY ("familyMemberId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "costs" ADD CONSTRAINT "costs_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "costs" ADD CONSTRAINT "costs_programId_fkey" FOREIGN KEY ("programId") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "costs" ADD CONSTRAINT "costs_accommodationId_fkey" FOREIGN KEY ("accommodationId") REFERENCES "accommodations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "costs" ADD CONSTRAINT "costs_transportId_fkey" FOREIGN KEY ("transportId") REFERENCES "transports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "costs" ADD CONSTRAINT "costs_paidByFamilyMemberId_fkey" FOREIGN KEY ("paidByFamilyMemberId") REFERENCES "family_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_programId_fkey" FOREIGN KEY ("programId") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_accommodationId_fkey" FOREIGN KEY ("accommodationId") REFERENCES "accommodations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_transportId_fkey" FOREIGN KEY ("transportId") REFERENCES "transports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_familyMemberId_fkey" FOREIGN KEY ("familyMemberId") REFERENCES "family_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_activities" ADD CONSTRAINT "trip_activities_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_activities" ADD CONSTRAINT "trip_activities_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlement_payments" ADD CONSTRAINT "settlement_payments_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlement_payments" ADD CONSTRAINT "settlement_payments_fromFamilyMemberId_fkey" FOREIGN KEY ("fromFamilyMemberId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlement_payments" ADD CONSTRAINT "settlement_payments_toFamilyMemberId_fkey" FOREIGN KEY ("toFamilyMemberId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlement_payments" ADD CONSTRAINT "settlement_payments_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packing_items" ADD CONSTRAINT "packing_items_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packing_items" ADD CONSTRAINT "packing_items_assigneeFamilyMemberId_fkey" FOREIGN KEY ("assigneeFamilyMemberId") REFERENCES "family_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_notification_dismissals" ADD CONSTRAINT "user_notification_dismissals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_inbox_notifications" ADD CONSTRAINT "user_inbox_notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_push_preferences" ADD CONSTRAINT "user_push_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

