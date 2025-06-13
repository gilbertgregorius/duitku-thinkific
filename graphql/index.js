const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const typeDefs = require('./schema');
const resolvers = require('./resolvers');

const createApolloServer = () => {
  return new ApolloServer({
    typeDefs,
    resolvers,
    introspection: process.env.NODE_ENV !== 'production',
  });
};

module.exports = createApolloServer;
