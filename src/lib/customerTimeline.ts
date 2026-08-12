import { CustomerTrackingState, TimelineStep, TrackingStage } from '@/types/customerTracking';
import { TaskStatus } from '@/types/task';

/**
 * Maps TaskStatus to customer-facing TrackingStage
 */
export function mapTaskStatusToTrackingStage(status: TaskStatus): TrackingStage {
  switch (status) {
    case 'created':
    case 'broadcasted':
      return 'created';
    case 'assigned':
      return 'courier_accepted';
    case 'heading_to_pickup':
      return 'courier_heading_pickup';
    case 'arrived_at_pickup':
      return 'preparing';
    case 'picked_up':
      return 'picked_up';
    case 'heading_to_delivery':
      return 'heading_delivery';
    case 'arrived_at_delivery':
      return 'arriving';
    case 'completed':
      return 'delivered';
    case 'cancelled':
    case 'failed':
      return 'cancelled';
    default:
      return 'created';
  }
}

/**
 * Returns human-readable titles, subtitles, and progress bar percentages
 */
export function getTrackingStageDetails(stage: TrackingStage): {
  title: string;
  subtitle: string;
  progressPercent: number;
} {
  switch (stage) {
    case 'created':
      return {
        title: 'Sipariş Oluşturuldu 📝',
        subtitle: 'Siparişiniz alındı, kurye ataması ve işletme onayı bekleniyor.',
        progressPercent: 10,
      };
    case 'preparing':
      return {
        title: 'Sipariş Hazırlanıyor 👨‍🍳',
        subtitle: 'İşletme siparişinizi özenle hazırlıyor.',
        progressPercent: 30,
      };
    case 'waiting_courier':
      return {
        title: 'Kurye Bekleniyor 🛵',
        subtitle: 'Siparişiniz hazır. Kurye adrese yaklaşıyor.',
        progressPercent: 45,
      };
    case 'courier_accepted':
      return {
        title: 'Kurye Kabul Etti 🤝',
        subtitle: 'Kuryeniz görevi kabul etti ve işletmeye doğru yola çıkıyor.',
        progressPercent: 55,
      };
    case 'courier_heading_pickup':
      return {
        title: 'Kurye İşletmeye Gidiyor 📍',
        subtitle: 'Kuryeniz siparişi teslim almak üzere işletmeye ilerliyor.',
        progressPercent: 65,
      };
    case 'picked_up':
    case 'heading_delivery':
      return {
        title: 'Sipariş Yola Çıktı 🚚',
        subtitle: 'Siparişiniz teslim alındı, teslimat adresinize doğru geliyor.',
        progressPercent: 80,
      };
    case 'arriving':
      return {
        title: 'Kurye Kapıda! 🚪',
        subtitle: 'Kuryeniz kapınıza ulaştı. Doğrulama kodunuzu hazırlayın.',
        progressPercent: 95,
      };
    case 'delivered':
      return {
        title: 'Teslim Edildi 🎉',
        subtitle: 'Siparişiniz başarıyla teslim edildi. Afiyet olsun!',
        progressPercent: 100,
      };
    case 'cancelled':
      return {
        title: 'Sipariş İptal Edildi ❌',
        subtitle: 'Bu sipariş iptal edilmiştir.',
        progressPercent: 0,
      };
  }
}

/**
 * Builds standard 5-step customer timeline with state completions
 */
export function buildCustomerTimeline(currentStage: TrackingStage, updatedAt?: string): TimelineStep[] {
  const stageOrder: TrackingStage[] = [
    'created',
    'preparing',
    'courier_heading_pickup',
    'heading_delivery',
    'delivered',
  ];

  const currentIdx = stageOrder.indexOf(currentStage);

  const stepsDef = [
    { id: 'created', label: 'Sipariş Alındı', desc: 'Sipariş sisteme kaydoldu' },
    { id: 'preparing', label: 'Hazırlanıyor', desc: 'İşletme siparişi hazırlıyor' },
    { id: 'courier_heading_pickup', label: 'Kurye Yolda', desc: 'Kurye işletmeye gidiyor' },
    { id: 'heading_delivery', label: 'Teslimatta', desc: 'Sipariş adresinize geliyor' },
    { id: 'delivered', label: 'Teslim Edildi', desc: 'Sipariş tamamlandı' },
  ];

  return stepsDef.map((step, idx) => {
    let status: 'completed' | 'current' | 'pending' = 'pending';
    if (currentStage === 'cancelled') {
      status = 'pending';
    } else if (idx < currentIdx) {
      status = 'completed';
    } else if (idx === currentIdx) {
      status = 'current';
    }

    return {
      stepId: step.id,
      label: step.label,
      description: step.desc,
      status,
      timestamp: status !== 'pending' ? updatedAt || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
    };
  });
}
