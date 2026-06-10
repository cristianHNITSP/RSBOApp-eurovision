const mongoose = require("mongoose");

const tokenSchema = new mongoose.Schema({
  token:       { type: String, required: true, maxlength: 1024 },
  createdAt:   { type: Date,   default: Date.now },
  expiresAt:   { type: Date },
  lastUsedAt:  { type: Date,   default: null },
  deviceInfo: {
    ip:         { type: String, maxlength: 64 },
    userAgent:  { type: String, maxlength: 512 },
    deviceName: { type: String, maxlength: 128 },
    os:         { type: String, maxlength: 64 },
    browser:    { type: String, maxlength: 64 },
  },
});

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 32,
      match: /^[a-z0-9_.-]+$/,
    },
    password: { type: String, required: true, select: false },
    role: { type: mongoose.Schema.Types.ObjectId, ref: "Role", required: true },

    tokens: [tokenSchema],
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },

    profile: {
      avatar: { type: String, maxlength: 500 },
      bio:    { type: String, maxlength: 500 },
      phone:  { type: String, maxlength: 20 },
    },

    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

userSchema.index({ username: 1 });
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

const config = require("../config");
const bcrypt = require("bcrypt");

userSchema.pre("save", async function (next) {
  // Solo hashear si la contraseña ha sido modificada (o es nueva)
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    const pepper = config.secrets.pepper;
    
    // Combinamos la contraseña con el Pepper antes del hash
    this.password = await bcrypt.hash(this.password + pepper, salt);
    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model("User", userSchema);
