import orderBy from 'lodash/orderBy'

export type SessionListRow = {
  session: { createdAt: number }
}

export function sortSessionsForHome<T extends SessionListRow>(rows: T[]): T[] {
  return orderBy(rows, [(r) => r.session.createdAt], ['desc'])
}
