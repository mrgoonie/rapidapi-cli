/** GraphQL query for searching APIs on Enterprise Hub */
export const SEARCH_APIS_QUERY = `
  query SearchApis(
    $where: SearchApiWhereInput!
    $pagination: PaginationInput
    $orderBy: SearchApiOrderByInput
  ) {
    searchApis(where: $where, pagination: $pagination, orderBy: $orderBy) {
      edges {
        node {
          id
          name
          description
          provider
          rating
          categoryNames
          tags
        }
        cursor
      }
      pageInfo {
        hasNextPage
        endCursor
      }
      total
    }
  }
`;
