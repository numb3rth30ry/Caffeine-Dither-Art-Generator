import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Download, Upload, Image as ImageIcon, Heart, Settings, Palette } from 'lucide-react';
import { toast } from 'sonner';
import { useFileUpload } from '../blob-storage/FileStorage';
import ImagePreview from './ImagePreview';
import { applyDithering, DitheringAlgorithm, OutputDimension, PixelizationLevel, ColorMode } from '../lib/dithering';

const DITHERING_ALGORITHMS: { value: DitheringAlgorithm; label: string; description: string }[] = [
  { value: 'floyd-steinberg', label: 'Floyd-Steinberg', description: 'Classic error diffusion dithering' },
  { value: 'atkinson', label: 'Atkinson', description: 'Bill Atkinson\'s dithering algorithm' },
  { value: 'bayer', label: 'Bayer', description: 'Ordered dithering with Bayer matrix' },
  { value: 'halftone', label: 'Halftone', description: 'Halftone pattern dithering' },
  { value: 'clustered-dot', label: 'Clustered Dot', description: 'Clustered dot pattern dithering' },
  { value: 'sierra', label: 'Sierra', description: 'Sierra error diffusion' },
  { value: 'stucki', label: 'Stucki', description: 'Stucki error diffusion' },
  { value: 'burkes', label: 'Burkes', description: 'Burkes error diffusion' }
];

const OUTPUT_DIMENSIONS: { value: OutputDimension; label: string }[] = [
  { value: 512, label: '512×512' },
  { value: 1024, label: '1024×1024' },
  { value: 2048, label: '2048×2048' },
  { value: 4096, label: '4096×4096' }
];

const PIXELIZATION_LEVELS: { value: PixelizationLevel; label: string; description: string }[] = [
  { value: 1, label: 'Ultra Fine', description: 'Pixel-perfect detail' },
  { value: 2, label: 'Fine', description: 'High detail with slight pixelization' },
  { value: 4, label: 'Medium', description: 'Balanced pixelization effect' },
  { value: 8, label: 'Coarse', description: 'Strong pixelization effect' },
  { value: 16, label: 'Ultra Coarse', description: 'Maximum pixelization effect' }
];

export default function ImageDitheringApp() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(null);
  const [processedImagePath, setProcessedImagePath] = useState<string | null>(null);
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<DitheringAlgorithm>('floyd-steinberg');
  const [selectedDimension, setSelectedDimension] = useState<OutputDimension>(1024);
  const [pixelizationLevel, setPixelizationLevel] = useState<PixelizationLevel>(4);
  const [colorMode, setColorMode] = useState<ColorMode>('bw');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);

  const { uploadFile, isUploading } = useFileUpload();

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    setSelectedFile(file);
    
    // Create preview URL for original image
    const url = URL.createObjectURL(file);
    setOriginalImageUrl(url);
    
    // Reset processed image
    setProcessedImageUrl(null);
    setProcessedImagePath(null);
  }, []);

  const processImage = useCallback(async () => {
    if (!selectedFile || !originalImageUrl) {
      toast.error('Please select an image first');
      return;
    }

    setIsProcessing(true);
    setProcessingProgress(0);

    try {
      // Apply dithering algorithm
      const processedBlob = await applyDithering(
        selectedFile,
        selectedAlgorithm,
        selectedDimension,
        pixelizationLevel,
        colorMode,
        (progress) => setProcessingProgress(progress)
      );

      // Convert blob to file for upload
      const timestamp = Date.now();
      const colorSuffix = colorMode === 'bw' ? 'bw' : 'color';
      const fileName = `dithered_${selectedAlgorithm}_${selectedDimension}_px${pixelizationLevel}_${colorSuffix}_${timestamp}.png`;
      const processedFile = new File([processedBlob], fileName, { type: 'image/png' });
      const imagePath = `processed/${fileName}`;

      const { url } = await uploadFile(imagePath, processedFile);
      
      setProcessedImageUrl(url);
      setProcessedImagePath(imagePath);
      
      toast.success('Image processed successfully!');
    } catch (error) {
      console.error('Error processing image:', error);
      toast.error('Failed to process image. Please try again.');
    } finally {
      setIsProcessing(false);
      setProcessingProgress(0);
    }
  }, [selectedFile, originalImageUrl, selectedAlgorithm, selectedDimension, pixelizationLevel, colorMode, uploadFile]);

  const downloadImage = useCallback(async (format: 'png' | 'svg') => {
    if (!processedImageUrl || !selectedFile) {
      toast.error('No processed image to download');
      return;
    }

    try {
      let blob: Blob;
      let fileName: string;
      const colorSuffix = colorMode === 'bw' ? 'bw' : 'color';

      if (format === 'png') {
        // Download the PNG directly
        const response = await fetch(processedImageUrl);
        blob = await response.blob();
        fileName = `dithered_${selectedAlgorithm}_${selectedDimension}_px${pixelizationLevel}_${colorSuffix}.png`;
      } else {
        // Convert to SVG
        const response = await fetch(processedImageUrl);
        const imageBlob = await response.blob();
        const svgContent = await createSVGFromImage(imageBlob, selectedDimension, pixelizationLevel);
        blob = new Blob([svgContent], { type: 'image/svg+xml' });
        fileName = `dithered_${selectedAlgorithm}_${selectedDimension}_px${pixelizationLevel}_${colorSuffix}.svg`;
      }

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Downloaded as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Error downloading image:', error);
      toast.error('Failed to download image');
    }
  }, [processedImageUrl, selectedFile, selectedAlgorithm, selectedDimension, pixelizationLevel, colorMode]);

  const getCurrentPixelizationInfo = () => {
    const info = PIXELIZATION_LEVELS.find(level => level.value === pixelizationLevel);
    return info || PIXELIZATION_LEVELS[2]; // Default to medium
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <ImageIcon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Dither Art Generator</h1>
              <p className="text-sm text-muted-foreground">Transform your images with artistic dithering algorithms</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Controls Panel */}
          <div className="space-y-6">
            {/* Upload Section */}
            <Card className="border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Upload Image
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="cursor-pointer"
                  />
                  {selectedFile && (
                    <div className="text-sm text-muted-foreground">
                      Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Algorithm Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Dithering Algorithm</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="algorithm">Algorithm</Label>
                  <Select value={selectedAlgorithm} onValueChange={(value) => setSelectedAlgorithm(value as DitheringAlgorithm)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DITHERING_ALGORITHMS.map((algo) => (
                        <SelectItem key={algo.value} value={algo.value}>
                          <div>
                            <div className="font-medium">{algo.label}</div>
                            <div className="text-xs text-muted-foreground">{algo.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="dimension">Output Dimension</Label>
                  <Select value={selectedDimension.toString()} onValueChange={(value) => setSelectedDimension(parseInt(value) as OutputDimension)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OUTPUT_DIMENSIONS.map((dim) => (
                        <SelectItem key={dim.value} value={dim.value.toString()}>
                          {dim.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Color Mode Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Color Output
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup value={colorMode} onValueChange={(value) => setColorMode(value as ColorMode)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="bw" id="bw" />
                    <Label htmlFor="bw" className="cursor-pointer">
                      <div>
                        <div className="font-medium">Black & White</div>
                        <div className="text-xs text-muted-foreground">Monochrome dithering effect</div>
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="color" id="color" />
                    <Label htmlFor="color" className="cursor-pointer">
                      <div>
                        <div className="font-medium">Color</div>
                        <div className="text-xs text-muted-foreground">Preserve color information in dithering</div>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Pixelization Controls */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Pixelization Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Label htmlFor="pixelization">Pixelization Level</Label>
                    <span className="text-sm text-muted-foreground">
                      {getCurrentPixelizationInfo().label}
                    </span>
                  </div>
                  <Slider
                    value={[pixelizationLevel]}
                    onValueChange={(value) => setPixelizationLevel(value[0] as PixelizationLevel)}
                    min={1}
                    max={16}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Ultra Fine</span>
                    <span>Ultra Coarse</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {getCurrentPixelizationInfo().description}
                  </p>
                </div>

                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="text-sm font-medium mb-1">Effect Preview</div>
                  <div className="text-xs text-muted-foreground">
                    Block size: {pixelizationLevel}×{pixelizationLevel} pixels
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Effective resolution: {Math.floor(selectedDimension / pixelizationLevel)}×{Math.floor(selectedDimension / pixelizationLevel)} blocks
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Process Button */}
            <Card>
              <CardContent className="pt-6">
                <Button
                  onClick={processImage}
                  disabled={!selectedFile || isProcessing || isUploading}
                  className="w-full"
                  size="lg"
                >
                  {isProcessing ? 'Processing...' : 'Apply Dithering'}
                </Button>
                
                {isProcessing && (
                  <div className="mt-4 space-y-2">
                    <Progress value={processingProgress} className="w-full" />
                    <p className="text-sm text-center text-muted-foreground">
                      {processingProgress}% complete
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Download Section */}
            {processedImageUrl && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Download className="h-5 w-5" />
                    Download Options
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    onClick={() => downloadImage('png')}
                    variant="outline"
                    className="w-full"
                  >
                    Download PNG
                  </Button>
                  <Button
                    onClick={() => downloadImage('svg')}
                    variant="outline"
                    className="w-full"
                  >
                    Download SVG
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    On iOS: Press and hold the preview image to save to Photos
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Preview Panel */}
          <div className="space-y-6">
            <ImagePreview
              originalImageUrl={originalImageUrl}
              processedImageUrl={processedImageUrl}
              isProcessing={isProcessing}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-background/80 backdrop-blur-sm mt-16">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center text-sm text-muted-foreground">
            © 2025. Built with <Heart className="inline h-4 w-4 text-red-500" /> using{' '}
            <a href="https://caffeine.ai" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              caffeine.ai
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Helper function to create SVG from image with proper pixel sampling
async function createSVGFromImage(imageBlob: Blob, dimension: number, pixelizationLevel: number): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    
    img.onload = () => {
      canvas.width = dimension;
      canvas.height = dimension;
      ctx.drawImage(img, 0, 0, dimension, dimension);
      
      const imageData = ctx.getImageData(0, 0, dimension, dimension);
      const pixels = imageData.data;
      
      let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${dimension}" height="${dimension}" viewBox="0 0 ${dimension} ${dimension}" style="image-rendering: pixelated;">`;
      
      // Sample pixels at pixelization level intervals to match the dithering effect
      for (let y = 0; y < dimension; y += pixelizationLevel) {
        for (let x = 0; x < dimension; x += pixelizationLevel) {
          const i = (y * dimension + x) * 4;
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];
          const a = pixels[i + 3] / 255;
          
          // Only add rectangles for non-transparent pixels
          if (a > 0) {
            const color = `rgba(${r},${g},${b},${a})`;
            svgContent += `<rect x="${x}" y="${y}" width="${pixelizationLevel}" height="${pixelizationLevel}" fill="${color}"/>`;
          }
        }
      }
      
      svgContent += '</svg>';
      resolve(svgContent);
    };
    
    img.src = URL.createObjectURL(imageBlob);
  });
}
