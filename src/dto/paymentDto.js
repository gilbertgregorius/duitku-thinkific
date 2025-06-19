/**
 * Data Transfer Objects for Payment Operations
 * Inspired by Python dataclasses pattern but adapted for JavaScript
 */

class ItemDetails {
  constructor(name, quantity = 1, price) {
    this.name = name;
    this.quantity = quantity;
    this.price = price;
  }

  static fromObject(obj) {
    return new ItemDetails(obj.name, obj.quantity, obj.price);
  }

  validate() {
    const errors = [];
    if (!this.name || typeof this.name !== 'string') {
      errors.push('ItemDetails.name is required and must be a string');
    }
    if (!this.quantity || typeof this.quantity !== 'number' || this.quantity <= 0) {
      errors.push('ItemDetails.quantity must be a positive number');
    }
    if (!this.price || typeof this.price !== 'number' || this.price <= 0) {
      errors.push('ItemDetails.price must be a positive number');
    }
    return errors;
  }
}

class CustomerDetail {
  constructor(firstName = null, lastName = null, email = null, phoneNumber = null) {
    this.firstName = firstName;
    this.lastName = lastName;
    this.email = email;
    this.phoneNumber = phoneNumber;
  }

  static fromObject(obj) {
    return new CustomerDetail(
      obj.firstName,
      obj.lastName,
      obj.email,
      obj.phoneNumber
    );
  }

  validate() {
    const errors = [];
    if (this.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(this.email)) {
        errors.push('CustomerDetail.email must be a valid email format');
      }
    }
    if (this.phoneNumber && typeof this.phoneNumber !== 'string') {
      errors.push('CustomerDetail.phoneNumber must be a string');
    }
    return errors;
  }
}

class CreditCardDetail {
  constructor(acquirer, binWhitelist = []) {
    this.acquirer = acquirer;
    this.binWhitelist = binWhitelist;
  }

  static fromObject(obj) {
    return new CreditCardDetail(obj.acquirer, obj.binWhitelist || []);
  }

  validate() {
    const errors = [];
    if (!this.acquirer || typeof this.acquirer !== 'string') {
      errors.push('CreditCardDetail.acquirer is required and must be a string');
    }
    if (!Array.isArray(this.binWhitelist)) {
      errors.push('CreditCardDetail.binWhitelist must be an array');
    }
    return errors;
  }
}

class CreateInvoiceRequest {
  constructor({
    paymentAmount,
    merchantOrderId,
    productDetails,
    email,
    callbackUrl,
    returnUrl,
    additionalParam = null,
    merchantUserInfo = null,
    customerVaName = '',
    phoneNumber = null,
    itemDetails = [],
    customerDetail = null,
    expiryPeriod = null,
    paymentMethod = '',
    creditCardDetail = null,
    // Additional fields from the existing payment flow
    productId = null,
    productName = null,
    productDescription = null,
    customerName = null
  }) {
    this.paymentAmount = paymentAmount;
    this.merchantOrderId = merchantOrderId;
    this.productDetails = productDetails;
    this.email = email;
    this.callbackUrl = callbackUrl;
    this.returnUrl = returnUrl;
    this.additionalParam = additionalParam;
    this.merchantUserInfo = merchantUserInfo;
    this.customerVaName = customerVaName;
    this.phoneNumber = phoneNumber;
    this.itemDetails = itemDetails.map(item => 
      item instanceof ItemDetails ? item : ItemDetails.fromObject(item)
    );
    this.customerDetail = customerDetail instanceof CustomerDetail 
      ? customerDetail 
      : (customerDetail ? CustomerDetail.fromObject(customerDetail) : null);
    this.expiryPeriod = expiryPeriod;
    this.paymentMethod = paymentMethod;
    this.creditCardDetail = creditCardDetail instanceof CreditCardDetail
      ? creditCardDetail
      : (creditCardDetail ? CreditCardDetail.fromObject(creditCardDetail) : null);
    
    // Additional fields
    this.productId = productId;
    this.productName = productName;
    this.productDescription = productDescription;
    this.customerName = customerName;
  }

  static fromPaymentData(paymentData) {
    return new CreateInvoiceRequest({
      paymentAmount: paymentData.amount,
      merchantOrderId: paymentData.orderId,
      productDetails: paymentData.productDescription || paymentData.productName,
      email: paymentData.customerEmail,
      callbackUrl: paymentData.callbackUrl,
      returnUrl: paymentData.returnUrl,
      customerVaName: paymentData.customerName,
      phoneNumber: paymentData.customerPhone,
      paymentMethod: paymentData.paymentMethod,
      productId: paymentData.productId,
      productName: paymentData.productName,
      productDescription: paymentData.productDescription,
      customerName: paymentData.customerName,
      itemDetails: paymentData.itemDetails || [{
        name: paymentData.productName,
        quantity: 1,
        price: paymentData.amount
      }],
      customerDetail: {
        firstName: paymentData.customerName?.split(' ')[0],
        lastName: paymentData.customerName?.split(' ').slice(1).join(' ') || '',
        email: paymentData.customerEmail,
        phoneNumber: paymentData.customerPhone?.replace(/\D/g, '') || ''
      }
    });
  }

  validate() {
    const errors = [];
    
    // Required fields validation
    const requiredFields = [
      { field: 'paymentAmount', type: 'number' },
      { field: 'merchantOrderId', type: 'string' },
      { field: 'productDetails', type: 'string' },
      { field: 'email', type: 'string' },
      { field: 'callbackUrl', type: 'string' },
      { field: 'returnUrl', type: 'string' }
    ];

    requiredFields.forEach(({ field, type }) => {
      if (!this[field]) {
        errors.push(`${field} is required`);
      } else if (typeof this[field] !== type) {
        errors.push(`${field} must be of type ${type}`);
      }
    });

    // Amount validation
    if (this.paymentAmount && this.paymentAmount <= 0) {
      errors.push('paymentAmount must be greater than 0');
    }

    // Email validation
    if (this.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(this.email)) {
        errors.push('email must be a valid email format');
      }
    }

    // Validate nested objects
    if (this.customerDetail) {
      const customerErrors = this.customerDetail.validate();
      errors.push(...customerErrors);
    }

    if (this.creditCardDetail) {
      const creditCardErrors = this.creditCardDetail.validate();
      errors.push(...creditCardErrors);
    }

    if (this.itemDetails && this.itemDetails.length > 0) {
      this.itemDetails.forEach((item, index) => {
        const itemErrors = item.validate();
        errors.push(...itemErrors.map(err => `itemDetails[${index}]: ${err}`));
      });
    }

    return errors;
  }

  isValid() {
    return this.validate().length === 0;
  }

  toJSON() {
    return {
      paymentAmount: this.paymentAmount,
      merchantOrderId: this.merchantOrderId,
      productDetails: this.productDetails,
      email: this.email,
      callbackUrl: this.callbackUrl,
      returnUrl: this.returnUrl,
      additionalParam: this.additionalParam,
      merchantUserInfo: this.merchantUserInfo,
      customerVaName: this.customerVaName,
      phoneNumber: this.phoneNumber,
      itemDetails: this.itemDetails,
      customerDetail: this.customerDetail,
      expiryPeriod: this.expiryPeriod,
      paymentMethod: this.paymentMethod,
      creditCardDetail: this.creditCardDetail,
      productId: this.productId,
      productName: this.productName,
      productDescription: this.productDescription,
      customerName: this.customerName
    };
  }
}

class CreateInvoiceResponse {
  constructor(merchantCode, reference, paymentUrl, amount, statusCode, statusMessage) {
    this.merchantCode = merchantCode;
    this.reference = reference;
    this.paymentUrl = paymentUrl;
    this.amount = amount;
    this.statusCode = statusCode;
    this.statusMessage = statusMessage;
  }

  static fromDuitkuResponse(duitkuResponse) {
    return new CreateInvoiceResponse(
      duitkuResponse.merchantCode,
      duitkuResponse.reference,
      duitkuResponse.paymentUrl,
      duitkuResponse.amount,
      duitkuResponse.statusCode,
      duitkuResponse.statusMessage
    );
  }

  isSuccess() {
    return this.statusCode === '00';
  }

  validate() {
    const errors = [];
    const requiredFields = ['merchantCode', 'reference', 'paymentUrl', 'amount', 'statusCode', 'statusMessage'];
    
    requiredFields.forEach(field => {
      if (!this[field]) {
        errors.push(`${field} is required`);
      }
    });

    return errors;
  }

  toJSON() {
    return {
      merchantCode: this.merchantCode,
      reference: this.reference,
      paymentUrl: this.paymentUrl,
      amount: this.amount,
      statusCode: this.statusCode,
      statusMessage: this.statusMessage
    };
  }
}

// Export classes for use in other modules
module.exports = {
  ItemDetails,
  CustomerDetail,
  CreditCardDetail,
  CreateInvoiceRequest,
  CreateInvoiceResponse
};
