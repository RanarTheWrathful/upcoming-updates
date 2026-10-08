'use strict';

// FastTalk 2.x wire format implementation.
// The nibble/type assignments are intentionally unchanged: the client depends
// on this exact binary protocol.
const u32 = new Uint32Array(1);
const c32 = new Uint8Array(u32.buffer);
const f32 = new Float32Array(u32.buffer);
const u16 = new Uint16Array(1);
const c16 = new Uint8Array(u16.buffer);

// FastTalk encode/decode is synchronous and never re-enters itself, so these
// scratch buffers can safely be reused between packets. Keeping them outside
// the hot functions removes two temporary typed-array allocations per encode
// and one per decode while still returning an independent packet/output array.
let encodeTypeScratch = new Uint8Array(64);
let encodeCodeScratch = new Uint8Array(128);
let decodeHeaderScratch = new Uint8Array(256);

function growScratch(buffer, needed) {
  if (needed <= buffer.length) return buffer;
  let length = buffer.length || 1;
  while (length < needed) length *= 2;
  const grown = new Uint8Array(length);
  grown.set(buffer);
  return grown;
}

function typeCodeOf(value) {
  if (value === 0 || value === false) return 0;
  if (value === 1 || value === true) return 1;

  if (typeof value === 'number') {
    if (!Number.isInteger(value) || value < -0x100000000 || value >= 0x100000000) return 8;
    if (value >= 0) {
      if (value < 0x100) return 2;
      if (value < 0x10000) return 4;
      return 6;
    }
    if (value >= -0x100) return 3;
    if (value >= -0x10000) return 5;
    return 7;
  }

  if (typeof value === 'string') {
    let unicode = false;
    for (let i = 0; i < value.length; i++) {
      const code = value.charCodeAt(i);
      if (code > 0xff) unicode = true;
      else if (code === 0) throw new Error('Null containing string');
    }
    if (!unicode && value.length <= 1) return 9;
    return unicode ? 11 : 10;
  }

  throw new Error('Unencodable data type');
}

function appendCompressedCode(codes, length, code, count) {
  if (count <= 0) return length;
  while (count > 19) {
    codes[length++] = 0b1110;
    codes[length++] = 15;
    count -= 19;
  }
  if (count === 1) codes[length++] = code;
  else if (count === 2) codes[length++] = 0b1100;
  else if (count === 3) codes[length++] = 0b1101;
  else {
    codes[length++] = 0b1110;
    codes[length++] = count - 4;
  }
  return length;
}

function encode(message) {
  const length = message.length;
  encodeTypeScratch = growScratch(encodeTypeScratch, length);
  const types = encodeTypeScratch;
  let contentSize = 0;

  // First pass: classify items and calculate payload size.
  for (let i = 0; i < length; i++) {
    const value = message[i];
    const code = types[i] = typeCodeOf(value);
    switch (code) {
      case 2:
      case 3:
      case 9:
        contentSize += 1;
        break;
      case 4:
      case 5:
        contentSize += 2;
        break;
      case 6:
      case 7:
      case 8:
        contentSize += 4;
        break;
      case 10:
        contentSize += value.length + 1;
        break;
      case 11:
        contentSize += value.length * 2 + 2;
        break;
    }
  }

  // There can never be more compressed header nibbles than twice the item
  // count plus the protocol sentinels. A typed array avoids repeated growth.
  encodeCodeScratch = growScratch(encodeCodeScratch, Math.max(4, length * 2 + 4));
  const codes = encodeCodeScratch;
  let codeLength = 0;
  let lastType = 15;
  let repeatCount = 0;

  for (let i = 0; i < length; i++) {
    const type = types[i];
    if (type === lastType) {
      repeatCount++;
      continue;
    }
    codes[codeLength++] = lastType;
    codeLength = appendCompressedCode(codes, codeLength, lastType, repeatCount);
    repeatCount = 0;
    lastType = type;
  }
  codes[codeLength++] = lastType;
  codeLength = appendCompressedCode(codes, codeLength, lastType, repeatCount);
  codes[codeLength++] = 15;
  if (codeLength & 1) codes[codeLength++] = 15;

  const headerBytes = codeLength >> 1;
  const output = new Uint8Array(headerBytes + contentSize);
  for (let i = 0; i < codeLength; i += 2) {
    output[i >> 1] = (codes[i] << 4) | codes[i + 1];
  }

  let index = headerBytes;
  for (let i = 0; i < length; i++) {
    const value = message[i];
    switch (types[i]) {
      case 0:
      case 1:
        break;
      case 2:
      case 3:
        output[index++] = value;
        break;
      case 4:
      case 5:
        u16[0] = value;
        output.set(c16, index);
        index += 2;
        break;
      case 6:
      case 7:
        u32[0] = value;
        output.set(c32, index);
        index += 4;
        break;
      case 8:
        f32[0] = value;
        output.set(c32, index);
        index += 4;
        break;
      case 9:
        output[index++] = value.length === 0 ? 0 : value.charCodeAt(0);
        break;
      case 10:
        for (let j = 0; j < value.length; j++) output[index++] = value.charCodeAt(j);
        output[index++] = 0;
        break;
      case 11:
        for (let j = 0; j < value.length; j++) {
          const code = value.charCodeAt(j);
          output[index++] = code & 0xff;
          output[index++] = code >> 8;
        }
        output[index++] = 0;
        output[index++] = 0;
        break;
    }
  }
  return output;
}

function decode(packet) {
  const data =
    packet instanceof Uint8Array
      ? packet
      : new Uint8Array(packet);
  if (!data.length || data[0] >> 4 !== 15) return null;

  // Parse headers into a typed scratch buffer first. This is bounded by twice
  // the packet size and avoids repeated Array growth.
  // Repeated-header compression can expand to more logical headers than
  // there are bytes in the encoded packet. Start small and grow geometrically
  // so ordinary packets stay cheap while long valid runs remain compatible.
  decodeHeaderScratch = growScratch(
    decodeHeaderScratch,
    Math.max(16, Math.min(256, data.length * 2))
  );
  let headers = decodeHeaderScratch;
  let headerCount = 0;
  const ensureHeaderCapacity = (needed) => {
    if (needed <= headers.length) return;
    headers = growScratch(headers, needed);
    decodeHeaderScratch = headers;
  };
  let index = 0;
  let consumedHalf = true;
  let lastType = 15;

  while (true) {
    if (index >= data.length) return null;
    let typeCode = data[index];
    if (consumedHalf) {
      typeCode &= 15;
      index++;
    } else {
      typeCode >>= 4;
    }
    consumedHalf = !consumedHalf;

    if ((typeCode & 0b1100) === 0b1100) {
      if (typeCode === 15) {
        if (consumedHalf) index++;
        break;
      }

      let repeat = typeCode - 10;
      if (typeCode === 14) {
        if (index >= data.length) return null;
        let repeatCode = data[index];
        if (consumedHalf) {
          repeatCode &= 15;
          index++;
        } else {
          repeatCode >>= 4;
        }
        consumedHalf = !consumedHalf;
        repeat += repeatCode;
      }
      ensureHeaderCapacity(headerCount + repeat);
      for (let i = 0; i < repeat; i++) headers[headerCount++] = lastType;
    } else {
      ensureHeaderCapacity(headerCount + 1);
      headers[headerCount++] = typeCode;
      lastType = typeCode;
    }
  }

  const output = new Array(headerCount);
  for (let i = 0; i < headerCount; i++) {
    const header = headers[i];
    switch (header) {
      case 0:
        output[i] = 0;
        break;
      case 1:
        output[i] = 1;
        break;
      case 2:
        if (index >= data.length) return null;
        output[i] = data[index++];
        break;
      case 3:
        if (index >= data.length) return null;
        output[i] = data[index++] - 0x100;
        break;
      case 4:
        if (index + 1 >= data.length) return null;
        c16[0] = data[index++];
        c16[1] = data[index++];
        output[i] = u16[0];
        break;
      case 5:
        if (index + 1 >= data.length) return null;
        c16[0] = data[index++];
        c16[1] = data[index++];
        output[i] = u16[0] - 0x10000;
        break;
      case 6:
        if (index + 3 >= data.length) return null;
        c32[0] = data[index++];
        c32[1] = data[index++];
        c32[2] = data[index++];
        c32[3] = data[index++];
        output[i] = u32[0];
        break;
      case 7:
        if (index + 3 >= data.length) return null;
        c32[0] = data[index++];
        c32[1] = data[index++];
        c32[2] = data[index++];
        c32[3] = data[index++];
        output[i] = u32[0] - 0x100000000;
        break;
      case 8:
        if (index + 3 >= data.length) return null;
        c32[0] = data[index++];
        c32[1] = data[index++];
        c32[2] = data[index++];
        c32[3] = data[index++];
        output[i] = f32[0];
        break;
      case 9: {
        if (index >= data.length) return null;
        const byte = data[index++];
        output[i] = byte === 0 ? '' : String.fromCharCode(byte);
        break;
      }
      case 10: {
        let string = '';
        let code;
        do {
          if (index >= data.length) return null;
          code = data[index++];
          if (code) string += String.fromCharCode(code);
        } while (code);
        output[i] = string;
        break;
      }
      case 11: {
        let string = '';
        let code;
        do {
          if (index + 1 >= data.length) return null;
          code = data[index++] | (data[index++] << 8);
          if (code) string += String.fromCharCode(code);
        } while (code);
        output[i] = string;
        break;
      }
      default:
        return null;
    }
  }
  return output;
}

exports.encode = encode;
exports.decode = decode;
