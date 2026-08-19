const IPHONE_HINT = /(iphone|ios|apple)/i;
const ANDROID_HINT = /(^|\W)(android|pixel|google|samsung|galaxy|motorola|moto|oneplus|xiaomi|redmi|oppo|vivo|nothing)(\W|$)/i;

export function getPhoneDeviceVisual(phone) {
  if (!phone?.installed) {
    return { platform: "unknown", src: null, alt: "Phone not connected" };
  }

  const identity = [phone.osName, phone.manufacturer, phone.model, phone.deviceName]
    .filter(Boolean)
    .join(" ");

  if (IPHONE_HINT.test(identity)) {
    return {
      platform: "iphone",
      src: "/assets/phone-device-iphone.png",
      alt: "Linked iPhone",
    };
  }

  if (ANDROID_HINT.test(identity)) {
    return {
      platform: "android",
      src: "/assets/phone-device.png",
      alt: "Linked Android phone",
    };
  }

  return { platform: "unknown", src: null, alt: "Linked phone" };
}
