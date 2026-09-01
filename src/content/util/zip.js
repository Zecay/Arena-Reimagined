'use strict';
/* ArenaKit — minimal, dependency-free ZIP writer.
   Uses the built-in CompressionStream('deflate-raw') (Chrome 80+) so no third-party
   ZIP library is vendored. Generates a valid .zip (local file headers + central
   directory) entirely in-browser, then has the caller save it via a Blob + <a>.

   API:  AextZip.buildZip(entries) -> Promise<Blob>
         entries = [{ path: 'folder/a.txt', data: string|Uint8Array }]
         deflate = false produces STORE (no compression) entries.
*/

const AextZip = (() => {
  // CRC-32 (IEEE)
  const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
    return t;
  })();
  function crc32(data) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  function strToU8(s) { return new TextEncoder().encode(s); }
  function toU8(data) {
    if (data instanceof Uint8Array) return data;
    if (typeof data === 'string') return strToU8(data);
    if (data instanceof ArrayBuffer) return new Uint8Array(data);
    return strToU8(String(data));
  }

  function u16(v) { return [v & 0xFF, (v >>> 8) & 0xFF]; }
  function u32(v) { return [v & 0xFF, (v >>> 8) & 0xFF, (v >>> 16) & 0xFF, (v >>> 24) & 0xFF]; }

  async function deflateRaw(u8) {
    const cs = new CompressionStream('deflate-raw');
    const writer = cs.writable.getWriter();
    writer.write(u8);
    writer.close();
    const buf = await new Response(cs.readable).arrayBuffer();
    return new Uint8Array(buf);
  }

  async function buildZip(entries, opts) {
    opts = opts || {};
    const localParts = [];
    const centralParts = [];
    let offset = 0;

    for (const e of entries) {
      const nameU8 = strToU8(e.path.replace(/^\/+/, ''));
      let data = toU8(e.data);
      let method = 0;
      let compressed = data;
      if (!opts.store && data.length > 0 && typeof CompressionStream !== 'undefined') {
        try { compressed = await deflateRaw(data); method = 8; } catch (e2) { /* fallback store */ }
      }
      const crc = crc32(data);
      const [dosTime, dosDate] = _dosTime();

      const local = [
        ...u32(0x04034b50), // sig
        ...u16(20), ...u16(0x0800), // version, flags
        ...u16(method),
        ...u16(dosTime), ...u16(dosDate),
        ...u32(crc),
        ...u32(compressed.length), ...u32(data.length),
        ...u16(nameU8.length), ...u16(0)
      ];
      localParts.push(new Uint8Array(local), nameU8, compressed);

      const central = [
        ...u32(0x02014b50), // sig
        ...u16(20), ...u16(20), ...u16(0x0800),
        ...u16(method),
        ...u16(dosTime), ...u16(dosDate),
        ...u32(crc),
        ...u32(compressed.length), ...u32(data.length),
        ...u16(nameU8.length),
        ...u16(0), ...u16(0), ...u16(0), ...u16(0), // extra, comment, disk, int attrs
        ...u32(0), // ext attrs
        ...u32(offset) // local header offset
      ];
      centralParts.push(new Uint8Array(central), nameU8);
      offset += 30 + nameU8.length + compressed.length;
    }

    const cdStart = offset;
    let cdSize = 0;
    centralParts.forEach((p) => cdSize += p.length);
    const eocd = new Uint8Array([
      ...u32(0x06054b50), ...u16(0), ...u16(0),
      ...u16(entries.length), ...u16(entries.length),
      ...u32(cdSize), ...u32(cdStart), ...u16(0)
    ]);

    // concatenate
    const blobs = [];
    const push = (p) => blobs.push(new Blob([p], { type: 'application/zip' }));
    /// build one big Uint8Array for deterministic byte order
    const total = localParts.reduce((s, p) => s + p.length, 0) + cdSize + eocd.length;
    const out = new Uint8Array(total);
    let o = 0;
    for (const p of localParts) { out.set(p, o); o += p.length; }
    for (const p of centralParts) { out.set(p, o); o += p.length; }
    out.set(eocd, o);
    return new Blob([out], { type: 'application/zip' });
  }

  function _dosTime() {
    const d = new Date();
    const t = (((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1))) & 0xFFFF;
    const dt = (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xFFFF;
    return [t, dt];
  }

  function download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename || 'download.zip';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  return { buildZip, download, crc32, _blobFor: (e, o) => buildZip(e, o) };
})();
