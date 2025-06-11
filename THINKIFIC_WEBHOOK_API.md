# Setup

**The base address of the Webhooks API is https://api.thinkific.com/api/v2**

```bash
curl -H 'Authorization: Bearer <api_key>' \
-H 'Content-Type: application/json' \
"https://api.thinkific.com/api/v2/webhooks?page=1&limit=25"
```

## Webhooks

### `POST /webhooks`

```json
{
  "topic": "order.created",
  "target_url": "https://mockserver.thinkific.com/webhooks"
}
```

**Response: HTTP 201 OK**

```json
{
  "id": "20200227213233625839530",
  "status": "active",
  "topic": "order.created",
  "created_at": "2020-02-27T21:32:33.62583953-05:00",
  "created_by": "156118",
  "updated_at": "2020-02-27T21:32:33.62583953-05:00",
  "updated_by": "156118",
  "target_url": "https://mockserver.thinkific.com/webhooks"
}
```


### `GET /webhooks/{id}`

**Response: HTTP 200 OK**

```json
{
  "id": "1",
  "topic": "order.created",
  "target_url": "https://my.app.com/target",
  "status": "active",
  "created_by": 1,
  "created_at": "2018-01-01T01:01:00Z",
  "updated_at": "2018-01-01T01:01:00Z",
  "updated_by": 1
}
```


### `PUT /webhooks/{id}`

```json
{
  "topic": "order.created",
  "target_url": "https://mockserver.thinkific.com/webhooks"
}
```


**Response: HTTP 200 OK**
```json
{
  "id": "1",
  "topic": "order.created",
  "target_url": "https://my.app.com/target",
  "status": "active",
  "created_by": 1,
  "created_at": "2018-01-01T01:01:00Z",
  "updated_at": "2018-01-01T01:01:00Z",
  "updated_by": 1
}
```


### `DELETE /webhooks/{id}`

**Response: HTTP 204 OK**

## Events

### `GET /events/{id}`

**Response: HTTP 200 OK**

```json
{
  "id": "1",
  "resource": "order",
  "action": "created",
  "created_at": "string",
  "payload": {}
}
```

## Webhook payloads

What Thinkific will send to us when an event is triggered

### `order.created`

Triggered when an order is successfully completed

```json
{
  "id": "20180126172320940835610",
  "resource": "order",
  "action": "created",
  "tenant_id": "3",
  "created_at": "2018-01-26T22:23:20.808Z",
  "payload": {
    "affiliate_referral_code": null,
    "amount_cents": 5000,
    "amount_dollars": 50,
    "billing_name": "Robert Smith",
    "coupon": {
      "id": 12345678,
      "code": "discount123",
      "promotion_id": 1234567
    },
    "created_at": "2018-01-26T22:23:18.400Z",
    "id": 19796,
    "order_number": 1010,
    "payment_type": "one-time",
    "product_id": 1,
    "product_name": "Introduction to Webhooks",
    "status": "Complete",
    "items": [
      {
        "product_id": 1,
        "product_name": "Introduction to Webhooks",
        "amount_dollars": 50,
        "amount_cents": 5000
      }
    ],
    "user": {
      "email": "ninjas@thinkific.com",
      "first_name": "Robert",
      "id": 123456,
      "last_name": "Smith"
    }
  }
}
```

### `enrollment.created`

Triggered when a full enrollment is created in any of your courses

```json
{
  "id": "20180126171756020665195",
  "resource": "enrollment",
  "action": "created",
  "tenant_id": "3",
  "created_at": "2018-01-26T22:17:01.924Z",
  "payload": {
    "activated_at": "2018-01-26T22:16:52.255Z",
    "completed_at": null,
    "course": {
      "id": 4,
      "name": "Introduction to Webhooks"
    },
    "course_id": 4,
    "created_at": "2018-01-26T22:16:52.285Z",
    "expiry_date": null,
    "free_trial": false,
    "id": 97472,
    "percentage_completed": "0.0",
    "started_at": "2018-01-26T22:17:01.891Z",
    "updated_at": "2018-01-26T22:17:01.924Z",
    "user": {
      "email": "ninjas@thinkific.com",
      "first_name": "Robert",
      "id": 123456,
      "last_name": "Smith"
    }
  }
}
```