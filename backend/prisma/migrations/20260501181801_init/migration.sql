-- CreateTable
CREATE TABLE "channels" (
    "id" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "theme_color" TEXT NOT NULL,
    "icon" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_pool" (
    "id" UUID NOT NULL,
    "channel_id" UUID NOT NULL,
    "youtube_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "duration_sec" INTEGER NOT NULL,
    "is_broken" BOOLEAN NOT NULL DEFAULT false,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "video_pool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_entries" (
    "id" UUID NOT NULL,
    "channel_id" UUID NOT NULL,
    "video_youtube_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "duration_sec" INTEGER NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "fallback_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "schedule_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "user_id" UUID,
    "tv_socket_id" TEXT,
    "remote_socket_id" TEXT,
    "current_channel_id" UUID,
    "last_activity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "broken_videos" (
    "id" UUID NOT NULL,
    "youtube_id" TEXT NOT NULL,
    "error_code" INTEGER NOT NULL,
    "marked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "broken_videos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "channels_number_key" ON "channels"("number");

-- CreateIndex
CREATE UNIQUE INDEX "channels_slug_key" ON "channels"("slug");

-- CreateIndex
CREATE INDEX "video_pool_channel_id_is_broken_idx" ON "video_pool"("channel_id", "is_broken");

-- CreateIndex
CREATE UNIQUE INDEX "video_pool_channel_id_youtube_id_key" ON "video_pool"("channel_id", "youtube_id");

-- CreateIndex
CREATE INDEX "schedule_entries_channel_id_start_time_end_time_idx" ON "schedule_entries"("channel_id", "start_time", "end_time");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_code_key" ON "sessions"("code");

-- CreateIndex
CREATE INDEX "sessions_code_idx" ON "sessions"("code");

-- CreateIndex
CREATE INDEX "broken_videos_youtube_id_idx" ON "broken_videos"("youtube_id");

-- AddForeignKey
ALTER TABLE "video_pool" ADD CONSTRAINT "video_pool_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_entries" ADD CONSTRAINT "schedule_entries_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_current_channel_id_fkey" FOREIGN KEY ("current_channel_id") REFERENCES "channels"("id") ON DELETE SET NULL ON UPDATE CASCADE;
