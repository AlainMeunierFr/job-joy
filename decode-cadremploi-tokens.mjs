import * as fs from 'fs';
import * as zlib from 'zlib';

const tokens = [
  "bPJGNxZUv11Kish3tS57uz81rvv51FgGVS3f3bH7E3ZadCHLjSwuL_Ucz564Tc91-8Hi3eqAp5u-HAIrRU3GWHEKzjsu_ySdgZeaqGhp1Ar2ezp_Z2Q5-3dZqt1A6G0OIwrq8dbYsuvjMiyyvUlC0DXqWLWCairQRJ-WlCwBcYLyjG2HQP597zY804Zrkux9gi6o9poVxInn7iQMk0R1dKSCaIaR9lNC1Ok88JUCnou7kY3DiNxwipWwHcQQDWWH5V3XdSX464ogPvEy4YKqmdk_DvWWtW53u10Rgk8n6hxSMQTVQvBiPLRE2dJagHDlt0wFtcNvno8mM17ZXTVLc3huXPTe6sTaCpzrngMviK3MIe9ebMpJ2Aj4rnVrCt8EP__febYZHZaIGkbgzh-xKODR4i0mnnVeZwuoBzCjNQfqUpMpJJpfTCrpH3WzBYisQnixZDkV8DG5jg7Z4POYMGKY_zsS7AkpZodWcGIBP7K7TcKWVz5BnShlozF4NnDW8qCRQc5gpRLCfNbgZ-JzXu1iQpQ9KnAAvzYglzIJvN2rgtiGW_v-x7vS9plWa_KvCKV-taH82chDBA017Lt6_nAcMH55keWmx27X40nqTiL0EzwznaXHoTv1LPCulWOdKmISax2AmmppzzGcESDqclvOrfsWXAZWObaF8Yv1QfFgz9dzdFR-vNun0dQEDgVPV0dxNYpErGPpdr3V9MR26I12GkstqlXbJvW7YFujvCUst0H1KnJT3klDE2BuZx8eOAXIgc2glHSibQ7LG6IJZfL8w8NRlp4",
  "UZXVlAoJGZ19_q-oxrDbkBOSNu0ICMoBu898PrdiqIUOpUC5GtGrcTIbqO55lFlPi80K29piv4xB6rFpE_Bx7hndg-2b60xrLXeDPOF2iNl_bMxScYa07N4dTiL_38iKAmbDtdxm1_-dTOH2kDB9YBwujcWHas_GN_xGzP9m5oy8lyMAIa0Lzu6x5ecBTqSd-AefbAWPYveL0MoF3Cgunw25Pk_Ol6ZW-GNpovFAXibHcyQqPWrYVV-J8etaNantgdQdDYTw6Zy94PXwxSzHb03Vwxm8H5w-dHbTd9R_2gXMp-2PV7U3ykuhpEzlY4KqHCpmeYuQTnr0vXzy7NgMmD9AFXs4CCn-UqoOv76BSMvrVOQIrnDrzB_j4Adc-mTQLkDjB9Y2lZdD6PPM7eNQFYfjMoY07aCpXnFi5fI7snX8ZfjR7X9OvAM-DyiSBZYvYZynd27Ix7tvDyxY8GqXHlNlaNCREUmou-mhJ1PZdtsgO_E0VeWUVGVDHBe4nzsjJaB2NaZV5NqVMAyBjYpUSTN516lYOuP0cGDDFV5VpvBDZ7_roEGNpr9p4jImvY1xSgEAU1hy9sWrL83XeTCTVq0ZCWC_tHaT-34cLiDLTmGQ9WnmRvd-gjFIafu270vkUteR2ZoXFQpwxGi675KBGM_lye0nfzC3eTO5ADKojgHRkiF9Gm7GxYbeKEhk-MSnUExltF-Dvw7c4uwUz03otQ1fcUfYdlZHdgwn7kbS06h9_25YV6u5ULUjIKGlWH4HjiXHcXsenQvIPXJfk7zahD_YPAUHvkQ",
  "OcrWfxSp5klms9MqpIvDmX4hZj_j18pqIpFpZgcjoCroqhdwrqa5UBSo8u8co2N7mqqoS5PMbp_d2fXaOjOK5kml4kPJSrmhAFTtpo1TvSKvQxq14ksqSC7b_8wH6TAHsXZ-j36Stm5rSBjociM3xZWphtHM6fkbALiP8Ntgj-9mDU8E3NbQh-s74-QW2glxJ7wM5TzbHtnPYhgsMHmQ6hRzkS9js6vdG-l5_tigiVuWeof_33znjEEssx5KaFlRn89ilUnW6S58tssE0sbnlhBod05KLvjjViLIp8zvW7MT7QYpcA419GfUCXkwuSPJtCUSCyBJTHzX47nIeixTCSLLhj8KYIpX-l_BFEUBmmynNYtUNp6le_WydZigRsE46Y-jPGmeOp_DySytSgfjlD--iO_DDg8ax5acFshy2_WTx6RjE-l4LOgewbncUFVW9U3oNsjUVU-M_9oEuOF6Ar-1Wbu-s7w3ZWmHrRg1FD9V7DdJIzv1DlvAcLXsyHvI8FGgU3XMjHuiatZ5rN5QMBaE2mtzBQpIrJa4ifLN9svf8tpVsSxqVErS5Hw-bt1iWVJ5QCrf4gUvJl3eeCS5Fv3w-lmmY0fmGZlxj7QO0dYTgSV2LCIfqUWpUQV4Z-xazNwsXxxD7YVzOwWxLPKt463bPRuNB49MUK8_0-9FwdGM2qcNuBFFmjX9kCLarZXDlI2LnjG9STQoWh6HIlmq5EEMPyx2VrRRYREYoouGpGScaQfSLVszobYUixZ11nwimv05R1utDDtmjvgkcVlvGtH26fZU_gaQyGSbPV_v6EdP0atF1AAtW8V1R7Y5GJRINMTKXQ_5BMCPh-94Fu8bODiS5BDU5qe6DCI4pZAsyV3i3A8O",
  "RIRU4DH0ArCTKa9EruKDOdpQcQhxRlsMGUGI4EVGXqtARoXrbflMoxmM2kJdEGvDtAs9bp1PebqIDDgtmKVz8YWh44B3BzTPEl8bMd0e7tTbii6PU97hWq-y8VEQnYZTcSJs_RVoFGtHALMApH_UH_sPkNC2LQ2b0Ab1_W5QsSaiDyu_pgpCOBsY1ldJoFOT1x6mT5So01EgGaHqdB-ZtJsZh8wWgYoBMuOkePvp9awhbw8Dr3It1UGrG7P9JXykC7X9xqe-FfhM_Xt9C70Mm903Rl4U9EMzB-NSA-LEMaiNsRmUq2QF8FxHibIletTjQxNcHLyEMq736NSTNgY2wqcOVhTbj4yWu-7ywrU6s-l4nrioDsHfrLW-q_Lcr6goseyEme6_JysZSMa2cOdIT91unVUflgA-mJqlbzSFJHc9bpN5fu38eLwp13YjDZQ3uiu8qvjOk7SRMakhPE9qYB9NV2DcucibAdchZYefewEthLo1FfCRSfW96zVL1zGzL4qzn8y5nBGHMPOkyZ0Zl88EJyaM9JnMmGsvFOFkR8X7nOdDjQZKPxMNwaA-IrwZJYDob4vvq4YhhUX9yi4SQk4bDXOHh9Ds-O72Y08G8RuVd45d7SmXHhIlIgo-hh5LWnhmFYjl2FqO6UJ_Bk0b9Knt_Hp2ryyVWY9llg8TxjWpOYhAL4hc0AIsAzUEIPOFRkWMiqSAe4aMgFyC8fdaCgr6tu5cMR1-3FvOJRzBt0H3lTs8iWdHP9iAdfunYKb1asBNu9rxNMLElqlf2TfOkCkLpcNJPlj0JDILkh4i98krG9ExKUhAjDl3Ckm7W7imL1oyBjqIcdyHMdV5poIrX8ckwgSuyMhTy3_o1C4yeYaa1_WB",
];

if (tokens.length === 0) {
  console.log('Remplis le tableau tokens (segments après /tr/cl/) puis relance: node decode-cadremploi-tokens.mjs');
  process.exit(1);
}

function safe(s, max = 200) {
  const x = String(s);
  return x.length <= max ? x : x.slice(0, max) + "...[trunc]";
}

function tryDecode(name, fn) {
  return tokens.map((t, i) => {
    try {
      return `  [${i}] ${name}: ${safe(fn(t))}`;
    } catch (e) {
      return `  [${i}] ${name}: ERROR ${e.message}`;
    }
  }).join('\n');
}

function base64urlToBase64(s) {
  return s.replace(/-/g, '+').replace(/_/g, '/') + '=='.slice(0, (4 - (s.length % 4)) % 4);
}

const lines = [];

lines.push('=== Base64 std -> utf8 ===');
lines.push(tryDecode('b64', t => Buffer.from(base64urlToBase64(t), 'base64').toString('utf8')));
lines.push('');

lines.push('=== Base64 -> hex ===');
lines.push(tryDecode('hex', t => Buffer.from(base64urlToBase64(t), 'base64').toString('hex')));
lines.push('');

lines.push('=== Base64 -> latin1 ===');
lines.push(tryDecode('latin1', t => Buffer.from(base64urlToBase64(t), 'base64').toString('latin1')));
lines.push('');

lines.push('=== len + first 32 bytes hex ===');
lines.push(tryDecode('buf', t => {
  const b = Buffer.from(base64urlToBase64(t), 'base64');
  return `len=${b.length} hex=${b.slice(0, 32).toString('hex')}`;
}));
lines.push('');

lines.push('=== Reverse token then Base64 -> utf8 ===');
lines.push(tryDecode('rev', t => Buffer.from(base64urlToBase64(t.split('').reverse().join('')), 'base64').toString('utf8')));
lines.push('');

lines.push('=== Double Base64 (decode once -> utf8, decode that as base64) ===');
lines.push(tryDecode('doubleB64', t => {
  const first = Buffer.from(base64urlToBase64(t), 'base64').toString('utf8');
  return Buffer.from(first.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
}));
lines.push('');

lines.push('=== Base64 -> utf8 then JSON.parse ===');
lines.push(tryDecode('json', t => JSON.stringify(JSON.parse(Buffer.from(base64urlToBase64(t), 'base64').toString('utf8')))));
lines.push('');

lines.push('=== Token as hex string -> utf8 ===');
lines.push(tryDecode('asHex', t => {
  const c = t.replace(/-/g, '').replace(/_/g, '');
  if (!/^[0-9A-Fa-f]+$/.test(c)) return 'not hex';
  return Buffer.from(c, 'hex').toString('utf8');
}));
lines.push('');

lines.push('=== Token as URL-encoded (decodeURIComponent) ===');
lines.push(tryDecode('urlDecode', t => decodeURIComponent(t.replace(/_/g, '%5F').replace(/-/g, '%2D'))));
lines.push('');

lines.push('=== zlib inflateRaw ===');
lines.push(tryDecode('inflateRaw', t => zlib.inflateRawSync(Buffer.from(base64urlToBase64(t), 'base64')).toString('utf8')));
lines.push('');

lines.push('=== zlib inflate (zlib header) ===');
lines.push(tryDecode('inflate', t => zlib.inflateSync(Buffer.from(base64urlToBase64(t), 'base64')).toString('utf8')));
lines.push('');

lines.push('=== zlib gunzip ===');
lines.push(tryDecode('gunzip', t => zlib.gunzipSync(Buffer.from(base64urlToBase64(t), 'base64')).toString('utf8')));
lines.push('');

const base32Alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function decodeBase32(s) {
  s = s.replace(/-/g, '').replace(/_/g, '').toUpperCase();
  const bin = [];
  for (let i = 0; i < s.length; i++) {
    const idx = base32Alphabet.indexOf(s[i]);
    if (idx === -1) return null;
    for (let b = 4; b >= 0; b--) bin.push((idx >> b) & 1);
  }
  const out = [];
  for (let i = 0; i + 8 <= bin.length; i += 8) {
    out.push(parseInt(bin.slice(i, i + 8).join(''), 2));
  }
  return Buffer.from(out).toString('utf8');
}
lines.push('=== Base32 (RFC 4648) ===');
lines.push(tryDecode('base32', t => decodeBase32(t) ?? 'invalid base32'));
lines.push('');

lines.push('=== First 4 bytes hex (magic) ===');
lines.push(tryDecode('magic', t => Buffer.from(base64urlToBase64(t), 'base64').slice(0, 4).toString('hex')));

fs.writeFileSync('decode-cadremploi-tokens-result.txt', lines.join('\n'), 'utf8');
console.log('Written decode-cadremploi-tokens-result.txt');
