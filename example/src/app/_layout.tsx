// - Polyfill TextEncoder
import "fast-text-encoding";

// - Polyfill Buffer
if (typeof Buffer === "undefined") {
  global.Buffer = require("buffer").Buffer;
}

export { Slot as default } from 'expo-router'
