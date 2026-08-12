import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowRight, X, Navigation, ChevronLeft, Check, Loader2, Zap, Clock, MapPin } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { InteractiveCard } from '@/components/ui/InteractiveCard';
import { useToast } from '@/hooks/use-toast';
import { LiveDispatchService } from '@/lib/dispatchService';
import { getAccurateLocationAndAddress, StructuredAddress } from '@/services/gpsLocationService';
import { SUPPORTED_DISTRICTS, isDistrictSupported, extractZoneFromAddress, validateServiceArea } from '@/lib/locationUtils';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import { AuthModal } from '@/components/auth/AuthModal';
import { MapPinPickerModal } from '@/components/MapPinPickerModal';

export { SUPPORTED_DISTRICTS, isDistrictSupported, extractZoneFromAddress, validateServiceArea };

export interface SelectionModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedType?: 'hemen' | 'gecerken' | null;
  onSelectOption?: (option: 'al' | 'birak') => void;
  partner_id?: string | null;
  selectedPartner?: { id: string } | null;
}

type Step = 'form' | 'success';
type ServiceType = 'al' | 'birak';

const TIME_SLOTS = [
  '10:00 – 11:00',
  '11:00 – 12:00',
  '12:00 – 13:00',
  '13:00 – 14:00',
  '14:00 – 15:00',
  '15:00 – 16:00',
  '16:00 – 17:00',
  '17:00 – 18:00',
  '18:00 – 19:00',
  '19:00 – 20:00',
];

export function SelectionModal({
  isOpen,
  onOpenChange,
  selectedType,
  partner_id,
  selectedPartner,
}: SelectionModalProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>('form');
  const [serviceType] = useState<ServiceType>('al');
  const [useDeliveryCode, setUseDeliveryCode] = useState<boolean | null>(null);
  const [createdDeliveryCode, setCreatedDeliveryCode] = useState<string | null>(null);

  // Time preference state (Geçerken UĞRA)
  const [timePreferenceMode, setTimePreferenceMode] = useState<'anytime' | 'slot'>('anytime');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);

  const { user, profile } = useCustomerAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [pendingDispatchSubmit, setPendingDispatchSubmit] = useState(false);

  const activeDeliveryType = selectedType || 'hemen';

  // Form states
  const [taskDescription, setTaskDescription] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [pickupLocation, setPickupLocation] = useState('');
  const [dropoffLocation, setDropoffLocation] = useState('');
  const [userLocation, setUserLocation] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  const [customerOffer, setCustomerOffer] = useState<string>('250');
  const [isAgreed, setIsAgreed] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);

  const [isLocatingGPS, setIsLocatingGPS] = useState(false);
  const [gpsTarget, setGpsTarget] = useState<'user' | 'pickup' | 'dropoff'>('user');
  const [gpsStatusMsg, setGpsStatusMsg] = useState<string>('');
  const [structuredGpsAddress, setStructuredGpsAddress] = useState<StructuredAddress | null>(null);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // Map Pin Picker State
  const [isMapPinModalOpen, setIsMapPinModalOpen] = useState(false);
  const [activeLocationTarget, setActiveLocationTarget] = useState<'user' | 'pickup' | 'dropoff'>('user');

  const handleMapPinConfirm = useCallback((address: StructuredAddress) => {
    setStructuredGpsAddress(address);
    if (activeLocationTarget === 'pickup') {
      setPickupLocation(address.formatted_address);
    } else if (activeLocationTarget === 'dropoff') {
      setDropoffLocation(address.formatted_address);
    } else {
      setUserLocation(address.formatted_address);
    }
  }, [activeLocationTarget]);

  const handleOpenChange = (open: boolean) => {
    if (!open && (isMapPinModalOpen || isLocatingGPS)) {
      return;
    }
    onOpenChange(open);
  };

  const activePickupAddr = serviceType === 'al' ? pickupLocation : userLocation;
  const activeDropoffAddr = serviceType === 'al' ? userLocation : dropoffLocation;
  const activeAreaCheck = validateServiceArea(
    activePickupAddr.trim() ? activePickupAddr : undefined,
    activeDropoffAddr.trim() ? activeDropoffAddr : undefined
  );

  // Lock body scroll when modal is open across Chrome, Edge, Android Chrome, Safari iOS
  useEffect(() => {
    if (!isOpen) return;

    // Record initial scroll position
    const scrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
    const bodyStyle = document.body.style;
    const htmlStyle = document.documentElement.style;

    const prevBodyPosition = bodyStyle.position;
    const prevBodyTop = bodyStyle.top;
    const prevBodyWidth = bodyStyle.width;
    const prevBodyOverflow = bodyStyle.overflow;
    const prevHtmlOverflow = htmlStyle.overflow;
    const prevBodyOverscroll = bodyStyle.overscrollBehavior;
    const prevHtmlOverscroll = htmlStyle.overscrollBehavior;

    // Apply position: fixed lock to body & documentElement overflow lock
    bodyStyle.position = 'fixed';
    bodyStyle.top = `-${scrollY}px`;
    bodyStyle.width = '100%';
    bodyStyle.overflow = 'hidden';
    htmlStyle.overflow = 'hidden';
    bodyStyle.overscrollBehavior = 'none';
    htmlStyle.overscrollBehavior = 'none';

    // Trap wheel and trackpad scroll events so they never propagate to window
    const handleWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const scrollable = target.closest('.overflow-y-auto, .overflow-auto') as HTMLElement | null;
      if (!scrollable) {
        if (e.cancelable) e.preventDefault();
        return;
      }

      const { scrollTop, scrollHeight, clientHeight } = scrollable;
      const delta = e.deltaY;

      // Prevent boundary spillover (scroll chaining)
      if (delta < 0 && scrollTop <= 0) {
        if (e.cancelable) e.preventDefault();
        scrollable.scrollTop = 0;
      } else if (delta > 0 && scrollTop + clientHeight >= scrollHeight - 0.5) {
        if (e.cancelable) e.preventDefault();
        scrollable.scrollTop = scrollHeight - clientHeight;
      }
    };

    // Trap touchmove events for iOS Safari & Android Chrome
    const handleTouchMove = (e: TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const scrollable = target.closest('.overflow-y-auto, .overflow-auto') as HTMLElement | null;
      if (!scrollable) {
        if (e.cancelable) e.preventDefault();
        return;
      }

      if (scrollable.scrollHeight <= scrollable.clientHeight) {
        if (e.cancelable) e.preventDefault();
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      bodyStyle.position = prevBodyPosition;
      bodyStyle.top = prevBodyTop;
      bodyStyle.width = prevBodyWidth;
      bodyStyle.overflow = prevBodyOverflow;
      htmlStyle.overflow = prevHtmlOverflow;
      bodyStyle.overscrollBehavior = prevBodyOverscroll;
      htmlStyle.overscrollBehavior = prevHtmlOverscroll;

      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchmove', handleTouchMove);

      // Restore exact scroll position
      window.scrollTo(0, scrollY);
    };
  }, [isOpen]);

  const prevIsOpenRef = React.useRef(false);

  // Reset form states ONLY when modal is newly opened (transitioning from closed to open)
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      if (!pendingDispatchSubmit) {
        setStep('form');
        setTaskDescription('');
        setCustomerPhone('');
        setPickupLocation('');
        setDropoffLocation('');
        setUserLocation('');
        setAddressDetail('');
        setUseDeliveryCode(null);
        setIsAgreed(false);
        setIsTermsOpen(false);
        setTimePreferenceMode('anytime');
        setSelectedTimeSlot(null);
      }
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, pendingDispatchSubmit]);

  const handleGPSDetect = async (targetField: 'user' | 'pickup' | 'dropoff' = 'user') => {
    if (isLocatingGPS) return;
    setIsLocatingGPS(true);
    setGpsTarget(targetField);
    setGpsStatusMsg('Konum doğrulanıyor...');

    try {
      const addressData = await getAccurateLocationAndAddress((status) => {
        setGpsStatusMsg(status.text);
      });

      setStructuredGpsAddress(addressData);
      if (targetField === 'pickup') {
        setPickupLocation(addressData.formatted_address);
      } else if (targetField === 'dropoff') {
        setDropoffLocation(addressData.formatted_address);
      } else {
        setUserLocation(addressData.formatted_address);
      }
      toast({
        title: 'Konum Doğrulandı',
        description: `Adresiniz yüksek hassasiyetle belirlendi (${addressData.accuracy.toFixed(0)}m).`,
        variant: 'plain',
      });
    } catch (err: any) {
      if (import.meta.env.DEV) {
        console.warn('[GPS Detection notice]', err?.message || err);
      }
      toast({
        title: 'Konum Alınamadı',
        description: 'Konum alınamadı. Adresinizi manuel olarak girebilirsiniz.',
        variant: 'destructive',
      });
    } finally {
      setIsLocatingGPS(false);
      setGpsStatusMsg('');
    }
  };

  const executeOrderSubmission = async () => {
    setIsSubmittingOrder(true);

    const pickupAddr = serviceType === 'al' ? pickupLocation : userLocation;
    const dropoffAddr = serviceType === 'al' ? userLocation : dropoffLocation;

    const pZone = extractZoneFromAddress(pickupAddr);
    const dZone = extractZoneFromAddress(dropoffAddr);

    const areaCheck = validateServiceArea(pickupAddr, dropoffAddr);
    if (!areaCheck.valid) {
      toast({
        title: 'Hizmet Bölgesi Dışı',
        description: areaCheck.error || 'Seçtiğiniz konum hizmet bölgemiz dışında.',
        variant: 'destructive',
      });
      setIsSubmittingOrder(false);
      return;
    }

    const offerNum = Number(customerOffer);
    if (isNaN(offerNum) || offerNum < 100) {
      toast({
        title: 'Geçersiz Teklif',
        description: 'Minimum teklif tutarı 100 TL olmalıdır.',
        variant: 'destructive',
      });
      setIsSubmittingOrder(false);
      return;
    }

    try {
      const generatedDeliveryCode = useDeliveryCode === true
        ? Math.floor(100000 + Math.random() * 900000).toString()
        : null;

      const result = await LiveDispatchService.createOrderAndDispatch({
        delivery_type: activeDeliveryType,
        service_type: serviceType === 'al' ? 'al' : 'birak',
        task_description: taskDescription.trim(),
        customer_phone: customerPhone.trim(),
        pickup_address: pickupAddr || 'Adapazarı',
        delivery_address: dropoffAddr || 'Serdivan',
        pickup_lat: structuredGpsAddress?.latitude,
        pickup_lng: structuredGpsAddress?.longitude,
        delivery_lat: structuredGpsAddress?.latitude,
        delivery_lng: structuredGpsAddress?.longitude,
        street: structuredGpsAddress?.street,
        district: structuredGpsAddress?.district,
        city: structuredGpsAddress?.city,
        province: structuredGpsAddress?.province,
        postal_code: structuredGpsAddress?.postal_code,
        place_id: structuredGpsAddress?.place_id,
        latitude: structuredGpsAddress?.latitude,
        longitude: structuredGpsAddress?.longitude,
        accuracy: structuredGpsAddress?.accuracy,
        address_detail: addressDetail.trim(),
        preferred_time: activeDeliveryType === 'gecerken' ? (timePreferenceMode === 'slot' ? selectedTimeSlot : 'Gün içinde fark etmez') : null,
        customer_name: profile?.full_name || user?.user_metadata?.full_name || 'Müşteri',
        customer_id: user?.id,
        total_price: offerNum,
        customer_price: offerNum,
        courier_net: offerNum,
        estimated_minutes: activeDeliveryType === 'gecerken' ? 45 : 20,
        pickup_zone: pZone,
        delivery_zone: dZone,
        partner_id: partner_id || selectedPartner?.id || null,
        requires_delivery_code: useDeliveryCode === true,
        delivery_code: generatedDeliveryCode,
        delivery_code_verified: useDeliveryCode !== true,
      });

      if (result.success) {
        if (useDeliveryCode === true && generatedDeliveryCode) {
          setCreatedDeliveryCode(generatedDeliveryCode);
          setStep('success');
        } else {
          toast({
            title: 'Talebiniz İletildi',
            description: 'Belirttiğiniz iletişim bilgilerinden size dönüş yapılacaktır.',
            variant: 'plain',
          });
          onOpenChange(false);
          setStep('form');
        }
      } else {
        toast({
          title: 'Hata',
          description: result.error || 'Talebiniz iletilirken bir sorun oluştu.',
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      toast({
        title: 'İşlem Başarısız',
        description: err?.message || 'Bir hata oluştu.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAgreed) {
      toast({
        title: 'Hizmet Onayı Gerekli',
        description: 'Talebinizi göndermek için hizmet onayını işaretleyin.',
        variant: 'destructive',
      });
      return;
    }

    const isPhoneValid = (phone: string): boolean => {
      const digits = phone.replace(/\D/g, '');
      return digits.length === 11 && digits.startsWith('05');
    };

    if (!isPhoneValid(customerPhone)) {
      toast({
        title: 'Geçersiz Telefon Numarası',
        description: 'Müşteri telefonu 05 ile başlamalı ve 11 haneli olmalıdır (Örn: 05XXXXXXXXX).',
        variant: 'destructive',
      });
      return;
    }

    const isDev = import.meta.env.DEV || process.env.NODE_ENV === 'development';

    if (!user && !isDev) {
      setPendingDispatchSubmit(true);
      onOpenChange(false);
      setIsAuthModalOpen(true);
      return;
    }

    await executeOrderSubmission();
  };

  const handleAuthClose = () => {
    setIsAuthModalOpen(false);
    if (pendingDispatchSubmit) {
      onOpenChange(true);
      setPendingDispatchSubmit(false);
    }
  };

  const handleAuthSuccess = () => {
    setIsAuthModalOpen(false);
  };

  useEffect(() => {
    if (user && pendingDispatchSubmit) {
      setIsAuthModalOpen(false);
      onOpenChange(true);
      setPendingDispatchSubmit(false);
      executeOrderSubmission();
    }
  }, [user, pendingDispatchSubmit]);

  const isFormValid = () => {
    if (isSubmittingOrder) return false;
    if (!isAgreed) return false;
    if (useDeliveryCode === null) return false;
    if (!taskDescription.trim()) return false;
    const cleanPhone = customerPhone.replace(/\D/g, '');
    if (cleanPhone.length !== 11 || !cleanPhone.startsWith('05')) return false;

    const offerNum = Number(customerOffer);
    if (isNaN(offerNum) || offerNum < 100) return false;

    const pickupAddr = serviceType === 'al' ? pickupLocation : userLocation;
    const dropoffAddr = serviceType === 'al' ? userLocation : dropoffLocation;
    const currentAreaCheck = validateServiceArea(
      pickupAddr.trim() ? pickupAddr : undefined,
      dropoffAddr.trim() ? dropoffAddr : undefined
    );
    if (!currentAreaCheck.valid) return false;

    if (activeDeliveryType === 'gecerken' && timePreferenceMode === 'slot' && !selectedTimeSlot) {
      return false;
    }

    if (serviceType === 'al') {
      return Boolean(pickupLocation.trim() && userLocation.trim());
    } else if (serviceType === 'birak') {
      return Boolean(userLocation.trim() && dropoffLocation.trim());
    }
    return false;
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent 
          hideClose
          onPointerDownOutside={(e) => {
            e.preventDefault();
          }}
          onInteractOutside={(e) => {
            e.preventDefault();
          }}
          onFocusOutside={(e) => {
            e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (isMapPinModalOpen || isLocatingGPS) {
              e.preventDefault();
            }
          }}
          className="w-[92vw] sm:w-full max-w-xl bg-transparent border-0 p-0 shadow-none overflow-visible max-h-[90dvh] flex flex-col my-auto"
        >
          <DialogTitle className="sr-only">
            {activeDeliveryType === 'gecerken' ? 'Geçerken UĞRA' : 'Hemen UĞRA'} — Talep Formu
          </DialogTitle>

          {step === 'form' ? (
            /* FORM EKRANI (Doğrudan Talep Formu) */
            <div className="glass-panel rounded-2xl p-5 relative overflow-hidden border border-white/10 text-white transition-all duration-300 flex flex-col max-h-[90dvh] w-full">
              {/* Top ambient glow */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-[40px] rounded-full pointer-events-none" />

              {/* Header (fixed at top) */}
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-white/10 shrink-0 relative z-10 gap-2">
                <div>
                  <span className="text-xs font-bold text-white tracking-wide block">
                    {activeDeliveryType === 'gecerken' ? 'Geçerken UĞRA' : 'Hemen UĞRA'}
                  </span>
                  <span className="text-[11px] text-zinc-400 block mt-0.5">
                    Talep Detaylarınızı Doldurunuz
                  </span>
                </div>

                <DialogClose className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-zinc-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer outline-none shrink-0">
                  <X className="w-3.5 h-3.5" />
                  <span className="sr-only">Kapat</span>
                </DialogClose>
              </div>

              {/* Scrollable Form Body */}
              <div 
                className="overflow-y-auto flex-1 pr-1 custom-scrollbar space-y-3.5 text-left overscroll-contain touch-pan-y"
                style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))' }}
              >
                <form onSubmit={handleSubmit} className="space-y-3.5 text-left">
                  {/* Field 1: Ne yapılmasını istediğinizi anlatın */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-zinc-200">
                      NE YAPILMASINI İSTEDİĞİNİ ANLAT <span className="text-rose-400">*</span>
                    </label>
                    <textarea
                      rows={3}
                      value={taskDescription}
                      onChange={(e) => setTaskDescription(e.target.value)}
                      placeholder="Ne yapılmasını istediğinizi kısaca anlatın..."
                      className="w-full bg-white/[0.04] hover:bg-white/[0.07] focus:bg-white/[0.07] border border-white/10 hover:border-white/20 focus:border-white/30 rounded-xl p-3.5 text-xs text-white placeholder-zinc-500 resize-none outline-none transition-all duration-200"
                      required
                    />
                  </div>

                  {/* Field 2: Telefon Numarası */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-zinc-200">
                      TELEFON NUMARANIZ <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="05XXXXXXXXX"
                      maxLength={11}
                      value={customerPhone}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
                        setCustomerPhone(digits);
                      }}
                      required
                      className="w-full bg-white/[0.04] hover:bg-white/[0.07] focus:bg-white/[0.07] border border-white/10 hover:border-white/20 focus:border-white/30 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 outline-none transition-all duration-200 font-mono"
                    />
                    {customerPhone.length > 0 && (customerPhone.length !== 11 || !customerPhone.startsWith('05')) && (
                      <p className="text-[11px] text-rose-400 font-medium">
                        Telefon numarası 05 ile başlamalı ve 11 haneli olmalıdır (Örn: 05XXXXXXXXX)
                      </p>
                    )}
                  </div>

                  {/* HAZIR OLANI AL - KONUM VE ADRESLER */}
                  {serviceType === 'al' && (
                    <>
                      {/* Nereden Alalım */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-zinc-200">
                          NEREDEN ALALIM? <span className="text-rose-400">*</span>
                        </label>
                        <input
                          type="text"
                          value={pickupLocation}
                          onChange={(e) => setPickupLocation(e.target.value)}
                          placeholder="Adres veya konum..."
                          className="w-full bg-white/[0.04] hover:bg-white/[0.07] focus:bg-white/[0.07] border border-white/10 hover:border-white/20 focus:border-white/30 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 outline-none transition-all duration-200"
                        />
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-0.5">
                          <button
                            type="button"
                            onClick={() => handleGPSDetect('pickup')}
                            disabled={isLocatingGPS && gpsTarget === 'pickup'}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-zinc-200 hover:text-white bg-white/[0.06] hover:bg-white/10 border border-white/10 hover:border-white/20 px-3 py-2 rounded-xl transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
                          >
                            <Navigation className={`w-3.5 h-3.5 text-zinc-300 ${isLocatingGPS && gpsTarget === 'pickup' ? 'animate-spin' : ''}`} />
                            <span>{isLocatingGPS && gpsTarget === 'pickup' ? 'Konum Alınıyor...' : 'Konumumu Kullan'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setActiveLocationTarget('pickup');
                              setIsMapPinModalOpen(true);
                            }}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-zinc-200 hover:text-white bg-white/[0.06] hover:bg-white/10 border border-white/10 hover:border-white/20 px-3 py-2 rounded-xl transition-colors cursor-pointer shadow-sm"
                          >
                            <MapPin className="w-3.5 h-3.5 text-zinc-300" />
                            <span>Haritada Seç</span>
                          </button>
                        </div>
                        {gpsStatusMsg && gpsTarget === 'pickup' && (
                          <p className="text-[11px] text-amber-400 font-medium animate-pulse flex items-center gap-1 pt-0.5">
                            <Loader2 className="w-3 h-3 animate-spin inline" />
                            {gpsStatusMsg}
                          </p>
                        )}
                        <p className="text-[11px] text-zinc-400">
                          Adres veya konum linki girebilirsiniz.
                        </p>
                      </div>

                      {/* Nereye Bırakalım */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-zinc-200">
                          NEREYE BIRAKALIM? <span className="text-rose-400">*</span>
                        </label>
                        <input
                          type="text"
                          value={userLocation}
                          onChange={(e) => setUserLocation(e.target.value)}
                          placeholder="Adres veya konum..."
                          className="w-full bg-white/[0.04] hover:bg-white/[0.07] focus:bg-white/[0.07] border border-white/10 hover:border-white/20 focus:border-white/30 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 outline-none transition-all duration-200"
                        />
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-0.5">
                          <button
                            type="button"
                            onClick={() => handleGPSDetect('user')}
                            disabled={isLocatingGPS && gpsTarget === 'user'}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-zinc-200 hover:text-white bg-white/[0.06] hover:bg-white/10 border border-white/10 hover:border-white/20 px-3 py-2 rounded-xl transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
                          >
                            <Navigation className={`w-3.5 h-3.5 text-zinc-300 ${isLocatingGPS && gpsTarget === 'user' ? 'animate-spin' : ''}`} />
                            <span>{isLocatingGPS && gpsTarget === 'user' ? 'Konum Alınıyor...' : 'Konumumu Kullan'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setActiveLocationTarget('user');
                              setIsMapPinModalOpen(true);
                            }}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-zinc-200 hover:text-white bg-white/[0.06] hover:bg-white/10 border border-white/10 hover:border-white/20 px-3 py-2 rounded-xl transition-colors cursor-pointer shadow-sm"
                          >
                            <MapPin className="w-3.5 h-3.5 text-zinc-300" />
                            <span>Haritada Seç</span>
                          </button>
                        </div>
                        {gpsStatusMsg && gpsTarget === 'user' && (
                          <p className="text-[11px] text-amber-400 font-medium animate-pulse flex items-center gap-1 pt-0.5">
                            <Loader2 className="w-3 h-3 animate-spin inline" />
                            {gpsStatusMsg}
                          </p>
                        )}
                      </div>
                    </>
                  )}

                  {/* HAZIR OLANI BIRAK - KONUM VE ADRESLER */}
                  {serviceType === 'birak' && (
                    <>
                      {/* Nereden Alalım */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-zinc-200">
                          NEREDEN ALALIM? <span className="text-rose-400">*</span>
                        </label>
                        <input
                          type="text"
                          value={userLocation}
                          onChange={(e) => setUserLocation(e.target.value)}
                          placeholder="Adres veya konum..."
                          className="w-full bg-white/[0.04] hover:bg-white/[0.07] focus:bg-white/[0.07] border border-white/10 hover:border-white/20 focus:border-white/30 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 outline-none transition-all duration-200"
                        />
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-0.5">
                          <button
                            type="button"
                            onClick={() => handleGPSDetect('user')}
                            disabled={isLocatingGPS && gpsTarget === 'user'}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-zinc-200 hover:text-white bg-white/[0.06] hover:bg-white/10 border border-white/10 hover:border-white/20 px-3 py-2 rounded-xl transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
                          >
                            <Navigation className={`w-3.5 h-3.5 text-zinc-300 ${isLocatingGPS && gpsTarget === 'user' ? 'animate-spin' : ''}`} />
                            <span>{isLocatingGPS && gpsTarget === 'user' ? 'Konum Alınıyor...' : 'Konumumu Kullan'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setActiveLocationTarget('user');
                              setIsMapPinModalOpen(true);
                            }}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-zinc-200 hover:text-white bg-white/[0.06] hover:bg-white/10 border border-white/10 hover:border-white/20 px-3 py-2 rounded-xl transition-colors cursor-pointer shadow-sm"
                          >
                            <MapPin className="w-3.5 h-3.5 text-zinc-300" />
                            <span>Haritada Seç</span>
                          </button>
                        </div>
                        {gpsStatusMsg && gpsTarget === 'user' && (
                          <p className="text-[11px] text-amber-400 font-medium animate-pulse flex items-center gap-1 pt-0.5">
                            <Loader2 className="w-3 h-3 animate-spin inline" />
                            {gpsStatusMsg}
                          </p>
                        )}
                      </div>

                      {/* Nereye Bırakalım */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-zinc-200">
                          NEREYE BIRAKALIM? <span className="text-rose-400">*</span>
                        </label>
                        <input
                          type="text"
                          value={dropoffLocation}
                          onChange={(e) => setDropoffLocation(e.target.value)}
                          placeholder="Adres veya konum..."
                          className="w-full bg-white/[0.04] hover:bg-white/[0.07] focus:bg-white/[0.07] border border-white/10 hover:border-white/20 focus:border-white/30 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 outline-none transition-all duration-200"
                        />
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-0.5">
                          <button
                            type="button"
                            onClick={() => handleGPSDetect('dropoff')}
                            disabled={isLocatingGPS && gpsTarget === 'dropoff'}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-zinc-200 hover:text-white bg-white/[0.06] hover:bg-white/10 border border-white/10 hover:border-white/20 px-3 py-2 rounded-xl transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
                          >
                            <Navigation className={`w-3.5 h-3.5 text-zinc-300 ${isLocatingGPS && gpsTarget === 'dropoff' ? 'animate-spin' : ''}`} />
                            <span>{isLocatingGPS && gpsTarget === 'dropoff' ? 'Konum Alınıyor...' : 'Konumumu Kullan'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setActiveLocationTarget('dropoff');
                              setIsMapPinModalOpen(true);
                            }}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-zinc-200 hover:text-white bg-white/[0.06] hover:bg-white/10 border border-white/10 hover:border-white/20 px-3 py-2 rounded-xl transition-colors cursor-pointer shadow-sm"
                          >
                            <MapPin className="w-3.5 h-3.5 text-zinc-300" />
                            <span>Haritada Seç</span>
                          </button>
                        </div>
                        {gpsStatusMsg && gpsTarget === 'dropoff' && (
                          <p className="text-[11px] text-amber-400 font-medium animate-pulse flex items-center gap-1 pt-0.5">
                            <Loader2 className="w-3 h-3 animate-spin inline" />
                            {gpsStatusMsg}
                          </p>
                        )}
                        <p className="text-[11px] text-zinc-400">
                          Adres veya konum linki girebilirsiniz.
                        </p>
                      </div>
                    </>
                  )}

                  {/* Field 3: Adres Detayı */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-zinc-200">
                      ADRES DETAYI <span className="text-zinc-500 font-normal capitalize">(opsiyonel)</span>
                    </label>
                    <input
                      type="text"
                      value={addressDetail}
                      onChange={(e) => setAddressDetail(e.target.value)}
                      placeholder="Kat, daire, blok, bina, kapı numarası veya teslimat notu..."
                      className="w-full bg-white/[0.04] hover:bg-white/[0.07] focus:bg-white/[0.07] border border-white/10 hover:border-white/20 focus:border-white/30 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 outline-none transition-all duration-200"
                    />
                  </div>

                  {/* NE ZAMAN? - SADECE Geçerken UĞRA İÇİN */}
                  {activeDeliveryType === 'gecerken' && (
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-zinc-200">
                        NE ZAMAN?
                      </label>
                      <div className="grid grid-cols-2 gap-1 p-1 bg-white/[0.04] border border-white/10 rounded-xl">
                        <button
                          type="button"
                          onClick={() => {
                            setTimePreferenceMode('anytime');
                            setSelectedTimeSlot(null);
                          }}
                          className={`py-2 px-3 text-xs font-semibold rounded-lg transition-all cursor-pointer text-center ${
                            timePreferenceMode === 'anytime'
                              ? 'bg-white text-black font-bold shadow-sm'
                              : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          Gün içinde fark etmez
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setTimePreferenceMode('slot');
                          }}
                          className={`py-2 px-3 text-xs font-semibold rounded-lg transition-all cursor-pointer text-center ${
                            timePreferenceMode === 'slot'
                              ? 'bg-white text-black font-bold shadow-sm'
                              : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          Saat aralığı seç
                        </button>
                      </div>

                      {timePreferenceMode === 'slot' && (
                        <div className="pt-1 space-y-1.5">
                          <span className="block text-[11px] text-zinc-400 font-medium">
                            Tercih ettiğiniz 1 saatlik zaman aralığını seçin:
                          </span>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto pr-1">
                            {TIME_SLOTS.map((slot) => {
                              const isSelected = selectedTimeSlot === slot;
                              return (
                                <button
                                  key={slot}
                                  type="button"
                                  onClick={() => setSelectedTimeSlot(slot)}
                                  className={`py-2 px-2 text-xs font-medium rounded-xl border transition-all cursor-pointer text-center ${
                                    isSelected
                                      ? 'bg-white text-black font-bold border-white shadow-sm'
                                      : 'bg-white/[0.04] text-zinc-300 border-white/10 hover:border-white/20 hover:text-white'
                                  }`}
                                >
                                  {slot}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Teslimat Doğrulaması */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-zinc-200">
                      TESLİMAT DOĞRULAMASI
                    </label>
                    <div className="grid grid-cols-2 gap-1 p-1 bg-white/[0.04] border border-white/10 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setUseDeliveryCode(useDeliveryCode === true ? null : true)}
                        className={`py-2 px-3 text-xs font-semibold rounded-lg transition-all cursor-pointer text-center ${
                          useDeliveryCode === true
                            ? 'bg-white text-black font-bold shadow-sm'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        Kod ile
                      </button>

                      <button
                        type="button"
                        onClick={() => setUseDeliveryCode(useDeliveryCode === false ? null : false)}
                        className={`py-2 px-3 text-xs font-semibold rounded-lg transition-all cursor-pointer text-center ${
                          useDeliveryCode === false
                            ? 'bg-white text-black font-bold shadow-sm'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        Kodsuz
                      </button>
                    </div>
                  </div>

                  {/* Hizmet Teklifim */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-zinc-200">
                        HİZMET TEKLİFİM
                      </label>
                      <span className="text-[11px] text-zinc-400 font-normal">
                        Minimum 100 TL
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={customerOffer}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          setCustomerOffer(val);
                        }}
                        placeholder="250"
                        className="w-full bg-white/[0.04] hover:bg-white/[0.07] focus:bg-white/[0.07] border border-white/10 hover:border-white/20 focus:border-white/30 rounded-xl px-3.5 py-2.5 text-sm font-bold font-mono text-white outline-none transition-all duration-200 pr-12"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-400 font-mono">
                        TL
                      </span>
                    </div>
                    {customerOffer !== '' && Number(customerOffer) < 100 && (
                      <p className="text-[11px] font-semibold text-rose-400">
                        Minimum teklif tutarı 100 TL'dir. 100 TL altı teklif girilemez.
                      </p>
                    )}
                  </div>

                  {/* Hizmet Bölgesi Dışı Uyarısı */}
                  {!activeAreaCheck.valid && (activePickupAddr.trim() || activeDropoffAddr.trim()) && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs flex items-center gap-2 my-1">
                      <span className="font-semibold shrink-0">Hizmet Bölgesi Dışı:</span>
                      <span>{activeAreaCheck.error || 'Seçtiğiniz konum hizmet bölgemiz dışında.'}</span>
                    </div>
                  )}

                  {/* Hizmet Onayı Adımı */}
                  <div className="p-3.5 bg-white/[0.03] border border-white/10 rounded-xl space-y-2">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-white uppercase tracking-wider block">
                        Hizmet Onayı
                      </span>
                      <p className="text-[11px] text-zinc-400 leading-snug">
                        Talebimi kontrol ettim ve verdiğim bilgilerin doğru olduğunu onaylıyorum.
                      </p>
                    </div>
                    <div className="flex items-start gap-2.5 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsAgreed(!isAgreed)}
                        className="relative flex items-center justify-center shrink-0 cursor-pointer focus:outline-none group mt-0.5"
                        aria-label="Hizmet şartlarını ve verdiğim bilgileri onaylıyorum"
                      >
                        <div
                          className={`w-4 h-4 rounded-md border transition-all duration-200 flex items-center justify-center ${
                            isAgreed
                              ? 'bg-white border-white text-black'
                              : 'bg-white/[0.04] border-white/30 group-hover:border-white/50'
                          }`}
                        >
                          {isAgreed && <Check className="w-3 h-3 stroke-[3] text-black" />}
                        </div>
                      </button>
                      <label
                        onClick={() => setIsAgreed(!isAgreed)}
                        className="text-xs text-zinc-200 cursor-pointer select-none leading-relaxed"
                      >
                        Hizmet şartlarını ve verdiğim bilgileri onaylıyorum.{' '}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsTermsOpen(true);
                          }}
                          className="font-semibold text-white underline underline-offset-2 hover:text-zinc-300 transition-colors inline"
                        >
                          (Koşulları Göster)
                        </button>
                      </label>
                    </div>
                  </div>

                  {/* Submit Section */}
                  <div className="pt-1">
                    <button
                      type="submit"
                      disabled={!isFormValid() || isSubmittingOrder}
                      className="w-full bg-white hover:bg-zinc-200 text-black font-bold py-3 rounded-xl transition-all cursor-pointer text-xs flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg uppercase tracking-wider"
                    >
                      {isSubmittingOrder ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>TALEBİNİZ GÖNDERİLİYOR...</span>
                        </>
                      ) : (
                        <span>TALEBİ GÖNDER</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : step === 'success' ? (
            /* 3. BAŞARI / TESLİM KODU EKRANI */
            <div className="glass-panel rounded-2xl p-6 relative overflow-hidden border border-white/10 text-white transition-all duration-300 flex flex-col w-full text-center space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <span className="text-xs font-bold text-white tracking-wide">
                  Teslimat Bilgisi
                </span>
                <DialogClose 
                  onClick={() => {
                    setStep('form');
                    setCreatedDeliveryCode(null);
                  }}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-zinc-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer outline-none shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                  <span className="sr-only">Kapat</span>
                </DialogClose>
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">Teslim Doğrulama Kodunuz</h3>
              </div>

              <div className="bg-white/10 border border-white/20 rounded-xl py-4 px-6 text-3xl font-extrabold tracking-widest text-white font-mono my-2 select-all">
                {createdDeliveryCode}
              </div>

              <div className="space-y-1 text-xs text-zinc-300 leading-relaxed">
                <p>Bu kodu teslim sırasında asistana söyleyin.</p>
                <p>Kod paylaşılmadan teslim tamamlanamaz.</p>
              </div>

              <button
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  setStep('form');
                  setCreatedDeliveryCode(null);
                }}
                className="w-full mt-2 bg-white hover:bg-zinc-200 text-black font-bold py-2.5 rounded-xl transition-all text-xs cursor-pointer shadow-lg"
              >
                Anladım
              </button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Hizmet Onayı / Şartları Modalı */}
      <Dialog open={isTermsOpen} onOpenChange={setIsTermsOpen}>
        <DialogContent className="w-[92vw] sm:w-full max-w-lg glass-panel border border-white/10 p-6 text-white rounded-2xl max-h-[80vh] flex flex-col overflow-hidden">
          <DialogTitle className="text-base font-bold text-white border-b border-white/10 pb-3 flex items-center justify-between">
            <span>Hizmet Onayı ve Koşulları</span>
          </DialogTitle>
          <div className="overflow-y-auto space-y-4 text-xs text-zinc-300 pr-1 my-3 leading-relaxed">
            <div>
              <h4 className="font-bold text-white mb-1">1. Hizmet Tanımı</h4>
              <p>UĞRA, kullanıcıların günlük ihtiyaçlarını hızlı ve güvenilir şekilde karşılamalarına yardımcı olan kişisel zaman asistanı hizmetidir.</p>
            </div>
            <div>
              <h4 className="font-bold text-white mb-1">2. Sipariş Süreci</h4>
              <p>Sipariş oluşturulduktan sonra en uygun UĞRA Asistanı görevlendirilir ve belirtilen detaylara uygun şekilde teslimat gerçekleştirilir.</p>
            </div>
            <div>
              <h4 className="font-bold text-white mb-1">3. Teslimat & Adres Bilgileri</h4>
              <p>Teslimat sırasında kullanıcının doğru adres veya konum bilgisi sunması gerekmektedir. Eksik veya yanlış adres bildirimlerinden doğabilecek gecikmelerden UĞRA sorumlu değildir.</p>
            </div>
            <div>
              <h4 className="font-bold text-white mb-1">4. Yasaklı Ürünler</h4>
              <p>Yasa dışı maddeler, patlayıcı/yanıcı ürünler, silah, canlı hayvan ve taşınması yasal olarak engellenen ürünlerin temini veya taşınması kabul edilmez.</p>
            </div>
            <div>
              <h4 className="font-bold text-white mb-1">5. Gizlilik ve Güvenlik</h4>
              <p>Kullanıcı bilgileri yürürlükteki kişisel verilerin korunması mevzuatına uygun şekilde işlenir ve sadece hizmetin ifası için kullanılır.</p>
            </div>
          </div>
          <div className="pt-2 border-t border-white/10 text-right">
            <button
              type="button"
              onClick={() => setIsTermsOpen(false)}
              className="bg-white hover:bg-zinc-200 text-black font-bold px-4 py-2 rounded-xl text-xs transition-colors cursor-pointer"
            >
              Anladım
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Google Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={handleAuthClose}
        onSuccess={handleAuthSuccess}
      />

      {/* Map Pin Picker Modal */}
      <MapPinPickerModal
        isOpen={isMapPinModalOpen}
        onClose={() => setIsMapPinModalOpen(false)}
        onConfirm={handleMapPinConfirm}
        initialLat={structuredGpsAddress?.latitude}
        initialLng={structuredGpsAddress?.longitude}
      />
    </>
  );
}
