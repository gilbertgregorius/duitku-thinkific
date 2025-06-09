import thinkific from "@pipedream/thinkific"

export default defineComponent({
  name: "Process Thinkific Webhook",
  description: "Process incoming Thinkific webhook events, extract event type and handle enrollment data",
  type: "action",
  props: {
    thinkific,
    webhookData: {
      type: "object",
      label: "Webhook Data",
      description: "The incoming webhook payload from Thinkific",
    },
  },
  async run({ $ }) {
    const data = this.webhookData;
    
    // Extract event type from resource and action fields
    const resource = data.resource;
    const action = data.action;
    const eventType = resource && action ? `${resource}.${action}` : null;
    
    console.log("Processing Thinkific webhook:", {
      eventType,
      resource,
      action,
      timestamp: new Date().toISOString(),
    });
    
    // Initialize response structure
    const response = {
      eventType,
      resource,
      action,
      processed: false,
      extractedData: null,
    };
    
    // Handle enrollment.created events specifically
    if (eventType === "enrollment.created") {
      console.log("Processing enrollment.created event");
      
      // Extract enrollment data from nested payload structure
      const payload = data.payload || {};
      const enrollment = payload.enrollment || {};
      const user = payload.user || {};
      const course = payload.course || {};
      
      const extractedData = {
        enrollment: {
          id: enrollment.id,
          status: enrollment.status,
          percentage_completed: enrollment.percentage_completed,
          created_at: enrollment.created_at,
          updated_at: enrollment.updated_at,
          started_at: enrollment.started_at,
          completed_at: enrollment.completed_at,
          expiry_date: enrollment.expiry_date,
        },
        user: {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          full_name: user.full_name,
          created_at: user.created_at,
        },
        course: {
          id: course.id,
          name: course.name,
          slug: course.slug,
          description: course.description,
          card_image_url: course.card_image_url,
          position: course.position,
          user_id: course.user_id,
        },
      };
      
      console.log("Extracted enrollment data:", extractedData);
      
      response.processed = true;
      response.extractedData = extractedData;
      
      $.export("$summary", `Successfully processed enrollment.created event for user ${user.email} in course ${course.name}`);
    } else {
      console.log(`Event type ${eventType} not specifically handled, logging raw data`);
      response.extractedData = data.payload || data;
      
      $.export("$summary", `Logged webhook event: ${eventType || "unknown event type"}`);
    }
    
    // Log the complete webhook data for debugging
    console.log("Complete webhook payload:", JSON.stringify(data, null, 2));
    
    return response;
  },
})