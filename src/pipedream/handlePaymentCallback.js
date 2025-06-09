import { createHmac } from "crypto"

export default defineComponent({
  name: "Handle Payment and Enrollment Webhooks",
  description: "Handle webhook notifications from both Duitku payment gateway and Thinkific platform",
  type: "action",
  props: {
    webhookData: {
      type: "object",
      label: "Webhook Data",
      description: "The webhook data received from either Duitku or Thinkific"
    },
    merchantCode: {
      type: "string",
      label: "Duitku Merchant Code", 
      description: "Your Duitku merchant code for signature verification (only needed for Duitku webhooks)",
      optional: true
    },
    apiKey: {
      type: "string",
      label: "Duitku API Key",
      description: "Your Duitku API key used for signature verification (only needed for Duitku webhooks)",
      secret: true,
      optional: true
    },
    data_store: {
      type: "data_store"
    }
  },
  async run({ $ }) {
    const { webhookData, merchantCode, apiKey } = this;
    
    // Determine webhook source
    const isDuitkuWebhook = webhookData.hasOwnProperty('merchantOrderId') || 
                           webhookData.hasOwnProperty('resultCode') ||
                           webhookData.hasOwnProperty('signature');
    
    const isThinkificWebhook = webhookData.hasOwnProperty('resource') && 
                              webhookData.hasOwnProperty('action') && 
                              webhookData.hasOwnProperty('payload');

    // Handle Duitku Payment Webhook
    if (isDuitkuWebhook) {
      // Handle Duitku Payment Webhook Logic
    // Extract payment data from webhook
    const {
      merchantOrderId,
      amount,
      resultCode,
      merchantUserId,
      reference,
      signature: receivedSignature,
      spUserHash,
      settlementDate,
      issuerCode,
      paymentMethod
    } = webhookData;

    // Validate required fields
    if (!merchantOrderId || !amount || !resultCode || !receivedSignature) {
      throw new Error("Missing required Duitku webhook data fields");
    }

    if (!merchantCode || !apiKey) {
      throw new Error("Merchant code and API key are required for Duitku webhook verification");
    }

    // Create signature for verification
    const signatureString = `${merchantCode}${amount}${merchantOrderId}${apiKey}`;
    const calculatedSignature = createHmac('md5', apiKey)
      .update(signatureString)
      .digest('hex');

    // Verify signature
    if (calculatedSignature.toLowerCase() !== receivedSignature.toLowerCase()) {
      $.export("$summary", `Duitku payment signature verification failed for order ${merchantOrderId}`);
      throw new Error("Invalid Duitku payment signature - webhook verification failed");
    }

    // Map payment status codes
    const paymentStatuses = {
      "00": "SUCCESS",
      "01": "PENDING", 
      "02": "FAILED",
      "03": "CANCELLED"
    };

    const paymentStatus = paymentStatuses[resultCode] || "UNKNOWN";
    
    if (paymentStatus === "UNKNOWN") {
      throw new Error(`Unknown payment result code: ${resultCode}`);
    }

    // Check for duplicate notifications
    const paymentKey = `duitku_payment_${merchantOrderId}_${reference || 'no_ref'}`;
    const existingPayment = await this.data_store.has(paymentKey);
    
    if (existingPayment) {
      const existing = await this.data_store.get(paymentKey);
      $.export("$summary", `Duplicate Duitku payment notification for order ${merchantOrderId}`);
      return {
        source: "duitku",
        status: "duplicate",
        orderId: merchantOrderId,
        paymentStatus,
        previouslyProcessed: existing
      };
    }

    // Store payment record
    const paymentRecord = {
      orderId: merchantOrderId,
      amount: parseFloat(amount),
      status: paymentStatus,
      resultCode,
      merchantUserId,
      reference,
      paymentMethod,
      issuerCode,
      settlementDate,
      processedAt: new Date().toISOString(),
      verified: true,
      source: "duitku"
    };

    await this.data_store.set(paymentKey, paymentRecord);

    $.export("$summary", `Processed Duitku ${paymentStatus} payment for order ${merchantOrderId} - Amount: ${amount} IDR`);

    return {
      source: "duitku",
      verified: true,
      paymentStatus,
      orderId: merchantOrderId,
      amount: parseFloat(amount),
      merchantUserId,
      reference,
      paymentMethod,
      paymentRecord
    };
  }
},

methods: {
  async handleThinkificWebhook(webhookData, $) {
    const { resource, action, payload, created_at, id } = webhookData;
    
    // Handle enrollment webhooks
    if (resource === "enrollment" && action === "created") {
      const enrollment = payload;
      const user = enrollment.user;
      const course = enrollment.course;
      
      // Check for duplicates
      const enrollmentKey = `thinkific_enrollment_${enrollment.id}`;
      const existingRecord = await this.data_store.has(enrollmentKey);
      
      if (existingRecord) {
        $.export("$summary", `Duplicate Thinkific enrollment webhook for user ${user.email}`);
        return {
          source: "thinkific",
          status: "duplicate",
          enrollment: enrollment
        };
      }

      // Store enrollment record
      const enrollmentRecord = {
        enrollmentId: enrollment.id,
        userId: user.id,
        userEmail: user.email,
        userName: `${user.first_name} ${user.last_name}`,
        courseId: course.id,
        courseName: course.name,
        activatedAt: enrollment.activated_at,
        createdAt: enrollment.created_at,
        webhookId: id,
        webhookTimestamp: created_at,
        processedAt: new Date().toISOString(),
        source: "thinkific"
      };

      await this.data_store.set(enrollmentKey, enrollmentRecord);

      $.export("$summary", `Processed Thinkific enrollment: ${user.email} enrolled in ${course.name}`);

      return {
        source: "thinkific",
        status: "success",
        action: "enrollment_created",
        enrollment: enrollmentRecord,
        user: {
          id: user.id,
          email: user.email,
          name: `${user.first_name} ${user.last_name}`
        },
        course: {
          id: course.id,
          name: course.name
        }
      };
    }

    // Handle other Thinkific webhooks
    else {
      $.export("$summary", `Unhandled Thinkific webhook: ${resource}.${action}`);
      
      return {
        source: "thinkific",
        status: "unhandled",
        resource,
        action,
        payload
      };
    }
  }
}
})