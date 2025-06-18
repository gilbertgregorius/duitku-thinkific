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
    productId: String!
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

  type ProductPrice {
    id: String!
    is_primary: Boolean!
    payment_type: String!
    price: String!
    currency: String!
    price_name: String
  }

  type Product {
    id: String!
    name: String!
    description: String
    price: Float!
    status: String!
    productable_id: String!
    productable_type: String!
    slug: String
    card_image_url: String
    product_prices: [ProductPrice!]!
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
    product(productId: String!, subdomain: String!): Product
    products(subdomain: String!): [Product!]!
  }

  type Mutation {
    createPayment(input: CreatePaymentInput!): PaymentResponse!
    updatePaymentStatus(orderId: String!, status: PaymentStatus!): Payment
  }

  input CreatePaymentInput {
    productId: String!
    amount: Float!
    subdomain: String!
    customerEmail: String
  }
`;

module.exports = typeDefs;
