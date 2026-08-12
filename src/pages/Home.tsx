import React, { useState } from 'react';
import { Header } from '@/components/Header';
import { Hero, SeciliMekanlar } from '@/components/Hero';
import { Footer } from '@/components/Footer';
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt';
import { SelectionModal } from '@/components/SelectionModal';

export function Home() {
  const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<'hemen' | 'gecerken' | null>(null);

  const handleSelectType = (type: 'hemen' | 'gecerken') => {
    setSelectedType(type);
    setIsSelectionModalOpen(true);
  };

  return (
    <div className="min-h-screen w-full bg-transparent selection:bg-primary/30 selection:text-primary-foreground font-sans">
      <Header />
      
      <main>
        <Hero onSelectType={handleSelectType} />
        <SeciliMekanlar />
      </main>

      <Footer />

      {/* PWA Install Prompter & Assistant */}
      <PWAInstallPrompt />

      {/* Ara Seçim Ekranı Modal */}
      <SelectionModal
        isOpen={isSelectionModalOpen}
        onOpenChange={setIsSelectionModalOpen}
        selectedType={selectedType}
      />
    </div>
  );
}
