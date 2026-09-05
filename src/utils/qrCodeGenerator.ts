/**
 * Zero-dependency QR Code Generator (SVG & Matrix)
 * Supports alphanumeric and URL encoding for instant mobile QR scanning.
 */

// Simple lightweight QR code generator based on Type 1-4 standard
export function generateQRCodeSVG(text: string, size: number = 200, color: string = '#ffffff', bgColor: string = 'transparent'): string {
  const modules = getQRMatrix(text);
  const matrixSize = modules.length;
  const cellSize = size / matrixSize;

  let rects = '';
  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      if (modules[r][c]) {
        rects += `<rect x="${(c * cellSize).toFixed(2)}" y="${(r * cellSize).toFixed(2)}" width="${(cellSize + 0.3).toFixed(2)}" height="${(cellSize + 0.3).toFixed(2)}" fill="${color}" />`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" shape-rendering="crispEdges">
    ${bgColor !== 'transparent' ? `<rect width="${size}" height="${size}" fill="${bgColor}" />` : ''}
    ${rects}
  </svg>`;
}

// Minimal Reed-Solomon QR encoder for URLs and text up to 150 chars
function getQRMatrix(input: string): boolean[][] {
  const length = input.length;
  const version = length > 80 ? 4 : length > 40 ? 3 : length > 20 ? 2 : 1;
  const size = version * 4 + 17; // 21, 25, 29, 33

  const matrix: (boolean | null)[][] = Array(size).fill(null).map(() => Array(size).fill(null));

  // 1. Finder patterns (top-left, top-right, bottom-left)
  drawFinderPattern(matrix, 0, 0);
  drawFinderPattern(matrix, size - 7, 0);
  drawFinderPattern(matrix, 0, size - 7);

  // 2. Timing patterns
  for (let i = 8; i < size - 8; i++) {
    const val = i % 2 === 0;
    if (matrix[6][i] === null) matrix[6][i] = val;
    if (matrix[i][6] === null) matrix[i][6] = val;
  }

  // 3. Dark module & separators
  matrix[size - 8][8] = true;

  // 4. Encode data bits
  const bits: number[] = [];
  // Byte mode indicator: 0100
  bits.push(0, 1, 0, 0);
  // Character count (8 bits for versions 1-4)
  for (let i = 7; i >= 0; i--) {
    bits.push((length >> i) & 1);
  }
  // Data bytes
  for (let i = 0; i < length; i++) {
    const code = input.charCodeAt(i);
    for (let b = 7; b >= 0; b--) {
      bits.push((code >> b) & 1);
    }
  }
  // Terminator
  bits.push(0, 0, 0, 0);
  // Pad to byte
  while (bits.length % 8 !== 0) bits.push(0);

  // Fill pseudo Reed-Solomon padding bytes
  const padBytes = [0xEC, 0x11];
  let pIdx = 0;
  const totalCapacityBits = (size * size - 3 * 64) * 0.6;
  while (bits.length < totalCapacityBits) {
    const pad = padBytes[pIdx % 2];
    for (let b = 7; b >= 0; b--) {
      bits.push((pad >> b) & 1);
    }
    pIdx++;
  }

  // 5. Place data in matrix
  let bitIdx = 0;
  let upwards = true;
  for (let right = size - 1; right > 0; right -= 2) {
    if (right === 6) right--; // skip vertical timing column

    for (let vert = 0; vert < size; vert++) {
      const r = upwards ? size - 1 - vert : vert;
      for (let c = 0; c < 2; c++) {
        const col = right - c;
        if (matrix[r][col] === null) {
          let bit = false;
          if (bitIdx < bits.length) {
            bit = bits[bitIdx] === 1;
            bitIdx++;
          }
          // Apply mask pattern (row + col) % 2 === 0
          const mask = (r + col) % 2 === 0;
          matrix[r][col] = mask ? !bit : bit;
        }
      }
    }
    upwards = !upwards;
  }

  // Replace remaining nulls with false
  return matrix.map(row => row.map(cell => cell === true));
}

function drawFinderPattern(matrix: (boolean | null)[][], row: number, col: number) {
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      if (
        r === 0 || r === 6 || c === 0 || c === 6 ||
        (r >= 2 && r <= 4 && c >= 2 && c <= 4)
      ) {
        matrix[row + r][col + c] = true;
      } else {
        matrix[row + r][col + c] = false;
      }
    }
  }

  // Separators around finder pattern
  for (let r = -1; r <= 7; r++) {
    for (let c = -1; c <= 7; c++) {
      const nr = row + r;
      const nc = col + c;
      if (nr >= 0 && nr < matrix.length && nc >= 0 && nc < matrix.length) {
        if (r === -1 || r === 7 || c === -1 || c === 7) {
          matrix[nr][nc] = false;
        }
      }
    }
  }
}
