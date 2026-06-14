export const categorySlugMap = {
  1: 'am-thuc-do-uong',
  2: 'gia-su-day-kem',
  3: 'giao-hang-van-chuyen',
  4: 'ban-le-cua-hang',
  5: 'tiep-thi-quang-cao',
  6: 'sang-tao-thiet-ke',
  7: 'hanh-chinh-van-phong'
};

export const slugToCategoryIdMap = Object.entries(categorySlugMap).reduce((acc, [id, slug]) => {
  acc[slug] = Number(id);
  return acc;
}, {});

export function getCategorySlug(categoryId) {
  if (!categoryId) return '';
  return categorySlugMap[categoryId] || categoryId.toString();
}

export function getCategoryIdFromSlug(slug) {
  if (!slug) return '';
  return slugToCategoryIdMap[slug] || (isNaN(slug) ? '' : Number(slug));
}
