'use strict';
// Palette for Pet Claude della spa. Index = sprite char ('0'-'9', 'a', 'b').
(function (root) {
  const PALETTE = [
    'transparent', // 0  unused (sprites use '.' for transparent)
    '#3b2626',     // 1  outline / dark brown
    '#d9774b',     // 2  star terracotta
    '#f2a477',     // 3  star highlight
    '#6fb3d2',     // 4  water / sweat
    '#d6eef5',     // 5  steam / water shine
    '#f7f0e4',     // 6  towel
    '#2a1f2e',     // 7  eyes / mouth
    '#ee8c8c',     // 8  blush / heart
    '#6d7290',     // 9  gym mat
    '#bcc0cc',     // a  metal
    '#9a6440',     // b  wooden tub
  ];
  const api = { PALETTE };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PetPalette = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
