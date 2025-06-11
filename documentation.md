# Client

Client needs to setup custom URL in:

1. “Buy Now” button for each product
2. See overview (Optional)

# Developer scope of work

Preriquisites: Manage auth using API Key (header)

## Manage external orders

### `POST /external_orders`

```json
{
  "payment_provider": "ExternalProvider",
  "user_id": 1,
  "product_id": 1,
  "order_type": "one-time",
  "transaction": {
    "amount": 10000,
    "currency": "USD",
    "reference": "123abc",
    "action": "purchase"
  }
}
```

**Response: HTTP 201 OK**

```
{
    "id": 1
}
```

### `POST /external_orders/{id}/transactions/purchase`

```json
{
  "amount": 10000,
  "currency": "USD",
  "reference": "123abc",
  "action": "purchase"
}
```

**Response: HTTP 200 OK**


## Manage enrollments

#### `POST /enrollments`

Create a new enrollment for a user in a course

```json
{
  "course_id": 1,
  "user_id": 1,
  "activated_at": "2018-01-01T01:01:00Z",
  "expiry_date": "2019-01-01T01:01:00Z"
}
```

**Response: HTTP 201 OK**

```json
{
  "id": 1,
  "user_email": "bob@example.com",
  "user_name": "Bob Smith",
  "user_id": 1,
  "course_name": "My Course",
  "course_id": 1,
  "percentage_completed": 1,
  "expired": false,
  "is_free_trial": false,
  "completed": true,
  "started_at": "2018-01-01T01:01:00Z",
  "activated_at": "2018-01-01T01:01:00Z",
  "completed_at": "2018-01-31T01:01:00Z",
  "updated_at": "2018-01-31T01:01:00Z",
  "expiry_date": "2019-01-01T01:01:00Z"
}
```

#### `GET /enrollments/{id}`

**Response: HTTP 200 OK**

```json
{
  "id": 1,
  "user_email": "bob@example.com",
  "user_name": "Bob Smith",
  "user_id": 1,
  "course_name": "My Course",
  "course_id": 1,
  "percentage_completed": 1,
  "expired": false,
  "is_free_trial": false,
  "completed": true,
  "started_at": "2018-01-01T01:01:00Z",
  "activated_at": "2018-01-01T01:01:00Z",
  "completed_at": "2018-01-31T01:01:00Z",
  "updated_at": "2018-01-31T01:01:00Z",
  "expiry_date": "2019-01-01T01:01:00Z"
}
```

#### `PUT /enrollments/{id}`

```json
{
  "activated_at": "2018-01-01T01:01:00Z",
  "expiry_date": "2019-01-01T01:01:00Z"
}
```

**Response: HTTP 204 OK**

## Manage orders

#### `GET /orders`

**Response: HHTP 200 OK**

```json
{
  "items": [
    {
      "user_id": 1,
      "user_email": "bob@example.com",
      "user_name": "Bob Smith",
      "product_name": "My Course",
      "product_id": 1,
      "amount_dollars": "20.0",
      "amount_cents": 2000,
      "subscription": false,
      "coupon_code": "abc123",
      "coupon_id": 1,
      "items": [
        {
          "product_id": 1,
          "product_name": "My Course",
          "amount_dollars": 20,
          "amount_cents": 2000
        }
      ],
      "affiliate_referral_code": "exexex",
      "status": "complete",
      "created at": "string",
      "id": 1
    }
  ],
  "meta": {
    "pagination": {
      "current_page": 1,
      "next_page": 2,
      "prev_page": 0,
      "total_pages": 10,
      "total_items": 250,
      "entries_info": "1-10 of 10"
    }
  }
}
```

#### `GET /orders/{id}`

**Response: HTTP 200 OK**

```json
{
  "user_id": 1,
  "user_email": "bob@example.com",
  "user_name": "Bob Smith",
  "product_name": "My Course",
  "product_id": 1,
  "amount_dollars": "20.0",
  "amount_cents": 2000,
  "subscription": false,
  "coupon_code": "abc123",
  "coupon_id": 1,
  "items": [
    {
      "product_id": 1,
      "product_name": "My Course",
      "amount_dollars": 20,
      "amount_cents": 2000
    }
  ],
  "affiliate_referral_code": "exexex",
  "status": "complete",
  "created at": "string",
  "id": 1
}
```


## Webhook events

The system supports webhooks for the following events:

#### `enrollment.created`

Triggered when a new enrollment is created

```json
{
  "event": "enrollment.created",
  "data": {
    "enrollment": {
      "id": 456,
      "user_id": 123,
      "course_id": 789,
      "status": "active",
      "created_at": "2024-01-15T10:30:00Z"
    },
    "user": {
      "id": 123,
      "email": "john.doe@example.com",
      "first_name": "John",
      "last_name": "Doe"
    },
    "course": {
      "id": 789,
      "name": "Web Development Fundamentals"
    }
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### `order.completed`

Triggered when an order is completed

```json
{
  "event": "order.completed",
  "data": {
    "order": {
      "id": 789,
      "number": "TH-2024-001234",
      "total": 199.99,
      "currency": "USD",
      "status": "completed"
    },
    "user": {
      "id": 123,
      "email": "john.doe@example.com"
    },
    "courses": [
      {
        "id": 456,
        "name": "Web Development Fundamentals"
      }
    ]
  },
  "timestamp": "2024-01-15T10:35:00Z"
}
```

#### `external_order.transaction.completed`

Triggered when an external order transaction is completed

```json
{
  "event": "external_order.transaction.completed",
  "data": {
    "external_order_id": 1,
    "transaction": {
      "id": 789,
      "amount": 199.99,
      "currency": "USD",
      "reference": "123abc",
      "action": "purchase",
      "status": "completed"
    },
    "payment_provider": "Duitku"
  },
  "timestamp": "2024-01-15T10:36:00Z"
}
```