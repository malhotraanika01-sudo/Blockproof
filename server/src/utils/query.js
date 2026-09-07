// Shared search / filter / pagination helper for list endpoints.
// Rubric: search, filtering, pagination.

import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(120).optional(),
  sort: z.string().max(40).optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * @param {object} rawQuery  req.query
 * @param {object} opts
 * @param {string[]} opts.sortable   allowed sort columns
 * @param {string}   opts.defaultSort
 * @returns {{ skip:number, take:number, page:number, pageSize:number, q?:string, orderBy:object }}
 */
export function parseListQuery(rawQuery, { sortable = [], defaultSort = 'createdAt' } = {}) {
  const { page, pageSize, q, sort, order } = paginationSchema.parse(rawQuery);
  const sortField = sort && sortable.includes(sort) ? sort : defaultSort;
  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
    q,
    orderBy: { [sortField]: order },
  };
}

/** Build a standard paginated envelope. */
export function paginated(items, total, { page, pageSize }) {
  return {
    items,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}
