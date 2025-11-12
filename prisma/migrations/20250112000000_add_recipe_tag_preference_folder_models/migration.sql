-- CreateTable: reno_recipes (レシピマスタ)
CREATE TABLE IF NOT EXISTS "public"."reno_recipes" (
    "recipe_id" INTEGER NOT NULL,
    "title" VARCHAR(2000) NOT NULL,
    "image_url" VARCHAR(2000),
    "tsukurepo_count" INTEGER NOT NULL DEFAULT 0,
    "is_main_dish" BOOLEAN NOT NULL DEFAULT false,
    "is_sub_dish" BOOLEAN NOT NULL DEFAULT false,
    "tag" VARCHAR(2000),

    CONSTRAINT "reno_recipes_pkey" PRIMARY KEY ("recipe_id")
);

-- CreateIndex: idx_reno_recipes_tsukurepo
CREATE INDEX IF NOT EXISTS "idx_reno_recipes_tsukurepo" ON "public"."reno_recipes"("tsukurepo_count" DESC);

-- CreateTable: reno_tag_master (タグマスタ)
CREATE TABLE IF NOT EXISTS "public"."reno_tag_master" (
    "tag_id" INTEGER NOT NULL,
    "level" INTEGER,
    "dispname" VARCHAR(2000),
    "name" VARCHAR(2000),
    "l" VARCHAR(255) NOT NULL DEFAULT '',
    "m" VARCHAR(255) NOT NULL DEFAULT '',
    "s" VARCHAR(255) NOT NULL DEFAULT '',
    "ss" VARCHAR(255) NOT NULL DEFAULT '',

    CONSTRAINT "reno_tag_master_pkey" PRIMARY KEY ("tag_id")
);

-- CreateIndex: idx_reno_tag_master_level
CREATE INDEX IF NOT EXISTS "idx_reno_tag_master_level" ON "public"."reno_tag_master"("level");

-- CreateIndex: idx_reno_tag_master_name
CREATE INDEX IF NOT EXISTS "idx_reno_tag_master_name" ON "public"."reno_tag_master"("name");

-- CreateTable: reno_user_recipe_preferences (ユーザー別レシピ設定)
CREATE TABLE IF NOT EXISTS "public"."reno_user_recipe_preferences" (
    "user_id" UUID NOT NULL,
    "recipe_id" INTEGER NOT NULL,
    "rank" INTEGER NOT NULL DEFAULT 0,
    "comment" TEXT,

    CONSTRAINT "reno_user_recipe_preferences_pkey" PRIMARY KEY ("user_id","recipe_id")
);

-- CreateIndex: idx_reno_user_recipe_prefs_user
CREATE INDEX IF NOT EXISTS "idx_reno_user_recipe_prefs_user" ON "public"."reno_user_recipe_preferences"("user_id");

-- CreateIndex: idx_reno_user_recipe_prefs_recipe
CREATE INDEX IF NOT EXISTS "idx_reno_user_recipe_prefs_recipe" ON "public"."reno_user_recipe_preferences"("recipe_id");

-- CreateIndex: idx_reno_user_recipe_prefs_rank
CREATE INDEX IF NOT EXISTS "idx_reno_user_recipe_prefs_rank" ON "public"."reno_user_recipe_preferences"("user_id","rank");

-- CreateTable: reno_user_folders (ユーザーフォルダー)
CREATE TABLE IF NOT EXISTS "public"."reno_user_folders" (
    "folder_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "folder_name" VARCHAR(255) NOT NULL,
    "id_of_recipes" VARCHAR(2000),

    CONSTRAINT "reno_user_folders_pkey" PRIMARY KEY ("folder_id")
);

-- CreateIndex: idx_reno_user_folders_user
CREATE INDEX IF NOT EXISTS "idx_reno_user_folders_user" ON "public"."reno_user_folders"("user_id");

-- CreateIndex: idx_reno_user_folders_user_name
CREATE UNIQUE INDEX IF NOT EXISTS "idx_reno_user_folders_user_name" ON "public"."reno_user_folders"("user_id","folder_name");

-- AddForeignKey: reno_user_recipe_preferences -> reno_users
ALTER TABLE "public"."reno_user_recipe_preferences" ADD CONSTRAINT "reno_user_recipe_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."reno_users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: reno_user_recipe_preferences -> reno_recipes
ALTER TABLE "public"."reno_user_recipe_preferences" ADD CONSTRAINT "reno_user_recipe_preferences_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "public"."reno_recipes"("recipe_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: reno_user_folders -> reno_users
ALTER TABLE "public"."reno_user_folders" ADD CONSTRAINT "reno_user_folders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."reno_users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

