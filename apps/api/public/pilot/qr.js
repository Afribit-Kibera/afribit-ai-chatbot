// A small QR Code encoder for the pilot console's link generator. Plain JavaScript, no dependencies,
// no network: the console's Content-Security-Policy allows scripts from its own origin only.
//
// Written for this project (Apache-2.0, see LICENSE), following ISO/IEC 18004: byte mode, error
// correction level M, versions 1 to 10 (up to 213 bytes, far more than a link needs), all eight masks
// tried and the lowest-penalty one kept. It is checked in apps/api/src/pilot/pilotCases.ts by decoding
// the matrix it produces (format bits, unmasking, Reed-Solomon check, payload) and by fixed vectors.
//
//   AfribitQR.encode("https://example.org/app?ref=hub")  ->  { version, size, modules: boolean[][] }  (true = dark)
//   AfribitQR.toSvgPath(qr, 4)                           ->  { viewBox: "0 0 N N", d: "M..." }  (4-module quiet zone)
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.AfribitQR = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var MAX_VERSION = 10;
  // Level M. Index = version.
  var ECC_PER_BLOCK = [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26];
  var NUM_BLOCKS = [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5];
  var FORMAT_BITS_M = 0; // level M in the format information

  function bit(value, i) { return ((value >>> i) & 1) !== 0; }

  function utf8(text) {
    var out = [];
    var s = unescape(encodeURIComponent(String(text)));
    for (var i = 0; i < s.length; i++) out.push(s.charCodeAt(i));
    return out;
  }

  function rawModules(ver) {
    var result = (16 * ver + 128) * ver + 64;
    if (ver >= 2) {
      var align = Math.floor(ver / 7) + 2;
      result -= (25 * align - 10) * align - 55;
      if (ver >= 7) result -= 36;
    }
    return result;
  }
  function rawCodewords(ver) { return Math.floor(rawModules(ver) / 8); }
  function dataCodewords(ver) { return rawCodewords(ver) - ECC_PER_BLOCK[ver] * NUM_BLOCKS[ver]; }

  // ---- Reed-Solomon over GF(256), polynomial 0x11D ----
  function gfMul(x, y) {
    var z = 0;
    for (var i = 7; i >= 0; i--) {
      z = (z << 1) ^ ((z >>> 7) * 0x11d);
      z ^= ((y >>> i) & 1) * x;
    }
    return z;
  }
  function generator(degree) {
    var result = [];
    for (var i = 0; i < degree - 1; i++) result.push(0);
    result.push(1);
    var root = 1;
    for (var k = 0; k < degree; k++) {
      for (var j = 0; j < result.length; j++) {
        result[j] = gfMul(result[j], root);
        if (j + 1 < result.length) result[j] ^= result[j + 1];
      }
      root = gfMul(root, 2);
    }
    return result;
  }
  function remainder(data, gen) {
    var result = gen.map(function () { return 0; });
    data.forEach(function (b) {
      var factor = b ^ result.shift();
      result.push(0);
      for (var i = 0; i < gen.length; i++) result[i] ^= gfMul(gen[i], factor);
    });
    return result;
  }

  function alignmentPositions(ver) {
    if (ver === 1) return [];
    var n = Math.floor(ver / 7) + 2;
    var size = ver * 4 + 17;
    var step = Math.floor((ver * 8 + n * 3 + 5) / (n * 4 - 4)) * 2;
    var out = [6];
    for (var pos = size - 7; out.length < n; pos -= step) out.splice(1, 0, pos);
    return out;
  }

  function makeDataCodewords(bytes, ver) {
    var bits = [];
    function push(value, count) { for (var i = count - 1; i >= 0; i--) bits.push((value >>> i) & 1); }
    push(4, 4); // byte mode
    push(bytes.length, ver <= 9 ? 8 : 16);
    bytes.forEach(function (b) { push(b, 8); });
    var capacity = dataCodewords(ver) * 8;
    push(0, Math.min(4, capacity - bits.length));
    push(0, (8 - (bits.length % 8)) % 8);
    for (var pad = 0xec; bits.length < capacity; pad ^= 0xec ^ 0x11) push(pad, 8);
    var words = [];
    for (var i = 0; i < bits.length; i += 8) {
      var w = 0;
      for (var j = 0; j < 8; j++) w = (w << 1) | bits[i + j];
      words.push(w);
    }
    return words;
  }

  function addEccAndInterleave(data, ver) {
    var blocks = NUM_BLOCKS[ver];
    var eccLen = ECC_PER_BLOCK[ver];
    var raw = rawCodewords(ver);
    var shortBlocks = blocks - (raw % blocks);
    var shortLen = Math.floor(raw / blocks);
    var gen = generator(eccLen);
    var all = [];
    for (var i = 0, k = 0; i < blocks; i++) {
      var dat = data.slice(k, k + shortLen - eccLen + (i < shortBlocks ? 0 : 1));
      k += dat.length;
      var ecc = remainder(dat, gen);
      if (i < shortBlocks) dat.push(0);
      all.push(dat.concat(ecc));
    }
    var out = [];
    for (var col = 0; col < all[0].length; col++) {
      for (var b = 0; b < all.length; b++) {
        if (col !== shortLen - eccLen || b >= shortBlocks) out.push(all[b][col]);
      }
    }
    return out;
  }

  function newGrid(size, fill) {
    var g = [];
    for (var y = 0; y < size; y++) { var row = []; for (var x = 0; x < size; x++) row.push(fill); g.push(row); }
    return g;
  }

  function drawFunctionPatterns(modules, isFn, ver) {
    var size = modules.length;
    function set(x, y, dark) { modules[y][x] = dark; isFn[y][x] = true; }
    for (var i = 0; i < size; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
    function finder(cx, cy) {
      for (var dy = -4; dy <= 4; dy++) for (var dx = -4; dx <= 4; dx++) {
        var dist = Math.max(Math.abs(dx), Math.abs(dy));
        var x = cx + dx, y = cy + dy;
        if (x >= 0 && x < size && y >= 0 && y < size) set(x, y, dist !== 2 && dist !== 4);
      }
    }
    finder(3, 3); finder(size - 4, 3); finder(3, size - 4);
    var pos = alignmentPositions(ver);
    for (var a = 0; a < pos.length; a++) for (var b = 0; b < pos.length; b++) {
      if ((a === 0 && b === 0) || (a === 0 && b === pos.length - 1) || (a === pos.length - 1 && b === 0)) continue;
      for (var dy2 = -2; dy2 <= 2; dy2++) for (var dx2 = -2; dx2 <= 2; dx2++) set(pos[a] + dx2, pos[b] + dy2, Math.max(Math.abs(dx2), Math.abs(dy2)) !== 1);
    }
    drawFormat(modules, isFn, 0); // reserves the cells; rewritten once the mask is chosen
    if (ver >= 7) {
      var rem = ver;
      for (var r = 0; r < 12; r++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
      var bits = (ver << 12) | rem;
      for (var k = 0; k < 18; k++) {
        var dark = bit(bits, k);
        var p = size - 11 + (k % 3), q = Math.floor(k / 3);
        set(p, q, dark); set(q, p, dark);
      }
    }
  }

  function drawFormat(modules, isFn, mask) {
    var size = modules.length;
    function set(x, y, dark) { modules[y][x] = dark; isFn[y][x] = true; }
    var data = (FORMAT_BITS_M << 3) | mask;
    var rem = data;
    for (var i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    var bits = ((data << 10) | rem) ^ 0x5412;
    for (var a = 0; a <= 5; a++) set(8, a, bit(bits, a));
    set(8, 7, bit(bits, 6)); set(8, 8, bit(bits, 7)); set(7, 8, bit(bits, 8));
    for (var b = 9; b < 15; b++) set(14 - b, 8, bit(bits, b));
    for (var c = 0; c < 8; c++) set(size - 1 - c, 8, bit(bits, c));
    for (var d = 8; d < 15; d++) set(8, size - 15 + d, bit(bits, d));
    set(8, size - 8, true);
  }

  function drawCodewords(modules, isFn, codewords) {
    var size = modules.length;
    var i = 0;
    for (var right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (var vert = 0; vert < size; vert++) {
        for (var j = 0; j < 2; j++) {
          var x = right - j;
          var upward = ((right + 1) & 2) === 0;
          var y = upward ? size - 1 - vert : vert;
          if (!isFn[y][x] && i < codewords.length * 8) {
            modules[y][x] = bit(codewords[i >>> 3], 7 - (i & 7));
            i++;
          }
        }
      }
    }
  }

  function maskHit(mask, x, y) {
    switch (mask) {
      case 0: return (x + y) % 2 === 0;
      case 1: return y % 2 === 0;
      case 2: return x % 3 === 0;
      case 3: return (x + y) % 3 === 0;
      case 4: return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
      case 5: return ((x * y) % 2) + ((x * y) % 3) === 0;
      case 6: return ((((x * y) % 2) + ((x * y) % 3)) % 2) === 0;
      default: return ((((x + y) % 2) + ((x * y) % 3)) % 2) === 0;
    }
  }
  function applyMask(modules, isFn, mask) {
    var size = modules.length;
    for (var y = 0; y < size; y++) for (var x = 0; x < size; x++) {
      if (!isFn[y][x] && maskHit(mask, x, y)) modules[y][x] = !modules[y][x];
    }
  }

  // Penalty rules N1 to N4 of the specification.
  function penalty(modules) {
    var size = modules.length, score = 0, line, y, x, k;
    function lineScore(cells) {
      var s = 0, run = 1;
      for (var i = 1; i <= cells.length; i++) {
        if (i < cells.length && cells[i] === cells[i - 1]) run++;
        else { if (run >= 5) s += run - 2; run = 1; }
      }
      var str = cells.map(function (c) { return c ? "1" : "0"; }).join("");
      var pats = ["10111010000", "00001011101"];
      pats.forEach(function (p) { for (var at = str.indexOf(p); at >= 0; at = str.indexOf(p, at + 1)) s += 40; });
      return s;
    }
    for (y = 0; y < size; y++) score += lineScore(modules[y]);
    for (x = 0; x < size; x++) { line = []; for (y = 0; y < size; y++) line.push(modules[y][x]); score += lineScore(line); }
    for (y = 0; y < size - 1; y++) for (x = 0; x < size - 1; x++) {
      var c = modules[y][x];
      if (c === modules[y][x + 1] && c === modules[y + 1][x] && c === modules[y + 1][x + 1]) score += 3;
    }
    var dark = 0;
    for (y = 0; y < size; y++) for (x = 0; x < size; x++) if (modules[y][x]) dark++;
    k = Math.ceil(Math.abs(dark * 20 - size * size * 10) / (size * size)) - 1;
    return score + Math.max(0, k) * 10;
  }

  function encode(text) {
    var bytes = utf8(text);
    var ver = 1;
    while (ver <= MAX_VERSION && 4 + (ver <= 9 ? 8 : 16) + bytes.length * 8 > dataCodewords(ver) * 8) ver++;
    if (ver > MAX_VERSION) throw new Error("That is too long for a QR code here (most " + (dataCodewords(MAX_VERSION) - 3) + " characters).");
    var size = ver * 4 + 17;
    var codewords = addEccAndInterleave(makeDataCodewords(bytes, ver), ver);

    var base = newGrid(size, false), isFn = newGrid(size, false);
    drawFunctionPatterns(base, isFn, ver);
    drawCodewords(base, isFn, codewords);

    var best = null, bestScore = Infinity, bestMask = 0;
    for (var mask = 0; mask < 8; mask++) {
      var m = base.map(function (row) { return row.slice(); });
      applyMask(m, isFn, mask);
      drawFormat(m, newGrid(size, false), mask);
      var score = penalty(m);
      if (score < bestScore) { best = m; bestScore = score; bestMask = mask; }
    }
    return { version: ver, size: size, mask: bestMask, modules: best };
  }

  // One SVG path for all dark modules, plus the viewBox including the quiet zone (4 modules by the specification).
  function toSvgPath(qr, border) {
    var b = border === undefined ? 4 : border, parts = [];
    for (var y = 0; y < qr.size; y++) for (var x = 0; x < qr.size; x++) {
      if (qr.modules[y][x]) parts.push("M" + (x + b) + "," + (y + b) + "h1v1h-1z");
    }
    var n = qr.size + b * 2;
    return { viewBox: "0 0 " + n + " " + n, d: parts.join("") };
  }

  return { encode: encode, toSvgPath: toSvgPath };
});
