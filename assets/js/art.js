/* ==========================================================================
   TONY COSMETICS — art.js
   Generates on-the-fly SVG product illustrations as data-URIs.
   No external image files required; every product gets a clean, on-brand shot.
   Usage:  TCArt.img({ shape:'flacon', c1:'#d94b8a', c2:'#a8326a', bg:'#fdeef4' })
   ========================================================================== */
(function (global) {
  'use strict';

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* ---- individual bottle / container silhouettes ------------------------- */
  var SHAPES = {

    /* classic rectangular perfume flacon */
    flacon: function (c) {
      return ''
        + '<rect x="164" y="88" width="72" height="46" rx="9" fill="' + c.k1 + '"/>'
        + '<rect x="170" y="130" width="60" height="16" rx="4" fill="' + c.k2 + '"/>'
        + '<rect x="182" y="144" width="36" height="26" rx="3" fill="#ffffff" opacity=".35"/>'
        + '<path d="M178 168h44c34 0 62 28 62 62v118c0 20-16 36-36 36h-96c-20 0-36-16-36-36V230c0-34 28-62 62-62z" fill="url(#g)"/>'
        + '<path d="M178 168h44c34 0 62 28 62 62v40c-30 22-138 22-168 0v-40c0-34 28-62 62-62z" fill="#ffffff" opacity=".18"/>'
        + '<rect x="139" y="228" width="122" height="82" rx="7" fill="#ffffff" opacity=".9"/>'
        + '<rect x="152" y="246" width="72" height="7" rx="3.5" fill="' + c.k1 + '" opacity=".8"/>'
        + '<rect x="152" y="262" width="96" height="5" rx="2.5" fill="' + c.k2 + '" opacity=".45"/>'
        + '<rect x="152" y="276" width="56" height="5" rx="2.5" fill="' + c.k2 + '" opacity=".3"/>'
        + '<rect x="128" y="196" width="13" height="150" rx="6.5" fill="#ffffff" opacity=".28"/>';
    },

    /* trigger spray bottle */
    spray: function (c) {
      return ''
        + '<rect x="196" y="72" width="14" height="22" rx="4" fill="' + c.k1 + '"/>'
        + '<path d="M196 78h-34a6 6 0 0 0-6 6v8h40z" fill="' + c.k1 + '"/>'
        + '<rect x="192" y="94" width="24" height="26" rx="5" fill="' + c.k2 + '"/>'
        + '<rect x="180" y="118" width="46" height="16" rx="4" fill="' + c.k1 + '"/>'
        + '<path d="M180 132h40c28 0 50 22 50 50v170c0 18-14 32-32 32h-76c-18 0-32-14-32-32V182c0-28 22-50 50-50z" fill="url(#g)"/>'
        + '<rect x="140" y="182" width="12" height="168" rx="6" fill="#ffffff" opacity=".3"/>'
        + '<rect x="168" y="216" width="64" height="96" rx="8" fill="#ffffff" opacity=".9"/>'
        + '<circle cx="200" cy="248" r="15" fill="' + c.k1 + '" opacity=".85"/>'
        + '<rect x="184" y="272" width="32" height="6" rx="3" fill="' + c.k2 + '" opacity=".5"/>'
        + '<rect x="180" y="286" width="40" height="5" rx="2.5" fill="' + c.k2 + '" opacity=".3"/>';
    },

    /* wide cosmetic jar */
    jar: function (c) {
      return ''
        + '<ellipse cx="200" cy="152" rx="92" ry="20" fill="' + c.k1 + '"/>'
        + '<path d="M108 152h184v22c0 11-41 20-92 20s-92-9-92-20z" fill="' + c.k2 + '"/>'
        + '<path d="M112 174h176v160c0 24-39 40-88 40s-88-16-88-40z" fill="url(#g)"/>'
        + '<path d="M112 174h176v54c-30 18-146 18-176 0z" fill="#ffffff" opacity=".2"/>'
        + '<rect x="132" y="216" width="12" height="118" rx="6" fill="#ffffff" opacity=".3"/>'
        + '<rect x="152" y="242" width="96" height="62" rx="7" fill="#ffffff" opacity=".92"/>'
        + '<rect x="166" y="262" width="68" height="7" rx="3.5" fill="' + c.k1 + '" opacity=".8"/>'
        + '<rect x="166" y="278" width="44" height="5" rx="2.5" fill="' + c.k2 + '" opacity=".4"/>';
    },

    /* squeeze tube, cap at bottom */
    tube: function (c) {
      return ''
        + '<path d="M148 92h104c8 0 14 7 13 15l-16 218c-1 16-14 27-30 27h-38c-16 0-29-11-30-27L135 107c-1-8 5-15 13-15z" fill="url(#g)"/>'
        + '<path d="M148 92h40v258h-20c-16 0-29-11-30-27L135 107c-1-8 5-15 13-15z" fill="#ffffff" opacity=".16"/>'
        + '<rect x="168" y="366" width="64" height="26" rx="5" fill="' + c.k1 + '"/>'
        + '<rect x="174" y="390" width="52" height="18" rx="5" fill="' + c.k2 + '"/>'
        + '<rect x="156" y="150" width="88" height="88" rx="7" fill="#ffffff" opacity=".92"/>'
        + '<rect x="170" y="172" width="60" height="8" rx="4" fill="' + c.k1 + '" opacity=".8"/>'
        + '<rect x="170" y="190" width="42" height="5" rx="2.5" fill="' + c.k2 + '" opacity=".4"/>'
        + '<rect x="170" y="204" width="52" height="5" rx="2.5" fill="' + c.k2 + '" opacity=".28"/>'
        + '<rect x="142" y="118" width="10" height="200" rx="5" fill="#ffffff" opacity=".28"/>';
    },

    /* lipstick */
    lipstick: function (c) {
      return ''
        + '<path d="M170 96c0-16 13-28 30-28s30 12 30 28v34h-60z" fill="' + c.k1 + '"/>'
        + '<path d="M170 96c0-16 13-28 30-28v62h-30z" fill="#ffffff" opacity=".18"/>'
        + '<rect x="162" y="128" width="76" height="16" rx="3" fill="' + c.k2 + '"/>'
        + '<rect x="168" y="144" width="64" height="46" rx="4" fill="' + c.k1 + '"/>'
        + '<path d="M150 190h100c8 0 14 6 14 14v146c0 16-13 29-29 29h-70c-16 0-29-13-29-29V204c0-8 6-14 14-14z" fill="url(#g)"/>'
        + '<rect x="132" y="222" width="12" height="130" rx="6" fill="#ffffff" opacity=".28"/>'
        + '<rect x="158" y="232" width="84" height="52" rx="6" fill="#ffffff" opacity=".9"/>'
        + '<rect x="172" y="250" width="56" height="7" rx="3.5" fill="' + c.k1 + '" opacity=".8"/>'
        + '<rect x="172" y="264" width="34" height="5" rx="2.5" fill="' + c.k2 + '" opacity=".4"/>';
    },

    /* serum dropper */
    dropper: function (c) {
      return ''
        + '<rect x="184" y="76" width="32" height="30" rx="6" fill="' + c.k1 + '"/>'
        + '<rect x="190" y="104" width="20" height="42" rx="4" fill="' + c.k2 + '"/>'
        + '<rect x="178" y="144" width="44" height="18" rx="5" fill="' + c.k1 + '"/>'
        + '<path d="M170 160h60c22 0 40 18 40 40v146c0 18-14 32-32 32h-76c-18 0-32-14-32-32V200c0-22 18-40 40-40z" fill="url(#g)"/>'
        + '<rect x="134" y="200" width="12" height="140" rx="6" fill="#ffffff" opacity=".3"/>'
        + '<path d="M140 258h120v46c0 18-14 32-32 32h-56c-18 0-32-14-32-32z" fill="' + c.k2 + '" opacity=".35"/>'
        + '<rect x="162" y="212" width="76" height="58" rx="7" fill="#ffffff" opacity=".92"/>'
        + '<path d="M200 226c6 9 10 14 10 19a10 10 0 0 1-20 0c0-5 4-10 10-19z" fill="' + c.k1 + '" opacity=".8"/>'
        + '<rect x="176" y="252" width="48" height="5" rx="2.5" fill="' + c.k2 + '" opacity=".4"/>';
    },

    /* round compact / powder */
    compact: function (c) {
      return ''
        + '<ellipse cx="200" cy="238" rx="112" ry="112" fill="' + c.k1 + '"/>'
        + '<ellipse cx="200" cy="238" rx="112" ry="112" fill="url(#g)" opacity=".45"/>'
        + '<ellipse cx="200" cy="232" rx="96" ry="96" fill="#ffffff" opacity=".92"/>'
        + '<ellipse cx="200" cy="228" rx="72" ry="70" fill="url(#g)" opacity=".22"/>'
        + '<circle cx="200" cy="228" r="26" fill="' + c.k1 + '" opacity=".8"/>'
        + '<circle cx="200" cy="228" r="11" fill="#ffffff" opacity=".9"/>'
        + '<path d="M132 190a112 112 0 0 1 40-46" fill="none" stroke="#ffffff" stroke-width="12" stroke-linecap="round" opacity=".7"/>'
        + '<rect x="88" y="352" width="224" height="16" rx="8" fill="' + c.k1 + '" opacity=".25"/>';
    },

    /* pump / lotion bottle */
    pump: function (c) {
      return ''
        + '<rect x="192" y="60" width="20" height="18" rx="4" fill="' + c.k1 + '"/>'
        + '<path d="M210 66h22a6 6 0 0 1 6 6v8h-28z" fill="' + c.k1 + '"/>'
        + '<rect x="190" y="78" width="24" height="30" rx="4" fill="' + c.k2 + '"/>'
        + '<rect x="184" y="106" width="36" height="16" rx="4" fill="' + c.k1 + '"/>'
        + '<path d="M176 120h48c32 0 58 26 58 58v142c0 22-18 40-40 40h-84c-22 0-40-18-40-40V178c0-32 26-58 58-58z" fill="url(#g)"/>'
        + '<path d="M176 120h20c-30 6-46 30-46 58v140c0 18 12 34 30 38-24-2-44-20-44-40V178c0-32 26-58 40-58z" fill="#ffffff" opacity=".18"/>'
        + '<rect x="140" y="172" width="12" height="150" rx="6" fill="#ffffff" opacity=".3"/>'
        + '<rect x="158" y="200" width="84" height="86" rx="7" fill="#ffffff" opacity=".9"/>'
        + '<rect x="172" y="222" width="60" height="7" rx="3.5" fill="' + c.k1 + '" opacity=".8"/>'
        + '<rect x="172" y="238" width="48" height="5" rx="2.5" fill="' + c.k2 + '" opacity=".4"/>'
        + '<rect x="172" y="252" width="36" height="5" rx="2.5" fill="' + c.k2 + '" opacity=".28"/>';
    },

    /* gift / discovery box */
    box: function (c) {
      return ''
        + '<rect x="94" y="140" width="212" height="222" rx="14" fill="url(#g)"/>'
        + '<path d="M94 154c0-8 6-14 14-14h184c8 0 14 6 14 14v22H94z" fill="#ffffff" opacity=".18"/>'
        + '<rect x="80" y="126" width="240" height="34" rx="10" fill="' + c.k1 + '"/>'
        + '<rect x="182" y="126" width="36" height="236" fill="' + c.k1 + '" opacity=".55"/>'
        + '<path d="M200 126c-26-4-46-14-46-28 0-10 9-16 19-14 12 2 20 12 27 42z" fill="' + c.k1 + '"/>'
        + '<path d="M200 126c26-4 46-14 46-28 0-10-9-16-19-14-12 2-20 12-27 42z" fill="' + c.k2 + '"/>'
        + '<rect x="126" y="212" width="148" height="66" rx="8" fill="#ffffff" opacity=".93"/>'
        + '<rect x="144" y="232" width="82" height="8" rx="4" fill="' + c.k1 + '" opacity=".8"/>'
        + '<rect x="144" y="250" width="58" height="5" rx="2.5" fill="' + c.k2 + '" opacity=".4"/>'
        + '<rect x="110" y="160" width="12" height="180" rx="6" fill="#ffffff" opacity=".22"/>';
    },

    /* slim tall oil / attar bottle */
    oil: function (c) {
      return ''
        + '<rect x="188" y="66" width="24" height="20" rx="5" fill="' + c.k1 + '"/>'
        + '<rect x="194" y="84" width="12" height="54" rx="4" fill="' + c.k2 + '"/>'
        + '<path d="M182 136h36c18 0 32 14 32 32v170c0 24-19 42-42 42h-16c-23 0-42-18-42-42V168c0-18 14-32 32-32z" fill="url(#g)"/>'
        + '<path d="M182 136h16v244h-16c-23 0-42-18-42-42V168c0-18 14-32 32-32z" fill="#ffffff" opacity=".18"/>'
        + '<path d="M142 244h116v94c0 24-19 42-42 42h-32c-23 0-42-18-42-42z" fill="' + c.k2 + '" opacity=".32"/>'
        + '<rect x="152" y="196" width="96" height="54" rx="7" fill="#ffffff" opacity=".92"/>'
        + '<rect x="166" y="214" width="68" height="7" rx="3.5" fill="' + c.k1 + '" opacity=".8"/>'
        + '<rect x="166" y="229" width="44" height="5" rx="2.5" fill="' + c.k2 + '" opacity=".4"/>'
        + '<rect x="140" y="190" width="10" height="130" rx="5" fill="#ffffff" opacity=".3"/>';
    },

    /* roll-on */
    rollon: function (c) {
      return ''
        + '<rect x="180" y="96" width="40" height="24" rx="5" fill="' + c.k1 + '"/>'
        + '<rect x="186" y="120" width="28" height="26" rx="4" fill="' + c.k2 + '"/>'
        + '<path d="M172 144h56c20 0 36 16 36 36v160c0 22-18 40-40 40h-48c-22 0-40-18-40-40V180c0-20 16-36 36-36z" fill="url(#g)"/>'
        + '<rect x="150" y="196" width="12" height="140" rx="6" fill="#ffffff" opacity=".3"/>'
        + '<rect x="170" y="216" width="60" height="70" rx="7" fill="#ffffff" opacity=".92"/>'
        + '<rect x="182" y="236" width="36" height="7" rx="3.5" fill="' + c.k1 + '" opacity=".8"/>'
        + '<rect x="182" y="252" width="26" height="5" rx="2.5" fill="' + c.k2 + '" opacity=".4"/>';
    },

    /* tall mist / deodorant can */
    mist: function (c) {
      return ''
        + '<rect x="176" y="72" width="48" height="26" rx="7" fill="' + c.k1 + '"/>'
        + '<rect x="184" y="96" width="32" height="14" rx="4" fill="' + c.k2 + '"/>'
        + '<path d="M170 108h60c14 0 24 10 24 24v216c0 18-14 32-32 32h-44c-18 0-32-14-32-32V132c0-14 10-24 24-24z" fill="url(#g)"/>'
        + '<path d="M170 108h22v272h-10c-18 0-32-14-32-32V132c0-14 10-24 20-24z" fill="#ffffff" opacity=".16"/>'
        + '<rect x="152" y="150" width="12" height="190" rx="6" fill="#ffffff" opacity=".28"/>'
        + '<rect x="166" y="182" width="68" height="96" rx="8" fill="#ffffff" opacity=".9"/>'
        + '<rect x="180" y="204" width="40" height="8" rx="4" fill="' + c.k1 + '" opacity=".8"/>'
        + '<rect x="180" y="222" width="30" height="5" rx="2.5" fill="' + c.k2 + '" opacity=".4"/>'
        + '<rect x="180" y="236" width="38" height="5" rx="2.5" fill="' + c.k2 + '" opacity=".28"/>';
    },

    /* incense / bakhoor wooden box */
    bakhoor: function (c) {
      return ''
        + '<path d="M200 60c30 34 46 62 46 86 0 26-20 44-46 44s-46-18-46-44c0-24 16-52 46-86z" fill="url(#g)"/>'
        + '<path d="M200 60c30 34 46 62 46 86 0 12-5 23-14 30-4-40-20-76-32-116z" fill="#ffffff" opacity=".2"/>'
        + '<rect x="94" y="176" width="212" height="166" rx="16" fill="url(#g)"/>'
        + '<path d="M94 192c0-9 7-16 16-16h180c9 0 16 7 16 16v22H94z" fill="#ffffff" opacity=".2"/>'
        + '<rect x="94" y="176" width="212" height="30" rx="15" fill="' + c.k1 + '" opacity=".55"/>'
        + '<rect x="124" y="222" width="152" height="66" rx="8" fill="#ffffff" opacity=".92"/>'
        + '<rect x="142" y="244" width="86" height="8" rx="4" fill="' + c.k1 + '" opacity=".8"/>'
        + '<rect x="142" y="262" width="60" height="5" rx="2.5" fill="' + c.k2 + '" opacity=".4"/>'
        + '<rect x="110" y="196" width="12" height="126" rx="6" fill="#ffffff" opacity=".2"/>'
        + '<circle cx="200" cy="128" r="9" fill="#ffffff" opacity=".35"/>';
    },

    /* hair / body shampoo tall bottle */
    bottle: function (c) {
      return ''
        + '<rect x="188" y="70" width="24" height="30" rx="5" fill="' + c.k1 + '"/>'
        + '<rect x="184" y="98" width="32" height="18" rx="4" fill="' + c.k2 + '"/>'
        + '<path d="M172 114h56c26 0 46 20 46 46v168c0 20-16 36-36 36h-76c-20 0-36-16-36-36V160c0-26 20-46 46-46z" fill="url(#g)"/>'
        + '<path d="M172 114h18c-24 6-38 24-38 46v166c0 16 10 30 26 34-24-2-42-18-42-38V160c0-26 20-46 36-46z" fill="#ffffff" opacity=".18"/>'
        + '<rect x="136" y="160" width="12" height="166" rx="6" fill="#ffffff" opacity=".3"/>'
        + '<rect x="156" y="196" width="88" height="94" rx="8" fill="#ffffff" opacity=".9"/>'
        + '<rect x="170" y="218" width="60" height="8" rx="4" fill="' + c.k1 + '" opacity=".8"/>'
        + '<rect x="170" y="238" width="44" height="5" rx="2.5" fill="' + c.k2 + '" opacity=".4"/>'
        + '<rect x="170" y="252" width="52" height="5" rx="2.5" fill="' + c.k2 + '" opacity=".28"/>';
    }
  };

  /* ---- background swatch helpers --------------------------------------- */
  function lighten(hex, amt) {
    var n = parseInt(hex.slice(1), 16);
    var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    r = Math.round(r + (255 - r) * amt);
    g = Math.round(g + (255 - g) * amt);
    b = Math.round(b + (255 - b) * amt);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }
  function darken(hex, amt) {
    var n = parseInt(hex.slice(1), 16);
    var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return '#' + (((r * (1 - amt)) | 0) << 16 | ((g * (1 - amt)) | 0) << 8 | ((b * (1 - amt)) | 0)).toString(16).padStart(6, '0');
  }

  /**
   * Build an SVG data-URI product image.
   * @param {Object} o
   * @param {String} o.shape  key of SHAPES
   * @param {String} o.c1     primary product colour
   * @param {String} [o.c2]   secondary product colour (defaults to darkened c1)
   * @param {String} [o.bg]   background tint (defaults to a soft tint of c1)
   * @param {String} [o.tag]  optional small brand mark drawn on the label
   */
  function img(o) {
    o = o || {};
    var shape = SHAPES[o.shape] ? o.shape : 'flacon';
    var c1 = o.c1 || '#d94b8a';
    var c2 = o.c2 || darken(c1, 0.3);
    var bg1 = o.bg || lighten(c1, 0.9);
    var bg2 = o.bg2 || lighten(c1, 0.75);
    var k1 = darken(c1, 0.34);
    var k2 = darken(c1, 0.52);

    var svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 470" width="400" height="470" role="img">' +
      '<defs>' +
        '<linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
          '<stop offset="0" stop-color="' + lighten(c1, 0.16) + '"/>' +
          '<stop offset="1" stop-color="' + c2 + '"/>' +
        '</linearGradient>' +
        '<linearGradient id="bg" x1="0" y1="0" x2="0.6" y2="1">' +
          '<stop offset="0" stop-color="' + bg1 + '"/>' +
          '<stop offset="1" stop-color="' + bg2 + '"/>' +
        '</linearGradient>' +
        '<radialGradient id="glow" cx="0.5" cy="0.42" r="0.5">' +
          '<stop offset="0" stop-color="#ffffff" stop-opacity="0.85"/>' +
          '<stop offset="1" stop-color="#ffffff" stop-opacity="0"/>' +
        '</radialGradient>' +
      '</defs>' +
      '<rect width="400" height="470" fill="url(#bg)"/>' +
      '<circle cx="200" cy="215" r="150" fill="url(#glow)"/>' +
      '<ellipse cx="200" cy="398" rx="104" ry="17" fill="' + darken(c1, 0.6) + '" opacity="0.14"/>' +
      SHAPES[shape]({ k1: k1, k2: k2 }) +
      (o.tag
        ? '<text x="200" y="424" text-anchor="middle" font-family="Cairo,Segoe UI,Tahoma,sans-serif" ' +
          'font-size="19" font-weight="800" letter-spacing="5" fill="' + darken(c1, 0.5) + '" opacity="0.55">' +
          esc(String(o.tag).toUpperCase()) + '</text>'
        : '') +
      '</svg>';

    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  /* ---- wide banner art (hero + promos) ---------------------------------- */
  function banner(o) {
    o = o || {};
    var c1 = o.c1 || '#d94b8a';
    var c2 = o.c2 || '#b23a6d';
    var w = o.w || 1600, h = o.h || 700;
    var tint = lighten(c1, 0.55);

    var blobs = '';
    var seed = o.seed || 1;
    for (var i = 0; i < 5; i++) {
      var cx = ((seed * 137 + i * 211) % w);
      var cy = ((seed * 89 + i * 173) % h);
      var r = 90 + ((seed * 31 + i * 57) % 190);
      blobs += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="#ffffff" opacity="' + (0.03 + (i % 3) * 0.022) + '"/>';
    }

    var svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" role="img">' +
      '<defs>' +
        '<linearGradient id="bb" x1="0" y1="0" x2="1" y2="1">' +
          '<stop offset="0" stop-color="' + c1 + '"/>' +
          '<stop offset="1" stop-color="' + c2 + '"/>' +
        '</linearGradient>' +
        '<radialGradient id="spot" cx="0.72" cy="0.5" r="0.6">' +
          '<stop offset="0" stop-color="' + lighten(c1, 0.42) + '" stop-opacity="0.85"/>' +
          '<stop offset="1" stop-color="' + lighten(c1, 0.42) + '" stop-opacity="0"/>' +
        '</radialGradient>' +
      '</defs>' +
      '<rect width="' + w + '" height="' + h + '" fill="url(#bb)"/>' +
      '<rect width="' + w + '" height="' + h + '" fill="url(#spot)"/>' +
      blobs +
      /* floating bottle silhouettes */
      '<g opacity="0.2" fill="#ffffff">' +
        '<rect x="' + (w * 0.76) + '" y="' + (h * 0.3) + '" width="86" height="150" rx="20"/>' +
        '<rect x="' + (w * 0.76 + 30) + '" y="' + (h * 0.3 - 42) + '" width="26" height="46" rx="6"/>' +
        '<rect x="' + (w * 0.86) + '" y="' + (h * 0.52) + '" width="66" height="120" rx="17"/>' +
        '<rect x="' + (w * 0.86 + 22) + '" y="' + (h * 0.52 - 32) + '" width="22" height="34" rx="5"/>' +
        '<circle cx="' + (w * 0.68) + '" cy="' + (h * 0.74) + '" r="46"/>' +
        '<rect x="' + (w * 0.1) + '" y="' + (h * 0.66) + '" width="120" height="70" rx="16" transform="rotate(-16 ' + (w * 0.1) + ' ' + (h * 0.66) + ')"/>' +
      '</g>' +
      /* subtle diagonal light streaks */
      '<g opacity="0.07" fill="#ffffff">' +
        '<path d="M0 ' + (h * 0.78) + 'L' + w + ' ' + (h * 0.3) + 'v40L0 ' + (h * 0.92) + 'z"/>' +
        '<path d="M0 ' + (h * 0.2) + 'L' + w + ' ' + (h * 0.62) + 'v18L0 ' + (h * 0.4) + 'z"/>' +
      '</g>' +
      '</svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  global.TCArt = {
    img: img,
    banner: banner,
    lighten: lighten,
    darken: darken,
    shapes: Object.keys(SHAPES)
  };
})(window);
