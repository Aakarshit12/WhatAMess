const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["customer", "delivery"], default: "customer" },
    credits: { type: Number, default: 0 },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: function () {
          return this.role === "delivery" ? "Point" : undefined;
        }, // ✅ Remove type if not delivery
      },
      coordinates: {
        type: [Number],
        required: function () {
          return this.role === "delivery"; // ✅ Required only for delivery users
        },
        validate: {
          validator: function (arr) {
            return arr.length === 2;
          },
          message: "Coordinates must have [longitude, latitude]",
        },
      },
    },
    isAvailableForDelivery: {
      type: Boolean,
      default: function () {
        return this.role === "delivery";
      },
    },
  },
  { timestamps: true }
);

// ✅ Remove location if user is not a delivery person
UserSchema.pre("save", function (next) {
  if (this.role === "customer") {
    this.location = undefined; // 🔥 Remove location completely for customers
  } else if (this.location && this.location.coordinates) {
    this.location.coordinates = this.location.coordinates.map((coord) => Number(coord));
  }
  next();
});

// ✅ Hash password before saving
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ✅ Generate JWT Token
UserSchema.methods.generateAuthToken = function () {
  return jwt.sign({ userId: this._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

// ✅ Add Geospatial Index (only if location exists)
UserSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("User", UserSchema);
