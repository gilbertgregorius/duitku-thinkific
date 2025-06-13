const { gql } = require('apollo-server-express');

const typeDefs = gql`
  type User {
    id: ID!
    subdomain: String!
    gid: String!
    accessToken: String!
    refreshToken: String
    expiresAt: String
    createdAt: String!
    updatedAt: String!
  }

  type Payment {
    id: ID!
    orderId: String!
    userId: ID!
    courseId: String!
    amount: Float!
    currency: String!
    status: PaymentStatus!
    duitkuReference: String
    paymentUrl: String
    thinkificOrderId: String
    webhookReceived: Boolean!
    createdAt: String!
    updatedAt: String!
  }

  enum PaymentStatus {
    pending
    paid
    failed
    expired
  }

  type Course {
    id: String!
    title: String!
    description: String
    price: Float!
  }

  type PaymentResponse {
    success: Boolean!
    paymentUrl: String
    orderId: String
    error: String
  }

  type Query {
    user(subdomain: String!): User
    payment(orderId: String!): Payment
    payments(userId: ID, status: PaymentStatus): [Payment!]!
    course(courseId: String!, subdomain: String!): Course
  }

  type Mutation {
    createPayment(input: CreatePaymentInput!): PaymentResponse!
    updatePaymentStatus(orderId: String!, status: PaymentStatus!): Payment
  }

  input CreatePaymentInput {
    courseId: String!
    amount: Float!
    subdomain: String!
    customerEmail: String
  }
`;

module.exports = typeDefs;
