import {
  ApolloClient,
  HttpLink,
  InMemoryCache,
  ApolloLink,
  from
} from 'apollo-boost';
import { onError } from "apollo-link-error";

require('dotenv').config();

global.fetch = require('node-fetch');

const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors)
    graphQLErrors.map(({ message, locations, path }) =>
      console.log(
        `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`
      )
    );
  if (networkError) console.log(`[Network error]: ${networkError}`);
});

const httpLink = new HttpLink({
  uri: process.env.endPoint,
});

const authMiddleware = new ApolloLink((operation, forward) => {
  const authToken = process.env.jwt;
  operation.setContext({
    headers: {
      'Access-Control-Allow-Headers': 'authorization',
      authorization: authToken ? `Bearer ${authToken}` : ''
    }
  });
  return forward(operation)
});

export const apolloClient = new ApolloClient({
  link: from([errorLink, authMiddleware, httpLink]),
  cache: new InMemoryCache(),
  connectToDevTools: true,
  defaultOptions: {
    query: {
      fetchPolicy: 'network-only'
    }
  }
});
