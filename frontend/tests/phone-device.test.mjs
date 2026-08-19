import assert from "node:assert/strict";
import test from "node:test";
import { getPhoneDeviceVisual } from "../src/phoneDevice.js";

test("uses the iPhone illustration for Apple and iOS metadata", () => {
  for (const phone of [
    { installed: true, osName: "iOS", model: "iPhone 17 Pro" },
    { installed: true, manufacturer: "Apple", deviceName: "Trey's phone" },
    { installed: true, osName: "Phone", model: "iPhone14,7" },
  ]) {
    assert.deepEqual(getPhoneDeviceVisual(phone), {
      platform: "iphone",
      src: "/assets/phone-device-iphone.png",
      alt: "Linked iPhone",
    });
  }
});

test("uses the Android illustration for Android devices", () => {
  for (const phone of [
    { installed: true, osName: "Android", model: "SM-S928U" },
    { installed: true, manufacturer: "Samsung", model: "Galaxy S24" },
    { installed: true, manufacturer: "Google", model: "Pixel 9" },
  ]) {
    assert.deepEqual(getPhoneDeviceVisual(phone), {
      platform: "android",
      src: "/assets/phone-device.png",
      alt: "Linked Android phone",
    });
  }
});

test("does not guess a platform when metadata is unavailable", () => {
  assert.deepEqual(getPhoneDeviceVisual({ installed: true, osName: "Phone", model: "Unknown" }), {
    platform: "unknown",
    src: null,
    alt: "Linked phone",
  });
  assert.deepEqual(getPhoneDeviceVisual({ installed: false }), {
    platform: "unknown",
    src: null,
    alt: "Phone not connected",
  });
});
