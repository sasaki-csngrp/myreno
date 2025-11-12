# フェーズ1: データベーススキーマの実装 詳細プラン

## 1. 概要

### 1.1 目的
レシピ、タグ、ユーザー設定、フォルダーのテーブルをPrismaスキーマに追加し、データベースマイグレーションを実行します。

### 1.2 前提条件
- フェーズ0が完了していること
- PostgreSQLデータベースが利用可能であること
- Prismaが既にセットアップされていること（認証実装時に設定済み）

---

## 2. Prismaスキーマの拡張

### 2.1 現在のスキーマの確認

現在の`prisma/schema.prisma`には、NextAuth.js用のモデル（User, Account, Session, VerificationToken）が定義されています。

### 2.2 追加するモデル

以下の4つのモデルを追加します：

1. **RenoRecipe** (`reno_recipes`テーブル): レシピマスタ（全ユーザー共通）
2. **RenoTagMaster** (`reno_tag_master`テーブル): タグマスタ（全ユーザー共通）
3. **RenoUserRecipePreference** (`reno_user_recipe_preferences`テーブル): ユーザー別レシピ設定
4. **RenoUserFolder** (`reno_user_folders`テーブル): ユーザーフォルダー

### 2.3 スキーマの実装

`prisma/schema.prisma`に以下のモデルを追加します：

```prisma
// レシピマスタ（全ユーザー共通）
model RenoRecipe {
  recipeId      Int    @id @map("recipe_id")
  title         String @db.VarChar(2000)
  imageUrl      String? @map("image_url") @db.VarChar(2000)
  tsukurepoCount Int    @default(0) @map("tsukurepo_count")
  isMainDish    Boolean @default(false) @map("is_main_dish")
  isSubDish     Boolean @default(false) @map("is_sub_dish")
  tag           String? @db.VarChar(2000) // タグ（スペース区切り文字列）

  // リレーション
  userPreferences RenoUserRecipePreference[]
  folders         RenoUserFolder[] @relation("RecipeFolders")

  @@index([tsukurepoCount(sort: Desc)], map: "idx_reno_recipes_tsukurepo")
  @@map("reno_recipes")
}

// タグマスタ（全ユーザー共通）
model RenoTagMaster {
  tagId    Int    @id @map("tag_id")
  level    Int?
  dispname String? @db.VarChar(2000)
  name     String? @db.VarChar(2000)
  l        String  @default("") @db.VarChar(255) // 大タグ
  m        String  @default("") @db.VarChar(255) // 中タグ
  s        String  @default("") @db.VarChar(255) // 小タグ
  ss       String  @default("") @db.VarChar(255) // 極小タグ

  @@index([level], map: "idx_reno_tag_master_level")
  @@index([name], map: "idx_reno_tag_master_name")
  @@map("reno_tag_master")
}

// ユーザー別レシピ設定
model RenoUserRecipePreference {
  userId   String  @map("user_id") @db.Uuid
  recipeId Int     @map("recipe_id")
  rank     Int     @default(0) // 0: いいねなし, 1: 好き, 2: まあまあ, 9: 好きじゃない
  comment  String? @db.Text

  // リレーション
  user  User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  recipe RenoRecipe @relation(fields: [recipeId], references: [recipeId], onDelete: Cascade)

  @@id([userId, recipeId])
  @@index([userId], map: "idx_reno_user_recipe_prefs_user")
  @@index([recipeId], map: "idx_reno_user_recipe_prefs_recipe")
  @@index([userId, rank], map: "idx_reno_user_recipe_prefs_rank")
  @@map("reno_user_recipe_preferences")
}

// ユーザーフォルダー
model RenoUserFolder {
  folderId     String  @id @default(dbgenerated("gen_random_uuid()")) @map("folder_id") @db.Uuid
  userId       String  @map("user_id") @db.Uuid
  folderName   String  @map("folder_name") @db.VarChar(255)
  idOfRecipes  String? @map("id_of_recipes") @db.VarChar(2000) // フォルダーに含まれるレシピID（スペース区切り文字列）

  // リレーション
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, folderName], map: "idx_reno_user_folders_user_name")
  @@index([userId], map: "idx_reno_user_folders_user")
  @@map("reno_user_folders")
}
```

### 2.4 Userモデルの拡張

既存の`User`モデルにリレーションを追加します：

```prisma
model User {
  id            String    @id @map("user_id") @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  email         String    @unique @db.VarChar(255)
  password      String?   @map("password") @db.VarChar(255)
  emailVerified DateTime? @map("email_verified") @db.Timestamp(6)
  name          String?   @db.VarChar(255)
  googleId      String?   @unique @map("google_id") @db.VarChar(255)
  image         String?   @map("image_url") @db.VarChar(2000)
  
  accounts      Account[]
  sessions      Session[]
  
  // 追加: レノちゃん用のリレーション
  recipePreferences RenoUserRecipePreference[]
  folders          RenoUserFolder[]

  @@index([email], map: "idx_reno_users_email")
  @@index([googleId], map: "idx_reno_users_google_id")
  @@map("reno_users")
}
```

### 2.5 スキーマの説明

#### RenoRecipeモデル
- **recipeId**: 主キー（クックパッドのレシピIDをそのまま使用）
- **title**: レシピタイトル
- **imageUrl**: レシピ画像URL
- **tsukurepoCount**: つくれぽ数
- **isMainDish**: 主菜フラグ
- **isSubDish**: 副菜フラグ
- **tag**: タグ（スペース区切り文字列）

#### RenoTagMasterモデル
- **tagId**: 主キー
- **level**: タグのレベル（0: 大タグ, 1: 中タグ, 2: 小タグ, 3: 極小タグ）
- **dispname**: 表示用名称
- **name**: 識別子（階層を連結）
- **l, m, s, ss**: 階層タグ（大タグ、中タグ、小タグ、極小タグ）

#### RenoUserRecipePreferenceモデル
- **userId, recipeId**: 複合主キー
- **rank**: 評価状態（0: いいねなし, 1: 好き, 2: まあまあ, 9: 好きじゃない）
- **comment**: ユーザーコメント

#### RenoUserFolderモデル
- **folderId**: 主キー（UUID）
- **userId**: ユーザーID（外部キー）
- **folderName**: フォルダー名
- **idOfRecipes**: フォルダーに含まれるレシピID（スペース区切り文字列）

---

## 3. マイグレーションの実行

### 3.1 マイグレーションファイルの生成

以下のコマンドでマイグレーションファイルを生成します：

```bash
npx prisma migrate dev --name add_reno_models
```

このコマンドは以下を実行します：
1. マイグレーションファイルの生成
2. データベースへの適用
3. Prisma Clientの再生成

### 3.2 マイグレーションファイルの確認

`prisma/migrations`ディレクトリにマイグレーションファイルが生成されていることを確認します。

### 3.3 エラーが発生した場合

**エラー: テーブルが既に存在する**
- 開発環境の場合、`prisma migrate reset`でデータベースをリセット
- 本番環境の場合、既存テーブルとの競合を確認

**エラー: 外部キー制約エラー**
- 既存のデータとの整合性を確認
- 必要に応じて、外部キー制約を一時的に無効化

---

## 4. Prisma Clientの再生成

マイグレーション実行後、Prisma Clientが自動的に再生成されます。手動で再生成する場合は：

```bash
npx prisma generate
```

---

## 5. データベース接続テスト

### 5.1 テストスクリプトの作成

`scripts/test-db-schema.ts`を作成：

```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testDatabaseSchema() {
  try {
    console.log('データベーススキーマのテストを開始します...')

    // 1. テーブルの存在確認
    console.log('\n1. テーブルの存在確認')
    const recipeCount = await prisma.renoRecipe.count()
    console.log(`✓ reno_recipes テーブル: ${recipeCount}件`)

    const tagCount = await prisma.renoTagMaster.count()
    console.log(`✓ reno_tag_master テーブル: ${tagCount}件`)

    const preferenceCount = await prisma.renoUserRecipePreference.count()
    console.log(`✓ reno_user_recipe_preferences テーブル: ${preferenceCount}件`)

    const folderCount = await prisma.renoUserFolder.count()
    console.log(`✓ reno_user_folders テーブル: ${folderCount}件`)

    // 2. インデックスの確認（クエリで確認）
    console.log('\n2. インデックスの確認')
    // インデックスはクエリの実行速度で確認
    const startTime = Date.now()
    await prisma.renoRecipe.findMany({
      orderBy: { tsukurepoCount: 'desc' },
      take: 10
    })
    const queryTime = Date.now() - startTime
    console.log(`✓ tsukurepo_count インデックス: クエリ時間 ${queryTime}ms`)

    // 3. リレーションの確認
    console.log('\n3. リレーションの確認')
    const user = await prisma.user.findFirst()
    if (user) {
      const userPreferences = await prisma.renoUserRecipePreference.findMany({
        where: { userId: user.id },
        take: 1
      })
      console.log(`✓ User ↔ RenoUserRecipePreference リレーション: OK`)
    }

    console.log('\n✓ すべてのテストが成功しました！')
  } catch (error) {
    console.error('✗ エラーが発生しました:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

testDatabaseSchema()
```

### 5.2 テストの実行

```bash
npx tsx scripts/test-db-schema.ts
```

### 5.3 期待される結果

以下のような出力が表示されます：

```
データベーススキーマのテストを開始します...

1. テーブルの存在確認
✓ reno_recipes テーブル: 0件
✓ reno_tag_master テーブル: 0件
✓ reno_user_recipe_preferences テーブル: 0件
✓ reno_user_folders テーブル: 0件

2. インデックスの確認
✓ tsukurepo_count インデックス: クエリ時間 XXms

3. リレーションの確認
✓ User ↔ RenoUserRecipePreference リレーション: OK

✓ すべてのテストが成功しました！
```

---

## 6. スキーマの検証

### 6.1 Prisma Studioでの確認

Prisma Studioを使用して、データベースの構造を視覚的に確認できます：

```bash
npx prisma studio
```

ブラウザで`http://localhost:5555`が開き、以下のテーブルが表示されることを確認します：
- reno_recipes
- reno_tag_master
- reno_user_recipe_preferences
- reno_user_folders

### 6.2 データベース直接確認（オプション）

PostgreSQLに直接接続して、テーブル構造を確認：

```sql
-- テーブル一覧の確認
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'reno_%';

-- インデックスの確認
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename LIKE 'reno_%';
```

---

## 7. 完了条件

以下のすべてが完了していることを確認してください：

- [ ] Prismaスキーマに4つのモデルが追加されている
- [ ] Userモデルにリレーションが追加されている
- [ ] マイグレーションが成功している
- [ ] Prisma Clientが再生成されている
- [ ] データベース接続テストが成功している
- [ ] Prisma Studioでテーブルが確認できる
- [ ] エラーが発生していない

---

## 8. 次のステップ

フェーズ1が完了したら、**フェーズ1.5: ナビゲーションバーの実装**に進みます。

---

## 9. 参考資料

- `docs/02_SOLUTION_DESIGN.md` の4.1節（データベーススキーマ詳細）
- `docs/database_schema` メモリ
- [Prisma Documentation](https://www.prisma.io/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

---

## 10. トラブルシューティング

### 10.1 よくあるエラーと対処法

**エラー: relation "reno_recipes" does not exist**
- マイグレーションが実行されていない可能性があります
- `npx prisma migrate dev`を再実行

**エラー: column "recipe_id" does not exist**
- マイグレーションファイルが正しく適用されていない可能性があります
- `npx prisma migrate reset`でリセットして再実行

**エラー: foreign key constraint fails**
- 既存データとの整合性を確認
- 必要に応じて、外部キー制約を一時的に無効化

---

## 11. 更新履歴

- 2024-XX-XX: 初版作成

