# GraphQL & Enhanced Payment Integration

This document outlines the new GraphQL API and enhanced payment functionality that has been added to the Duitku-Thinkific integration.

## GraphQL API

### Endpoint

- **URL**: `/graphql`
- **Method**: POST
- **Playground**: Available in development mode at `http://localhost:3000/graphql`

### Schema Overview

#### Types

**User**

```graphql
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
```

**Payment**

```graphql
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
```

**PaymentStatus**

```graphql
enum PaymentStatus {
  pending
  paid
  failed
  expired
}
```

#### Queries

**Get User by Subdomain**

```graphql
query GetUser($subdomain: String!) {
  user(subdomain: $subdomain) {
    id
    subdomain
    gid
    accessToken
    createdAt
  }
}
```

**Get Payment by Order ID**

```graphql
query GetPayment($orderId: String!) {
  payment(orderId: $orderId) {
    id
    orderId
    amount
    status
    paymentUrl
    createdAt
  }
}
```

**Get Payments with Filters**

```graphql
query GetPayments($userId: ID, $status: PaymentStatus) {
  payments(userId: $userId, status: $status) {
    id
    orderId
    amount
    status
    createdAt
  }
}
```

**Get Course Information**

```graphql
query GetCourse($courseId: String!, $subdomain: String!) {
  course(courseId: $courseId, subdomain: $subdomain) {
    id
    title
    description
    price
  }
}
```

#### Mutations

**Create Payment**

```graphql
mutation CreatePayment($input: CreatePaymentInput!) {
  createPayment(input: $input) {
    success
    paymentUrl
    orderId
    error
  }
}
```

**Update Payment Status**

```graphql
mutation UpdatePaymentStatus($orderId: String!, $status: PaymentStatus!) {
  updatePaymentStatus(orderId: $orderId, status: $status) {
    id
    orderId
    status
    updatedAt
  }
}
```

## Enhanced Payment Flow

### New Routes

#### Checkout Page

- **URL**: `/payment/checkout`
- **Method**: GET
- **Query Parameters**: `courseId`, `subdomain`
- **Description**: Displays a checkout page for a specific course

#### Create Payment

- **URL**: `/payment/create`
- **Method**: POST
- **Query Parameters**: `subdomain`
- **Body**: `{ courseId, amount }`
- **Description**: Creates a new payment and returns payment URL

#### Success Page

- **URL**: `/payment/success`
- **Method**: GET
- **Query Parameters**: `orderId`
- **Description**: Displays payment success confirmation

#### Failure Page

- **URL**: `/payment/failure`
- **Method**: GET
- **Query Parameters**: `orderId`
- **Description**: Displays payment failure information

### Payment Controller Methods

The `PaymentController` now includes the following new methods:

1. **`showCheckout(req, res)`**: Renders the checkout page with course information
2. **`createPayment(req, res)`**: Creates a new payment and external Thinkific order
3. **`showSuccess(req, res)`**: Displays payment success page
4. **`showFailure(req, res)`**: Displays payment failure page

### Database Models

#### User Model

- Stores Thinkific user information and OAuth tokens
- Fields: `id`, `subdomain`, `gid`, `accessToken`, `refreshToken`, `expiresAt`

#### Payment Model

- Stores payment transaction information
- Fields: `id`, `orderId`, `userId`, `courseId`, `amount`, `currency`, `status`, `duitkuReference`, `paymentUrl`, `thinkificOrderId`, `webhookReceived`

### Model Associations

- User has many Payments (`User.hasMany(Payment)`)
- Payment belongs to User (`Payment.belongsTo(User)`)

## Frontend Integration

### React vs EJS Recommendation

**Use React for**:

- Admin dashboard
- Order management
- Real-time updates
- Complex user interactions

**Use EJS for**:

- Payment checkout flow
- Success/failure pages
- Server-side rendered pages
- Thinkific integration pages

### Example Usage

#### GraphQL Query Example

```javascript
const GET_PAYMENTS = gql`
  query GetPayments($status: PaymentStatus) {
    payments(status: $status) {
      id
      orderId
      amount
      status
      createdAt
    }
  }
`;
```

#### React Component Example

```jsx
import { useQuery } from "@apollo/client";

function PaymentsList() {
  const { loading, error, data } = useQuery(GET_PAYMENTS, {
    variables: { status: "pending" },
  });

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <div>
      {data.payments.map((payment) => (
        <div key={payment.id}>
          <h3>Order: {payment.orderId}</h3>
          <p>Amount: {payment.amount}</p>
          <p>Status: {payment.status}</p>
        </div>
      ))}
    </div>
  );
}
```

## Development Setup

### Dependencies Added

- `@apollo/server`: Modern GraphQL server
- `graphql`: GraphQL core library
- `sequelize`: ORM for PostgreSQL
- `ejs`: Template engine for server-side rendering

### Environment Variables

Make sure you have the following environment variables configured:

- `DB_HOST`: PostgreSQL host
- `DB_PORT`: PostgreSQL port
- `DB_NAME`: Database name
- `DB_USER`: Database username
- `DB_PASSWORD`: Database password
- `THINKIFIC_*`: Thinkific API credentials
- `DUITKU_*`: Duitku API credentials

### Running the Application

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the development server:

   ```bash
   npm run dev
   ```

3. Access GraphQL Playground:
   ```
   http://localhost:3000/graphql
   ```

## Testing

### GraphQL Playground Queries

Test the API using GraphQL Playground with sample queries:

```graphql
# Get all pending payments
query {
  payments(status: pending) {
    id
    orderId
    amount
    status
  }
}

# Create a new payment
mutation {
  createPayment(
    input: { courseId: "123", amount: 100000, subdomain: "test-school" }
  ) {
    success
    paymentUrl
    orderId
    error
  }
}
```

## Next Steps

1. **Add Authentication**: Implement proper authentication for GraphQL queries
2. **Add Subscriptions**: Real-time updates for payment status changes
3. **Error Handling**: Enhanced error handling and validation
4. **Caching**: Implement caching for frequently accessed data
5. **Testing**: Add comprehensive unit and integration tests
