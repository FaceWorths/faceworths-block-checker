import gql from 'graphql-tag';
import { apolloClient } from './client';

const getGames = gql`
  query ($where: GameWhere, $limit: Int, $offset: Int, $orderBy: [[String]]) {
     getGames(where: $where, limit: $limit, offset: $offset, orderBy: $orderBy){
      hash
      commitEndBlock
      revealEndBlock
    }
  }
`;

const updateGame = gql`
  mutation ($data: UpdateGameInput!) {
    updateGame(data: $data) {
      hash
    }
  }`;

export const list = (where = {}, limit = 20, offset = 0, orderBy = [["createdAt", "ASC"]]) => {
  return apolloClient
    .query({
      query: getGames,
      variables: {
        where: where,
        limit: limit,
        offset: offset,
        orderBy: orderBy
      }
    }).then(({ data }) => {
      return data && data.getGames ? data.getGames : null;
    });
};

export const update = (hash, status, totalScore = null, playerCount = null, revealCount = null) => {
  return apolloClient
    .mutate({
      mutation: updateGame,
      variables: {
        data: {
          hash,
          status,
          totalScore,
          playerCount,
          revealCount,
        }
      },
    }).then(({ data }) => {
      return data && data.updateGame ? data.updateGame : null;
    });
};
