const Queue = require('bull');
const paymentQueue = new Queue('payment processing');
const enrollmentQueue = new Queue('enrollment processing');

// Process payment webhooks
paymentQueue.process(async (job) => {
    const { webhookData } = job.data;
    await processPaymentWebhook(webhookData);
});

// Process enrollment webhooks
enrollmentQueue.process(async (job) => {
    const { webhookData } = job.data;
    await processEnrollmentWebhook(webhookData);
});