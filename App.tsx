import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import ImageDitheringApp from './components/ImageDitheringApp';

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <div className="min-h-screen bg-background">
        <ImageDitheringApp />
        <Toaster />
      </div>
    </ThemeProvider>
  );
}
