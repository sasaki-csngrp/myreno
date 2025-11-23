/**
 * タグ関連のデータベース関数
 */

import { sql } from '@vercel/postgres';
import type { Tag } from '@/lib/types/recipe';

/**
 * レベル別タグを取得
 * @param level タグのレベル（0: 大タグ, 1: 中タグ, 2: 小タグ, 3: 極小タグ）
 * @param parentTagName 親タグ名（階層ナビゲーション用、空文字列の場合は大タグを取得）
 * @returns タグ一覧
 */
export async function getTagsByLevel(
  level: number,
  parentTagName: string = ""
): Promise<Tag[]> {
  let query: string;
  let params: (string | number)[];
  
  // 子タグ数の条件
  let childTagCondition: string;
  if (level === 0) {
    childTagCondition = `tag.l = t.l`;
  } else if (level === 1) {
    childTagCondition = `tag.l || tag.m = t.l || t.m`;
  } else if (level === 2) {
    childTagCondition = `tag.l || tag.m || tag.s = t.l || t.m || t.s`;
  } else {
    childTagCondition = `tag.l || tag.m || tag.s || tag.ss = t.l || t.m || t.s || t.ss`;
  }
  
  query = `
    SELECT
      t.tag_id as "tagId",
      t.dispname,
      t.name,
      (SELECT image_url FROM reno_recipes 
       WHERE tag IS NOT NULL AND tag != '' AND tag LIKE '%' || t.name || '%' 
       ORDER BY tsukurepo_count DESC, recipe_id DESC LIMIT 1) AS "imageUri",
      (SELECT COUNT(*) FROM reno_tag_master tag
       WHERE tag.level = t.level + 1 AND ${childTagCondition}) AS "childTagCount",
      (SELECT COUNT(*) FROM reno_recipes 
       WHERE tag IS NOT NULL AND tag != '' 
         AND t.name = ANY(string_to_array(tag, ' '))) AS "recipeCount"
    FROM reno_tag_master t
    WHERE t.level = $1
  `;
  
  if (parentTagName === "") {
    query += ` ORDER BY t.tag_id;`;
    params = [level];
  } else {
    // 親タグによるフィルタリング
    if (level === 1) {
      query += ` AND t.l = $2 ORDER BY t.tag_id;`;
    } else if (level === 2) {
      query += ` AND t.l || t.m = $2 ORDER BY t.tag_id;`;
    } else if (level === 3) {
      query += ` AND t.l || t.m || t.s = $2 ORDER BY t.tag_id;`;
    } else {
      query += ` AND t.l = $2 ORDER BY t.tag_id;`;
    }
    params = [level, parentTagName];
  }
  
  const { rows } = await sql.query(query, params);
  
  return rows.map(row => {
    const childTagCount = parseInt(row.childTagCount, 10);
    const recipeCount = parseInt(row.recipeCount, 10);
    const imageUri = row.imageUri;
    
    let hasChildren: string;
    if (childTagCount > 0) {
      hasChildren = "▼";
    } else {
      hasChildren = `${recipeCount} 件`;
    }
    
    return {
      tagId: row.tagId,
      dispname: row.dispname || "",
      name: row.name || "",
      imageUri: imageUri || null,
      hasImageUri: imageUri ? true : false,
      hasChildren,
    };
  });
}

/**
 * タグ名からタグ情報を取得
 * @param tagName タグ名
 * @returns タグ情報（存在しない場合はnull）
 */
export async function getTagByName(tagName: string): Promise<{ l: string; m: string; s: string; ss: string; level: number } | null> {
  const { rows } = await sql`
    SELECT l, m, s, ss, level
    FROM reno_tag_master
    WHERE name = ${tagName}
    LIMIT 1
  `;
  
  if (rows.length === 0) {
    return null;
  }
  
  return {
    l: rows[0].l || "",
    m: rows[0].m || "",
    s: rows[0].s || "",
    ss: rows[0].ss || "",
    level: rows[0].level || 0,
  };
}

/**
 * 階層値からタグのnameを取得
 * @param level タグのレベル
 * @param l 大タグの値
 * @param m 中タグの値（level >= 1の場合）
 * @param s 小タグの値（level >= 2の場合）
 * @param ss 極小タグの値（level >= 3の場合）
 * @returns タグのname（存在しない場合はnull）
 */
export async function getTagNameByHierarchy(
  level: number,
  l: string,
  m: string = "",
  s: string = "",
  ss: string = ""
): Promise<string | null> {
  let query: string;
  let params: (string | number)[];

  if (level === 0) {
    query = `SELECT name FROM reno_tag_master WHERE level = 0 AND l = $1 LIMIT 1`;
    params = [l];
  } else if (level === 1) {
    query = `SELECT name FROM reno_tag_master WHERE level = 1 AND l = $1 AND m = $2 LIMIT 1`;
    params = [l, m];
  } else if (level === 2) {
    query = `SELECT name FROM reno_tag_master WHERE level = 2 AND l = $1 AND m = $2 AND s = $3 LIMIT 1`;
    params = [l, m, s];
  } else {
    query = `SELECT name FROM reno_tag_master WHERE level = 3 AND l = $1 AND m = $2 AND s = $3 AND ss = $4 LIMIT 1`;
    params = [l, m, s, ss];
  }

  const { rows } = await sql.query(query, params);
  return rows.length > 0 ? rows[0].name : null;
}

/**
 * タグ名に一致するレシピ数を取得
 * @param tagName タグ名
 * @returns レシピ数
 */
export async function getRecipeCountByTag(tagName: string): Promise<number> {
  const { rows } = await sql`
    SELECT COUNT(*) as count
    FROM reno_recipes
    WHERE tag IS NOT NULL 
      AND tag != '' 
      AND ${tagName} = ANY(string_to_array(tag, ' '));
  `;
  
  return parseInt(rows[0]?.count || '0', 10);
}

/**
 * タグ名のリストからTag型の情報を取得
 * @param tagNames タグ名のリスト
 * @returns Tag型のリスト
 */
export async function getTagsByNames(tagNames: string[]): Promise<Tag[]> {
  if (tagNames.length === 0) {
    return [];
  }

  const query = `
    SELECT
      t.tag_id as "tagId",
      t.dispname,
      t.name,
      t.level,
      (SELECT image_url FROM reno_recipes 
       WHERE tag IS NOT NULL AND tag != '' AND tag LIKE '%' || t.name || '%' 
       ORDER BY tsukurepo_count DESC, recipe_id DESC LIMIT 1) AS "imageUri",
      CASE
        WHEN t.level = 0 THEN (
          SELECT COUNT(*) FROM reno_tag_master tag
          WHERE tag.level = 1 AND tag.l = t.l
        )
        WHEN t.level = 1 THEN (
          SELECT COUNT(*) FROM reno_tag_master tag
          WHERE tag.level = 2 AND tag.l || tag.m = t.l || t.m
        )
        WHEN t.level = 2 THEN (
          SELECT COUNT(*) FROM reno_tag_master tag
          WHERE tag.level = 3 AND tag.l || tag.m || tag.s = t.l || t.m || t.s
        )
        ELSE 0
      END AS "childTagCount",
      (SELECT COUNT(*) FROM reno_recipes 
       WHERE tag IS NOT NULL AND tag != '' 
         AND t.name = ANY(string_to_array(tag, ' '))) AS "recipeCount"
    FROM reno_tag_master t
    WHERE t.name = ANY($1::text[])
    ORDER BY t.tag_id;
  `;

  const { rows } = await sql.query(query, [tagNames]);

  return rows.map(row => {
    const childTagCount = parseInt(row.childTagCount, 10);
    const recipeCount = parseInt(row.recipeCount, 10);
    const imageUri = row.imageUri;
    
    let hasChildren: string;
    if (childTagCount > 0) {
      hasChildren = "▼";
    } else {
      hasChildren = `${recipeCount} 件`;
    }
    
    return {
      tagId: row.tagId,
      dispname: row.dispname || "",
      name: row.name || "",
      imageUri: imageUri || null,
      hasImageUri: imageUri ? true : false,
      hasChildren,
    };
  });
}

