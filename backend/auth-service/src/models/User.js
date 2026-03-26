const mongoose = require("mongoose");

const tokenSchema = new mongoose.Schema({
  token:       { type: String, required: true },
  createdAt:   { type: Date,   default: Date.now },
  expiresAt:   { type: Date },
  lastUsedAt:  { type: Date,   default: null },
  deviceInfo: {
    ip:         String,
    userAgent:  String,
    deviceName: String,
    os:         String,
    browser:    String,
  },
});

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, select: false },
    role: { type: mongoose.Schema.Types.ObjectId, ref: "Role", required: true },

    tokens: [tokenSchema],
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },

    profile: {
      avatar: String,
      bio: String,
      phone: String,
    },

    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

userSchema.index({ email: 1 });
userSchema.index({ deletedAt: 1 });
userSchema.index({ isActive: 1 });

/**
 * Elimina tokens cuyo expiresAt ya pasó.
 * Devuelve la cantidad de tokens eliminados.
 */
userSchema.methods.pruneExpiredTokens = function () {
  const now = Date.now();
  const before = this.tokens.length;
  this.tokens = (this.tokens || []).filter(
    (t) => t.expiresAt && new Date(t.expiresAt).getTime() > now
  );
  return before - this.tokens.length;
};

userSchema.methods.softDelete = async function () {
  this.deletedAt = new Date();
  this.isActive = false;
  return this.save();
};

userSchema.methods.restore = async function () {
  this.deletedAt = null;
  this.isActive = true;
  return this.save();
};

module.exports = mongoose.model("User", userSchema);
