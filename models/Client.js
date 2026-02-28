const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a client name'],
    trim: true
  },
  code: {
    type: String,
    unique: true,
    uppercase: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['individual', 'company'],
    default: 'individual'
  },
  contact: {
    phone: String,
    email: {
      type: String,
      lowercase: true,
      trim: true
    },
    address: String,
    city: String,
    country: String
  },
  taxId: String,
  paymentTerms: {
    type: String,
    enum: ['cash', 'credit_7', 'credit_15', 'credit_30', 'credit_45', 'credit_60'],
    default: 'cash'
  },
  creditLimit: {
    type: Number,
    default: 0
  },
  outstandingBalance: {
    type: Number,
    default: 0
  },
  totalPurchases: {
    type: Number,
    default: 0
  },
  lastPurchaseDate: Date,
  notes: String,
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Auto-generate client code
clientSchema.pre('save', async function(next) {
  if (this.isNew && !this.code) {
    const count = await mongoose.model('Client').countDocuments();
    this.code = `CLI${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Client', clientSchema);
