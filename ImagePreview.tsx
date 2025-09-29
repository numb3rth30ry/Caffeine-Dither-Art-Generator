import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, Loader2 } from 'lucide-react';

interface ImagePreviewProps {
  originalImageUrl: string | null;
  processedImageUrl: string | null;
  isProcessing: boolean;
}

export default function ImagePreview({ originalImageUrl, processedImageUrl, isProcessing }: ImagePreviewProps) {
  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Image Preview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="original" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="original">Original</TabsTrigger>
            <TabsTrigger value="processed" disabled={!processedImageUrl && !isProcessing}>
              Processed
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="original" className="mt-4">
            <div className="aspect-square rounded-lg overflow-hidden bg-muted/50 border-2 border-dashed border-muted-foreground/25">
              {originalImageUrl ? (
                <img
                  src={originalImageUrl}
                  alt="Original image"
                  className="w-full h-full object-contain"
                  style={{ imageRendering: 'pixelated' }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Eye className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Upload an image to see preview</p>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="processed" className="mt-4">
            <div className="aspect-square rounded-lg overflow-hidden bg-muted/50 border-2 border-dashed border-muted-foreground/25">
              {isProcessing ? (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <Loader2 className="h-12 w-12 mx-auto mb-2 animate-spin text-primary" />
                    <p className="text-muted-foreground">Processing image...</p>
                  </div>
                </div>
              ) : processedImageUrl ? (
                <img
                  src={processedImageUrl}
                  alt="Processed image"
                  className="w-full h-full object-contain cursor-pointer select-none"
                  style={{ 
                    imageRendering: 'pixelated',
                    WebkitUserSelect: 'none',
                    WebkitTouchCallout: 'default'
                  }}
                  onContextMenu={(e) => {
                    // Allow context menu for saving on desktop
                    return true;
                  }}
                  draggable={false}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Eye className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Process an image to see result</p>
                  </div>
                </div>
              )}
            </div>
            
            {processedImageUrl && (
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Press and hold on mobile to save to Photos
              </p>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
