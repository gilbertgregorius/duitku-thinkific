import { axios } from "@pipedream/platform"
import crypto from "crypto"

export default defineComponent({
  name: "Initiate Payment",
  description: "Initialize payment request with Duitku for course enrollment from custom checkout page",
  type: "action",
  props: {
    merchantCode: {
      type: "string",
      label: "Merchant Code",
      description: "Your Duitku merchant code"
    },
    apiKey: {
      type: "string",
      label: "API Key", 
      description: "Your Duitku API key",
      secret: true
    },
    courseName: {
      type: "string",
      label: "Course Name",
      description: "Name of the course being purchased"
    },
    courseDescription: {
      type: "string",
      label: "Course Description",
      description: "Brief description of the course",
      optional: true
    },
    coursePrice: {
      type: "integer",
      label: "Course Price",
      description: "Price of the course in IDR (Indonesian Rupiah)"
    },
    customerName: {
      type: "string",
      label: "Customer Name",
      description: "Full name of the customer"
    },
    customerEmail: {
      type: "string", 
      label: "Customer Email",
      description: "Email address of the customer"
    },
    customerPhone: {
      type: "string",
      label: "Customer Phone",
      description: "Phone number of the customer (with country code, e.g., +62812345678)"
    },
    paymentMethod: {
      type: "string",
      label: "Payment Method",
      description: "Select payment method for Duitku",
      options: [
        { label: "Virtual Account BCA", value: "I1" },
        { label: "Virtual Account Mandiri", value: "M2" },
        { label: "Virtual Account BNI", value: "VA" },
        { label: "Virtual Account BRI", value: "BR" },
        { label: "Virtual Account Permata", value: "A1" },
        { label: "Credit Card", value: "CC" },
        { label: "Mandiri Clickpay", value: "M1" },
        { label: "CIMB Clicks", value: "C1" },
        { label: "Danamon Online Banking", value: "D1" },
        { label: "OVO", value: "OV" },
        { label: "DANA", value: "DA" },
        { label: "LinkAja", value: "LA" },
        { label: "ShopeePay", value: "SP" }
      ]
    },
    returnUrl: {
      type: "string",
      label: "Return URL",
      description: "URL to redirect customers after payment completion"
    },
    callbackUrl: {
      type: "string", 
      label: "Callback URL",
      description: "URL for receiving payment notification callbacks"
    },
    environment: {
      type: "string",
      label: "Environment",
      description: "Duitku environment",
      options: [
        { label: "Sandbox", value: "sandbox" },
        { label: "Production", value: "production" }
      ],
      default: "sandbox"
    }
  },
  async run({ $ }) {
    try {
      // Generate unique order ID with timestamp and random string
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substr(2, 9).toUpperCase();
      const orderId = `COURSE_${timestamp}_${randomStr}`;
      
      // Determine API base URL based on environment
      const baseUrl = this.environment === "production" 
        ? "https://passport.duitku.com" 
        : "https://sandbox.duitku.com";
      
      // Prepare payment request data
      const paymentData = {
        merchantCode: this.merchantCode,
        paymentAmount: this.coursePrice,
        paymentMethod: this.paymentMethod,
        merchantOrderId: orderId,
        productDetails: this.courseDescription || this.courseName,
        customerVaName: this.customerName,
        email: this.customerEmail,
        phoneNumber: this.customerPhone.replace(/\D/g, ''), // Remove non-digits
        itemDetails: [
          {
            name: this.courseName,
            price: this.coursePrice,
            quantity: 1
          }
        ],
        customerDetail: {
          firstName: this.customerName.split(' ')[0],
          lastName: this.customerName.split(' ').slice(1).join(' ') || '',
          email: this.customerEmail,
          phoneNumber: this.customerPhone.replace(/\D/g, '')
        },
        returnUrl: this.returnUrl,
        callbackUrl: this.callbackUrl,
        expiryPeriod: 1440 // 24 hours in minutes
      };

      // Generate MD5 signature for authentication
      const signatureString = `${this.merchantCode}${orderId}${this.coursePrice}${this.apiKey}`;
      const signature = crypto.createHash('md5').update(signatureString).digest('hex');
      paymentData.signature = signature;

      // Make payment inquiry request to Duitku
      const response = await axios($, {
        url: `${baseUrl}/webapi/api/merchant/v2/inquiry`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        data: paymentData
      });

      // Check if request was successful
      if (response.statusCode !== "00") {
        throw new Error(`Payment initiation failed: ${response.statusMessage || 'Unknown error'}`);
      }

      // Prepare response data for frontend integration
      const paymentResponse = {
        success: true,
        orderId: orderId,
        reference: response.reference,
        paymentUrl: response.paymentUrl,
        vaNumber: response.vaNumber,
        qrString: response.qrString,
        amount: this.coursePrice,
        paymentMethod: this.paymentMethod,
        course: {
          name: this.courseName,
          description: this.courseDescription,
          price: this.coursePrice
        },
        customer: {
          name: this.customerName,
          email: this.customerEmail,
          phone: this.customerPhone
        },
        expiredDate: response.expiredDate,
        status: "pending",
        instructions: response.paymentInstructions,
        environment: this.environment,
        createdAt: new Date().toISOString()
      };

      $.export("$summary", `Payment initiated for "${this.courseName}" - Order ID: ${orderId} - Amount: IDR ${this.coursePrice.toLocaleString()}`);

      return paymentResponse;

    } catch (error) {
      $.export("$summary", `Payment initiation failed: ${error.message}`);
      
      return {
        success: false,
        error: error.message,
        orderId: null,
        course: {
          name: this.courseName,
          price: this.coursePrice
        },
        customer: {
          name: this.customerName,
          email: this.customerEmail
        },
        timestamp: new Date().toISOString()
      };
    }
  }
})