export type DitheringAlgorithm = 'floyd-steinberg' | 'atkinson' | 'bayer' | 'sierra' | 'stucki' | 'burkes' | 'halftone' | 'clustered-dot';
export type OutputDimension = 512 | 1024 | 2048 | 4096;
export type PixelizationLevel = 1 | 2 | 4 | 8 | 16;
export type ColorMode = 'bw' | 'color';

interface CustomImageData {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

// Bayer matrix for ordered dithering
const BAYER_MATRIX_4x4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5]
];

// Halftone pattern matrix
const HALFTONE_MATRIX_4x4 = [
  [7, 13, 11, 4],
  [12, 16, 14, 8],
  [10, 15, 6, 2],
  [5, 9, 3, 1]
];

// Clustered dot pattern matrix
const CLUSTERED_DOT_MATRIX_4x4 = [
  [13, 5, 12, 4],
  [6, 0, 7, 1],
  [11, 3, 14, 2],
  [15, 9, 8, 10]
];

export async function applyDithering(
  file: File,
  algorithm: DitheringAlgorithm,
  outputDimension: OutputDimension,
  pixelizationLevel: PixelizationLevel,
  colorMode: ColorMode,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    img.onload = () => {
      try {
        onProgress?.(10);

        // Set canvas dimensions
        canvas.width = outputDimension;
        canvas.height = outputDimension;

        // Draw and resize image
        ctx.drawImage(img, 0, 0, outputDimension, outputDimension);
        onProgress?.(30);

        // Get image data
        const imageData = ctx.getImageData(0, 0, outputDimension, outputDimension);
        onProgress?.(50);

        // Apply dithering algorithm
        const ditheredData = applyDitheringAlgorithm(imageData, algorithm, pixelizationLevel, colorMode, onProgress);
        onProgress?.(90);

        // Create new ImageData object with proper structure
        const newImageData = ctx.createImageData(outputDimension, outputDimension);
        newImageData.data.set(ditheredData.data);

        // Put processed data back to canvas
        ctx.putImageData(newImageData, 0, 0);

        // Convert to blob
        canvas.toBlob((blob) => {
          if (blob) {
            onProgress?.(100);
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob from canvas'));
          }
        }, 'image/png', 1.0);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = URL.createObjectURL(file);
  });
}

function applyDitheringAlgorithm(
  imageData: ImageData,
  algorithm: DitheringAlgorithm,
  pixelizationLevel: PixelizationLevel,
  colorMode: ColorMode,
  onProgress?: (progress: number) => void
): CustomImageData {
  const { data, width, height } = imageData;
  const newData = new Uint8ClampedArray(data);

  switch (algorithm) {
    case 'floyd-steinberg':
      return floydSteinbergDithering(newData, width, height, pixelizationLevel, colorMode, onProgress);
    case 'atkinson':
      return atkinsonDithering(newData, width, height, pixelizationLevel, colorMode, onProgress);
    case 'bayer':
      return bayerDithering(newData, width, height, pixelizationLevel, colorMode, onProgress);
    case 'halftone':
      return halftoneDithering(newData, width, height, pixelizationLevel, colorMode, onProgress);
    case 'clustered-dot':
      return clusteredDotDithering(newData, width, height, pixelizationLevel, colorMode, onProgress);
    case 'sierra':
      return sierraDithering(newData, width, height, pixelizationLevel, colorMode, onProgress);
    case 'stucki':
      return stuckiDithering(newData, width, height, pixelizationLevel, colorMode, onProgress);
    case 'burkes':
      return burkesDithering(newData, width, height, pixelizationLevel, colorMode, onProgress);
    default:
      return { data: newData, width, height };
  }
}

function floydSteinbergDithering(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  pixelizationLevel: PixelizationLevel,
  colorMode: ColorMode,
  onProgress?: (progress: number) => void
): CustomImageData {
  const progressStep = Math.floor(height / 10);

  for (let y = 0; y < height; y += pixelizationLevel) {
    if (y % progressStep === 0) {
      onProgress?.(50 + (y / height) * 40);
    }

    for (let x = 0; x < width; x += pixelizationLevel) {
      if (colorMode === 'bw') {
        // Process block for black and white
        const blockGray = getBlockAverageGray(data, width, height, x, y, pixelizationLevel);
        const newGray = blockGray < 128 ? 0 : 255;
        const error = blockGray - newGray;
        
        // Set block to quantized value
        setBlock(data, width, height, x, y, pixelizationLevel, newGray);
        
        // Distribute error using Floyd-Steinberg coefficients
        distributeBlockError(data, width, height, x, y, pixelizationLevel, error, [
          [1, 0, 7/16],
          [-1, 1, 3/16],
          [0, 1, 5/16],
          [1, 1, 1/16]
        ]);
      } else {
        // Process block for color
        const blockColor = getBlockAverageColor(data, width, height, x, y, pixelizationLevel);
        const newColor = quantizeColor(blockColor);
        const error: [number, number, number] = [
          blockColor[0] - newColor[0],
          blockColor[1] - newColor[1],
          blockColor[2] - newColor[2]
        ];
        
        // Set block to quantized value
        setBlockColor(data, width, height, x, y, pixelizationLevel, newColor);
        
        // Distribute error using Floyd-Steinberg coefficients
        distributeBlockColorError(data, width, height, x, y, pixelizationLevel, error, [
          [1, 0, 7/16],
          [-1, 1, 3/16],
          [0, 1, 5/16],
          [1, 1, 1/16]
        ]);
      }
    }
  }

  return { data, width, height };
}

function atkinsonDithering(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  pixelizationLevel: PixelizationLevel,
  colorMode: ColorMode,
  onProgress?: (progress: number) => void
): CustomImageData {
  const progressStep = Math.floor(height / 10);

  for (let y = 0; y < height; y += pixelizationLevel) {
    if (y % progressStep === 0) {
      onProgress?.(50 + (y / height) * 40);
    }

    for (let x = 0; x < width; x += pixelizationLevel) {
      if (colorMode === 'bw') {
        const blockGray = getBlockAverageGray(data, width, height, x, y, pixelizationLevel);
        const newGray = blockGray < 128 ? 0 : 255;
        const error = blockGray - newGray;
        
        setBlock(data, width, height, x, y, pixelizationLevel, newGray);
        
        // Atkinson dithering pattern
        distributeBlockError(data, width, height, x, y, pixelizationLevel, error, [
          [1, 0, 1/8],
          [2, 0, 1/8],
          [-1, 1, 1/8],
          [0, 1, 1/8],
          [1, 1, 1/8],
          [0, 2, 1/8]
        ]);
      } else {
        const blockColor = getBlockAverageColor(data, width, height, x, y, pixelizationLevel);
        const newColor = quantizeColor(blockColor);
        const error: [number, number, number] = [
          blockColor[0] - newColor[0],
          blockColor[1] - newColor[1],
          blockColor[2] - newColor[2]
        ];
        
        setBlockColor(data, width, height, x, y, pixelizationLevel, newColor);
        
        distributeBlockColorError(data, width, height, x, y, pixelizationLevel, error, [
          [1, 0, 1/8],
          [2, 0, 1/8],
          [-1, 1, 1/8],
          [0, 1, 1/8],
          [1, 1, 1/8],
          [0, 2, 1/8]
        ]);
      }
    }
  }

  return { data, width, height };
}

function bayerDithering(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  pixelizationLevel: PixelizationLevel,
  colorMode: ColorMode,
  onProgress?: (progress: number) => void
): CustomImageData {
  const progressStep = Math.floor(height / 10);

  for (let y = 0; y < height; y += pixelizationLevel) {
    if (y % progressStep === 0) {
      onProgress?.(50 + (y / height) * 40);
    }

    for (let x = 0; x < width; x += pixelizationLevel) {
      if (colorMode === 'bw') {
        const blockGray = getBlockAverageGray(data, width, height, x, y, pixelizationLevel);
        
        // Get Bayer matrix value
        const bayerValue = BAYER_MATRIX_4x4[(y / pixelizationLevel) % 4][(x / pixelizationLevel) % 4];
        const threshold = (bayerValue / 16) * 255;
        
        const newGray = blockGray > threshold ? 255 : 0;
        setBlock(data, width, height, x, y, pixelizationLevel, newGray);
      } else {
        const blockColor = getBlockAverageColor(data, width, height, x, y, pixelizationLevel);
        
        const bayerValue = BAYER_MATRIX_4x4[(y / pixelizationLevel) % 4][(x / pixelizationLevel) % 4];
        const threshold = (bayerValue / 16) * 255;
        
        const newColor: [number, number, number] = [
          blockColor[0] > threshold ? 255 : 0,
          blockColor[1] > threshold ? 255 : 0,
          blockColor[2] > threshold ? 255 : 0
        ];
        setBlockColor(data, width, height, x, y, pixelizationLevel, newColor);
      }
    }
  }

  return { data, width, height };
}

function halftoneDithering(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  pixelizationLevel: PixelizationLevel,
  colorMode: ColorMode,
  onProgress?: (progress: number) => void
): CustomImageData {
  const progressStep = Math.floor(height / 10);

  for (let y = 0; y < height; y += pixelizationLevel) {
    if (y % progressStep === 0) {
      onProgress?.(50 + (y / height) * 40);
    }

    for (let x = 0; x < width; x += pixelizationLevel) {
      if (colorMode === 'bw') {
        const blockGray = getBlockAverageGray(data, width, height, x, y, pixelizationLevel);
        
        // Get halftone matrix value
        const halftoneValue = HALFTONE_MATRIX_4x4[(y / pixelizationLevel) % 4][(x / pixelizationLevel) % 4];
        const threshold = (halftoneValue / 16) * 255;
        
        const newGray = blockGray > threshold ? 255 : 0;
        setBlock(data, width, height, x, y, pixelizationLevel, newGray);
      } else {
        const blockColor = getBlockAverageColor(data, width, height, x, y, pixelizationLevel);
        
        const halftoneValue = HALFTONE_MATRIX_4x4[(y / pixelizationLevel) % 4][(x / pixelizationLevel) % 4];
        const threshold = (halftoneValue / 16) * 255;
        
        const newColor: [number, number, number] = [
          blockColor[0] > threshold ? 255 : 0,
          blockColor[1] > threshold ? 255 : 0,
          blockColor[2] > threshold ? 255 : 0
        ];
        setBlockColor(data, width, height, x, y, pixelizationLevel, newColor);
      }
    }
  }

  return { data, width, height };
}

function clusteredDotDithering(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  pixelizationLevel: PixelizationLevel,
  colorMode: ColorMode,
  onProgress?: (progress: number) => void
): CustomImageData {
  const progressStep = Math.floor(height / 10);

  for (let y = 0; y < height; y += pixelizationLevel) {
    if (y % progressStep === 0) {
      onProgress?.(50 + (y / height) * 40);
    }

    for (let x = 0; x < width; x += pixelizationLevel) {
      if (colorMode === 'bw') {
        const blockGray = getBlockAverageGray(data, width, height, x, y, pixelizationLevel);
        
        // Get clustered dot matrix value
        const clusteredValue = CLUSTERED_DOT_MATRIX_4x4[(y / pixelizationLevel) % 4][(x / pixelizationLevel) % 4];
        const threshold = (clusteredValue / 16) * 255;
        
        const newGray = blockGray > threshold ? 255 : 0;
        setBlock(data, width, height, x, y, pixelizationLevel, newGray);
      } else {
        const blockColor = getBlockAverageColor(data, width, height, x, y, pixelizationLevel);
        
        const clusteredValue = CLUSTERED_DOT_MATRIX_4x4[(y / pixelizationLevel) % 4][(x / pixelizationLevel) % 4];
        const threshold = (clusteredValue / 16) * 255;
        
        const newColor: [number, number, number] = [
          blockColor[0] > threshold ? 255 : 0,
          blockColor[1] > threshold ? 255 : 0,
          blockColor[2] > threshold ? 255 : 0
        ];
        setBlockColor(data, width, height, x, y, pixelizationLevel, newColor);
      }
    }
  }

  return { data, width, height };
}

function sierraDithering(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  pixelizationLevel: PixelizationLevel,
  colorMode: ColorMode,
  onProgress?: (progress: number) => void
): CustomImageData {
  const progressStep = Math.floor(height / 10);

  for (let y = 0; y < height; y += pixelizationLevel) {
    if (y % progressStep === 0) {
      onProgress?.(50 + (y / height) * 40);
    }

    for (let x = 0; x < width; x += pixelizationLevel) {
      if (colorMode === 'bw') {
        const blockGray = getBlockAverageGray(data, width, height, x, y, pixelizationLevel);
        const newGray = blockGray < 128 ? 0 : 255;
        const error = blockGray - newGray;
        
        setBlock(data, width, height, x, y, pixelizationLevel, newGray);
        
        // Sierra dithering pattern
        distributeBlockError(data, width, height, x, y, pixelizationLevel, error, [
          [1, 0, 5/32],
          [2, 0, 3/32],
          [-2, 1, 2/32],
          [-1, 1, 4/32],
          [0, 1, 5/32],
          [1, 1, 4/32],
          [2, 1, 2/32],
          [-1, 2, 2/32],
          [0, 2, 3/32],
          [1, 2, 2/32]
        ]);
      } else {
        const blockColor = getBlockAverageColor(data, width, height, x, y, pixelizationLevel);
        const newColor = quantizeColor(blockColor);
        const error: [number, number, number] = [
          blockColor[0] - newColor[0],
          blockColor[1] - newColor[1],
          blockColor[2] - newColor[2]
        ];
        
        setBlockColor(data, width, height, x, y, pixelizationLevel, newColor);
        
        distributeBlockColorError(data, width, height, x, y, pixelizationLevel, error, [
          [1, 0, 5/32],
          [2, 0, 3/32],
          [-2, 1, 2/32],
          [-1, 1, 4/32],
          [0, 1, 5/32],
          [1, 1, 4/32],
          [2, 1, 2/32],
          [-1, 2, 2/32],
          [0, 2, 3/32],
          [1, 2, 2/32]
        ]);
      }
    }
  }

  return { data, width, height };
}

function stuckiDithering(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  pixelizationLevel: PixelizationLevel,
  colorMode: ColorMode,
  onProgress?: (progress: number) => void
): CustomImageData {
  const progressStep = Math.floor(height / 10);

  for (let y = 0; y < height; y += pixelizationLevel) {
    if (y % progressStep === 0) {
      onProgress?.(50 + (y / height) * 40);
    }

    for (let x = 0; x < width; x += pixelizationLevel) {
      if (colorMode === 'bw') {
        const blockGray = getBlockAverageGray(data, width, height, x, y, pixelizationLevel);
        const newGray = blockGray < 128 ? 0 : 255;
        const error = blockGray - newGray;
        
        setBlock(data, width, height, x, y, pixelizationLevel, newGray);
        
        // Stucki dithering pattern
        distributeBlockError(data, width, height, x, y, pixelizationLevel, error, [
          [1, 0, 8/42],
          [2, 0, 4/42],
          [-2, 1, 2/42],
          [-1, 1, 4/42],
          [0, 1, 8/42],
          [1, 1, 4/42],
          [2, 1, 2/42],
          [-2, 2, 1/42],
          [-1, 2, 2/42],
          [0, 2, 4/42],
          [1, 2, 2/42],
          [2, 2, 1/42]
        ]);
      } else {
        const blockColor = getBlockAverageColor(data, width, height, x, y, pixelizationLevel);
        const newColor = quantizeColor(blockColor);
        const error: [number, number, number] = [
          blockColor[0] - newColor[0],
          blockColor[1] - newColor[1],
          blockColor[2] - newColor[2]
        ];
        
        setBlockColor(data, width, height, x, y, pixelizationLevel, newColor);
        
        distributeBlockColorError(data, width, height, x, y, pixelizationLevel, error, [
          [1, 0, 8/42],
          [2, 0, 4/42],
          [-2, 1, 2/42],
          [-1, 1, 4/42],
          [0, 1, 8/42],
          [1, 1, 4/42],
          [2, 1, 2/42],
          [-2, 2, 1/42],
          [-1, 2, 2/42],
          [0, 2, 4/42],
          [1, 2, 2/42],
          [2, 2, 1/42]
        ]);
      }
    }
  }

  return { data, width, height };
}

function burkesDithering(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  pixelizationLevel: PixelizationLevel,
  colorMode: ColorMode,
  onProgress?: (progress: number) => void
): CustomImageData {
  const progressStep = Math.floor(height / 10);

  for (let y = 0; y < height; y += pixelizationLevel) {
    if (y % progressStep === 0) {
      onProgress?.(50 + (y / height) * 40);
    }

    for (let x = 0; x < width; x += pixelizationLevel) {
      if (colorMode === 'bw') {
        const blockGray = getBlockAverageGray(data, width, height, x, y, pixelizationLevel);
        const newGray = blockGray < 128 ? 0 : 255;
        const error = blockGray - newGray;
        
        setBlock(data, width, height, x, y, pixelizationLevel, newGray);
        
        // Burkes dithering pattern
        distributeBlockError(data, width, height, x, y, pixelizationLevel, error, [
          [1, 0, 8/32],
          [2, 0, 4/32],
          [-2, 1, 2/32],
          [-1, 1, 4/32],
          [0, 1, 8/32],
          [1, 1, 4/32],
          [2, 1, 2/32]
        ]);
      } else {
        const blockColor = getBlockAverageColor(data, width, height, x, y, pixelizationLevel);
        const newColor = quantizeColor(blockColor);
        const error: [number, number, number] = [
          blockColor[0] - newColor[0],
          blockColor[1] - newColor[1],
          blockColor[2] - newColor[2]
        ];
        
        setBlockColor(data, width, height, x, y, pixelizationLevel, newColor);
        
        distributeBlockColorError(data, width, height, x, y, pixelizationLevel, error, [
          [1, 0, 8/32],
          [2, 0, 4/32],
          [-2, 1, 2/32],
          [-1, 1, 4/32],
          [0, 1, 8/32],
          [1, 1, 4/32],
          [2, 1, 2/32]
        ]);
      }
    }
  }

  return { data, width, height };
}

function getBlockAverageGray(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
  blockSize: number
): number {
  let totalGray = 0;
  let pixelCount = 0;

  for (let by = y; by < Math.min(y + blockSize, height); by++) {
    for (let bx = x; bx < Math.min(x + blockSize, width); bx++) {
      const i = (by * width + bx) * 4;
      const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      totalGray += gray;
      pixelCount++;
    }
  }

  return pixelCount > 0 ? totalGray / pixelCount : 0;
}

function getBlockAverageColor(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
  blockSize: number
): [number, number, number] {
  let totalR = 0, totalG = 0, totalB = 0;
  let pixelCount = 0;

  for (let by = y; by < Math.min(y + blockSize, height); by++) {
    for (let bx = x; bx < Math.min(x + blockSize, width); bx++) {
      const i = (by * width + bx) * 4;
      totalR += data[i];
      totalG += data[i + 1];
      totalB += data[i + 2];
      pixelCount++;
    }
  }

  return pixelCount > 0 ? [
    totalR / pixelCount,
    totalG / pixelCount,
    totalB / pixelCount
  ] : [0, 0, 0];
}

function quantizeColor(color: [number, number, number]): [number, number, number] {
  return [
    color[0] < 128 ? 0 : 255,
    color[1] < 128 ? 0 : 255,
    color[2] < 128 ? 0 : 255
  ];
}

function setBlock(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
  blockSize: number,
  grayValue: number
) {
  for (let by = y; by < Math.min(y + blockSize, height); by++) {
    for (let bx = x; bx < Math.min(x + blockSize, width); bx++) {
      const i = (by * width + bx) * 4;
      data[i] = data[i + 1] = data[i + 2] = grayValue;
    }
  }
}

function setBlockColor(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
  blockSize: number,
  color: [number, number, number]
) {
  for (let by = y; by < Math.min(y + blockSize, height); by++) {
    for (let bx = x; bx < Math.min(x + blockSize, width); bx++) {
      const i = (by * width + bx) * 4;
      data[i] = color[0];
      data[i + 1] = color[1];
      data[i + 2] = color[2];
    }
  }
}

function distributeError(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
  error: number,
  pattern: [number, number, number][]
) {
  for (const [dx, dy, weight] of pattern) {
    const nx = x + dx;
    const ny = y + dy;
    
    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
      const ni = (ny * width + nx) * 4;
      const errorAmount = error * weight;
      
      data[ni] = Math.max(0, Math.min(255, data[ni] + errorAmount));
      data[ni + 1] = Math.max(0, Math.min(255, data[ni + 1] + errorAmount));
      data[ni + 2] = Math.max(0, Math.min(255, data[ni + 2] + errorAmount));
    }
  }
}

function distributeBlockError(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
  blockSize: number,
  error: number,
  pattern: [number, number, number][]
) {
  for (const [dx, dy, weight] of pattern) {
    const nx = x + dx * blockSize;
    const ny = y + dy * blockSize;
    
    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
      const errorAmount = error * weight;
      
      // Apply error to the entire block
      for (let by = ny; by < Math.min(ny + blockSize, height); by++) {
        for (let bx = nx; bx < Math.min(nx + blockSize, width); bx++) {
          const ni = (by * width + bx) * 4;
          data[ni] = Math.max(0, Math.min(255, data[ni] + errorAmount));
          data[ni + 1] = Math.max(0, Math.min(255, data[ni + 1] + errorAmount));
          data[ni + 2] = Math.max(0, Math.min(255, data[ni + 2] + errorAmount));
        }
      }
    }
  }
}

function distributeBlockColorError(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
  blockSize: number,
  error: [number, number, number],
  pattern: [number, number, number][]
) {
  for (const [dx, dy, weight] of pattern) {
    const nx = x + dx * blockSize;
    const ny = y + dy * blockSize;
    
    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
      const errorAmount: [number, number, number] = [
        error[0] * weight,
        error[1] * weight,
        error[2] * weight
      ];
      
      // Apply error to the entire block
      for (let by = ny; by < Math.min(ny + blockSize, height); by++) {
        for (let bx = nx; bx < Math.min(nx + blockSize, width); bx++) {
          const ni = (by * width + bx) * 4;
          data[ni] = Math.max(0, Math.min(255, data[ni] + errorAmount[0]));
          data[ni + 1] = Math.max(0, Math.min(255, data[ni + 1] + errorAmount[1]));
          data[ni + 2] = Math.max(0, Math.min(255, data[ni + 2] + errorAmount[2]));
        }
      }
    }
  }
}
